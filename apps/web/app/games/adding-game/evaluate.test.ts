import { describe, expect, test } from "bun:test";
import { ADDING_GAME_DEFAULT, type AddingGameState } from "@dean-stack/schemas";

import { dealRound } from "./deal";
import { evaluateRound } from "./evaluate";
import { findLevel } from "./levels";
import { applySwap } from "./swap";

// Level 1 is the entry-level: add / eq / target 6 / hp 6 / range 1-5.
const LEVEL_1_TARGET = 6;

function makeState(): AddingGameState {
  const result = dealRound({ levelIndex: 1, random: () => 0.5 });
  return {
    ...ADDING_GAME_DEFAULT,
    status: "playing",
    cards: result.cards,
    player: { ...ADDING_GAME_DEFAULT.player, hand: result.hand },
    round: result.round,
  };
}

function findPair(state: AddingGameState, target: number): [number, number] {
  const values = state.player.hand.map((slot) => {
    if (!slot.cardId) return 0;
    const c = state.cards[slot.cardId];
    return c && c.kind === "number" ? c.value : 0;
  });
  for (let a = 0; a < values.length; a++) {
    for (let b = a + 1; b < values.length; b++) {
      const va = values[a];
      const vb = values[b];
      if (va !== undefined && vb !== undefined && va + vb === target) return [a, b];
    }
  }
  throw new Error("no pair sums to target — dealRound contract violated");
}

describe("evaluateRound", () => {
  test("returns null when no round is active", () => {
    expect(evaluateRound(ADDING_GAME_DEFAULT)).toBeNull();
  });

  test("empty operand slots evaluate to 0 against the level-1 target → loss", () => {
    const result = evaluateRound(makeState());
    expect(result?.computedValue).toBe(0);
    expect(result?.expectedValue).toBe(LEVEL_1_TARGET);
    expect(result?.won).toBe(false);
    expect(result?.scoreEarned).toBe(0);
  });

  test("placing two cards summing to target wins and awards damage = target", () => {
    let state = makeState();
    const [i, j] = findPair(state, LEVEL_1_TARGET);
    state = applySwap(state, { kind: "hand", id: `hand:${i}` }, { kind: "equation", id: "eq:0" });
    state = applySwap(state, { kind: "hand", id: `hand:${j}` }, { kind: "equation", id: "eq:1" });

    const result = evaluateRound(state);
    expect(result?.won).toBe(true);
    expect(result?.computedValue).toBe(LEVEL_1_TARGET);
    expect(result?.scoreEarned).toBe(LEVEL_1_TARGET);
  });

  test("partial: one operand filled — computed = filled value, no win", () => {
    let state = makeState();
    const [i] = findPair(state, LEVEL_1_TARGET);
    state = applySwap(state, { kind: "hand", id: `hand:${i}` }, { kind: "equation", id: "eq:0" });

    const result = evaluateRound(state);
    const filledCard = state.cards[state.round?.equation.operandSlots[0]?.cardId ?? ""];
    const filledValue = filledCard && filledCard.kind === "number" ? filledCard.value : undefined;
    expect(result?.computedValue).toBe(filledValue ?? 0);
    expect(result?.won).toBe(false);
  });

  test("level config drives the evaluator's expected target", () => {
    // Verify the test's assumption: level 1 really is target 6.
    expect(findLevel(1)?.target).toBe(LEVEL_1_TARGET);
    expect(findLevel(1)?.operator).toBe("add");
    expect(findLevel(1)?.comparator).toBe("eq");
  });
});

