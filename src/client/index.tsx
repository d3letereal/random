import "./styles.css";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import usePartySocket from "partysocket/react";

import { SENTENCES } from "../game/sentences";
import { MAX_PLAYERS, validateGuestName } from "../shared";
import type {
	GameSettings,
	IncomingMessage,
	OutgoingMessage,
	PublicState,
} from "../shared";

const ROOM_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GLYPHS = "αβγδεζθλμξπσφψωЖДФШЩдहोந한文語あ漢ᚱᛟþðæאבגدحकम".split("");

function newRoomCode(): string {
	let code = "";
	for (let i = 0; i < 5; i++) {
		code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
	}
	return code;
}

function idKey(room: string): string {
	return `polygloss:id:${room.toUpperCase()}`;
}

// ---------------------------------------------------------------------------

const GlyphRain = React.memo(function GlyphRain() {
	const glyphs = useMemo(
		() =>
			Array.from({ length: 36 }, (_, i) => ({
				ch: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
				left: `${(i * 2.8 + Math.random() * 2).toFixed(1)}%`,
				delay: `-${(Math.random() * 24).toFixed(1)}s`,
				dur: `${(14 + Math.random() * 16).toFixed(1)}s`,
				size: `${(16 + Math.random() * 22).toFixed(0)}px`,
			})),
		[],
	);
	return (
		<div className="glyph-rain" aria-hidden="true">
			{glyphs.map((g, i) => (
				<span
					key={i}
					style={{ left: g.left, animationDelay: g.delay, animationDuration: g.dur, fontSize: g.size }}
				>
					{g.ch}
				</span>
			))}
		</div>
	);
});

function Logo({ small }: { small?: boolean }) {
	return (
		<div className={small ? "logo logo-small" : "logo"}>
			<span className="logo-glyph">文</span>
			<span className="logo-text">
				Lang<b>Guesser</b>
			</span>
		</div>
	);
}

const HINT_LABELS: Record<GameSettings["hintMode"], string> = {
	full: "Full text",
	some: "Some words hidden",
	most: "Most words hidden",
};

// --------------------------------------------------------------------------- Home

function Home({
	onEnter,
	initialCode,
}: {
	onEnter: (name: string, code: string) => void;
	initialCode: string;
}) {
	const [name, setName] = useState(
		() => localStorage.getItem("polygloss:name") ?? "",
	);
	const [joinCode, setJoinCode] = useState(initialCode);
	const [error, setError] = useState<string | null>(null);

	const checkName = (): string | null => {
		const err = validateGuestName(name);
		if (err) setError(err);
		else localStorage.setItem("polygloss:name", name.trim().replace(/\s+/g, " "));
		return err ? null : name;
	};

	const create = () => {
		if (!checkName()) return;
		onEnter(name, newRoomCode());
	};

	const join = () => {
		const code = joinCode.trim().toUpperCase();
		if (!/^[A-Z0-9]{4,8}$/.test(code)) {
			setError("Room codes are 5 letters/numbers.");
			return;
		}
		if (!checkName()) return;
		onEnter(name, code);
	};

	return (
		<div className="home-wrap">
			<GlyphRain />
			<main className="home-card card pop-in">
				<Logo />
				<p className="tagline">
					The host picks a sentence — it gets translated into a mystery
					language. Guess it before the timer runs out.
				</p>

				<label className="field-label" htmlFor="guest-name">Guest name</label>
				<input
					id="guest-name"
					className="input name-input"
					placeholder="Guest1234"
					maxLength={16}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && create()}
				/>

				<button className="btn btn-primary btn-xl" onClick={create}>
					✨ Create Room
				</button>

				<div className="divider"><span>or join a friend</span></div>

				<div className="join-row">
					<input
						className="input code-input"
						placeholder="CODE"
						maxLength={8}
						value={joinCode}
						onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
						onKeyDown={(e) => e.key === "Enter" && join()}
					/>
					<button className="btn btn-secondary btn-xl" onClick={join}>
						Join →
					</button>
				</div>

				{error && <p className="form-error">⚠ {error}</p>}

				<div className="rules-strip">
					<span><i>10 pts</i> exact language</span>
					<span><i>+ bonus</i> fastest correct</span>
					<span><i>3 pts</i> closely related</span>
					<span><i>all same pick</i> nobody scores</span>
					<span><i>{MAX_PLAYERS}</i> players max</span>
				</div>
			</main>
			<footer className="home-foot">multiplayer via PartyServer · translations live from the web</footer>
		</div>
	);
}

