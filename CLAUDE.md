# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

`dean-stack` is a rapid-prototyping platform for building small browser games for the user's son. It optimizes for **iteration speed on a live iPad over LAN**, not for server-side anything. There is no backend. All state is local. Deployment target is GitHub Pages.

The architecture below is **load-bearing** — it is what makes the iPad live-refresh workflow tolerable, what keeps the app installable offline, and what lets components be built in isolation. Read this file before suggesting any architectural change. If a request appears to violate one of the Four Pillars, push back before implementing.

## Stack snapshot

- **Runtime / package manager**: Bun 1.3.13 (pin via `packageManager`); Node 25 for tools that need it
- **Monorepo**: TurboRepo
- **Language**: TypeScript 7 via the Go-based native compiler — `@typescript/native-preview` (the `tsgo` binary; replaces `tsc`). Source: [microsoft/typescript-go](https://github.com/microsoft/typescript-go). Strict mode + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax`. Same `tsconfig.json` shape as TS 6 — module resolution and type checking are at parity per upstream's own status table.
- **Framework**: TanStack Start (React) — **SPA mode with full prerender**; no server functions, no server loaders
- **Build engine**: Vite + TanStack Start in SPA + full prerender mode (drives Nitro v3 internally). Build output lands at `apps/<name>/dist/client/`; the build script copies `index.html` → `404.html` and `touch`es `.nojekyll` for GitHub Pages.
- **UI**: React 19 with React Compiler enabled
- **Styling**: Tailwind
- **Animation**: anime.js v4 (named-import API only — `createTimeline`, `createAnimatable`, etc.)
- **Canvas / 2D rendering**: PixiJS 8.18.1 — first-party for any canvas-based UI (game scenes, sprites, particle effects, custom rendering). Mounted via the `usePixiApp(canvasRef, setup, deps)` hook in `apps/<name>/app/canvas/`. Same side-channel rule as anime.js: render is pure; all `new Application()` / `Ticker` / sprite mutation lives in `useEffect`. `prefers-reduced-motion: reduce` short-circuits Ticker animations. Game **state** stays in `atomWithIDB` (Pillar 3) — Pixi DisplayObjects never own data. The 24 `pixijs-*` skills under `.claude/skills/` cover the API surface; `usePixiApp` is the dean-stack lifecycle wrapper.
- **State**: Jotai — and only Jotai. Do not introduce Zustand, Redux, Recoil, or Context-as-state.
- **Persistence**: IndexedDB via the `idb` library
- **Validation**: Zod 4 — the source of truth for every type
- **Env**: T3 env (`@t3-oss/env-core`) — client-only on GH Pages, server slot kept empty for future scale
- **Linters/formatters**: Biome (TS/JS), Stylelint with Tailwind plugin (CSS)
- **Component dev**: Storybook (Vite builder, shares app config)
- **PWA**: Vite PWA plugin (Workbox)
- **Testing**: Bun test (unit) + Playwright (every Storybook story and every application workflow, including offline smoke)
- **CI/Deploy**: GitHub Actions → GitHub Pages

If you find yourself reaching for a tech outside this list, stop and ask. Anything in skill files referencing pre-v4 anime.js, pre-v4 Zod, or pre-19 React idioms is wrong by definition — rewrite to the latest API.

## The Four Pillars — non-negotiable

These rules govern every change. Violating any of them is a bug, not a style issue.

### 1. Storybook-first

A component does not exist until it has a story. Every `*.tsx` component file ships with a sibling `*.stories.tsx`. Build the smallest piece in isolation in Storybook **before** wiring it into a route. Compose smaller components into larger ones; never start at the route level.

Storybook shares the app's Vite, Tailwind, and alias config from a single source — never fork them. **Every story is exercised by a Playwright test** (see Testing section); stories are not "just visual references" — they are the test surface.

### 2. Zod-first types

Every component declares its props as a `z.object` schema. The TypeScript type is `z.infer<typeof Schema>` — **never hand-written**. Same rule applies to atom values, IDB records, env vars, route params, and any boundary input.

**Runtime parsing is dev-only.** Use a `defineComponent(schema, fn)` helper that calls `schema.parse(props)` when `import.meta.env.DEV` and is a pass-through in production. The dev branch must be tree-shaken from the production bundle. In dev, Zod parse failures throw and surface in the browser console — fix them before continuing. Production relies on TypeScript at compile time.

When running the app in dev, watch the browser console: any Zod runtime error is a failed contract and must be fixed before moving on, same as a TS error.

### 3. IDB-first state

**IDB is the source of truth. Jotai is an in-memory cache of IDB.** Memory state that is not mirrored to IDB is a bug.

Hydration pattern — implement exactly this, every time:

1. A single root `<Suspense>` boundary uses React 19's `use(idbHydrationPromise)` to load the app's persisted state **once** at startup.
2. After hydration resolves, every `atomWithIDB` reads its initial value **synchronously** from already-loaded in-memory state. No per-atom suspense.
3. On atom set: validate with the Zod schema, write through to IDB (debounced ~150ms), and broadcast on a `BroadcastChannel` so other tabs/iframes (Storybook, second browser window) re-hydrate.
4. Schema version bumps run an IDB migration **before** the root suspense promise resolves.

This pattern is what makes the iPad live-refresh workflow viable: Vite HMR or a full reload does not erase progress because IDB rehydrates the whole app on every mount. **The iPad-over-LAN workflow is the primary reason IDB-first exists** — any feature that puts state outside IDB will be discovered the moment the kid loses progress on a hot reload. Fix it at the architecture level, not by patching.

Ephemeral UI state (focus, hover, transient toggles) is allowed in plain `useState`. Anything representing game progress, settings, content, or anything the kid would notice losing goes through `atomWithIDB`.

**Recovering from a stale browser DB (`VersionError`).** Iterating on the schema on a long-lived dev browser will eventually leave the browser at a version higher than what's in code (an experiment got reverted, a branch was switched, etc.). `openDB` then throws `VersionError: An attempt was made to open a database using a lower version than the existing version` and the app fails to boot. Two recovery paths:

1. **Bump `DB_VERSION` in `apps/<name>/app/state/db.ts` to a number higher than what the browser has** and add a no-op `if (oldVersion < N) {}` hop to keep the cumulative-migration shape honest. Cheapest unblock; the cost is a permanent dead hop in the migration code that ships forever. Fine while there are no real users; squash before any deploy that real people use.
2. **Click "Clear state" in the gear-menu (`DevMenu`)**, or run `indexedDB.deleteDatabase("<DB_NAME>")` in the console. `clearAllStorage` (in `app/lib/clear-storage.ts`) is the production-grade recovery: it `closeDB()`s our own connection first (otherwise the open handle blocks `deleteDatabase`, `onblocked` resolves, the reload reopens the same DB unchanged, and the button looks broken), then iterates `indexedDB.databases()` and deletes by name — version-agnostic, blows away whatever stale version the browser holds. Anything new added to `db.ts` that owns a connection MUST also be closed in `closeDB()` for "Clear state" to keep working.

Prefer option 2 — it's reversible by reload and leaves no residue in the schema. Use option 1 only when you can't reach the dev menu (e.g. the app is throwing before the menu mounts).

### 4. CLI-gate-first — zero-warning policy

The quality gate has two flavours, both with the same purity rule (any warning = failure):

- **`bun run check`** — the full gate. Builds every app and runs every Playwright project (storybook + app + app-offline). This is what CI runs and what verifies a release-quality state. The chain:
  ```
  biome ci  →  stylelint --max-warnings 0  →  tsgo --noEmit  →  eslint-plugin-sonarjs (check:sonar)  →  bun test  →  build  →  playwright test (storybook + app + app-offline)  →  react-doctor --diff  →  fallow dead-code
  ```
- **`bun run check:fast`** — the pre-push gate. Same chain, except the Playwright run is restricted to `--project=storybook`. The `app` and `app-offline` projects spin up `vite preview` against `dist/`, so without a fresh build they'd be re-validating yesterday's bytes — meaningless. They're CI's job. The `storybook` project drives `storybook dev` (HEAD-valid every run) so it's safe to gate locally:
  ```
  biome ci  →  stylelint --max-warnings 0  →  tsgo --noEmit  →  eslint-plugin-sonarjs (check:sonar)  →  bun test  →  playwright test --project=storybook  →  react-doctor --diff  →  fallow dead-code
  ```

**`bun run check:fast` runs automatically on `git push`.** A pre-push hook installed by `bash scripts/install-hooks.sh` (auto-run as the `prepare` script after every `bun install`) blocks the push if the gate is red. Override only intentionally: `git push --no-verify`. CI then runs the full `bun run check` on the PR.

**Any warning from any tool is a failure.** If either gate is red, stop the current task, fix it, and re-run until green before proceeding. This applies equally to:

- Biome lint or format violations
- Stylelint violations
- TypeScript errors
- Zod runtime errors surfaced in the browser console during dev
- Failing `bun test` cases
- Failing Playwright tests (Storybook stories or application workflows)
- **eslint-plugin-sonarjs findings** — runs `eslint --config eslint.sonar.config.mjs --max-warnings 0` (the per-app `check:sonar` task) in both gates. Local-only second-opinion lint (NO SonarQube server, NO `sonar-scanner`); `eslint.sonar.config.mjs` loads ONLY `sonarjs.configs.recommended` so there's zero overlap with Biome. Calibrated rule policy lives in that file with rationale comments: `pseudo-random` off (Math.random drives visual variety, no security boundary); `void-use` off (fire-and-forget Promise dispatch in sound/db/attack-fx is intentional); `cognitive-complexity` raised to 50 (game state machines are intrinsically branchy on operator/shape/comparator); `no-nested-functions` off for `tests/**` only (Playwright IDB seeding's required callback shape). When sonarjs fires on app code, prefer the canonical refactor (extracted helper, lookup table, IIFE, dispatch table) over a disable comment — see `eslint-plugin-sonarjs/SKILL.md` for the full pattern table. CI runs the same gate via `.github/workflows/sonarjs.yml` as a separate signal — but the local gate is the source of truth.
- **react-doctor issues on the diff** — runs `npx react-doctor . --diff` at the end of both `check` and `check:fast`. Catches issues outside Biome/Stylelint's scope: stale-closure setState patterns (`setState({ ...state, ... })` → `setState(prev => ({ ...prev, ... }))`), barrel-import tree-shaking misses, redundant Tailwind size axes (`h-N w-N` → `size-N`), heading weight at display sizes (`font-bold` on `<h3>` → `font-semibold`). The `--diff` mode only scans files changed vs main, so it stays fast and only flags YOUR work. CI also runs the same check via the `react-doctor.yml` workflow as a separate signal — but the local gate is the source of truth.
- **fallow dead-code findings** — runs `npx fallow dead-code --fail-on-issues` at the end of both gates. Owns the cross-cutting structural checks Biome/Stylelint/tsgo can't see: unused files / exports / types / dependencies, **circular dependencies**, boundary violations, unlisted dependencies. Project config lives at the repo root in `.fallowrc.json`: `turbo/generators/templates/**` is excluded (template files become real apps via `bun gen:app`; fallow can't follow that), `**/*.gen.ts` is excluded (TanStack Router generator output), and a small `ignoreDependencies` list covers extends-style consumers fallow can't trace statically (`@dean-stack/biome-config` via `biome.json` extends, `@dean-stack/tsconfig` via tsconfig extends, `babel-plugin-react-compiler` enabled by TanStack Start internally, `nitro` driven by TanStack Start internally, `@turbo/gen` consumed only by the ignored generator config, `@dreamsicle.io/stylelint-config-tailwindcss` consumed via `packages/stylelint-config`'s `extends`, `chokidar-cli` invoked from `biome:watch` + `stylelint:watch` package.json scripts). CI runs the same gate via `.github/workflows/fallow.yml` plus uploads the full `fallow` health report (complexity hotspots) as an artifact for review — the health side is informational, not gating.

