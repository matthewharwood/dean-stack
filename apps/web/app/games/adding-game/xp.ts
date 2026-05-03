import { PLAYER_PROGRESS_DEFAULT, type PlayerProgress } from "@dean-stack/schemas";

// XP-to-next-level curve. Linear with a non-zero base so the very first
// level-up takes a few enemy defeats (kid sees the bar fill, then the
// celebration). Each subsequent level adds 10 XP to the requirement:
// L1→L2=20, L2→L3=30, L3→L4=40, L4→L5=50, L5→L6=60.
//
// Tier-1 enemies have target values ~6-20, tier-2 ~10-30. A full run
// across 12 levels yields roughly 3-5 level-ups per pilot — sprinkled,
// not constant, so the confetti stays a moment rather than a notification.
export function xpThresholdForLevel(level: number): number {
  return 10 + level * 10;
}

// Lookup helper for the sparse pilotProgress map. Missing entries return
// the canonical default (xp:0, level:1) — kid hasn't put any time into
// this pilot yet.
export function progressFor(
  byId: Readonly<Record<string, PlayerProgress>>,
  pilotId: string,
): PlayerProgress {
  return byId[pilotId] ?? PLAYER_PROGRESS_DEFAULT;
}

export type XpGainResult = {
  next: PlayerProgress;
  levelsGained: number;
};

// Apply a single XP gain to a pilot's progress. The loop guards against
// future tuning where one defeat could cross multiple level thresholds.
// Pure — same input → same output, safe to call inside a Jotai/atom
// updater under React StrictMode double-invoke.
export function applyXpGain(progress: PlayerProgress, gain: number): XpGainResult {
  const cleanGain = Math.max(0, Math.floor(gain));
  let xp = progress.xp + cleanGain;
  let level = progress.level;
  let levelsGained = 0;
  let threshold = xpThresholdForLevel(level);
  while (xp >= threshold) {
    xp -= threshold;
    level += 1;
    levelsGained += 1;
    threshold = xpThresholdForLevel(level);
  }
  return { next: { xp, level }, levelsGained };
}