// --------------------------------------------------------------------------- Settings

function Presets({ values, current, onPick }: { values: number[]; current: number; onPick: (n: number) => void }) {
	return (
		<span className="presets">
			{values.map((v) => (
				<button key={v} type="button" className={`preset ${v === current ? "on" : ""}`} onClick={() => onPick(v)}>
					{v}
				</button>
			))}
		</span>
	);
}

function SettingsPanel({
	settings,
	canEdit,
	onChange,
}: {
	settings: GameSettings;
	canEdit: boolean;
	onChange: (s: Partial<GameSettings>) => void;
}) {
	return (
		<section className={`card settings ${canEdit ? "" : "locked-panel"}`}>
			<h3>⚙️ Match settings {!canEdit && <em>(host only)</em>}</h3>
			{canEdit && (
				<div className="difficulty-row">
					<span className="field-label-sm">🎚️ Difficulty presets</span>
					<div className="presets">
						<button
							className="preset"
							onClick={() => onChange({ hintMode: "full", choiceCount: 4, roundSeconds: 60, includeAncient: false, includeFake: false })}
						>
							🙂 Easy
						</button>
						<button
							className="preset"
							onClick={() => onChange({ hintMode: "some", choiceCount: 6, roundSeconds: 45, includeAncient: true, includeFake: false })}
						>
							😐 Hard
						</button>
						<button
							className="preset"
							onClick={() => onChange({ hintMode: "most", choiceCount: 10, roundSeconds: 30, includeAncient: true, includeFake: true })}
						>
							💀 Super hard
						</button>
					</div>
				</div>
			)}
			<div className="settings-grid">
				<label>
					<span>🎯 First to</span>
					<input
						type="number"
						min={10}
						max={999}
						step={10}
						disabled={!canEdit}
						value={settings.targetScore}
						onChange={(e) => onChange({ targetScore: Number(e.target.value) })}
					/>
					<Presets values={[30, 50, 100]} current={settings.targetScore} onPick={(n) => onChange({ targetScore: n })} />
				</label>
				<label>
					<span>⏱️ Seconds / round</span>
					<input
						type="number"
						min={10}
						max={300}
						step={5}
						disabled={!canEdit}
						value={settings.roundSeconds}
						onChange={(e) => onChange({ roundSeconds: Number(e.target.value) })}
					/>
					<Presets values={[20, 30, 45, 60]} current={settings.roundSeconds} onPick={(n) => onChange({ roundSeconds: n })} />
				</label>
				<label>
					<span>💯 Points — exact</span>
					<input
						type="number"
						min={1}
						max={50}
						disabled={!canEdit}
						value={settings.pointsExact}
						onChange={(e) => onChange({ pointsExact: Number(e.target.value) })}
					/>
					<Presets values={[5, 10, 20]} current={settings.pointsExact} onPick={(n) => onChange({ pointsExact: n })} />
				</label>
				<label>
					<span>🎈 Points — related</span>
					<input
						type="number"
						min={0}
						max={Math.max(0, settings.pointsExact - 1)}
						disabled={!canEdit}
						value={settings.pointsRelated}
						onChange={(e) => onChange({ pointsRelated: Number(e.target.value) })}
					/>
					<Presets values={[0, 3, 5]} current={settings.pointsRelated} onPick={(n) => onChange({ pointsRelated: n })} />
				</label>
				<label>
					<span>⚡ Fastest-correct bonus</span>
					<input
						type="number"
						min={0}
						max={50}
						disabled={!canEdit}
						value={settings.speedBonus}
						onChange={(e) => onChange({ speedBonus: Number(e.target.value) })}
					/>
					<Presets values={[0, 5, 10]} current={settings.speedBonus} onPick={(n) => onChange({ speedBonus: n })} />
				</label>
				<label>
					<span>🧩 Answer choices</span>
					<select
						disabled={!canEdit}
						value={settings.choiceCount}
						onChange={(e) => onChange({ choiceCount: Number(e.target.value) })}
					>
						<option value={4}>4 — tricky</option>
						<option value={6}>6 — standard</option>
						<option value={8}>8 — busy</option>
						<option value={12}>12 — crowded</option>
						<option value={16}>16 — huge</option>
						<option value={20}>20 — language buffet</option>
					</select>
				</label>
				<label>
					<span>⏭️ Pause before next round</span>
					<input
						type="number"
						min={0}
						max={120}
						disabled={!canEdit}
						value={settings.autoNextSeconds}
						onChange={(e) => onChange({ autoNextSeconds: Number(e.target.value) })}
					/>
					<Presets values={[0, 8, 12]} current={settings.autoNextSeconds} onPick={(n) => onChange({ autoNextSeconds: n })} />
				</label>
			</div>
			<div className="toggle-row">
				<label className="toggle">
					<input
						type="checkbox"
						disabled={!canEdit}
						checked={settings.includeAncient}
						onChange={(e) => onChange({ includeAncient: e.target.checked })}
					/>
					<span>🏛️ Ancient languages <small>Latin, Sanskrit, hieroglyphs…</small></span>
				</label>
				<label className="toggle">
					<input
						type="checkbox"
						disabled={!canEdit}
						checked={settings.includeFake}
						onChange={(e) => onChange({ includeFake: e.target.checked })}
					/>
					<span>✨ Fake languages <small>Zuthric, Quovax… good luck</small></span>
				</label>
				<label className="toggle">
					<input
						type="checkbox"
						disabled={!canEdit}
						checked={settings.earlyReveal}
						onChange={(e) => onChange({ earlyReveal: e.target.checked })}
					/>
					<span>⏩ End rounds early <small>reveal as soon as everyone has answered</small></span>
				</label>
			</div>
			<label className="hint-select">
				<span>🔎 Letter hints</span>
				<select
					disabled={!canEdit}
					value={settings.hintMode}
					onChange={(e) =>
						onChange({ hintMode: e.target.value as GameSettings["hintMode"] })
					}
				>
					{(Object.keys(HINT_LABELS) as GameSettings["hintMode"][]).map((m) => (
						<option key={m} value={m}>{HINT_LABELS[m]}</option>
					))}
				</select>
			</label>
		</section>
	);
}

