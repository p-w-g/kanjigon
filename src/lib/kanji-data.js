// Starter dataset. This is intentionally a small hand-picked sample so the
// app runs out of the box — swap in the full KANJIDIC2-derived lists for
// real N5–N2 coverage (~100/150/370/650 kanji respectively). See README.md
// for where to pull the full, properly-licensed lists from.

export const LEVELS = ['N5', 'N4', 'N3', 'N2'];

export const kanjiData = [
	// --- N5 ---
	{ kanji: '一', level: 'N5', onyomi: ['イチ'], kunyomi: ['ひと-つ'], meaning: 'one' },
	{ kanji: '人', level: 'N5', onyomi: ['ジン', 'ニン'], kunyomi: ['ひと'], meaning: 'person' },
	{ kanji: '日', level: 'N5', onyomi: ['ニチ'], kunyomi: ['ひ', 'か'], meaning: 'day, sun' },
	{ kanji: '本', level: 'N5', onyomi: ['ホン'], kunyomi: ['もと'], meaning: 'book, origin' },
	{ kanji: '大', level: 'N5', onyomi: ['ダイ', 'タイ'], kunyomi: ['おお-きい'], meaning: 'big' },
	{ kanji: '小', level: 'N5', onyomi: ['ショウ'], kunyomi: ['ちい-さい'], meaning: 'small' },
	{ kanji: '水', level: 'N5', onyomi: ['スイ'], kunyomi: ['みず'], meaning: 'water' },
	{ kanji: '火', level: 'N5', onyomi: ['カ'], kunyomi: ['ひ'], meaning: 'fire' },
	{ kanji: '山', level: 'N5', onyomi: ['サン'], kunyomi: ['やま'], meaning: 'mountain' },
	{ kanji: '学', level: 'N5', onyomi: ['ガク'], kunyomi: ['まな-ぶ'], meaning: 'study, learning' },

	// --- N4 ---
	{ kanji: '働', level: 'N4', onyomi: ['ドウ'], kunyomi: ['はたら-く'], meaning: 'work' },
	{ kanji: '教', level: 'N4', onyomi: ['キョウ'], kunyomi: ['おし-える'], meaning: 'teach' },
	{ kanji: '習', level: 'N4', onyomi: ['シュウ'], kunyomi: ['なら-う'], meaning: 'learn, practice' },
	{ kanji: '仕', level: 'N4', onyomi: ['シ'], kunyomi: ['つか-える'], meaning: 'serve, attend' },
	{ kanji: '事', level: 'N4', onyomi: ['ジ'], kunyomi: ['こと'], meaning: 'matter, thing' },
	{ kanji: '始', level: 'N4', onyomi: ['シ'], kunyomi: ['はじ-める'], meaning: 'begin' },
	{ kanji: '終', level: 'N4', onyomi: ['シュウ'], kunyomi: ['お-わる'], meaning: 'end, finish' },
	{ kanji: '走', level: 'N4', onyomi: ['ソウ'], kunyomi: ['はし-る'], meaning: 'run' },
	{ kanji: '運', level: 'N4', onyomi: ['ウン'], kunyomi: ['はこ-ぶ'], meaning: 'luck, carry' },
	{ kanji: '動', level: 'N4', onyomi: ['ドウ'], kunyomi: ['うご-く'], meaning: 'move' },

	// --- N3 ---
	{ kanji: '経', level: 'N3', onyomi: ['ケイ'], kunyomi: ['へ-る'], meaning: 'pass through, sutra' },
	{ kanji: '済', level: 'N3', onyomi: ['サイ'], kunyomi: ['す-む'], meaning: 'settle, finish' },
	{ kanji: '験', level: 'N3', onyomi: ['ケン'], kunyomi: [], meaning: 'test, verify' },
	{ kanji: '講', level: 'N3', onyomi: ['コウ'], kunyomi: [], meaning: 'lecture' },
	{ kanji: '費', level: 'N3', onyomi: ['ヒ'], kunyomi: ['つい-やす'], meaning: 'expense, cost' },
	{ kanji: '価', level: 'N3', onyomi: ['カ'], kunyomi: ['あたい'], meaning: 'value, price' },
	{ kanji: '格', level: 'N3', onyomi: ['カク'], kunyomi: [], meaning: 'status, standard' },
	{ kanji: '築', level: 'N3', onyomi: ['チク'], kunyomi: ['きず-く'], meaning: 'build, construct' },
	{ kanji: '境', level: 'N3', onyomi: ['キョウ'], kunyomi: ['さかい'], meaning: 'boundary' },
	{ kanji: '域', level: 'N3', onyomi: ['イキ'], kunyomi: [], meaning: 'area, region' },

	// --- N2 ---
	{ kanji: '普', level: 'N2', onyomi: ['フ'], kunyomi: [], meaning: 'universal, general' },
	{ kanji: '及', level: 'N2', onyomi: ['キュウ'], kunyomi: ['およ-ぶ'], meaning: 'reach, extend' },
	{ kanji: '朗', level: 'N2', onyomi: ['ロウ'], kunyomi: ['ほが-らか'], meaning: 'cheerful, clear' },
	{ kanji: '慮', level: 'N2', onyomi: ['リョ'], kunyomi: [], meaning: 'thought, consideration' },
	{ kanji: '傾', level: 'N2', onyomi: ['ケイ'], kunyomi: ['かたむ-く'], meaning: 'lean, incline' },
	{ kanji: '衝', level: 'N2', onyomi: ['ショウ'], kunyomi: [], meaning: 'collide, impulse' },
	{ kanji: '融', level: 'N2', onyomi: ['ユウ'], kunyomi: [], meaning: 'melt, dissolve' },
	{ kanji: '契', level: 'N2', onyomi: ['ケイ'], kunyomi: ['ちぎ-る'], meaning: 'pledge, contract' },
	{ kanji: '獲', level: 'N2', onyomi: ['カク'], kunyomi: ['え-る'], meaning: 'seize, catch' },
	{ kanji: '奪', level: 'N2', onyomi: ['ダツ'], kunyomi: ['うば-う'], meaning: 'snatch, deprive' }
];
