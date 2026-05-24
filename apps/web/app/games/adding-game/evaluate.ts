import {
  type AddingGameState,
  type Comparator,
  isNumberCard,
  isVerdictCard,
  type RoundOutcome,
} from "@dean-stack/schemas";

import { findLevel } from "./levels";

// Hoisted helper so the win check reads as a switch over the small
// comparator enum, not a nested ternary chain.
function compare(computed: number, comparator: Comparator, expected: number): boolean {
  switch (comparator) {
    case "eq":
      return computed === expected;
    case "gt":
      return computed > expected;
    case "lt":
      return computed < expected;
    default:
      return false;
  }
}

// Which operand slot index holds the stepper for the find-*-factor
// shapes (R13/R14). R15 (find-product) used to live here too but no
// longer uses a stepper — it's multi-choice now. Hoisted helper so
// the evaluator's expression-level call stays clean.
function factorStepperSlotIndex(shape: "find-missing-factor" | "find-leading-factor"): 0 | 1 {
  // R14 → leading slot; R13 → middle slot.
  return shape === "find-leading-factor" ? 0 : 1;
}

// Pure evaluator. Empty operand slots count as 0 — confirmed in spec, lets the
// player partially evaluate ("10 + 0 = 10" wins; target=0 with all empty also
// wins). The operator is applied left-to-right across the operand list.
//
// Three equation shapes:
//
//   "find-sum" (R1–R4):
//     LHS = operandSlots[0] OP operandSlots[1].
//     Win when `LHS cmp target.value` (cmp ∈ eq/gt/lt).
//     Damage on win = target.value (the equation's "expectedValue"). Bigger
//     equations hit harder.
//
//   "find-missing-result" (R5–R8):
//     LHS = operandSlots[0] OP operandSlots[1] (one of those slots is locked
//           with the static; the other holds the kid's chosen operand).
//     RHS = operandSlots[2] (the kid's chosen result card). Always "eq".
//     Win when `LHS === RHS`.
//     Damage on win = RHS (the kid's chosen result). Reward shape: bigger
//     result = bigger hit, so picking bolder operand cards pays off — but
//     ONLY when the math agrees, which is the whole point.
//
//   "true-false-multiply" (R9):
//     operandSlots = [a, b, c], all locked. verdictSlot holds the kid's
//     T/F verdict card. Truth = (a × b === c). Win when verdict === truth.
//     Damage on win = LEVELS[index].target (per-level flat damage — the
//     kid has no agency over the claimed product, so the reward is fixed
//     per level rather than derived from card values).
//
// On loss, scoreEarned is 0.
export function evaluateRound(state: AddingGameState): RoundOutcome | null {
  if (!state.round) return null;
  const { equation } = state.round;

  // Slot value resolver — narrows to NumberCard. Returns 0 when the slot
  // is empty, the card id doesn't resolve, or (defensively) the resolved
  // card is the wrong kind. The wrong-kind branch only fires on broken
  // data and serves the same role as the `?? 0` fall-through did before.
  const slotValue = (idx: number): number => {
    const slot = equation.operandSlots[idx];
    if (!slot?.cardId) return 0;
    const card = state.cards[slot.cardId];
    if (!card || !isNumberCard(card)) return 0;
    return card.value;
  };

  // ── true-false-multiply (R9) ────────────────────────────────────────
  // Branch FIRST so we don't accidentally run the arithmetic path on a
  // verdict-slot equation. Truth = `a × b === c`; win = kid's verdict
  // matches truth. The verdict slot's card must be a VerdictCard — a
  // missing or wrong-kind card resolves to "false", which keeps the
  // evaluator total without crashing if the kid clicks Evaluate before
  // dropping anything.
  if (equation.shape === "true-false-multiply") {
    const a = slotValue(0);
    const b = slotValue(1);
    const c = slotValue(2);
    const truth = a * b === c;
    const verdictCardId = equation.verdictSlot?.cardId;
    const verdictCard = verdictCardId ? state.cards[verdictCardId] : undefined;
    const verdict = verdictCard && isVerdictCard(verdictCard) ? verdictCard.verdict : false;
    const won = verdict === truth;
    // Damage = the level's flat per-turn damage. No agency over the
    // displayed product → no agency over per-card reward; rewarding the
    // verdict itself is the only sensible signal.
    const damage = findLevel(state.round.index)?.target ?? 0;
    // computedValue / expectedValue surface the truth + the kid's pick
    // so downstream UI (hint chip, evaluation banner) can show "you said
    // FALSE, the equation is TRUE" without an extra schema field. We
    // encode booleans as 1/0 — the consumer that reads this for R9 (the
    // route's UI) will format it as text.
    return {
      won,
      computedValue: truth ? 1 : 0,
      expectedValue: verdict ? 1 : 0,
      scoreEarned: won ? damage : 0,
    };
  }

  const a = slotValue(0);
  const b = slotValue(1);

  let computed: number;
  switch (equation.operator) {
    case "add":
      computed = a + b;
      break;
    case "subtract":
      computed = a - b;
      break;
    case "multiply":
      computed = a * b;
      break;
    case "divide":
      computed = b === 0 ? 0 : a / b;
      break;
    default:
      computed = 0;
      break;
  }

  // ── find-missing-result (R5–R8) + stepper-sum (R9–R11) ──────────────
  // Same evaluation contract for both: `a OP b` must equal the kid's
  // result-slot value (operandSlots[2]). The only difference is HOW
  // the value got there — drag for find-missing-result, +/- taps for
  // stepper-sum — which the evaluator doesn't care about. Damage =
  // result.value in both cases, rewarding bigger answers.
  if (equation.shape === "find-missing-result" || equation.shape === "stepper-sum") {
    const result = slotValue(2);
    const won = computed === result;
    return {
      won,
      computedValue: computed,
      expectedValue: result,
      // Damage = the kid's chosen result. Encourages bigger operands.
      scoreEarned: won ? result : 0,
    };
  }

  // ── find-missing-factor (R13) + find-leading-factor (R14) — stepper ──
  // The kid solves for a missing FACTOR by stepping a card. Win when
  // `slotValue(0) × slotValue(1) === slotValue(2)`; damage = the
  // stepper card's value (slot 0 for R14, slot 1 for R13). Two-shape
  // branch — R15 used to live here too, but moved out because its
  // multi-choice mechanic has a flat damage shape, see below.
  if (equation.shape === "find-missing-factor" || equation.shape === "find-leading-factor") {
    const c = slotValue(2);
    const won = computed === c;
    const stepper = slotValue(factorStepperSlotIndex(equation.shape));
    return {
      won,
      computedValue: computed,
      expectedValue: c,
      scoreEarned: won ? stepper : 0,
    };
  }

  // ── chant-row (R16 L1..L11) + rooftop-grid (R16 L12) ────────────────
  // These shapes have NO single moment of evaluation. Damage accrues
  // tap-by-tap via the route's R16 handlers (a correct beat tap deals
  // 1; a correct grid tap deals the product). The static `evaluateRound`
  // entry is therefore a no-op — return a lost outcome so the standard
  // win/advance flow doesn't trigger off a stray Evaluate click. The
  // route's R16 handlers manage HP directly through a different state-
  // transition path (handleChantTap / handleRooftopTap below).
  if (equation.shape === "chant-row" || equation.shape === "rooftop-grid") {
    return {
      won: false,
      computedValue: 0,
      expectedValue: 0,
      scoreEarned: 0,
    };
  }

  // ── find-product (R15, multi-choice) ────────────────────────────────
  // operandSlots = [a (locked), b (locked), answer (kid-tap-fillable)].
  // Win when the kid's chosen card at slot 2 has value === a × b.
  // Damage is FLAT 1 on a win — the route uses level HP as the count
  // of equations the kid needs to solve to fell the enemy, which is
  // the cleanest possible mapping from "one correct answer = one
  // visible win" to combat math. No incremental cheat path: every
  // pick is a full commit, wrong picks re-deal with new distractors.
  if (equation.shape === "find-product") {
    const c = slotValue(2);
    const won = computed === c && c !== 0;
    return {
      won,
      computedValue: computed,
      expectedValue: c,
      scoreEarned: won ? 1 : 0,
    };
  }

  // ── find-sum (default) ──────────────────────────────────────────────
  // Comparator decides what "won" means. "eq" is the tier-1 contract.
  // "gt"/"lt" introduce inequality goals — the player has produced any
  // result strictly past the boundary. Defaulting handles tier-1 IDB
  // rows that pre-date the comparator field.
  const expectedTarget = equation.target;
  const expected = expectedTarget && isNumberCard(expectedTarget) ? expectedTarget.value : 0;
  const comparator = equation.comparator ?? "eq";
  const won = compare(computed, comparator, expected);
  return {
    won,
    computedValue: computed,
    expectedValue: expected,
    // Damage = the equation's target value. Bigger equations hit harder.
    scoreEarned: won ? expected : 0,
  };
}