// ── R5 / R6: find-missing-result ─────────────────────────────────────────
// Level 24: R5, glass-manta, "1 + ? = ?" (position=first, static=1, add).
// Level 29: R6, glass-manta, "6 - ? = ?" (position=first, static=6, sub).
// Both rounds cap operand AND result cards at 1–5.
describe("evaluateRound — find-missing-result (R5)", () => {
  function makeR5State(): AddingGameState {
    const dealt = dealRound({ levelIndex: 24, random: () => 0.5 });
    return {
      ...ADDING_GAME_DEFAULT,
      status: "playing",
      cards: dealt.cards,
      player: { ...ADDING_GAME_DEFAULT.player, hand: dealt.hand },
      round: dealt.round,
    };
  }

  test("empty operand AND empty result → computed=staticValue, expected=0, no win", () => {
    const state = makeR5State();
    const r = evaluateRound(state);
    // staticValue=1 at slot 0; slots 1 & 2 empty (0). computed = 1 + 0 = 1.
    expect(r?.computedValue).toBe(1);
    expect(r?.expectedValue).toBe(0);
    expect(r?.won).toBe(false);
    expect(r?.scoreEarned).toBe(0);
  });

  test("placing operand=3 and result=4 wins (1 + 3 = 4) with damage=4", () => {
    let state = makeR5State();
    // Force two specific values into the kid's hand so we drag predictable cards.
    const handIds = state.player.hand.flatMap((s) => (s.cardId ? [s.cardId] : []));
    const operandCardId = handIds[0]!;
    const resultCardId = handIds[1]!;
    state = {
      ...state,
      cards: {
        ...state.cards,
        [operandCardId]: { id: operandCardId, kind: "number", value: 3 },
        [resultCardId]: { id: resultCardId, kind: "number", value: 4 },
      },
    };
    state = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:1" });
    state = applySwap(state, { kind: "hand", id: "hand:1" }, { kind: "equation", id: "eq:result" });

    const r = evaluateRound(state);
    expect(r?.won).toBe(true);
    expect(r?.computedValue).toBe(4);
    expect(r?.expectedValue).toBe(4);
    expect(r?.scoreEarned).toBe(4);
  });

  test("inconsistent operand/result loses (1 + 3 = 4 ≠ 5)", () => {
    let state = makeR5State();
    const handIds = state.player.hand.flatMap((s) => (s.cardId ? [s.cardId] : []));
    const operandCardId = handIds[0]!;
    const resultCardId = handIds[1]!;
    state = {
      ...state,
      cards: {
        ...state.cards,
        [operandCardId]: { id: operandCardId, kind: "number", value: 3 },
        [resultCardId]: { id: resultCardId, kind: "number", value: 5 },
      },
    };
    state = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:1" });
    state = applySwap(state, { kind: "hand", id: "hand:1" }, { kind: "equation", id: "eq:result" });

    const r = evaluateRound(state);
    expect(r?.won).toBe(false);
    expect(r?.computedValue).toBe(4);
    expect(r?.expectedValue).toBe(5);
    expect(r?.scoreEarned).toBe(0);
  });

  test("locked slot refuses applySwap from the kid's hand", () => {
    const state = makeR5State();
    // Slot 0 is locked at deal time (the static).
    const after = applySwap(
      state,
      { kind: "hand", id: "hand:0" },
      { kind: "equation", id: "eq:0" },
    );
    expect(after).toBe(state);
  });
});

describe("evaluateRound — find-missing-result (R6, subtract)", () => {
  function makeR6State(): AddingGameState {
    const dealt = dealRound({ levelIndex: 29, random: () => 0.5 });
    return {
      ...ADDING_GAME_DEFAULT,
      status: "playing",
      cards: dealt.cards,
      player: { ...ADDING_GAME_DEFAULT.player, hand: dealt.hand },
      round: dealt.round,
    };
  }

  test("6 − 2 = 4 wins, damage = 4", () => {
    let state = makeR6State();
    const handIds = state.player.hand.flatMap((s) => (s.cardId ? [s.cardId] : []));
    const operandCardId = handIds[0]!;
    const resultCardId = handIds[1]!;
    state = {
      ...state,
      cards: {
        ...state.cards,
        [operandCardId]: { id: operandCardId, kind: "number", value: 2 },
        [resultCardId]: { id: resultCardId, kind: "number", value: 4 },
      },
    };
    state = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:1" });
    state = applySwap(state, { kind: "hand", id: "hand:1" }, { kind: "equation", id: "eq:result" });

    const r = evaluateRound(state);
    expect(r?.won).toBe(true);
    expect(r?.computedValue).toBe(4);
    expect(r?.expectedValue).toBe(4);
    expect(r?.scoreEarned).toBe(4);
  });
});

