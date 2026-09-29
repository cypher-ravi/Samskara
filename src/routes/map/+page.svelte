<script lang="ts">
	import { app } from '$lib/app.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import MapView from '$lib/components/MapView.svelte';
</script>

<TopBar view="map" />
{#if app.status === 'ready'}
	<MapView rules={app.rules} sources={app.sources} />
{:else if app.status === 'loading'}
	<p class="loading"><span class="dot" aria-hidden="true"></span>Opening your map…</p>
{/if}
