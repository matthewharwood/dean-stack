// ASK-FIRST decisions (Pillar 4 / playwright-pwa-offline):
//   1. Level: offline.
//   2. Assertion: /adding-game loads offline AND the dev-menu still
//      surfaces R5 + R6 jump buttons (so the new rounds are reachable
//      from cache + local state alone — no server round-trip).
//   3. Selector: data-test attributes the route already exposes.
//   4. IDB: fresh (default fixture).
//   5. Network: online to install SW, then `context.setOffline(true)` plus
//      a `page.route` backstop that aborts cross-origin requests.
//   6. Reduced motion: forced (project default).
//
// SKIP: matches the rationale in `shell.offline.spec.ts` — VitePWA's
// `closeBundle` runs before TanStack Start's prerender renames the SPA
// shell, so no `sw.js` lands in `dist/client/`. This contract is load-
// bearing for the R5/R6 expansion (the new rounds must be reachable
// offline since the iPad-over-LAN workflow may drop network) — track
// alongside the shell offline spec and re-enable when the build emits
// a service worker.

import { expect, test } from "./fixtures";

test.skip("R5 and R6 dev-menu jumps work offline", async ({ page, context }) => {
  await page.goto("/adding-game");

  await page.waitForFunction(
    async () => {
      if (!("serviceWorker" in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return reg?.active?.state === "activated";
    },
    null,
    { timeout: 30_000 },
  );

  await context.setOffline(true);
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(page.url()).origin) await route.continue();
    else await route.abort();
  });

  await page.reload();
  await page.getByTestId("splash-begin").click();
  await expect(page.getByTestId("equation")).toBeVisible({ timeout: 15_000 });

  // Both new rounds reachable from the dev menu offline.
  await page.getByTestId("dev-menu-button").click();
  await expect(page.getByTestId("dev-menu-jump-round-5")).toBeVisible();
  await expect(page.getByTestId("dev-menu-jump-round-6")).toBeVisible();

  // R5 entry — three slots, find-missing-result shape.
  await page.getByTestId("dev-menu-jump-round-5").click();
  await expect(page.getByTestId("equation")).toHaveAttribute("data-shape", "find-missing-result");
  await expect(page.getByTestId("equation-slot")).toHaveCount(3);
});
