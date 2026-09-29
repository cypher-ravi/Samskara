<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { app } from '$lib/app.svelte';

	let { view }: { view: 'home' | 'reflect' | 'map' | 'example' } = $props();

	let confirming = $state(false);
	let hasAnswers = $derived(app.rules.some((r) => r.answer !== null));

	async function startOver() {
		await app.reset();
		confirming = false;
		await goto(`${base}/`);
		window.scrollTo({ top: 0 });
	}
</script>

<header class="topbar">
	<a class="brand" href="{base}/" aria-label="Samskara home">
		<span class="dot" aria-hidden="true"></span>Samskara
	</a>
	<nav class="topactions" aria-label="Main">
		{#if view !== 'map' && app.sortedCount >= 3}
			<a class="linkbtn" href="{base}/map">My map</a>
		{/if}
		{#if view === 'map' || view === 'example'}
			<a class="linkbtn" href="{base}/reflect">{app.sortedCount ? 'Keep reflecting' : 'Begin'}</a>
		{/if}
		{#if view !== 'example' && hasAnswers && !confirming}
			<button class="linkbtn quiet" onclick={() => (confirming = true)}>Start over</button>
		{/if}
	</nav>
</header>
{#if confirming}
	<div class="notice resetbar" role="alertdialog" aria-label="Start over">
		<span>Clear every answer and any beliefs you added, and start again?</span>
		<span class="resetactions">
			<button class="btn ghost" onclick={startOver}>Yes, start over</button>
			<button class="linkbtn" onclick={() => (confirming = false)}>Cancel</button>
		</span>
	</div>
{/if}
