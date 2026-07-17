// Builds multiple-choice quiz questions from kanji-data.js entries.
// Two directions, picked randomly per question: kanji -> meaning, and meaning -> kanji.

/**
 * Splits a comma-joined meaning string into individual meanings, respecting
 * parentheses so embedded commas (e.g. "cold (beer, person), chill") don't
 * fracture a single meaning into two.
 * @param {string} meaning
 * @returns {string[]}
 */
export function splitMeanings(meaning) {
	const parts = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < meaning.length; i++) {
		const c = meaning[i];
		if (c === '(') depth++;
		else if (c === ')') depth--;
		else if (c === ',' && depth === 0) {
			parts.push(meaning.slice(start, i).trim());
			start = i + 1;
		}
	}
	parts.push(meaning.slice(start).trim());
	return parts.filter(Boolean);
}

function shuffle(arr) {
	const copy = arr.slice();
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function uniqueBy(arr, key) {
	const seen = new Set();
	const out = [];
	for (const item of arr) {
		const k = key(item);
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(item);
	}
	return out;
}

/**
 * @param {{kanji: string, meaning: string}[]} pool same-grade kanji metas
 * @param {{kanji: string, meaning: string}} entry the kanji being quizzed
 * @returns {{ mode: 'meaning'|'kanji', prompt: string, options: {text: string, correct: boolean}[] }}
 */
export function buildQuestion(pool, entry) {
	const mode = Math.random() < 0.5 ? 'meaning' : 'kanji';
	const ownMeanings = splitMeanings(entry.meaning);
	const correctMeaning = ownMeanings[Math.floor(Math.random() * ownMeanings.length)];
	const others = pool.filter((k) => k.kanji !== entry.kanji);

	if (mode === 'meaning') {
		const candidates = shuffle(others).flatMap((k) =>
			splitMeanings(k.meaning)
				.filter((m) => !ownMeanings.includes(m))
				.map((m) => ({ text: m }))
		);
		const distractors = uniqueBy(candidates, (c) => c.text).slice(0, 3);
		const options = shuffle([
			{ text: correctMeaning, correct: true },
			...distractors.map((d) => ({ text: d.text, correct: false }))
		]);
		return { mode, prompt: entry.kanji, options };
	}

	const candidates = others.filter((k) => !splitMeanings(k.meaning).includes(correctMeaning));
	const distractors = uniqueBy(shuffle(candidates), (k) => k.kanji).slice(0, 3);
	const options = shuffle([
		{ text: entry.kanji, correct: true },
		...distractors.map((d) => ({ text: d.kanji, correct: false }))
	]);
	return { mode, prompt: correctMeaning, options };
}
