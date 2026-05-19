import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

function selectedProjectsFromArgv(argv: readonly string[]): ReadonlySet<string> {
  const selectedProjects = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";
    if (arg === "--project") {
      const project = argv[index + 1];
      if (project) {
        selectedProjects.add(project);
      }
      index += 1;
      continue;
    }

    if (arg.startsWith("--project=")) {
      selectedProjects.add(arg.slice("--project=".length));
    }
  }

  return selectedProjects;
}

function shouldRunProject(selectedProjects: ReadonlySet<string>, projectName: string): boolean {
  return selectedProjects.size === 0 || selectedProjects.has(projectName);
}

const selectedProjects = selectedProjectsFromArgv(process.argv);
const runsStorybookProject = shouldRunProject(selectedProjects, "storybook");
const runsAppProject =
  shouldRunProject(selectedProjects, "app") || shouldRunProject(selectedProjects, "app-offline");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : 2,
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
    ...(runsStorybookProject
      ? [
          {
            command: "bun run storybook",
            url: "http://localhost:6006",
            reuseExistingServer: !process.env.CI,
            // 3 min — covers Storybook's first-run Vite cold-prebundle after a dep change,
            // when parallel test workers can race the prebundler and hit ERR_CONNECTION_REFUSED.
            timeout: 180_000,
          },
        ]
      : []),
    ...(runsAppProject
      ? [
          {
            command: "bun run preview",
            url: "http://localhost:3000",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ]
      : []),
  ],
});
