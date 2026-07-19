import { describe, it, expect } from 'vitest';
import {
	sortByDueThenRepetitions,
	encodeSessionConfig,
	decodeSessionConfig,
	summarizeSession,
	SESSION_SIZES
} from './session.js';
import { GRADES } from './kanji-data.js';

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

describe('encodeSessionConfig / decodeSessionConfig', () => {
	it('round-trips every grade, every session size, and both review states', () => {
		for (const grades of [[GRADES[0]], [GRADES[0], GRADES[1]], GRADES]) {
			for (const count of SESSION_SIZES) {
				for (const review of [true, false]) {
					const config = { grades, count, review };
					const code = encodeSessionConfig(config);
					expect(decodeSessionConfig(code)).toEqual(config);
				}
			}
		}
	});

	it('produces a short, URL-safe code', () => {
		const code = encodeSessionConfig({ grades: GRADES, count: 50, review: true });
		expect(code.length).toBeLessThanOrEqual(3);
		expect(code).toMatch(/^[a-z0-9]+$/);
	});

	it('is order-independent for grades (same set -> same code)', () => {
		const a = encodeSessionConfig({ grades: [1, 2], count: 20, review: false });
		const b = encodeSessionConfig({ grades: [2, 1], count: 20, review: false });
		expect(a).toBe(b);
	});

	it('rejects an invalid grade', () => {
		expect(() => encodeSessionConfig({ grades: [7], count: 20, review: false })).toThrow();
	});

	it('rejects an invalid session size', () => {
		expect(() => encodeSessionConfig({ grades: [1], count: 25, review: false })).toThrow();
	});

	it('returns null for a non-numeric or negative code', () => {
		expect(decodeSessionConfig('!!!')).toBeNull();
		expect(decodeSessionConfig('')).toBeNull();
		expect(decodeSessionConfig('-1')).toBeNull();
	});

	it('returns null when the grade bits are all zero (no grades selected)', () => {
		// count-index=0, review=0, grade-bits=0 -> code "0"
		expect(decodeSessionConfig('0')).toBeNull();
	});
});

describe('summarizeSession', () => {
	it('reports everything correct first try when nothing was ever missed', () => {
		expect(summarizeSession({ total: 20, missed: 0, stillIncorrect: 0 })).toEqual({
			total: 20,
			correctFirstTry: 20,
			missed: 0,
			stillIncorrect: 0
		});
	});

	it('subtracts misses from correctFirstTry regardless of whether review fixed them', () => {
		expect(summarizeSession({ total: 20, missed: 5, stillIncorrect: 0 })).toEqual({
			total: 20,
			correctFirstTry: 15,
			missed: 5,
			stillIncorrect: 0
		});
	});

	it('carries stillIncorrect through unchanged (no review round, or it did not clear everything)', () => {
		expect(summarizeSession({ total: 20, missed: 5, stillIncorrect: 2 })).toEqual({
			total: 20,
			correctFirstTry: 15,
			missed: 5,
			stillIncorrect: 2
		});
	});
});
