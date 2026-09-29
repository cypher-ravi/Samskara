<script lang="ts">
	import type { Rule, Source } from '$lib/db/types';
	import { PULL_LABELS, isComplete } from '$lib/logic';

	let { rules, sources }: { rules: Rule[]; sources: Source[] } = $props();

	const SHORT: Record<string, string> = {
		parents: 'Parents',
		family: 'Family',
		school: 'School',
		society: 'Society',
		faith: 'Culture',
		peers: 'Friends',
		media: 'Media',
		partner: 'Partner',
		self: 'Me',
		unknown: 'Unplaced'
	};
	const STATUS = { mine: 'You keep this', drop: 'You let this go', unsure: 'Still deciding' } as const;

	const W = 600;
	const CX = 300;
	const TOP = 222; // where the trunk splits into branches
	const GROUND = 300;
	const rad = (d: number) => (d * Math.PI) / 180;

	type Placed = { rule: Rule; x: number; y: number; deg: number; i: number };

	let carried = $derived(rules.filter((r) => isComplete(r.answer) && r.answer!.pull > 0));

	/** Rules you keep or are unsure about grow in the crown, filling rings from the trunk outward. */
	let crown = $derived.by(() => {
		const list = carried
			.filter((r) => r.answer!.choice !== 'drop')
			.sort(
				(a, b) =>
					(a.answer!.choice === 'mine' ? 0 : 1) - (b.answer!.choice === 'mine' ? 0 : 1) ||
					b.answer!.pull - a.answer!.pull
			);
		const out: Placed[] = [];
		let placed = 0;
		for (let k = 0; placed < list.length; k++) {
			const r = 84 + 46 * k;
			const n = Math.min(5 + 3 * k, list.length - placed);
			for (let j = 0; j < n; j++) {
				const deg = 200 + (140 * (j + 0.5)) / n;
				out.push({
					rule: list[placed + j],
					x: CX + r * Math.cos(rad(deg)),
					y: TOP + r * Math.sin(rad(deg)),
					deg,
					i: placed + j
				});
			}
			placed += n;
		}
		return out;
	});

	/** Rules you let go of lie on the ground on either side of the trunk. */
	let fallen = $derived.by(() => {
		const list = carried.filter((r) => r.answer!.choice === 'drop').sort((a, b) => b.answer!.pull - a.answer!.pull);
		const perSide = Math.max(1, Math.ceil(list.length / 2));
		const step = Math.min(38, 230 / perSide);
		return list.map((rule, i) => {
			const k = Math.floor(i / 2);
			const side = i % 2 ? 1 : -1;
			return {
				rule,
				x: CX + side * (40 + k * step + step / 2),
				y: GROUND - 3 + ((i * 5) % 9),
				deg: ((i * 53) % 140) - 70,
				i
			};
		});
	});

	/** Each source a rule came from becomes a root. Thicker roots fed more rules. */
	let roots = $derived.by(() => {
		const used = sources
			.map((s) => {
				const rs = carried.filter((r) => r.answer!.sources.includes(s.id));
				const mine = rs.filter((r) => r.answer!.choice === 'mine').length;
				const drop = rs.filter((r) => r.answer!.choice === 'drop').length;
				return { ...s, short: SHORT[s.id] ?? s.label, rules: rs, mine, drop };
			})
			.filter((s) => s.rules.length > 0);
		// Thickest roots sit in the middle, thinner ones spread outward.
		const m = used.length;
		const mid = (m - 1) / 2;
		const slots = [...Array(m).keys()].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
		return [...used]
			.sort((a, b) => b.rules.length - a.rules.length)
			.map((s, k) => {
			const slot = slots[k];
			const x = m === 1 ? CX : 52 + (496 * slot) / (m - 1);
			const y = 418 + (slot % 2) * 36;
			return {
				...s,
				x,
				y,
				width: Math.min(11, 1.6 + s.rules.length * 1.4),
				tone: s.drop > s.mine ? 'drop' : s.mine > s.drop ? 'mine' : 'mixed',
				d: `M ${CX} ${GROUND + 2} C ${CX} ${GROUND + 62}, ${x} ${y - 84}, ${x} ${y}`
			};
		});
	});

	let minY = $derived(Math.min(TOP - 120, ...crown.map((p) => p.y - 34)));
	let viewBox = $derived(`0 ${minY} ${W} ${510 - minY}`);

	let selected = $state<{ kind: 'rule' | 'source'; id: string } | null>(null);
	let selRule = $derived(selected?.kind === 'rule' ? carried.find((r) => r.id === selected!.id) ?? null : null);
	let selSource = $derived(selected?.kind === 'source' ? roots.find((s) => s.id === selected!.id) ?? null : null);

	function pick(kind: 'rule' | 'source', id: string) {
		selected = selected?.kind === kind && selected.id === id ? null : { kind, id };
	}
	function onKey(e: KeyboardEvent, kind: 'rule' | 'source', id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			pick(kind, id);
		}
	}
	const dimLeaf = (r: Rule) =>
		selSource ? !r.answer!.sources.includes(selSource.id) : selRule ? selRule.id !== r.id : false;
	const dimRoot = (id: string) =>
		selRule ? !selRule.answer!.sources.includes(id) : selSource ? selSource.id !== id : false;
	const leafSize = (r: Rule) => 10 + r.answer!.pull * 3.5;
	const leafPath = (s: number) =>
		`M0 ${-s} C ${s * 0.85} ${-s * 0.45} ${s * 0.85} ${s * 0.45} 0 ${s} C ${-s * 0.85} ${s * 0.45} ${-s * 0.85} ${-s * 0.45} 0 ${-s} Z`;
	const twig = (p: Placed) =>
		`M ${CX} ${TOP} Q ${CX + (p.x - CX) * 0.3} ${TOP + (p.y - TOP) * 0.85} ${p.x} ${p.y}`;
	const labelFor = (id: string) => sources.find((s) => s.id === id)?.label ?? id;