// --------------------------------------------------------------------------- Sentence picker

function SentencePicker({ onStart, onClose }: { onStart: (i: number) => void; onClose: () => void }) {
	const [q, setQ] = useState("");
	const [sel, setSel] = useState<number | null>(null);
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => ref.current?.focus(), []);
	const list = useMemo(() => {
		const needle = q.trim().toLowerCase();
		return SENTENCES.map((s, i) => ({ s, i })).filter(
			(x) => !needle || x.s.toLowerCase().includes(needle),
		);
	}, [q]);
	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal card" onClick={(e) => e.stopPropagation()}>
				<header>
					<h3>📝 Pick a sentence</h3>
					<button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
				</header>
				<input
					ref={ref}
					className="input"
					placeholder="Search 200 sentences…"
					value={q}
					onChange={(e) => setQ(e.target.value)}
				/>
				<p className="picker-count">
					{sel !== null ? `Selected: “${SENTENCES[sel]}”` : `${list.length} sentences — click one to select`}
				</p>
				<ul className="sentence-list">
					{list.map(({ s, i }) => (
						<li key={i}>
							<button className={sel === i ? "selected" : ""} onClick={() => setSel(i)}>{s}</button>
						</li>
					))}
				</ul>
				<button
					className="btn btn-primary btn-xl"
					disabled={sel === null}
					onClick={() => sel !== null && onStart(sel)}
				>
					{sel === null ? "Select a sentence above first" : "▶ Start round with this sentence"}
				</button>
			</div>
		</div>
	);
}

// --------------------------------------------------------------------------- Timer

function useCountdown(deadline: number | null): number | null {
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		if (deadline === null) return;
		const iv = setInterval(() => setNow(Date.now()), 200);
		return () => clearInterval(iv);
	}, [deadline]);
	if (deadline === null) return null;
	return Math.max(0, deadline - now);
}

function AutoNext({ seconds }: { seconds: number }) {
	const [left, setLeft] = useState(seconds);
	useEffect(() => {
		setLeft(seconds);
		const started = Date.now();
		const iv = setInterval(() => {
			setLeft(Math.max(0, seconds - Math.floor((Date.now() - started) / 1000)));
		}, 250);
		return () => clearInterval(iv);
	}, [seconds]);
	return <span className="auto-countdown">auto in {left}s</span>;
}

