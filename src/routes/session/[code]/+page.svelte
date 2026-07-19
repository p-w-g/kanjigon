<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { kanjiData } from '$lib/kanji-data.js';
	import { getOrCreateProgress, saveProgress } from '$lib/db.js';
	import { schedule, newCardState, GRADE } from '$lib/srs.js';
	import { buildQuestion } from '$lib/quiz.js';
	import {
		sortByDueThenRepetitions,
		decodeSessionConfig,
		summarizeSession,
		recordRecentSession
	} from '$lib/session.js';

	const config = decodeSessionConfig(page.params.code);
	const validConfig = config !== null;
	const grades = config?.grades ?? [];
	const count = config?.count ?? 0;
	const review = config?.review ?? false;

	const combinedPool = validConfig ? kanjiData.filter((k) => grades.includes(k.grade)) : [];

	let phase = $state('main'); // 'main' | 'review' | 'summary'
	let queue = $state([]); // [{meta, progress}]
	let current = $state(null);
	let failedSet = $state(new Set()); // kanji failed at least once during the main phase
	let everMissed = $state(new Set()); // kanji ever wrong, never cleared — for the summary screen
	let sessionTotal = $state(0); // kanji count at the start of the main phase
	let progressByKanji = new Map(); // kanji -> latest saved progress record (plain, not reactive)
	let answered = $state(false);
	let selectedIndex = $state(null);
	let ready = $state(false);
	let quitDialogEl;

	let question = $derived(current ? buildQuestion(combinedPool, current.meta) : null);
	let summary = $derived(
		phase === 'summary'
			? summarizeSession({ total: sessionTotal, missed: everMissed.size, stillIncorrect: failedSet.size })
			: null
	);

	async function initSession() {
		recordRecentSession(page.params.code);
		const withProgress = await Promise.all(
			combinedPool.map(async (meta) => {
				const progress = await getOrCreateProgress(meta.kanji, meta.grade, newCardState);
				progressByKanji.set(meta.kanji, progress);
				return { meta, progress };
			})
		);
		queue = sortByDueThenRepetitions(withProgress).slice(0, count);
		sessionTotal = queue.length;
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
			phase = 'summary';
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
			if (phase === 'main') {
				failedSet.add(current.meta.kanji);
				everMissed.add(current.meta.kanji);
			}
			rest.splice(Math.min(3, rest.length), 0, { meta: current.meta, progress: record });
		} else if (phase === 'review') {
			failedSet.delete(current.meta.kanji);
		}
		failedSet = new Set(failedSet);
		everMissed = new Set(everMissed);

		queue = rest;
		current = queue[0] ?? null;
		if (!current) advancePhase();
	}

	function openQuitDialog() {
		quitDialogEl.showModal();
	}

	function closeQuitDialog() {
		quitDialogEl.close();
	}

	function confirmQuit() {
		quitDialogEl.close();
		goto('/');
	}

	function answer(idx) {
		if (answered || !question) return;
		answered = true;
		selectedIndex = idx;
		const isCorrect = question.options[idx].correct;
		setTimeout(
			() => {
				gradeCurrent(isCorrect ? GRADE.GOOD : GRADE.AGAIN);
				answered = false;
				selectedIndex = null;
			},
			isCorrect ? 800 : 3000
		);
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
	<title>漢字ゴン — {phase === 'review' ? 'Review' : 'Session'}</title>
</svelte:head>

{#if validConfig}
	<main>
		<header>
			<h1>{phase === 'review' ? 'Review round' : phase === 'summary' ? 'Summary' : 'Session'}</h1>
			{#if phase !== 'summary'}
				<div class="header-right">
					<div class="remaining">{queue.length} left</div>
					<button class="quit" onclick={openQuitDialog}>Quit</button>
				</div>
			{/if}
		</header>

		{#if phase === 'summary'}
			<div class="summary">
				<p class="summary-headline">{summary.correctFirstTry} / {summary.total} correct first try</p>
				{#if summary.missed > 0}
					<p class="summary-line">{summary.missed} needed a second look</p>
				{/if}
				{#if summary.stillIncorrect > 0}
					<p class="summary-line still-incorrect">{summary.stillIncorrect} still incorrect</p>
				{/if}
				<button class="home" onclick={() => goto('/')}>Back to home</button>
			</div>
		{:else if !ready}
			<p class="loading">Loading…</p>
		{:else if !current || !question}
			<div class="empty">
				<p>All done 🎉</p>
			</div>
		{:else}
			<div class="prompt" class:kanji-prompt={question.mode === 'meaning'}>
				{#if question.mode === 'meaning'}
					<div class="kanji-char">{question.prompt}</div>
					<div class="reading">{question.reading}</div>
				{:else}
					{question.prompt}
				{/if}
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
						{#if question.mode === 'kanji'}
							<span class="option-reading">{option.reading}</span>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</main>

	<dialog bind:this={quitDialogEl}>
		<h2>Quit this session?</h2>
		<p>Your progress so far is saved.</p>
		<div class="dialog-actions">
			<button type="button" onclick={closeQuitDialog}>Cancel</button>
			<button type="button" class="quit-confirm" onclick={confirmQuit}>Quit</button>
		</div>
	</dialog>
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

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.remaining {
		font-size: 0.85rem;
		color: var(--text-dim);
	}

	.quit {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--surface-2);
		border-radius: 0.5rem;
		background: var(--surface);
		color: var(--text-dim);
		font-size: 0.8rem;
		font-weight: 600;
	}

	dialog {
		max-width: 380px;
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
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
	}

	dialog p {
		margin: 0 0 1.25rem;
		color: var(--text-dim);
		font-size: 0.9rem;
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

	.dialog-actions .quit-confirm {
		background: var(--again);
		border-color: var(--again);
		color: white;
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
		flex-direction: column;
		gap: 0.5rem;
	}

	.kanji-char {
		font-size: 6rem;
		line-height: 1;
	}

	.reading {
		font-size: 1.1rem;
		font-weight: 400;
		color: var(--text-dim);
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
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		font-size: 2.5rem;
		padding: 1.25rem 0;
	}

	.option-reading {
		font-size: 0.85rem;
		font-weight: 400;
		color: inherit;
		opacity: 0.7;
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

	.summary {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		text-align: center;
	}

	.summary-headline {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
	}

	.summary-line {
		margin: 0;
		color: var(--text-dim);
	}

	.summary-line.still-incorrect {
		color: var(--again);
	}

	.home {
		margin-top: 1rem;
		padding: 0.9rem 1.5rem;
		border: none;
		border-radius: 0.6rem;
		background: var(--accent);
		color: white;
		font-weight: 600;
		font-size: 1rem;
	}
</style>
