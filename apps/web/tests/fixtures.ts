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
      // eslint-disable-next-line react-hooks/rules-of-hooks -- this `use` is Playwright's fixture-lifecycle callback (`async ({ page }, use) => { ... await use(value) }`), not React's use() hook. The name is a Playwright convention; renaming would break every fixture in the project.
      await use();
    },
    { auto: true },
  ],
});

export { expect };
