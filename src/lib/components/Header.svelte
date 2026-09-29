<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { app } from '$lib/app.svelte';

	let { view }: { view: 'deck' | 'map' | 'example' } = $props();

	let confirming = $state(false);
	let hasAnswers = $derived(app.rules.some((r) => r.answer !== null));

	async function startOver() {
		await app.reset();
		confirming = false;
		window.scrollTo({ top: 0 });
		if (view !== 'deck') await goto(`${base}/`);
	}
</script>

<header class="top">
	<div class="toprow">
		<a class="brand" href="{base}/" aria-label="Samskara home" style="text-decoration:none">
			<span class="dot" aria-hidden="true"></span>Samskara
		</a>
		<div class="topactions">
			{#if view === 'deck' && app.sortedCount >= 3}
				<a class="linkbtn" href="{base}/map">See my map ({app.sortedCount} sorted)</a>
			{:else if view !== 'deck'}
				<a class="linkbtn" href="{base}/">Back to the deck</a>
			{/if}
			{#if view !== 'example' && hasAnswers && !confirming}
				<button class="linkbtn quiet" onclick={() => (confirming = true)}>Start over</button>
			{/if}
		</div>
	</div>
	{#if confirming}
		<div class="notice resetbar" role="alertdialog" aria-label="Start over">
			<span>Clear every answer and any beliefs you added, and start again from the first card?</span>
			<span class="resetactions">
				<button class="btn ghost" onclick={startOver}>Yes, start over</button>
				<button class="linkbtn" onclick={() => (confirming = false)}>Cancel</button>
			</span>
		</div>
	{/if}
	{#if view === 'deck'}
		<h1 class="hero">
			<span class="line">Some beliefs you chose.</span>
			<span class="line glow">Most were handed to you.</span>
			<svg class="swash" viewBox="0 0 440 30" aria-hidden="true"
				><path d="M4 20 C 70 6, 150 28, 230 16 S 360 4, 436 14" /></svg
			>
		</h1>
		<p class="lede">
			You picked up most of your beliefs long before you could question them. Sort them here to
			find out which are really yours.
		</p>
		<ol class="steps">
			<li><strong>Rate it.</strong> How much does the belief steer you today?</li>
			<li><strong>Trace it.</strong> Where did you pick it up?</li>
			<li><strong>Decide.</strong> Would you choose it now?</li>
		</ol>
		<p class="privacy">
			At the end, your answers grow into a map of roots and leaves.
			<a href="{base}/example">See an example map</a> first.
		</p>
		<p class="privacy">
			{#if app.persistent}
				Your answers are saved in a private database on this device. Nothing is sent anywhere.
			{:else}
				Nothing is sent anywhere, but this browser can't save to disk, so answers last only until you
				close the tab.
			{/if}
		</p>
	{/if}
</header>
