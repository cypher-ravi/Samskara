<script lang="ts">
	import { base } from '$app/paths';
	import { app } from '$lib/app.svelte';

	let { view }: { view: 'deck' | 'map' | 'example' } = $props();
</script>

<header class="top">
	<div class="toprow">
		<a class="brand" href="{base}/" aria-label="Samskara home" style="text-decoration:none">
			<span class="dot" aria-hidden="true"></span>Samskara
		</a>
		{#if view === 'deck' && app.sortedCount >= 3}
			<a class="linkbtn" href="{base}/map">See my map ({app.sortedCount} sorted)</a>
		{:else if view !== 'deck'}
			<a class="linkbtn" href="{base}/">Back to the deck</a>
		{/if}
	</div>
	{#if view === 'deck'}
		<h1>Some beliefs you chose. <span class="glow">Most were handed to you.</span></h1>
		<p class="lede">
			You picked up most of your rules for life long before you could question them. Sort them here to
			find out which are really yours.
		</p>
		<ol class="steps">
			<li><strong>Rate it.</strong> How much does the rule steer you today?</li>
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
