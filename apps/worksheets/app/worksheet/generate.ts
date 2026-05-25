import {
  type AnswerKey,
  type AnswerKeyEntry,
  AnswerKeySchema,
  type FillBlankProblem,
  type FillConsistentPairProblem,
  type FillPairProblem,
  type Problem,
  type Stage,
  type TrueFalseProblem,
  type Variant,
  type Worksheet,
  WorksheetSchema,
} from "./schema";
import { hashString, pickInt, pickOne, seededRandom } from "./seeded-random";
import { findStage } from "./stages";

const VARIANT_SALT: Record<Variant, number> = { A: 1, B: 2, C: 3 };

const MAX_PROBLEM_ATTEMPTS = 100;

export function deriveSeed(stageId: string, variant: Variant): number {
  // Mixing the salt in instead of concatenating + hashing means a single
  // 1-bit change between A/B/C produces a meaningfully different LCG state.
  return (hashString(stageId) ^ Math.imul(VARIANT_SALT[variant], 0x9e37_79b9)) >>> 0;
}

export function worksheetSlug(stageId: string, variant: Variant): string {
  return `${stageId}-${variant.toLowerCase()}`;
}

// ─── Entry point ───────────────────────────────────────────────────────────

export function generateWorksheet(stageId: string, variant: Variant): Worksheet {
  const stage = findStage(stageId);
  if (!stage) {
    throw new Error(`generateWorksheet: unknown stageId "${stageId}"`);
  }
  const seed = deriveSeed(stageId, variant);
  const rng = seededRandom(seed);
  const problems = generateProblems(stage, rng);
  // Parse-on-return for a free runtime contract check. The full call is
  // O(problemCount) — cheap enough to keep in prod, but if profile data ever
  // says otherwise it's safe to wrap in `import.meta.env.DEV`.
  return WorksheetSchema.parse({ stageId, variant, seed, stage, problems });
}

export function deriveAnswerKey(worksheet: Worksheet): AnswerKey {
  const entries: AnswerKeyEntry[] = worksheet.problems.map((p) => ({
    id: p.id,
    index: p.index,
    display: renderAnswer(p),
  }));
  return AnswerKeySchema.parse({
    worksheetSlug: worksheetSlug(worksheet.stageId, worksheet.variant),
    stageTitle: worksheet.stage.title,
    variant: worksheet.variant,
    entries,
  });
}

// ─── Problem generation per paperShape ─────────────────────────────────────

function generateProblems(stage: Stage, rng: () => number): Problem[] {
  const problems: Problem[] = [];
  const seen = new Set<string>();
  let i = 0;
  let safety = 0;

  while (problems.length < stage.problemCount) {
    if (safety++ > MAX_PROBLEM_ATTEMPTS * stage.problemCount) {
      throw new Error(
        `generateProblems: stuck for stage ${stage.id} — too many duplicates, widen the range`,
      );
    }
    const next = generateOneProblem(stage, rng, i);
    const key = dedupKey(next);
    if (seen.has(key)) continue;
    seen.add(key);
    problems.push(next);
    i++;
  }
  return problems;
}

function generateOneProblem(stage: Stage, rng: () => number, index: number): Problem {
  const id = `p${index + 1}`;
  switch (stage.paperShape) {
    case "fill-pair":
      return generateFillPair(stage, rng, id, index);
    case "fill-consistent-pair":
      return generateFillConsistentPair(stage, rng, id, index);
    case "fill-blank":
      return generateFillBlank(stage, rng, id, index);
    case "true-false":
      return generateTrueFalse(stage, rng, id, index);
    default:
      return assertNever(stage.paperShape);
  }
}

function assertNever(x: never): never {
  throw new Error(`unreachable: unexpected discriminant ${String(x)}`);
}

function pickSlot(slots: { a: number; b: number; c: number }, key: "a" | "b" | "c"): number {
  return slots[key];
}

type ComparatorResult = "eq" | "gt" | "lt";

// ─── fill-pair (Stages 1–4) ────────────────────────────────────────────────

function pickOperator(stage: Stage, rng: () => number): "add" | "subtract" | "multiply" {
  if (stage.operator === "mixed-add-sub") return pickOne(rng, ["add", "subtract"] as const);
  return stage.operator;
}