`bun run dev` is **not** part of the gate — it runs Stylelint and Biome in watch mode in parallel with Vite for fast inner-loop feedback only. **Stylelint must error from the CLI watcher**, not just in the IDE — the IDE is not the source of truth and may not even be open.

## Architecture decisions — the *why*

### TanStack Start: SPA + full prerender, not SSR

GitHub Pages is static-only. Configure TanStack Start's Vite plugin in SPA mode with `prerender.enabled: true` and `crawlLinks: true`; **prerender every route reachable from `<Link>` from the home page at build time**. The output is the SPA shell at `dist/client/index.html` (renamed from the plugin's `_shell.html` via `spa.prerender.outputPath: "/index"`); the build script copies it to `404.html` so GH Pages serves the same shell on any deep URL. The client hydrates and reads from IDB to fill in real content.

There are no server functions, no server loaders, no runtime server code. All "dynamic" content comes from IDB after hydration. If a use case appears that needs a server, that use case does not belong on GitHub Pages — surface the constraint, do not silently introduce a server dependency.

### Error & notFound boundaries — exact rules

Every dean-stack app wires **four** TanStack Router boundary slots, and the wiring is gate-asserted in `apps/<name>/app/router.test.ts` so a future refactor can't silently drop them. Read the patterns + rationale in `.claude/skills/tanstack-router-routing/SKILL.md` ("Error & notFound boundaries"); the rules below are the load-bearing summary.

