<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { kanjiData } from '$lib/kanji-data.js';
	import { getOrCreateProgress, saveProgress } from '$lib/db.js';
	import { schedule, newCardState, GRADE } from '$lib/srs.js';
	import { buildQuestion } from '$lib/quiz.js';
	import { sortByDueThenRepetitions, decodeSessionConfig } from '$lib/session.js';

	const config = decodeSessionConfig(page.params.code);
	const validConfig = config !== null;
	const grades = config?.grades ?? [];
	const count = config?.count ?? 0;
	const review = config?.review ?? false;

	const combinedPool = validConfig ? kanjiData.filter((k) => grades.includes(k.grade)) : [];

	let phase = $state('main'); // 'main' | 'review'
	let queue = $state([]); // [{meta, progress}]
	let current = $state(null);
	let failedSet = $state(new Set()); // kanji failed at least once during the main phase
	let progressByKanji = new Map(); // kanji -> latest saved progress record (plain, not reactive)
	let answered = $state(false);
	let selectedIndex = $state(null);
	let ready = $state(false);

	let question = $derived(current ? buildQuestion(combinedPool, current.meta) : null);

	async function initSession() {
		const withProgress = await Promise.all(
			combinedPool.map(async (meta) => {
				const progress = await getOrCreateProgress(meta.kanji, meta.grade, newCardState);
				progressByKanji.set(meta.kanji, progress);
				return { meta, progress };
			})
		);
		queue = sortByDueThenRepetitions(withProgress).slice(0, count);
		current = queue[0] ?? null;
		ready = true;
	}

	function advancePhase() {
		if (phase === 'main' && review && failedSet.size > 0) {
			phase = 'review';
			const items = [...failedSet].map((k) => ({
				meta: combinedPool.find((m) => m.kanji === k),
				progress: progressByKanji.get(k)
			}));
			queue = sortByDueThenRepetitions(items);
			current = queue[0] ?? null;
		} else {
			goto('/');
		}
	}

	async function gradeCurrent(g) {
		if (!current) return;
		const updated = schedule(current.progress, g);
		const record = {
			...current.progress,
			...updated,
			attempts: (current.progress.attempts ?? 0) + 1
		};
		await saveProgress(record);
		progressByKanji.set(current.meta.kanji, record);

		const rest = queue.slice(1);
		if (g < GRADE.HARD) {
			if (phase === 'main') failedSet.add(current.meta.kanji);
			rest.splice(Math.min(3, rest.length), 0, { meta: current.meta, progress: record });
		} else if (phase === 'review') {
			failedSet.delete(current.meta.kanji);
		}
		failedSet = new Set(failedSet);

		queue = rest;
		current = queue[0] ?? null;
		if (!current) advancePhase();
	}

	function answer(idx) {
		if (answered || !question) return;
		answered = true;
		selectedIndex = idx;
		const isCorrect = question.options[idx].correct;
		setTimeout(() => {
			gradeCurrent(isCorrect ? GRADE.GOOD : GRADE.AGAIN);
			answered = false;
			selectedIndex = null;
		}, 800);
	}

	onMount(() => {
		if (!validConfig) {
			goto('/');
			return;
		}
		initSession();
	});
</script>

<svelte:head>
	<title>Kanji Flash — {phase === 'review' ? 'Review' : 'Session'}</title>
</svelte:head>

{#if validConfig}
	<main>
		<header>
			<h1>{phase === 'review' ? 'Review round' : 'Session'}</h1>
			<div class="remaining">{queue.length} left</div>
		</header>

		{#if !ready}
			<p class="loading">Loading…</p>
		{:else if !current || !question}
			<div class="empty">
				<p>All done 🎉</p>
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
{/if}

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

	.remaining {
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
</style>
