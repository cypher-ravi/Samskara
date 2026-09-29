<script lang="ts">
	import { app } from '$lib/app.svelte';
	import Header from '$lib/components/Header.svelte';
	import MapView from '$lib/components/MapView.svelte';
</script>

<Header view="map" />
<MapView rules={app.rules} sources={app.sources} />
