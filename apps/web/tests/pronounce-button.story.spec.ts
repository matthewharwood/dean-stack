// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: data-test="pronounce-button" presence + data-sound-id
//      attribute for the registered story; ABSENCE of the button for
//      missing / unregistered ids. No click — audio output in headless
//      Chromium can't be observed reliably, so the contract under test
//      is purely the render guard.
//   3. Selector: data-test="pronounce-button".
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=components-pronouncebutton--";

test("PronounceButton.Registered renders the speaker with the registered sound id", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}registered`);
  const button = page.getByTestId("pronounce-button");
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute("data-sound-id", "pronounce-mara-brasswake");
  await expect(button).toHaveAttribute("aria-label", "Say Mara Brasswake");
});

test("PronounceButton.MissingSoundId renders nothing", async ({ page }) => {
  await page.goto(`${STORY_BASE}missing-sound-id`);
  await expect(page.getByTestId("pronounce-button")).toHaveCount(0);
});

test("PronounceButton.UnregisteredSoundId renders nothing", async ({ page }) => {
  await page.goto(`${STORY_BASE}unregistered-sound-id`);
  await expect(page.getByTestId("pronounce-button")).toHaveCount(0);
});
