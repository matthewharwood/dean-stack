// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: <img data-test="enemy-poster"> src suffix per encounter
//      count — proves derivePosterUrl + the avatar wiring without booting
//      the full app.
//   3. Selector: data-test="enemy-poster" (no semantic role for a
//      decorative <img> with the enemy's name as alt text — visible label
//      via getByAltText is the next-best fallback).
//   4. IDB: fresh (default fixture).
//   5. Network: online.
//   6. Reduced motion: forced (avatar's ken-burns pan is decorative).

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=components-enemyavatar--";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Module-scope so each pattern is constructed once at file load, not on
// every loop iteration / Playwright retry. Avoids the js-hoist-regexp warning.
const cases: Array<{
  id: string;
  encountersAttr: string;
  posterPattern: RegExp;
}> = [
  {
    id: "poster-default",
    encountersAttr: "0",
    posterPattern: new RegExp(`hadal-glass-manta-echo${escapeRegex(".png")}$`),
  },
  {
    id: "poster-l-1",
    encountersAttr: "1",
    posterPattern: new RegExp(`hadal-glass-manta-echo${escapeRegex("_L1.png")}$`),
  },
  {
    id: "poster-l-2",
    encountersAttr: "2",
    posterPattern: new RegExp(`hadal-glass-manta-echo${escapeRegex("_L2.png")}$`),
  },
  {
    id: "poster-l-2-capped",
    encountersAttr: "5",
    posterPattern: new RegExp(`hadal-glass-manta-echo${escapeRegex("_L2.png")}$`),
  },
];

for (const { id, encountersAttr, posterPattern } of cases) {
  test(`EnemyAvatar.${id} renders the right poster variant`, async ({ page }) => {
    await page.goto(`${STORY_BASE}${id}`);
    const img = page.getByTestId("enemy-poster");
    await expect(img).toBeVisible();
    const src = await img.getAttribute("src");
    expect(src ?? "").toMatch(posterPattern);
    expect(await img.getAttribute("data-poster-encounters")).toBe(encountersAttr);
  });
}
