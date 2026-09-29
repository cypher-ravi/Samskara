<script lang="ts">
	import { base } from '$app/paths';
	import { app } from '$lib/app.svelte';
	import { PULL_LABELS, mapAsText, sourceText, summarize } from '$lib/logic';
	import type { Rule } from '$lib/db/types';
	import Header from '$lib/components/Header.svelte';
	import SourceBars from '$lib/components/SourceBars.svelte';

	let s = $derived(summarize(app.rules, app.sources));

	let copyMessage = $state('');
	let copyFallback = $state('');
	let dataMessage = $state('');
	let confirmReset = $state(false);

	const meta = (r: Rule) => `From ${sourceText(r, app.sources)} · ${PULL_LABELS[r.answer!.pull]}`;

	async function copy() {
		const text = mapAsText(app.rules, app.sources);
		try {
			await navigator.clipboard.writeText(text);
			copyMessage = 'Copied.';
			copyFallback = '';
		} catch {
			copyMessage = 'Copying is blocked here. Select the text below and copy it.';
			copyFallback = text;
		}
	}

	async function download() {
		try {
			await app.exportFile();
			dataMessage = 'Downloaded. Keep the file somewhere private.';
		} catch (err) {
			dataMessage = err instanceof Error ? err.message : String(err);
		}
	}

	async function importChosen(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file) dataMessage = await app.importFile(file);
	}

	async function reset() {
		await app.reset();
		confirmReset = false;
		dataMessage = 'Everything was cleared. The deck is fresh.';
	}
</script>

<Header view="map" />

<section class="block">
	<h1>Your map</h1>
	{#if s.sorted === 0}
		<p class="summary">Nothing sorted yet. <a href="{base}/">Start with the first card.</a></p>
	{:else if s.carried.length === 0}
		<p class="summary">You sorted {s.sorted} rules and set all of them aside as not part of you.</p>
	{:else}
		<p class="summary">
			You sorted {s.sorted} rules. {s.carried.length} still steer you. You'd choose
			<em>{s.mine.length}</em> of them as your own, and <span class="h">{s.drop.length}</span>
			{s.drop.length === 1 ? 'was' : 'were'} handed to you{#if s.unsure.length}. {s.unsure.length}
				you're still deciding{/if}.
		</p>
	{/if}
	{#if s.observations.length}
		<div class="obs">
			{#each s.observations as o (o)}<p>{o}</p>{/each}
		</div>
	{/if}
</section>

{#if s.counts.length}
	<section class="block">
		<h2>Where your rules came from</h2>
		<SourceBars counts={s.counts} max={s.maxCount} />
	</section>
{/if}

<section class="block">
	<h2>Handed to you</h2>
	<p class="lede">
		Rules you carry but wouldn't choose. Each has a suggested rewrite and a small experiment. Edit both
		until they sound like you.
	</p>
	{#if s.drop.length}
		<ul class="list">
			{#each s.drop as r (r.id)}
				<li class="item drop">
					<span class="old">{r.text}</span>
					<span class="meta">{meta(r)}</span>
					<div class="field">
						<label for="rw-{r.id}">Your version</label>
						<textarea
							id="rw-{r.id}"
							rows="2"
							placeholder="Write the rule you'd choose instead"
							value={r.answer!.rewrite ?? r.suggestedRewrite}
							oninput={(e) => app.setReflection(r, 'rewrite', e.currentTarget.value)}
						></textarea>
					</div>
					<div class="field">
						<label for="ex-{r.id}">Try this week</label>
						<textarea
							id="ex-{r.id}"
							rows="2"
							placeholder="One small action that bends the old rule"
							value={r.answer!.experiment ?? r.suggestedExperiment}
							oninput={(e) => app.setReflection(r, 'experiment', e.currentTarget.value)}
						></textarea>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">None yet.</p>
	{/if}
</section>

<section class="block">
	<h2>Yours</h2>
	{#if s.mine.length}
		<ul class="list">
			{#each s.mine as r (r.id)}
				<li class="item mine">
					<span class="old">{r.text}</span>
					<span class="meta">{meta(r)}</span>
					<p class="prompt">You chose to keep this one. Does it ever cost you more than it gives?</p>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">None yet.</p>
	{/if}
</section>

{#if s.unsure.length}
	<section class="block">
		<h2>Still deciding</h2>
		<ul class="list">
			{#each s.unsure as r (r.id)}
				<li class="item">
					<span class="old">{r.text}</span>
					<span class="meta">{meta(r)}</span>
					<p class="prompt">
						Ask yourself: if no one had taught me this, would I arrive at it on my own? Who benefits
						when I follow it?
					</p>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if s.notMe}
	<p class="need">{s.notMe} rule{s.notMe > 1 ? 's' : ''} set aside as not part of you.</p>
{/if}

<div class="maptools">
	<button class="btn" onclick={copy}>Copy my map as text</button>
	<a class="btn ghost" href="{base}/" onclick={() => app.goTo(app.firstUnsorted())} style="text-decoration:none">
		Keep sorting
	</a>
	<span class="toast" role="status">{copyMessage}</span>
</div>
{#if copyFallback}
	<textarea class="copyfallback" readonly value={copyFallback} aria-label="Your map as text"></textarea>
{/if}

<section class="block">
	<h2>Your data</h2>
	<div class="datacard">
		<p class="prompt">
			Everything lives in a SQLite database inside this browser. Download it as a backup or to move to
			another device, then import it there.
		</p>
		<div class="row">
			<button class="btn ghost" onclick={download}>Download my data</button>
			<label class="btn ghost filebtn" class:disabled={!app.persistent}>
				Import a backup
				<input type="file" accept=".sqlite3,.sqlite,.db,application/vnd.sqlite3" onchange={importChosen} disabled={!app.persistent} />
			</label>
			{#if confirmReset}
				<span class="confirm">
					This deletes every answer on this device.
					<button class="btn ghost" onclick={reset}>Delete everything</button>
					<button class="linkbtn" onclick={() => (confirmReset = false)}>Keep my answers</button>
				</span>
			{:else}
				<button class="linkbtn" onclick={() => (confirmReset = true)}>Start over</button>
			{/if}
		</div>
		<span class="toast" role="status">{dataMessage}</span>
	</div>
</section>
