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

	type Tab = 'tree' | 'drop' | 'mine' | 'unsure' | 'more';

	let s = $derived(summarize(rules, sources));
	let tab = $state<Tab>('tree');
	let tabs = $derived(
		[
			{ id: 'tree' as Tab, label: 'Tree', count: null },
			{ id: 'drop' as Tab, label: 'Let go', count: s.drop.length },
			{ id: 'mine' as Tab, label: 'Kept', count: s.mine.length },
			...(s.unsure.length ? [{ id: 'unsure' as Tab, label: 'Deciding', count: s.unsure.length }] : []),
			...(example ? [] : [{ id: 'more' as Tab, label: 'More', count: null }])
		]
	);

	let copyMessage = $state('');
	let copyFallback = $state('');
	let dataMessage = $state('');
	let newBelief = $state('');
	let addMessage = $state('');

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

	async function addBelief(event: SubmitEvent) {
		event.preventDefault();
		const msg = await app.addRule(newBelief);
		if (msg.startsWith('Added')) {
			newBelief = '';
			addMessage = "Added. It's waiting at the end of your next session.";
		} else addMessage = msg;
	}

	function goDeeper() {
		app.setDeckSize('full');
		app.goTo(app.firstUnsorted());
		goto(`${base}/reflect`);
	}

	function otherArea() {
		app.pickingAreas = true;
		goto(`${base}/reflect`);
	}
</script>

<section class="block">
	{#if example}
		<h1>Meera's map</h1>
		<p class="summary">
			Meera, 27, sorted {s.sorted} beliefs. {s.carried.length} still steer her. She'd choose
			<em>{s.mine.length}</em> as her own, and <span class="h">{s.drop.length}</span> were handed to her.
		</p>
	{:else if s.sorted === 0}
		<h1>Your map</h1>
		<p class="summary">Nothing sorted yet.</p>
		<div class="cta">
			<a class="btn" href="{base}/reflect">Begin</a>
			<a class="btn ghost" href="{base}/example">See an example</a>
		</div>
	{:else if s.carried.length === 0}
		<h1>Your map</h1>
		<p class="summary">You sorted {s.sorted} beliefs and set all of them aside as not part of you.</p>
	{:else}
		<h1>Your map</h1>
		<p class="summary">
			{s.carried.length} of the {s.sorted} beliefs you sorted still steer you. You'd choose
			<em>{s.mine.length}</em> as your own, and <span class="h">{s.drop.length}</span>
			{plural(s.drop.length, 'was', 'were')} handed to you.
		</p>
	{/if}
	{#if !example && s.observations.length}
		<div class="obs">
			{#each s.observations as o (o)}<p>{o}</p>{/each}
		</div>
	{/if}
</section>

{#if s.sorted > 0}
	<div class="tabs" role="tablist" aria-label="Map sections">
		{#each tabs as t (t.id)}
			<button
				role="tab"
				id="tab-{t.id}"
				aria-selected={tab === t.id}
				aria-controls="panel"
				onclick={() => (tab = t.id)}
			>
				{t.label}{#if t.count !== null}<span class="count">{t.count}</span>{/if}
			</button>
		{/each}
	</div>

	<div class="tabpanel" id="panel" role="tabpanel" aria-labelledby="tab-{tab}">
		{#if tab === 'tree'}
			{#if s.carried.length}
				<RootsMap {rules} {sources} />
			{:else}
				<p class="empty">Nothing on the tree yet.</p>
			{/if}
			{#if example}
				<div class="obs">
					<p><strong>Parents is her thickest root.</strong> Eight beliefs grew from it, and five now lie on the ground.</p>
					<p><strong>Everything from school was let go.</strong> That tells her which voice to question first.</p>
					<p><strong>Both beliefs from her own experience are still on the tree.</strong> Beliefs she earned herself are the ones she keeps.</p>
				</div>
			{/if}
			{#if s.counts.length}
				<details class="numbers">
					<summary>See the numbers by source</summary>
					<SourceBars counts={s.counts} max={s.maxCount} />
				</details>
			{/if}
		{:else if tab === 'drop'}
			<p class="prompt">
				Beliefs {example ? 'she carries' : 'you carry'} but wouldn't choose. Each has a kinder version and one
				small thing to try this week.{#if !example} Edit both until they sound like you.{/if}
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
									placeholder="Write the belief you'd choose instead"
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
									placeholder="One small action that bends the old belief"
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
		{:else if tab === 'mine'}
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
		{:else if tab === 'unsure'}
			<ul class="list">
				{#each s.unsure as r (r.id)}
					<li class="item">
						<span class="old">{r.text}</span>
						<span class="meta">{meta(r)}</span>
						<p class="prompt">Ask: if no one had taught me this, would I arrive at it on my own? Who benefits when I follow it?</p>
					</li>
				{/each}
			</ul>
		{:else if tab === 'more'}
			<div class="deeper">
				<div>
					<h3>Keep going</h3>
					<p class="prompt">
						{#if app.remaining > 0}
							{app.remaining} more {plural(app.remaining, 'belief', 'beliefs')} in your areas to sort. Your map
							grows as you add them.
						{:else}
							You've sorted everything in your areas. Add another part of life to see more.
						{/if}
					</p>
				</div>
				<div class="row-actions">
					{#if app.remaining > 0}<button class="btn" onclick={goDeeper}>Sort {app.remaining} more</button>{/if}
					<button class="linkbtn quiet" onclick={otherArea}>Look at another area</button>
				</div>
			</div>

			<form class="datacard" onsubmit={addBelief}>
				<label class="qtitle" for="custom-belief">Grew up with a belief that isn't here?</label>
				<div class="addrow">
					<input id="custom-belief" maxlength="160" placeholder="e.g. Never ask for help with money" autocomplete="off" bind:value={newBelief} />
					<button class="btn ghost" type="submit">Add it</button>
				</div>
				<span class="toast" role="status">{addMessage}</span>
			</form>

			<div class="datacard">
				<span class="qtitle">Your data</span>
				<p class="prompt">
					Everything lives in a private database inside this browser. Copy your map as text, or download the
					database as a backup and import it on another device.
				</p>
				<div class="row">
					<button class="btn ghost" onclick={copy}>Copy my map</button>
					<button class="btn ghost" onclick={download}>Download backup</button>
					<label class="btn ghost filebtn" class:disabled={!app.persistent}>
						Import backup
						<input type="file" accept=".sqlite3,.sqlite,.db,application/vnd.sqlite3" onchange={importChosen} disabled={!app.persistent} />
					</label>
				</div>
				<span class="toast" role="status">{copyMessage || dataMessage}</span>
				{#if copyFallback}
					<textarea class="copyfallback" readonly value={copyFallback} aria-label="Your map as text"></textarea>
				{/if}
			</div>
		{/if}
	</div>
{/if}

{#if example}
	<div class="cta">
		<a class="btn big" href="{base}/reflect">Start my own</a>
	</div>
{/if}
