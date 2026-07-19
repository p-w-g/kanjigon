// Pure session-queue ordering logic, kept separate from UI so it's easy to
// unit test (mirrors how quiz.js separates question-building from the UI).

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
