import { routePartykitRequest, Server } from "partyserver";

import type { Connection, ConnectionContext } from "partyserver";
import {
	ALL_LANGS,
	PHRASEBOOKS,
	fakeTranslate,
	groupOf,
	langById,
	obfuscate,
	supportsLiveTranslation,
	translateText,
} from "../game/languages";
import { SENTENCES } from "../game/sentences";
import {
	censorText,
	DEFAULT_SETTINGS,
	MAX_PLAYERS,
	validateGuestName,
} from "../shared";
import type {
	ChoiceOption,
	GameSettings,
	HintMode,
	IncomingMessage,
	LangCategory,
	OutgoingMessage,
	Phase,
	PublicPlayer,
	PublicState,
} from "../shared";

type Player = {
	id: string;
	secret: string; // seat token — required to reattach, blocks hijacking
	name: string;
	score: number;
	isHost: boolean;
	guess: string | null;
	guessedAt: number | null;
	lastGain: number | null;
	connected: boolean;
};

type Round = {
	sentenceIndex: number;
	sentence: string;
	translation: string;
	langId: string;
	wasPhrasebook: boolean;
	choices: ChoiceOption[];
	deadline: number;
	token: number;
	fastestId: string | null; // first correct guesser
	unanimous: boolean; // everyone answered identically → nobody scores
};

const ROOM_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomOf<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
	const v = typeof n === "number" ? Math.round(n) : NaN;
	if (!Number.isFinite(v)) return fallback;
	return Math.min(max, Math.max(min, v));
}

const HINT_MODES: HintMode[] = ["full", "some", "most"];

export class Globe extends Server {
	players = new Map<string, Player>();
	connToPlayer = new Map<string, string>();
	settings: GameSettings = { ...DEFAULT_SETTINGS };
	phase: Phase = "lobby";
	roundNumber = 0;
	currentRound: Round | null = null;
	usedSentences = new Set<number>();
	usedLangIds = new Set<string>(); // never repeat a language until pool exhausted
	langFails = new Map<string, number>(); // consecutive translation failures
	lastLangFail = new Map<string, number>();
	pendingRemoval = new Map<string, ReturnType<typeof setTimeout>>();
	private token = 0;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private roundStarting = false;
	private roomCode = "?????";
	isPublic = false;
	roomPassword: string | null = null;
	lastDirPush = 0;
	lastPhase: Phase = "lobby";
	chatLog: { name: string; text: string }[] = [];
	lastChatByPlayer = new Map<string, number>();
	lastActionByPlayer = new Map<string, number>();
	debugConnections = new Map<string, string>();

	// ------------------------------------------------------------------ util

	private enabledPool(): import("../game/languages").LangDef[] {
		return ALL_LANGS.filter((l) => {
			if (l.category === "modern") return supportsLiveTranslation(l.code);
			if (l.category === "ancient") return this.settings.includeAncient;
			if (l.category === "fake") return this.settings.includeFake;
			return false;
		});
	}

	private connectedPlayers(): Player[] {
		return [...this.players.values()].filter((p) => p.connected);
	}

