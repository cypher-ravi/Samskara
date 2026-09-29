/// <reference lib="webworker" />
/**
 * The database worker. It runs the official SQLite WebAssembly build and keeps the database file
 * in the Origin Private File System (OPFS) through the "opfs-sahpool" VFS, which needs no special
 * server headers and therefore works on GitHub Pages. Nothing here ever touches the network.
 *
 * If the browser has no OPFS (some private windows, older browsers), it falls back to an
 * in-memory database and reports `persistent: false` so the UI can say answers won't be kept.
 */
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { MIGRATIONS } from './schema';
import { SEED_RULES, SEED_SOURCES } from '../data/seed';
import type {
	AnswerInput,
	Choice,
	OpName,
	Pull,
	ReflectionInput,
	Rule,
	Snapshot,
	WorkerRequest,
	WorkerResponse
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any -- sqlite-wasm's OO API is loosely typed */
const DB_FILE = '/samskara.sqlite3';
const SQLITE_HEADER = 'SQLite format 3\u0000';

let sqlite3: any;
let pool: any = null;
let db: any;
let persistent = false;
let opening: Promise<void> | null = null;

async function open(): Promise<void> {
	sqlite3 = await sqlite3InitModule({ print: () => {}, printErr: () => {} });
	try {
		pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'samskara-pool', directory: '/samskara' });
		db = new pool.OpfsSAHPoolDb(DB_FILE);
		persistent = true;
	} catch {
		pool = null;
		db = new sqlite3.oo1.DB(':memory:', 'ct');
		persistent = false;
	}
	prepare();
}

function prepare(): void {
	db.exec('PRAGMA foreign_keys = ON;');
	migrate();
	seed();
}

function migrate(): void {
	const version = Number(db.selectValue('PRAGMA user_version'));
	for (let i = version; i < MIGRATIONS.length; i++) {
		db.transaction(() => {
			db.exec(MIGRATIONS[i]);
			db.exec(`PRAGMA user_version = ${i + 1}`);
		});
	}
}

/** Insert any seed rows that are missing. Existing rows (and the person's answers) are untouched. */
function seed(): void {
	db.transaction(() => {
		SEED_SOURCES.forEach((s, i) =>
			db.exec({
				sql: 'INSERT OR IGNORE INTO sources (id, label, position) VALUES (?, ?, ?)',
				bind: [s.id, s.label, i]
			})
		);
		SEED_RULES.forEach((r, i) =>
			db.exec({
				sql: `INSERT OR IGNORE INTO rules
				      (id, category, text, suggested_rewrite, suggested_experiment, is_custom, position)
				      VALUES (?, ?, ?, ?, ?, 0, ?)`,
				bind: [r.id, r.category, r.text, r.rewrite, r.experiment, i]
			})
		);
	});
}

function toRule(row: any, sources: string[]): Rule {
	return {
		id: row.id,
		category: row.category,
		text: row.text,
		suggestedRewrite: row.suggestedRewrite,
		suggestedExperiment: row.suggestedExperiment,
		isCustom: row.isCustom === 1,
		answer:
			row.pull === null || row.pull === undefined
				? null
				: {
						pull: row.pull as Pull,
						choice: (row.choice ?? null) as Choice | null,
						sources,
						rewrite: row.rewrite ?? null,
						experiment: row.experiment ?? null
					}
	};
}

function sourcesByRule(): Map<string, string[]> {
	const map = new Map<string, string[]>();
	const links = db.selectObjects(
		'SELECT rule_id AS ruleId, source_id AS sourceId FROM answer_sources ORDER BY rowid'
	);
	for (const l of links) {
		if (!map.has(l.ruleId)) map.set(l.ruleId, []);
		map.get(l.ruleId)!.push(l.sourceId);
	}
	return map;
}

const RULE_SELECT = `
	SELECT r.id, r.category, r.text,
	       r.suggested_rewrite    AS suggestedRewrite,
	       r.suggested_experiment AS suggestedExperiment,
	       r.is_custom            AS isCustom,
	       a.pull, a.choice, a.rewrite, a.experiment
	FROM rules r
	LEFT JOIN answers a ON a.rule_id = r.id`;

function snapshot(): Snapshot {
	const links = sourcesByRule();
	const rules = db
		.selectObjects(`${RULE_SELECT} ORDER BY r.position, r.created_at`)
		.map((row: any) => toRule(row, links.get(row.id) ?? []));
	const sources = db.selectObjects('SELECT id, label FROM sources ORDER BY position');
	const cursor = Number(getMeta('cursor') ?? 0);
	return {
		persistent,
		sources,
		rules,
		cursor: Number.isFinite(cursor) ? cursor : 0,
		deckSize: getMeta('deckSize')
	};
}

function saveAnswer({ ruleId, pull, choice, sources }: AnswerInput): void {
	const notMe = pull === 0;
	db.transaction(() => {
		db.exec({
			sql: `INSERT INTO answers (rule_id, pull, choice, updated_at)
			      VALUES (?, ?, ?, datetime('now'))
			      ON CONFLICT (rule_id) DO UPDATE
			      SET pull = excluded.pull, choice = excluded.choice, updated_at = excluded.updated_at`,
			bind: [ruleId, pull, notMe ? null : choice]
		});
		db.exec({ sql: 'DELETE FROM answer_sources WHERE rule_id = ?', bind: [ruleId] });
		if (!notMe) {
			for (const s of sources) {
				db.exec({
					sql: 'INSERT OR IGNORE INTO answer_sources (rule_id, source_id) VALUES (?, ?)',
					bind: [ruleId, s]
				});
			}
		}
	});
}

