import type { Ops, OpName, WorkerRequest, WorkerResponse } from './types';

type Pending = { resolve: (value: unknown) => void; reject: (reason: Error) => void };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
	if (worker) return worker;
	worker = new Worker(new URL('./db.worker.ts', import.meta.url), { type: 'module' });
	worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
		const msg = event.data;
		const p = pending.get(msg.id);
		if (!p) return;
		pending.delete(msg.id);
		if (msg.ok) p.resolve(msg.result);
		else p.reject(new Error(msg.error));
	};
	worker.onerror = (event) => {
		const error = new Error(event.message || 'The local database failed to start.');
		for (const p of pending.values()) p.reject(error);
		pending.clear();
	};
	return worker;
}

function call<K extends OpName>(
	op: K,
	payload?: Ops[K]['payload'],
	transfer: Transferable[] = []
): Promise<Ops[K]['result']> {
	return new Promise((resolve, reject) => {
		const id = ++seq;
		pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
		getWorker().postMessage({ id, op, payload } satisfies WorkerRequest, transfer);
	});
}

/** Typed access to the SQLite database running in a Web Worker. */
export const db = {
	snapshot: () => call('snapshot'),
	saveAnswer: (input: Ops['saveAnswer']['payload']) => call('saveAnswer', input),
	saveReflection: (input: Ops['saveReflection']['payload']) => call('saveReflection', input),
	logAnswer: (ruleId: string) => call('logAnswer', ruleId),
	setCursor: (cursor: number) => call('setCursor', cursor),
	addRule: (text: string) => call('addRule', text),
	exportDb: () => call('exportDb'),
	importDb: (bytes: Uint8Array) => call('importDb', bytes, [bytes.buffer]),
	reset: () => call('reset')
};