// ── R13: find-missing-factor ──────────────────────────────────────────────
// Level 64 is the entry R13 level: multiply / eq / handValueRange 1..5.
// Equation layout: [a locked] × [stepper locked] = [c locked].
//
// Damage on win = stepper.value (NOT result.value) — this differs from
// stepper-sum, where slotValue(2) is the kid's answer. Tests pin the
// difference so a future refactor that "unifies" the two branches
// notices the contract change.
describe("evaluateRound — find-missing-factor (R13)", () => {
  function makeR13State(): AddingGameState {
    const dealt = dealRound({ levelIndex: 64, random: () => 0.5 });
    return {
      ...ADDING_GAME_DEFAULT,
      status: "playing",
      cards: dealt.cards,
      player: { ...ADDING_GAME_DEFAULT.player, hand: dealt.hand },
      round: dealt.round,
    };
  }

  function setStepperTo(state: AddingGameState, value: number): AddingGameState {
    const stepperSlot = state.round?.equation.operandSlots[1];
    const id = stepperSlot?.cardId;
    if (!id) throw new Error("R13: missing stepper card");
    return {
      ...state,
      cards: {
        ...state.cards,
        [id]: { id, kind: "number", value },
      },
    };
  }

  test("stepper equal to the true answer wins, damage = stepper.value", () => {
    let state = makeR13State();
    const [aSlot, , cSlot] = state.round!.equation.operandSlots;
    const aCard = state.cards[aSlot!.cardId!];
    const cCard = state.cards[cSlot!.cardId!];
    if (!aCard || aCard.kind !== "number" || !cCard || cCard.kind !== "number") {
      throw new Error("R13: expected NumberCards at a and c");
    }
    const answer = cCard.value / aCard.value;
    state = setStepperTo(state, answer);
    const r = evaluateRound(state);
    expect(r?.won).toBe(true);
    expect(r?.computedValue).toBe(cCard.value);
    expect(r?.expectedValue).toBe(cCard.value);
    expect(r?.scoreEarned).toBe(answer);
  });

  test("stepper off by one — loss, scoreEarned 0, computedValue surfaces the wrong product", () => {
    let state = makeR13State();
    const [aSlot, , cSlot] = state.round!.equation.operandSlots;
    const aCard = state.cards[aSlot!.cardId!];
    const cCard = state.cards[cSlot!.cardId!];
    if (!aCard || aCard.kind !== "number" || !cCard || cCard.kind !== "number") {
      throw new Error("R13: expected NumberCards at a and c");
    }
    const answer = cCard.value / aCard.value;
    state = setStepperTo(state, answer + 1);
    const r = evaluateRound(state);
    expect(r?.won).toBe(false);
    expect(r?.computedValue).toBe(aCard.value * (answer + 1));
    expect(r?.expectedValue).toBe(cCard.value);
    expect(r?.scoreEarned).toBe(0);
  });

  test("stepper at 0 — loss, computed = 0", () => {
    let state = makeR13State();
    state = setStepperTo(state, 0);
    const r = evaluateRound(state);
    expect(r?.won).toBe(false);
    expect(r?.computedValue).toBe(0);
    expect(r?.scoreEarned).toBe(0);
  });
});

// ── R14: find-leading-factor (stepper on the LEFT) ────────────────────────
// Level 69 is the entry R14 level. Layout: [stepper] × [b locked] = [c locked].
// Damage = stepper.value (slotValue(0)) on a win — mirrors R13 with the
// stepper relocated.
describe("evaluateRound — find-leading-factor (R14)", () => {
  function makeR14State(): AddingGameState {
    const dealt = dealRound({ levelIndex: 69, random: () => 0.5 });
    return {
      ...ADDING_GAME_DEFAULT,
      status: "playing",
      cards: dealt.cards,
      player: { ...ADDING_GAME_DEFAULT.player, hand: dealt.hand },
      round: dealt.round,
    };
  }

  function setLeadingTo(state: AddingGameState, value: number): AddingGameState {
    const stepperSlot = state.round?.equation.operandSlots[0];
    const id = stepperSlot?.cardId;
    if (!id) throw new Error("R14: missing stepper card");
    return {
      ...state,
      cards: {
        ...state.cards,
        [id]: { id, kind: "number", value },
      },
    };
  }

  test("stepper equal to the true leading factor wins, damage = stepper.value", () => {
    let state = makeR14State();
    const [, bSlot, cSlot] = state.round!.equation.operandSlots;
    const bCard = state.cards[bSlot!.cardId!];
    const cCard = state.cards[cSlot!.cardId!];
    if (!bCard || bCard.kind !== "number" || !cCard || cCard.kind !== "number") {
      throw new Error("R14: expected NumberCards at b and c");
    }
    const answer = cCard.value / bCard.value;
    state = setLeadingTo(state, answer);
    const r = evaluateRound(state);
    expect(r?.won).toBe(true);
    expect(r?.computedValue).toBe(cCard.value);
    expect(r?.scoreEarned).toBe(answer);
  });

  test("stepper off by one — loss, computedValue surfaces the wrong product", () => {
    let state = makeR14State();
    const [, bSlot, cSlot] = state.round!.equation.operandSlots;
    const bCard = state.cards[bSlot!.cardId!];
    const cCard = state.cards[cSlot!.cardId!];
    if (!bCard || bCard.kind !== "number" || !cCard || cCard.kind !== "number") {
      throw new Error("R14: expected NumberCards at b and c");
    }
    const answer = cCard.value / bCard.value;
    state = setLeadingTo(state, answer + 1);
    const r = evaluateRound(state);
    expect(r?.won).toBe(false);
    expect(r?.computedValue).toBe((answer + 1) * bCard.value);
    expect(r?.scoreEarned).toBe(0);
  });
});

