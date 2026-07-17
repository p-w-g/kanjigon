<script>
	import { onMount } from 'svelte';
	import { kanjiData, GRADES } from '$lib/kanji-data.js';
	import { db, getOrCreateProgress, saveProgress, getStats } from '$lib/db.js';
	import { schedule, newCardState, GRADE } from '$lib/srs.js';
	import { buildQuestion } from '$lib/quiz.js';

	let level = $state(GRADES[0]);
	let queue = $state([]); // [{kanji, meta, progress}]
	let current = $state(null);
	let answered = $state(false);
	let selectedIndex = $state(null);
	let stats = $state({ total: 0, due: 0, learned: 0 });
	let ready = $state(false);
	let offlineReady = $state(false);

	let currentGradePool = $derived(kanjiData.filter((k) => k.grade === level));
	let question = $derived(current ? buildQuestion(currentGradePool, current.meta) : null);

	async function loadLevel(lvl) {
		ready = false;
		const pool = kanjiData.filter((k) => k.grade === lvl);
		const withProgress = await Promise.all(
			pool.map(async (meta) => {
				const progress = await getOrCreateProgress(meta.kanji, lvl, newCardState);
				return { meta, progress };
			})
		);
		// Due cards first, then by fewest repetitions (prioritize unlearned).
		const now = Date.now();
		withProgress.sort((a, b) => {
			const aDue = a.progress.dueAt <= now ? 0 : 1;
			const bDue = b.progress.dueAt <= now ? 0 : 1;
			if (aDue !== bDue) return aDue - bDue;
			return a.progress.repetitions - b.progress.repetitions;
		});
		queue = withProgress;
		current = queue[0] ?? null;
		answered = false;
		selectedIndex = null;
		stats = await getStats(lvl);
		ready = true;
	}

	async function grade(g) {
		if (!current) return;
		const updated = schedule(current.progress, g);
		const record = { ...current.progress, ...updated };
		await saveProgress(record);

		// requeue failed cards near the back of the session queue instead of
		// dropping them, so you actually re-drill what you missed.
		const rest = queue.slice(1);
		if (g < GRADE.HARD) {
			rest.splice(Math.min(3, rest.length), 0, { meta: current.meta, progress: record });
		}
		queue = rest;
		current = queue[0] ?? null;
		stats = await getStats(level);
	}

	function answer(idx) {
		if (answered || !question) return;
		answered = true;
		selectedIndex = idx;
		const isCorrect = question.options[idx].correct;
		setTimeout(() => {
			grade(isCorrect ? GRADE.GOOD : GRADE.AGAIN);
			answered = false;
			selectedIndex = null;
		}, 800);
	}

	function selectLevel(lvl) {
		level = lvl;
		loadLevel(lvl);
	}

	onMount(() => {
		loadLevel(level);
		// Just a soft signal to the user that the SW has taken over —
		// not required for functionality, IndexedDB works regardless.
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.ready.then(() => (offlineReady = true));
		}
	});
</script>

<svelte:head>
	<title>Kanji Flash — Grade {level}</title>
</svelte:head>

<main>
	<header>
		<h1>漢字 Flash</h1>
		<div class="badge" class:on={offlineReady} title="Offline caching status">
			{offlineReady ? '● offline-ready' : '○ loading…'}
		</div>
	</header>

	<nav class="levels">
		{#each GRADES as lvl}
			<button class:active={lvl === level} onclick={() => selectLevel(lvl)}>{lvl}</button>
		{/each}
	</nav>

	<div class="stats">
		<span>{stats.due} due</span>
		<span>{stats.learned}/{stats.total} learned</span>
	</div>

	{#if !ready}
		<p class="loading">Loading…</p>
	{:else if !current || !question}
		<div class="empty">
			<p>All caught up on grade {level} for now 🎉</p>
			<p class="hint">Come back later, or switch levels above.</p>
		</div>
	{:else}
		<div class="prompt" class:kanji-prompt={question.mode === 'meaning'}>
			{question.prompt}
		</div>

		<div class="options" class:grid={question.mode === 'kanji'}>
			{#each question.options as option, i}
				<button
					class="option"
					class:kanji-option={question.mode === 'kanji'}
					class:correct={answered && option.correct}
					class:incorrect={answered && i === selectedIndex && !option.correct}
					disabled={answered}
					onclick={() => answer(i)}
				>
					{option.text}
				</button>
			{/each}
		</div>
	{/if}
</main>

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

	.levels {
		display: flex;
		gap: 0.5rem;
	}

	.levels button {
		flex: 1;
		padding: 0.5rem 0;
		border-radius: 0.5rem;
		border: 1px solid var(--surface-2);
		background: var(--surface);
		color: var(--text-dim);
		font-weight: 600;
	}

	.levels button.active {
		background: var(--accent);
		color: white;
		border-color: var(--accent);
	}

	.stats {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		color: var(--text-dim);
	}

	.prompt {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		border-radius: 1rem;
		min-height: 200px;
		padding: 2rem 1.25rem;
		text-align: center;
		font-size: 1.5rem;
		font-weight: 600;
		user-select: none;
	}

	.prompt.kanji-prompt {
		font-size: 6rem;
		line-height: 1;
	}

	.options {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.options.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
	}

	.option {
		padding: 0.9rem 1rem;
		border: 1px solid var(--surface-2);
		border-radius: 0.6rem;
		background: var(--surface);
		color: var(--text);
		font-weight: 600;
		text-align: center;
	}

	.option.kanji-option {
		font-size: 2.5rem;
		padding: 1.25rem 0;
	}

	.option.correct {
		background: var(--good);
		border-color: var(--good);
		color: white;
	}

	.option.incorrect {
		background: var(--again);
		border-color: var(--again);
		color: white;
	}

	.empty,
	.loading {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		color: var(--text-dim);
	}

	.hint {
		font-size: 0.85rem;
	}
</style>
