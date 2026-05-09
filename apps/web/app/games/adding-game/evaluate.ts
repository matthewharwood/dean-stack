import type { AddingGameState, Comparator, RoundOutcome } from "@dean-stack/schemas";

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

// Pure evaluator. Empty operand slots count as 0 — confirmed in spec, lets the
// player partially evaluate ("10 + 0 = 10" wins; target=0 with all empty also
// wins). The operator is applied left-to-right across the operand list.
//
// Two equation shapes:
//
//   "find-sum" (R1–R4):
//     LHS = operandSlots[0] OP operandSlots[1].
//     Win when `LHS cmp target.value` (cmp ∈ eq/gt/lt).
//     Damage on win = target.value (the equation's "expectedValue"). Bigger
//     equations hit harder.
//
//   "find-missing-result" (R5–R6):
//     LHS = operandSlots[0] OP operandSlots[1] (one of those slots is locked
//           with the static; the other holds the kid's chosen operand).
//     RHS = operandSlots[2] (the kid's chosen result card). Always "eq".
//     Win when `LHS === RHS`.
//     Damage on win = RHS (the kid's chosen result). Reward shape: bigger
//     result = bigger hit, so picking bolder operand cards pays off — but
//     ONLY when the math agrees, which is the whole point.
//
// On loss, scoreEarned is 0.
export function evaluateRound(state: AddingGameState): RoundOutcome | null {
  if (!state.round) return null;
  const { equation } = state.round;

  const slotValue = (idx: number): number => {
    const slot = equation.operandSlots[idx];
    if (!slot?.cardId) return 0;
    return state.cards[slot.cardId]?.value ?? 0;
  };

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

  // ── find-missing-result ─────────────────────────────────────────────
  if (equation.shape === "find-missing-result") {
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

  // ── find-sum (default) ──────────────────────────────────────────────
  // Comparator decides what "won" means. "eq" is the tier-1 contract.
  // "gt"/"lt" introduce inequality goals — the player has produced any
  // result strictly past the boundary. Defaulting handles tier-1 IDB
  // rows that pre-date the comparator field.
  const expected = equation.target?.value ?? 0;
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
