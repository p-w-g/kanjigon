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

	if (consoleErrors.length) {
		throw new Error(`console errors during smoke test:\n${consoleErrors.join('\n')}`);
	}

	await browser.close();
	console.log('e2e smoke test passed');
} finally {
	server.kill();
}
