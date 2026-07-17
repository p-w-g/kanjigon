# Kanji Flash

Offline-first kanji flashcards for JLPT N5–N2. Built as a PWA so it works
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

## Expanding the kanji dataset

`src/lib/kanji-data.js` currently ships a 40-kanji starter set (10 per
level) just so the app runs immediately. For real N5–N2 coverage
(roughly 100 / 150 / 370 / 650 kanji respectively), pull from:

- **KANJIDIC2** (Electronic Dictionary Research and Development Group,
  Creative Commons licensed) — readings, meanings, stroke counts:
  https://www.edrdg.org/wiki/index.php/KANJIDIC_Project
- Community JLPT-level-tagged kanji lists on GitHub (search
  "jlpt kanji list json") — already bucketed by level, saves you the
  mapping work.

Each entry just needs to match this shape:

```js
{ kanji: '一', level: 'N5', onyomi: ['イチ'], kunyomi: ['ひと-つ'], meaning: 'one' }
```

Once you swap in the full list, rebuild — Workbox will re-precache
everything automatically on next launch.

## Notes

- All progress is stored **only on your device** (IndexedDB). There's no
  backend, so nothing to lose access to, but also nothing to sync across
  devices unless you add that yourself later.
- The "Again/Hard/Good/Easy" buttons map to SM-2 grades; missed cards get
  re-queued a few cards later in the same session rather than vanishing.
