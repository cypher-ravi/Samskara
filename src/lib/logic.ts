import type { Answer, Choice, Pull, Rule, Source } from './db/types';

export const PULL_LABELS = ['Not me', 'A little', 'Often', 'It runs me'] as const;

export function isComplete(a: Answer | null | undefined): boolean {
	if (!a) return false;
	if (a.pull === 0) return true;
	return a.sources.length > 0 && a.choice !== null;
}

export type TickStatus = '' | 'notme' | Choice;

export function status(a: Answer | null): TickStatus {
	if (!isComplete(a)) return '';
	return a!.pull === 0 ? 'notme' : a!.choice!;
}

export interface SourceCount {
	id: string;
	label: string;
	mine: number;
	drop: number;
	unsure: number;
	total: number;
}

export interface MapSummary {
	sorted: number;
	carried: Rule[];
	mine: Rule[];
	drop: Rule[];
	unsure: Rule[];
	notMe: number;
	counts: SourceCount[];
	maxCount: number;
	observations: string[];
}

const byPull = (a: Rule, b: Rule) => (b.answer?.pull ?? 0) - (a.answer?.pull ?? 0);

/** Everything the map page shows, derived from the rules and their answers. */
export function summarize(rules: Rule[], sources: Source[]): MapSummary {
	const done = rules.filter((r) => isComplete(r.answer));
	const carried = done.filter((r) => r.answer!.pull > 0);
	const pick = (c: Choice) => carried.filter((r) => r.answer!.choice === c).sort(byPull);
	const mine = pick('mine');
	const drop = pick('drop');
	const unsure = pick('unsure');

	const counts = sources
		.map((s) => {
			const c: SourceCount = { id: s.id, label: s.label, mine: 0, drop: 0, unsure: 0, total: 0 };
			for (const r of carried) if (r.answer!.sources.includes(s.id)) c[r.answer!.choice!]++;
			c.total = c.mine + c.drop + c.unsure;
			return c;
		})
		.filter((c) => c.total > 0)
		.sort((a, b) => b.total - a.total);

	const observations: string[] = [];
	const dropTop = [...counts].filter((c) => c.drop > 0).sort((a, b) => b.drop - a.drop)[0];
	if (dropTop && dropTop.id !== 'self') {
		observations.push(
			`Most of the beliefs you'd put down came from ${dropTop.label.toLowerCase()} (${dropTop.drop} of ${drop.length}).`
		);
	}
	const self = counts.find((c) => c.id === 'self');
	if (self && self.mine > 0) {
		observations.push(
			`${self.mine} of the beliefs you keep are backed by your own experience, not only by what you were told.`
		);
	}
	const heavy = drop.filter((r) => r.answer!.pull === 3).length;
	if (heavy) {
		observations.push(
			heavy === 1
				? 'One belief you wouldn\'t choose still runs you strongly. That is the best place to start.'
				: `${heavy} beliefs you wouldn't choose still run you strongly. Those are the best place to start.`
		);
	}

	return {
		sorted: done.length,
		carried,
		mine,
		drop,
		unsure,
		notMe: done.length - carried.length,
		counts,
		maxCount: Math.max(1, ...counts.map((c) => c.total)),
		observations
	};
}

export function sourceText(rule: Rule, sources: Source[]): string {
	return (rule.answer?.sources ?? [])
		.map((id) => sources.find((s) => s.id === id)?.label ?? id)
		.join(', ');
}

export function mapAsText(rules: Rule[], sources: Source[]): string {
	const s = summarize(rules, sources);
	const lines = ['SAMSKARA: MY BELIEFS MAP', ''];
	const group = (title: string, list: Rule[], withRewrite: boolean) => {
		if (!list.length) return;
		lines.push(title);
		for (const r of list) {
			lines.push(`- ${r.text}  (from ${sourceText(r, sources)}; ${PULL_LABELS[r.answer!.pull as Pull]})`);
			if (withRewrite) {
				const rw = r.answer!.rewrite ?? r.suggestedRewrite;
				const ex = r.answer!.experiment ?? r.suggestedExperiment;
				if (rw) lines.push(`    My version: ${rw}`);
				if (ex) lines.push(`    Try this week: ${ex}`);
			}
		}
		lines.push('');
	};
	group('HANDED TO ME', s.drop, true);
	group('MINE', s.mine, false);
	group('STILL DECIDING', s.unsure, false);
	return lines.join('\n');
}
