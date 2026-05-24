import { describe, expect, test } from "bun:test";

import { computeIpadMinutes, gradeWorksheet } from "./grade";
import type { Worksheet } from "./schema";

const makeFillBlankWorksheet = (answers: readonly number[]): Worksheet => ({
  stageId: "s5",
  variant: "A",
  seed: 1,
  stage: {
    id: "s5",
    ordinal: 5,
    title: "T",
    subtitle: "S",
    introCopy: "intro intro intro intro",
    instruction: "do the thing.",
    paperShape: "fill-blank",
    operator: "add",
    comparator: "eq",
    operandRange: { min: 0, max: 9 },
    resultRange: { min: 0, max: 9 },
    problemCount: answers.length,
  },
  problems: answers.map((ans, i) => ({
    id: `p${i + 1}`,
    index: i,
    kind: "fill-blank" as const,
    operator: "add" as const,
    a: 1,
    b: 2,
    c: ans,
    blank: "c" as const,
    answer: ans,
  })),
});

describe("gradeWorksheet — single-digit fill-blank auto-grading", () => {
  test("all correct → correct === total, every cell gradeable", () => {
    const ws = makeFillBlankWorksheet([3, 5, 7]);
    const captures = new Map([
      ["p1", { problemId: "p1", digit: "3", confident: true }],
      ["p2", { problemId: "p2", digit: "5", confident: true }],
      ["p3", { problemId: "p3", digit: "7", confident: true }],
    ]);
    const g = gradeWorksheet(ws, captures);
    expect(g.total).toBe(3);
    expect(g.correct).toBe(3);
    expect(g.gradeableTotal).toBe(3);
  });

  test("a wrong digit grades as incorrect even when confident", () => {
    const ws = makeFillBlankWorksheet([3, 5, 7]);
    const captures = new Map([
      ["p1", { problemId: "p1", digit: "9", confident: true }],
      ["p2", { problemId: "p2", digit: "5", confident: true }],
      ["p3", { problemId: "p3", digit: "7", confident: true }],
    ]);
    const g = gradeWorksheet(ws, captures);
    expect(g.correct).toBe(2);
  });

  test("an unconfident capture is never marked correct", () => {
    const ws = makeFillBlankWorksheet([3]);
    const captures = new Map([
      // Right digit but the recognizer wasn't confident — treat as ungraded.
      ["p1", { problemId: "p1", digit: "3", confident: false }],
    ]);
    const g = gradeWorksheet(ws, captures);
    expect(g.correct).toBe(0);
    const cell = g.cells[0];
    expect(cell?.gradeable).toBe(true);
    if (cell?.gradeable) {
      expect(cell.correct).toBe(false);
    }
  });

  test("missing captures count as incorrect (not crashes)", () => {
    const ws = makeFillBlankWorksheet([3, 5]);
    const g = gradeWorksheet(ws, new Map());
    expect(g.correct).toBe(0);
    expect(g.gradeableTotal).toBe(2);
  });

  test("multi-digit fill-blank (10+) falls back to manual review", () => {
    const ws = makeFillBlankWorksheet([13]);
    const captures = new Map([["p1", { problemId: "p1", digit: "1", confident: true }]]);
    const g = gradeWorksheet(ws, captures);
    expect(g.gradeableTotal).toBe(0);
    const cell = g.cells[0];
    expect(cell?.gradeable).toBe(false);
    if (cell && !cell.gradeable) {
      expect(cell.reason).toMatch(/manual review/i);
    }
  });
});

describe("computeIpadMinutes — matches the printed TimeCoupon math", () => {
  test("0 correct → 0 minutes", () => {
    expect(computeIpadMinutes(graded(0, 0, 12))).toBe(0);
  });

  test("4 of 12 gradeable correct (mid-grade) → 1 base + 2 bonus = 3 (perfect on graded slice)", () => {
    // The "perfect-attempt" bonus triggers on the GRADEABLE subset — at
    // 4/4 graded right, the bonus fires.
    expect(computeIpadMinutes(graded(4, 4, 12))).toBe(3);
  });

  test("8 correct out of 12 gradeable → 2 base + 0 bonus = 2 (missed a few)", () => {
    expect(computeIpadMinutes(graded(8, 12, 12))).toBe(2);
  });

  test("all 12 correct out of 12 gradeable → 3 base + 2 bonus = 5 minutes", () => {
    expect(computeIpadMinutes(graded(12, 12, 12))).toBe(5);
  });

  test("partial-gradeable + perfect on graded → bonus applies", () => {
    // Only 6 problems out of 12 are gradeable; kid gets all 6 → 1 + 2 = 3.
    expect(computeIpadMinutes(graded(6, 6, 12))).toBe(3);
  });

  test("zero gradeable cells → 0 minutes (avoid divide-by-zero edge)", () => {
    expect(computeIpadMinutes(graded(0, 0, 12))).toBe(0);
  });
});

function graded(
  correct: number,
  gradeableTotal: number,
  total: number,
): ReturnType<typeof gradeWorksheet> {
  return {
    worksheetSlug: "test",
    correct,
    gradeableTotal,
    total,
    cells: [],
  };
}
