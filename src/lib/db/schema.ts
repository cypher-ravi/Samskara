/**
 * Schema migrations, applied in order. The index of each entry + 1 is stored in PRAGMA user_version,
 * so a user's database only runs the migrations it hasn't seen yet. Never edit a shipped migration;
 * append a new one instead.
 */
export const MIGRATIONS: string[] = [
	/* 1: initial schema */ `
	CREATE TABLE sources (
		id        TEXT PRIMARY KEY,
		label     TEXT NOT NULL,
		position  INTEGER NOT NULL
	);

	CREATE TABLE rules (
		id                    TEXT PRIMARY KEY,
		category              TEXT NOT NULL,
		text                  TEXT NOT NULL,
		suggested_rewrite     TEXT NOT NULL DEFAULT '',
		suggested_experiment  TEXT NOT NULL DEFAULT '',
		is_custom             INTEGER NOT NULL DEFAULT 0,
		position              INTEGER NOT NULL,
		created_at            TEXT NOT NULL DEFAULT (datetime('now'))
	);

	-- The current answer for each rule. One row per rule the person has started sorting.
	CREATE TABLE answers (
		rule_id     TEXT PRIMARY KEY REFERENCES rules(id) ON DELETE CASCADE,
		pull        INTEGER NOT NULL CHECK (pull BETWEEN 0 AND 3),
		choice      TEXT CHECK (choice IN ('mine', 'drop', 'unsure')),
		rewrite     TEXT,
		experiment  TEXT,
		updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE answer_sources (
		rule_id    TEXT NOT NULL REFERENCES answers(rule_id) ON DELETE CASCADE,
		source_id  TEXT NOT NULL REFERENCES sources(id),
		PRIMARY KEY (rule_id, source_id)
	);

	-- Every time a card is finished, its answer is appended here, so later versions can show
	-- how someone's relationship with a rule changes over months.
	CREATE TABLE answer_history (
		id           INTEGER PRIMARY KEY AUTOINCREMENT,
		rule_id      TEXT NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
		pull         INTEGER NOT NULL,
		choice       TEXT,
		sources      TEXT NOT NULL DEFAULT '',
		recorded_at  TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX answer_history_rule ON answer_history(rule_id, recorded_at);

	CREATE TABLE meta (
		key    TEXT PRIMARY KEY,
		value  TEXT NOT NULL
	);
	`
];
