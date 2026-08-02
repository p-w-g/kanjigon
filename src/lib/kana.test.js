import { describe, it, expect } from 'vitest';
import {
  romajiToHiragana,
  katakanaToHiragana,
  queryToHiragana,
  buildSearchIndex,
  searchKanji
} from './kana.js';

describe('romajiToHiragana', () => {
  it('converts plain morae', () => {
    expect(romajiToHiragana('sakura')).toBe('さくら');
  });

  it('converts youon (contracted sounds)', () => {
    expect(romajiToHiragana('kyou')).toBe('きょう');
    expect(romajiToHiragana('shashin')).toBe('しゃしん');
  });

  it('converts sokuon (doubled consonants) to small tsu', () => {
    expect(romajiToHiragana('kekkou')).toBe('けっこう');
    expect(romajiToHiragana('gakkou')).toBe('がっこう');
  });

  it('treats doubled n as two separate morae, not sokuon', () => {
    expect(romajiToHiragana('annai')).toBe('あんない');
  });

  it('handles n before a consonant', () => {
    expect(romajiToHiragana('kanji')).toBe('かんじ');
  });

  it('accepts both shi/si, chi/ti, tsu/tu, fu/hu spellings', () => {
    expect(romajiToHiragana('si')).toBe(romajiToHiragana('shi'));
    expect(romajiToHiragana('ti')).toBe(romajiToHiragana('chi'));
    expect(romajiToHiragana('tu')).toBe(romajiToHiragana('tsu'));
    expect(romajiToHiragana('hu')).toBe(romajiToHiragana('fu'));
  });

  it('is case-insensitive', () => {
    expect(romajiToHiragana('SAKURA')).toBe('さくら');
  });
});

describe('katakanaToHiragana', () => {
  it('converts katakana to hiragana', () => {
    expect(katakanaToHiragana('サクラ')).toBe('さくら');
  });

  it('passes through characters with no hiragana equivalent', () => {
    expect(katakanaToHiragana('ダース')).toBe('だーす');
  });

  it('leaves hiragana input unchanged', () => {
    expect(katakanaToHiragana('さくら')).toBe('さくら');
  });
});

describe('queryToHiragana', () => {
  it('detects and converts romaji', () => {
    expect(queryToHiragana('kou')).toBe('こう');
  });

  it('detects and converts katakana', () => {
    expect(queryToHiragana('コウ')).toBe('こう');
  });

  it('passes through hiragana', () => {
    expect(queryToHiragana('こう')).toBe('こう');
  });

  it('returns empty string for non-kana, non-romaji input', () => {
    expect(queryToHiragana('日')).toBe('');
  });
});

describe('searchKanji', () => {
  const entries = [
    { kanji: '一', grade: 1, onyomi: ['イチ', 'イツ'], kunyomi: ['ひと-', 'ひと-つ'], meaning: 'one' },
    { kanji: '右', grade: 1, onyomi: ['ウ', 'ユウ'], kunyomi: ['みぎ'], meaning: 'right' },
    { kanji: '雨', grade: 1, onyomi: ['ウ'], kunyomi: ['あめ', 'あま-', '-さめ'], meaning: 'rain' }
  ];
  const index = buildSearchIndex(entries);

  it('returns everything for an empty query', () => {
    expect(searchKanji(index, '')).toEqual(entries);
    expect(searchKanji(index, '   ')).toEqual(entries);
  });

  it('matches by kunyomi in hiragana, ignoring okurigana dashes', () => {
    expect(searchKanji(index, 'ひと').map((e) => e.kanji)).toEqual(['一']);
  });

  it('matches by onyomi in katakana', () => {
    expect(searchKanji(index, 'ウ').map((e) => e.kanji).sort()).toEqual(['右', '雨']);
  });

  it('matches by onyomi typed as romaji', () => {
    expect(searchKanji(index, 'ichi').map((e) => e.kanji)).toEqual(['一']);
  });

  it('matches kunyomi typed as romaji', () => {
    expect(searchKanji(index, 'migi').map((e) => e.kanji)).toEqual(['右']);
  });

  it('matches by the kanji character itself', () => {
    expect(searchKanji(index, '雨').map((e) => e.kanji)).toEqual(['雨']);
  });

  it('matches by English meaning', () => {
    expect(searchKanji(index, 'rain').map((e) => e.kanji)).toEqual(['雨']);
  });

  it('does not match a query spanning the boundary between two readings of the same kanji', () => {
    // 一's kunyomi are "ひと" and "ひとつ". Joined without a separator that
    // would read "...ひとひとつ...", so "とひ" would falsely match by
    // spanning the end of the first reading and the start of the second.
    expect(searchKanji(index, 'とひ')).toEqual([]);
  });

  it('returns no matches for an unrelated query', () => {
    expect(searchKanji(index, 'xyz')).toEqual([]);
  });
});
