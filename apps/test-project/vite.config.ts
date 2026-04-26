import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

import { sharedPlugins } from "./vite.shared";

const isProjectPages = process.env.GITHUB_PAGES === "true";

export default defineConfig(async ({ mode }) => {
  // Vite's config bundler runs in a Node subprocess that does NOT inherit
  // Bun's auto-loaded .env. Populate process.env explicitly, then dynamically
  // import env.ts so the t3-env validation throws here (Pillar 4 — fail the
  // build before any artifact uploads), not at first page load.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  await import("./app/env");

  return {
    base: isProjectPages ? "/test-project/" : "/",
    // Force a single copy of React + React DOM + TanStack Router. Bun's
    // hashed `.bun/...@<hash>` deduping leaves multiple resolution paths to
    // the same package; without this, HeadContent and StartClient can each
    // import a different React, producing "null useContext" hydration errors.
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-router"],
    },
    plugins: [
      ...sharedPlugins(),
      tanstackStart({
        srcDirectory: "app",
        spa: {
          enabled: true,
          prerender: { outputPath: "/index" },
        },
        prerender: {
          enabled: true,
          crawlLinks: true,
          autoSubfolderIndex: true,
          failOnError: true,
        },
      }),
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        manifest: {
          name: "test-project",
          short_name: "test-project",
          description: "test-project — a dean-stack app",
          theme_color: "#1f1f3f",
          background_color: "#ffffff",
          start_url: ".",
          display: "standalone",
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/assets\//, /\.(?:png|svg|webp|woff2?|ico)$/, /^\/sw\.js$/],
          runtimeCaching: [
            {
              urlPattern: ({ request }) =>
                request.destination === "image" || request.destination === "font",
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 100 },
              },
            },
          ],
        },
      }),
    ],
  };
});
