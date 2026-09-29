import { db } from './db/client';
import { isComplete } from './logic';
import { AREAS, DECK_SIZES, type DeckSize } from './data/seed';
import { adaptOrder, buildOrder, repairOrder } from './deck';
import type { Choice, Pull, Rule, Snapshot, Source } from './db/types';

const isDeckSize = (v: unknown): v is DeckSize => v === 'quick' || v === 'medium' || v === 'full';
const AREA_IDS = new Set(AREAS.map((a) => a.id));

function parseList(json: string | null): string[] {
	try {
		const v = JSON.parse(json ?? '[]');
		return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
	} catch {
		return [];
	}
}

/** App-wide state. Every change is written to the local SQLite database as it happens. */
class AppState {
	status = $state<'loading' | 'ready' | 'error'>('loading');
	error = $state('');
	notice = $state('');
	persistent = $state(true);
	rules = $state<Rule[]>([]);
	sources = $state<Source[]>([]);
	cursor = $state(0);
	deckSize = $state<DeckSize>('medium');
	/** Areas of life the person chose to look at. Empty means they haven't chosen yet. */
	areas = $state<string[]>([]);
	/** Belief ids in the order they're dealt. */
	order = $state<string[]>([]);
	/** True while the area picker is open for a change of areas. */
	pickingAreas = $state(false);

	/** The cards dealt for this session: the first N of the order, then any beliefs the person added. */
	deck = $derived.by(() => {
		const byId = new Map(this.rules.map((r) => [r.id, r]));
		const cards = DECK_SIZES.find((d) => d.id === this.deckSize)?.cards ?? null;
		const ids = cards === null ? this.order : this.order.slice(0, cards);
		const seeded = ids.map((id) => byId.get(id)).filter((r): r is Rule => !!r);
		return [...seeded, ...this.rules.filter((r) => r.isCustom)];
	});
	sortedCount = $derived(this.rules.filter((r) => isComplete(r.answer)).length);
	current = $derived(this.deck[this.cursor]);
	/** Beliefs in the chosen areas still to sort, for the "go deeper" prompt. */
	remaining = $derived.by(() => {
		const byId = new Map(this.rules.map((r) => [r.id, r]));
		return this.order.filter((id) => !isComplete(byId.get(id)?.answer)).length;
	});

	#reflectionTimers = new Map<string, ReturnType<typeof setTimeout>>();

	async load() {
		try {
			this.apply(await db.snapshot());
			this.status = 'ready';
		} catch (err) {
			this.error = err instanceof Error ? err.message : String(err);
			this.status = 'error';
		}
	}

	private apply(s: Snapshot) {
		this.persistent = s.persistent;
		this.sources = s.sources;
		this.rules = s.rules;
		this.deckSize = isDeckSize(s.deckSize) ? s.deckSize : 'medium';
		this.areas = parseList(s.areas).filter((a) => AREA_IDS.has(a));
		const saved = parseList(s.order);
		this.order = this.areas.length
			? saved.length
				? repairOrder(saved, this.areas, s.rules)
				: buildOrder(this.areas, s.rules)
			: [];
		this.pickingAreas = false;
		this.cursor = Math.max(0, Math.min(s.cursor, this.deck.length - 1));
	}

	/** Run a database write; if it fails, say so instead of silently losing the change. */
	private async write(task: () => Promise<unknown>) {
		try {
			await task();
		} catch (err) {
			this.notice = `Couldn't save that change: ${err instanceof Error ? err.message : String(err)}`;
		}
	}

	private saveAnswer(rule: Rule) {
		const a = rule.answer!;
		return this.write(() =>
			db.saveAnswer({ ruleId: rule.id, pull: a.pull, choice: a.choice, sources: [...a.sources] })
		);
	}

	setPull(rule: Rule, pull: Pull) {
		if (!rule.answer) {
			rule.answer = { pull, choice: null, sources: [], rewrite: null, experiment: null };
		} else {
			rule.answer.pull = pull;
		}
		if (pull === 0) {
			rule.answer.choice = null;
			rule.answer.sources = [];
		}
		return this.saveAnswer(rule);
	}

