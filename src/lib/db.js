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

export async function getStats(level) {
	const all = await db.progress.where('level').equals(level).toArray();
	const now = Date.now();
	return {
		total: all.length,
		due: all.filter((c) => c.dueAt <= now).length,
		learned: all.filter((c) => c.repetitions >= 3).length
	};
}
