<script>
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { kanjiData, GRADES, GRADE_LABELS, GRADE_LABELS_EN, GRADE_GROUPS } from '$lib/kanji-data.js';
	import { buildSearchIndex, searchKanji } from '$lib/kana.js';

	const FOLD_STATE_KEY = 'kanjigon:glossary-open-grades';
	const searchIndex = buildSearchIndex(kanjiData);

	let searchDialogEl;
	let searchInputEl;
	let searchQuery = $state('');
	let searchResults = $derived(searchQuery.trim() ? searchKanji(searchIndex, searchQuery) : []);

	// Unfolded by default; persisted per grade once a user folds one.
	let openByGrade = $state(Object.fromEntries(GRADES.map((g) => [g, true])));

	if (browser) {
		try {
			const saved = JSON.parse(localStorage.getItem(FOLD_STATE_KEY) ?? '{}');
			for (const g of GRADES) if (g in saved) openByGrade[g] = saved[g];
		} catch {
			// ignore corrupt storage, fall back to all-unfolded
		}
	}

	$effect(() => {
		if (browser) localStorage.setItem(FOLD_STATE_KEY, JSON.stringify(openByGrade));
	});

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function openSearchDialog() {
		searchQuery = '';
		searchDialogEl.showModal();
		// showModal() must run first or the input isn't focusable yet.
		requestAnimationFrame(() => searchInputEl?.focus());
	}

	function closeSearchDialog() {
		searchDialogEl.close();
	}

	function jumpToEntry(entry) {
		openByGrade[entry.grade] = true;
		closeSearchDialog();
		requestAnimationFrame(() => {
			document
				.querySelector(`[data-kanji="${entry.kanji}"]`)
				?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
	}
</script>

<svelte:head>
	<title>漢字ゴン — Glossary</title>
	<meta
		name="description"
		content="Browse all Japanese kanji by school grade — readings and meanings for grades 1–6, jouyou, and jinmeiyou kanji."
	/>
	<link rel="canonical" href={page.url.href} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:title" content="漢字ゴン — Glossary" />
	<meta
		property="og:description"
		content="Browse all Japanese kanji by school grade — readings and meanings for grades 1–6, jouyou, and jinmeiyou kanji."
	/>
	<meta property="og:image" content="https://kanjigon.netlify.app/icons/icon-512.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="漢字ゴン — Glossary" />
	<meta
		name="twitter:description"
		content="Browse all Japanese kanji by school grade — readings and meanings for grades 1–6, jouyou, and jinmeiyou kanji."
	/>
	<meta name="twitter:image" content="https://kanjigon.netlify.app/icons/icon-512.png" />
</svelte:head>

<main>
	<header>
		<h1>Glossary</h1>
	</header>

	{#each GRADE_GROUPS as group}
		<section class="grade-group">
			<h2 class="group-label">{group.label}</h2>
			{#each group.grades as grade}
				{@const gradeKanji = kanjiData.filter((k) => k.grade === grade)}
				<details
					class="grade-block"
					open={openByGrade[grade]}
					ontoggle={(e) => (openByGrade[grade] = e.currentTarget.open)}
				>
					<summary class="grade-header">
						<span class="chevron" aria-hidden="true">▸</span>
						<span class="grade-label-jp">{GRADE_LABELS[grade]}</span>
						<span class="grade-label-en">{GRADE_LABELS_EN[grade]}</span>
						<span class="grade-count">{gradeKanji.length} kanji</span>
					</summary>
					<div class="grade-summary">
						{#each gradeKanji as entry (entry.kanji)}
							<div class="grade-row" data-kanji={entry.kanji}>
								<span class="grade-kanji">{entry.kanji}</span>
								<span class="grade-label">{entry.meaning}</span>
								<div class="grade-bars">
									<div class="bar-row">
										<span class="bar-label">onyomi</span>
										<span class="reading-value">{entry.onyomi.join('・') || '—'}</span>
									</div>
									<div class="bar-row">
										<span class="bar-label">kunyomi</span>
										<span class="reading-value">{entry.kunyomi.join('・') || '—'}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</details>
			{/each}
		</section>
	{/each}
</main>

<div class="side-nav">
	<button class="side-btn" onclick={() => goto('/')} aria-label="Back to home">
		<span class="side-btn-icon" aria-hidden="true">←</span>
		<span>Back</span>
	</button>
	<button class="side-btn" onclick={openSearchDialog} aria-label="Search kanji">
		<span class="side-btn-icon" aria-hidden="true">⌕</span>
		<span>Search</span>
	</button>
	<button class="side-btn" onclick={scrollToTop} aria-label="Scroll to top">
		<span class="side-btn-icon" aria-hidden="true">↑</span>
		<span>Top</span>
	</button>
</div>

<dialog
	class="search-dialog"
	bind:this={searchDialogEl}
	onclick={(e) => e.target === searchDialogEl && closeSearchDialog()}
>
	<div class="search-header">
		<input
			bind:this={searchInputEl}
			bind:value={searchQuery}
			type="text"
			inputmode="text"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			placeholder="Search readings or meaning…"
			class="search-input"
		/>
		<button type="button" class="search-close" onclick={closeSearchDialog} aria-label="Close search">
			✕
		</button>
	</div>

	<div class="search-results">
		{#if searchQuery.trim() && searchResults.length === 0}
			<p class="search-empty">No matches.</p>
		{:else}
			{#each searchResults as entry (entry.kanji)}
				<button type="button" class="search-row" onclick={() => jumpToEntry(entry)}>
					<span class="grade-kanji">{entry.kanji}</span>
					<span class="grade-label">{entry.meaning}</span>
					<div class="grade-bars">
						<div class="bar-row">
							<span class="bar-label">onyomi</span>
							<span class="reading-value">{entry.onyomi.join('・') || '—'}</span>
						</div>
						<div class="bar-row">
							<span class="bar-label">kunyomi</span>
							<span class="reading-value">{entry.kunyomi.join('・') || '—'}</span>
						</div>
					</div>
				</button>
			{/each}
		{/if}
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
		gap: 1.25rem;
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

	.grade-group {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.group-label {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin: 0;
		padding-bottom: 0.4rem;
		border-bottom: 2px solid var(--accent);
	}

	.grade-block {
		display: flex;
		flex-direction: column;
	}

	.grade-header {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0.65rem 0.85rem;
		background: var(--surface-2);
		border-radius: 0.6rem;
		font-weight: 600;
		cursor: pointer;
		list-style: none;
	}

	.grade-header::-webkit-details-marker {
		display: none;
	}

	.chevron {
		font-size: 0.7rem;
		color: var(--text-dim);
		transition: transform 0.15s ease;
	}

	details[open] > .grade-header .chevron {
		transform: rotate(90deg);
	}

	.grade-label-jp {
		font-size: 0.95rem;
		color: var(--text);
	}

	.grade-label-en {
		flex: 1;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-dim);
	}

	.grade-count {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-dim);
	}

	.grade-summary {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.6rem;
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
		align-items: baseline;
		gap: 0.5rem;
		font-size: 0.7rem;
		color: var(--text-dim);
	}

	.bar-label {
		width: 3.5rem;
		flex-shrink: 0;
	}

	.reading-value {
		flex: 1;
		color: var(--text);
	}

	.side-nav {
		position: fixed;
		right: 1rem;
		bottom: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 20;
	}

	@media (min-width: 700px) {
		.side-nav {
			top: 50%;
			bottom: auto;
			right: max(1rem, calc(50vw - 240px - 4rem));
			transform: translateY(-50%);
		}
	}

	.side-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		width: 3.25rem;
		padding: 0.5rem 0.25rem;
		border: 1px solid var(--surface-2);
		border-radius: 0.75rem;
		background: var(--surface);
		color: var(--text-dim);
		font-size: 0.65rem;
		font-weight: 600;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
	}

	.side-btn-icon {
		font-size: 1.1rem;
		color: var(--text);
	}

	.search-dialog {
		max-width: 480px;
		width: 90vw;
		max-height: 80vh;
		border: none;
		border-radius: 1rem;
		padding: 1rem;
		background: var(--surface);
		color: var(--text);
		flex-direction: column;
		gap: 0.75rem;
	}

	/* dialog[open]'s UA default is `display: block`; override to flex only
	   while open so the closed state stays `display: none` (native default)
	   instead of an author rule always beating the UA stylesheet's :not([open]) */
	.search-dialog[open] {
		display: flex;
	}

	.search-dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}

	.search-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.search-input {
		flex: 1;
		padding: 0.65rem 0.85rem;
		border: 1px solid var(--surface-2);
		border-radius: 0.6rem;
		background: var(--surface-2);
		color: var(--text);
		font-size: 1rem;
	}

	.search-close {
		flex-shrink: 0;
		width: 2.25rem;
		height: 2.25rem;
		border: 1px solid var(--surface-2);
		border-radius: 0.6rem;
		background: var(--surface-2);
		color: var(--text-dim);
		font-size: 0.9rem;
	}

	.search-results {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		overflow-y: auto;
	}

	.search-empty {
		color: var(--text-dim);
		font-size: 0.9rem;
		text-align: center;
		margin: 1rem 0;
	}

	.search-row {
		display: grid;
		grid-template-columns: 2.5rem 1fr;
		gap: 0.25rem 0.75rem;
		align-items: center;
		background: var(--surface-2);
		border: none;
		border-radius: 0.75rem;
		padding: 0.75rem;
		width: 100%;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
</style>
