import { test as base, expect } from "@playwright/test";

type Fixtures = {
  freshIDB: void;
};

// Fresh IDB per test — Pillar 3. Tests must be independent or parallel runs poison each other.
// `auto: true` means every test gets fresh IDB by default; opt out by overriding `freshIDB`.
export const test = base.extend<Fixtures>({
  freshIDB: [
    async ({ page }, use) => {
      await page.addInitScript(async () => {
        const dbs = (await indexedDB.databases?.()) ?? [];
        await Promise.all(dbs.map((d) => d.name && indexedDB.deleteDatabase(d.name)));
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect };
