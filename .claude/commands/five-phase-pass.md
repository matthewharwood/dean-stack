---
description: Propagate a monorepo change through the dean-stack five-phase pass (P1 apps/web → P2 generator template → P3 regenerate test-project + gate → P4 docs/skill → P5 cross-skill audit). Pass `--baseline` to run P5-only against the cumulative current stack.
argument-hint: [change description] | --baseline
---

<objective>
Drive a change through the dean-stack five-phase pass so the live app, the generator template, the regenerated test-project, the docs, and every skill stay coherent. P1 ships the change; P2 prevents new apps from being born stale; P3 proves the generator still works; P4 keeps the docs/skill that owns the change honest; P5 catches dangling pointers in the rest of the skill ecosystem.
</objective>

<args>
$ARGUMENTS

If $ARGUMENTS starts with `--baseline`, run **P5 only** — audit all skills against the *cumulative* current stack (read CLAUDE.md + README.md + `git log --oneline` to understand what the stack currently is). Skip P1–P4. Treat known prior changes (TS 7 / tsgo, asdf/Volta cleanup, PixiJS 8.18.1 first-party, TurboRepo generator, jotai-family removal) as already-shipped facts — the question is whether the skill ecosystem reflects them.

Otherwise treat $ARGUMENTS as the change description (e.g. "remove jotai-family", "upgrade tsgo to 7.5", "add immer beside jotai"). If empty or ambiguous, ask before proceeding.
</args>

<phases>

### P1 — apps/web
Implement the change in `apps/web/`. Use the matching specialized skill from `.claude/skills/`. Source-code edits only.

### P2 — generator template
Mirror P1's source-level changes into `turbo/generators/templates/app/`. Diffs must be literally identical except for `{{name}}` token substitution. New apps must be born clean.

### P3 — regenerate test-project + gate
Regenerate `apps/test-project` from the updated template (or update in place if simpler).

**Before `bun run check`, run `/kill-servers` (or its inlined steps below) — leftover dev/preview/storybook processes from prior runs are the documented cause of intermittent `ERR_CONNECTION_REFUSED` on Playwright's parallel storybook workers. This is the single highest-yield way to make the gate go green on the first try.**

```bash
pkill -f "storybook dev" || true; pkill -f "vite preview" || true; pkill -f "vite dev" || true
sleep 2
lsof -i :3000 -i :5173 -i :6006 2>/dev/null | grep LISTEN || echo "all clear"
```

Then run `bun run check`. Must be green before P4. Retry once on a known infra flake (cold prebundle cache, port race); a real failure stops the pass — do NOT silently `.skip`.

### P3.4 — Dev fan-out smoke (dev orchestration changes only)
If P1 modified any of: root `turbo.json`, root `package.json`'s `dev` script, any per-app `package.json` `dev` / `storybook` / `biome:watch` / `stylelint:watch` scripts, or `turbo/generators/templates/app/package.json` — smoke `bun run dev` and confirm all four co-runners actually stay alive. The gate (`bun run check`) does NOT exercise the dev workflow, so a broken watcher script (e.g. a tool that no longer ships `--watch`) or an inverted Turbo `with` direction passes the gate but breaks the iPad-over-LAN inner loop on next `bun run dev`.

```bash
pkill -f "storybook dev" 2>/dev/null; pkill -f "vite dev" 2>/dev/null; pkill -f "chokidar" 2>/dev/null; pkill -f "biome check" 2>/dev/null; pkill -f "stylelint" 2>/dev/null; sleep 2
(bun run dev > /tmp/dean-dev.log 2>&1 &) ; sleep 25; pgrep -af "vite dev|storybook dev|chokidar" | head -10; lsof -i :5173 -i :6006 2>/dev/null | grep LISTEN; pkill -f "turbo run dev"; pkill -f "vite dev"; pkill -f "storybook dev"; pkill -f "chokidar"
```

Pass criteria — all four must be true after 25s:
1. `vite dev` process alive, port 5173 LISTEN
2. `storybook dev` process alive, port 6006 LISTEN
3. `chokidar ... biome check` process alive (biome:watch wrapper)
4. `chokidar ... stylelint` process alive (stylelint:watch wrapper)

