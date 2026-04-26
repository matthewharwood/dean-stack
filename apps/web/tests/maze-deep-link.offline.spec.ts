// The load-bearing offline-deep-link test (CLAUDE.md PWA architecture decision).
// We pick `/games/maze/3` deliberately: the prerender list does NOT include it
// and `/` does NOT link to it, so the SW must hand back the precached shell and
// the router must resolve the URL client-side from cache.
//
// ASK-FIRST decisions:
//   1. Level: offline (PWA contract).
//   2. Assertion: heading "Level 3" renders after offline navigation.
//   3. Selector: getByRole("heading").
//   4. IDB: fresh (no seed — we want to verify the shell + router fallback,
//      not pre-existing progress; the level number comes from the URL).
//   5. Network: install SW online → setOffline(true) + page.route backstop.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

// SKIP: blocked on the same VitePWA-vs-TanStack-Start `_shell.html` rename
// ordering as `shell.offline.spec.ts`. Re-enable once `dist/client/sw.js` lands.
test.skip("/games/maze/3 resolves while offline via the SW navigation fallback", async ({
  page,
  context,
}) => {
  await page.goto("/");

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

  await page.goto("/games/maze/3");
  await expect(page.getByRole("heading", { name: /level 3/i })).toBeVisible();
});