- **`__root__.tsx` `errorComponent`** — per-route boundary catches throws from anywhere inside the route tree (the common case: an atom getter that hits a Zod-mismatched IDB record, a side-channel setup throw, a render bug deep in a game route).
- **`__root__.tsx` `notFoundComponent`** — handles `notFound()` calls that bubble up through the route tree.
- **`router.tsx` `defaultErrorComponent`** — router-level fallback for what escapes the per-route boundary: route-resolution throws, loader rejects, errors during route preload.
- **`router.tsx` `defaultNotFoundComponent`** — same fall-through for `notFound()` outside the route tree.
- **The error component re-throws when `typeof window === "undefined"`** — that path runs during prerender; without the re-throw, `prerender.failOnError: true` would let a baked-in "Something broke" page silently ship as static HTML for a route that should have failed the build.
- **Per-route games SHOULD declare their own `errorComponent`** for tighter recovery UIs (e.g. "this level is broken — pick another"). The root-level boundary is the safety net, not the first line.
- **The boundary does NOT swallow Pillar 2 visibility.** React still logs caught errors to console, and our `RouteError` adds an explicit `console.error` in DEV. Zod runtime errors in dev stay loud.

### PWA / service worker — exact rules

Workbox's NavigationRoute will swallow the SPA fallback unless configured carefully. Follow these rules every time:

