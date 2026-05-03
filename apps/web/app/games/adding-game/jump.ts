import { type AddingGameState, PLAYER_PROGRESS_DEFAULT } from "@dean-stack/schemas";

import { dealRound } from "./deal";
import { LEVELS } from "./levels";
import { PLAYER_REGISTRY } from "./players";
import { applyXpGain } from "./xp";

// First-level index for each round. Derived once from LEVELS so a level
// renumber doesn't desync. The keys are ALSO the round-button labels in
// the DevMenu — adding a round means extending this map AND every other
// site listed in the FIVE-ROUND CHECKLIST below.
//
// ┌──────────────────────────── FIVE-ROUND CHECKLIST ────────────────────────────┐
// │ If you ever add a Round 5 (or beyond), update **every** site below or the   │
// │ jump tool will silently misbehave (XP credit short, indicator wrong round): │
// │                                                                              │
// │ 1. levels.ts — append LEVELS, bump FINAL_LEVEL_INDEX, push the new round    │
// │    boundary onto ROUND_BOUNDARIES, extend roundOf / levelsInRound /         │
// │    localLevelIndex with the new round.                                      │
// │ 2. ROUND_START_LEVEL below — add the entry. Its value is the index of the   │
// │    NEW round's first level (== ROUND_BOUNDARIES[N-2] + 1).                  │
// │ 3. The `1 | 2 | 3 | 4` literal union in this file's `Round` type AND in     │
// │    the matching schemas (RoundIndicatorPropsSchema.round, etc.) gets        │
// │    extended to include the new literal.                                     │
// │ 4. components/round-jump-panel/index.tsx — the panel renders one button     │
// │    per ROUND_START_LEVEL key. It already iterates dynamically, so step 2    │
// │    is enough — but verify the row still fits.                               │
// │ 5. RoundIndicator's `round={... }` reads — confirm any hard-coded "of 4"    │
// │    text is updated where appropriate.                                       │
// │                                                                              │
// │ The comment above ROUND_START_LEVEL is the single source of truth — keep   │
// │ it accurate when you add the round.                                         │
// └──────────────────────────────────────────────────────────────────────────────┘
export type Round = 1 | 2 | 3 | 4;

export const ROUND_START_LEVEL: Record<Round, number> = {
  1: 1,
  2: 7,
  3: 13,
  4: 19,
};

// Total XP a perfect playthrough of rounds 1..(round-1) would have
// awarded. Each enemy defeat awards `LEVELS[i].target` XP (matches the
// route's live `xpGain = round.equation.target.value` rule). One enemy
// per level, so this is a straight sum across the predecessor levels.
function xpCreditForRound(round: Round): number {
  const startLevel = ROUND_START_LEVEL[round];
  return LEVELS.slice(0, startLevel - 1).reduce((acc, level) => acc + level.target, 0);
}

// Dev-tool round jump. Sets state as if the player had just walked into
// the first level of `round` — completed every prior level, accrued the
// XP from each defeat, started the new round fresh.
//
// Behavior:
//   - selected pilot's progress is overwritten (NOT additive) with the
//     credit for `round`. Going round 3 → round 2 lowers the pilot's
//     level/xp to round 2's expected baseline; this is the "clears
//     round 3 data" the user described.
//   - other pilots' progress is left alone (they may have been the
//     active pilot during real play earlier; preserving their xp keeps
//     the dev tool from nuking unrelated state).
//   - score is overwritten with the same credit (today score == sum
//     of damage dealt == sum of targets defeated).
//   - the round is dealt fresh at ROUND_START_LEVEL[round] — same path
//     as the post-win advance, so card layout and equation seeding are
//     identical to live play.
//
// Pure: no DOM, no Math.random side-effects beyond what dealRound owns.
export function jumpToRound(state: AddingGameState, round: Round): AddingGameState {
  const startLevel = ROUND_START_LEVEL[round];
  const credit = xpCreditForRound(round);
  const dealt = dealRound({ levelIndex: startLevel });

  // Default the active pilot to roster[0] if none was selected — jumping
  // from a fresh splash should still credit XP somewhere, otherwise the
  // pilot avatar shows level 1 / 0 xp on a "round 4" jump and the kid
  // notices the discrepancy.
  const selectedPilotId = state.player.selectedPilotId ?? PLAYER_REGISTRY[0]?.id ?? null;
  const pilotProgress = selectedPilotId
    ? {
        ...state.player.pilotProgress,
        [selectedPilotId]: applyXpGain(PLAYER_PROGRESS_DEFAULT, credit).next,
      }
    : state.player.pilotProgress;

  return {
    ...state,
    status: "playing",
    cards: dealt.cards,
    player: {
      ...state.player,
      score: credit,
      hand: dealt.hand,
      selectedPilotId,
      pilotProgress,
    },
    round: dealt.round,
  };
}
