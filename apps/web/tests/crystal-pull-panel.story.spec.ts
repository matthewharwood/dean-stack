// ASK-FIRST decisions:
//   1. Level: story + (app-level integration deferred — kid path through
//      6 levels to cross R1 boundary is too long for a quick test;
//      dev-jump-to-round-end button doesn't exist yet).
//   2. Assertion: each render-only story exposes 3 face-down crystal
//      cards via data-test="crystal-card-{0,1,2}", the awaiting phase
//      via data-phase="awaiting", and the headline copy. Interactive
//      story does the full ceremony: tap a card → wait for the flip +
//      reveal hold to play through → assert the parent "picked: <id>"
//      indicator appears.
//   3. Selectors: data-test=crystal-pull-panel, crystal-pull-headline,
//      crystal-card-{0,1,2}, crystal-pick-result (the Interactive story's
//      post-pick result div).
//   4. IDB: fresh (panel reads no IDB, story owns its own state).
//   5. Network: online.
//   6. Reduced motion: forced — the panel's flip + reveal hold both
//      collapse to ~50ms under prefers-reduced-motion so the Interactive
//      test resolves quickly without waiting on the 900ms flip + 2200ms
//      reveal hold.

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=components-crystalpullpanel--";

test("CrystalPullPanel.FirstPull renders three face-down crystal cards in awaiting phase", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}first-pull`);
  const panel = page.getByTestId("crystal-pull-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-phase", "awaiting");
  await expect(page.getByTestId("crystal-pull-headline")).toHaveText("Choose a crystal");
  await expect(page.getByTestId("crystal-card-0")).toBeVisible();
  await expect(page.getByTestId("crystal-card-1")).toBeVisible();
  await expect(page.getByTestId("crystal-card-2")).toBeVisible();
  await expect(page.getByTestId("crystal-card-0").locator("img").first()).toHaveAttribute(
    "src",
    /\/img\/crystals\/_card-back\.svg$/,
  );
});

test("CrystalPullPanel.MidCampaign renders mid-game crystal triple in awaiting phase", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}mid-campaign`);
  const panel = page.getByTestId("crystal-pull-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-phase", "awaiting");
  // All three cards present.
  await expect(page.getByTestId("crystal-card-0")).toBeVisible();
  await expect(page.getByTestId("crystal-card-1")).toBeVisible();
  await expect(page.getByTestId("crystal-card-2")).toBeVisible();
});

test("CrystalPullPanel.Interactive — tapping a card fires onSelect after the reveal hold", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}interactive`);

  // Wait for intro phase to flip to awaiting before tapping.
  const panel = page.getByTestId("crystal-pull-panel");
  await expect(panel).toHaveAttribute("data-phase", "awaiting", { timeout: 5_000 });

  // Tap the middle card; the panel writes data-chosen=true onto it,
  // flips the inner faces, and after the reveal hold fires onSelect.
  await page.getByTestId("crystal-card-1").click();
  await expect(panel).toHaveAttribute("data-phase", "revealed", { timeout: 5_000 });
  await expect(page.getByTestId("crystal-reveal-burst")).toHaveAttribute(
    "src",
    /\/img\/crystals\/_reveal-burst\.png$/,
  );
  await expect(page.getByTestId("crystal-reveal-info").locator("img")).toHaveAttribute(
    "src",
    /\/img\/crystals\/phosphor-numerals\.svg$/,
  );

  // The Interactive story replaces itself with a "picked: <id>" div
  // once onSelect lands. With prefers-reduced-motion forced, flip +
  // reveal hold collapse so this should resolve quickly.
  await expect(page.getByTestId("crystal-pick-result")).toBeVisible({ timeout: 5_000 });
  // The Interactive story's seeded options are
  // ["marine-snow", "phosphor-numerals", "gentle-tide"] — index 1 is
  // phosphor-numerals.
  await expect(page.getByTestId("crystal-pick-result")).toContainText("phosphor-numerals");
});