- **Precache only the app shell** — HTML, JS, and CSS bundles, the manifest, icons. Do not precache per-route data.
- **Runtime-cache static assets** (images, fonts) with `CacheFirst`.
- **Let TanStack Router handle all navigation client-side.** The Workbox navigation fallback points at the prerendered shell, not at per-route HTML files.
- **Test offline deep-links explicitly.** Load `/some/deep/route` with the network throttled to offline; the router must resolve it from cache without a server round-trip. This test belongs in CI (Playwright).
- **The service worker never touches IDB.** IDB is the app's responsibility; the SW handles assets only.

### React 19 + React Compiler — purity rules

The React Compiler is enabled. It assumes pure render functions. Therefore:

- **Do not write `useMemo`, `useCallback`, or `React.memo` manually.** The compiler handles memoization. Manual memo is noise and can mask purity bugs. Code review removes it on sight.
- **Jotai hooks are pure subscribers — safe to use directly in render.** No special handling needed; the compiler is fine with them.
- **anime.js touches mutable refs and is a side channel — never call anime.js or read animated DOM values during render.** All anime.js code lives inside `useEffect` / `useLayoutEffect` or event handlers. The DOM ref is mutated outside React; render must not depend on the animated values.
- Prefer React 19 primitives where they fit: `use(promise)` for async reads, `useTransition` / `useDeferredValue` for non-urgent updates, `useOptimistic` for mutation UIs.

### Animation guidelines (anime.js v4)

- Animations are subtle, elegant, and purposeful. They communicate state change; they do not decorate.
- Always honor `prefers-reduced-motion` — short-circuit to no-op or instant transition.
- Use a `useAnime(ref, params, deps)` hook so cleanup is consistent and the side-channel rule above is enforced by construction.
- anime.js v4 only. v3 syntax in any reference material is wrong — rewrite for v4.

### Canvas / 2D rendering (PixiJS v8.18.1)

PixiJS is a **side channel** the same way anime.js is. The Pixi scene graph mutates the canvas DOM outside React's reconciler; render must stay pure.

