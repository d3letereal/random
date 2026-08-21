import { routePartykitRequest, Server } from "partyserver";

import type { Connection, ConnectionContext } from "partyserver";
import {
	ALL_LANGS,
	PHRASEBOOKS,
	fakeTranslate,
	groupOf,
	langById,
	obfuscate,
	translateText,
} from "../game/languages";
import { SENTENCES } from "../game/sentences";
import {
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
	name: string;
	score: number;
	isHost: boolean;
	guess: string | null;
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

const HINT_MODES: HintMode[] = ["third", "half", "first", "full"];

export class Globe extends Server {
	players = new Map<string, Player>();
	connToPlayer = new Map<string, string>();
	settings: GameSettings = { ...DEFAULT_SETTINGS };
	phase: Phase = "lobby";
	roundNumber = 0;
	currentRound: Round | null = null;
	usedSentences = new Set<number>();
	private token = 0;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private roomCode = "?????";

	// ------------------------------------------------------------------ util

	private enabledPool(): import("../game/languages").LangDef[] {
		return ALL_LANGS.filter((l) => {
			if (l.category === "modern") return true;
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
				};
			}
		}

		const state: PublicState = {
			phase: this.phase,
			hostId: [...this.players.values()].find((p) => p.isHost)?.id ?? "",
			players: publicPlayers,
			settings: this.settings,
			roomCode: this.roomCode,
			maxPlayers: MAX_PLAYERS,
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
		let msg: IncomingMessage;
		try {
			msg = JSON.parse(message) as IncomingMessage;
		} catch {
			return;
		}

		switch (msg.type) {
			case "hello":
				this.handleHello(msg.name, msg.previousId, conn);
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
					}
					this.usedSentences.clear();
					this.sync();
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
					}
					this.usedSentences.clear();
					this.sync();
				}
				break;
		}
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

	private handleHello(rawName: string, previousId: string | undefined, conn: Connection) {
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

		// Reattach to an existing identity (refresh / reconnect)
		if (previousId && this.players.has(previousId)) {
			const player = this.players.get(previousId)!;
			// Kick any stale connection still bound to this identity
			for (const other of this.getConnections()) {
				if (other.id !== conn.id && this.connToPlayer.get(other.id) === previousId) {
					this.connToPlayer.delete(other.id);
					try {
						other.close(4001, "replaced");
					} catch { /* ignore */ }
				}
			}
			player.name = cleanName;
			player.connected = true;
			this.connToPlayer.set(conn.id, player.id);
			this.sendTo(conn, { type: "welcome", playerId: player.id } satisfies OutgoingMessage);
			this.sync();
			return;
		}

		// Fresh guest — enforce capacity (host + MAX_PLAYERS guests)
		if (this.players.size >= 1 + MAX_PLAYERS) {
			this.sendError(conn, `Room is full (${MAX_PLAYERS} players max).`);
			try {
				conn.close(4004, "full");
			} catch { /* ignore */ }
			return;
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
			name,
			score: 0,
			isHost: isFirst,
			guess: null,
			lastGain: null,
			connected: true,
		};
		this.players.set(player.id, player);
		this.connToPlayer.set(conn.id, player.id);
		this.sendTo(conn, { type: "welcome", playerId: player.id } satisfies OutgoingMessage);
		this.sync();
	}

	onClose(connection: Connection): void | Promise<void> {
		this.handleDisconnect(connection);
	}

	onError(connection: Connection): void | Promise<void> {
		this.handleDisconnect(connection);
	}

	private handleDisconnect(conn: Connection) {
		const pid = this.connToPlayer.get(conn.id);
		if (!pid) return;
		this.connToPlayer.delete(conn.id);
		const player = this.players.get(pid);
		if (!player) return;

		const stillBound = [...this.connToPlayer.values()].includes(pid);
		if (!stillBound) {
			player.connected = false;
			player.guess = null; // never leave ghost locks in

			// Host migration
			if (player.isHost && !stillBound) {
				const heir = this.connectedPlayers()[0];
				if (heir) {
					heir.isHost = true;
					player.isHost = false;
				}
			}
		}
		this.sync();

		// If everyone guessed except someone who just left, wrap the round up
		if (this.phase === "guessing" && this.allGuessed()) {
			this.finishRound();
		}
	}

	private allGuessed(): boolean {
		const active = this.connectedPlayers().filter((p) => !p.isHost || true); // host guesses too
		return active.length > 0 && active.every((p) => p.guess !== null);
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
			s.choiceCount = clamp(partial.choiceCount, 4, 8, s.choiceCount);
		if (partial.pointsExact !== undefined)
			s.pointsExact = clamp(partial.pointsExact, 1, 50, s.pointsExact);
		if (partial.pointsRelated !== undefined)
			s.pointsRelated = clamp(partial.pointsRelated, 0, Math.max(0, s.pointsExact - 1), s.pointsRelated);
		if (partial.autoNextSeconds !== undefined)
			s.autoNextSeconds = clamp(partial.autoNextSeconds, 0, 120, s.autoNextSeconds);
		if (typeof partial.includeFake === "boolean") s.includeFake = partial.includeFake;
		if (typeof partial.includeAncient === "boolean")
			s.includeAncient = partial.includeAncient;
		if (partial.hintMode && HINT_MODES.includes(partial.hintMode))
			s.hintMode = partial.hintMode;
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
		this.clearTimer();
		const myToken = this.token;

		const sentenceEn = SENTENCES[sentenceIndex] ?? randomOf(SENTENCES);
		const pool = this.enabledPool();
		const poolIds = pool.map((l) => l.id);

		let sentence = sentenceEn;
		let translation: string | null = null;
		let chosenId: string | null = null;
		let wasPhrasebook = false;

		for (let attempt = 0; attempt < 4; attempt++) {
			const lang = randomOf(pool);
			if (lang.category === "fake") {
				chosenId = lang.id;
				translation = fakeTranslate(lang.id, sentenceEn);
				wasPhrasebook = false;
				sentence = sentenceEn;
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
				break;
			}
			console.warn(`[polygloss] translation failed for ${lang.id} (attempt ${attempt + 1})`);
		}

		if (myToken !== this.token) return; // superseded by a newer request

		// Offline safety net: live translation failed entirely — use an ancient
		// phrasebook round if available, then a fake-language round, else give up.
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
			for (const c of this.getConnections()) {
				if (this.isHostConn(c)) {
					this.sendError(c, "Translation services are unreachable right now. Try again.");
				}
			}
			return;
		}

		this.usedSentences.add(sentenceIndex);
		this.roundNumber++;
		this.phase = "guessing";
		for (const p of this.players.values()) {
			p.guess = null;
			p.lastGain = null;
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
		};
		this.sync();

		this.timer = setTimeout(() => {
			if (this.token === myToken) this.finishRound();
		}, this.settings.roundSeconds * 1000 + 300);
	}

	private handleGuess(choiceId: string, conn: Connection) {
		if (this.phase !== "guessing" || !this.currentRound) return;
		const player = this.playerByConn(conn);
		if (!player || player.guess !== null) return;
		if (!this.currentRound.choices.some((c) => c.id === choiceId)) return;
		player.guess = choiceId;
		this.sync();
		if (this.allGuessed()) this.finishRound();
	}

	private finishRound() {
		if (this.phase !== "guessing" || !this.currentRound) return;
		this.clearTimer();
		this.phase = "reveal";

		const correctId = this.currentRound.langId;
		const correctGroup = groupOf(correctId);

		for (const p of this.players.values()) {
			if (p.guess === null) {
				p.lastGain = null;
				continue;
			}
			if (p.guess === correctId) {
				p.lastGain = this.settings.pointsExact;
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

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return (
			(await routePartykitRequest(request, { ...env })) ||
			new Response("Not Found", { status: 404 })
		);
	},
} satisfies ExportedHandler<Env>;
