<script lang="ts">
	import { exampleRules } from '$lib/data/example';
	import { SEED_SOURCES } from '$lib/data/seed';
	import Header from '$lib/components/Header.svelte';
	import MapView from '$lib/components/MapView.svelte';

	const rules = exampleRules();
</script>

<Header view="example" />
<p class="notice" role="note">
	<span>
		This is an example. Meera is fictional, and none of this is your data. Tap the leaves and roots to
		see how the map works.
	</span>
</p>
<MapView {rules} sources={SEED_SOURCES} example />
