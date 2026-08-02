<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { kanjiData, GRADES, GRADE_LABELS, GRADE_GROUPS } from '$lib/kanji-data.js';
	import { getAllGradeStats } from '$lib/db.js';
	import {
		encodeSessionConfig,
		decodeSessionConfig,
		getRecentSessions,
		SESSION_SIZES
	} from '$lib/session.js';

	let gradeSummaries = $state([]); // [{grade, kanji, label, total, reviewedPct, learnedPct}]
	let selectedGrades = $state(new Set());
	let sessionSize = $state(20);
	let reviewAfter = $state(true);
	let ready = $state(false);
	let recentSessions = $state([]); // [{code, ts, config}]
	let dialogEl;
	let replayDialogEl;
	let quickDialogEl;
	let quickQuizTarget = $state(null); // the grade summary tapped to open the quick-quiz dialog

	const QUICK_QUIZ_SIZE = 20;

	let kanjiByGrade = $derived(new Map(gradeSummaries.map((g) => [g.grade, g.kanji])));

	async function loadStats() {
		ready = false;
		const raw = await getAllGradeStats();
		gradeSummaries = GRADES.map((g) => {
			const gradeKanji = kanjiData.filter((k) => k.grade === g);
			const rec = raw.get(g);
			return {
				grade: g,
				kanji: gradeKanji[0].kanji,
				label: GRADE_LABELS[g],
				total: gradeKanji.length,
				reviewedPct: rec ? Math.round((rec.reviewed / gradeKanji.length) * 100) : 0,
				learnedPct: rec ? Math.round((rec.learned / gradeKanji.length) * 100) : 0
			};
		});
		ready = true;
	}

	function openDialog() {
		dialogEl.showModal();
	}

	function closeDialog() {
		dialogEl.close();
	}

	function loadRecentSessions() {
		recentSessions = getRecentSessions()
			.map((s) => ({ ...s, config: decodeSessionConfig(s.code) }))
			.filter((s) => s.config !== null);
	}

	function openReplayDialog() {
		replayDialogEl.showModal();
	}

	function closeReplayDialog() {
		replayDialogEl.close();
	}

	function replaySession(code) {
		goto(`/session/${code}`);
	}

	function openQuickQuiz(g) {
		quickQuizTarget = g;
		quickDialogEl.showModal();
	}

	function closeQuickQuiz() {
		quickDialogEl.close();
	}

	function startQuickQuiz() {
		const code = encodeSessionConfig({
			grades: [quickQuizTarget.grade],
			count: QUICK_QUIZ_SIZE,
			review: false
		});
		goto(`/session/${code}`);
	}

	function toggleGrade(g) {
		if (selectedGrades.has(g)) selectedGrades.delete(g);
		else selectedGrades.add(g);
		selectedGrades = new Set(selectedGrades);
	}

	function startSession() {
		if (selectedGrades.size === 0) return;
		const code = encodeSessionConfig({
			grades: [...selectedGrades],
			count: sessionSize,
			review: reviewAfter
		});
		goto(`/session/${code}`);
	}

	onMount(() => {
		loadStats();
		loadRecentSessions();
	});
</script>

