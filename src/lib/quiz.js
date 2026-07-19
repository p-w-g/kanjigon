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

// KANJIDIC2 has no way to tell which reading goes with which meaning (that's
// per-word data, not per-character), so rather than falsely pairing one
// reading with whichever meaning is being quizzed, just show every reading
// the kanji has — on and kun mixed — and let learners build the
// reading<->meaning association themselves over repeated exposure. How many
// is too many to *display* is a layout concern (see .option-reading's
// line-clamp in the session page), not something this function decides.
/**
 * @param {{onyomi: string[], kunyomi: string[]}} entry
 * @returns {string[]}
 */
export function pickReadings(entry) {
	return [...entry.onyomi, ...entry.kunyomi];
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
 * @param {{kanji: string, meaning: string, onyomi: string[], kunyomi: string[]}[]} pool same-grade kanji metas
 * @param {{kanji: string, meaning: string, onyomi: string[], kunyomi: string[]}} entry the kanji being quizzed
 * @returns {{ mode: 'meaning'|'kanji', prompt: string, readings?: string[], options: {text: string, correct: boolean, readings?: string[]}[] }}
 * `readings` is on the question itself in 'meaning' mode (kanji shown, reading practice
 * for that one kanji) and on each option in 'kanji' mode (every kanji option shown gets
 * its own readings, regardless of which one is picked).
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
		return { mode, prompt: entry.kanji, readings: pickReadings(entry), options };
	}

	const candidates = others.filter((k) => !splitMeanings(k.meaning).includes(correctMeaning));
	const distractors = uniqueBy(shuffle(candidates), (k) => k.kanji).slice(0, 3);
	const options = shuffle([
		{ text: entry.kanji, correct: true, readings: pickReadings(entry) },
		...distractors.map((d) => ({ text: d.kanji, correct: false, readings: pickReadings(d) }))
	]);
	return { mode, prompt: correctMeaning, options };
}
