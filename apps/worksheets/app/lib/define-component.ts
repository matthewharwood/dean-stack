import type * as z from "zod";

// Pillar 2 — Zod-first types. Dev-only parse via `import.meta.env.DEV` so Vite's
// static replacement tree-shakes the parse call out of production bundles.
// On parse failure in dev, the throw surfaces in the browser console as a gate
// failure (Pillar 4); fix the contract, don't suppress.
export function defineComponent<S extends z.ZodType, R>(
  schema: S,
  fn: (props: z.infer<S>) => R,
): (props: z.infer<S>) => R {
  if (import.meta.env.DEV) {
    return (props) => fn(schema.parse(props));
  }
  return fn;
}
