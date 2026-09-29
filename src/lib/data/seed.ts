import type { Source } from '../db/types';

export interface SeedRule {
	id: string;
	category: string;
	text: string;
	rewrite: string;
	experiment: string;
}

/** Where a rule can come from. Order here is the order shown in the UI. */
export const SEED_SOURCES: Source[] = [
	{ id: 'parents', label: 'Parents' },
	{ id: 'family', label: 'Extended family' },
	{ id: 'school', label: 'School & teachers' },
	{ id: 'society', label: 'Neighbours & society' },
	{ id: 'faith', label: 'Religion & culture' },
	{ id: 'peers', label: 'Friends & peers' },
	{ id: 'media', label: 'Media & internet' },
	{ id: 'partner', label: 'A partner or ex' },
	{ id: 'self', label: 'My own experience' },
	{ id: 'unknown', label: "Can't place it" }
];

/**
 * The starting deck. IDs are stable: they are primary keys in each user's local database,
 * so never rename or reuse one. Add new rules with new IDs; they are seeded on next load.
 */
export const SEED_RULES: SeedRule[] = [
	{ id: 'r1', category: 'Worth', text: 'My worth depends on what I achieve.', rewrite: 'I have worth before I achieve anything.', experiment: 'Do one thing this week only because you enjoy it, with no goal attached.' },
	{ id: 'r2', category: 'Worth', text: 'I have to be useful to be loved.', rewrite: "People can love me even when I'm not helping them.", experiment: "Let someone do something for you, and don't pay it back straight away." },
	{ id: 'r3', category: 'Needs', text: "Don't need too much.", rewrite: "My needs are normal, and I'm allowed to ask for them.", experiment: 'Ask one person for one small thing you would usually handle alone.' },
	{ id: 'r4', category: 'Needs', text: "Other people's comfort comes before mine.", rewrite: "My comfort counts as much as anyone else's.", experiment: 'Say no to one small request without a long explanation.' },
	{ id: 'r5', category: 'Feelings', text: 'Anger is dangerous. Keep it inside.', rewrite: 'Anger tells me a line was crossed. I can say so without hurting anyone.', experiment: 'Once this week, say calmly: "I\'m annoyed about ___."' },
	{ id: 'r6', category: 'Feelings', text: 'Crying is weakness.', rewrite: 'Crying is how a body lets pressure out.', experiment: 'Next time tears come, let them come for one minute before stopping them.' },
	{ id: 'r7', category: 'Feelings', text: 'If I show how I really feel, people will leave.', rewrite: 'The right people stay closer when they see the real me.', experiment: "Tell one safe person one true feeling you'd normally hide." },
	{ id: 'r8', category: 'Family', text: 'Family matters stay inside the family.', rewrite: "Getting outside support isn't betrayal.", experiment: 'Talk about one family worry with someone outside the family.' },
	{ id: 'r9', category: 'Society', text: 'What will people say?', rewrite: "Other people's opinions are information, not orders.", experiment: 'Make one small choice this week based only on what you prefer.' },
	{ id: 'r10', category: 'Family', text: "Obey elders, even when they're wrong.", rewrite: 'I can respect elders and still disagree with them.', experiment: 'Voice one respectful disagreement instead of staying silent.' },
	{ id: 'r11', category: 'Family', text: 'A good son or daughter gives up their own wants.', rewrite: 'I can care for my family and still have a life of my own.', experiment: 'Block one hour this week that belongs only to you.' },
	{ id: 'r12', category: 'Success', text: 'Success means a stable, respectable job.', rewrite: 'Success is a life I can live with, defined by me.', experiment: 'Write down three things that would make a year feel successful to you.' },
	{ id: 'r13', category: 'Success', text: 'Being compared to others keeps you on track.', rewrite: 'The only fair comparison is with who I was before.', experiment: 'Notice one comparison this week and replace it with: "Compared to last year, I…"' },
	{ id: 'r14', category: 'Love', text: 'Love has to be earned.', rewrite: "Love is not a salary. I don't have to perform for it.", experiment: 'Spend time with someone close without trying to impress or help them.' },
	{ id: 'r15', category: 'Love', text: "If someone is upset, it's my job to fix it.", rewrite: "I can care about someone's mood without owning it.", experiment: 'When someone is upset, ask "Do you want help or just company?" before fixing.' },
	{ id: 'r16', category: 'Love', text: 'Conflict means the relationship is breaking.', rewrite: 'Repair after conflict is what makes a relationship strong.', experiment: "After a small disagreement, go back and talk about it once it's calm." },
	{ id: 'r17', category: 'Trust', text: 'Never trust anyone completely.', rewrite: 'Trust can be built step by step, with people who earn it.', experiment: 'Share one small, low-risk thing with someone and see how they hold it.' },
	{ id: 'r18', category: 'Self', text: 'Being alone means something is wrong with me.', rewrite: 'Time alone is normal, and it can even be good.', experiment: 'Spend one evening alone on purpose, doing something you like.' },
	{ id: 'r19', category: 'Work', text: 'Rest is laziness.', rewrite: 'Rest is part of the work, not a reward for finishing it.', experiment: "Take one 20-minute break this week before you feel you've earned it." },
	{ id: 'r20', category: 'Work', text: 'Mistakes are unforgivable.', rewrite: 'Mistakes are how everyone learns, including me.', experiment: 'Tell someone about one small mistake you made, without over-apologising.' },
	{ id: 'r21', category: 'Safety', text: "Stay small. Don't stand out.", rewrite: "I'm allowed to take up space.", experiment: "Share one opinion or piece of work you'd normally keep to yourself." },
	{ id: 'r22', category: 'Money', text: 'Spending on myself is selfish.', rewrite: 'Looking after myself, including with money, is responsible.', experiment: 'Spend a small, planned amount on something just for you, without guilt.' },
	{ id: 'r23', category: 'Body', text: 'My body is something to fix.', rewrite: 'My body is where I live, not a project.', experiment: 'Do one thing for your body this week because it feels good, not to change it.' },
	{ id: 'r24', category: 'Roles', text: "My gender decides what I'm allowed to feel or want.", rewrite: "My feelings and wants aren't decided by my gender.", experiment: 'Notice one thing you want but hold back on because of your gender, and take one step toward it.' }
];

export type DeckSize = 'quick' | 'medium' | 'full';

/** How many starting rules each deck length shows. Rules the person added are always included. */
export const DECK_SIZES: { id: DeckSize; label: string; cards: number; minutes: number }[] = [
	{ id: 'quick', label: 'Quick', cards: 8, minutes: 3 },
	{ id: 'medium', label: 'Medium', cards: 12, minutes: 5 },
	{ id: 'full', label: 'Full', cards: SEED_RULES.length, minutes: 10 }
];

/**
 * The order cards are dealt in: the most widely felt rules first, spread across themes, so a short
 * session still touches worth, needs, feelings, family and society.
 */
export const DECK_ORDER: string[] = [
	'r9', 'r3', 'r1', 'r19', 'r5', 'r15', 'r11', 'r21', // quick
	'r14', 'r20', 'r8', 'r6', // medium
	'r2', 'r4', 'r7', 'r10', 'r12', 'r13', 'r16', 'r17', 'r18', 'r22', 'r23', 'r24' // full
];
