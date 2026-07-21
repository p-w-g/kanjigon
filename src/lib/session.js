// Pure session-queue ordering logic, kept separate from UI so it's easy to
// unit test (mirrors how quiz.js separates question-building from the UI).

import { GRADES } from './kanji-data.js';

// Discrete steps offered by the "how many kanji" dropdown on the home screen.
export const SESSION_SIZES = [20, 30, 40, 50];

/**
 * Packs a session config into a short, self-contained, URL-safe code (no
 * server/storage lookup needed to resolve it later — the code itself IS the
 * config) so a session can be bookmarked/revisited via /session/<code>.
 * Layout: bits 0-8 = one bit per GRADES entry, bits 9-10 = SESSION_SIZES
 * index, bit 11 = review flag. Fits in 12 bits -> at most 3 base36 chars.
 * @param {{ grades: number[], count: number, review: boolean }} config
 * @returns {string}
 */
export function encodeSessionConfig({ grades, count, review }) {
	let gradeBits = 0;
	for (const g of grades) {
		const idx = GRADES.indexOf(g);
		if (idx === -1) throw new Error(`invalid grade ${g}`);
		gradeBits |= 1 << idx;
	}
	const countIndex = SESSION_SIZES.indexOf(count);
	if (countIndex === -1) throw new Error(`invalid session size ${count}`);
	const value = gradeBits | (countIndex << GRADES.length) | ((review ? 1 : 0) << (GRADES.length + 2));
	return value.toString(36);
}

/**
 * Inverse of encodeSessionConfig. Returns null for any malformed/invalid
 * code (stale link, hand-edited URL, etc.) so the caller can redirect home.
 * @param {string} code
 * @returns {{ grades: number[], count: number, review: boolean } | null}
 */
export function decodeSessionConfig(code) {
	const value = parseInt(code, 36);
	if (!Number.isInteger(value) || value < 0) return null;

	const gradeBits = value & ((1 << GRADES.length) - 1);
	const countIndex = (value >> GRADES.length) & 0b11;
	const reviewBit = (value >> (GRADES.length + 2)) & 1;

	const grades = GRADES.filter((_, i) => (gradeBits >> i) & 1);
	const count = SESSION_SIZES[countIndex];
	if (grades.length === 0 || count === undefined) return null;

	return { grades, count, review: reviewBit === 1 };
}

/**
 * Due-first, then fewest-repetitions-first (prioritizes unlearned cards).
 * @param {{meta: object, progress: {dueAt: number, repetitions: number}}[]} items
 * @returns {typeof items}
 */
export function sortByDueThenRepetitions(items) {
	const now = Date.now();
	return items.slice().sort((a, b) => {
		const aDue = a.progress.dueAt <= now ? 0 : 1;
		const bDue = b.progress.dueAt <= now ? 0 : 1;
		if (aDue !== bDue) return aDue - bDue;
		return a.progress.repetitions - b.progress.repetitions;
	});
}

/**
 * Turns raw end-of-session counts into the numbers shown on the summary
 * screen. `missed` counts kanji wrong at least once, whether or not a later
 * review round fixed it; `stillIncorrect` is only non-zero when there was no
 * review round (or it didn't cover everything) to clear a miss. Without a
 * review round, `missed` and `stillIncorrect` are always equal (nothing ever
 * clears `stillIncorrect` outside the review phase) — `showSecondLook` gates
 * on `reviewRan` so the summary doesn't show the same count twice under two
 * different labels in that case.
 * @param {{ total: number, missed: number, stillIncorrect: number, reviewRan: boolean }} counts
 * @returns {{ total: number, correctFirstTry: number, missed: number, stillIncorrect: number, showSecondLook: boolean }}
 */
export function summarizeSession({ total, missed, stillIncorrect, reviewRan }) {
	return {
		total,
		correctFirstTry: total - missed,
		missed,
		stillIncorrect,
		showSecondLook: reviewRan && missed > 0
	};
}

// How many past sessions the home screen's "Replay" list remembers.
export const MAX_RECENT_SESSIONS = 10;
const RECENT_SESSIONS_KEY = 'kanjigon:recent-sessions';

/**
 * Pushes `code` to the front of a recent-sessions list, deduping an existing
 * entry for the same code (so replaying moves it back to the top rather than
 * creating a second entry) and capping at MAX_RECENT_SESSIONS. Kept as a pure
 * function so it's testable without a DOM/localStorage environment — the
 * localStorage read/write itself is thin glue, see recordRecentSession below.
 * @param {{code: string, ts: number}[]} list newest-first
 * @param {string} code
 * @param {number} [ts]
 * @returns {{code: string, ts: number}[]}
 */
export function addRecentSession(list, code, ts = Date.now()) {
	return [{ code, ts }, ...list.filter((s) => s.code !== code)].slice(0, MAX_RECENT_SESSIONS);
}

/** @param {string} code */
export function recordRecentSession(code) {
	localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(addRecentSession(getRecentSessions(), code)));
}

/** @returns {{code: string, ts: number}[]} newest-first */
export function getRecentSessions() {
	try {
		const list = JSON.parse(localStorage.getItem(RECENT_SESSIONS_KEY) ?? '[]');
		return Array.isArray(list) ? list : [];
	} catch {
		return [];
	}
}