	private clearTimer() {
		this.token++;
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	private sync() {
		const publicPlayers: PublicPlayer[] = [...this.players.values()]
			.sort((a, b) => Number(b.isHost) - Number(a.isHost))
			.map((p) => {
				let guessFlag: string | null = null;
				let guessLabel: string | null = null;
				if (p.guess && this.phase !== "guessing") {
					const g = langById(p.guess);
					if (g) {
						guessFlag = g.flag;
						guessLabel = g.name;
					}
				}
				return {
					id: p.id,
					name: p.name,
					isHost: p.isHost,
					score: p.score,
					lastGain: p.lastGain,
					guessed: p.guess !== null,
					guess: this.phase === "guessing" ? null : p.guess,
					guessFlag,
					guessLabel,
					connected: p.connected,
				};
			});

		const round = this.currentRound;
		let reveal: PublicState["reveal"] = null;
		if (
			round &&
			(this.phase === "reveal" || this.phase === "matchover") &&
			round.langId
		) {
			const lang = langById(round.langId);
			if (lang) {
				reveal = {
					sentence: round.sentence,
					translation: round.translation,
					langId: lang.id,
					langName: lang.name,
					flag: lang.flag,
					category: lang.category,
					nativeName: lang.native,
					country: lang.country,
					wasPhrasebook: round.wasPhrasebook,
					fastestId: round.fastestId,
					unanimous: round.unanimous,
				};
			}
		}

		const state: PublicState = {
			phase: this.phase,
			hostId: [...this.players.values()].find((p) => p.isHost)?.id ?? "",
			players: publicPlayers,
			settings: this.settings,
			roomCode: this.roomCode,
			isPublic: this.isPublic,
			hasPassword: this.roomPassword !== null,
			maxPlayers: this.settings.maxPlayers,
			roundNumber: this.roundNumber,
			obfuscatedText:
				this.phase === "guessing" && round
					? obfuscate(round.translation, this.settings.hintMode)
					: null,
			choices: this.phase === "guessing" && round ? round.choices : null,
			deadline: this.phase === "guessing" && round ? round.deadline : null,
			reveal,
			winner:
				this.phase === "matchover"
					? ([...this.players.values()]
							.filter((p) => p.score >= this.settings.targetScore)
							.sort((a, b) => b.score - a.score)[0] ?? null)
					: null,
		};

		this.broadcast(JSON.stringify({ type: "state", state } satisfies OutgoingMessage));

		// Keep the public directory in sync for listed rooms
		const phaseChanged = this.phase !== this.lastPhase;
		this.lastPhase = this.phase;
		if (this.isPublic) this.pushToDirectory(phaseChanged);
	}

	// ------------------------------------------------------------ directory

	private dirStub(): DurableObjectStub {
		const env = (this as unknown as { env: Env }).env;
		return env.RoomDirectory.get(env.RoomDirectory.idFromName("global"));
	}

	private pushToDirectory(force = false, minIntervalMs = 4000): void {
		if (!this.isPublic || this.players.size === 0) return;
		const now = Date.now();
		if (!force && now - this.lastDirPush < minIntervalMs) return;
		this.lastDirPush = now;
		const host = [...this.players.values()].find((p) => p.isHost);
		const entry = {
			code: this.roomCode,
			hostName: host?.name ?? "?",
			players: this.players.size,
			maxPlayers: 1 + this.settings.maxPlayers,
			phase: this.phase,
			hasPassword: this.roomPassword !== null,
		};
		this.dirStub()
			.fetch("https://dir/upsert", {
				method: "POST",
				body: JSON.stringify({ type: "upsert", code: this.roomCode, entry }),
			})
			.catch(() => { /* directory unreachable — ignore */ });
	}

	private removeFromDirectory(): void {
		this.lastDirPush = 0;
		this.dirStub()
			.fetch("https://dir/remove", {
				method: "POST",
				body: JSON.stringify({ type: "remove", code: this.roomCode }),
			})
			.catch(() => { /* ignore */ });
	}

	private handleRoomConfig(isPublic?: boolean, password?: string | null): void {		if (typeof isPublic === "boolean") this.isPublic = isPublic;
		if (password !== undefined) {
			const pw = String(password ?? "").trim();
			this.roomPassword = pw.length > 0 ? pw.slice(0, 32) : null;
		}
		if (!this.isPublic) this.removeFromDirectory();
		else this.pushToDirectory(true);
		this.sync();
	}

	private sendChatHistory(conn: Connection) {
		for (const c of this.chatLog) {
			this.sendTo(conn, { type: "chat", from: "", name: c.name, text: c.text } satisfies OutgoingMessage);
		}
	}

	private sendTo(conn: Connection, msg: OutgoingMessage) {
		try {
			conn.send(JSON.stringify(msg));
		} catch {
			/* connection died mid-send */
		}
	}

	private sendError(conn: Connection, message: string) {
		this.sendTo(conn, { type: "error", message } satisfies OutgoingMessage);
	}

	// ------------------------------------------------------------- lifecycle

	onConnect(conn: Connection<unknown>, ctx: ConnectionContext) {
		const debugEmail = ctx.request.headers.get("x-lg-verified-debug-email");
		if (debugEmail) {
			this.debugConnections.set(conn.id, debugEmail);
			this.sendTo(conn, { type: "debug-status", enabled: true, email: debugEmail });
		}
		try {
			const url = new URL(ctx.request.url);
			const parts = url.pathname.split("/").filter(Boolean);
			const code = decodeURIComponent(parts[parts.length - 1] || "");
			if (code) this.roomCode = code.toUpperCase();
		} catch {
			/* keep default */
		}
	}

	async onMessage(conn: Connection, message: ArrayBuffer | ArrayBufferView | string) {
		if (typeof message !== "string") return;
		if (message.length > 4096) return; // frame-size cap — no oversized payloads
		let msg: IncomingMessage;
		try {
			msg = JSON.parse(message) as IncomingMessage;
		} catch {
			return;
		}

		switch (msg.type) {
			case "hello":
				this.handleHello(msg.name, msg.previousId, msg.password, msg.secret, conn);
				break;
			case "settings":
				this.handleSettings(msg.settings, conn);
				break;
			case "start-round":
				this.handleStartRound(msg.sentenceIndex, conn);
				break;
			case "quick-start":
				this.handleQuickStart(conn);
				break;
			case "guess":
				this.handleGuess(msg.choiceId, conn);
				break;
			case "next-round":
				if (this.isHostConn(conn) && this.phase === "reveal") {
					void this.startRandomRound();
				}
				break;
			case "end-match":
				if (this.isHostConn(conn)) {
					this.clearTimer();
					this.currentRound = null;
					this.phase = "lobby";
					for (const p of this.players.values()) {
						p.score = 0;
						p.guess = null;
						p.lastGain = null;
				p.guessedAt = null;
					}
					this.usedSentences.clear();
					this.usedLangIds.clear();
					this.sync();
				}
				break;
			case "close-room":
				if (this.isHostConn(conn)) {
					this.closeRoom();
				}
				break;
			case "play-again":
				if (this.isHostConn(conn) && this.phase === "matchover") {
					this.clearTimer();
					this.currentRound = null;
					this.phase = "lobby";
					for (const p of this.players.values()) {
						p.score = 0;
						p.guess = null;
						p.lastGain = null;
				p.guessedAt = null;
					}
					this.usedSentences.clear();
					this.sync();
				}
				break;
			case "reveal-now":
				if (this.isHostConn(conn) && this.phase === "guessing") {
					this.finishRound();
				}
				break;
			case "kick":
				if (this.isHostConn(conn)) {
					this.handleKick(String((msg as { playerId?: string }).playerId ?? ""));
				}
				break;
			case "ping":
				// keepalive + directory heartbeat (throttled inside)
				this.pushToDirectory(false, 15000);
				break;
			case "room-config":
				if (this.isHostConn(conn)) {
					this.handleRoomConfig(msg.isPublic, msg.password);
				}
				break;
			case "unanswer":
				this.handleUnanswer(conn);
				break;
			case "chat":
				this.handleChat(String(msg.text ?? ""), conn);
				break;
			case "leave":
				// Intentional exit — remove the seat immediately
				this.handleLeave(conn);
				break;
			case "debug-set-answer":
				this.handleDebugSetAnswer(conn, msg.playerId, msg.choiceId);
				break;
			case "debug-screen-message":
				this.handleDebugScreenMessage(conn, msg.text);
				break;
		}
	}

	private handleDebugSetAnswer(conn: Connection, targetId: string, choiceId: string | null) {
		if (!this.debugConnections.has(conn.id) || this.phase !== "guessing") return;
		const target = this.players.get(String(targetId));
		if (!target || !this.currentRound) return;
		const next = choiceId === null ? null : String(choiceId);
		if (next !== null && !this.currentRound.choices.some((choice) => choice.id === next)) return;
		target.guess = next;
		target.guessedAt = next === null ? null : Date.now();
		this.sync();
	}

	private handleDebugScreenMessage(conn: Connection, rawText: string) {
		const email = this.debugConnections.get(conn.id);
		if (!email) return;
		const text = String(rawText ?? "").trim().slice(0, 240);
		if (!text) return;
		this.broadcast(JSON.stringify({ type: "debug-screen-message", text, from: email } satisfies OutgoingMessage));
	}

	private handleLeave(conn: Connection) {
		const pid = this.connToPlayer.get(conn.id);
		if (!pid) return;
		for (const c of this.getConnections()) {
			if (this.connToPlayer.get(c.id) === pid) {
				this.connToPlayer.delete(c.id);
				try {
					c.close(1000, "left");
				} catch { /* ignore */ }
			}
		}
		const pend = this.pendingRemoval.get(pid);
		if (pend !== undefined) {
			clearTimeout(pend);
			this.pendingRemoval.delete(pid);
		}
		const player = this.players.get(pid);
		if (!player) return;
		this.players.delete(pid);
		if (player.isHost) {
			const heir = this.connectedPlayers()[0] ?? [...this.players.values()][0];
			if (heir) heir.isHost = true;
		}
		if (this.players.size === 0) this.removeFromDirectory();
		this.sync();
	}

	private handleUnanswer(conn: Connection) {
		if (this.phase !== "guessing") return;
		const player = this.playerByConn(conn);
		if (!player || player.guess === null) return;
		if (!this.actionAllowed(player.id)) return; // flood guard
		player.guess = null;
		player.guessedAt = null;
		this.sync();
	}

	/** 250ms min gap between state-changing actions per player (anti-spam). */
	private actionAllowed(playerId: string): boolean {
		const now = Date.now();
		const last = this.lastActionByPlayer.get(playerId) ?? 0;
		if (now - last < 250) return false;
		this.lastActionByPlayer.set(playerId, now);
		return true;
	}

	private handleChat(rawText: string, conn: Connection) {
		const player = this.playerByConn(conn);
		if (!player) return;
		const text = String(rawText).trim().slice(0, 200);
		if (!text) return;

		// Light flood control per player
		const now = Date.now();
		const last = this.lastChatByPlayer.get(player.id) ?? 0;
		if (now - last < 500) return;
		this.lastChatByPlayer.set(player.id, now);

		// Bad words become *** instead of being rejected
		const clean = censorText(text);

		const out = { type: "chat", from: player.id, name: player.name, text: clean } satisfies OutgoingMessage;
		this.chatLog.push({ name: player.name, text: clean });
		if (this.chatLog.length > 50) this.chatLog.shift();
		try {
			this.broadcast(JSON.stringify(out));
		} catch { /* ignore */ }
	}

	/** Host shuts the room down — everyone is disconnected and it delists. */
	private closeRoom() {
		this.clearTimer();
		for (const t of this.pendingRemoval.values()) clearTimeout(t);
		this.pendingRemoval.clear();
		for (const c of this.getConnections()) {
			try {
				c.close(4009, "room-closed");
			} catch { /* ignore */ }
		}
		this.connToPlayer.clear();
		this.players.clear();
		this.currentRound = null;
		this.roundNumber = 0;
		this.phase = "lobby";
		this.isPublic = false;
		this.removeFromDirectory();
	}

	private handleKick(targetId: string) {
		const target = this.players.get(targetId);
		if (!target || target.isHost) return;
		for (const c of this.getConnections()) {
			if (this.connToPlayer.get(c.id) === targetId) {
				this.connToPlayer.delete(c.id);
				try {
					c.close(4005, "kicked");
				} catch { /* ignore */ }
			}
		}
		const pend = this.pendingRemoval.get(targetId);
		if (pend !== undefined) {
			clearTimeout(pend);
			this.pendingRemoval.delete(targetId);
		}
		this.players.delete(targetId);
		if (this.players.size === 0) this.removeFromDirectory();
		this.sync();
	}

	private isHostConn(conn: Connection): boolean {
		const pid = this.connToPlayer.get(conn.id);
		return pid ? (this.players.get(pid)?.isHost ?? false) : false;
	}

	private playerByConn(conn: Connection): Player | undefined {
		const pid = this.connToPlayer.get(conn.id);
		return pid ? this.players.get(pid) : undefined;
	}

	// ------------------------------------------------------------------ join

	private handleHello(
		rawName: string,
		previousId: string | undefined,
		password: string | undefined,
		secret: string | undefined,
		conn: Connection,
	) {
		// Ignore duplicate hellos on an already-bound connection
		if (this.connToPlayer.has(conn.id)) return;

		// Guest accounts — any name that passes the filter
		const nameError = validateGuestName(String(rawName ?? ""));
		if (nameError) {
			this.sendError(conn, nameError);
			try {
				conn.close(4003, "bad-name");
			} catch { /* already gone */ }
			return;
		}
		const cleanName = String(rawName).trim().replace(/\s+/g, " ").slice(0, 16);

		// Reattach to an existing identity (refresh / reconnect) — the seat
		// token must match, otherwise this is treated as a brand-new joiner
		if (
			previousId &&
			this.players.has(previousId) &&
			this.players.get(previousId)!.secret === secret
		) {
			// Cancel any pending seat removal — this is a returning guest
			const pend = this.pendingRemoval.get(previousId);
			if (pend !== undefined) {
				clearTimeout(pend);
				this.pendingRemoval.delete(previousId);
			}
			const player = this.players.get(previousId)!;
			player.name = cleanName;
			player.connected = true;
			this.connToPlayer.set(conn.id, player.id);
			this.sendTo(conn, { type: "welcome", playerId: player.id, secret: player.secret } satisfies OutgoingMessage);
			this.sendChatHistory(conn);
			this.sync();
			return;
		}

		// Password gate for new joiners
		if (this.roomPassword !== null && String(password ?? "") !== this.roomPassword) {
			this.sendError(conn, "This room needs a password.");
			try {
				conn.close(4006, "bad-password");
			} catch { /* ignore */ }
			return;
		}

		// Fresh guest — enforce host-chosen capacity (host + maxPlayers guests)
		if (this.players.size >= 1 + this.settings.maxPlayers) {
			if (this.debugConnections.has(conn.id)) {
				// A verified preview developer may occupy an extra observer/debug seat.
			} else {
			this.sendError(conn, `Room is full (${this.settings.maxPlayers} players max).`);
			try {
				conn.close(4004, "full");
			} catch { /* ignore */ }
			return;
			}
		}

		// De-dupe names
		const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
		let name = cleanName;
		let n = 2;
		while (taken.has(name.toLowerCase())) {
			name = `${cleanName.slice(0, 14)} ${n++}`;
		}

		const isFirst = this.players.size === 0;
		const player: Player = {
			id: crypto.randomUUID(),
			secret: crypto.randomUUID(),
			name,
			score: 0,
			isHost: isFirst,
			guess: null,
			lastGain: null,
			guessedAt: null,
			connected: true,
		};
		this.players.set(player.id, player);
		this.connToPlayer.set(conn.id, player.id);
		this.sendTo(conn, { type: "welcome", playerId: player.id, secret: player.secret } satisfies OutgoingMessage);
		this.sendChatHistory(conn);
		this.sync();
	}

	onClose(connection: Connection): void | Promise<void> {
		this.handleDisconnect(connection);
	}

	onError(connection: Connection): void | Promise<void> {
		this.handleDisconnect(connection);
	}

	private handleDisconnect(conn: Connection) {
		this.debugConnections.delete(conn.id);
		const pid = this.connToPlayer.get(conn.id);
		if (!pid) return;
		this.connToPlayer.delete(conn.id);
		const player = this.players.get(pid);
		if (!player) return;

		const stillBound = [...this.connToPlayer.values()].includes(pid);
		if (stillBound) return; // same guest on another tab

		player.connected = false;
		player.guess = null;
		player.guessedAt = null; // never leave ghost locks in
		this.sync();

		// Short grace for refreshes — then the seat is removed entirely.
		const t = setTimeout(() => {
			this.pendingRemoval.delete(pid);
			const p = this.players.get(pid);
			if (!p || p.connected) return;
			this.players.delete(pid);
			if (p.isHost) {
				const heir = this.connectedPlayers()[0] ?? [...this.players.values()][0];
				if (heir) heir.isHost = true;
			}
			if (this.players.size === 0) this.removeFromDirectory();
			this.sync();
		}, 5000);
		this.pendingRemoval.set(pid, t);
	}

	// -------------------------------------------------------------- settings

	private handleSettings(partial: Partial<GameSettings>, conn: Connection) {
		if (!this.isHostConn(conn)) return;
		const s = { ...this.settings };
		if (partial.targetScore !== undefined)
			s.targetScore = clamp(partial.targetScore, 10, 999, s.targetScore);
		if (partial.roundSeconds !== undefined)
			s.roundSeconds = clamp(partial.roundSeconds, 10, 300, s.roundSeconds);
		if (partial.choiceCount !== undefined)
			s.choiceCount = clamp(partial.choiceCount, 4, 20, s.choiceCount);
		if (partial.pointsExact !== undefined)
			s.pointsExact = clamp(partial.pointsExact, 1, 50, s.pointsExact);
		if (partial.pointsRelated !== undefined)
			s.pointsRelated = clamp(partial.pointsRelated, 0, Math.max(0, s.pointsExact - 1), s.pointsRelated);
		if (partial.speedBonus !== undefined)
			s.speedBonus = clamp(partial.speedBonus, 0, 50, s.speedBonus);
		if (partial.autoNextSeconds !== undefined)
			s.autoNextSeconds = clamp(partial.autoNextSeconds, 0, 120, s.autoNextSeconds);
		if (typeof partial.includeAncient === "boolean")
			s.includeAncient = partial.includeAncient;
		if (typeof partial.includeFake === "boolean")
			s.includeFake = partial.includeFake;
		if (partial.hintMode && HINT_MODES.includes(partial.hintMode))
			s.hintMode = partial.hintMode;
		if (partial.earlyReveal !== undefined)
			s.earlyReveal = Boolean(partial.earlyReveal);
		if (partial.maxPlayers !== undefined)
			s.maxPlayers = clamp(partial.maxPlayers, 1, MAX_PLAYERS, s.maxPlayers);
		this.settings = s;
		this.sync();
	}

	// ----------------------------------------------------------------- rounds

	private handleQuickStart(conn: Connection) {
		if (!this.isHostConn(conn)) return;
		if (this.phase !== "lobby" && this.phase !== "reveal") return;
		void this.startRandomRound();
	}

	private handleStartRound(sentenceIndex: number | undefined, conn: Connection) {
		if (!this.isHostConn(conn)) return;
		if (this.phase !== "lobby" && this.phase !== "reveal") return;
		if (
			typeof sentenceIndex !== "number" ||
			!Number.isInteger(sentenceIndex) ||
			sentenceIndex < 0 ||
			sentenceIndex >= SENTENCES.length
		) {
			void this.startRandomRound();
			return;
		}
		void this.startRound(sentenceIndex);
	}

	private pickSentenceIndex(): number {
		const remaining: number[] = [];
		for (let i = 0; i < SENTENCES.length; i++) {
			if (!this.usedSentences.has(i)) remaining.push(i);
		}
		if (remaining.length === 0) {
			this.usedSentences.clear();
			return Math.floor(Math.random() * SENTENCES.length);
		}
		return randomOf(remaining);
	}

	private buildChoices(correctId: string, poolIds: string[]): ChoiceOption[] {
		const ids = new Set<string>([correctId]);
		const correctGroup = groupOf(correctId);

		// Prefer same-group languages so near-miss answers are possible
		const related = shuffle(
			poolIds.filter((id) => id !== correctId && groupOf(id) === correctGroup),
		).slice(0, 2);
		for (const id of related) ids.add(id);

		const others = shuffle(poolIds.filter((id) => !ids.has(id)));
		for (const id of others) {
			if (ids.size >= this.settings.choiceCount) break;
			ids.add(id);
		}

		return shuffle([...ids]).map((id) => {
			const lang = langById(id)!;
			return { id, label: lang.name, flag: lang.flag, sub: lang.country };
		});
	}

	private async startRandomRound(): Promise<void> {
		await this.startRound(this.pickSentenceIndex());
	}

	private async startRound(sentenceIndex: number): Promise<void> {
		if (this.players.size === 0) return;
		// Translation can take a few seconds. Ignore duplicate button presses instead
		// of cancelling and restarting the request that is already in flight.
		if (this.roundStarting) return;
		this.roundStarting = true;
		this.clearTimer();
		const myToken = this.token;

		const sentenceEn = SENTENCES[sentenceIndex] ?? randomOf(SENTENCES);
		const pool = this.enabledPool();
		const poolIds = pool.map((l) => l.id);

		let sentence = sentenceEn;
		let translation: string | null = null;
		let chosenId: string | null = null;
		let wasPhrasebook = false;

		// Never repeat a language until the whole pool has been used once,
		// and skip languages whose translations keep failing (5 min cooldown)
		const healthy = (l: import("../game/languages").LangDef) => {
			const fails = this.langFails.get(l.id) ?? 0;
			if (fails < 3) return true;
			const lastFail = this.lastLangFail.get(l.id) ?? 0;
			return Date.now() - lastFail > 300_000;
		};
		let rollPool = pool.filter(
			(l) => !this.usedLangIds.has(l.id) && healthy(l),
		);
		if (rollPool.length === 0)
			rollPool = pool.filter((l) => !this.usedLangIds.has(l.id));
		if (rollPool.length === 0) {
			this.usedLangIds.clear();
			rollPool = pool;
		}

		for (let attempt = 0; attempt < 6; attempt++) {
			const lang = randomOf(rollPool);
			if (lang.category === "fake") {
				chosenId = lang.id;
				sentence = sentenceEn;
				translation = fakeTranslate(lang.id, sentenceEn);
				wasPhrasebook = false;
				break;
			}
			if (lang.category === "ancient") {
				if (lang.code) {
					translation = await translateText(sentenceEn, lang.code);
				}
				if (translation) {
					chosenId = lang.id;
					sentence = sentenceEn;
					wasPhrasebook = false;
					break;
				}
				// Fall back to curated phrasebook entry
				const book = PHRASEBOOKS[lang.id];
				if (book && book.length) {
					const phrase = randomOf(book);
					chosenId = lang.id;
					sentence = phrase.en;
					translation = phrase.text;
					wasPhrasebook = true;
					break;
				}
				continue;
			}
			// modern
			translation = await translateText(sentenceEn, lang.code!);
			if (translation) {
				chosenId = lang.id;
				sentence = sentenceEn;
				wasPhrasebook = false;
				this.langFails.delete(lang.id);
				break;
			}
			this.langFails.set(lang.id, (this.langFails.get(lang.id) ?? 0) + 1);
			this.lastLangFail.set(lang.id, Date.now());
			console.warn(`[polygloss] translation failed for ${lang.id} (attempt ${attempt + 1})`);
		}

		if (myToken !== this.token) {
			this.roundStarting = false;
			return; // superseded by a newer request
		}

		// Offline safety net: live translation failed entirely — use an ancient
		// phrasebook round or a locally generated fake round, else give up.
		if (!chosenId || translation === null) {
			const bookLangs = pool.filter((l) => l.category === "ancient" && PHRASEBOOKS[l.id]?.length);
			if (bookLangs.length > 0) {
				const lang = randomOf(bookLangs);
				const phrase = randomOf(PHRASEBOOKS[lang.id]);
				chosenId = lang.id;
				sentence = phrase.en;
				translation = phrase.text;
				wasPhrasebook = true;
				console.warn("[polygloss] offline fallback → phrasebook round");
			} else {
				const fakes = pool.filter((l) => l.category === "fake");
				if (fakes.length > 0) {
					const lang = randomOf(fakes);
					chosenId = lang.id;
					sentence = sentenceEn;
					translation = fakeTranslate(lang.id, sentenceEn);
					console.warn("[polygloss] offline fallback → fake round");
				}
			}
		}

		if (!chosenId || translation === null) {
			this.roundStarting = false;
			for (const c of this.getConnections()) {
				if (this.isHostConn(c)) {
					this.sendError(c, "Translation services are unreachable right now. Try again.");
				}
			}
			return;
		}

		this.usedSentences.add(sentenceIndex);
		this.usedLangIds.add(chosenId);
		this.roundNumber++;
		this.phase = "guessing";
		for (const p of this.players.values()) {
			p.guess = null;
			p.lastGain = null;
				p.guessedAt = null;
			p.guessedAt = null;
		}

		const deadline = Date.now() + this.settings.roundSeconds * 1000;
		this.currentRound = {
			sentenceIndex,
			sentence,
			translation,
			langId: chosenId,
			wasPhrasebook,
			choices: this.buildChoices(chosenId, poolIds),
			deadline,
			token: myToken,
			fastestId: null,
			unanimous: false,
		};
		this.roundStarting = false;
		this.sync();

		this.timer = setTimeout(() => {
			if (this.token === myToken) this.finishRound();
		}, this.settings.roundSeconds * 1000 + 300);
	}

	private handleGuess(choiceId: string, conn: Connection) {
		if (this.phase !== "guessing" || !this.currentRound) return;
		const player = this.playerByConn(conn);
		if (!player) return;
		if (!this.actionAllowed(player.id)) return; // flood guard
		if (!this.currentRound.choices.some((c) => c.id === choiceId)) return;
		const wasNew = player.guess === null;
		player.guess = choiceId; // switching answers is allowed until reveal
		player.guessedAt = Date.now();
		this.sync();
		if (this.settings.earlyReveal && wasNew && this.allGuessed()) this.finishRound();
	}

	private allGuessed(): boolean {
		const active = [...this.players.values()].filter((p) => p.connected || p.guess !== null);
		return active.length > 0 && active.every((p) => p.guess !== null);
	}

	private finishRound() {
		if (this.phase !== "guessing" || !this.currentRound) return;
		this.clearTimer();
		this.phase = "reveal";

		const correctId = this.currentRound.langId;
		const correctGroup = groupOf(correctId);
		const round = this.currentRound;

		const answered = [...this.players.values()].filter((p) => p.guess !== null);

		// Unanimity rule: if two or more players answered and everyone picked
		// the same option, nobody scores the round.
		const unanimous =
			answered.length >= 2 && new Set(answered.map((p) => p.guess)).size === 1;

		let fastestId: string | null = null;
		if (!unanimous) {
			const exactGuessers = answered
				.filter((p) => p.guess === correctId)
				.sort((a, b) => (a.guessedAt ?? Infinity) - (b.guessedAt ?? Infinity));
			fastestId = exactGuessers[0]?.id ?? null;
		}
		round.fastestId = fastestId;
		round.unanimous = unanimous;

		for (const p of this.players.values()) {
			if (p.guess === null || unanimous) {
				p.lastGain = p.guess === null ? null : 0;
				continue;
			}
			if (p.guess === correctId) {
				p.lastGain = this.settings.pointsExact;
				if (p.id === fastestId) p.lastGain += this.settings.speedBonus;
			} else if (groupOf(p.guess) === correctGroup) {
				p.lastGain = this.settings.pointsRelated;
			} else {
				p.lastGain = 0;
			}
			p.score += p.lastGain;
		}

		// Match over once someone reaches the target score
		const target = this.settings.targetScore;
		const hasWinner = [...this.players.values()].some((p) => p.score >= target);
		if (hasWinner) {
			this.phase = "matchover";
			this.sync();
			return;
		}

		this.sync();

		// Auto-advance so the pace never stalls (0 = manual only)
		const delay = this.settings.autoNextSeconds;
		if (delay > 0) {
			const myToken = this.token;
			this.timer = setTimeout(() => {
				if (this.token === myToken && this.phase === "reveal") {
					void this.startRandomRound();
				}
			}, delay * 1000);
		}
	}
}

// ---------------------------------------------------------------------------
// RoomDirectory — a single global DO listing all public rooms
// ---------------------------------------------------------------------------

type DirEntry = {
	code: string;
	hostName: string;
	players: number;
	maxPlayers: number;
	phase: Phase;
	hasPassword: boolean;
	ts: number;
};

export class RoomDirectory {
	rooms = new Map<string, DirEntry>();

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "POST") {
			const body = (await request.json()) as {
				type: "upsert" | "remove";
				code?: string;
				entry?: Omit<DirEntry, "ts">;
			};
			if (body.type === "upsert" && body.code && body.entry) {
				this.rooms.set(body.code, { ...body.entry, ts: Date.now() });
			} else if (body.type === "remove" && body.code) {
				this.rooms.delete(body.code);
			}
			return new Response("ok");
		}

