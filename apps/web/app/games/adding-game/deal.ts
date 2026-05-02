import {
  type Card,
  type CardCatalog,
  type Equation,
  HAND_SIZE,
  type HandSlot,
  type Round,
} from "@dean-stack/schemas";

// Pure dealing logic. The route's gameStart effect calls this to compute the
// next round; the result is then merged into the IDB-backed addingGameAtom.
//
// Contract:
//   - Hand has exactly HAND_SIZE cards.
//   - At least one (a, b) pair in hand satisfies a + b === target.
//   - All card ids in the returned catalog are unique.
//   - Equation has 2 operand slots (both empty) and a target card with `target` value.
//
// `random` is injected so unit tests can run with a seeded source. Production
// uses `Math.random`.

export type DealtRound = {
  round: Round;
  cards: CardCatalog;
  hand: HandSlot[];
};

export type DealOptions = {
  index: number;
  target: number;
  random?: () => number;
};

const FILLER_MIN = 1;
const FILLER_MAX = 9;

export function dealRound({ index, target, random = Math.random }: DealOptions): DealtRound {
  const pickInt = (min: number, max: number): number =>
    Math.floor(random() * (max - min + 1)) + min;

  // Guaranteed pair that sums to target.
  const a = pickInt(1, target - 1);
  const b = target - a;

  // Fillers — extra solutions that happen to sum to target are fine and even
  // desirable per the spec ("two fives or…"). We don't dedupe.
  const fillers: number[] = [];
  for (let i = 0; i < HAND_SIZE - 2; i++) {
    fillers.push(pickInt(FILLER_MIN, FILLER_MAX));
  }

  const values = shuffle([a, b, ...fillers], random);

  const cards: CardCatalog = {};
  const hand: HandSlot[] = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    const value = values[i];
    if (value === undefined) throw new Error("dealRound: hand index out of range");
    const cardId = `card:r${index}:h${i}`;
    const card: Card = { id: cardId, value };
    cards[cardId] = card;
    hand.push({ id: `hand:${i}`, cardId });
  }

  // Target card — pre-dealt into the equation, not draggable for now.
  const targetCardId = `card:r${index}:target`;
  const targetCard: Card = { id: targetCardId, value: target };
  cards[targetCardId] = targetCard;

  const equation: Equation = {
    operandSlots: [
      { id: "eq:0", cardId: null },
      { id: "eq:1", cardId: null },
    ],
    operator: "add",
    target: targetCard,
  };

  // Phase: matching. Dealing is a logical step that completes here — the visual
  // dealing animation will land us in matching when it's built. For now,
  // matching is the steady state the player sees.
  const round: Round = {
    index,
    phase: "matching",
    equation,
    outcome: null,
  };

  return { round, cards, hand };
}

function shuffle<T>(arr: readonly T[], random: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = a[i];
    const swap = a[j];
    if (tmp === undefined || swap === undefined) continue;
    a[i] = swap;
    a[j] = tmp;
  }
  return a;
}
