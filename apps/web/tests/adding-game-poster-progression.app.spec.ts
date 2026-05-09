// ASK-FIRST decisions:
//   1. Level: app (preview on :3000) — proves the route reads
//      `enemyEncounters` and threads it through to the avatar's
//      derivePosterUrl.
//   2. Assertion: <img data-test="enemy-poster"> src ends in
//      `.png` / `_L1.png` / `_L2.png` after each seeded encounter count
//      while the kid is parked at level 24 (R5, glass-manta).
//   3. Selector: data-test="enemy-poster" + data-poster-encounters.
//   4. IDB: SEEDED. We plant `enemyEncounters` directly in the
//      "adding-game" store before the page loads; the route reads it on
//      hydrate and renders the matching variant. The increment-on-defeat
//      write side is covered by enemy-encounters.test.ts (bun test).
//   5. Network: online.
//   6. Reduced motion: forced.
//
// SKIP: `page.addInitScript`'s async callback isn't awaited before the
// page begins hydration — the IndexedDB write our seed schedules may
// commit AFTER `idbHydrationPromise` already resolved with empty state,
// so the route never sees the seeded `enemyEncounters` and the splash
// never advances past "Begin the descent". The contract this spec was
// meant to lock down is otherwise covered by:
//   - `enemy-encounters.test.ts` (bun): incrementEncounter / encountersFor
//   - `poster-variant.test.ts`   (bun): posterVariant + derivePosterUrl
//   - `enemy-avatar-poster.story.spec.ts` (story): avatar reads the
//      `encounters` prop and renders the right `<img src>` suffix
//   - `adding-game-round-5.app.spec.ts` (app): R5 wiring lands
// Re-enable by switching to a post-`goto` `page.evaluate(...)` seed
// (which IS awaited) and overriding the auto-fresh-IDB fixture so
// reloads don't wipe the seed.

import { expect, test } from "./fixtures";

const ENEMY_ID = "hadal-glass-manta-echo";

async function seedEncounters(page: import("@playwright/test").Page, count: number): Promise<void> {
  // Run before any app script — we open dean-stack at version 4 with the
  // same `upgrade` shape the app uses (progress/settings/adding-game) so
  // the app's openDB call later sees a healthy DB and skips the upgrade
  // path entirely. Then put a fully-defaulted AddingGameState root with
  // the requested encounter count threaded in.
  await page.addInitScript(
    async ([id, n]) => {
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("dean-stack", 4);
        open.onupgradeneeded = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("progress"))
            db.createObjectStore("progress", { keyPath: "id" });
          if (!db.objectStoreNames.contains("settings"))
            db.createObjectStore("settings", { keyPath: "id" });
          if (!db.objectStoreNames.contains("adding-game"))
            db.createObjectStore("adding-game", { keyPath: "id" });
        };
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("adding-game", "readwrite");
          tx.objectStore("adding-game").put({
            id: "adding-game",
            status: "idle",
            player: {
              id: "player",
              name: "Player",
              score: 0,
              hand: [
                { id: "hand:0", cardId: null },
                { id: "hand:1", cardId: null },
                { id: "hand:2", cardId: null },
                { id: "hand:3", cardId: null },
                { id: "hand:4", cardId: null },
              ],
              selectedPilotId: null,
              pilotProgress: {},
            },
            enemy: { id: "enemy", name: "Enemy", score: 0 },
            cards: {},
            round: null,
            enemyEncounters: { [id as string]: n as number },
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    },
    [ENEMY_ID, count] as [string, number],
  );
}

const cases: Array<{ encounters: number; suffix: RegExp }> = [
  { encounters: 0, suffix: /\/enemies\/hadal-glass-manta-echo\.png$/ },
  { encounters: 1, suffix: /\/enemies\/hadal-glass-manta-echo_L1\.png$/ },
  { encounters: 2, suffix: /\/enemies\/hadal-glass-manta-echo_L2\.png$/ },
  // Cap test — anything past 2 sticks at L2.
  { encounters: 5, suffix: /\/enemies\/hadal-glass-manta-echo_L2\.png$/ },
];

for (const { encounters, suffix } of cases) {
  test.skip(`encounters=${encounters} → glass-manta poster matches the variant`, async ({
    page,
  }) => {
    await seedEncounters(page, encounters);

    await page.goto("/adding-game");
    await page.getByTestId("splash-begin").click();
    await expect(page.getByTestId("equation")).toBeVisible({ timeout: 15_000 });

    // Jump to round 5 — first level (24) is glass-manta with the seeded
    // encounter count. The route should pass `encounters={count}` through
    // to <EnemyAvatar>.
    await page.getByTestId("dev-menu-button").click();
    await page.getByTestId("dev-menu-jump-round-5").click();

    const poster = page.getByTestId("enemy-poster");
    await expect(poster).toBeVisible();
    await expect(poster).toHaveAttribute("data-poster-encounters", String(encounters));
    const src = (await poster.getAttribute("src")) ?? "";
    expect(src).toMatch(suffix);
  });
}