- Use **`usePixiApp(canvasRef, setup, deps)`** from `apps/<name>/app/canvas/use-pixi-app.ts`. It owns the lifecycle: async `Application.init({ canvas, resizeTo, preference: "webgl", autoStart: !reducedMotion })`, the user `setup` callback (where you `app.stage.addChild(...)` and `app.ticker.add(...)`), and `app.destroy(true, { children: true, texture: true })` on unmount. Cancellation handles the React-StrictMode double-mount race.
- The wrapping component renders a `<canvas ref={canvasRef}>` inside a sized `<div>`. **Pixi never creates DOM nodes**; React owns the canvas element, Pixi only paints into it.
- Setup receives `{ reducedMotion: boolean }` — when true, **do not register Ticker callbacks**. Static frames still render; only motion is suppressed. This keeps the same discipline as `useAnime`.
- **Game state stays in `atomWithIDB`** (Pillar 3). Pixi `DisplayObject`s never own data — they read derived values via refs that the React component updates from atom subscriptions. Lose this and the iPad-over-LAN reload erases progress.
- **Component props stay Zod-validated** (Pillar 2). `defineComponent(schema, fn)` wraps any pixi-mounting component the same as any other.
- Pixi's `Application.init` is browser-only. Importing types/values from `pixi.js` at module load is safe (no Canvas/WebGL touched until `init`); the `useEffect`-only init keeps SSR / TanStack Start prerender safe — they emit an empty `<canvas>` and the SPA paints into it on hydration.
- Use the **single `pixi.js` package** (v8) — never the deprecated `@pixi/*` sub-packages. Import names: `Application`, `Container`, `Sprite`, `Graphics`, `Text`, `Ticker`, `Assets`, etc. The 24 `pixijs-*` skills under `.claude/skills/` cover every surface area (scene graph, application options, assets, events, color, math, ticker, accessibility, performance, environments, filters, blend modes, custom rendering, migration from v7).
- Headless test reliability: `preference: "webgl"` is the default in `usePixiApp` because Playwright's headless Chromium runs WebGL via SwiftShader more reliably than WebGPU. Pixi falls back to canvas if WebGL is unavailable.

### Linting split

- **Biome** owns `.ts` / `.tsx` / `.js` / `.json` — format and lint.
- **Stylelint** (with the Tailwind plugin) owns `.css` — knows Tailwind directives.
- **Do not enable Biome's CSS linter.** It overlaps with Stylelint and does not understand Tailwind.

### Testing — Playwright everywhere, Bun test for units

Two tools, clearly partitioned:

- **Playwright** drives **every Storybook story** and **every application workflow**. Stories get a Playwright test that mounts the story URL, exercises its play function / interactions, and asserts on visible state. Application routes get Playwright tests for end-to-end workflows — including the offline-deep-link PWA check. Playwright is also the only thing that can validate the IDB hydration contract end-to-end (real browser, real IndexedDB).
- **`bun test`** is the unit-test layer. Use it whenever a piece of logic is testable in isolation without a DOM or browser: pure functions, Zod schema edge cases, atom reducers, IDB migration logic, parsers, derived selectors. If it does not need a browser, it belongs in `bun test` — it is dramatically faster than booting Playwright.

Both layers run as part of `bun run check`. Neither layer is optional. If a piece of behavior has both a unit-testable core and a UI surface, write **both** tests — the unit test for fast inner-loop feedback, the Playwright test for the integrated guarantee.

**ASK FIRST — every time you are about to write or modify a Playwright test:**

Before writing any Playwright test, prompt the user. Ask explicitly how they want the test structured for the change at hand. Do not assume — Playwright test design (selectors, waits, fixtures, what to assert, mocking strategy, story-level vs route-level) is a per-feature decision the user wants to make. Surface options like:

- Story-level test (Playwright pointed at the Storybook URL) vs application-level test (Playwright pointed at the app)
- What to assert: visible text, ARIA state, screenshot, IDB contents, network calls
- Selector strategy: role-based, test-id, text
- Setup: fresh IDB per test, seeded IDB, network offline, throttled network
- Reduced-motion: forced on or off

Wait for the user's answer before writing the test. This rule is load-bearing — Playwright tests calcify the spec, and the user wants to own that decision case-by-case.

`bun test` does not require this prompt — go ahead and write unit tests directly when the logic is obviously unit-testable.

### T3 env on GitHub Pages

There is no server runtime, but T3 env still earns its keep: it validates `VITE_*` client vars at build time and gives a typed `env` import. Set up both `client` and `server` slots so a future move beyond GH Pages does not require a refactor. The `server` slot stays empty for now.

### SEO and social — exact rules

The deploy target is GitHub Pages, but the audience includes LinkedIn previews, blog post embeds, and AI assistants citing the project. The SEO contract is intentionally narrow — every piece is static or build-time, never server-rendered.

