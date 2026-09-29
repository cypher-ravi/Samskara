import { db } from './db/client';
import { isComplete } from './logic';
import { DECK_ORDER, DECK_SIZES, type DeckSize } from './data/seed';
import type { Choice, Pull, Rule, Snapshot, Source } from './db/types';

const RANK = new Map(DECK_ORDER.map((id, i) => [id, i]));

/** The cards dealt for a deck size: starting rules in priority order, then any the person added. */
function dealDeck(rules: Rule[], size: DeckSize): Rule[] {
	const cards = DECK_SIZES.find((d) => d.id === size)?.cards ?? 12;
	const seeded = rules
		.filter((r) => !r.isCustom)
		.sort((a, b) => (RANK.get(a.id) ?? 999) - (RANK.get(b.id) ?? 999));
	return [...seeded.slice(0, cards), ...rules.filter((r) => r.isCustom)];
}

const isDeckSize = (v: unknown): v is DeckSize => v === 'quick' || v === 'medium' || v === 'full';

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

	deck = $derived(dealDeck(this.rules, this.deckSize));
	sortedCount = $derived(this.rules.filter((r) => isComplete(r.answer)).length);
	current = $derived(this.deck[this.cursor]);
	/** Starting rules not yet dealt or not yet sorted, for the "go deeper" prompt. */
	remaining = $derived(this.rules.filter((r) => !isComplete(r.answer)).length);

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
		if (rule && isComplete(rule.answer)) this.write(() => db.logAnswer(rule.id));
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
