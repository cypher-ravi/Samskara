<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { app } from '$lib/app.svelte';
	import { PULL_LABELS, mapAsText, sourceText, summarize } from '$lib/logic';
	import type { Rule, Source } from '$lib/db/types';
	import RootsMap from './RootsMap.svelte';
	import SourceBars from './SourceBars.svelte';

	let { rules, sources, example = false }: { rules: Rule[]; sources: Source[]; example?: boolean } =
		$props();

	let s = $derived(summarize(rules, sources));

	let copyMessage = $state('');
	let copyFallback = $state('');
	let dataMessage = $state('');
	let confirmReset = $state(false);

	const meta = (r: Rule) => `From ${sourceText(r, sources)} · ${PULL_LABELS[r.answer!.pull]}`;
	const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

	async function copy() {
		const text = mapAsText(rules, sources);
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

	function goDeeper() {
		app.setDeckSize('full');
		app.goTo(app.firstUnsorted());
		goto(`${base}/`);
		window.scrollTo({ top: 0 });
	}

	async function reset() {
		await app.reset();
		confirmReset = false;
		dataMessage = 'Everything was cleared. The deck is fresh.';
	}
</script>

<section class="block">
	{#if example}
		<h1>Meera's map</h1>
		<p class="summary">
			Meera, 27, sorted {s.sorted} rules. {s.carried.length} still steer her. She'd choose
			<em>{s.mine.length}</em> as her own, and <span class="h">{s.drop.length}</span> were handed to her.
			She's still deciding about {s.unsure.length}.
		</p>
	{:else if s.sorted === 0}
		<h1>Your map</h1>
		<p class="summary">
			Nothing sorted yet. <a href="{base}/">Start with the first card</a>, or
			<a href="{base}/example">see an example map</a>.
		</p>
	{:else if s.carried.length === 0}
		<h1>Your map</h1>
		<p class="summary">You sorted {s.sorted} rules and set all of them aside as not part of you.</p>
	{:else}
		<h1>Your map</h1>
		<p class="summary">
			You sorted {s.sorted} rules. {s.carried.length} still steer you. You'd choose
			<em>{s.mine.length}</em> of them as your own, and <span class="h">{s.drop.length}</span>
			{plural(s.drop.length, 'was', 'were')} handed to you{#if s.unsure.length}. You're still deciding
				about {s.unsure.length}{/if}.
		</p>
	{/if}
	{#if !example && s.observations.length}
		<div class="obs">
			{#each s.observations as o (o)}<p>{o}</p>{/each}
		</div>
	{/if}
</section>

{#if s.carried.length}
	<section class="block">
		<h2>{example ? 'Her roots' : 'Your roots'}</h2>
		<RootsMap {rules} {sources} />
		{#if example}
			<div class="obs">
				<p><strong>Parents is her thickest root.</strong> Eight rules grew from it, and five of them now lie on the ground.</p>
				<p><strong>Everything from school was let go.</strong> That tells her which voice to question first.</p>
				<p><strong>Both rules from her own experience still glow on the tree.</strong> Beliefs she earned herself are the ones she keeps.</p>
				<p><strong>Her three buds</strong> (anger, family duty and a stable job) are the next things to sit with.</p>
			</div>
		{/if}
		<details class="numbers">
			<summary>See the numbers by source</summary>
			<SourceBars counts={s.counts} max={s.maxCount} />
		</details>
	</section>
{/if}

<section class="block">
	<h2>{example ? 'Handed to her' : 'Handed to you'}</h2>
	<p class="lede">
		Rules {example ? 'she carries' : 'you carry'} but wouldn't choose. Each has a suggested rewrite and a
		small experiment.{#if !example} Edit both until they sound like you.{/if}
	</p>
	{#if s.drop.length}
		<ul class="list">
			{#each s.drop as r (r.id)}
				<li class="item drop">
					<span class="old">{r.text}</span>
					<span class="meta">{meta(r)}</span>
					<div class="field">
						<label for="rw-{r.id}">{example ? 'Her version' : 'Your version'}</label>
						<textarea
							id="rw-{r.id}"
							rows="2"
							readonly={example}
							placeholder="Write the rule you'd choose instead"
							value={r.answer!.rewrite ?? r.suggestedRewrite}
							oninput={(e) => !example && app.setReflection(r, 'rewrite', e.currentTarget.value)}
						></textarea>
					</div>
					<div class="field">
						<label for="ex-{r.id}">Try this week</label>
						<textarea
							id="ex-{r.id}"
							rows="2"
							readonly={example}
							placeholder="One small action that bends the old rule"
							value={r.answer!.experiment ?? r.suggestedExperiment}
							oninput={(e) => !example && app.setReflection(r, 'experiment', e.currentTarget.value)}
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
	<h2>{example ? 'Hers' : 'Yours'}</h2>
	{#if s.mine.length}
		<ul class="list">
			{#each s.mine as r (r.id)}
				<li class="item mine">
					<span class="old">{r.text}</span>
					<span class="meta">{meta(r)}</span>
					<p class="prompt">Kept by choice. Does it ever cost more than it gives?</p>
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
						Ask: if no one had taught me this, would I arrive at it on my own? Who benefits when I follow it?
					</p>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if s.notMe}
	<p class="need">
		{s.notMe} rule{s.notMe > 1 ? 's' : ''} set aside as not part of {example ? 'her' : 'you'}.
	</p>
{/if}

{#if example}
	<div class="maptools">
		<a class="btn" href="{base}/" style="text-decoration:none">Start sorting my own</a>
	</div>
{:else}
	{#if app.deckSize !== 'full' && app.remaining > 0}
		<div class="deeper">
			<div>
				<h3>Ready to go deeper?</h3>
				<p class="prompt">
					There {app.remaining === 1 ? 'is 1 more rule' : `are ${app.remaining} more rules`} you haven't
					sorted yet. Your map will grow as you add them.
				</p>
			</div>
			<button class="btn" onclick={goDeeper}>Sort {app.remaining} more</button>
		</div>
	{/if}
	<div class="maptools">
		<button class="btn ghost" onclick={copy}>Copy my map as text</button>
		<a
			class="btn ghost"
			href="{base}/"
			onclick={() => app.goTo(app.firstUnsorted())}
			style="text-decoration:none">Keep sorting</a
		>
		<span class="toast" role="status">{copyMessage}</span>
	</div>
	{#if copyFallback}
		<textarea class="copyfallback" readonly value={copyFallback} aria-label="Your map as text"></textarea>
	{/if}

	<section class="block">
		<h2>Your data</h2>
		<div class="datacard">
			<p class="prompt">
				Everything lives in a SQLite database inside this browser. Download it as a backup or to move it to
				another device, then import it there.
			</p>
			<div class="row">
				<button class="btn ghost" onclick={download}>Download my data</button>
				<label class="btn ghost filebtn" class:disabled={!app.persistent}>
					Import a backup
					<input
						type="file"
						accept=".sqlite3,.sqlite,.db,application/vnd.sqlite3"
						onchange={importChosen}
						disabled={!app.persistent}
					/>
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
{/if}