If any of the four exited or its port is silent, dev is broken. Inspect `/tmp/dean-dev.log` for the failure mode and fix at the orchestration source — `with`-direction in `turbo.json` (must be on the task you invoke, e.g. `dev`, NOT on the watcher), the per-app script (Biome 2.x and Stylelint 16 both ship NO native `--watch` — both are wrapped in `chokidar-cli`), or the root filter.

Skip this step for changes that don't touch dev orchestration (component edits, schemas, tests, docs).

### P3.4.1 — Dev browser-console smoke (any P1 change)
The gate's Playwright runs against `bun run preview` (the production build), so dev-only runtime errors are invisible to it: `react-scan` is gated to `import.meta.env.DEV`, top-level-await module evaluation runs in dev only, side channels (anime.js, PixiJS) initialize via dev paths, and Vite's prebundle cache is dev-only. A broken `applyEngineDefaults` or a stale `.vite/deps` entry passes the gate green and reveals itself only when a human opens the browser.

**An empty error log is NOT proof the page works.** A blank page can render without throwing — React rendered into an empty body, hydration silently no-op'd because the target element is missing, etc. The smoke MUST also assert visible content.

After P3 (and P3.4 if applicable), with `bun run dev` already up:

```js
// /tmp/dean-smoke.mjs — adjust the playwright path to match the workspace install
import { chromium } from "/abs/path/to/node_modules/playwright/index.js";
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const errs = []; const failed = [];
page.on("pageerror", (e) => errs.push(`PAGE: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(`[${m.type()}] ${m.text()}`); });
page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(3000);
const innerText = await page.evaluate(() => document.body.innerText);
const innerHtmlLen = await page.evaluate(() => document.body.innerHTML.length);
const title = await page.title();
const h1 = await page.$$eval("h1", (els) => els.map((e) => e.textContent));
console.log("ERRORS:", errs.length || "(none)", errs.join("\n"));
console.log("FAILED:", failed.length || "(none)", failed.join("\n"));
console.log("TITLE:", title, "H1:", JSON.stringify(h1), "BODY_LEN:", innerHtmlLen);
console.log("BODY:", innerText.slice(0, 200));
await browser.close();
const blank = innerText.trim().length < 5;
process.exit(errs.length + failed.length === 0 && !blank ? 0 : 1);
```

```bash
bun /tmp/dean-smoke.mjs   # exit 0 = pass; non-zero = fix the cause
```

Pass criteria — ALL must be true:
1. `pageerror` list empty
2. No `error` / `warning` console messages
3. No 4xx/5xx responses
4. **`document.body.innerText.trim().length >= 5`** — proves the page actually rendered something visible, not just an empty React shell

The most common failure modes:
1. **Stale Vite prebundle cache** after a renamed import — `rm -rf apps/<name>/node_modules/.vite` and restart dev
2. **Side-channel API misuse** — e.g. `utils.set(engine, ...)` instead of `engine.defaults.foo = ...` (animejs); `app.stage.addChild(...)` called during render instead of inside `usePixiApp`'s `setup` (PixiJS)
3. **Broken module evaluation chain** — a top-level throw in `client.tsx` (or any module imported by it) breaks `hydrateRoot` and surfaces unrelated downstream errors like "react-scan failed to load"
4. **Hydration target mismatch** — TanStack Start in SPA mode renders the full document via `__root__`'s `<html>...</html>`. `client.tsx` must `hydrateRoot(document, <StartClient />)` (importing `StartClient` from `@tanstack/react-start/client` — the **subpath** export, NOT the main entry). `hydrateRoot(document.getElementById("root"), ...)` silently no-ops because no `<div id="root">` exists in the SSR output, leaving the page blank with NO error.
5. **Two React copies via Bun's hashed `.bun/...@<hash>` cache** — produces "Invalid hook call" / "null useContext" errors. Add `resolve.dedupe: ["react", "react-dom", "@tanstack/react-router"]` to `vite.config.ts`.
6. **react-scan v0.5.x + TanStack Router's `HeadContent`** — react-scan's React-19 instrumentation breaks `useContext` inside `HeadContent`'s `useRouter`. Symptom: app renders the route's error UI ("Something went wrong / Cannot read properties of null"). Mitigation: keep react-scan in Storybook only; do NOT load it in the app's `client.tsx` or via `__root__`'s `head.scripts`.
7. **Missing static asset** — typically `/favicon.ico`. dean-stack's `__root__` route ships an inline data-URI favicon via `head.links`; verify it's still present.

Re-run after fixing — must reach exit 0 before P4.

### P3.5 — Render-quality visual check (UI-touching changes only)
If P1 modified any `*.tsx` file (component, route, hook that fronts a side channel), after the gate passes, run a Playwright session with `react-scan` loaded — **point at the affected story** — and inspect for highlighted re-render boxes. `react-scan` is loaded automatically in Storybook dev via `.storybook/preview.tsx` (gated by `import.meta.env.DEV`); the Storybook Playwright project hits dev mode, so render highlights are live there. **Not loaded in the app dev server** — react-scan v0.5.x crashes TanStack Router's `HeadContent`; component-level re-render diagnostics happen in Storybook only until that incompatibility is resolved upstream. Unexpected highlights are real bugs — typically a side-channel violation (anime.js / PixiJS in render), an unstable atom return, or a nested component definition. Fix the cause; never add manual `useMemo` / `useCallback` / `React.memo` (forbidden — see `react-compiler-rules`). Skip this step for non-UI changes (docs, configs, schemas). There is intentionally **no skill for `react-scan`** — it has no version-specific deprecations or opinionated patterns.

### P3.6 — React-doctor scanner pass (UI-touching changes only)
If P1 modified any `*.tsx` file, after the gate passes, run:

```bash
npx -y react-doctor@latest . --verbose --diff --fail-on error
```

`--fail-on error` blocks on real lint errors; score regressions are informational and surface in the final report (a 0–100 health score). Owned by the `react-doctor` skill — see `.claude/skills/react-doctor/SKILL.md`. Skip for non-UI changes. Deliberately NOT in `bun run check` — it's `npx`-resolved (not pinned), score-based (not pass/fail), and phones home by default — so it lives at the post-gate workflow tier instead. CI runs this advisory via `.github/workflows/react-doctor.yml` on PRs.

### P4 — docs / owning skill
Update `CLAUDE.md`, `README.md`, and the `.claude/skills/<name>/SKILL.md` that owns the changed tech (front-matter description, "Defers to", "When to invoke", patterns, anti-patterns, "Triggers on"). Update mermaid diagrams and known-gap entries in README if names changed.

**Append to the `<sweep-tokens>` table below if this change introduces a new "we no longer use X" / "we renamed Y to Z" / "we excluded W" rule.** That makes the change discoverable to all future P5 runs.

### P5 — cross-skill audit (two roles, run in this order)

**P5.0 — Mechanical sweep (orchestrator runs `grep` directly).**
Run `grep -rn -E '<pattern>' .claude/skills/ CLAUDE.md README.md` for every entry in `<sweep-tokens>` below — exclude `potential_skills/`, `node_modules`, `.turbo`, `dist/`. Build a flat `file:line:token` list. For each hit, classify as either:
- **Stale** — token outside its allow-context (e.g. `atomFamily` not adjacent to "don't use" wording).
- **Deliberate** — token inside its allow-context (e.g. `@pixi/` inside `pixijs-migration-v8/SKILL.md`).

Mechanical sweep covers *literal substring* drift exhaustively. Do NOT delegate this to agents — they skim and miss occurrences in cross-cutting boilerplate (the `Pillar 4 means: bun run check runs … → tsc --noEmit → …` line, "Defers to" lists, trigger word tables). The grep is bulletproof; the LLM is not.

For per-change runs: sweep only for the token(s) introduced by THIS change. For `--baseline`: sweep the full table.

**P5.1 — Narrative agents (parallel Explore subagents).**
Spawn one agent per topic family (state: jotai+idb; build: vite+nitro+turborepo+biome+stylelint+tailwind+t3-env; types: ts+zod; testing: bun-test+playwright-*+storybook-*; canvas: pixijs-*; framework: tanstack-*+react-*+animejs; runtime: bun*+node). Pass each agent the P5.0 sweep findings for files in its scope so it does NOT duplicate the mechanical pass. Each agent's job is **narrative only**:
- Conceptual drift (e.g. "this skill frames PixiJS as third-party when it's first-party now")
- Self-contradictions (rule on L34 vs example on L164)
- Wrong package names (`@tanstack/start` vs `@tanstack/react-start`)
- Stale ownership claims, dead "Defers to" links, removed APIs in trigger lists
- Patterns inconsistent with the current Pillars

**P5.2 — Aggregate + classify.**
Merge P5.0 stale-list + P5.1 findings, dedupe. For per-change runs: trivial substitutions (renamed token in a list, version bump in a `pinned:` comment) apply immediately and are reported. Narrative or load-bearing findings escalate to a punch list with `file:line` and proposed text — wait for user review. For `--baseline` runs: everything is a punch list, grouped by topic. Do not auto-edit.

</phases>

<sweep-tokens>
The known-stale-token table. Each row: regex pattern, why it's stale, allow-context (if any). Append rows here every time P4 introduces a new "we no longer use X" rule. Order doesn't matter — grep them all.

| Pattern | Why stale | Allow-context |
|---|---|---|
| `tsc --noEmit` | TS 7 / tsgo migration — binary is `tsgo` now | none — always stale |
| `\btsc -p\b` | Same — TS 7 binary | none |
| `jotai-family` | Package removed — replaced by module-scope `Map<id, atom>` + `selectAtom` | OK adjacent to "don't use" / "not used" / "excluded" wording; OK in `jotai/SKILL.md` anti-patterns; OK in `README.md` known-gap historical context |
| `\batomFamily\b` | Same as `jotai-family` | Same as above; also OK in `_OWNERSHIP_MATRIX.md` jotai inventory IF qualified with "intentionally excluded" |
| `@pixi/` | Deprecated v7 sub-packages — single `pixi.js` package only in v8 | OK in `pixijs-migration-v8/SKILL.md` (its job); OK in CLAUDE.md "never the deprecated" callout |
| `\.tool-versions` | Cleaned up — `.nvmrc` is the only Node pin | OK in `node/SKILL.md` "we don't use" callout; OK in trigger word tables |
| `\bvolta\b` | Cleaned up — see above | Same as `.tool-versions` |
| `\basdf\b` | Cleaned up — see above | Same as `.tool-versions` |
| `"pipeline"\s*:` | Turbo v1 syntax — Turbo v2 renamed to `"tasks"` | none — always stale in `turbo.json` and skill examples |
| `@tanstack/start[^-]` | Wrong package — actual is `@tanstack/react-start` | none |
| `@storybook/react-webpack` | Wrong builder — `@storybook/react-vite` is pinned | OK in deliberate "don't use" callouts |
| `\bvitest\b` | Wrong unit-test runner — `bun:test` is pinned | OK in deliberate "don't use" callouts |
| `\bjest\b` | Same as `vitest` | Same |
| `Provider initialValues` | Removed in Jotai 2.0 | OK in deliberate "don't use" callouts |
| `\bloadable\b` *(from `jotai/utils`)* | Deprecated since Jotai 2.17 — use `unwrap` | OK in deliberate "don't use" callouts |
| `from ['"]lodash` | Forbidden by `micro-utilities` — use native ECMAScript or `just-*` | OK in `micro-utilities/SKILL.md` "don't import" callouts, in `_OWNERSHIP_MATRIX.md` row description, or in CLAUDE.md guidance |
| `JSON\.parse\(JSON\.stringify` | Forbidden by `micro-utilities` — use `structuredClone` (handles `Date`/`Map`/`Set`/`RegExp`/cycles, won't break IDB records) | OK in `micro-utilities/SKILL.md` anti-pattern callout |
| `biome\s+check[^"]*--watch` | Biome 2.x ships **no** native CLI watcher — `--watch` is not a flag on `biome check`. dean-stack wraps Biome in `chokidar-cli` for `biome:watch`. | OK in `biome/SKILL.md` "ships no native CLI watcher" explanation; OK in this command's docs/history |
| `stylelint\s+[^"]*--watch` | Stylelint 16 dropped the native `--watch` flag. dean-stack wraps Stylelint in `chokidar-cli` for `stylelint:watch`. | OK in `stylelint/SKILL.md` "dropped the native --watch flag" explanation; OK in this command's docs/history |
| `"with":\s*\["dev"\]` | Inverted `with` direction — Turbo's `with` is directional from the task you invoke. Putting `with: ["dev"]` on a watcher means the watcher only co-runs `dev` if you invoke the watcher directly, which is backwards for `bun run dev`. The correct shape is `with: ["storybook", "biome:watch", "stylelint:watch"]` on the `dev` task. | OK in `turborepo/SKILL.md` "would only co-run dev when you explicitly invoke a watcher" anti-pattern explanation |
| `utils\.set\s*\(\s*engine` | Misuse of animejs's animation API as an engine-config setter. `utils.set` pipes values through animejs's value parser (`decomposeRawValue`), which throws `str.includes is not a function` on a non-string `defaults` object. The documented v4 path is direct property assignment: `engine.defaults.duration = 400; engine.defaults.ease = "out(2)"`. | OK in `animejs/SKILL.md` anti-pattern callout; OK in this command's docs/history |
| `import\s*\{[^}]*\bdefaults\b[^}]*\}\s*from\s*['"]animejs['"]` | `defaults` is **not** a top-level animejs export — only `engine` is, and `defaults` is a property on the `engine` instance. Use `engine.defaults.<key> = value` instead. | OK in `animejs/SKILL.md` "not a separate named export" callout |

</sweep-tokens>

<subagents>
For P5.1 only. Spawn parallel Explore subagents — one per topic family. Pass each agent (a) its scoped skill file paths, (b) the ground-truth current stack (read from CLAUDE.md), (c) the P5.0 sweep findings for files in its scope. Tell each agent **explicitly NOT to redo the mechanical token search** — that's already done — and to focus on narrative drift, contradictions, wrong package names, and stale conceptual framings.

Do not spawn subagents for P1/P2/P4 single-file edits or P3 single gate run.
</subagents>

<acceptance_criteria>
- P3: `bun run check` green.
- P4: zero canonical references to the old name in CLAUDE.md / README.md / the owning skill, except deliberate "we don't use X" callouts. If P4 introduced a new "we no longer use X" rule, the `<sweep-tokens>` table above gained a row.
- P5.0: mechanical sweep complete; every hit classified Stale or Deliberate.
- P5.1: every `.claude/skills/**/SKILL.md` examined by a topical agent for narrative drift.
- P5.2: per-finding punch list with `file:line` + proposed fix; trivial fixes already applied (per-change runs only).
- Final report: phase-by-phase status, gate result, sweep summary (N tokens scanned, M stale hits found), narrative-finding count, list of fixes applied, list of fixes deferred for review.
</acceptance_criteria>

<verification>
- After P3 (and again after any P5 code-block edits): `bun run check`.
- After P5: re-run the P5.0 sweep — surviving Stale hits must be zero. Surviving Deliberate hits must each match an allow-context in the table.
- Sanity grep for the SPECIFIC old name introduced by THIS change (per-change runs):
  `grep -rn "<old-name>" --include='*.md' --include='*.ts' --include='*.tsx' --include='*.json' .` — surviving hits must be deliberate or in `potential_skills/`.
</verification>

<output>
File edits scoped per phase as listed above. Final summary printed to the conversation, not to a file (per dean-stack: don't create planning docs unless asked).
</output>

<maintenance>
This command's `<sweep-tokens>` table is the durable artifact of every prior P4. When a future change retires a package, renames a binary, replaces an idiom, or excludes an API, append a row in P4 — that's the "make this discoverable to all future P5 runs" step. The table is append-only; never remove rows even after the codebase has long since stopped containing the old token, because the trigger words live on in skill docs and matrix entries.
</maintenance>