	setSources(rule: Rule, sources: string[]) {
		if (!rule.answer || rule.answer.pull === 0) return;
		rule.answer.sources = [...sources];
		return this.saveAnswer(rule);
	}

	/** Start (or restart) a session on the chosen areas, in a fresh mixed order. */
	chooseAreas(ids: string[]) {
		this.areas = ids.filter((a) => AREA_IDS.has(a));
		this.order = buildOrder(this.areas, this.rules);
		this.pickingAreas = false;
		this.write(() => db.setMeta('areas', JSON.stringify(this.areas)));
		this.saveOrder();
		this.goTo(0);
	}

	private saveOrder() {
		const order = JSON.stringify(this.order);
		this.write(() => db.setMeta('order', order));
	}

	toggleSource(rule: Rule, sourceId: string) {
		if (!rule.answer) return;
		const list = rule.answer.sources;
		rule.answer.sources = list.includes(sourceId)
			? list.filter((s) => s !== sourceId)
			: [...list, sourceId];
		return this.saveAnswer(rule);
	}

	setChoice(rule: Rule, choice: Choice) {
		if (!rule.answer) return;
		rule.answer.choice = choice;
		return this.saveAnswer(rule);
	}

	/** Rewrites and experiments are saved a moment after typing stops. */
	setReflection(rule: Rule, field: 'rewrite' | 'experiment', value: string) {
		if (!rule.answer) return;
		rule.answer[field] = value;
		const key = `${rule.id}:${field}`;
		clearTimeout(this.#reflectionTimers.get(key));
		this.#reflectionTimers.set(
			key,
			setTimeout(() => {
				this.#reflectionTimers.delete(key);
				this.write(() => db.saveReflection({ ruleId: rule.id, field, value }));
			}, 350)
		);
	}

	goTo(index: number) {
		this.cursor = Math.max(0, Math.min(index, this.deck.length - 1));
		this.write(() => db.setCursor(this.cursor));
	}

	setDeckSize(size: DeckSize) {
		const currentId = this.current?.id;
		this.deckSize = size;
		this.write(() => db.setMeta('deckSize', size));
		const kept = currentId ? this.deck.findIndex((r) => r.id === currentId) : -1;
		this.goTo(kept >= 0 ? kept : this.firstUnsorted());
	}

	/** Records the finished card in history. Returns true if this was the last card. */
	finishCurrent(): boolean {
		const rule = this.current;
		if (rule && isComplete(rule.answer)) {
			this.write(() => db.logAnswer(rule.id));
			const at = this.order.indexOf(rule.id);
			if (at >= 0) {
				this.order = adaptOrder(this.order, at + 1, this.rules);
				this.saveOrder();
			}
		}
		if (this.cursor >= this.deck.length - 1) return true;
		this.goTo(this.cursor + 1);
		return false;
	}

	firstUnsorted(): number {
		const i = this.deck.findIndex((r) => !isComplete(r.answer));
		return i === -1 ? this.cursor : i;
	}

	async addRule(text: string): Promise<string> {
		try {
			const rule = await db.addRule(text);
			this.rules.push(rule);
			return `Added as card ${this.deck.length}. You'll reach it at the end of the deck.`;
		} catch (err) {
			return err instanceof Error ? err.message : String(err);
		}
	}

	async exportFile(): Promise<void> {
		const bytes = await db.exportDb();
		const blob = new Blob([bytes as BlobPart], { type: 'application/vnd.sqlite3' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `samskara-${new Date().toISOString().slice(0, 10)}.sqlite3`;
		document.body.append(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	async importFile(file: File): Promise<string> {
		try {
			await db.importDb(new Uint8Array(await file.arrayBuffer()));
			this.apply(await db.snapshot());
			return 'Imported. Your map now shows the answers from that file.';
		} catch (err) {
			return err instanceof Error ? err.message : String(err);
		}
	}

	async reset(): Promise<void> {
		await db.reset();
		this.apply(await db.snapshot());
	}
}

export const app = new AppState();
