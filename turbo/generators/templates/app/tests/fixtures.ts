import { test as base, expect } from "@playwright/test";

type Fixtures = {
  freshIDB: void;
};

// Fresh IDB per test — Pillar 3. Tests must be independent or parallel runs poison each other.
// `auto: true` means every test gets fresh IDB by default; opt out by overriding `freshIDB`.
//
// The second callback parameter is Playwright's "run the test now, resume after"
// hook. We name it `runFixture` (not Playwright's docs-default `use`) because
// `use` is a React hook identifier and triggers `react-hooks/rules-of-hooks`.
// Playwright accepts any identifier — only the parameter position matters.
export const test = base.extend<Fixtures>({
  freshIDB: [
    async ({ page }, runFixture) => {
      await page.addInitScript(async () => {
        const dbs = (await indexedDB.databases?.()) ?? [];
        await Promise.all(dbs.map((d) => d.name && indexedDB.deleteDatabase(d.name)));
      });
      await runFixture();
    },
    { auto: true },
  ],
});

export { expect };
