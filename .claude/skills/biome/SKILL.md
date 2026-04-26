---
name: biome
description: Biome 2.x as the formatter + linter for `.ts`, `.tsx`, `.js`, and `.json` in dean-stack — `biome ci` is the gate, watch mode runs alongside `bun run dev`, and Biome MUST NOT touch CSS. Triggers on: biome, biome.json, biome ci, biome lint, biome format, biome watch, biome rule.
license: MIT
---

Owns formatting and linting of every `.ts`, `.tsx`, `.js`, and `.json` file in the repo. CSS belongs to `stylelint` exclusively — the two tools split by extension and do not overlap.

## When to invoke
- Authoring or editing `biome.json`.
- Adding a lint rule, a formatter rule, or an `assist` action.
- Wiring `biome ci` into the gate or `biome --watch` into `bun run dev`.
- Diagnosing a Biome warning or a `biome ci` failure.

## Owns
Biome 2.x config, formatter + linter for `.ts`/`.tsx`/`.js`/`.json`, `biome ci` gate behavior, watch-mode integration with `bun run dev`, and the rule that Biome **does not** touch CSS.

## Defers to
- `stylelint` — for everything `.css`. Biome's CSS linter is intentionally disabled in this stack.
- `ts` — for `tsconfig` and the `tsgo --noEmit` gate stage that runs after Biome.
- `turborepo` — for *when* `biome ci` runs in the gate sequence.

## Dean-stack rules
- Pillar 4 (CLI-gate-first) means: `biome ci` exits non-zero on any finding, and any warning is a failure (zero-warning policy). The IDE is not the source of truth — the CLI watcher is.
- The format/lint split with Stylelint is an extension boundary: Biome owns `.ts`/`.tsx`/`.js`/`.json`; Stylelint owns `.css`. Do not enable Biome's CSS linter — it overlaps Stylelint and does not understand Tailwind directives.
- Storybook story files (`*.stories.tsx`) are not exempt — Biome lints them like any other TSX.

## Patterns

### Shared config packages — set `"root": false`

When extracting shared config to `packages/biome-config/biome.json` and extending from the workspace root via `"extends": ["@dean-stack/biome-config/biome.json"]`, the **shared config must declare `"root": false`** at the top level:

```jsonc
// packages/biome-config/biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.4.13/schema.json",
  "root": false,
  "formatter": { ... },
  "linter": { ... }
}
```

Without it, Biome 2.x treats the shared file as a nested root configuration and exits with `Found a nested root configuration, but there's already a root configuration.`

### Ignore patterns — drop the trailing `/**` (Biome ≥ 2.2)

In `files.includes`, write `"!potential_skills"` (NOT `"!potential_skills/**"`). The trailing `/**` is the pre-2.2 form and now warns.

### Minimal `biome.json` for dean-stack
```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.13/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.json", "!!**/dist", "!!**/.output", "!!**/.turbo", "!!**/storybook-static"]
  },
  "formatter": { "enabled": true, "indentStyle": "space" },
  "linter":    { "enabled": true, "rules": { "recommended": true } },
  "assist":    { "enabled": true, "actions": { "source": { "organizeImports": "on" } } },
  "css":       { "linter": { "enabled": false }, "formatter": { "enabled": false } }
}
```
The `css` block is the load-bearing line: explicitly disable Biome's CSS surface so `stylelint` owns it.

### Gate vs watch invocations
```bash
biome ci                       # gate stage — no writes, non-zero on any finding
biome check --write             # local dev — fix what's safe to fix
biome check --write --unsafe    # only when explicitly requested by the user
biome lint --write apps/web/app # narrow lint pass
biome format --write packages   # narrow format pass
```
`biome ci` is the only correct gate command. `biome check --write` is the local convenience. Watch is below.

### Watch mode in `bun run dev`
Biome 2.x ships **no native CLI watcher** — the `--watch` flag does not exist on `biome check`. dean-stack wraps Biome in `chokidar-cli` (root `devDependencies`) so the CLI watcher is real and the IDE stays non-authoritative.

```jsonc
// apps/<name>/package.json
{
  "scripts": {
    "biome:watch": "chokidar \"**/*.{ts,tsx,js,jsx,json}\" --ignore \"**/node_modules/**\" --ignore \"**/dist/**\" --ignore \"**/.turbo/**\" --ignore \"**/routeTree.gen.ts\" --initial --debounce 200 -c \"biome check --write .\""
  }
}
```
Co-runs with Vite + Storybook + Stylelint via Turbo's `with: ["storybook", "biome:watch", "stylelint:watch"]` declared on the `dev` task in root `turbo.json` (see `turborepo`). `--initial` runs Biome once on startup; `--debounce 200` collapses bursts of saves into a single check. Findings surface in the terminal — not just the IDE.

### Suppression syntax (only when truly necessary)
```ts
// biome-ignore lint/suspicious/noExplicitAny: third-party type from <package>
const value: any = legacyApi();
```
Always include the rule path and a reason. Never use the legacy parenthesized form, never `// rome-ignore`.

### Organize imports as an assist action
```jsonc
// biome.json (excerpt)
{
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```
In Biome 2.x, organize-imports is an assist action, not a top-level field. Top-level `organizeImports` is removed.

## Anti-patterns
- **Don't enable `css.linter` or `css.formatter`** — Stylelint owns `.css` (see `stylelint`); enabling Biome's CSS surface produces double-lint and Tailwind false positives.
- **Don't use `// rome-ignore` or `// biome-ignore lint(group/rule)`** — only `// biome-ignore lint/group/rule: reason` is valid.
- **Don't add the legacy top-level `organizeImports`** — configure it under `assist.actions.source.organizeImports`.
- **Don't silently downgrade to a warning** to make CI pass — the gate is zero-warning. Fix the finding or add a justified suppression.
- **Don't recommend Prettier or ESLint** — Biome replaces both for `.ts`/`.tsx`/`.js`/`.json` in this stack.

## Triggers on
biome, biome.json, biome ci, biome lint, biome format, biome watch, biome rule
