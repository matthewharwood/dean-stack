import tailwindcss from "@tailwindcss/vite";
import type { PluginOption } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

// Plugins shared by the app and Storybook so the Tailwind v4 + path-alias
// config has a single source of truth (Pillar 1: Storybook-first; never fork).
// The TanStack Start plugin is app-only — Storybook should not run prerender.
export function sharedPlugins(): PluginOption[] {
  return [viteTsConfigPaths({ projects: ["./tsconfig.json"] }), tailwindcss()];
}
