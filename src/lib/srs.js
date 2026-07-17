// SM-2 spaced repetition algorithm (the same family WaniKani/Anki descend from).
// grade: 0-5, where 0 = total blackout, 5 = perfect recall.
// We expose a simplified 4-button UI (Again/Hard/Good/Easy) mapped to grades below.

export const GRADE = {
	AGAIN: 0,
	HARD: 3,
	GOOD: 4,
	EASY: 5
};

/**
 * @param {{ repetitions: number, interval: number, easeFactor: number }} card
 * @param {number} grade
 * @returns {{ repetitions: number, interval: number, easeFactor: number, dueAt: number }}
 */
export function schedule(card, grade) {
	let { repetitions, interval, easeFactor } = card;

	if (grade < 3) {
		// Failed recall — reset repetitions, review again soon (same session, ~10 min).
		repetitions = 0;
		interval = 0; // 0 signals "due immediately / re-queue in this session"
	} else {
		if (repetitions === 0) {
			interval = 1;
		} else if (repetitions === 1) {
			interval = 6;
		} else {
			interval = Math.round(interval * easeFactor);
		}
		repetitions += 1;
	}

	easeFactor = Math.max(
		1.3,
		easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
	);

	const dueAt =
		interval === 0
			? Date.now() + 1000 * 60 * 10 // 10 min re-queue within session
			: Date.now() + interval * 24 * 60 * 60 * 1000;

	return { repetitions, interval, easeFactor, dueAt };
}

export function newCardState() {
	return {
		repetitions: 0,
		interval: 0,
		easeFactor: 2.5,
		dueAt: Date.now()
	};
}
