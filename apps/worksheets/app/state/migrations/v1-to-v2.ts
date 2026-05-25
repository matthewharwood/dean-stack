import type { Progress } from "@dean-stack/schemas";

// v1 progress rows had no `completed` field. v2 adds it; existing rows default to `false`.
// The integration of this transform inside `upgrade(db, 1, 2, tx)` lives in `state/db.ts`;
// this pure function is what `bun:test` exercises (the real upgrade runs in Playwright).
export function migrateProgressV1toV2(old: { id: string; level: number }): Progress {
  return { ...old, completed: false };
}
