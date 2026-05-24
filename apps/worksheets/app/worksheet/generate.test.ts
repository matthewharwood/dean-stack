import { describe, expect, test } from "bun:test";

import { deriveAnswerKey, deriveSeed, generateWorksheet, worksheetSlug } from "./generate";
import { type Problem, ProblemSchema, type Variant, WorksheetSchema } from "./schema";

function assertNever(x: never): never {
  throw new Error(`unreachable: unexpected discriminant ${String(x)}`);
}

function computeFillBlank(op: "add" | "subtract" | "multiply", a: number, b: number): number {
  if (op === "add") return a + b;
  if (op === "subtract") return a - b;
  return a * b;
}

import { findStage, listStages } from "./stages";

const VARIANTS: readonly Variant[] = ["A", "B", "C"];

describe("seed derivation", () => {
  test("same stage+variant -> same seed across calls", () => {
    expect(deriveSeed("s1", "A")).toBe(deriveSeed("s1", "A"));
    expect(deriveSeed("s7", "B")).toBe(deriveSeed("s7", "B"));
  });

  test("variants A/B/C produce different seeds for the same stage", () => {
    const seeds = VARIANTS.map((v) => deriveSeed("s5", v));
    const unique = new Set(seeds);
    expect(unique.size).toBe(3);
  });

  test("different stages produce different seeds for the same variant", () => {
    const seeds = listStages().map((s) => deriveSeed(s.id, "A"));
    const unique = new Set(seeds);
    // Allow a couple of hash collisions in theory; 15 stages, 32-bit hash —
    // collisions would be a real surprise. Require strict uniqueness.
    expect(unique.size).toBe(seeds.length);
  });
});

describe("generateWorksheet — happy path for every stage + variant", () => {
  for (const stage of listStages()) {
    for (const variant of VARIANTS) {
      test(`${stage.id} variant ${variant} generates a valid worksheet`, () => {
        const ws = generateWorksheet(stage.id, variant);
        // Round-trip through Zod to assert the schema contract holds end-to-end.
        const parsed = WorksheetSchema.parse(ws);
        expect(parsed.stageId).toBe(stage.id);
        expect(parsed.variant).toBe(variant);
        expect(parsed.problems.length).toBe(stage.problemCount);
        for (const p of parsed.problems) ProblemSchema.parse(p);
      });
    }
  }
});