- **One module owns the contract.** `apps/<name>/app/lib/seo.ts` exposes `buildSeoMeta`, `buildSeoLinks`, and `buildJsonLd`. All three read from the T3-validated env (`VITE_SITE_URL`, `VITE_SITE_DESCRIPTION`, `VITE_OG_IMAGE`, `VITE_AUTHOR_NAME`, `VITE_AUTHOR_URL`, `VITE_TWITTER_HANDLE`). Components never construct `<meta>` JSX — head injection lives at the route level via TanStack Router's `head` callback.
- **Defaults at the root, overrides at the leaf.** `__root.tsx` calls `buildSeoMeta({ path: "/" })` so every route gets sensible defaults; per-tag overrides (`title`, `description`, `og:*`, `twitter:*`) come from the leaf route returning its own `buildSeoMeta({ path, title, description })`. TanStack Router deep-merges meta entries by key, so deeper routes win.
- **Canonical is per-route, NOT root.** Link entries with the same `rel` do not deduplicate, so emitting `rel="canonical"` at the root would produce two on every leaf page. Each route — including `index.tsx` — must return `links: buildSeoLinks({ path })`. The root deliberately skips canonical.
- **Static `public/` files only.** `robots.txt`, `llms.txt`, and `og-card.svg` (1200×630) live under `apps/<name>/public/`. No server route at `/sitemap[.]xml.ts`, `/robots[.]txt.ts`, or `/llms[.]txt.ts` — the LLMO doc's server-route patterns are architecturally incompatible with SPA + GH Pages. The sitemap is generated at build time by `scripts/build-sitemap.ts`, which walks `dist/client/**/*.html`, excludes `404.html`, and emits `dist/client/sitemap.xml` keyed off `VITE_SITE_URL`.
- **JSON-LD lives in the root `head` `scripts` slot.** `WebSite` + `SoftwareApplication` schemas are emitted once per page. Per-route Article schemas can be appended later by adding a `scripts` entry to the leaf's head.
- **No Open Graph image generation pipeline.** The shipped `og-card.svg` works for X/Bluesky out of the box; LinkedIn and Facebook prefer PNG/JPG, so swap in a 1200×630 raster when that matters. Don't introduce an image-generation dep just to convert it.

The contract is verified end-to-end by `apps/<name>/tests/seo.app.spec.ts`. Any new top-level route must add its own `head` returning `buildSeoLinks({ path })` or the test fails.

## Repository layout (TurboRepo)

The codebase is a monorepo. Expect this shape — refine as it lands, but keep the split:

```
dean-stack/
├── apps/
│   └── web/                     # TanStack Start app
│       ├── app/
│       │   ├── routes/          # file-based routing
│       │   ├── components/      # each: index.tsx, schema.ts, stories.tsx, test.tsx
│       │   ├── state/           # atomWithIDB, idb open + migrations, BroadcastChannel sync
│       │   ├── motion/          # anime.js wrappers + presets
│       │   ├── lib/             # defineComponent, atomWithIDB factory
│       │   ├── styles/
│       │   └── env.ts
│       ├── vite.config.ts       # tanstackStart + Tailwind v4 + VitePWA + base/baseURL
│       └── vite.shared.ts       # plugins shared with .storybook/main.ts (NEVER fork)
├── packages/
│   ├── schemas/                 # shared Zod schemas
│   ├── tsconfig/                # shared tsconfig bases
│   ├── biome-config/            # shared Biome config (root: false)
│   └── stylelint-config/        # shared Stylelint config
├── turbo/
│   └── generators/
│       ├── config.ts            # `turbo gen run app` — scaffolds new apps
│       └── templates/app/       # template tree mirroring apps/web minus demos
├── .github/workflows/
├── turbo.json
├── package.json                 # workspaces + packageManager pin
└── CLAUDE.md
```

`packages/` exists so Storybook, the web app, and any future second app share schemas and config without duplication. **Co-locate stories and tests with their source files** — never split them into parallel `__stories__` / `__tests__` trees.

## Commands

These commands are the standard interface. Every script is a Turbo task with appropriate `dependsOn` so cached output is reused. If a script is missing when you need it, add it to the right workspace and to `turbo.json` — do not run tools ad-hoc.

