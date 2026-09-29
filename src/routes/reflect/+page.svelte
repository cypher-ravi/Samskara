<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { fade } from 'svelte/transition';
	import { app } from '$lib/app.svelte';
	import { PULL_LABELS, isComplete } from '$lib/logic';
	import { formatFor } from '$lib/deck';
	import { DECK_SIZES } from '$lib/data/seed';
	import type { Choice, Pull } from '$lib/db/types';
	import TopBar from '$lib/components/TopBar.svelte';
	import AreaPicker from '$lib/components/AreaPicker.svelte';

	type Step = 'pair' | 'voiceSource' | 'voicePull' | 'pull' | 'source' | 'choice' | 'review';

	const CHOICES: { id: Choice; title: string; hint: string }[] = [
		{ id: 'mine', title: 'Mine', hint: "I'd pick this even if no one had taught me." },
		{ id: 'drop', title: 'Handed to me', hint: "I carry it, but I wouldn't choose it." },
		{ id: 'unsure', title: 'Not sure yet', hint: 'I need to think about this one.' }
	];
	const CHOICE_LABEL = { mine: 'Mine', drop: 'Handed to me', unsure: 'Not sure yet' } as const;
	const reduced =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// ---- which stage of the session we're on --------------------------------------------------
	let lengthPicked = $state(false);
	let checkedResume = false;
	$effect(() => {
		// People coming back to a session in progress skip straight to their cards.
		if (app.status === 'ready' && !checkedResume) {
			checkedResume = true;
			lengthPicked = app.deck.some((r) => isComplete(r.answer));
		}
	});
	let stage = $derived(
		app.status !== 'ready'
			? 'loading'
			: app.areas.length === 0 || app.pickingAreas
				? 'areas'
				: !lengthPicked
					? 'length'
					: 'cards'
	);

	// ---- the current card and its question -----------------------------------------------------
	let rule = $derived(app.current);
	let answer = $derived(rule?.answer ?? null);
	let format = $derived(rule ? formatFor(app.cursor, rule) : 'standard');
	let step = $state<Step>('pull');
	let voiceSources = $state<string[]>([]);
	let stepFor = '';

	function firstStep(): Step {
		const a = rule?.answer;
		if (a) {
			if (a.pull > 0 && !a.sources.length) return 'source';
			if (a.pull > 0 && !a.choice) return 'choice';
			return 'review';
		}
		if (format === 'pair') return 'pair';
		if (format === 'voice') return 'voiceSource';
		return 'pull';
	}

	$effect(() => {
		const id = rule?.id ?? '';
		if (id !== stepFor) {
			stepFor = id;
			step = firstStep();
			voiceSources = [];
		}
	});

	let deckDone = $derived(app.deck.filter((r) => isComplete(r.answer)).length);
	let pct = $derived(app.deck.length ? Math.round((deckDone / app.deck.length) * 100) : 0);
	let stepIndex = $derived(
		step === 'pull' || step === 'pair' || step === 'voiceSource' ? 0 : step === 'source' || step === 'voicePull' ? 1 : 2
	);

	const sourceLabel = (id: string) => app.sources.find((s) => s.id === id)?.label ?? id;
	let stamped = $derived(
		answer && answer.pull > 0 ? answer.sources : step === 'voiceSource' || step === 'voicePull' ? voiceSources : []
	);

	// ---- actions ------------------------------------------------------------------------------
	function nextCard(delay = 220) {
		setTimeout(
			() => {
				const last = app.finishCurrent();
				if (last) goto(`${base}/map`);
				window.scrollTo({ top: 0 });
			},
			reduced ? 0 : delay
		);
	}

	async function pickPull(p: Pull) {
		if (!rule) return;
		await app.setPull(rule, p);
		if (p === 0) nextCard();
		else step = rule.answer!.sources.length ? 'choice' : 'source';
	}

	function toggleSource(id: string) {
		if (rule) app.toggleSource(rule, id);
	}

	async function pickChoice(c: Choice) {
		if (!rule) return;
		await app.setChoice(rule, c);
		nextCard();
	}

	const toggleVoice = (id: string) =>
		(voiceSources = voiceSources.includes(id) ? voiceSources.filter((s) => s !== id) : [...voiceSources, id]);

	async function voicePull(p: Pull) {
		if (!rule) return;
		const picked = [...voiceSources];
		await app.setPull(rule, p);
		if (p === 0) return nextCard();
		if (picked.length) await app.setSources(rule, picked);
		step = 'choice';
	}

	function back() {
		if (step === 'source') step = 'pull';
		else if (step === 'choice') step = 'source';
		else if (step === 'voicePull') step = 'voiceSource';
		else if (app.cursor > 0) app.goTo(app.cursor - 1);
		else lengthPicked = false;
	}

	function chooseLength(size: (typeof DECK_SIZES)[number]['id']) {
		app.setDeckSize(size);
		app.goTo(app.firstUnsorted());
		lengthPicked = true;
	}

	let pairFlip = $derived(rule ? rule.id.charCodeAt(rule.id.length - 1) % 2 === 1 : false);
</script>

<TopBar view="reflect" />

