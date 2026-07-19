# Kanji Flash

Offline-first kanji quiz, grouped by Japanese school grade. Built as a PWA so it works
with zero internet access once loaded — no app store, no account, no sync
server.

## Stack

- **SvelteKit** (static adapter) — near-zero JS runtime footprint
- **vite-plugin-pwa / Workbox** — precaches the whole app (including the
  kanji data) so it works fully offline after the first visit
- **Dexie (IndexedDB)** — stores your SRS review progress locally; survives
  offline use indefinitely, no network dependency at all
- **SM-2 spaced repetition** (`src/lib/srs.js`) — same family of algorithm
  used by Anki
- **Multiple-choice quiz** (`src/lib/quiz.js`) — each card randomly asks
  either kanji→meaning or meaning→kanji, with 3 wrong options borrowed from
  other kanji in the same grade

## Using it

The home screen (`/`) shows, per grade, **% reviewed** (ever quizzed) and
**% learned** (answered correctly enough times to clear the SRS threshold).
"Run new session" opens a dialog to pick which grade(s) to mix, how many
kanji to quiz (20-50), and whether to run a review round afterward.

A session (`/session/<code>`, where `<code>` is a short base36 code that
packs the grades/count/review choice — self-contained, so the URL alone is
enough to revisit or bookmark a session config) quizzes exactly that many
kanji. Missed cards get re-queued a few cards later in the same pass
rather than vanishing (they don't count as "learned" until answered right
in a later pass — the SRS repetition count resets to 0 on any miss). If
"review after" was checked and anything was missed, a review round follows
that re-drills *only* the missed kanji — no new kanji, no other grades —
cycling until every one of them has been answered correctly once. Either
way, the session ends back on the home screen with stats refreshed.

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
```

To test the actual offline/installable behavior (dev mode's SW is a mock),
build and preview:

```bash
npm run build
npm run preview
```

Open it, load once with wifi on, then turn on airplane mode and reload —
it should keep working. On mobile Chrome/Safari you can "Add to Home
Screen" from the share/menu — that's the whole install story, no store
needed.

## Kanji dataset

`src/lib/kanji-data.js` is generated from **KANJIDIC2** (Electronic
Dictionary Research and Development Group, Creative Commons licensed):
https://www.edrdg.org/wiki/index.php/KANJIDIC_Project

It includes every kanji with a `<grade>` value (2999 total) — grades 1–6
are the Japanese elementary school curriculum, grade 8 is the remaining
jouyou (general-use) kanji, and grades 9–10 are jinmeiyou (name) kanji.
Each entry matches this shape:

```js
{ kanji: '一', grade: 1, onyomi: ['イチ', 'イツ'], kunyomi: ['ひと-', 'ひと-つ'], meaning: 'one, one radical (no.1)' }
```

To regenerate it from an updated `kanjidic2.xml`, see the conversion
approach in git history — it's a straightforward regex extraction over
each `<character>` block's `literal`, `misc/grade`, and
`reading_meaning/rmgroup` (`ja_on` → onyomi, `ja_kun` → kunyomi with `.`
replaced by `-`, `<meaning>` without `m_lang` → meaning).

## Notes

- All progress is stored **only on your device** (IndexedDB). There's no
  backend, so nothing to lose access to, but also nothing to sync across
  devices unless you add that yourself later.
- A correct answer maps to SM-2's "Good" grade, a wrong one to "Again";
  missed cards get re-queued a few cards later in the same session rather
  than vanishing.
