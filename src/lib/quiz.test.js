import { describe, it, expect } from 'vitest';
import { splitMeanings, buildQuestion } from './quiz.js';
import { kanjiData } from './kanji-data.js';

describe('splitMeanings', () => {
	it('splits a plain comma-joined meaning', () => {
		expect(splitMeanings('one, one radical (no.1)')).toEqual(['one', 'one radical (no.1)']);
	});

	it('does not split on commas embedded inside parentheses', () => {
		expect(splitMeanings('cool, cold (beer, person), chill')).toEqual([
			'cool',
			'cold (beer, person)',
			'chill'
		]);
	});

	it('handles a single meaning with no commas', () => {
		expect(splitMeanings('fire')).toEqual(['fire']);
	});
});

describe('buildQuestion', () => {
	const grades = [1, 8];

	for (const grade of grades) {
		const pool = kanjiData.filter((k) => k.grade === grade);

		it(`grade ${grade}: always returns exactly 4 unique options with one correct answer`, () => {
			for (const entry of pool) {
				const question = buildQuestion(pool, entry);
				expect(question.options).toHaveLength(4);

				const correctOptions = question.options.filter((o) => o.correct);
				expect(correctOptions).toHaveLength(1);

				const texts = question.options.map((o) => o.text);
				expect(new Set(texts).size).toBe(4);
			}
		});

		it(`grade ${grade}: wrong options never collide with the entry's own meanings/kanji`, () => {
			for (const entry of pool) {
				const question = buildQuestion(pool, entry);
				const ownMeanings = splitMeanings(entry.meaning);
				const wrongOptions = question.options.filter((o) => !o.correct);

				if (question.mode === 'meaning') {
					for (const wrong of wrongOptions) {
						expect(ownMeanings).not.toContain(wrong.text);
					}
				} else {
					for (const wrong of wrongOptions) {
						expect(wrong.text).not.toBe(entry.kanji);
					}
				}
			}
		});
	}
});
