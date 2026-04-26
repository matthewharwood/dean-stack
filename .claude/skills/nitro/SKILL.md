---
name: nitro
description: Nitro v3 with the static `github_pages` preset for dean-stack — `nitro.config.ts`, prerender every route, set `baseURL` for project pages, and produce the SPA-fallback `404.html`. Triggers on: nitro, nitro.config, nitro preset, github_pages preset, prerender, static preset, baseURL, SPA fallback 404.
license: MIT
---

Owns the static-build preset that emits `.output/public` for upload to GitHub Pages. Wave 3's `tanstack-start-spa-prerender` will link here for the preset wiring; this skill owns the Nitro side.

## When to invoke
- Creating or editing `apps/web/nitro.config.ts`.
- Configuring `prerender.routes` for a new route.
- Setting or fixing `baseURL` for the GH Pages deployment.
- Diagnosing a missing `404.html`, broken asset paths, or a Pages deploy failure.

## Owns
Nitro v3 `static` / `github_pages` preset, `nitro.config.ts`, prerender configuration, base-path handling, and the SPA-fallback `404.html` that GH Pages serves.

## Defers to
- `tanstack-start-spa-prerender` (Wave 3, forward) — for the *application-level* decision ("SPA mode, full prerender, no server functions"). Nitro owns the preset; that sub-skill owns the framework-level switch.
- `tanstack-router-pwa-deep-links` (Wave 3, forward) — for the Workbox navigation-fallback contract. Nitro produces the prerendered shell; the router decides what fallback resolves to.
- `bun-runtime` — for invoking the build script.
- `turborepo` — for ordering the build task ahead of `playwright test` in the gate.

## Dean-stack rules
- Pillar 4 (CLI-gate-first) means: the build is part of `bun run build` and any prerender error must fail the gate (`prerender.failOnError: true`).
- The output is **static-only**. Do not introduce `serverHandlers`, `routeRules` that imply a runtime (`cache`, `swr`, `proxy`), `useStorage`, or scheduled tasks — they will silently no-op or break the build because GH Pages has no server.
- Project-page deployment requires `baseURL: "/dean-stack/"`. Without it, asset paths point at the wrong host root.
- The package is `nitro` (v3), not `nitropack` (v2). Imports come from `nitro` / `nitro/vite` / `nitro/storage`.

## Patterns

### `apps/web/nitro.config.ts`
```ts
import { defineConfig } from "nitro";

export default defineConfig({
  preset: "github_pages",
  baseURL: "/dean-stack/",
  output: { dir: ".output", publicDir: ".output/public" },
  prerender: {
    crawlLinks: true,
    failOnError: true,
    routes: ["/", "/404"],
  },
});
```
The `github_pages` preset emits `.output/public` and writes `404.html` as the SPA fallback. `failOnError: true` is load-bearing for the gate.

### Add a route to the prerender list
```ts
prerender: {
  crawlLinks: true,
  failOnError: true,
  routes: ["/", "/404", "/games/maze", "/games/maze/level-1"],
}
```
The crawler reaches links that exist on rendered pages; islands/dynamic links the crawler can't see go in `routes` explicitly. Every prerendered route becomes a static HTML shell that the SPA hydrates.

### CI step (companion to `node` skill)
```yaml
# .github/workflows/deploy.yml (excerpt)
- run: bun run build              # Nitro emits .output/public
- uses: actions/configure-pages@v5
- uses: actions/upload-pages-artifact@v3
  with: { path: "apps/web/.output/public" }
- uses: actions/deploy-pages@v4
```
Use `upload-pages-artifact@v3` and `deploy-pages@v4` — the older `@v1` revs in upstream Nitro docs no longer pass GH Pages's deploy gate.

### `.nojekyll` insurance
```ts
// add a small post-build step that touches .output/public/.nojekyll
import { write, file } from "bun";
const path = "apps/web/.output/public/.nojekyll";
if (!(await file(path).exists())) await write(path, "");
```
Without `.nojekyll`, Jekyll on Pages strips folders that start with `_` (Vite emits these) and the deploy silently breaks.

### Custom domain (no `baseURL`)
```ts
export default defineConfig({
  preset: "github_pages",
  // baseURL omitted — root deploy
  prerender: { crawlLinks: true, failOnError: true, routes: ["/", "/404"] },
});
```
Custom domain or `<owner>.github.io` user/org pages serve from the host root; omit `baseURL`.

## Anti-patterns
- **Don't import from `nitropack`** — that's v2; v3 is `nitro` / `nitro/vite` / `nitro/storage`.
- **Don't set `serverHandlers`, `routeRules.cache`, `routeRules.swr`, `routeRules.proxy`, or `useStorage`** — there is no server on GH Pages; these silently no-op or break the build.
- **Don't omit `baseURL`** for a project-pages deploy at `<owner>.github.io/dean-stack/` — asset paths break.
- **Don't trust the upstream Nitro doc's GH Pages workflow YAML verbatim** — its `actions/upload-pages-artifact@v1` and `actions/deploy-pages@v1` revs are stale and fail the deploy gate. Use `@v3` / `@v4`.
- **Don't set `prerender.failOnError: false`** to make a build pass — the missing route is the bug.

## Triggers on
nitro, nitro.config, nitro preset, github_pages preset, prerender, static preset, baseURL, SPA fallback 404
