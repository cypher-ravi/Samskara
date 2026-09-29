<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { app } from '$lib/app.svelte';
	import { PULL_LABELS, isComplete, status } from '$lib/logic';
	import type { Choice, Pull } from '$lib/db/types';
	import Header from '$lib/components/Header.svelte';
	import RuleCard from '$lib/components/RuleCard.svelte';

	const CHOICES: { id: Choice; title: string; hint: string }[] = [
		{ id: 'mine', title: 'Mine', hint: "I'd pick this even if no one had taught me." },
		{ id: 'drop', title: 'Handed to me', hint: "I carry it, but I wouldn't choose it." },
		{ id: 'unsure', title: 'Not sure yet', hint: 'I need to think about this one.' }
	];

	let rule = $derived(app.current);
	let answer = $derived(rule?.answer ?? null);
	let isLast = $derived(app.cursor === app.rules.length - 1);
	let need = $derived.by(() => {
		if (!answer) return 'Pick how much it steers you.';
		if (answer.pull > 0 && !answer.sources.length) return 'Pick at least one place it came from.';
		if (answer.pull > 0 && !answer.choice) return 'Decide whether you choose it today.';
		return '';
	});

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

{#if rule}
	<div class="ticks" aria-label="Progress: {app.sortedCount} of {app.rules.length} sorted">
		{#each app.rules as r, i (r.id)}
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

	<RuleCard {rule} index={app.cursor} total={app.rules.length} sources={app.sources} />

	<div class="q">
		<span class="qtitle">How much does this rule steer you today?</span>
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

	<div class="nav">
		<button class="btn ghost" disabled={app.cursor === 0} onclick={() => app.goTo(app.cursor - 1)}>
			Previous
		</button>
		<span class="need">{need}</span>
		<button class="btn" disabled={!isComplete(answer)} onclick={next}>
			{isLast ? 'See my map' : 'Next card'}
		</button>
	</div>

	<form class="addrule" onsubmit={add}>
		<label class="qtitle" for="custom-rule">Grew up with a rule that isn't here?</label>
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
