import { SEED_BY_ID, type Theme } from './data/seed';
import { isComplete } from './logic';
import type { Rule } from './db/types';

/**
 * How a card asks its questions.
 * - standard: how much it steers you, where it came from, do you choose it
 * - pair: "which sounds more like your inner voice?" between the belief and a kinder version
 * - voice: asks where the belief came from before how strongly it's held
 * Once a card has an answer it always shows as standard, so it can be reviewed and edited.
 */
export type CardFormat = 'standard' | 'pair' | 'voice';

export function formatFor(index: number, rule: Rule): CardFormat {
	if (rule.isCustom || rule.answer || !rule.suggestedRewrite) return 'standard';
	if (index % 5 === 2) return 'pair';
	if (index % 5 === 4) return 'voice';
	return 'standard';
}

const areaOf = (id: string | undefined) => (id ? SEED_BY_ID.get(id)?.area : undefined);

function shuffle<T>(list: T[], rand: () => number): T[] {
	const a = [...list];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * The order cards are dealt in for the chosen areas. Each area is shuffled, then areas take turns,
 * so the deck never feels like a block of questions on one topic. Beliefs already sorted go last.
 */
export function buildOrder(areaIds: string[], rules: Rule[], rand: () => number = Math.random): string[] {
	const inAreas = rules.filter((r) => !r.isCustom && areaIds.includes(areaOf(r.id) ?? ''));
	const groups = shuffle(areaIds, rand).map((area) =>
		shuffle(
			inAreas.filter((r) => areaOf(r.id) === area && !isComplete(r.answer)).map((r) => r.id),
			rand
		)
	);
	const out: string[] = [];
	for (let i = 0; groups.some((g) => i < g.length); i++) {
		for (const g of groups) if (i < g.length) out.push(g[i]);
	}
	const done = inAreas.filter((r) => isComplete(r.answer)).map((r) => r.id);
	return [...out, ...done];
}

/** Keeps a saved order valid: drops beliefs that no longer exist and adds new ones in the chosen areas. */
export function repairOrder(order: string[], areaIds: string[], rules: Rule[]): string[] {
	const known = new Set(rules.filter((r) => !r.isCustom).map((r) => r.id));
	const kept = order.filter((id) => known.has(id) && areaIds.includes(areaOf(id) ?? ''));
	const seen = new Set(kept);
	const added = rules
		.filter((r) => !r.isCustom && !seen.has(r.id) && areaIds.includes(areaOf(r.id) ?? ''))
		.map((r) => r.id);
	return [...kept, ...added];
}

/** How strongly each deeper theme is showing up, from beliefs held often or strongly. */
export function themeWeights(rules: Rule[]): Map<Theme, number> {
	const weights = new Map<Theme, number>();
	for (const r of rules) {
		if (!isComplete(r.answer) || r.answer!.pull < 2) continue;
		for (const t of SEED_BY_ID.get(r.id)?.themes ?? []) weights.set(t, (weights.get(t) ?? 0) + r.answer!.pull);
	}
	return weights;
}

/**
 * After a card is finished, the unsorted cards still to come are re-ranked so beliefs that share
 * a theme with what the person holds strongly come sooner. It only starts once a few strong
 * answers exist, and it avoids two cards from the same area in a row where it reasonably can.
 */
export function adaptOrder(order: string[], from: number, rules: Rule[]): string[] {
	const byId = new Map(rules.map((r) => [r.id, r]));
	const strong = rules.filter((r) => isComplete(r.answer) && r.answer!.pull >= 2).length;
	if (strong < 3) return order;

	const weights = themeWeights(rules);
	const head = order.slice(0, from);
	const tail = order.slice(from);
	const pending = tail.filter((id) => !isComplete(byId.get(id)?.answer));
	const doneTail = tail.filter((id) => isComplete(byId.get(id)?.answer));
	const score = (id: string) =>
		(SEED_BY_ID.get(id)?.themes ?? []).reduce((s, t) => s + (weights.get(t) ?? 0), 0);

	const pool = pending
		.map((id, i) => ({ id, s: score(id), i }))
		.sort((a, b) => b.s - a.s || a.i - b.i);
	const out: string[] = [];
	let prev = areaOf(head[head.length - 1]);
	while (pool.length) {
		const best = pool[0].s;
		let k = pool.findIndex((p) => areaOf(p.id) !== prev && p.s >= best - 2);
		if (k < 0) k = 0;
		const [p] = pool.splice(k, 1);
		out.push(p.id);
		prev = areaOf(p.id);
	}
	return [...head, ...out, ...doneTail];
}
