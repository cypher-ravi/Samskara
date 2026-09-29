export type Choice = 'mine' | 'drop' | 'unsure';

/** 0 = not me, 1 = a little, 2 = often, 3 = it runs me */
export type Pull = 0 | 1 | 2 | 3;

export interface Source {
	id: string;
	label: string;
}

export interface Answer {
	pull: Pull;
	choice: Choice | null;
	sources: string[];
	rewrite: string | null;
	experiment: string | null;
}

export interface Rule {
	id: string;
	category: string;
	text: string;
	suggestedRewrite: string;
	suggestedExperiment: string;
	isCustom: boolean;
	answer: Answer | null;
}

export interface Snapshot {
	persistent: boolean;
	sources: Source[];
	rules: Rule[];
	cursor: number;
	deckSize: string | null;
}

export interface AnswerInput {
	ruleId: string;
	pull: Pull;
	choice: Choice | null;
	sources: string[];
}

export interface ReflectionInput {
	ruleId: string;
	field: 'rewrite' | 'experiment';
	value: string;
}

/** Messages the page sends to the database worker, and the result each one returns. */
export interface Ops {
	snapshot: { payload: void; result: Snapshot };
	saveAnswer: { payload: AnswerInput; result: void };
	saveReflection: { payload: ReflectionInput; result: void };
	logAnswer: { payload: string; result: void };
	setCursor: { payload: number; result: void };
	setMeta: { payload: { key: string; value: string }; result: void };
	addRule: { payload: string; result: Rule };
	exportDb: { payload: void; result: Uint8Array };
	importDb: { payload: Uint8Array; result: void };
	reset: { payload: void; result: void };
}

export type OpName = keyof Ops;

export interface WorkerRequest {
	id: number;
	op: OpName;
	payload: unknown;
}

export type WorkerResponse =
	| { id: number; ok: true; result: unknown }
	| { id: number; ok: false; error: string };