// --------------------------------------------------------------------------- bits

function PlayerAvatar({ name }: { name: string }) {
	const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
	return (
		<span className="avatar" style={{ background: `hsl(${hue} 60% 40%)` }}>
			{name.charAt(0).toUpperCase()}
		</span>
	);
}

function ScoreStrip({ state, myId }: { state: PublicState; myId: string | null }) {
	const sorted = [...state.players].sort((a, b) => b.score - a.score);
	return (
		<div className="score-strip">
			{sorted.map((p) => (
				<span key={p.id} className={`score-pill ${p.id === myId ? "me" : ""}`}>
					<PlayerAvatar name={p.name} />
					{p.score}<i>pt</i>
				</span>
			))}
		</div>
	);
}

// --------------------------------------------------------------------------- Game screen

function GameScreen({
	room,
	name,
	onLeave,
}: {
	room: string;
	name: string;
	onLeave: () => void;
}) {
	const [state, setState] = useState<PublicState | null>(null);
	const [myId, setMyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [connected, setConnected] = useState(false);
	const [showPicker, setShowPicker] = useState(false);
	const [copied, setCopied] = useState(false);
	const [kicked, setKicked] = useState(false);
	const sentHello = useRef(false);

	const socket = usePartySocket({
		room,
		party: "globe",
		onOpen() {
			setConnected(true);
			sentHello.current = false;
		},
		onMessage(evt) {
			const msg = JSON.parse(evt.data as string) as OutgoingMessage;
			switch (msg.type) {
				case "welcome":
					setMyId(msg.playerId);
					try {
						localStorage.setItem(idKey(room), msg.playerId);
					} catch { /* private mode */ }
					break;
				case "state":
					setState(msg.state);
					break;
				case "error":
					setError(msg.message);
					break;
			}
		},
		onClose() {
			setConnected(false);
		},
	});

	// Detect host kicks (server closes with 4005)
	useEffect(() => {
		const h = (e: CloseEvent) => {
			if (e.code === 4005) setKicked(true);
		};
		socket.addEventListener("close", h as EventListener);
		return () => socket.removeEventListener("close", h as EventListener);
	}, [socket]);

	const send = useCallback(
		(msg: IncomingMessage) => {
			try {
				socket.send(JSON.stringify(msg));
			} catch { /* not open yet */ }
		},
		[socket],
	);

	useEffect(() => {
		if (!connected || sentHello.current) return;
		sentHello.current = true;
		let previousId: string | undefined;
		try {
			previousId = localStorage.getItem(idKey(room)) ?? undefined;
		} catch { /* ignore */ }
		send({ type: "hello", name, previousId });
	}, [connected, name, room, send]);

	const you = state?.players.find((p) => p.id === myId) ?? null;
	const isHost = !!you?.isHost;

	// Keepalive — stops proxies/NAT from silently dropping the socket
	useEffect(() => {
		if (!connected || kicked) return;
		const iv = setInterval(() => send({ type: "ping" }), 25000);
		return () => clearInterval(iv);
	}, [connected, kicked, send]);

	// Privacy: discourage screenshots, printing, devtools & text copying
	useEffect(() => {
		const prevent = (e: Event) => e.preventDefault();
		const onKey = (e: KeyboardEvent) => {
			const k = e.key.toLowerCase();
			if ((e.ctrlKey || e.metaKey) && ["p", "s", "u"].includes(k)) e.preventDefault();
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k)) e.preventDefault();
			if (e.key === "PrintScreen") e.preventDefault();
		};
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.key === "PrintScreen") {
				navigator.clipboard
					?.writeText("Screenshots are disabled while playing Lang Guesser.")
					.catch(() => {});
			}
		};
		const blurOn = () => document.body.classList.add("privacy-blur");
		const blurOff = () => document.body.classList.remove("privacy-blur");
		const onVis = () => (document.hidden ? blurOn() : blurOff());
		const checkDevtools = () => {
			const open =
				window.outerHeight - window.innerHeight > 160 ||
				window.outerWidth - window.innerWidth > 160;
			document.body.classList.toggle("privacy-blur", open && !document.hidden);
		};
		const dtIv = setInterval(checkDevtools, 2000);
		document.addEventListener("contextmenu", prevent);
		document.addEventListener("copy", prevent);
		document.addEventListener("cut", prevent);
		document.addEventListener("dragstart", prevent);
		window.addEventListener("keydown", onKey);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("blur", blurOn);
		window.addEventListener("focus", blurOff);
		window.addEventListener("resize", checkDevtools);
		document.addEventListener("visibilitychange", onVis);
		checkDevtools();
		return () => {
			clearInterval(dtIv);
			document.removeEventListener("contextmenu", prevent);
			document.removeEventListener("copy", prevent);
			document.removeEventListener("cut", prevent);
			document.removeEventListener("dragstart", prevent);
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("blur", blurOn);
			window.removeEventListener("focus", blurOff);
			window.removeEventListener("resize", checkDevtools);
			document.removeEventListener("visibilitychange", onVis);
			blurOff();
		};
	}, []);

	const copyCode = () => {
		const url = `${location.origin}/?room=${state?.roomCode ?? room}`;
		navigator.clipboard?.writeText(url).then(
			() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			},
			() => { /* clipboard unavailable */ },
		);
	};

	if (kicked) {
		return (
			<div className="screen-center">
				<div className="card error-card pop-in">
					<p>🚪 You were removed from the room by the host.</p>
					<button className="btn btn-primary" onClick={onLeave}>← Back home</button>
				</div>
			</div>
		);
	}

	if (error && !state) {
		return (
			<div className="screen-center">
				<div className="card error-card pop-in">
					<p>⚠ {error}</p>
					<button className="btn btn-primary" onClick={onLeave}>← Back home</button>
				</div>
			</div>
		);
	}

	if (!state) {
		return (
			<div className="screen-center">
				<div className="loading">
					<span className="spinner-glyph">文</span>
					<p>Connecting to room <b>{room}</b>…</p>
				</div>
			</div>
		);
	}

	return (
		<div className="game-wrap">
			<GlyphRain />
			{!connected && (
				<div className="reconnect-overlay">
					<span className="spinner-glyph">🌐</span> Reconnecting…
				</div>
			)}
			{error && (
				<div className="toast-error" onAnimationEnd={() => setError(null)}>⚠ {error}</div>
			)}

			<header className="topbar">
				<Logo small />
				<button className="code-chip" onClick={copyCode} title="Copy invite link">
					<span className="code-chip-label">{state.phase === "lobby" ? "ROOM CODE" : "ROOM"}</span>
					<span className="code-chip-code">{state.roomCode}</span>
					<span className="code-chip-copy">{copied ? "✓ copied" : "⧉"}</span>
				</button>
				<button className="btn btn-ghost btn-sm" onClick={onLeave}>Leave</button>
			</header>

			{state.phase === "lobby" && (
				<LobbyView state={state} isHost={isHost} onSend={send} onPick={() => setShowPicker(true)} />
			)}
			{(state.phase === "guessing" || state.phase === "reveal" || state.phase === "matchover") && (
				<RoundView state={state} myId={myId} isHost={isHost} onSend={send} />
			)}

			{showPicker && (
				<SentencePicker
					onStart={(i) => {
						setShowPicker(false);
						send({ type: "start-round", sentenceIndex: i });
					}}
					onClose={() => setShowPicker(false)}
				/>
			)}
		</div>
	);
}

