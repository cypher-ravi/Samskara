<script lang="ts">
	import type { Rule, Source } from '$lib/db/types';

	let {
		rule,
		index,
		total,
		sources,
		pending = []
	}: { rule: Rule; index: number; total: number; sources: Source[]; pending?: string[] } = $props();

	const tilt = [-4, 3, -2, 5, -5, 2, -3, 4, -1, 3];
	const label = (id: string) => sources.find((s) => s.id === id)?.label ?? id;
	let stamped = $derived(rule.answer && rule.answer.pull > 0 ? rule.answer.sources : pending);
</script>

<article class="card" aria-live="polite">
	<div class="card-top">
		<span class="label">{rule.category}</span>
		<span class="label">{String(index + 1).padStart(2, '0')} / {total}</span>
	</div>
	<p class="rule">“{rule.text}”</p>
	<div class="stamps">
		{#each stamped as id, i (id)}
			<span class="stamp" class:self={id === 'self'} style="--r:{tilt[i % tilt.length]}deg">{label(id)}</span>
		{:else}
			<span class="hint">
				{rule.answer?.pull === 0 ? 'Set aside: not part of you.' : 'Where it came from will be stamped here.'}
			</span>
		{/each}
	</div>
</article>