		if (url.pathname.endsWith("/list")) {
			// Prune rooms that stopped heartbeating — dead lobbies vanish fast
			const cutoff = Date.now() - 60_000;
			for (const [k, v] of this.rooms) {
				if (v.ts < cutoff) this.rooms.delete(k);
			}
			const list = [...this.rooms.values()].sort((a, b) => b.players - a.players);
			return Response.json(list);
		}

		return new Response("Not Found", { status: 404 });
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const debugIdentity = await verifyDebugIdentity(request, env);
		if (url.pathname === "/api/debug-session" && request.method === "GET") {
			return Response.json(
				debugIdentity ? { enabled: true, email: debugIdentity } : { enabled: false },
				{ status: debugIdentity ? 200 : 404, headers: { "cache-control": "no-store" } },
			);
		}
		if (url.pathname === "/api/rooms" && request.method === "GET") {
			const stub = env.RoomDirectory.get(env.RoomDirectory.idFromName("global"));
			return stub.fetch("https://dir/list");
		}
		const routedRequest = debugIdentity
			? new Request(request, { headers: withVerifiedDebugHeader(request.headers, debugIdentity) })
			: request;
		return (
			(await routePartykitRequest(routedRequest, { ...env })) ||
			new Response("Not Found", { status: 404 })
		);
	},
} satisfies ExportedHandler<Env>;

