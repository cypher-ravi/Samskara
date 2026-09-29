<script lang="ts">
	import { AREAS } from '$lib/data/seed';

	let {
		initial = [],
		onchoose,
		oncancel
	}: { initial?: string[]; onchoose: (ids: string[]) => void; oncancel?: () => void } = $props();

	let picked = $state<string[]>([...initial]);

	const toggle = (id: string) =>
		(picked = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]);
</script>

<section class="areas">
	<div class="areas-head">
		<h2>What would you like to look at?</h2>
		<p class="prompt">Pick the parts of life you want to reflect on. Two or three is a good start.</p>
	</div>
	<div class="area-grid">
		{#each AREAS as a (a.id)}
			<button id="area-{a.id}" class="area" aria-pressed={picked.includes(a.id)} onclick={() => toggle(a.id)}>
				<strong>{a.label}</strong>
				<span>{a.hint}</span>
			</button>
		{/each}
	</div>
	<div class="areas-actions">
		<button class="btn" disabled={picked.length === 0} onclick={() => onchoose(picked)}>
			{picked.length === 0
				? 'Pick at least one'
				: `Start with ${picked.length} ${picked.length === 1 ? 'area' : 'areas'}`}
		</button>
		<button class="linkbtn quiet" onclick={() => (picked = AREAS.map((a) => a.id))}>Choose all</button>
		{#if oncancel}
			<button class="linkbtn quiet" onclick={oncancel}>Cancel</button>
		{/if}
	</div>
</section>
