import Dexie from 'dexie';

// All review progress lives in IndexedDB via Dexie. This is what makes the
// SRS state survive being fully offline (on a plane, etc.) — it's not
// relying on network sync of any kind, it's local-first by default.
export const db = new Dexie('kanjiFlashDB');

db.version(1).stores({
	// key = kanji character itself (unique), indexed by dueAt so we can
	// cheaply query "what's due right now" without scanning everything.
	progress: 'kanji, dueAt, level'
});

// v2 adds `attempts` (times ever quizzed, win or lose) so "% reviewed" can be
// told apart from "% learned" — `repetitions` alone can't do that since it
// resets to 0 on any failure, same as a never-touched card. No new index
// needed since nothing queries/sorts by attempts.
db.version(2)
	.stores({
		progress: 'kanji, dueAt, level'
	})
	.upgrade(async (tx) => {
		await tx
			.table('progress')
			.toCollection()
			.modify((rec) => {
				if (rec.attempts === undefined) {
					rec.attempts = rec.repetitions > 0 ? rec.repetitions : 0;
				}
			});
	});

/** @param {string} kanji @param {string} level */
export async function getOrCreateProgress(kanji, level, newCardState) {
	const existing = await db.progress.get(kanji);
	if (existing) return existing;
	const fresh = { kanji, level, ...newCardState() };
	await db.progress.put(fresh);
	return fresh;
}

export async function saveProgress(record) {
	await db.progress.put(record);
}

export async function getDueCards(level, limit = 20) {
	const now = Date.now();
	return db.progress
		.where('level')
		.equals(level)
		.and((c) => c.dueAt <= now)
		.limit(limit)
		.toArray();
}

/**
 * Bulk per-grade stats for the home screen — one query for every grade at
 * once rather than one round-trip per grade. Counts are of DB rows (kanji
 * ever touched); callers divide by each grade's full kanji count (from
 * kanji-data.js) to get percentages, since untouched kanji have no row yet.
 * @returns {Promise<Map<number, { reviewed: number, learned: number, due: number }>>}
 */
export async function getAllGradeStats() {
	const all = await db.progress.toArray();
	const now = Date.now();
	const byGrade = new Map();
	for (const rec of all) {
		let g = byGrade.get(rec.level);
		if (!g) {
			g = { reviewed: 0, learned: 0, due: 0 };
			byGrade.set(rec.level, g);
		}
		if ((rec.attempts ?? 0) >= 1) g.reviewed++;
		if (rec.repetitions >= 3) g.learned++;
		if (rec.dueAt <= now) g.due++;
	}
	return byGrade;
}