function generateFillPair(
  stage: Stage,
  rng: () => number,
  id: string,
  index: number,
): FillPairProblem {
  const { operandRange, resultRange } = stage;
  // Value-first algorithm: pick (op, a, b) freely, compute the value, then
  // pick a comparator+target that's actually satisfiable. If no comparator
  // can be satisfied for this value, retry the whole problem. This is the
  // only shape with mixed comparators, so the retry loop lives here.
  for (let attempt = 0; attempt < 80; attempt++) {
    const op = pickOperator(stage, rng);
    if (op === "multiply") {
      throw new Error("fill-pair does not support multiply (no current stage uses it)");
    }
    let a = pickInt(rng, operandRange.min, operandRange.max);
    let b = pickInt(rng, operandRange.min, operandRange.max);
    if (op === "subtract" && a < b) [a, b] = [b, a];
    const value = op === "add" ? a + b : a - b;
    if (value < 0) continue;

    const allowed = validComparators(stage, value);
    if (allowed.length === 0) continue;
    const cmp = pickOne(rng, allowed);
    const target = pickTargetForComparator(cmp, value, resultRange, rng);
    if (target === null) continue;

    return {
      kind: "fill-pair",
      id,
      index,
      operator: op,
      comparator: cmp,
      target,
      answer: { a, b },
    };
  }
  throw new Error(
    `generateFillPair: could not satisfy stage ${stage.id} after 80 attempts — widen the range`,
  );
}

function validComparators(stage: Stage, value: number): ComparatorResult[] {
  const allowed: ComparatorResult[] =
    stage.comparator === "mixed-gt-lt" ? ["gt", "lt"] : [stage.comparator];
  const { resultRange } = stage;
  return allowed.filter((c) => {
    if (c === "eq") return value >= resultRange.min && value <= resultRange.max;
    if (c === "gt") return resultRange.min < value;
    return value < resultRange.max;
  });
}

function pickTargetForComparator(
  cmp: ComparatorResult,
  value: number,
  resultRange: { min: number; max: number },
  rng: () => number,
): number | null {
  if (cmp === "eq") {
    return value >= resultRange.min && value <= resultRange.max ? value : null;
  }
  if (cmp === "gt") {
    // target < value
    const tmin = resultRange.min;
    const tmax = Math.min(resultRange.max, value - 1);
    return tmax >= tmin ? pickInt(rng, tmin, tmax) : null;
  }
  // lt — target > value
  const tmin = Math.max(resultRange.min, value + 1);
  const tmax = resultRange.max;
  return tmax >= tmin ? pickInt(rng, tmin, tmax) : null;
}

// ─── fill-consistent-pair (Stages 5–8) ─────────────────────────────────────

function generateFillConsistentPair(
  stage: Stage,
  rng: () => number,
  id: string,
  index: number,
): FillConsistentPairProblem {
  const op = pickOperator(stage, rng);
  if (op === "multiply") {
    throw new Error("fill-consistent-pair does not support multiply");
  }
  const locked = stage.lockedOperandRange ?? stage.operandRange;
  const position = stage.lockedPosition ?? "a";
  const lockedValue = pickInt(rng, locked.min, locked.max);

  // Pick the other operand such that the result lands in resultRange.
  const { operandRange, resultRange } = stage;
  let otherOperand = pickInt(rng, operandRange.min, operandRange.max);
  let result = computeBinary(op, position, lockedValue, otherOperand);

  // For subtract, ensure result >= 0.
  if (op === "subtract" && result < 0) {
    otherOperand = pickInt(rng, operandRange.min, Math.min(operandRange.max, lockedValue));
    result = computeBinary(op, position, lockedValue, otherOperand);
  }
  // Clamp into resultRange by re-picking otherOperand if needed.
  if (result < resultRange.min || result > resultRange.max) {
    const want = pickInt(rng, resultRange.min, resultRange.max);
    otherOperand = op === "add" ? want - lockedValue : lockedValue - want;
    if (otherOperand < operandRange.min || otherOperand > operandRange.max) {
      otherOperand = Math.min(operandRange.max, Math.max(operandRange.min, otherOperand));
    }
    result = computeBinary(op, position, lockedValue, otherOperand);
  }

  return {
    kind: "fill-consistent-pair",
    id,
    index,
    operator: op,
    locked: { position, value: lockedValue },
    answer: { otherOperand, result },
  };
}

function computeBinary(
  op: "add" | "subtract",
  lockedPosition: "a" | "b",
  lockedValue: number,
  otherOperand: number,
): number {
  // When the locked operand is in position "a", the layout is locked + other.
  // When in position "b", it's other + locked. Order matters for subtract.
  const a = lockedPosition === "a" ? lockedValue : otherOperand;
  const b = lockedPosition === "a" ? otherOperand : lockedValue;
  return op === "add" ? a + b : a - b;
}

// ─── fill-blank (Stages 9–11, 13–15) ───────────────────────────────────────

