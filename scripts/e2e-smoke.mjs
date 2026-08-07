// Drives the built app in a headless browser to prove the quiz actually
// works end to end (not just unit-tested in isolation). Run with:
//   npm run test:e2e
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { decodeSessionConfig } from '../src/lib/session.js';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

function waitForServer(url, timeoutMs) {
	const deadline = Date.now() + timeoutMs;
	return new Promise((resolve, reject) => {
		(function poll() {
			fetch(url)
				.then(() => resolve())
				.catch(() => {
					if (Date.now() > deadline) reject(new Error(`timed out waiting for ${url}`));
					else setTimeout(poll, 500);
				});
		})();
	});
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
	stdio: 'inherit'
});

try {
	await waitForServer(BASE_URL, 30_000);

	const browser = await chromium.launch();
	const page = await browser.newPage();
	const consoleErrors = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') consoleErrors.push(msg.text());
	});
	page.on('pageerror', (err) => consoleErrors.push(String(err)));

	await page.goto(BASE_URL);
	await page.waitForSelector('.grade-summary', { timeout: 15_000 });

	// Tapping a grade row opens a "quick quiz for this grade" confirm dialog;
	// clicking the backdrop (outside the dialog box) must close it without
	// starting anything.
	await page.click('.grade-row >> nth=0');
	await page.waitForSelector('dialog[open]', { timeout: 5_000 });
	await page.mouse.click(5, 5);
	const dialogAfterOutsideClick = await page.$('dialog[open]');
	if (dialogAfterOutsideClick) throw new Error('quick-quiz dialog should close on outside click');

	// Reopening and confirming should start a 20-kanji, no-review session
	// scoped to just that one grade.
	await page.click('.grade-row >> nth=0');
	await page.waitForSelector('dialog[open]', { timeout: 5_000 });
	await page.click('dialog[open] button.start');
	await page.waitForURL(/\/session\/[a-z0-9]+/, { timeout: 5_000 });
	const quickQuizCode = new URL(page.url()).pathname.split('/').pop();
	const quickQuizConfig = decodeSessionConfig(quickQuizCode);
	if (
		!quickQuizConfig ||
		quickQuizConfig.grades.length !== 1 ||
		quickQuizConfig.count !== 20 ||
		quickQuizConfig.review !== false
	) {
		throw new Error(`unexpected quick-quiz session config: ${JSON.stringify(quickQuizConfig)}`);
	}
	await page.waitForSelector('.prompt', { timeout: 15_000 });

	await page.goto(BASE_URL);
	await page.waitForSelector('.grade-summary', { timeout: 15_000 });

	// Home -> dialog -> pick a grade -> start a session. We deliberately don't
	// drive a full session (20-50 answers) to completion here — that's slow
	// for a smoke test and better covered by src/lib/session.test.js, which
	// exercises the phase-transition logic directly without a browser.
	await page.click('button.run-new');
	await page.waitForSelector('dialog[open]', { timeout: 5_000 });
	// The checkbox itself is visually hidden (tile styling handles the
	// selected state), so click the tile label the way a real user would.
	await page.click('.grade-check >> nth=0');
	await page.click('button.start');
	await page.waitForURL(/\/session\/[a-z0-9]+/, { timeout: 5_000 });
	await page.waitForSelector('.prompt', { timeout: 15_000 });

	const before = (await page.$$eval('.option', (els) => els.map((e) => e.textContent.trim()))).length;
	if (before !== 4) throw new Error(`expected 4 options, got ${before}`);

	await page.click('.option');
	await page.waitForSelector('.option.correct', { timeout: 2_000 });

	const promptBefore = await page.textContent('.prompt');
	// Timeout must clear the 3s hold on a wrong answer (this test clicks the
	// first rendered option, which may or may not be the correct one).
	await page.waitForFunction(
		(prev) => document.querySelector('.prompt')?.textContent !== prev,
		promptBefore,
		{ timeout: 4_000 }
	);

	// Glossary: grade sections are an accordion, open by default, with the
	// fold state persisted across reloads and a side-nav to escape a long list.
	await page.goto(`${BASE_URL}/glossary`);
	await page.waitForSelector('.grade-block', { timeout: 15_000 });

	const openAtStart = await page.$$eval('details.grade-block[open]', (els) => els.length);
	const totalGrades = await page.$$eval('details.grade-block', (els) => els.length);
	if (openAtStart !== totalGrades) {
		throw new Error(`expected all ${totalGrades} grade sections open by default, got ${openAtStart}`);
	}

	const firstHeaderText = await page.textContent('summary.grade-header >> nth=0');
	if (!/\d+ kanji/.test(firstHeaderText)) {
		throw new Error(`expected a kanji count in the grade header, got "${firstHeaderText}"`);
	}

	await page.click('summary.grade-header >> nth=0');
	await page.waitForFunction(
		() => !document.querySelector('details.grade-block').open,
		{ timeout: 2_000 }
	);

	await page.reload();
	await page.waitForSelector('.grade-block', { timeout: 15_000 });
	const firstOpenAfterReload = await page.$eval('details.grade-block', (el) => el.open);
	if (firstOpenAfterReload) throw new Error('folded grade section should stay folded across reloads');

	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await page.click('.side-btn >> nth=2'); // "Top" button
	await page.waitForFunction(() => window.scrollY < 50, { timeout: 3_000 });

	// Kanji search: opens a dialog, filters live as you type, and accepts
	// romaji, katakana, or hiragana for the same reading ("migi"/"ミギ"/
	// "みぎ" all read as 右's kunyomi). "migi" also substring-matches 汀
	// (water's edge, kunyomi みぎわ), so assert 右 appears rather than
	// requiring an exact result count.
	const hasMigiMatch = () =>
		page.waitForFunction(
			() => [...document.querySelectorAll('.search-row .grade-kanji')].some((el) => el.textContent === '右'),
			undefined,
			{ timeout: 2_000 }
		);

	await page.click('.side-btn >> nth=1'); // "Search" button
	await page.waitForSelector('dialog[open]', { timeout: 5_000 });

	await page.fill('.search-input', 'migi');
	await hasMigiMatch();

	await page.fill('.search-input', 'ミギ');
	await hasMigiMatch();

	await page.fill('.search-input', 'みぎ');
	await hasMigiMatch();

	await page.fill('.search-input', 'zzz-no-such-reading');
	await page.waitForSelector('.search-empty', { timeout: 2_000 });

	await page.fill('.search-input', 'migi');
	await hasMigiMatch();
	await page.click('.search-row:has-text("右")');
	await page.waitForFunction(() => !document.querySelector('dialog[open]'), undefined, { timeout: 2_000 });

	await page.click('.side-btn >> nth=0'); // "Back" button
	await page.waitForURL(`${BASE_URL}/`, { timeout: 5_000 });

	if (consoleErrors.length) {
		throw new Error(`console errors during smoke test:\n${consoleErrors.join('\n')}`);
	}

	// Regression test for the vite-plugin-pwa/SvelteKit precache-ordering bug:
	// the service worker's precache manifest previously had zero .html entries
	// because it was built before SvelteKit's prerender step ran, so the SPA
	// navigation fallback pointed at nothing and offline loads failed outright.
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 15_000 });
	const context = page.context();
	await context.setOffline(true);
	await page.reload();
	await page.waitForSelector('.grade-summary', { timeout: 10_000 });
	await context.setOffline(false);

	await browser.close();
	console.log('e2e smoke test passed');
} finally {
	server.kill();
}
