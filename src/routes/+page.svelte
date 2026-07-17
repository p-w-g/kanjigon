<script>
	import { onMount } from 'svelte';
	import { kanjiData, LEVELS } from '$lib/kanji-data.js';
	import { db, getOrCreateProgress, saveProgress, getStats } from '$lib/db.js';
	import { schedule, newCardState, GRADE } from '$lib/srs.js';

	let level = $state('N5');
	let queue = $state([]); // [{kanji, meta, progress}]
	let current = $state(null);
	let revealed = $state(false);
	let stats = $state({ total: 0, due: 0, learned: 0 });
	let ready = $state(false);
	let offlineReady = $state(false);

	async function loadLevel(lvl) {
		ready = false;
		const pool = kanjiData.filter((k) => k.level === lvl);
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
		revealed = false;
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
		revealed = false;
		stats = await getStats(level);
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
	<title>Kanji Flash — {level}</title>
</svelte:head>

<main>
	<header>
		<h1>漢字 Flash</h1>
		<div class="badge" class:on={offlineReady} title="Offline caching status">
			{offlineReady ? '● offline-ready' : '○ loading…'}
		</div>
	</header>

	<nav class="levels">
		{#each LEVELS as lvl}
			<button class:active={lvl === level} onclick={() => selectLevel(lvl)}>{lvl}</button>
		{/each}
	</nav>

	<div class="stats">
		<span>{stats.due} due</span>
		<span>{stats.learned}/{stats.total} learned</span>
	</div>

	{#if !ready}
		<p class="loading">Loading…</p>
	{:else if !current}
		<div class="empty">
			<p>All caught up on {level} for now 🎉</p>
			<p class="hint">Come back later, or switch levels above.</p>
		</div>
	{:else}
		<div class="card" onclick={() => (revealed = !revealed)}>
			<div class="kanji">{current.meta.kanji}</div>
			{#if revealed}
				<div class="details">
					{#if current.meta.onyomi.length}
						<p><span class="label">On:</span> {current.meta.onyomi.join('、')}</p>
					{/if}
					{#if current.meta.kunyomi.length}
						<p><span class="label">Kun:</span> {current.meta.kunyomi.join('、')}</p>
					{/if}
					<p class="meaning">{current.meta.meaning}</p>
				</div>
			{:else}
				<p class="tap-hint">tap to reveal</p>
			{/if}
		</div>

		{#if revealed}
			<div class="grades">
				<button class="again" onclick={() => grade(GRADE.AGAIN)}>Again</button>
				<button class="hard" onclick={() => grade(GRADE.HARD)}>Hard</button>
				<button class="good" onclick={() => grade(GRADE.GOOD)}>Good</button>
				<button class="easy" onclick={() => grade(GRADE.EASY)}>Easy</button>
			</div>
		{/if}
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

	.card {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		border-radius: 1rem;
		min-height: 320px;
		padding: 2rem 1rem;
		gap: 1rem;
		cursor: pointer;
		user-select: none;
	}

	.kanji {
		font-size: 6rem;
		line-height: 1;
	}

	.tap-hint {
		color: var(--text-dim);
		font-size: 0.85rem;
	}

	.details {
		text-align: center;
	}

	.details .label {
		color: var(--text-dim);
		font-size: 0.8rem;
	}

	.details .meaning {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: 0.5rem;
	}

	.grades {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}

	.grades button {
		padding: 0.9rem 0;
		border: none;
		border-radius: 0.6rem;
		color: white;
		font-weight: 600;
	}

	.again {
		background: var(--again);
	}
	.hard {
		background: var(--hard);
	}
	.good {
		background: var(--good);
	}
	.easy {
		background: var(--easy);
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
