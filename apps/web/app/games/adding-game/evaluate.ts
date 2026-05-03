import type { AddingGameState, RoundOutcome } from "@dean-stack/schemas";

// Pure evaluator. Empty operand slots count as 0 — confirmed in spec, lets the
// player partially evaluate ("10 + 0 = 10" wins; target=0 with all empty also
// wins). The operator is applied left-to-right across the operand list.
//
// Damage on win = the equation's expectedValue. Solving `_+_=14` deals 14;
// solving `_-_=4` deals 4. Repurposed `scoreEarned` to carry damage so the
// route can pull it directly from the outcome without re-deriving from
// equation state. On loss, scoreEarned is 0.
export function evaluateRound(state: AddingGameState): RoundOutcome | null {
  if (!state.round) return null;
  const { equation } = state.round;

  const operandValues = equation.operandSlots.map((slot) => {
    if (!slot.cardId) return 0;
    return state.cards[slot.cardId]?.value ?? 0;
  });

  let computed = operandValues[0] ?? 0;
  for (let i = 1; i < operandValues.length; i++) {
    const v = operandValues[i] ?? 0;
    switch (equation.operator) {
      case "add":
        computed += v;
        break;
      case "subtract":
        computed -= v;
        break;
      case "multiply":
        computed *= v;
        break;
      case "divide":
        computed = v === 0 ? 0 : computed / v;
        break;
      default:
        break;
    }
  }

  const expected = equation.target.value;
  // Comparator decides what "won" means. "eq" is the tier-1 contract.
  // "gt"/"lt" introduce inequality goals — the player has produced any
  // result strictly past the boundary. Defaulting handles tier-1 IDB
  // rows that pre-date the comparator field.
  const comparator = equation.comparator ?? "eq";
  const won =
    comparator === "eq"
      ? computed === expected
      : comparator === "gt"
        ? computed > expected
        : computed < expected;
  return {
    won,
    computedValue: computed,
    expectedValue: expected,
    // Damage = the equation's target value. Bigger equations hit harder.
    scoreEarned: won ? expected : 0,
  };
}
