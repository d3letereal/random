// Shared types between client and server for PolyGloss

export type LangCategory = "modern" | "ancient" | "fake";

export type HintMode = "full" | "some" | "most";

export type GameSettings = {
	targetScore: number; // first player to reach this wins
	roundSeconds: number; // time per round
	includeAncient: boolean;
	includeFake: boolean;
	hintMode: HintMode;
	choiceCount: number; // answer buttons per round (4–20)
	pointsExact: number; // points for the exact language
	pointsRelated: number; // points for a closely related language
	speedBonus: number; // extra points for the fastest correct guess
	autoNextSeconds: number; // 0 = host advances manually
	earlyReveal: boolean; // end the round as soon as everyone answered
};

export const DEFAULT_SETTINGS: GameSettings = {
	targetScore: 50,
	roundSeconds: 45,
	includeAncient: true,
	includeFake: false,
	hintMode: "full",
	choiceCount: 6,
	pointsExact: 10,
	pointsRelated: 3,
	speedBonus: 5,
	autoNextSeconds: 12,
	earlyReveal: false,
};

export type PublicPlayer = {
	id: string;
	name: string;
	isHost: boolean;
	score: number;
	lastGain: number | null; // points gained last round (for reveal)
	guessed: boolean; // has locked in an answer this round
	guess: string | null; // language id (only meaningful at reveal)
	guessFlag: string | null; // resolved flag for reveal display
	guessLabel: string | null; // resolved language name for reveal display
	connected: boolean;
};

export type ChoiceOption = {
	id: string; // language id
	label: string; // display name
	flag: string;
	sub: string; // country / flavor text
};

export type Phase = "lobby" | "guessing" | "reveal" | "matchover";

// The full public state of the room, broadcast on every change
export type PublicState = {
	phase: Phase;
	hostId: string;
	players: PublicPlayer[];
	settings: GameSettings;
	roomCode: string;
	maxPlayers: number;

	roundNumber: number;

	// guessing phase
	obfuscatedText: string | null;
	choices: ChoiceOption[] | null;
	deadline: number | null; // epoch ms

	// reveal phase
	reveal: {
		sentence: string;
		translation: string;
		langId: string;
		langName: string;
		flag: string;
		category: LangCategory;
		nativeName: string;
		country: string;
		wasPhrasebook: boolean;
		fastestId: string | null; // first correct guesser (gets the speed bonus)
		unanimous: boolean; // everyone picked identically → no points
	} | null;

	winner: { id: string; name: string; score: number } | null;
};

export type IncomingMessage =
	| { type: "hello"; name: string; previousId?: string }
	| { type: "settings"; settings: Partial<GameSettings> }
	| { type: "start-round"; sentenceIndex?: number }
	| { type: "quick-start" }
	| { type: "guess"; choiceId: string }
	| { type: "next-round" }
	| { type: "end-match" }
	| { type: "play-again" }
	| { type: "reveal-now" }
	| { type: "kick"; playerId: string }
	| { type: "ping" };

export type OutgoingMessage =
	| { type: "state"; state: PublicState }
	| { type: "welcome"; playerId: string }
	| { type: "error"; message: string };

export const MAX_PLAYERS = 4;
export const POINTS_EXACT = 10;
export const POINTS_RELATED = 3;
export const CHOICE_COUNT = 6;

// ---------- Guest name validation ----------

const LEET: Record<string, string> = {
	"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t",
	"8": "b", "9": "g", "@": "a", "$": "s", "!": "i", "|": "l",
	"+": "t", "€": "e", "£": "l",
};

/** Collapse a name to plain letters so tricks like "n1gg3t" get caught. */
export function normalizeName(raw: string): string {
	let s = raw.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
	let out = "";
	for (const ch of s) out += LEET[ch] ?? ch;
	return out;
}

function tokensOf(normalized: string): string[] {
	return normalized.split(/[^a-z]+/).filter(Boolean);
}

// Hard slurs / hate terms — blocked even as substrings
const BLOCK_SUBSTR = [
	"nigg", "faggot", "wetback", "hitler", "nigga", "pedofil",
	"pedophil", "rapist", "beaner", "towelhead", "raghead",
	"coon", "jigaboo", "shitskin", "nazi",
];

// Strong profanity & slurs — blocked as whole words only
const BLOCK_TOKENS = [
	"fuck", "fuk", "phuck", "motherfuck", "cunt", "kike", "spic",
	"chink", "gook", "paki", "tranny", "retard", "fag", "fags",
	"dyke", "bitch", "bicth", "whore", "hoore", "slut", "dick",
	"cock", "pussy", "penis", "vagina", "boobs", "tities", "tits",
	"wank", "wanker", "jizz", "cum", "porn", "rape", "sex",
];

/**
 * Returns null if the name is fine, otherwise a reason it was rejected.
 * Guests may call themselves anything except hard slurs and the worst words.
 */
export function validateGuestName(raw: string): string | null {
	const name = raw.trim().replace(/\s+/g, " ");
	if (!name) return "Enter a name first.";
	if (name.length > 16) return "Keep it under 16 characters.";
	if (!/[\p{L}\p{N}]/u.test(name)) return "Use at least one letter or number.";
	if (/[\u0000-\u001f\u007f]/.test(name)) return "No weird control characters.";
	const norm = normalizeName(name);
	for (const bad of BLOCK_SUBSTR) {
		if (norm.includes(bad)) return "That name isn't allowed — pick another.";
	}
	for (const tok of tokensOf(norm)) {
		if (BLOCK_TOKENS.includes(tok)) return "That name isn't allowed — pick another.";
	}
	return null;
}