<svelte:head>
	<title>漢字ゴン</title>
	<meta
		name="description"
		content="Offline-first kanji flashcards grouped by Japanese school grade, with spaced-repetition review. No account, no ads, works with zero internet access."
	/>
	<link rel="canonical" href={page.url.href} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:title" content="漢字ゴン — Kanjigon" />
	<meta
		property="og:description"
		content="Offline-first kanji flashcards grouped by Japanese school grade, with spaced-repetition review."
	/>
	<meta property="og:image" content="https://kanjigon.netlify.app/icons/icon-512.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="漢字ゴン — Kanjigon" />
	<meta
		name="twitter:description"
		content="Offline-first kanji flashcards grouped by Japanese school grade, with spaced-repetition review."
	/>
	<meta name="twitter:image" content="https://kanjigon.netlify.app/icons/icon-512.png" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'Kanjigon',
		description:
			'Offline-first kanji flashcards grouped by Japanese school grade, with spaced-repetition review.',
		url: 'https://kanjigon.netlify.app/',
		applicationCategory: 'EducationalApplication',
		operatingSystem: 'Any',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
	})}</script>`}
</svelte:head>

<main>
	<header>
		<h1>漢字ゴン</h1>
	</header>

	{#if !ready}
		<p class="loading">Loading…</p>
	{:else}
		{#each GRADE_GROUPS as group}
			<section class="grade-group">
				<h2 class="group-label">{group.label}</h2>
				<div class="grade-summary">
					{#each gradeSummaries.filter((g) => group.grades.includes(g.grade)) as g}
						<button type="button" class="grade-row" onclick={() => openQuickQuiz(g)}>
							<span class="grade-kanji">{g.kanji}</span>
							<span class="grade-label">{g.label}</span>
							<div class="grade-bars">
								<div class="bar-row">
									<span class="bar-label">reviewed</span>
									<div class="bar">
										<div class="bar-fill reviewed" style="width: {g.reviewedPct}%"></div>
									</div>
									<span class="bar-pct">{g.reviewedPct}%</span>
								</div>
								<div class="bar-row">
									<span class="bar-label">learned</span>
									<div class="bar">
										<div class="bar-fill learned" style="width: {g.learnedPct}%"></div>
									</div>
									<span class="bar-pct">{g.learnedPct}%</span>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</section>
		{/each}
	{/if}

	<div class="actions">
		<button class="run-new" onclick={openDialog}>New quiz!</button>
		<button class="replay" disabled={recentSessions.length === 0} onclick={openReplayDialog}>
			Replay
		</button>
	</div>
	<button class="glossary" onclick={() => goto('/glossary')}>Glossary</button>
</main>

<dialog bind:this={dialogEl}>
	<h2>New session</h2>

	<fieldset>
		<legend>Grades</legend>
		<div class="grade-checks">
			{#each gradeSummaries as g}
				<label class="grade-check" class:selected={selectedGrades.has(g.grade)}>
					<input
						type="checkbox"
						class="sr-only"
						checked={selectedGrades.has(g.grade)}
						onchange={() => toggleGrade(g.grade)}
					/>
					<span class="grade-check-kanji">{g.kanji}</span>
					<span class="grade-check-label">{g.label}</span>
				</label>
			{/each}
		</div>
	</fieldset>

	<label class="field">
		How many kanji
		<select bind:value={sessionSize}>
			{#each SESSION_SIZES as n}
				<option value={n}>{n}</option>
			{/each}
		</select>
	</label>

	<label class="field row">
		<input type="checkbox" bind:checked={reviewAfter} />
		Review failed kanji after the session
	</label>

	<div class="dialog-actions">
		<button type="button" onclick={closeDialog}>Cancel</button>
		<button type="button" class="start" disabled={selectedGrades.size === 0} onclick={startSession}>
			Start
		</button>
	</div>
</dialog>

<dialog bind:this={replayDialogEl}>
	<h2>Replay a session</h2>

	{#if recentSessions.length === 0}
		<p class="empty-recent">No sessions yet.</p>
	{:else}
		<div class="recent-list">
			{#each recentSessions as s}
				<button type="button" class="recent-row" onclick={() => replaySession(s.code)}>
					<span class="recent-kanji">
						{s.config.grades.map((g) => kanjiByGrade.get(g)).join(' ')}
					</span>
					<span class="recent-meta">
						{s.config.count} kanji{s.config.review ? ' · review' : ''}
					</span>
				</button>
			{/each}
		</div>
	{/if}

	<div class="dialog-actions">
		<button type="button" onclick={closeReplayDialog}>Close</button>
	</div>
</dialog>

<dialog bind:this={quickDialogEl} onclick={(e) => e.target === quickDialogEl && closeQuickQuiz()}>
	<h2>Quick quiz?</h2>

	{#if quickQuizTarget}
		<p class="quick-quiz-copy">
			Want a quick {quickQuizTarget.label} quiz? {QUICK_QUIZ_SIZE} kanji, no review round.
		</p>
	{/if}

	<div class="dialog-actions">
		<button type="button" onclick={closeQuickQuiz}>No</button>
		<button type="button" class="start" onclick={startQuickQuiz}>Yes</button>
	</div>
</dialog>

<style>
	main {
		max-width: 480px;
		margin: 0 auto;
		padding: 1rem 1.25rem 2rem;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h1 {
		font-size: 1.25rem;
		margin: 0;
	}

	.loading {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-dim);
	}

	.grade-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group-label {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-dim);
		margin: 0;
	}

	.grade-summary {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.grade-row {
		display: grid;
		grid-template-columns: 2.5rem 1fr;
		gap: 0.25rem 0.75rem;
		align-items: center;
		background: var(--surface);
		border: none;
		border-radius: 0.75rem;
		padding: 0.75rem;
		width: 100%;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.grade-kanji {
		grid-row: span 2;
		font-size: 1.75rem;
		text-align: center;
	}

	.grade-label {
		font-size: 0.8rem;
		color: var(--text-dim);
	}

	.grade-bars {
		grid-column: 2;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.bar-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.7rem;
		color: var(--text-dim);
	}

	.bar-label {
		width: 3.5rem;
	}

	.bar {
		flex: 1;
		height: 0.4rem;
		background: var(--surface-2);
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
	}

	.bar-fill.reviewed {
		background: var(--hard);
	}

	.bar-fill.learned {
		background: var(--good);
	}

	.bar-pct {
		width: 2.5rem;
		text-align: right;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.run-new {
		flex: 1;
		padding: 0.9rem 1rem;
		border: none;
		border-radius: 0.6rem;
		background: var(--accent);
		color: white;
		font-weight: 600;
		font-size: 1rem;
	}

	.replay {
		flex: 1;
		padding: 0.9rem 1rem;
		border: 1px solid var(--surface-2);
		border-radius: 0.6rem;
		background: var(--surface);
		color: var(--text);
		font-weight: 600;
		font-size: 1rem;
	}

	.replay:disabled {
		opacity: 0.5;
	}

	.glossary {
		padding: 0.9rem 1rem;
		border: 1px solid var(--surface-2);
		border-radius: 0.6rem;
		background: var(--surface);
		color: var(--text);
		font-weight: 600;
		font-size: 1rem;
	}

	.quick-quiz-copy {
		color: var(--text-dim);
		font-size: 0.9rem;
		margin: 0 0 1rem;
	}

	.empty-recent {
		color: var(--text-dim);
		font-size: 0.9rem;
		margin: 0 0 1rem;
	}

	.recent-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
		max-height: 50vh;
		overflow-y: auto;
	}

	.recent-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border: 1px solid var(--surface-2);
		border-radius: 0.6rem;
		background: var(--surface-2);
		color: var(--text);
		text-align: left;
	}

	.recent-kanji {
		font-size: 1.1rem;
	}

	.recent-meta {
		font-size: 0.75rem;
		color: var(--text-dim);
	}

	dialog {
		max-width: 420px;
		width: 90vw;
		border: none;
		border-radius: 1rem;
		padding: 1.25rem;
		background: var(--surface);
		color: var(--text);
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}

	dialog h2 {
		margin: 0 0 1rem;
		font-size: 1.1rem;
	}

	fieldset {
		border: 1px solid var(--surface-2);
		border-radius: 0.6rem;
		margin: 0 0 1rem;
	}

	legend {
		color: var(--text-dim);
		font-size: 0.8rem;
		padding: 0 0.4rem;
	}

	.grade-checks {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.grade-check {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.7rem;
		color: var(--text-dim);
		padding: 0.5rem 0.25rem;
		border: 1px solid var(--surface-2);
		border-radius: 0.5rem;
		cursor: pointer;
	}

	.grade-check.selected {
		border-color: var(--accent);
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}

	.grade-check-kanji {
		font-size: 1.5rem;
		color: var(--text);
	}

	.field {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.field.row {
		justify-content: flex-start;
		gap: 0.5rem;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.dialog-actions button {
		padding: 0.6rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid var(--surface-2);
		background: var(--surface-2);
		color: var(--text);
		font-weight: 600;
	}

	.dialog-actions .start {
		background: var(--accent);
		border-color: var(--accent);
		color: white;
	}

	.dialog-actions .start:disabled {
		opacity: 0.5;
	}
</style>
