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

const cases: Array<{ id: string; suffix: string; encountersAttr: string }> = [
  { id: "poster-default", suffix: ".png", encountersAttr: "0" },
  { id: "poster-l-1", suffix: "_L1.png", encountersAttr: "1" },
  { id: "poster-l-2", suffix: "_L2.png", encountersAttr: "2" },
  { id: "poster-l-2-capped", suffix: "_L2.png", encountersAttr: "5" },
];

for (const { id, suffix, encountersAttr } of cases) {
  test(`EnemyAvatar.${id} renders the right poster variant`, async ({ page }) => {
    await page.goto(`${STORY_BASE}${id}`);
    const img = page.getByTestId("enemy-poster");
    await expect(img).toBeVisible();
    const src = await img.getAttribute("src");
    expect(src ?? "").toMatch(new RegExp(`hadal-glass-manta-echo${escapeRegex(suffix)}$`));
    expect(await img.getAttribute("data-poster-encounters")).toBe(encountersAttr);
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
