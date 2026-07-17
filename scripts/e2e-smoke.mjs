// Drives the built app in a headless browser to prove the quiz actually
// works end to end (not just unit-tested in isolation). Run with:
//   npm run test:e2e
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

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
	await page.waitForSelector('.prompt', { timeout: 15_000 });

	const before = (await page.$$eval('.option', (els) => els.map((e) => e.textContent.trim()))).length;
	if (before !== 4) throw new Error(`expected 4 options, got ${before}`);

	await page.click('.option');
	await page.waitForSelector('.option.correct', { timeout: 2_000 });

	const promptBefore = await page.textContent('.prompt');
	await page.waitForFunction(
		(prev) => document.querySelector('.prompt')?.textContent !== prev,
		promptBefore,
		{ timeout: 3_000 }
	);

	if (consoleErrors.length) {
		throw new Error(`console errors during smoke test:\n${consoleErrors.join('\n')}`);
	}

	await browser.close();
	console.log('e2e smoke test passed');
} finally {
	server.kill();
}
