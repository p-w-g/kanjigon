<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { kanjiData, GRADES } from '$lib/kanji-data.js';
	import { getAllGradeStats } from '$lib/db.js';
	import { encodeSessionConfig, SESSION_SIZES } from '$lib/session.js';

	let gradeSummaries = $state([]); // [{grade, kanji, total, reviewedPct, learnedPct}]
	let selectedGrades = $state(new Set());
	let sessionSize = $state(20);
	let reviewAfter = $state(true);
	let ready = $state(false);
	let offlineReady = $state(false);
	let dialogEl;

	async function loadStats() {
		ready = false;
		const raw = await getAllGradeStats();
		gradeSummaries = GRADES.map((g) => {
			const gradeKanji = kanjiData.filter((k) => k.grade === g);
			const rec = raw.get(g);
			return {
				grade: g,
				kanji: gradeKanji[0].kanji,
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
		// Just a soft signal to the user that the SW has taken over —
		// not required for functionality, IndexedDB works regardless.
		const { offlineReady: offlineReadyStore } = useRegisterSW();
		return offlineReadyStore.subscribe((v) => (offlineReady = v));
	});
</script>

<svelte:head>
	<title>漢字ゴン</title>
</svelte:head>

<main>
	<header>
		<h1>漢字ゴン</h1>
		<div class="badge" class:on={offlineReady} title="Offline caching status">
			{offlineReady ? '● offline-ready' : '○ loading…'}
		</div>
	</header>

	{#if !ready}
		<p class="loading">Loading…</p>
	{:else}
		<div class="grade-summary">
			{#each gradeSummaries as g}
				<div class="grade-row">
					<span class="grade-kanji">{g.kanji}</span>
					<span class="grade-label">Grade {g.grade}</span>
					<div class="grade-bars">
						<div class="bar-row">
							<span class="bar-label">reviewed</span>
							<div class="bar"><div class="bar-fill reviewed" style="width: {g.reviewedPct}%"></div></div>
							<span class="bar-pct">{g.reviewedPct}%</span>
						</div>
						<div class="bar-row">
							<span class="bar-label">learned</span>
							<div class="bar"><div class="bar-fill learned" style="width: {g.learnedPct}%"></div></div>
							<span class="bar-pct">{g.learnedPct}%</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<button class="run-new" onclick={openDialog}>New quiz!</button>
</main>

<dialog bind:this={dialogEl}>
	<h2>New session</h2>

	<fieldset>
		<legend>Grades</legend>
		<div class="grade-checks">
			{#each gradeSummaries as g}
				<label class="grade-check">
					<input
						type="checkbox"
						checked={selectedGrades.has(g.grade)}
						onchange={() => toggleGrade(g.grade)}
					/>
					<span class="grade-check-kanji">{g.kanji}</span>
					<span class="grade-check-label">Grade {g.grade}</span>
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

	.badge {
		font-size: 0.7rem;
		color: var(--text-dim);
	}
	.badge.on {
		color: var(--good);
	}

	.loading {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-dim);
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
		border-radius: 0.75rem;
		padding: 0.75rem;
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

	.run-new {
		padding: 0.9rem 1rem;
		border: none;
		border-radius: 0.6rem;
		background: var(--accent);
		color: white;
		font-weight: 600;
		font-size: 1rem;
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

	.grade-check {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.7rem;
		color: var(--text-dim);
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
