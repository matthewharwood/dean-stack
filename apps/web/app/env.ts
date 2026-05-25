import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

const runtimeEnv: Record<string, string | undefined> = {
  ...(typeof process !== "undefined" ? process.env : {}),
  ...(typeof import.meta !== "undefined" ? import.meta.env : {}),
};

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_GAME_TITLE: z.string().min(1),
    VITE_API_BASE: z.url().optional(),

    // URL to the companion Halid Worksheets app (printable take-home worksheets).
    // Defaults to /worksheets/ (assumes co-deployment under one domain — typical
    // GH Pages with both apps as subpaths). Override with an absolute URL (e.g.
    // http://localhost:3010/ in dev when running each app on its own Vite port)
    // by setting VITE_WORKSHEETS_URL in .env.
    VITE_WORKSHEETS_URL: z.string().min(1).default("/worksheets/"),

    VITE_SITE_URL: z
      .url()
      .refine((u) => u.endsWith("/"), { message: "VITE_SITE_URL must end with '/'" }),
    VITE_SITE_DESCRIPTION: z.string().min(40).max(300),
    VITE_OG_IMAGE: z.string().min(1).default("/og-card.svg"),
    VITE_AUTHOR_NAME: z.string().min(1).optional(),
    VITE_AUTHOR_URL: z.url().optional(),
    VITE_TWITTER_HANDLE: z
      .string()
      .regex(/^@\w{1,15}$/, "VITE_TWITTER_HANDLE must look like @handle")
      .optional(),
  },
  server: {},
  runtimeEnv,
  emptyStringAsUndefined: true,
});
