import { describe, expect, test } from "bun:test";
import { ADDING_GAME_DEFAULT, type AddingGameState } from "@dean-stack/schemas";

import { dealRound } from "./deal";
import { applySwap, readCardId, slotLocatorEquals } from "./swap";

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

describe("slotLocatorEquals", () => {
  test("matches identical kind+id", () => {
    expect(slotLocatorEquals({ kind: "hand", id: "hand:0" }, { kind: "hand", id: "hand:0" })).toBe(
      true,
    );
  });
  test("rejects different kind", () => {
    expect(
      slotLocatorEquals({ kind: "hand", id: "hand:0" }, { kind: "equation", id: "hand:0" }),
    ).toBe(false);
  });
  test("nulls compare equal to nulls", () => {
    expect(slotLocatorEquals(null, null)).toBe(true);
    expect(slotLocatorEquals(null, { kind: "hand", id: "hand:0" })).toBe(false);
  });
});

describe("applySwap", () => {
  test("hand → empty equation slot moves the card", () => {
    const state = makeState();
    const cardA = state.player.hand[0]?.cardId;
    expect(cardA).toBeTruthy();

    const next = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:0" });
    expect(readCardId(next, { kind: "hand", id: "hand:0" })).toBeNull();
    expect(readCardId(next, { kind: "equation", id: "eq:0" })).toBe(cardA ?? "");
  });

  test("hand → filled equation slot swaps cards (displaced returns to hand)", () => {
    let state = makeState();
    state = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:0" });
    const placed = readCardId(state, { kind: "equation", id: "eq:0" });
    const handCard1 = state.player.hand[1]?.cardId;
    expect(placed).toBeTruthy();
    expect(handCard1).toBeTruthy();

    state = applySwap(state, { kind: "hand", id: "hand:1" }, { kind: "equation", id: "eq:0" });

    expect(readCardId(state, { kind: "equation", id: "eq:0" })).toBe(handCard1 ?? "");
    expect(readCardId(state, { kind: "hand", id: "hand:1" })).toBe(placed ?? "");
  });

  test("hand → hand exchanges cards", () => {
    const state = makeState();
    const a = state.player.hand[0]?.cardId;
    const b = state.player.hand[1]?.cardId;
    const next = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "hand", id: "hand:1" });
    expect(readCardId(next, { kind: "hand", id: "hand:0" })).toBe(b ?? "");
    expect(readCardId(next, { kind: "hand", id: "hand:1" })).toBe(a ?? "");
  });

  test("equation → hand un-places a card", () => {
    let state = makeState();
    state = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:0" });
    const placed = readCardId(state, { kind: "equation", id: "eq:0" });

    // Drag back to a known-empty hand slot
    state = applySwap(state, { kind: "equation", id: "eq:0" }, { kind: "hand", id: "hand:0" });

    expect(readCardId(state, { kind: "equation", id: "eq:0" })).toBeNull();
    expect(readCardId(state, { kind: "hand", id: "hand:0" })).toBe(placed ?? "");
  });

  test("self-swap is a no-op", () => {
    const state = makeState();
    const next = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "hand", id: "hand:0" });
    expect(next).toBe(state);
  });

  test("a swap clears any prior evaluation outcome", () => {
    const base = makeState();
    const stale: AddingGameState = base.round
      ? {
          ...base,
          round: {
            ...base.round,
            phase: "evaluating",
            outcome: { won: false, computedValue: 0, expectedValue: 10, scoreEarned: 0 },
          },
        }
      : base;

    const next = applySwap(stale, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:0" });
    expect(next.round?.phase).toBe("matching");
    expect(next.round?.outcome).toBeNull();
  });
});