</script>

{#if carried.length}
	<div class="roots-wrap">
		<svg {viewBox} class="roots" role="group" aria-label="Your roots map: {carried.length} rules and the {roots.length} places they came from">
			<defs>
				<filter id="leafglow" x="-80%" y="-80%" width="260%" height="260%">
					<feGaussianBlur stdDeviation="3.2" result="b" />
					<feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
				</filter>
				<linearGradient id="horizon" x1="0" x2="1">
					<stop offset="0" class="stop-fade" />
					<stop offset="0.5" class="stop-sun" />
					<stop offset="1" class="stop-fade" />
				</linearGradient>
				<radialGradient id="baseglow">
					<stop offset="0" class="stop-sun" />
					<stop offset="1" class="stop-fade" />
				</radialGradient>
			</defs>

			<!-- ground -->
			<ellipse cx={CX} cy={GROUND} rx="190" ry="26" fill="url(#baseglow)" opacity="0.45" />
			<rect x="20" y={GROUND} width={W - 40} height="1.5" fill="url(#horizon)" />
			<text x="24" y={minY + 24} class="zone">What you carry</text>
			<text x="24" y={GROUND + 22} class="zone">Where it came from</text>

			<!-- roots -->
			{#each roots as s (s.id)}
				<g
					class="root tone-{s.tone}"
					class:dim={dimRoot(s.id)}
					class:on={selSource?.id === s.id}
					role="button"
					tabindex="0"
					aria-label="{s.label}: {s.rules.length} rule{s.rules.length === 1 ? '' : 's'}"
					aria-pressed={selSource?.id === s.id}
					onclick={() => pick('source', s.id)}
					onkeydown={(e) => onKey(e, 'source', s.id)}
				>
					<path d={s.d} class="root-line" style="stroke-width:{s.width}" />
					<path d={s.d} class="hit" />
					<circle cx={s.x} cy={s.y} r="3.5" class="root-tip" />
					<text x={s.x} y={s.y + 22} class="root-label">{s.short}</text>
					<text x={s.x} y={s.y + 39} class="root-count">{s.rules.length}</text>
				</g>
			{/each}

			<!-- trunk -->
			<path
				class="trunk"
				d="M {CX - 13} {GROUND + 3} C {CX - 6} {GROUND - 30}, {CX - 6} {TOP + 22}, {CX - 4} {TOP} L {CX + 4} {TOP} C {CX + 6} {TOP + 22}, {CX + 6} {GROUND - 30}, {CX + 13} {GROUND + 3} Z"
			/>

			<!-- twigs, then crown leaves -->
			{#each crown as p (p.rule.id)}
				<path d={twig(p)} class="twig" class:dim={dimLeaf(p.rule)} />
			{/each}
			{#each crown as p (p.rule.id)}
				<g transform="translate({p.x} {p.y}) rotate({p.deg + 90})" class="fade" class:dim={dimLeaf(p.rule)}>
					<g
						class="leaf {p.rule.answer!.choice}"
						class:on={selRule?.id === p.rule.id}
						style="--i:{p.i}"
						role="button"
						tabindex="0"
						aria-label="{p.rule.text} {STATUS[p.rule.answer!.choice!]}"
						aria-pressed={selRule?.id === p.rule.id}
						onclick={() => pick('rule', p.rule.id)}
						onkeydown={(e) => onKey(e, 'rule', p.rule.id)}
					>
						<circle r="17" class="hit" />
						{#if p.rule.answer!.choice === 'mine'}
							<path d={leafPath(leafSize(p.rule))} filter="url(#leafglow)" />
							<path d="M0 {-leafSize(p.rule) * 0.8} L0 {leafSize(p.rule) * 0.8}" class="vein" />
						{:else}
							<circle r={5 + p.rule.answer!.pull * 2} />
						{/if}
					</g>
				</g>
			{/each}

			<!-- fallen leaves -->
			{#each fallen as f (f.rule.id)}
				<g transform="translate({f.x} {f.y}) rotate({f.deg})" class="fade" class:dim={dimLeaf(f.rule)}>
					<g
						class="leaf drop"
						class:on={selRule?.id === f.rule.id}
						style="--i:{f.i}"
						role="button"
						tabindex="0"
						aria-label="{f.rule.text} {STATUS.drop}"
						aria-pressed={selRule?.id === f.rule.id}
						onclick={() => pick('rule', f.rule.id)}
						onkeydown={(e) => onKey(e, 'rule', f.rule.id)}
					>
						<circle r="15" class="hit" />
						<path d={leafPath(leafSize(f.rule) * 0.85)} />
						<path d="M0 {-leafSize(f.rule) * 0.65} L0 {leafSize(f.rule) * 0.65}" class="vein" />
					</g>
				</g>
			{/each}
		</svg>
	</div>

	<div class="roots-legend">
		<span><i class="lg mine"></i>Glowing leaf: a rule you keep</span>
		<span><i class="lg unsure"></i>Bud: still deciding</span>
		<span><i class="lg drop"></i>Fallen leaf: a rule you let go</span>
		<span><i class="lg root"></i>Thicker root: more rules came from there</span>
	</div>

	<div class="roots-panel" aria-live="polite">
		{#if selRule}
			<span class="label">{STATUS[selRule.answer!.choice!]} · {PULL_LABELS[selRule.answer!.pull]}</span>
			<p class="panel-rule">“{selRule.text}”</p>
			<p class="prompt">From {selRule.answer!.sources.map(labelFor).join(', ')}</p>
			{#if selRule.answer!.choice === 'drop'}
				<p class="panel-new"><span class="label">Your version</span>{selRule.answer!.rewrite ?? selRule.suggestedRewrite}</p>
			{/if}
		{:else if selSource}
			<span class="label">From {selSource.label} · {selSource.rules.length} rule{selSource.rules.length === 1 ? '' : 's'}</span>
			<ul class="panel-list">
				{#each selSource.rules as r (r.id)}
					<li class="st-{r.answer!.choice}"><span>{r.text}</span><em>{STATUS[r.answer!.choice!]}</em></li>
				{/each}
			</ul>
		{:else}
			<p class="prompt">Tap a leaf to see its rule, or tap a root to see everything that grew from it.</p>
		{/if}
	</div>
{/if}

<style>
	.roots-wrap {
		border: 1px solid var(--line);
		border-radius: 20px;
		background: linear-gradient(180deg, var(--glass-2), rgba(255, 170, 90, 0.05));
		padding: 8px 4px 0;
		overflow: hidden;
	}
	.roots {
		display: block;
		width: 100%;
		height: auto;
		max-width: 100%;
	}
	.stop-fade { stop-color: var(--sun); stop-opacity: 0; }
	.stop-sun { stop-color: var(--sun); stop-opacity: 0.8; }
	.zone {
		font-family: var(--mono);
		font-size: 13px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		fill: var(--faint);
	}
	.trunk { fill: #6b3a36; stroke: rgba(255, 190, 140, 0.25); stroke-width: 1; }
	.twig {
		fill: none;
		stroke: rgba(230, 170, 140, 0.35);
		stroke-width: 1.4;
		transition: opacity 0.25s;
	}
	.hit { fill: transparent; stroke: transparent; stroke-width: 22; }
	.root { cursor: pointer; transition: opacity 0.25s; }
	.root-line { fill: none; stroke-linecap: round; opacity: 0.8; transition: stroke-width 0.2s; }
	.tone-mine .root-line, .tone-mine .root-tip { stroke: var(--saffron); fill: var(--saffron); }
	.tone-drop .root-line, .tone-drop .root-tip { stroke: var(--lotus); fill: var(--lotus); }
	.tone-mixed .root-line, .tone-mixed .root-tip { stroke: #b98e8c; fill: #b98e8c; }
	.root .root-line { fill: none; }
	.root-label { font-family: var(--body); font-size: 15px; font-weight: 600; fill: var(--ink); text-anchor: middle; }
	.root-count { font-family: var(--mono); font-size: 12px; fill: var(--faint); text-anchor: middle; }
	.root.on .root-line { opacity: 1; filter: drop-shadow(0 0 6px currentColor); }
	.leaf { cursor: pointer; transition: opacity 0.25s; transform-box: fill-box; transform-origin: center; animation: grow 0.6s ease-out both; animation-delay: calc(var(--i) * 45ms + 150ms); }
	.leaf.mine path:not(.vein) { fill: var(--saffron); }
	.leaf.unsure circle:not(.hit) { fill: var(--ash); stroke: rgba(255, 235, 220, 0.35); stroke-width: 1; }
	.leaf.drop { animation-name: fall; animation-duration: 0.9s; }
	.leaf.drop path:not(.vein) { fill: var(--lotus); opacity: 0.78; }
	.vein { stroke: rgba(42, 18, 36, 0.45); stroke-width: 1; fill: none; }
	.leaf.on path:not(.vein), .leaf.on circle:not(.hit) { stroke: var(--ink); stroke-width: 1.6; }
	.fade { transition: opacity 0.25s; }
	.dim { opacity: 0.18; }
	.root:focus-visible, .leaf:focus-visible { outline: none; }
	.root:focus-visible .root-label, .leaf:focus-visible { filter: drop-shadow(0 0 4px var(--saffron)); }
	@keyframes grow { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
	@keyframes fall { from { transform: translateY(-120px) rotate(-60deg); opacity: 0; } to { transform: none; opacity: 1; } }
	@media (prefers-reduced-motion: reduce) { .leaf { animation: none; } }

	.roots-legend { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 13px; color: var(--muted); }
	.lg { display: inline-block; width: 12px; height: 12px; margin-right: 7px; vertical-align: -1px; border-radius: 50% 0; }
	.lg.mine { background: var(--saffron); box-shadow: 0 0 8px rgba(246, 166, 64, 0.7); }
	.lg.drop { background: var(--lotus); transform: rotate(40deg); }
	.lg.unsure { background: var(--ash); border-radius: 50%; }
	.lg.root { height: 4px; width: 16px; border-radius: 3px; background: #b98e8c; vertical-align: 3px; }

	.roots-panel {
		display: flex; flex-direction: column; gap: 8px; padding: 16px 18px; min-height: 64px;
		border: 1px solid var(--line); border-radius: 16px; background: var(--glass-2);
	}
	.panel-rule { font-family: var(--display); font-size: 21px; line-height: 1.3; }
	.panel-new { display: flex; flex-direction: column; gap: 2px; color: var(--saffron); }
	.panel-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
	.panel-list li { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; font-size: 15px; }
	.panel-list li span { min-width: 0; }
	.panel-list em { font-style: normal; font-size: 12px; white-space: nowrap; color: var(--faint); }
	.panel-list .st-mine em { color: var(--saffron); }
	.panel-list .st-drop em { color: var(--lotus); }
</style>
