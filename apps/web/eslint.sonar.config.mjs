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
      // Generator template — its files become real apps via `bun gen:app`,
      // not direct lint targets. Same rationale as fallow's ignore list.
      "../../turbo/generators/templates/**",
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
      // dean-stack is an offline kid's game. Math.random drives card
      // shuffles, particle jitter, attack-fx variation, audio detune —
      // none of it is security-sensitive (no tokens, no auth, no PRNG-
      // seeded state crossing a trust boundary). Swapping to crypto.getRandomValues
      // would add ceremony without buying anything. Off globally.
      "sonarjs/pseudo-random": "off",
      // Fire-and-forget Promises in sound/use-sound.ts (audio unlock
      // listeners), sound/player.ts (one-shot SFX dispatch), state/db.ts
      // (BroadcastChannel + IDB persistence callbacks), and the
      // attack-fx vortex setup are intentional — the caller doesn't
      // await and shouldn't, but `void` documents that decision more
      // clearly than `.catch(() => undefined)`. Off globally.
      "sonarjs/void-use": "off",
      // Threshold raised from default 15 to 50. The sites that exceed
      // 15 (auto-assist apply, hints generator, deal builder, AddingGame
      // root, drag pointer handlers, dive-in/round-complete tickers)
      // are domain state machines with intrinsic comparator/operator/
      // shape branching. Splitting them mechanically would produce
      // helper soup that's harder to read, not easier. 50 still flags
      // the egregious cases.
      "sonarjs/cognitive-complexity": ["error", 50],
    },
  },
  {
    // Playwright IDB seeding deliberately uses a Promise-wrapped
    // `indexedDB.open` + transaction-completion pattern. The arrow
    // chain `addInitScript(async () => { const openDb = () => new
    // Promise((resolve, reject) => { req.onsuccess = () => ... } })`
    // crosses the 4-deep nesting limit, but every level is the IDB
    // callback API's required shape — flattening would mean inventing
    // a Promise-returning IDB helper just for tests. Off for tests/.
    files: ["tests/**/*.ts"],
    rules: {
      "sonarjs/no-nested-functions": "off",
    },
  },
);
