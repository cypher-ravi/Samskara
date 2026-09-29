<script lang="ts">
	import type { SourceCount } from '$lib/logic';

	let { counts, max }: { counts: SourceCount[]; max: number } = $props();
	const pct = (n: number) => `${(n / max) * 100}%`;
</script>

<div class="legend">
	<span><i style="background:var(--saffron)"></i>Mine</span>
	<span><i style="background:var(--lotus)"></i>Handed to me</span>
	<span><i style="background:var(--ash)"></i>Not sure</span>
</div>
<div class="bars">
	{#each counts as c (c.id)}
		<div class="bar">
			<span class="name">{c.label}</span>
			<div
				class="track"
				role="img"
				aria-label="{c.label}: {c.mine} mine, {c.drop} handed down, {c.unsure} not sure"
			>
				<div class="seg-mine" style="width:{pct(c.mine)}"></div>
				<div class="seg-drop" style="width:{pct(c.drop)}"></div>
				<div class="seg-unsure" style="width:{pct(c.unsure)}"></div>
			</div>
			<span class="n">{c.total}</span>
		</div>
	{/each}
</div>
<p class="need">
	A rule can come from more than one place, so the counts can add up to more than the number of rules.
</p>