describe("determinism", () => {
  test("two calls with the same args produce structurally identical worksheets", () => {
    const a = generateWorksheet("s9", "B");
    const b = generateWorksheet("s9", "B");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("variants A/B/C produce different problem sequences for the same stage", () => {
    const a = generateWorksheet("s1", "A");
    const b = generateWorksheet("s1", "B");
    const c = generateWorksheet("s1", "C");
    // At minimum the first problem must differ across all three.
    const firsts = [a.problems[0], b.problems[0], c.problems[0]].map((p) => JSON.stringify(p));
    expect(new Set(firsts).size).toBe(3);
  });
});

describe("no duplicate problems within a worksheet", () => {
  for (const stage of listStages()) {
    test(`${stage.id} variant A has no duplicate (within stage) problems`, () => {
      const ws = generateWorksheet(stage.id, "A");
      const keys = ws.problems.map(problemFingerprint);
      expect(new Set(keys).size).toBe(keys.length);
    });
  }
});

describe("answer correctness per shape", () => {
  for (const stage of listStages()) {
    for (const variant of VARIANTS) {
      test(`${stage.id} variant ${variant}: every answer satisfies its problem`, () => {
        const ws = generateWorksheet(stage.id, variant);
        for (const p of ws.problems) assertAnswerHolds(p);
      });
    }
  }
});

describe("range respect per stage", () => {
  for (const stage of listStages()) {
    test(`${stage.id} variant A: all operands honor the configured ranges`, () => {
      const ws = generateWorksheet(stage.id, "A");
      const { operandRange, resultRange, lockedOperandRange } = stage;
      for (const p of ws.problems) {
        switch (p.kind) {
          case "fill-pair":
            expect(p.answer.a).toBeGreaterThanOrEqual(operandRange.min);
            expect(p.answer.a).toBeLessThanOrEqual(operandRange.max);
            expect(p.answer.b).toBeGreaterThanOrEqual(operandRange.min);
            expect(p.answer.b).toBeLessThanOrEqual(operandRange.max);
            break;
          case "fill-consistent-pair":
            if (lockedOperandRange) {
              expect(p.locked.value).toBeGreaterThanOrEqual(lockedOperandRange.min);
              expect(p.locked.value).toBeLessThanOrEqual(lockedOperandRange.max);
            }
            expect(p.answer.otherOperand).toBeGreaterThanOrEqual(operandRange.min);
            expect(p.answer.otherOperand).toBeLessThanOrEqual(operandRange.max);
            // Subtract results are constrained to >= 0 (kid never writes negatives).
            if (p.operator === "subtract") expect(p.answer.result).toBeGreaterThanOrEqual(0);
            break;
          case "fill-blank":
            // For multiply stages the product must fit resultRange.
            if (p.operator === "multiply") {
              expect(p.c).toBeLessThanOrEqual(resultRange.max);
            }
            // Negative answers are off the table.
            expect(p.answer).toBeGreaterThanOrEqual(0);
            break;
          case "true-false":
            // For Stage 12 (factors 1..3), products always fit in resultRange.
            expect(p.actualResult).toBeLessThanOrEqual(stage.resultRange.max);
            break;
          default:
            assertNever(p);
        }
      }
    });
  }
});

describe("deriveAnswerKey", () => {
  test("one entry per problem, indexes match", () => {
    const ws = generateWorksheet("s1", "A");
    const ak = deriveAnswerKey(ws);
    expect(ak.entries.length).toBe(ws.problems.length);
    for (const [i, e] of ak.entries.entries()) {
      expect(e.id).toBe(`p${i + 1}`);
      expect(e.index).toBe(i);
      expect(e.display.length).toBeGreaterThan(0);
    }
  });

  test("answer key slug matches the worksheet slug", () => {
    const ws = generateWorksheet("s12", "C");
    const ak = deriveAnswerKey(ws);
    expect(ak.worksheetSlug).toBe(worksheetSlug("s12", "C"));
    const stage = findStage("s12");
    if (!stage) throw new Error("test fixture: s12 must exist");
    expect(ak.stageTitle).toBe(stage.title);
  });
});

describe("error paths", () => {
  test("unknown stageId throws a helpful error", () => {
    expect(() => generateWorksheet("s99", "A")).toThrow(/unknown stageId/);
  });
});

// ─── Test helpers ──────────────────────────────────────────────────────────

function problemFingerprint(p: Problem): string {
  switch (p.kind) {
    case "fill-pair":
      return `fp:${p.target}:${p.answer.a}-${p.answer.b}:${p.operator}:${p.comparator}`;
    case "fill-consistent-pair":
      return `fcp:${p.locked.position}=${p.locked.value}:o${p.answer.otherOperand}:${p.operator}`;
    case "fill-blank":
      return `fb:${p.a}-${p.b}-${p.c}:${p.blank}:${p.operator}`;
    case "true-false":
      return `tf:${p.a}x${p.b}=${p.claimedResult}`;
    default:
      return assertNever(p);
  }
}

function assertAnswerHolds(p: Problem): void {
  switch (p.kind) {
    case "fill-pair": {
      const computed = p.operator === "add" ? p.answer.a + p.answer.b : p.answer.a - p.answer.b;
      if (p.comparator === "eq") expect(computed).toBe(p.target);
      else if (p.comparator === "gt") expect(computed).toBeGreaterThan(p.target);
      else expect(computed).toBeLessThan(p.target);
      break;
    }
    case "fill-consistent-pair": {
      const a = p.locked.position === "a" ? p.locked.value : p.answer.otherOperand;
      const b = p.locked.position === "a" ? p.answer.otherOperand : p.locked.value;
      const computed = p.operator === "add" ? a + b : a - b;
      expect(computed).toBe(p.answer.result);
      break;
    }
    case "fill-blank": {
      const computed = computeFillBlank(p.operator, p.a, p.b);
      expect(computed).toBe(p.c);
      const slots: Record<"a" | "b" | "c", number> = { a: p.a, b: p.b, c: p.c };
      expect(p.answer).toBe(slots[p.blank]);
      break;
    }
    case "true-false": {
      expect(p.actualResult).toBe(p.a * p.b);
      expect(p.answer).toBe(p.actualResult === p.claimedResult);
      break;
    }
    default:
      assertNever(p);
  }
}
