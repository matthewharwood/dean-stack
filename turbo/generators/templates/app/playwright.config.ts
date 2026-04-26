import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    testIdAttribute: "data-test",
    // Pillar — animations don't add flake. The useAnime hook short-circuits
    // when reducedMotion is "reduce". Set on contextOptions for cross-version
    // typing compatibility (Playwright 1.59).
    contextOptions: { reducedMotion: "reduce" },
  },

  projects: [
    {
      name: "storybook",
      testMatch: /.*\.story\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:6006" },
    },
    {
      name: "app",
      testMatch: /.*\.app\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
    {
      name: "app-offline",
      testMatch: /.*\.offline\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
  ],

  webServer: [
    {
      command: "bun run storybook",
      url: "http://localhost:6006",
      reuseExistingServer: !process.env.CI,
      // 3 min — covers Storybook's first-run Vite cold-prebundle after a dep change,
      // when parallel test workers can race the prebundler and hit ERR_CONNECTION_REFUSED.
      timeout: 180_000,
    },
    {
      command: "bun run preview",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