// --------------------------------------------------------------------------- Lobby

function LobbyView({
	state,
	isHost,
	onSend,
	onPick,
}: {
	state: PublicState;
	isHost: boolean;
	onSend: (m: IncomingMessage) => void;
	onPick: () => void;
}) {
	const guests = state.players.filter((p) => !p.isHost);
	const slots = Math.max(MAX_PLAYERS, guests.length);

	return (
		<main className="lobby">
			<section className="card lobby-left pop-in">
				<p className="lobby-kicker">Share this code with friends 👇</p>
				<div className="code-tiles">
					{state.roomCode.split("").map((ch, i) => (
						<span key={i} className="code-tile">{ch}</span>
					))}
				</div>
				<p className="lobby-sub">Up to {MAX_PLAYERS} players · everyone guesses, even the host</p>

				{isHost ? (
					<div className="host-actions">
						<button className="btn btn-primary btn-xl" onClick={() => onSend({ type: "quick-start" })}>
							⚡ Quick Match
						</button>
						<button className="btn btn-secondary" onClick={onPick}>
							📝 Choose a sentence…
						</button>
					</div>
				) : (
					<p className="waiting-note">Waiting for the host to start… 🎈</p>
				)}

				<div className="scoring-note">
					<span className="pill pill-good">{state.settings.pointsExact} exact</span>
					{state.settings.speedBonus > 0 && (
						<span className="pill pill-good">⚡ +{state.settings.speedBonus} fastest</span>
					)}
					<span className="pill pill-mid">{state.settings.pointsRelated} related language</span>
					<span className="pill pill-bad">unanimous pick = 0</span>
				</div>
			</section>

			<div className="lobby-right">
				<section className="card players-card pop-in">
					<h3>Players <span className="dim">{state.players.length}/{MAX_PLAYERS + 1}</span></h3>
					<PlayerRow p={state.players.find((p) => p.isHost) ?? null} kind="host" />
					{Array.from({ length: slots }, (_, i) => {
						const guest = guests[i] ?? null;
						return (
							<PlayerRow
								key={i}
								p={guest}
								kind="guest"
								canKick={isHost}
								onKick={() => guest && onSend({ type: "kick", playerId: guest.id })}
							/>
						);
					})}
				</section>
				<SettingsPanel
					settings={state.settings}
					canEdit={isHost}
					onChange={(s) => onSend({ type: "settings", settings: s })}
				/>
			</div>
		</main>
	);
}