type DebugEnv = Env & {
	DEBUG_TOOLS_ENABLED?: string;
	CF_ACCESS_TEAM_DOMAIN?: string;
	CF_ACCESS_AUD?: string;
	CF_ACCESS_ALLOWED_EMAIL?: string;
};

function withVerifiedDebugHeader(headers: Headers, email: string): Headers {
	const copy = new Headers(headers);
	copy.delete("x-lg-verified-debug-email");
	copy.set("x-lg-verified-debug-email", email);
	return copy;
}

function decodeJwtPart(value: string): Record<string, unknown> {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
	return JSON.parse(atob(padded)) as Record<string, unknown>;
}

function decodeJwtBytes(value: string): Uint8Array {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
	return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function verifyDebugIdentity(request: Request, rawEnv: Env): Promise<string | null> {
	const env = rawEnv as DebugEnv;
	if (env.DEBUG_TOOLS_ENABLED !== "true") return null;
	const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.replace(/\/$/, "");
	const audience = env.CF_ACCESS_AUD;
	const allowedEmail = env.CF_ACCESS_ALLOWED_EMAIL?.trim().toLowerCase();
	const token = request.headers.get("cf-access-jwt-assertion");
	if (!teamDomain || !audience || !allowedEmail || !token) return null;
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return null;
		const header = decodeJwtPart(parts[0]);
		const claims = decodeJwtPart(parts[1]);
		if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
		const now = Math.floor(Date.now() / 1000);
		const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
		if (
			claims.iss !== teamDomain ||
			!audiences.includes(audience) ||
			typeof claims.exp !== "number" || claims.exp <= now ||
			(typeof claims.nbf === "number" && claims.nbf > now) ||
			typeof claims.email !== "string" || claims.email.toLowerCase() !== allowedEmail
		) return null;
		const certs = await fetch(`${teamDomain}/cdn-cgi/access/certs`, {
			headers: { accept: "application/json" },
			cf: { cacheTtl: 3600, cacheEverything: true },
		});
		if (!certs.ok) return null;
		const jwks = await certs.json() as { keys?: Array<JsonWebKey & { kid?: string }> };
		const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.kty === "RSA");
		if (!jwk) return null;
		const key = await crypto.subtle.importKey(
			"jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
		);
		const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
		const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodeJwtBytes(parts[2]), signed);
		return valid ? claims.email : null;
	} catch {
		return null;
	}
}