// ── R15: find-product (multi-choice) ──────────────────────────────────────
// Level 74 is the entry R15 level. Layout: [a locked] × [b locked] =
// [answer slot]. The kid taps one of 5 candidate cards (1 correct + 4
// distractors). Damage on win is FLAT 1 — HP per level = number of
// equations to solve. No stepper, no incremental cheat path.
describe("evaluateRound — find-product (R15, multi-choice)", () => {
  function makeR15State(): AddingGameState {
    const dealt = dealRound({ levelIndex: 74, random: () => 0.5 });
    return {
      ...ADDING_GAME_DEFAULT,
      status: "playing",
      cards: dealt.cards,
      player: { ...ADDING_GAME_DEFAULT.player, hand: dealt.hand },
      round: dealt.round,
    };
  }

  function pickChoice(state: AddingGameState, predicate: (value: number) => boolean): string {
    const choices = state.round?.equation.choices ?? [];
    for (const c of choices) {
      if (c.kind === "number" && predicate(c.value)) return c.id;
    }
    throw new Error("R15: no matching choice found");
  }

  function placeAnswer(state: AddingGameState, cardId: string): AddingGameState {
    const slot = state.round?.equation.operandSlots[2];
    if (!slot) throw new Error("R15: missing answer slot");
    return {
      ...state,
      round: {
        ...state.round!,
        equation: {
          ...state.round!.equation,
          operandSlots: state.round!.equation.operandSlots.map((s) =>
            s.id === slot.id ? { ...s, cardId } : s,
          ),
        },
      },
    };
  }

  test("placing the correct choice wins, damage = 1 (flat)", () => {
    let state = makeR15State();
    const [aSlot, bSlot] = state.round!.equation.operandSlots;
    const aCard = state.cards[aSlot!.cardId!];
    const bCard = state.cards[bSlot!.cardId!];
    if (!aCard || aCard.kind !== "number" || !bCard || bCard.kind !== "number") {
      throw new Error("R15: expected NumberCards at a and b");
    }
    const product = aCard.value * bCard.value;
    const correctId = pickChoice(state, (v) => v === product);
    state = placeAnswer(state, correctId);
    const r = evaluateRound(state);
    expect(r?.won).toBe(true);
    expect(r?.computedValue).toBe(product);
    expect(r?.expectedValue).toBe(product);
    expect(r?.scoreEarned).toBe(1);
  });

  test("placing a wrong choice loses, scoreEarned 0", () => {
    let state = makeR15State();
    const [aSlot, bSlot] = state.round!.equation.operandSlots;
    const aCard = state.cards[aSlot!.cardId!];
    const bCard = state.cards[bSlot!.cardId!];
    if (!aCard || aCard.kind !== "number" || !bCard || bCard.kind !== "number") {
      throw new Error("R15: expected NumberCards at a and b");
    }
    const product = aCard.value * bCard.value;
    const wrongId = pickChoice(state, (v) => v !== product);
    state = placeAnswer(state, wrongId);
    const r = evaluateRound(state);
    expect(r?.won).toBe(false);
    expect(r?.scoreEarned).toBe(0);
    expect(r?.computedValue).toBe(product);
  });

  test("empty answer slot — loss (c === 0 short-circuits win check)", () => {
    const state = makeR15State();
    const r = evaluateRound(state);
    expect(r?.won).toBe(false);
    expect(r?.scoreEarned).toBe(0);
  });
});