function PlayerRow({
	p,
	kind,
	canKick,
	onKick,
}: {
	p: PublicState["players"][number] | null;
	kind: "host" | "guest";
	canKick?: boolean;
	onKick?: () => void;
}) {
	if (!p) {
		return (
			<div className="player-row empty">
				<span className="avatar avatar-empty">＋</span>
				<span className="dim">{kind === "host" ? "Host seat" : "Waiting…"}</span>
			</div>
		);
	}
	return (
		<div className="player-row">
			<PlayerAvatar name={p.name} />
			<span className="player-name">
				{p.name}
				{kind === "host" && <span className="crown">👑 host</span>}
			</span>
			{!p.connected && <span className="off-dot" title="offline">◌</span>}
			{canKick && kind !== "host" && p.connected && (
				<button
					className="kick-btn"
					title={`Remove ${p.name}`}
					onClick={onKick}
				>
					✕
				</button>
			)}
		</div>
	);
}

// --------------------------------------------------------------------------- Round views

const CATEGORY_META: Record<string, { label: string; icon: string; cls: string }> = {
	modern: { label: "Modern", icon: "🌍", cls: "cat-modern" },
	ancient: { label: "Ancient", icon: "🏛️", cls: "cat-ancient" },
	fake: { label: "Fake?", icon: "✨", cls: "cat-fake" },
};

function ObfText({ text }: { text: string }) {
	return (
		<div className="obf-text">
			<p>
				{[...text].map((ch, i) =>
					ch === "·" ? <span key={i} className="dot">·</span> : <span key={i}>{ch}</span>,
				)}
			</p>
		</div>
	);
}

function HintSwitch({
	state,
	isHost,
	onSend,
}: {
	state: PublicState;
	isHost: boolean;
	onSend: (m: IncomingMessage) => void;
}) {
	if (!isHost) return null;
	const order: GameSettings["hintMode"][] = ["full", "some", "most"];
	const short: Record<GameSettings["hintMode"], string> = { full: "ALL", some: "SOME", most: "MOST" };
	return (
		<span className="presets" title="What players see of the translated text">
			{order.map((m) => (
				<button
					key={m}
					className={`preset ${state.settings.hintMode === m ? "on" : ""}`}
					onClick={() => onSend({ type: "settings", settings: { hintMode: m } })}
				>
					{short[m]}
				</button>
			))}
		</span>
	);
}