| Command | What it does |
|---|---|
| `bun install` | Install workspace deps; `prepare` runs `scripts/install-hooks.sh` to install the pre-push hook |
| `bun run dev` | Vite + Stylelint watch + Biome watch + Storybook in parallel; first error stops dev |
| `bun run check` | The full gate (CI): biome ci → stylelint → tsc → bun test → build → playwright (storybook + app + app-offline) |
| `bun run check:fast` | The pre-push gate: same chain except `playwright --project=storybook`. Auto-runs on `git push`; bypass with `git push --no-verify` |
| `bun run build` | Turbo build → Vite client + SSR bundle → TanStack Start prerender → cp index.html → 404.html → touch .nojekyll |
| `bun gen:app` | Scaffold a new app under `apps/<name>` via the TurboRepo generator |
| `bun run preview` | Serve the built static output for local PWA verification |
| `bun run storybook` | Storybook standalone (also the target Playwright story tests point at) |
| `bun test` | Bun unit-test runner — single execution |
| `bun test <pattern>` | Bun unit-test runner filtered to a pattern |
| `bun run test:e2e` | Playwright across stories + application workflows |
| `bun run test:e2e -- <pattern>` | Playwright filtered to a pattern |
| `bun run deploy` | Invoked by GitHub Actions only — wraps `actions/deploy-pages` |

## Milestone order (each gated by green `bun run check`)

No milestone starts until the prior one ships green CI.

1. **Toolchain floor** — Bun pinned, TurboRepo workspaces, Biome, Stylelint, tsc, T3 env, single `bun run check` script, GH Actions skeleton.
2. **TanStack Start in SPA + prerender mode → GH Pages** — empty route, deploy works, base path correct, 404 SPA fallback verified, prerender output inspected.
3. **Tailwind + design tokens + Stylelint wired** — first style commit must lint clean from the CLI.
4. **Storybook online + Playwright wired** — shares Vite/Tailwind/alias config; one trivial component with a story; Playwright test pointed at that story runs in `check`. `bun test` set up alongside.
5. **Zod-first component pattern** — `defineComponent` helper proven; one sample component demonstrating dev parse + prod tree-shake.
6. **IDB + Jotai foundation** — `atomWithIDB`, root `use()` suspense boundary, BroadcastChannel sync, schema-versioned migration test.
7. **PWA layer** — Vite PWA plugin, app-shell precache, offline page, Lighthouse PWA pass, deep-link offline test in Playwright.
8. **anime.js wrapper + reduced-motion** — `useAnime`, one motion preset, Storybook visual proof.
9. **React 19 idioms** — first `use()` consumer, first `useTransition`-gated interaction, Compiler audit pass.
10. **Domain feature #1** — first real game prototype, exercising every Pillar end-to-end as the template for everything that follows.

## Working agreements

