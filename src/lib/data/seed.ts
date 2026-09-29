import type { Source } from '../db/types';

/** The deeper beliefs underneath many everyday ones. Used to adapt the order of the deck. */
export type Theme = 'earn' | 'burden' | 'feelings' | 'approval' | 'leave' | 'enough' | 'duty';

export interface Area {
	id: string;
	label: string;
	hint: string;
}

export interface SeedRule {
	id: string;
	area: string;
	category: string;
	themes: Theme[];
	text: string;
	rewrite: string;
	experiment: string;
}

/** Where a belief can come from. Order here is the order shown in the UI. */
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

/** Areas of life people can choose to reflect on. */
export const AREAS: Area[] = [
	{ id: 'career', label: 'Career & work', hint: 'Success, rest, ambition' },
	{ id: 'love', label: 'Relationships & love', hint: 'Partners, conflict, closeness' },
	{ id: 'family', label: 'Parents & family', hint: 'Duty, respect, boundaries' },
	{ id: 'worth', label: 'Self-worth', hint: 'Being enough, taking up space' },
	{ id: 'emotions', label: 'Emotions', hint: 'Anger, tears, asking for help' },
	{ id: 'friends', label: 'Friendships', hint: 'Fitting in, saying no, trust' },
	{ id: 'money', label: 'Money', hint: 'Spending, saving, comparison' },
	{ id: 'body', label: 'Body & health', hint: 'Looks, rest, getting help' },
	{ id: 'society', label: 'Society & culture', hint: 'Log kya kahenge, tradition' },
	{ id: 'roles', label: 'Gender & roles', hint: 'What you were told to be' }
];

const AREA_LABEL = new Map(AREAS.map((a) => [a.id, a.label]));

function b(id: string, area: string, themes: Theme[], text: string, rewrite: string, experiment: string): SeedRule {
	return { id, area, category: AREA_LABEL.get(area) ?? area, themes, text, rewrite, experiment };
}

/**
 * The full deck. IDs are stable: they are primary keys in each person's local database, so never
 * rename or reuse one. Add new beliefs with new IDs; they are seeded on next load. Text and
 * suggestions for seeded beliefs are refreshed from here on every load.
 */
