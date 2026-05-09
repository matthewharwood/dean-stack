import type { EnemyEncounters } from "@dean-stack/schemas";

// Poster variant cap — the kid sees `default → _L1 → _L2`, capped at 2.
// Beyond that the count is informational (telemetry, future variants), so we
// do NOT cap the stored value here — `posterVariant()` clamps at the read
// side. Storing the true count keeps "I beat this enemy 7 times" recoverable
// later without a migration.

// Pure reducer: given the encounters map and an enemy id, return a new map
// with the count incremented by 1. Treats a missing entry as 0.
export function incrementEncounter(
  map: Readonly<EnemyEncounters>,
  enemyId: string,
): EnemyEncounters {
  const current = map[enemyId] ?? 0;
  return { ...map, [enemyId]: current + 1 };
}

// Read helper — the route uses this to pick the right encounter count
// before passing it into <EnemyAvatar>. Treats a missing entry as 0
// (the kid has never beaten this enemy → default poster).
export function encountersFor(
  map: Readonly<EnemyEncounters>,
  enemyId: string | null | undefined,
): number {
  if (!enemyId) return 0;
  return map[enemyId] ?? 0;
}