function saveReflection({ ruleId, field, value }: ReflectionInput): void {
	const column = field === 'rewrite' ? 'rewrite' : 'experiment';
	db.exec({
		sql: `UPDATE answers SET ${column} = ?, updated_at = datetime('now') WHERE rule_id = ?`,
		bind: [value, ruleId]
	});
}

function logAnswer(ruleId: string): void {
	db.exec({
		sql: `INSERT INTO answer_history (rule_id, pull, choice, sources)
		      SELECT a.rule_id, a.pull, a.choice,
		             COALESCE((SELECT group_concat(source_id, ',') FROM answer_sources s WHERE s.rule_id = a.rule_id), '')
		      FROM answers a WHERE a.rule_id = ?`,
		bind: [ruleId]
	});
}

function getMeta(key: string): string | null {
	return db.selectValue('SELECT value FROM meta WHERE key = ?', [key]) ?? null;
}

function setMeta(key: string, value: string): void {
	db.exec({
		sql: `INSERT INTO meta (key, value) VALUES (?, ?)
		      ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
		bind: [key, value]
	});
}

function setCursor(cursor: number): void {
	setMeta('cursor', String(cursor));
}

function addRule(text: string): Rule {
	const clean = text.trim().replace(/\s+/g, ' ').slice(0, 160);
	if (clean.length < 4) throw new Error('Write the belief in a few words first.');
	const id = `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
	const position = Number(db.selectValue('SELECT COALESCE(MAX(position), 0) + 1 FROM rules'));
	db.exec({
		sql: `INSERT INTO rules (id, category, text, is_custom, position) VALUES (?, 'Your own', ?, 1, ?)`,
		bind: [id, /[.?!]$/.test(clean) ? clean : `${clean}.`, position]
	});
	const row = db.selectObject(`${RULE_SELECT} WHERE r.id = ?`, [id]);
	return toRule(row, []);
}

function exportDb(): Uint8Array {
	return sqlite3.capi.sqlite3_js_db_export(db);
}

async function importDb(bytes: Uint8Array): Promise<void> {
	const header = new TextDecoder().decode(bytes.slice(0, 16));
	if (header !== SQLITE_HEADER) throw new Error("That file isn't a SQLite database.");
	if (!pool) throw new Error("This browser can't save data, so it can't import a file either.");

	const backup = exportDb();
	db.close();
	try {
		await pool.importDb(DB_FILE, bytes);
		db = new pool.OpfsSAHPoolDb(DB_FILE);
		prepare();
		db.selectValue('SELECT COUNT(*) FROM rules');
		db.selectValue('SELECT COUNT(*) FROM answers');
	} catch {
		try {
			db?.close();
		} catch {
			/* already closed */
		}
		await pool.importDb(DB_FILE, backup);
		db = new pool.OpfsSAHPoolDb(DB_FILE);
		prepare();
		throw new Error("That file isn't a Samskara backup. Your current answers are unchanged.");
	}
}

function reset(): void {
	const tables: string[] = db.selectValues(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
	);
	db.exec('PRAGMA foreign_keys = OFF;');
	for (const t of tables) db.exec(`DROP TABLE IF EXISTS "${t.replace(/"/g, '""')}"`);
	db.exec('PRAGMA user_version = 0;');
	db.exec('VACUUM;');
	prepare();
}

async function handle(op: OpName, payload: any): Promise<{ result: unknown; transfer: Transferable[] }> {
	switch (op) {
		case 'snapshot':
			return { result: snapshot(), transfer: [] };
		case 'saveAnswer':
			return { result: saveAnswer(payload), transfer: [] };
		case 'saveReflection':
			return { result: saveReflection(payload), transfer: [] };
		case 'logAnswer':
			return { result: logAnswer(payload), transfer: [] };
		case 'setCursor':
			return { result: setCursor(payload), transfer: [] };
		case 'setMeta':
			return { result: setMeta(String(payload.key), String(payload.value)), transfer: [] };
		case 'addRule':
			return { result: addRule(payload), transfer: [] };
		case 'exportDb': {
			const bytes = exportDb();
			return { result: bytes, transfer: [bytes.buffer] };
		}
		case 'importDb':
			return { result: await importDb(payload), transfer: [] };
		case 'reset':
			return { result: reset(), transfer: [] };
		default:
			throw new Error(`Unknown operation: ${String(op)}`);
	}
}

// Requests are handled one at a time, in order, so a slow import can't interleave with a save.
let queue: Promise<void> = Promise.resolve();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
	const { id, op, payload } = event.data;
	queue = queue.then(async () => {
		try {
			opening ??= open();
			await opening;
			const { result, transfer } = await handle(op, payload);
			self.postMessage({ id, ok: true, result } satisfies WorkerResponse, { transfer });
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			self.postMessage({ id, ok: false, error } satisfies WorkerResponse);
		}
	});
};
