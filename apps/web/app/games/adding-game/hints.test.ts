import { describe, expect, test } from "bun:test";
import { ADDING_GAME_DEFAULT, type AddingGameState } from "@dean-stack/schemas";

import { dealRound } from "./deal";
import { generateHints, pickRandomHint } from "./hints";

function makeStateWithOutcome(opts: {
  levelIndex: number;
  computed: number;
  expected: number;
}): AddingGameState {
  const dealt = dealRound({ levelIndex: opts.levelIndex, random: () => 0.5 });
  const round = dealt.round;
  return {
    ...ADDING_GAME_DEFAULT,
    status: "playing",
    cards: dealt.cards,
    player: { ...ADDING_GAME_DEFAULT.player, hand: dealt.hand },
    round: {
      ...round,
      phase: "evaluating",
      outcome: {
        won: opts.computed === opts.expected,
        computedValue: opts.computed,
        expectedValue: opts.expected,
        scoreEarned: 0,
      },
    },
  };
}

describe("generateHints", () => {
  test("returns no hints when there's no round", () => {
    expect(generateHints(ADDING_GAME_DEFAULT)).toHaveLength(0);
  });

  test("returns no hints when round has no outcome", () => {
    const dealt = dealRound({ levelIndex: 1, random: () => 0.5 });
    const state: AddingGameState = {
      ...ADDING_GAME_DEFAULT,
      status: "playing",
      cards: dealt.cards,
      player: { ...ADDING_GAME_DEFAULT.player, hand: dealt.hand },
      round: dealt.round, // outcome: null
    };
    expect(generateHints(state)).toHaveLength(0);
  });

  // Level 1 is round 1: add / eq / target 6.
  test("level 1 (round 1, add eq) — too-small computed produces direction-too-small", () => {
    const state = makeStateWithOutcome({ levelIndex: 1, computed: 4, expected: 6 });
    const ids = generateHints(state).map((h) => h.id);
    expect(ids).toContain("direction-too-small");
    expect(ids).not.toContain("direction-too-big");
  });

  test("level 1 — too-big computed produces direction-too-big", () => {
    const state = makeStateWithOutcome({ levelIndex: 1, computed: 9, expected: 6 });
    const ids = generateHints(state).map((h) => h.id);
    expect(ids).toContain("direction-too-big");
    expect(ids).not.toContain("direction-too-small");
  });

  test("level 1 (add) includes number-bonds and add-counting hints", () => {
    const state = makeStateWithOutcome({ levelIndex: 1, computed: 4, expected: 6 });
    const ids = generateHints(state).map((h) => h.id);
    expect(ids).toContain("number-bonds");
    expect(ids).toContain("count-fingers-add");
    expect(ids).not.toContain("count-fingers-sub");
    expect(ids).not.toContain("sub-bigger-first");
  });

  // Level 7 is round 2: subtract / eq / target 3.
  test("level 7 (round 2, subtract eq) includes subtraction-specific hints", () => {
    const state = makeStateWithOutcome({ levelIndex: 7, computed: 1, expected: 3 });
    const ids = generateHints(state).map((h) => h.id);
    expect(ids).toContain("sub-bigger-first");
    expect(ids).toContain("sub-pair");
    expect(ids).toContain("count-fingers-sub");
    expect(ids).not.toContain("number-bonds");
    expect(ids).not.toContain("count-fingers-add");
  });

  test("hint ids are unique within a single generation", () => {
    const state = makeStateWithOutcome({ levelIndex: 1, computed: 4, expected: 6 });
    const ids = generateHints(state).map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every level produces at least 8 hints on a wrong answer", () => {
    for (let level = 1; level <= 23; level++) {
      const state = makeStateWithOutcome({ levelIndex: level, computed: 0, expected: 10 });
      const hints = generateHints(state);
      expect(hints.length).toBeGreaterThanOrEqual(8);
    }
  });

  // Level 13 is round 3: add / gt / target 7.
  test("round-3 gt level surfaces gt-specific hints, not number-bonds", () => {
    const state = makeStateWithOutcome({ levelIndex: 13, computed: 5, expected: 7 });
    const ids = generateHints(state).map((h) => h.id);
    expect(ids).toContain("gt-need-bigger");
    expect(ids).toContain("gt-boundary");
    expect(ids).toContain("count-past");
    expect(ids).not.toContain("number-bonds");
    expect(ids).not.toContain("direction-too-small");
    expect(ids).not.toContain("missing-number");
    expect(ids).not.toContain("off-by");
  });

  // Level 14 is round 3: add / lt / target 9.
  test("round-3 lt level surfaces lt-specific hints", () => {
    const state = makeStateWithOutcome({ levelIndex: 14, computed: 12, expected: 9 });
    const ids = generateHints(state).map((h) => h.id);
    expect(ids).toContain("lt-need-smaller");
    expect(ids).toContain("lt-boundary");
    expect(ids).toContain("count-under");
    expect(ids).not.toContain("gt-need-bigger");
  });

  test("every hint body interpolates the target value when the template includes one", () => {
    // Smoke check — the body should never literally say "{target}" or "${".
    const state = makeStateWithOutcome({ levelIndex: 2, computed: 5, expected: 14 });
    for (const h of generateHints(state)) {
      expect(h.body).not.toContain("${");
      expect(h.body).not.toContain("{target}");
      expect(h.body.length).toBeGreaterThan(10);
    }
  });
});

describe("pickRandomHint", () => {
  const hints = [
    { id: "a", emphasis: "A!", body: "first" },
    { id: "b", emphasis: "B!", body: "second" },
    { id: "c", emphasis: "C!", body: "third" },
  ];

  test("returns null on an empty pool", () => {
    expect(pickRandomHint([], null)).toBeNull();
  });

  test("avoids the given id when a non-trivial pool remains", () => {
    // Sweep the random space — any pick should never be the avoided id
    for (let i = 0; i < 30; i++) {
      const r = i / 30;
      const picked = pickRandomHint(hints, "a", () => r);
      expect(picked?.id).not.toBe("a");
    }
  });

  test("falls back to full pool when filtering would empty it", () => {
    const single = [{ id: "only", emphasis: "Only!", body: "x" }];
    const picked = pickRandomHint(single, "only", () => 0);
    expect(picked?.id).toBe("only");
  });
});
