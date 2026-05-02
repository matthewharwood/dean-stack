import { devtools as tanstackDevtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig, loadEnv } from "vite";

import { sharedPlugins } from "./vite.shared";

// PWA layer (vite-plugin-pwa + Workbox) is intentionally OFF.
// Reason: vite-plugin-pwa's `closeBundle` hook fires before TanStack Start's
// prerender pass, so `dist/client/sw.js` is never written and the
// `virtual_pwa-register-*.js` shim hardcodes `/sw.js` (root-relative) instead
// of the deploy base path. Re-enable when offline-deep-link actually matters
// (CLAUDE.md milestone 7) and the upstream integration is fixed; until then,
// `playwright-pwa-offline` tests stay `test.skip`'d and there is no service
// worker on prod.

// Base URL is driven by the BASE_PATH env var supplied by the deploy workflow
// (sourced from `actions/configure-pages@v5`'s `base_path` output, which is
// the canonical source for project pages / user-org pages / custom domains).
// Local dev: unset → "/". Project pages: "/<repo>/". User-org or custom
// domain: "/". Vite needs a trailing slash for non-root bases.
function resolveBase(): string {
  const raw = process.env.BASE_PATH;
  if (!raw || raw === "/") return "/";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export default defineConfig(async ({ mode }) => {
  // Vite's config bundler runs in a Node subprocess that does NOT inherit
  // Bun's auto-loaded .env. Fill in missing vars from .env files, but never
  // clobber values already on process.env — CI workflows set VITE_SITE_URL
  // etc. via job env, and those must win over the local .env (which holds
  // the localhost dev defaults). Then dynamically import env.ts so t3-env
  // validation throws here (Pillar 4 — fail the build before any artifact
  // uploads), not at first page load.
  const fileEnv = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  await import("./app/env");

  return {
    base: resolveBase(),
    // Force a single copy of React + React DOM + TanStack Router. Bun's
    // hashed `.bun/...@<hash>` deduping leaves multiple resolution paths to
    // the same package; without this, HeadContent and StartClient can each
    // import a different React, producing "null useContext" hydration errors.
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-router"],
    },
    plugins: [
      // Browser → editor source linking via the TanStack DevTools client.
      // Pure Vite plugin; injects a tiny dev-mode runtime that the @tanstack/react-devtools
      // host picks up. Runs in dev only — no-op for `vite build`.
      tanstackDevtools(),
      ...sharedPlugins(),
      tanstackStart({
        srcDirectory: "app",
        spa: {
          enabled: true,
          prerender: { outputPath: "/index" },
        },
        prerender: {
          enabled: true,
          crawlLinks: true,
          autoSubfolderIndex: true,
          failOnError: true,
        },
      }),
    ],
  };
});