export const SEED_RULES: SeedRule[] = [
	// Career & work
	b('r12', 'career', ['approval', 'duty'], 'Success means a stable, respectable job.', 'Success is a life I can live with, defined by me.', 'Write down three things that would make a year feel successful to you.'),
	b('r19', 'career', ['earn'], 'Rest is laziness.', 'Rest is part of the work, not a reward for finishing it.', "Take one 20-minute break this week before you feel you've earned it."),
	b('r20', 'career', ['earn', 'enough'], 'Mistakes are unforgivable.', 'Mistakes are how everyone learns, including me.', 'Tell someone about one small mistake you made, without over-apologising.'),
	b('c1', 'career', ['approval', 'enough'], 'Changing careers means you failed.', 'Changing direction means I learned something about what I want.', "Write down one thing you've learned about what you want from work."),
	b('c2', 'career', ['earn'], 'Your job title is who you are.', 'My work is something I do, not all of who I am.', 'Introduce yourself once this week without mentioning your job.'),
	b('c3', 'career', ['burden'], 'Asking for a raise is greedy.', 'Asking to be paid fairly is part of doing a job well.', "Write down what your work is worth and why, even if you don't send it."),
	b('c4', 'career', ['earn'], "If you're not busy, you're falling behind.", 'Space in my day is where good thinking happens.', 'Leave one 30-minute gap in your calendar empty on purpose.'),

	// Relationships & love
	b('r14', 'love', ['earn', 'leave'], 'Love has to be earned.', "Love is not a salary. I don't have to perform for it.", 'Spend time with someone close without trying to impress or help them.'),
	b('r15', 'love', ['approval', 'burden'], "If someone is upset, it's my job to fix it.", "I can care about someone's mood without owning it.", 'When someone is upset, ask "Do you want help or just company?" before fixing.'),
	b('r16', 'love', ['leave', 'feelings'], 'Conflict means the relationship is breaking.', 'Repair after conflict is what makes a relationship strong.', "After a small disagreement, go back and talk about it once it's calm."),
	b('l1', 'love', ['leave'], 'A good partner never needs space.', "Needing space is normal and doesn't mean love is fading.", 'Ask for, or offer, an hour of time alone without apologising.'),
	b('l2', 'love', ['burden', 'leave'], "If they really loved me, they'd know what I need.", 'People who love me still need me to tell them what I need.', "Tell someone close one specific thing you'd like from them."),
	b('l3', 'love', ['enough', 'approval'], 'Being single at my age means something is wrong with me.', 'My timeline is mine, and being single says nothing about my worth.', 'Notice one thing you enjoy about this season of your life.'),
	b('l4', 'love', ['approval', 'feelings'], 'Keep the peace, even if it costs you.', 'Honest disagreement can bring people closer.', 'Share one small preference instead of going along with the other person.'),

	// Parents & family
	b('r8', 'family', ['feelings', 'duty'], 'Family matters stay inside the family.', "Getting outside support isn't betrayal.", 'Talk about one family worry with someone outside the family.'),
	b('r10', 'family', ['duty', 'approval'], "Obey elders, even when they're wrong.", 'I can respect elders and still disagree with them.', 'Voice one respectful disagreement instead of staying silent.'),
	b('r11', 'family', ['duty', 'burden'], 'A good son or daughter gives up their own wants.', 'I can care for my family and still have a life of my own.', 'Block one hour this week that belongs only to you.'),
	b('f1', 'family', ['duty'], "My parents' sacrifices mean I owe them my choices.", 'I can be grateful to my parents and still make my own choices.', 'Make one small decision this week without asking for approval first.'),
	b('f2', 'family', ['duty', 'approval'], 'Setting boundaries with family is disrespectful.', 'Boundaries are how I stay close without resentment.', 'Say one gentle no to a family request that drains you.'),
	b('f3', 'family', ['burden', 'feelings'], "My parents' fights were my responsibility.", 'I was a child. Their conflicts were never mine to solve.', 'Write one sentence to your younger self about this.'),
	b('f4', 'family', ['earn', 'approval'], 'I have to make my parents proud.', 'I can live a life I am proud of, and let them feel what they feel.', "List one thing you're proud of that nobody else has praised."),

	// Self-worth
	b('r1', 'worth', ['earn'], 'My worth depends on what I achieve.', 'I have worth before I achieve anything.', 'Do one thing this week only because you enjoy it, with no goal attached.'),
	b('r2', 'worth', ['earn', 'burden'], 'I have to be useful to be loved.', "People can love me even when I'm not helping them.", "Let someone do something for you, and don't pay it back straight away."),
	b('r3', 'worth', ['burden'], "Don't need too much.", "My needs are normal, and I'm allowed to ask for them.", 'Ask one person for one small thing you would usually handle alone.'),
	b('r4', 'worth', ['burden', 'approval'], "Other people's comfort comes before mine.", "My comfort counts as much as anyone else's.", 'Say no to one small request without a long explanation.'),
	b('r13', 'worth', ['enough', 'earn'], 'Being compared to others keeps you on track.', 'The only fair comparison is with who I was before.', 'Notice one comparison this week and replace it with: "Compared to last year, I…"'),
	b('r21', 'worth', ['approval', 'enough'], "Stay small. Don't stand out.", "I'm allowed to take up space.", "Share one opinion or piece of work you'd normally keep to yourself."),
	b('w1', 'worth', ['enough'], 'Accepting praise makes you arrogant.', 'I can accept kind words and still stay humble.', 'When someone compliments you this week, just say thank you.'),

	// Emotions
	b('r5', 'emotions', ['feelings'], 'Anger is dangerous. Keep it inside.', 'Anger tells me a line was crossed. I can say so without hurting anyone.', 'Once this week, say calmly: "I\'m annoyed about ___."'),
	b('r6', 'emotions', ['feelings'], 'Crying is weakness.', 'Crying is how a body lets pressure out.', 'Next time tears come, let them come for one minute before stopping them.'),
	b('r7', 'emotions', ['feelings', 'leave'], 'If I show how I really feel, people will leave.', 'The right people stay closer when they see the real me.', "Tell one safe person one true feeling you'd normally hide."),
	b('e1', 'emotions', ['leave'], 'Feeling anxious means something bad is about to happen.', 'Anxiety is a feeling, not a forecast.', 'When anxious, name three things around you that are fine right now.'),
	b('e2', 'emotions', ['burden', 'enough'], "Other people have it worse, so I shouldn't feel this way.", 'My feelings are real even when others are struggling too.', "Name one feeling today without comparing it to anyone else's."),
	b('e3', 'emotions', ['burden', 'enough'], "Asking for help means I can't cope.", 'Asking for help is a way of coping.', 'Ask for help with one small task this week.'),
	b('e4', 'emotions', ['leave'], 'If I feel happy for too long, something will go wrong.', "I'm allowed to enjoy good things without bracing for the fall.", 'Next time you feel good, stay with it for one full minute.'),

	// Friendships
	b('r17', 'friends', ['leave'], 'Never trust anyone completely.', 'Trust can be built step by step, with people who earn it.', 'Share one small, low-risk thing with someone and see how they hold it.'),
	b('r18', 'friends', ['enough'], 'Being alone means something is wrong with me.', 'Time alone is normal, and it can even be good.', 'Spend one evening alone on purpose, doing something you like.'),
	b('p1', 'friends', ['approval', 'leave'], 'If I say no, people will stop inviting me.', 'Real friends can hear no and still want me around.', 'Decline one plan kindly and notice what actually happens.'),
	b('p2', 'friends', ['burden'], 'I should always be the one who listens.', 'I deserve friends who listen to me too.', 'Share something real the next time a friend asks how you are.'),
	b('p3', 'friends', ['approval'], 'Fitting in matters more than being myself.', 'The people who matter will like the real me.', 'Share one opinion or interest you usually keep hidden.'),
	b('p4', 'friends', ['leave', 'enough'], 'If a friend goes quiet, I did something wrong.', "People get busy. Distance isn't always about me.", 'Send a light message to a quiet friend without expecting a reply.'),
	b('p5', 'friends', ['approval'], "Old friends know me best, so I shouldn't change.", "I'm allowed to grow, and good friends grow with me.", "Tell one friend about something new you're into."),

	// Money
	b('r22', 'money', ['burden'], 'Spending on myself is selfish.', 'Looking after myself, including with money, is responsible.', 'Spend a small, planned amount on something just for you, without guilt.'),
	b('m1', 'money', ['leave'], 'Money is always about to run out.', 'I can plan for the future without living in fear of it.', 'Check your actual balance and write down one fact that feels steady.'),
	b('m2', 'money', ['feelings'], 'Talking about money is shameful.', 'Talking about money openly helps me make better choices.', 'Have one honest money conversation with someone you trust.'),
	b('m3', 'money', ['enough'], 'Wanting more money makes you greedy.', 'Money is a tool, and I can want it without losing my values.', 'Write down what more money would actually let you do.'),
	b('m4', 'money', ['earn', 'enough'], 'I have to earn more than others my age to matter.', "My worth isn't a ranking.", 'Mute one comparison trigger this week, like a feed or a group chat.'),
	b('m5', 'money', ['leave', 'burden'], 'Saving everything is the only safe choice.', 'Spending some on what I value is part of a balanced life.', 'Set aside a small amount this month only for joy.'),

	// Body & health
	b('r23', 'body', ['enough'], 'My body is something to fix.', 'My body is where I live, not a project.', 'Do one thing for your body this week because it feels good, not to change it.'),
	b('b1', 'body', ['earn'], 'Resting when sick is weakness.', 'Rest is how the body heals.', 'Next time you feel unwell, take the rest without explaining yourself.'),
	b('b2', 'body', ['duty'], 'Finish everything on your plate.', "I can listen to my body about when I've had enough.", 'Stop eating once when you feel full, and notice how it feels.'),
	b('b3', 'body', ['approval', 'enough'], 'Therapy is only for people with serious problems.', 'Talking to someone is a normal way to look after my mind.', "Look up one counsellor or helpline, just to know it's there."),
	b('b4', 'body', ['enough', 'approval'], 'Fair skin is more beautiful.', "Beauty isn't decided by skin colour.", 'Notice one ad or comment that pushes this idea, and question it.'),
	b('b5', 'body', ['feelings', 'earn'], 'Pain is something you just push through.', "Pain is information, and I'm allowed to listen to it.", 'Next time something hurts, pause and ask what it needs.'),

	// Society & culture
	b('r9', 'society', ['approval'], 'What will people say?', "Other people's opinions are information, not orders.", 'Make one small choice this week based only on what you prefer.'),
	b('s1', 'society', ['approval', 'duty'], 'You must be married by a certain age.', 'I can choose if and when to marry.', 'Write down what you want from a partnership, in your own words.'),
	b('s2', 'society', ['leave'], 'Stick to your own kind.', 'People from different backgrounds can enrich my life.', 'Have a real conversation with someone whose background differs from yours.'),
	b('s3', 'society', ['approval', 'earn'], 'Only some careers are respectable.', 'Respect comes from how I work, not which field I am in.', 'Learn about one career you were told was not respectable.'),
	b('s4', 'society', ['duty'], 'Tradition must never be questioned.', 'I can keep the traditions that hold meaning and question the rest.', 'Ask an elder why one tradition matters to them.'),
	b('s5', 'society', ['feelings', 'approval'], 'Mental health struggles should be kept private.', 'Talking about mental health reduces shame for everyone.', "Tell one trusted person how you've really been feeling."),

	// Gender & roles
	b('r24', 'roles', ['feelings', 'approval'], "My gender decides what I'm allowed to feel or want.", "My feelings and wants aren't decided by my gender.", 'Notice one thing you want but hold back on because of your gender, and take one step toward it.'),
	b('g1', 'roles', ['feelings', 'burden'], 'Men must always be strong and provide.', 'Strength includes asking for help and sharing the load.', 'Share one worry with someone instead of carrying it alone.'),
	b('g2', 'roles', ['duty', 'burden'], 'Women must adjust after marriage.', 'Adjusting should go both ways in a partnership.', 'Name one thing you would want a partner to adjust for you.'),
	b('g3', 'roles', ['duty'], "Housework is a woman's job.", "Looking after a home is everyone's job.", "Take on or share one household task that isn't usually yours."),
	b('g4', 'roles', ['approval', 'enough'], "A woman shouldn't be more ambitious than her partner.", "Ambition isn't a competition between partners.", 'Say one goal of yours out loud without shrinking it.'),
	b('g5', 'roles', ['duty', 'burden'], 'The eldest child must carry the family.', "Being the eldest doesn't mean carrying everything alone.", 'Hand one family responsibility to someone else this month.')
];

export const SEED_BY_ID = new Map(SEED_RULES.map((r) => [r.id, r]));

export type DeckSize = 'quick' | 'medium' | 'full';

/** How many cards each session length deals from the chosen areas. Beliefs the person added are always included. */
export const DECK_SIZES: { id: DeckSize; label: string; cards: number | null; minutes: string }[] = [
	{ id: 'quick', label: 'Quick', cards: 8, minutes: '~3 min' },
	{ id: 'medium', label: 'Medium', cards: 12, minutes: '~5 min' },
	{ id: 'full', label: 'Everything', cards: null, minutes: 'All in your areas' }
];