{#if stage === 'loading'}
	<p class="loading"><span class="dot" aria-hidden="true"></span>Getting your space ready…</p>
{:else if stage === 'areas'}
	<ol class="stages" aria-label="Session steps">
		<li class="on">1 · Areas</li>
		<li>2 · Length</li>
		<li>3 · Reflect</li>
	</ol>
	<AreaPicker
		initial={app.areas}
		onchoose={(ids) => {
			app.chooseAreas(ids);
			lengthPicked = false;
		}}
		oncancel={app.areas.length ? () => (app.pickingAreas = false) : undefined}
	/>
{:else if stage === 'length'}
	<ol class="stages" aria-label="Session steps">
		<li class="done">1 · Areas</li>
		<li class="on">2 · Length</li>
		<li>3 · Reflect</li>
	</ol>
	<section class="stage" in:fade={{ duration: reduced ? 0 : 180 }}>
		<h2>How much time do you have?</h2>
		<p class="prompt">You can always sort more later.</p>
		<div class="options">
			{#each DECK_SIZES as d (d.id)}
				<button id="len-{d.id}" class="option" onclick={() => chooseLength(d.id)}>
					<strong>{d.label}</strong>
					<span>{d.cards ? `${d.cards} beliefs · ${d.minutes}` : d.minutes}</span>
				</button>
			{/each}
		</div>
		<button class="linkbtn quiet" onclick={() => (app.pickingAreas = true)}>← Change areas</button>
	</section>
{:else if rule}
	<div class="stepper">
		<div class="progress">
			<div class="progress-top">
				<span class="label">Belief {app.cursor + 1} of {app.deck.length}</span>
				<span class="label">{rule.category}</span>
			</div>
			<div class="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="{deckDone} of {app.deck.length} sorted">
				<span style="width:{pct}%"></span>
			</div>
		</div>

		{#key rule.id + step}
			<div class="question" in:fade={{ duration: reduced ? 0 : 180 }}>
				{#if step === 'pair'}
					<h2 class="q-title">Which sounds more like the voice in your head?</h2>
					<div class="pair-options" class:flip={pairFlip}>
						<button class="pair-opt" onclick={() => pickPull(2)}>“{rule.text}”</button>
						<button class="pair-opt" onclick={() => pickPull(0)}>“{rule.suggestedRewrite}”</button>
					</div>
					<button class="linkbtn quiet" onclick={() => pickPull(1)}>A bit of both</button>
				{:else}
					<article class="belief">
						<p class="belief-text">“{rule.text}”</p>
						{#if stamped.length}
							<div class="stamps">
								{#each stamped as id (id)}<span class="stamp" class:self={id === 'self'}>{sourceLabel(id)}</span>{/each}
							</div>
						{/if}
					</article>

					{#if step === 'pull' || step === 'voicePull'}
						<h2 class="q-title">How much does this belief steer you today?</h2>
						<div class="options">
							{#each PULL_LABELS as label, i (label)}
								<button
									class="option row"
									aria-pressed={answer?.pull === i}
									onclick={() => (step === 'voicePull' ? voicePull(i as Pull) : pickPull(i as Pull))}
								>
									<strong>{label}</strong>
								</button>
							{/each}
						</div>
					{:else if step === 'source' || step === 'voiceSource'}
						<h2 class="q-title">{step === 'voiceSource' ? 'Whose voice says this?' : 'Where did you pick it up?'}</h2>
						<p class="prompt">Choose all that fit.</p>
						<div class="chips">
							{#each app.sources as s (s.id)}
								<button
									class="chip"
									class:self={s.id === 'self'}
									aria-pressed={step === 'voiceSource' ? voiceSources.includes(s.id) : !!answer?.sources.includes(s.id)}
									onclick={() => (step === 'voiceSource' ? toggleVoice(s.id) : toggleSource(s.id))}
									>{s.label}</button
								>
							{/each}
						</div>
						<button
							class="btn"
							disabled={step === 'voiceSource' ? voiceSources.length === 0 : !answer?.sources.length}
							onclick={() => (step = step === 'voiceSource' ? 'voicePull' : 'choice')}>Continue</button
						>
					{:else if step === 'choice'}
						<h2 class="q-title">Seeing where it came from, do you choose it today?</h2>
						<div class="options">
							{#each CHOICES as c (c.id)}
								<button class="option c-{c.id}" aria-pressed={answer?.choice === c.id} onclick={() => pickChoice(c.id)}>
									<strong>{c.title}</strong><span>{c.hint}</span>
								</button>
							{/each}
						</div>
					{:else if step === 'review' && answer}
						<h2 class="q-title">Your answer</h2>
						<dl class="review">
							<div><dt>Steers you</dt><dd>{PULL_LABELS[answer.pull]}</dd><button class="linkbtn quiet" onclick={() => (step = 'pull')}>Change</button></div>
							{#if answer.pull > 0}
								<div><dt>Came from</dt><dd>{answer.sources.map(sourceLabel).join(', ')}</dd><button class="linkbtn quiet" onclick={() => (step = 'source')}>Change</button></div>
								<div><dt>Today</dt><dd>{answer.choice ? CHOICE_LABEL[answer.choice] : '—'}</dd><button class="linkbtn quiet" onclick={() => (step = 'choice')}>Change</button></div>
							{/if}
						</dl>
						<button class="btn" onclick={() => nextCard(0)}>
							{app.cursor === app.deck.length - 1 ? 'See my map' : 'Continue'}
						</button>
					{/if}
				{/if}
			</div>
		{/key}

		<div class="stepnav">
			<button class="linkbtn quiet" onclick={back}>← Back</button>
			<span class="dots" aria-hidden="true">
				{#each [0, 1, 2] as i (i)}<i class:on={i <= stepIndex}></i>{/each}
			</span>
			<a class="linkbtn quiet" href="{base}/map">Pause</a>
		</div>
	</div>
{/if}
