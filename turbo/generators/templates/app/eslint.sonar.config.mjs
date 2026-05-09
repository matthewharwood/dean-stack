// Sonar-only ESLint flat config for the second-opinion scan.
//
// dean-stack uses Biome for the primary lint pass — see CLAUDE.md
// "Linting split". This config does NOT replace Biome. It loads ONLY
// the SonarJS rule pack (cognitive complexity, code smells, bug patterns)
// for periodic third-opinion sweeps via `bun run check:sonar` and via
// `.github/workflows/sonarjs.yml`. Biome owns formatting + the bulk of
// lint; SonarJS owns the second-opinion scope Biome doesn't cover.
//
// Important: keep this config narrow. Adding non-sonarjs rules here would
// dilute the second-opinion signal and create dual-linter drift with Biome.

import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "dev-dist/**",
      "node_modules/**",
      ".turbo/**",
      ".vite/**",
      "storybook-static/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      // TanStack Router generated route tree
      "**/*.gen.ts",
      // Public assets
      "public/**",
    ],
  },
  sonarjs.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // dean-stack apps are offline kid's games — Math.random drives
      // visual variety (shuffles, particle jitter, audio detune), never
      // a security boundary. Off globally; revisit if your app starts
      // generating tokens or auth nonces, in which case use
      // `crypto.getRandomValues` for those call sites only.
      "sonarjs/pseudo-random": "off",
      // Fire-and-forget Promises (sound playback, BroadcastChannel
      // dispatch, IDB persistence) are intentional in this stack —
      // `void doThing()` documents the decision more clearly than
      // `.catch(() => undefined)`. Off globally.
      "sonarjs/void-use": "off",
      // Threshold raised from the default 15. Game state machines
      // (game-loop reducers, equation evaluators, ticker callbacks)
      // are intrinsically branchy on operator/shape/phase. 50 still
      // flags egregious cases without forcing helper soup that's
      // harder to read.
      "sonarjs/cognitive-complexity": ["error", 50],
    },
  },
  {
    // Playwright IDB seeding uses a Promise-wrapped `indexedDB.open` +
    // transaction-completion pattern. The arrow chain crosses the
    // 4-deep nesting limit, but every level is the IDB callback API's
    // required shape — flattening would mean inventing a Promise-
    // returning IDB helper just for tests. Off for tests/.
    files: ["tests/**/*.ts"],
    rules: {
      "sonarjs/no-nested-functions": "off",
    },
  },
);
