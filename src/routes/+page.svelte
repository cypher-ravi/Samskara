<script lang="ts">
	import { base } from '$app/paths';
	import { app } from '$lib/app.svelte';
	import TopBar from '$lib/components/TopBar.svelte';

	let returning = $derived(app.status === 'ready' && app.sortedCount > 0);
</script>

<TopBar view="home" />

<section class="landing">
	<span class="eyebrow">A self-reflection tool</span>
	<h1 class="hero">
		<span class="line">Some beliefs you chose.</span>
		<span class="line glow">Most were handed to you.</span>
		<svg class="swash" viewBox="0 0 440 30" aria-hidden="true"
			><path d="M4 20 C 70 6, 150 28, 230 16 S 360 4, 436 14" /></svg
		>
	</h1>
	<p class="lede">
		Samskara helps you notice the beliefs you picked up from family, school and society long before you
		could question them, and decide which ones you still want to keep.
	</p>

	<div class="cta">
		{#if returning}
			<a class="btn big" href="{base}/reflect">Continue where you left off</a>
			<a class="btn ghost big" href="{base}/map">See my map</a>
		{:else}
			<a class="btn big" href="{base}/reflect">Begin</a>
			<a class="btn ghost big" href="{base}/example">See an example</a>
		{/if}
	</div>

	<ol class="howto">
		<li><strong>Choose what to look at</strong><span>Career, family, relationships and more</span></li>
		<li><strong>Answer one question at a time</strong><span>About 5 minutes for 12 beliefs</span></li>
		<li><strong>See where they came from</strong><span>Your answers grow into a map</span></li>
	</ol>

	<p class="privacy">Private by design. Your answers are saved only on this device.</p>
</section>
