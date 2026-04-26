import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

// Merge process.env (populated by Bun from .env files at script start, used
// when this module is loaded by vite.config.ts during config evaluation) with
// import.meta.env (Vite's static replacement at runtime in the browser bundle).
// Either context produces the same `env` object.
const runtimeEnv: Record<string, string | undefined> = {
  ...(typeof process !== "undefined" ? process.env : {}),
  ...(typeof import.meta !== "undefined" ? import.meta.env : {}),
};

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_GAME_TITLE: z.string().min(1),
    VITE_API_BASE: z.url().optional(),
  },
  server: {
    // Intentionally empty on GitHub Pages.
    // When this app moves off Pages, fill this and add a server runtime.
  },
  runtimeEnv,
  emptyStringAsUndefined: true,
});
