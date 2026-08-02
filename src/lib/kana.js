// Lightweight romaji -> hiragana conversion and kanji-search matching.
// No IME-grade ambiguity handling needed here — kanji readings are short
// (1-4 morae), so a straightforward longest-match table covers real input.

const ROMAJI_TO_KANA = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  sa: 'さ', shi: 'し', si: 'し', su: 'す', se: 'せ', so: 'そ',
  za: 'ざ', ji: 'じ', zi: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ta: 'た', chi: 'ち', ti: 'ち', tsu: 'つ', tu: 'つ', te: 'て', to: 'と',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', fu: 'ふ', hu: 'ふ', he: 'へ', ho: 'ほ',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を', wi: 'うぃ', we: 'うぇ',
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sha: 'しゃ', sya: 'しゃ', shu: 'しゅ', syu: 'しゅ', sho: 'しょ', syo: 'しょ',
  ja: 'じゃ', zya: 'じゃ', ju: 'じゅ', zyu: 'じゅ', jo: 'じょ', zyo: 'じょ',
  cha: 'ちゃ', tya: 'ちゃ', chu: 'ちゅ', tyu: 'ちゅ', cho: 'ちょ', tyo: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ'
};

const CONSONANTS = new Set('kgsztdnhbpmyrwjfvc'.split(''));

// Doubled consonant (e.g. "kekkou") -> small tsu (っ). "n" is excluded since
// a doubled "n" is just two separate ん morae ("annai" -> あんない), not sokuon.
function isSokuonPair(a, b) {
  return a === b && CONSONANTS.has(a) && a !== 'n';
}

export function romajiToHiragana(input) {
  const s = input.toLowerCase();
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (isSokuonPair(s[i], s[i + 1])) {
      out += 'っ';
      i += 1;
      continue;
    }
    const three = ROMAJI_TO_KANA[s.slice(i, i + 3)];
    if (three) {
      out += three;
      i += 3;
      continue;
    }
    const two = ROMAJI_TO_KANA[s.slice(i, i + 2)];
    if (two) {
      out += two;
      i += 2;
      continue;
    }
    const one = ROMAJI_TO_KANA[s[i]];
    if (one) {
      out += one;
      i += 1;
      continue;
    }
    if (s[i] === 'n') {
      out += 'ん';
      i += 1;
      continue;
    }
    // Unrecognized character (punctuation, apostrophe, digit): drop it.
    i += 1;
  }
  return out;
}

// Katakana and hiragana share layout in Unicode: U+30A1-U+30F6 map to
// U+3041-U+3096 by subtracting 0x60. Characters outside that range (ー, ・,
// etc.) pass through unchanged.
export function katakanaToHiragana(input) {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0);
    out += code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : ch;
  }
  return out;
}

const HIRAGANA_RE = /[ぁ-ゖ]/;
const KATAKANA_RE = /[ァ-ヶ]/;
const ASCII_LETTERS_RE = /^[a-z]+$/i;

// Converts a raw search query (romaji, hiragana, katakana, or a mix) to
// hiragana for matching against reading indexes. Returns '' for input with
// no convertible kana content (e.g. a bare kanji character or punctuation).
export function queryToHiragana(query) {
  if (HIRAGANA_RE.test(query) || KATAKANA_RE.test(query)) return katakanaToHiragana(query);
  if (ASCII_LETTERS_RE.test(query)) return romajiToHiragana(query);
  return '';
}

function readingIndex(readings, convert) {
  return readings.map((r) => convert(r.replace(/-/g, ''))).join('|');
}

// Precomputes the per-entry index used for matching so repeated searches
// over the same kanjiData don't re-normalize readings on every keystroke.
export function buildSearchIndex(entries) {
  return entries.map((entry) => ({
    entry,
    kunyomi: readingIndex(entry.kunyomi, (r) => r),
    onyomi: readingIndex(entry.onyomi, katakanaToHiragana),
    meaning: entry.meaning.toLowerCase()
  }));
}

export function searchKanji(index, rawQuery) {
  const query = rawQuery.trim();
  if (!query) return index.map((i) => i.entry);

  const queryLower = query.toLowerCase();
  const kanaQuery = queryToHiragana(query);

  return index
    .filter(
      (i) =>
        i.entry.kanji.includes(query) ||
        i.meaning.includes(queryLower) ||
        (kanaQuery && (i.kunyomi.includes(kanaQuery) || i.onyomi.includes(kanaQuery)))
    )
    .map((i) => i.entry);
}
