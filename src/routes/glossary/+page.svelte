<script>
	import { goto } from '$app/navigation';
	import { kanjiData, GRADE_LABELS, GRADE_GROUPS } from '$lib/kanji-data.js';
</script>

<svelte:head>
	<title>漢字ゴン — Glossary</title>
</svelte:head>

<main>
	<header>
		<h1>Glossary</h1>
		<button class="back" onclick={() => goto('/')}>Back</button>
	</header>

	{#each GRADE_GROUPS as group}
		<section class="grade-group">
			<h2 class="group-label">{group.label}</h2>
			{#each group.grades as grade}
				<h3 class="subgrade-label">{GRADE_LABELS[grade]}</h3>
				<div class="grade-summary">
					{#each kanjiData.filter((k) => k.grade === grade) as entry (entry.kanji)}
						<div class="grade-row">
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
			{/each}
		</section>
	{/each}
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

	.back {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--surface-2);
		border-radius: 0.5rem;
		background: var(--surface);
		color: var(--text-dim);
		font-size: 0.8rem;
		font-weight: 600;
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

	.subgrade-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-dim);
		margin: 0.5rem 0 0;
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
</style>
