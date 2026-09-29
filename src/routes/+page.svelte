<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { app } from '$lib/app.svelte';
	import { PULL_LABELS, isComplete, status } from '$lib/logic';
	import type { Choice, Pull } from '$lib/db/types';
	import { DECK_SIZES } from '$lib/data/seed';
	import Header from '$lib/components/Header.svelte';
	import RuleCard from '$lib/components/RuleCard.svelte';
	import AreaPicker from '$lib/components/AreaPicker.svelte';
	import { AREAS } from '$lib/data/seed';
	import { formatFor } from '$lib/deck';

	const CHOICES: { id: Choice; title: string; hint: string }[] = [
		{ id: 'mine', title: 'Mine', hint: "I'd pick this even if no one had taught me." },
		{ id: 'drop', title: 'Handed to me', hint: "I carry it, but I wouldn't choose it." },
		{ id: 'unsure', title: 'Not sure yet', hint: 'I need to think about this one.' }
	];

	let rule = $derived(app.current);
	let answer = $derived(rule?.answer ?? null);
	let isLast = $derived(app.cursor === app.deck.length - 1);
	let deckDone = $derived(app.deck.filter((r) => isComplete(r.answer)).length);
	let need = $derived.by(() => {
		if (!answer) return 'Pick how much it steers you.';
		if (answer.pull > 0 && !answer.sources.length) return 'Pick at least one place it came from.';
		if (answer.pull > 0 && !answer.choice) return 'Decide whether you choose it today.';
		return '';
	});

	let format = $derived(rule ? formatFor(app.cursor, rule) : 'standard');
	let showPicker = $derived(app.areas.length === 0 || app.pickingAreas);
	let areaNames = $derived(app.areas.map((id) => AREAS.find((a) => a.id === id)?.label ?? id));

	// "Whose voice" cards collect sources before the belief has an answer.
	let voiceSources = $state<string[]>([]);
	let lastRuleId = '';
	$effect(() => {
		if (rule?.id !== lastRuleId) {
			lastRuleId = rule?.id ?? '';
			voiceSources = [];
		}
	});
	const toggleVoice = (id: string) =>
		(voiceSources = voiceSources.includes(id) ? voiceSources.filter((s) => s !== id) : [...voiceSources, id]);

	async function voicePull(p: Pull) {
		const picked = [...voiceSources];
		await app.setPull(rule, p);
		if (p > 0 && picked.length) await app.setSources(rule, picked);
	}

	// In "which sounds more like you" cards, the two options swap sides from card to card.
	let pairFlip = $derived(rule ? rule.id.charCodeAt(rule.id.length - 1) % 2 === 1 : false);

	let newRule = $state('');
	let addMessage = $state('');

	function next() {
		const done = app.finishCurrent();
		if (done) goto(`${base}/map`);
		else window.scrollTo({ top: 0 });
	}

	async function add(event: SubmitEvent) {
		event.preventDefault();
		addMessage = await app.addRule(newRule);
		if (addMessage.startsWith('Added')) newRule = '';
	}
</script>

<Header view="deck" />

