import { describe, it, expect } from 'vitest';
import { sortByDueThenRepetitions } from './session.js';

function item(kanji, dueOffsetMs, repetitions) {
	return { meta: { kanji }, progress: { dueAt: Date.now() + dueOffsetMs, repetitions } };
}

describe('sortByDueThenRepetitions', () => {
	it('sorts past-due cards before not-yet-due cards', () => {
		const items = [item('future', 10_000, 0), item('past', -10_000, 0)];
		const sorted = sortByDueThenRepetitions(items);
		expect(sorted.map((i) => i.meta.kanji)).toEqual(['past', 'future']);
	});

	it('breaks ties among equally-due cards by fewest repetitions first', () => {
		const items = [item('learned', -1000, 5), item('fresh', -1000, 0)];
		const sorted = sortByDueThenRepetitions(items);
		expect(sorted.map((i) => i.meta.kanji)).toEqual(['fresh', 'learned']);
	});

	it('does not mutate the input array', () => {
		const items = [item('a', -1000, 3), item('b', -2000, 1)];
		const copy = [...items];
		sortByDueThenRepetitions(items);
		expect(items).toEqual(copy);
	});
});
