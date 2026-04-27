---
name: turborepo
description: TurboRepo task orchestration for the dean-stack monorepo — `turbo.json` v2 schema, `tasks` graph, `dependsOn`, `outputs`, and the `bun run check` ordering that is the CLI gate. Triggers on: turbo, turborepo, turbo.json, turbo task, turbo cache, dependsOn, turbo pipeline, workspace orchestration.
license: MIT
---

Owns the task graph that schedules every script in the dean-stack monorepo. Turbo schedules; Bun executes. The `check` task graph is load-bearing — it implements the gate.

## When to invoke
- Authoring or editing `turbo.json`.
- Adding a new script that needs to run inside `bun run check` or `bun run build`.
- Diagnosing cache misses, missing outputs, or wrong task ordering.
- Wiring `dependsOn` between workspaces.
- Adding or editing a generator under `turbo/generators/config.ts` (Plop-based; runs via `turbo gen run <name>`). The dean-stack `app` generator scaffolds `apps/<name>/` from `turbo/generators/templates/app/` — see README's "Scaffolding new apps".

## Owns
`turbo.json` task graph, `dependsOn`, cache keys, workspace topology for `apps/web` + `packages/*`, and orchestration of every `bun run` script.

## Defers to
- `bun-package-manager` — for `workspaces` globs and `bun install` mechanics.
- `bun-runtime` — for what each task body actually does once Turbo invokes it.
- `biome`, `stylelint`, `ts`, `bun-test` — each tool owns its own CLI flags and exit-code semantics; Turbo only owns the order.
- `playwright` (Wave 4, forward) — Turbo will sequence `playwright test` as the final stage of `check`; the conventions live in the playwright skills.

## Dean-stack rules
- Pillar 4 (CLI-gate-first) means: `turbo.json`'s `check` task is the canonical sequencer for `biome ci → stylelint --max-warnings 0 → tsgo --noEmit → bun test → build → playwright (storybook + app + app-offline)`. The parallel `check:fast` task drops the build step and runs only `--project=storybook` for the pre-push hook (no fresh `dist/`, so `app`/`app-offline` projects are CI's job). Reorder either one and the gate's contract changes.
- Top-level key is `tasks` (v2), never `pipeline`.
- Every cacheable task lists `outputs` explicitly (use `"outputs": []` for typecheck-style tasks that produce nothing but should still cache).
- Strict env mode is the default — env vars used by a task must be listed in its `env` array.

## Patterns

### Repo `turbo.json` skeleton
```jsonc
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "globalDependencies": ["**/.env.*local", "tsconfig.base.json"],
  "globalEnv": ["NODE_ENV", "CI"],
  "tasks": {
    "check": {
      "dependsOn": ["lint", "stylelint", "typecheck", "test:unit", "test:e2e"]
    },
    "check:fast": {
      "dependsOn": ["typecheck", "test:unit", "test:e2e:fast"]
    },
    "lint":         { "outputs": [] },
    "stylelint":    { "outputs": [] },
    "typecheck":    { "dependsOn": ["^build"], "outputs": [] },
    "test:unit":    { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "test:e2e":     { "dependsOn": ["build"], "outputs": ["playwright-report/**", "test-results/**"] },
    "test:e2e:fast":{ "outputs": ["playwright-report/**", "test-results/**"] },
    "build":        { "dependsOn": ["^build"], "outputs": [".output/**", "dist/**"] },
    "dev":          { "cache": false, "persistent": true }
  }
}
```
The order inside `check.dependsOn` is the gate's order. Each named task's body is a `bun run <name>` script in the workspace's `package.json`.

### Per-workspace script wiring
```jsonc
// apps/web/package.json
{
  "scripts": {
    "lint":      "biome ci",
    "stylelint": "stylelint \"**/*.css\" --max-warnings 0",
    "typecheck": "tsgo --noEmit",
    "test:unit": "bun test",
    "test:e2e":  "playwright test",
    "build":     "vite build",
    "dev":       "vite dev"
  }
}
```
`turbo run check` resolves each task in each workspace; the workspace's `package.json` defines what the verb actually does.

### Persistent dev with `with`
```jsonc
{
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true,
      "with": ["storybook", "biome:watch", "stylelint:watch"]
    },
    "storybook":       { "cache": false, "persistent": true },
    "biome:watch":     { "cache": false, "persistent": true },
    "stylelint:watch": { "cache": false, "persistent": true }
  }
}
```
`with` is **directional** — it lives on the task you'll *invoke*. `turbo run dev` reads its `with` list and co-runs the watchers alongside it. The inverse direction (`with: ["dev"]` on each watcher) would only co-run `dev` when you explicitly invoke a watcher, which is not what `bun run dev` needs. Co-running this way preserves the task graph (unlike `--parallel`, which discards it).

Because Biome 2.x and Stylelint 16 ship no native CLI watcher, the `biome:watch` and `stylelint:watch` per-app scripts wrap their respective tools in `chokidar-cli` (root `devDependencies`) — see the `biome` and `stylelint` skills for the exact invocations.

### Cache flags (v2.9 form)
```bash
turbo run check                          # normal local cache
turbo run build --cache=remote:rw        # remote cache only
turbo run check --cache=local:r,remote:r # read-only (CI dry run)
```
The collapsed `--cache=…` flag replaces `--no-cache`, `--remote-only`, etc. — those are deprecated.

## Anti-patterns
- **Don't use `pipeline`** — renamed to `tasks` in 2.0; `pipeline` is a hard error now.
- **Don't use `--parallel` for the dev stack** — it discards the task graph and silently breaks ordering. Use `persistent` + `with` instead.
- **Don't omit `outputs`** on a cacheable task — silent cache misses follow. Use `"outputs": []` for "cacheable, produces no files."
- **Don't reference env vars with `$` in `dependsOn`** — list them in `env` / `globalEnv` instead.
- **Don't reorder `check.dependsOn`** without updating CLAUDE.md — the order is part of the gate's contract.

## Triggers on
turbo, turborepo, turbo.json, turbo task, turbo cache, dependsOn, turbo pipeline, workspace orchestration