{#if showPicker}
	<AreaPicker
		initial={app.areas}
		onchoose={(ids) => app.chooseAreas(ids)}
		oncancel={app.areas.length ? () => (app.pickingAreas = false) : undefined}
	/>
{:else if rule}
	<div class="session">
		<div class="arearow">
			<span class="label">Looking at</span>
			<span class="arealist">{areaNames.join(' · ')}</span>
			<button class="linkbtn quiet" onclick={() => (app.pickingAreas = true)}>Change</button>
		</div>
		<div class="sizes" role="radiogroup" aria-label="Session length">
			{#each DECK_SIZES as d (d.id)}
				<button
					role="radio"
					aria-checked={app.deckSize === d.id}
					class="size"
					onclick={() => app.setDeckSize(d.id)}
				>
					<strong>{d.label}</strong><span>{d.cards ? `${d.cards} cards · ${d.minutes}` : d.minutes}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="progressrow">
		<span class="label">{deckDone} of {app.deck.length} sorted</span>
	</div>
	<div class="ticks" aria-label="Progress: {deckDone} of {app.deck.length} sorted">
		{#each app.deck as r, i (r.id)}
			<button
				class="tick {status(r.answer)}"
				class:current={i === app.cursor}
				title={r.text}
				aria-label="Card {i + 1}: {r.text}"
				onclick={() => app.goTo(i)}
				style="border:0; padding:0"
			></button>
		{/each}
	</div>

	{#if format === 'pair'}
		<article class="card pair">
			<div class="card-top">
				<span class="label">{rule.category}</span>
				<span class="label">{String(app.cursor + 1).padStart(2, '0')} / {app.deck.length}</span>
			</div>
			<p class="pair-q">Which sounds more like the voice in your head?</p>
			<div class="pair-options" class:flip={pairFlip}>
				<button class="pair-opt" onclick={() => app.setPull(rule, 2)}>“{rule.text}”</button>
				<button class="pair-opt" onclick={() => app.setPull(rule, 0)}>“{rule.suggestedRewrite}”</button>
			</div>
			<button class="linkbtn quiet pair-both" onclick={() => app.setPull(rule, 1)}>A bit of both</button>
		</article>
		<p class="need">Go with your first instinct. You can adjust the details next.</p>
	{:else if format === 'voice'}
		<RuleCard {rule} index={app.cursor} total={app.deck.length} sources={app.sources} pending={voiceSources} />
		<div class="q">
			<span class="qtitle">Whose voice says this? <span class="need">Choose all that fit.</span></span>
			<div class="chips">
				{#each app.sources as s (s.id)}
					<button
						class="chip"
						class:self={s.id === 'self'}
						aria-pressed={voiceSources.includes(s.id)}
						onclick={() => toggleVoice(s.id)}>{s.label}</button
					>
				{/each}
			</div>
		</div>
		<div class="q">
			<span class="qtitle">How much does it steer you today?</span>
			<div class="seg">
				{#each PULL_LABELS as label, i (label)}
					<button aria-pressed={false} onclick={() => voicePull(i as Pull)}>{label}</button>
				{/each}
			</div>
		</div>
	{:else}
		<RuleCard {rule} index={app.cursor} total={app.deck.length} sources={app.sources} />

		<div class="q">
			<span class="qtitle">How much does this belief steer you today?</span>
			<div class="seg">
				{#each PULL_LABELS as label, i (label)}
					<button aria-pressed={answer?.pull === i} onclick={() => app.setPull(rule, i as Pull)}>{label}</button>
				{/each}
			</div>
		</div>

		{#if answer && answer.pull > 0}
			<div class="q">
				<span class="qtitle">Where did you pick it up? <span class="need">Choose all that fit.</span></span>
				<div class="chips">
					{#each app.sources as s (s.id)}
						<button
							class="chip"
							class:self={s.id === 'self'}
							aria-pressed={answer.sources.includes(s.id)}
							onclick={() => app.toggleSource(rule, s.id)}>{s.label}</button
						>
					{/each}
				</div>
			</div>

			<div class="q">
				<span class="qtitle">Seeing where it came from, do you choose it today?</span>
				<div class="choices">
					{#each CHOICES as c (c.id)}
						<button
							class="choice c-{c.id}"
							aria-pressed={answer.choice === c.id}
							onclick={() => app.setChoice(rule, c.id)}
						>
							<strong>{c.title}</strong><span>{c.hint}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	<div class="nav">
		<button class="btn ghost" disabled={app.cursor === 0} onclick={() => app.goTo(app.cursor - 1)}>
			Back
		</button>
		<span class="need">{format === 'standard' ? need : ''}</span>
		<button class="btn" disabled={!isComplete(answer)} onclick={next}>
			{isLast ? 'See my map' : 'Continue'}
		</button>
	</div>

	<form class="addrule" onsubmit={add}>
		<label class="qtitle" for="custom-rule">Grew up with a belief that isn't here?</label>
		<div class="addrow">
			<input
				id="custom-rule"
				maxlength="160"
				placeholder="e.g. Never ask for help with money"
				autocomplete="off"
				bind:value={newRule}
			/>
			<button class="btn ghost" type="submit">Add to deck</button>
		</div>
		<span class="toast" role="status">{addMessage}</span>
	</form>
{/if}