function generateFillBlank(
  stage: Stage,
  rng: () => number,
  id: string,
  index: number,
): FillBlankProblem {
  const op = pickOperator(stage, rng);
  const blank = stage.blankPosition ?? "b";
  const { operandRange, resultRange } = stage;

  let a = pickInt(rng, operandRange.min, operandRange.max);
  let b = pickInt(rng, operandRange.min, operandRange.max);
  let c: number;

  if (op === "multiply") {
    // Bound the product into resultRange. For our stages (max 81) and operand
    // range (max 9) this is already in range, but re-pick if a product slips.
    let safety = 0;
    while (a * b > resultRange.max || a * b < Math.max(resultRange.min, 1)) {
      a = pickInt(rng, operandRange.min, operandRange.max);
      b = pickInt(rng, operandRange.min, operandRange.max);
      if (++safety > 50) break;
    }
    c = a * b;
  } else if (op === "subtract") {
    // Ensure non-negative c. The harder constraint: c ∈ resultRange.
    if (a < b) [a, b] = [b, a];
    c = a - b;
    if (c < resultRange.min || c > resultRange.max) {
      c = pickInt(rng, resultRange.min, resultRange.max);
      a = c + b;
    }
  } else {
    // add
    c = a + b;
    if (c < resultRange.min || c > resultRange.max) {
      c = pickInt(rng, resultRange.min, resultRange.max);
      a = pickInt(rng, operandRange.min, Math.min(operandRange.max, c));
      b = c - a;
    }
  }

  const answer = pickSlot({ a, b, c }, blank);
  return {
    kind: "fill-blank",
    id,
    index,
    operator: op,
    a,
    b,
    c,
    blank,
    answer,
  };
}

// ─── true-false (Stage 12) ─────────────────────────────────────────────────

function generateTrueFalse(
  stage: Stage,
  rng: () => number,
  id: string,
  index: number,
): TrueFalseProblem {
  const { operandRange, resultRange } = stage;
  const a = pickInt(rng, operandRange.min, operandRange.max);
  const b = pickInt(rng, operandRange.min, operandRange.max);
  const actualResult = a * b;
  const isTrue = rng() < 0.5;
  let claimedResult: number;
  if (isTrue) {
    claimedResult = actualResult;
  } else {
    // Perturb by ±1 (with edge clamping), or by an obvious wrong factor.
    const delta = pickOne(rng, [-1, 1, -2, 2] as const);
    claimedResult = Math.max(1, Math.min(resultRange.max, actualResult + delta));
    if (claimedResult === actualResult) {
      claimedResult = actualResult + 1;
    }
  }
  return {
    kind: "true-false",
    id,
    index,
    operator: "multiply",
    a,
    b,
    claimedResult,
    actualResult,
    answer: isTrue && claimedResult === actualResult,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function dedupKey(p: Problem): string {
  switch (p.kind) {
    case "fill-pair":
      return `fp:${p.operator}:${p.comparator}:${p.target}:${p.answer.a}-${p.answer.b}`;
    case "fill-consistent-pair":
      return `fcp:${p.operator}:${p.locked.position}=${p.locked.value}:o${p.answer.otherOperand}`;
    case "fill-blank":
      return `fb:${p.operator}:${p.a}-${p.b}-${p.c}:blank=${p.blank}`;
    case "true-false":
      return `tf:${p.a}x${p.b}=${p.claimedResult}`;
    default:
      return assertNever(p);
  }
}

// Display strings for the answer key — kept here next to generate() so a
// schema change forces this to update at the same time.

const OP_SYMBOL: Record<"add" | "subtract" | "multiply", string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
};

const CMP_SYMBOL: Record<"eq" | "gt" | "lt", string> = { eq: "=", gt: ">", lt: "<" };

function renderAnswer(p: Problem): string {
  switch (p.kind) {
    case "fill-pair":
      return `${p.answer.a} ${OP_SYMBOL[p.operator]} ${p.answer.b} ${CMP_SYMBOL[p.comparator]} ${p.target}`;
    case "fill-consistent-pair": {
      const otherSym = `[${p.answer.otherOperand}]`;
      const a = p.locked.position === "a" ? p.locked.value : otherSym;
      const b = p.locked.position === "a" ? otherSym : p.locked.value;
      return `${a} ${OP_SYMBOL[p.operator]} ${b} = [${p.answer.result}]`;
    }
    case "fill-blank": {
      const a = p.blank === "a" ? `[${p.a}]` : `${p.a}`;
      const b = p.blank === "b" ? `[${p.b}]` : `${p.b}`;
      const c = p.blank === "c" ? `[${p.c}]` : `${p.c}`;
      return `${a} ${OP_SYMBOL[p.operator]} ${b} = ${c}`;
    }
    case "true-false":
      return `${p.a} × ${p.b} = ${p.claimedResult}  →  ${p.answer ? "TRUE" : "FALSE"} (actual ${p.actualResult})`;
    default:
      return assertNever(p);
  }
}
