import type { PlopTypes } from "@turbo/gen";

// Scaffolds a new dean-stack app under `apps/<name>` mirroring `apps/web`'s
// toolchain (Vite + TanStack Start + Tailwind v4 + Storybook + Playwright +
// IDB + Jotai + Zod + animejs) minus the `apps/web` demo components.
//
// Usage:
//   bun gen:app                   # interactive
//   turbo gen app -- --args name=test-project
export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("app", {
    description: "Scaffold a new dean-stack app under apps/<name>",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "App name (kebab-case, e.g. test-project):",
        validate: (s: string) =>
          /^[a-z][a-z0-9-]*$/.test(s) || "must be lowercase kebab-case starting with a letter",
      },
    ],
    actions: [
      {
        type: "addMany",
        destination: "{{ turbo.paths.root }}/apps/{{name}}",
        base: "templates/app",
        templateFiles: "templates/app/**/*",
        globOptions: { dot: true },
      },
    ],
  });
}
