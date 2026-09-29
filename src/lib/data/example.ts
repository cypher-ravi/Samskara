import type { Answer, Choice, Pull, Rule } from '../db/types';
import { SEED_RULES } from './seed';

type Pick = [Pull, string[], Choice | null, string?];

/**
 * A fictional person's answers, used on the example page so people can see what a finished map
 * looks like before they start. Never written to the database.
 */
const ANSWERS: Record<string, Pick> = {
	r1: [3, ['parents', 'school'], 'drop'],
	r2: [2, ['parents'], 'drop'],
	r3: [3, ['parents', 'family'], 'drop', 'Asking for what I need is how people get to know me.'],
	r5: [2, ['parents', 'faith'], 'unsure'],
	r6: [1, ['society', 'peers'], 'drop'],
	r8: [1, ['family'], 'mine'],
	r9: [3, ['society', 'family'], 'drop'],
	r11: [2, ['family', 'faith'], 'unsure'],
	r12: [2, ['parents', 'society'], 'unsure'],
	r13: [2, ['family', 'society'], 'drop'],
	r14: [2, ['parents', 'partner'], 'drop'],
	r16: [0, [], null],
	r17: [1, ['self'], 'mine'],
	r19: [2, ['parents', 'school'], 'drop'],
	r20: [2, ['school'], 'drop'],
	r21: [2, ['school', 'peers'], 'drop'],
	r22: [1, ['parents', 'self'], 'mine'],
	r23: [0, [], null]
};

export function exampleRules(): Rule[] {
	return SEED_RULES.map((r) => {
		const a = ANSWERS[r.id];
		const answer: Answer | null = a
			? { pull: a[0], sources: a[1], choice: a[2], rewrite: a[3] ?? null, experiment: null }
			: null;
		return {
			id: r.id,
			category: r.category,
			text: r.text,
			suggestedRewrite: r.rewrite,
			suggestedExperiment: r.experiment,
			isCustom: false,
			answer
		};
	});
}
