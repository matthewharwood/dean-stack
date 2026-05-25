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

  test("every find-sum level (R1–R4) produces at least 8 hints on a wrong answer", () => {
    for (let level = 1; level <= 23; level++) {
      const state = makeStateWithOutcome({ levelIndex: level, computed: 0, expected: 10 });
      const hints = generateHints(state);
      expect(hints.length).toBeGreaterThanOrEqual(8);
    }
  });

  test("every find-missing-result level (R5–R8) produces hints on a wrong answer", () => {
    // R5..R8 levels (24..43) — every find-missing-result level. Each
    // must surface at least one finger-counting hand AND one operator-
    // specific hint so the kid sees pedagogically diverse framing. R7/R8
    // share the shape with R5/R6 (only the value cap differs), so the
    // same hint generator must keep working across the wider range.
    for (let level = 24; level <= 43; level++) {
      const state = makeStateWithOutcome({ levelIndex: level, computed: 0, expected: 10 });
      const hints = generateHints(state);
      expect(hints.length).toBeGreaterThanOrEqual(4);
      // All ids start with "fmr-" so the filter is unambiguous.
      const ids = hints.map((h) => h.id);
      for (const id of ids) {
        expect(id.startsWith("fmr-")).toBe(true);
      }
    }
  });

  test("R5 add level surfaces the add-specific count-up hint", () => {
    const state = makeStateWithOutcome({ levelIndex: 24, computed: 3, expected: 0 });
    const ids = generateHints(state).map((h) => h.id);
    expect(ids).toContain("fmr-add-count-up");
    expect(ids).not.toContain("fmr-sub-count-down");
  });

  test("R6 subtract level surfaces the sub-specific count-down hint", () => {
    const state = makeStateWithOutcome({ levelIndex: 29, computed: 10, expected: 0 });
    const ids = generateHints(state).map((h) => h.id);
    expect(ids).toContain("fmr-sub-count-down");
    expect(ids).not.toContain("fmr-add-count-up");
  });

  test("every true-false-multiply level (R12) produces tfm-prefixed hints on a wrong answer", () => {
    // R12 levels (59..63). Different shape from R5–R11 — the kid drags
    // a verdict card, not a number. Hints must teach multiplication
    // from scratch (never assume he knows it), so every id is "tfm-…"
    // and the pool is large enough to keep rotation fresh on
    // consecutive losses.
    for (let level = 59; level <= 63; level++) {
      // computed=1 (truth=true) but kid said expectedValue=0 (false) →
      // wrong-answer outcome that the hint generator can speak to.
      const state = makeStateWithOutcome({ levelIndex: level, computed: 1, expected: 0 });
      const hints = generateHints(state);
      expect(hints.length).toBeGreaterThanOrEqual(3);
      for (const id of hints.map((h) => h.id)) {
        expect(id.startsWith("tfm-")).toBe(true);
      }
    }
  });

  test("every stepper-sum level (R9–R11) produces sum-prefixed hints on a wrong answer", () => {
    // R9–R11 levels (44..58). The kid taps +/− on a stepper card;
    // hints frame the gap as a direction + a count ("tap + 3 more
    // times"). Every id is "sum-…" so the rotation filter keeps the
    // pool separate from the find-* hint pools.
    for (let level = 44; level <= 58; level++) {
      // expected = stepperValue 0; computed = real answer (small). Off
      // by a small amount in either direction so direction hints
      // trigger.
      const state = makeStateWithOutcome({ levelIndex: level, computed: 5, expected: 0 });
      const hints = generateHints(state);
      expect(hints.length).toBeGreaterThanOrEqual(3);
      for (const id of hints.map((h) => h.id)) {
        expect(id.startsWith("sum-")).toBe(true);
      }
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

  test("every find-missing-factor level (R13) produces fmf-prefixed hints on a wrong answer", () => {
    // R13 levels (64..68). Layout `a × ? = c`, kid steps the middle slot.
    // Hints frame the gap as "skip-count by a until you hit c". Every id
    // is "fmf-…" so the rotation filter keeps the pool separate from the
    // tfm-/sum-/fmr- pools.
    for (let level = 64; level <= 68; level++) {
      // Use an arbitrary wrong-answer outcome — computed lower than
      // expected, so the tap-up direction hint fires.
      const state = makeStateWithOutcome({ levelIndex: level, computed: 2, expected: 8 });
      const hints = generateHints(state);
      expect(hints.length).toBeGreaterThanOrEqual(3);
      for (const id of hints.map((h) => h.id)) {
        expect(id.startsWith("fmf-")).toBe(true);
      }
    }
  });

  test("every find-leading-factor level (R14) produces flf-prefixed hints on a wrong answer", () => {
    // R14 levels (69..73). Layout `? × b = c`; kid steps the LEFT slot.
    // Same skip-count framing as R13, just with the stepper on the
    // other side. Every id is "flf-…" so rotation stays isolated.
    for (let level = 69; level <= 73; level++) {
      const state = makeStateWithOutcome({ levelIndex: level, computed: 2, expected: 8 });
      const hints = generateHints(state);
      expect(hints.length).toBeGreaterThanOrEqual(3);
      for (const id of hints.map((h) => h.id)) {
        expect(id.startsWith("flf-")).toBe(true);
      }
    }
  });

  test("every find-product level (R15) produces fpr-prefixed hints on a wrong answer", () => {
    // R15 levels (74..78). Layout `a × b = ?`; kid computes the product
    // on the right. Hints frame "count by b, a times". Every id is
    // "fpr-…" so rotation stays isolated.
    for (let level = 74; level <= 78; level++) {
      // Wrong-answer outcome with computed < expected so direction
      // hints fire. expected up to 100 for R15.
      const state = makeStateWithOutcome({ levelIndex: level, computed: 5, expected: 40 });
      const hints = generateHints(state);
      expect(hints.length).toBeGreaterThanOrEqual(3);
      for (const id of hints.map((h) => h.id)) {
        expect(id.startsWith("fpr-")).toBe(true);
      }
    }
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
