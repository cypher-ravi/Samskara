# Samskara

**Some beliefs you chose. Most were handed to you.**

In Indian philosophy, *samskaras* are the impressions left by past experience that quietly shape how we think and act. Many of them arrive as beliefs: *don't need too much*, *what will people say?*, *rest is laziness*. We absorb them from parents, family, school, society, faith and media long before we can question them.

Samskara is a private self-reflection tool that helps you see those beliefs, where they came from, and which ones you would still choose today.

## How it works

1. **Choose a length.** Quick (8 cards, about 3 minutes), Medium (12, the default) or Full (all 24). The most widely felt beliefs come first, so even a short session covers worth, needs, feelings, family and society. You can go deeper later.
2. **Sort the deck.** One card at a time. You can add beliefs of your own.
3. **Rate the pull.** Mark how much each belief steers you today, from *Not me* to *It runs me*.
4. **Stamp the source.** Mark where you picked it up: parents, extended family, school, neighbours and society, religion and culture, friends, media, a partner, or your own experience.
5. **Choose.** Decide whether each belief is *Mine*, *Handed to me*, or *Not sure yet*.
6. **See your roots map.** Your answers grow into a tree: sources are roots, beliefs you keep are glowing leaves, and beliefs you let go of lie on the ground. Each handed-down belief comes with an editable rewrite and one small experiment for the week. There's an example map at `/example`, and you can start over at any time.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | [SvelteKit](https://svelte.dev/docs/kit) with Svelte 5 runes and TypeScript |
| Database | [SQLite compiled to WebAssembly](https://sqlite.org/wasm) (`@sqlite.org/sqlite-wasm`) |
| Storage | Origin Private File System through the `opfs-sahpool` VFS, run in a Web Worker |
| Build | Vite, `@sveltejs/adapter-static` |
| Hosting | GitHub Pages, deployed by GitHub Actions |

### Local-first by design

There's no backend. The database file lives on each person's own device, inside the browser's private file system, so their answers never cross the network. The `opfs-sahpool` VFS was chosen because it doesn't need cross-origin isolation headers, which GitHub Pages can't set. If a browser has no OPFS (some private windows), the app falls back to an in-memory database and tells the person their answers won't be kept.

People can download their database as a `.sqlite3` file and import it on another device. Because it's a normal SQLite file, it opens in any SQLite tool.

## Data model

```
sources         id, label, position
rules           id, category, text, suggested_rewrite, suggested_experiment, is_custom, position, created_at
answers         rule_id → rules, pull (0–3), choice (mine | drop | unsure), rewrite, experiment, updated_at
answer_sources  rule_id → answers, source_id → sources
answer_history  id, rule_id, pull, choice, sources, recorded_at   (one row each time a card is finished)
meta            key, value                                         (e.g. the current card)
```

Migrations live in `src/lib/db/schema.ts` and are tracked with `PRAGMA user_version`. The starting deck is in `src/lib/data/seed.ts` and is inserted with `INSERT OR IGNORE`, so new seed rules reach existing users without touching their answers. `answer_history` is there so a later version can show how someone's relationship with a rule changes over time.

## Project structure

```
src/
  lib/
    db/
      db.worker.ts   SQLite in a Web Worker: open, migrate, seed, queries, export/import
      client.ts      typed request/response wrapper around the worker
      schema.ts      migrations
      types.ts       shared types
    data/seed.ts     starting rules and sources
    app.svelte.ts    app state (runes); writes every change to SQLite
    logic.ts         map calculations and text export
    components/      Header, RuleCard, SourceBars, HelpFooter
  routes/
    +page.svelte     the deck
    map/+page.svelte the map and data controls
```

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # type-check
npm run build    # static site in build/
```

## Deploy

Every push to `main` builds the site and publishes it with GitHub Actions. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions** once.

## Principles

- **No diagnosis, no labels.** You see your own patterns instead of being told what you are.
- **Private by design.** No server, account, or tracking.
- **Small actions over explanations.** Every belief you want to let go of ends with one concrete thing to try.
- **Not therapy.** Samskara is a reflection tool. If things feel heavy, talk to someone. In India, you can call Tele-MANAS at **14416** or **1-800-891-4416** (free, 24/7). Elsewhere, see [findahelpline.com](https://findahelpline.com).