function RoundView({
	state,
	myId,
	isHost,
	onSend,
}: {
	state: PublicState;
	myId: string | null;
	isHost: boolean;
	onSend: (m: IncomingMessage) => void;
}) {
	const remainingMs = useCountdown(state.deadline);
	const totalMs = Math.max(1, state.settings.roundSeconds * 1000);
	const you = state.players.find((p) => p.id === myId) ?? null;
	const locked = !!you?.guessed;

	useEffect(() => {
		if (state.phase !== "guessing" || locked) return;
		const handler = (e: KeyboardEvent) => {
			const n = Number(e.key);
			if (n >= 1 && n <= 9 && state.choices?.[n - 1]) {
				onSend({ type: "guess", choiceId: state.choices[n - 1].id });
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [state.phase, state.choices, locked, onSend]);

	if (state.phase === "guessing" && state.obfuscatedText && state.choices) {
		const secsLeft = remainingMs !== null ? Math.ceil(remainingMs / 1000) : 0;
		const pct = remainingMs !== null ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;
		const urgent = secsLeft <= 10;
		const answered = state.players.filter((p) => p.guessed).length;

		return (
			<main className="round pop-in">
				<div className="round-top">
					<span className="chip chip-round">Round {state.roundNumber}</span>
					<div className={`timer-bar ${urgent ? "urgent" : ""}`}>
						<div className="timer-fill" style={{ width: `${pct}%` }} />
					</div>
					<span className={`chip timer-num ${urgent ? "urgent" : ""}`}>
						{remainingMs !== null ? secsLeft : "–"}s
					</span>
				</div>

				<ScoreStrip state={state} myId={myId} />

				<section className="card puzzle-card">
					<div className="puzzle-head">
						<span className="chip">What language is this?</span>
						{locked && (
							<span className="chip chip-good">🔒 Locked in — {answered}/{state.players.length} answered</span>
						)}
						<HintSwitch state={state} isHost={isHost} onSend={onSend} />
					</div>
					<ObfText text={state.obfuscatedText} />
				</section>

				<div className={`choices-grid ${state.choices.length > 8 ? "big" : ""}`}>
					{state.choices.map((c, i) => (
						<button
							key={c.id}
							className={`choice ${locked ? "choice-locked" : ""}`}
							disabled={locked}
							onClick={() => onSend({ type: "guess", choiceId: c.id })}
						>
							<span className="choice-key">{i + 1}</span>
							<span className="choice-flag">{c.flag}</span>
							<span className="choice-label">{c.label}</span>
							<span className="choice-sub">{c.sub}</span>
						</button>
					))}
				</div>

				<div className="guess-track">
					{state.players.map((p) => (
						<span key={p.id} className={`track-chip ${p.guessed ? "done" : ""}`}>
							<PlayerAvatar name={p.name} /> {p.guessed ? "✓" : "…"}
						</span>
					))}
				</div>

				{isHost && (
					<div className="next-row">
						<button className="btn btn-secondary" onClick={() => onSend({ type: "reveal-now" })}>
							⏭️ Reveal now
						</button>
						{!state.settings.earlyReveal && (
							<span className="auto-countdown">answers lock instantly — reveal waits for the timer</span>
						)}
					</div>
				)}
			</main>
		);
	}

	// ---- reveal / matchover ----
	const r = state.reveal;
	const winner = state.winner;
	const sorted = [...state.players].sort((a, b) => b.score - a.score);
	const catMeta = r ? CATEGORY_META[r.category] : null;

	return (
		<main className="round pop-in">
			{winner && (
				<div className="winner-banner">
					🏆 <b>{winner.name}</b> wins the match!
				</div>
			)}
			{r?.unanimous && (
				<div className="winner-banner unanimous-banner">
					🤝 Everyone picked the same — <b>no points</b> this round!
				</div>
			)}
			<ScoreStrip state={state} myId={myId} />

			{r && (
				<section className="card answer-card">
					<p className="answer-kicker">It was…</p>
					<div className="answer-lang">
						<span className="answer-flag">{r.flag}</span>
						<div>
							<h2>{r.langName}</h2>
							<p className="answer-native">
								<i>{r.nativeName}</i> · {r.country}
								{catMeta && <span className={`chip cat-chip ${catMeta.cls}`}>{catMeta.icon} {catMeta.label}</span>}
								{r.wasPhrasebook && <span className="chip">📜 classic phrase</span>}
							</p>
						</div>
					</div>
					<div className="answer-texts">
						<p className="answer-en">🇬🇧 {r.sentence}</p>
						<p className="answer-tr">{r.translation}</p>
					</div>
				</section>
			)}

			{r && (
				<section className="card results-card">
					<h3>This round</h3>
					<ul className="result-list">
						{state.players.map((p) => {
							const exact = p.lastGain !== null && p.lastGain === state.settings.pointsExact;
							const related =
								p.lastGain !== null &&
								p.lastGain > 0 &&
								p.lastGain === state.settings.pointsRelated;
							return (
								<li key={p.id} className={exact ? "res-exact" : related ? "res-related" : "res-wrong"}>
									<PlayerAvatar name={p.name} />
									<span className="res-name">{p.name}{p.id === myId ? " (you)" : ""}</span>
									<span className="res-guess">
										{p.guessFlag ? <>guessed {p.guessFlag} {p.guessLabel}</> : <i>no answer</i>}
									</span>
									<span className={`res-points ${
										exact ? "pts-good" : related ? "pts-mid" : "pts-bad"
									}`}>
										{exact && r.fastestId === p.id && state.settings.speedBonus > 0 ? "⚡ " : ""}
										{p.lastGain === null ? "—" : `+${p.lastGain}`}
									</span>
								</li>
							);
						})}
					</ul>
				</section>
			)}

			<section className="card board-card">
				<h3>🏅 Standings — first to {state.settings.targetScore}</h3>
				{sorted.length >= 3 ? (
					<div className="podium">
						{[sorted[1], sorted[0], sorted[2]].map((p, i) => (
							<div key={p.id} className={`podium-col h-${["2", "1", "3"][i]} ${p.id === myId ? "me" : ""}`}>
								<span className="podium-medal">{["🥈", "🥇", "🥉"][i]}</span>
								<PlayerAvatar name={p.name} />
								<span className="podium-name">{p.name}</span>
								<span className="podium-score">{p.score}</span>
							</div>
						))}
					</div>
				) : (
					<ul className="board-list">
						{sorted.map((p, i) => (
							<li key={p.id}>{i + 1}. {p.name}{p.id === myId ? " (you)" : ""} — <b>{p.score}</b></li>
						))}
					</ul>
				)}
			</section>

			{state.phase === "reveal" && (
				<div className="next-row">
					{isHost ? (
						<>
							<button className="btn btn-primary btn-xl" onClick={() => onSend({ type: "next-round" })}>
								▶ Next round
							</button>
							<button className="btn btn-secondary" onClick={() => onSend({ type: "quick-start" })}>
								⚡ Skip to random
							</button>
						</>
					) : (
						<p className="waiting-note">Next round starting shortly…</p>
					)}
					{state.settings.autoNextSeconds > 0 && <AutoNext seconds={state.settings.autoNextSeconds} />}
				</div>
			)}

			{state.phase === "matchover" && isHost && (
				<div className="next-row">
					<button className="btn btn-primary btn-xl" onClick={() => onSend({ type: "play-again" })}>
						🔁 Play again
					</button>
					<button className="btn btn-secondary" onClick={() => onSend({ type: "end-match" })}>
						🏠 Back to lobby
					</button>
				</div>
			)}
			{state.phase === "matchover" && !isHost && (
				<p className="waiting-note">The host decides what's next… 🎉</p>
			)}
		</main>
	);
}

// --------------------------------------------------------------------------- App

function App() {
	const [session, setSession] = useState<{ room: string; name: string } | null>(() => {
		const params = new URLSearchParams(location.search);
		const code = params.get("room")?.toUpperCase();
		if (!code) return null;
		// Only re-enter automatically when this browser already holds a seat
		// in the room — first-time visitors always type their guest name.
		try {
			const savedId = localStorage.getItem(idKey(code));
			const savedName = localStorage.getItem("polygloss:name");
			if (savedId && savedName) return { room: code, name: savedName };
		} catch { /* private mode */ }
		return null;
	});
	const initialCode = useMemo(() => {
		return new URLSearchParams(location.search).get("room")?.toUpperCase() ?? "";
	}, []);

	const enter = (name: string, code: string) => {
		history.replaceState(null, "", `/?room=${encodeURIComponent(code)}`);
		setSession({ room: code.toUpperCase(), name: name.trim().replace(/\s+/g, " ") });
	};

	const leave = () => {
		history.replaceState(null, "", "/");
		setSession(null);
	};

	return session ? (
		<GameScreen key={session.room} room={session.room} name={session.name} onLeave={leave} />
	) : (
		<Home onEnter={enter} initialCode={initialCode} />
	);
}

createRoot(document.getElementById("root")!).render(<App />);
