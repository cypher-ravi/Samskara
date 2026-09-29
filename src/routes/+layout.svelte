<script lang="ts">
	import '@fontsource-variable/manrope';
	import '../app.css';
	import { onMount } from 'svelte';
	import { app } from '$lib/app.svelte';
	import HelpFooter from '$lib/components/HelpFooter.svelte';

	let { children } = $props();

	// Start the local database straight away, but never make a page wait for it to appear.
	onMount(() => {
		app.load();
	});
</script>

<svelte:head>
	<title>Samskara · a self-reflection tool</title>
</svelte:head>

<div class="sky" aria-hidden="true"></div>

<div class="wrap">
	{#if app.status === 'error'}
		<div class="notice error" role="alert">
			<span>
				Samskara couldn't open its local database: {app.error}. Try reloading the page, or use a recent
				version of Chrome, Edge, Firefox or Safari.
			</span>
		</div>
	{/if}
	{#if app.notice}
		<div class="notice" role="status">
			<span>{app.notice}</span>
			<button onclick={() => (app.notice = '')}>Dismiss</button>
		</div>
	{/if}
	{@render children()}
	<HelpFooter />
</div>
