<script lang="ts">
	import { base } from '$app/paths';
	import { app } from '$lib/app.svelte';

	let { view }: { view: 'deck' | 'map' } = $props();
</script>

<header class="top">
	<div class="toprow">
		<a class="brand" href="{base}/" aria-label="Samskara home" style="text-decoration:none">
			<span class="dot" aria-hidden="true"></span>Samskara
		</a>
		{#if view === 'deck' && app.sortedCount >= 3}
			<a class="linkbtn" href="{base}/map">See my map ({app.sortedCount} sorted)</a>
		{:else if view === 'map'}
			<a class="linkbtn" href="{base}/">Back to the deck</a>
		{/if}
	</div>
	{#if view === 'deck'}
		<h1>Which of your rules did you <span class="glow">actually choose?</span></h1>
		<p class="lede">
			Some rules you live by were handed to you long before you could question them. Sort each card:
			how much it steers you, where you picked it up, and whether you'd choose it today.
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