- **No code before its Storybook story.**
- **Ask before writing any Playwright test.** Every time. Surface the structural choices (story-level vs app-level, selectors, IDB seeding, network state, what to assert) and wait for the user's answer. `bun test` unit tests do not require this prompt.
- **No state outside IDB**, except plainly ephemeral UI state.
- **No manual memoization** — trust the compiler. Diagnose suspected render issues with `react-scan` (loaded automatically in **Storybook** dev via `.storybook/preview.tsx`, gated by `import.meta.env.DEV`). After UI changes, the final check on every prompt is: open the affected story in the browser (or via Playwright headed), look at the highlighted boxes, fix any unexpected re-renders at the cause — never by adding manual `useMemo`/`useCallback`/`React.memo`. There is intentionally **no skill for `react-scan`** — it's a "look at boxes, fix what's bad" tool with no version-specific deprecations or opinionated patterns. **react-scan is NOT loaded in the app dev server** (`bun run dev` at `localhost:5173`): react-scan v0.5.x patches React 19 in a way that crashes TanStack Router's `HeadContent` (`useContext` returns null). Component-level re-render diagnostics happen in Storybook; route-level work happens in the app without react-scan until that incompatibility is resolved upstream.
- **No `any`, no `as` casts at module boundaries** — parse with Zod instead.
- **Hand-written TS types for things that have a Zod schema are forbidden.** Use `z.infer`.
- **Anything that violates a Pillar gets reverted, not patched.**
- **TanStack DevTools (`@tanstack/react-devtools` + `@tanstack/react-router-devtools`) and the Vite plugin (`@tanstack/devtools-vite`)** are mounted dev-only in `apps/<name>/app/routes/__root.tsx` and the Vite config. The `devtools()` plugin wires browser-element → editor source linking — click a rendered element, jump to source. Production tree-shakes via `import.meta.env.DEV` + `lazy()`. See `tanstack-devtools` skill.
- **When introducing a new component pattern**, run `npx -y react-doctor@latest . --verbose` (no `--diff`) to verify the pattern doesn't add a new warning category to the baseline. The `--diff` mode in `bun run check` only flags issues in the current diff; a new pattern that becomes pervasive (e.g., a copy-pasted bad shape across 13 components) will only register on a full-codebase scan.
- **Inline disable comments are a code smell — refactor first, suppress only as last resort.** Before writing `// eslint-disable-next-line` or `// biome-ignore`, try the canonical refactor for that rule. The known-good escape hatches (kept with `KEEP — …` justifications in the codebase) are: (1) **`useExhaustiveDependencies` on a parameterized hook** that exposes a `deps` parameter as public API (`useAnime`, `usePixiApp`); (2) **`noDocumentCookie` for cookie-clear** loops where CookieStore isn't universal across our deploy targets; (3) **file-wide disables on generated files** (`routeTree.gen.ts`). Everything else has a real fix — pattern table below.
- **Disable-comment refactor table.** When tempted to suppress one of these rules, do this instead:

  | Rule | Refactor |
  |---|---|
  | `react-doctor/no-cascading-set-state` | Replace 2+ `setState` calls in one effect with one `useReducer` + dispatch. State machine is explicit; rule no longer fires. See `OperatorPill` (animation phases) and `PlayerAvatar` (level-up) for examples. |
  | `react-doctor/no-derived-useState` | Same fix — `useReducer` accepts initial state from a prop without triggering the rule. The rule specifically targets `useState(propValue)`. |
  | `react-doctor/no-array-index-as-key` | Generate a stable string id at construction time (`id: \`c-${i}\``, `id: \`h${out.length}\``) OR derive a constant tuple of ids (`TEN_FRAME_CELL_IDS`). The rule fires on the literal identifier `i`/`idx`/`index`; using a content-derived string defeats it. |
  | `react-doctor/no-render-in-render` | Extract the inline-render helper to a real component (`<Body body={...} />`). Even a pure string→ReactNode helper. |
  | `react-doctor/js-combine-iterations` | `.map().filter()` → `.flatMap((x) => keep(x) ? [transform(x)] : [])`. One iteration, equivalent semantics. |
  | `react-doctor/js-set-map-lookups` | Often a false positive on `String#indexOf` — refactor to `String#split(sep, 1)` instead, which avoids the indexOf identifier. |
  | `react-doctor/no-inline-exhaustive-style` | Move the inline `style={{...}}` to Tailwind classes (or any class-based scheme). |
  | `react-doctor/no-giant-component` | Extract custom hooks for cross-cutting state (`useGameCelebration`, `useGameHints`, `useAttackFlow`) and hoist pure state-transition functions to module scope. The route component shrinks to a thin orchestrator. |
  | `react-hooks/rules-of-hooks` on `use` (Playwright fixture) | Rename the fixture-callback parameter from `use` to `runFixture`. Playwright accepts any identifier; only position matters. |
  | `useExhaustiveDependencies` on a `[playerId]`-style trigger-only dep | Lift the reset to the parent via `<PlayerAvatar key={playerId} ... />`. Component remounts on key change; useState/useRef defaults re-initialize; the in-component effect goes away. |
- **No circular imports.** When two modules need to reach into each other, extract the shared symbol(s) into a leaf module and have BOTH original modules depend on the leaf. Never resolve a cycle with `// fallow-ignore-next-line circular-dependency`. Worked example: `attack-fx/runtime.ts` once exported `tintedSoftCircle` AND imported every `runX` from `attack-fx/kinds/*.ts`; the kinds re-imported `tintedSoftCircle` back from runtime — 7 cycles. Fixed by moving `tintedSoftCircle` (and its texture cache) to `attack-fx/textures.ts` (a leaf); now runtime depends on kinds + textures, kinds depend on textures, no cycle. `fallow dead-code` is the gate that catches this.
- **Skill files** for the techs in this stack are added by the user over time. When a skill exists, follow it; when one is missing, ask before guessing.
