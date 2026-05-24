import type { Problem, Worksheet } from "./schema";

export type GradedCell =
  | {
      problemId: string;
      gradeable: true;
      expectedDigit: string;
      capturedDigit: string | null;
      confident: boolean;
      correct: boolean;
    }
  | {
      problemId: string;
      gradeable: false;
      reason: string;
    };

export type GradedWorksheet = {
  worksheetSlug: string;
  total: number;
  // gradeable+correct count, used for the TimeCoupon math.
  correct: number;
  // gradeable subset only — for the "you got 4/6 of the gradeable ones"
  // headline when some cells fall back to manual review.
  gradeableTotal: number;
  cells: readonly GradedCell[];
};

type CapturedShape = {
  problemId: string;
  digit: string | null;
  confident: boolean;
};

// Grade a worksheet against the kid's captured answers. Single-digit
// fill-blank problems are auto-graded; everything else is marked
// "manual review" (the parent still glances and adjusts iPad time).
//
// This is a PURE function — pluck it into a bun test and assert away.
export function gradeWorksheet(
  worksheet: Worksheet,
  captures: ReadonlyMap<string, CapturedShape>,
): GradedWorksheet {
  const cells: GradedCell[] = worksheet.problems.map((p) => gradeOne(p, captures.get(p.id)));

  const gradeable = cells.filter((c): c is Extract<GradedCell, { gradeable: true }> => c.gradeable);
  const correct = gradeable.filter((c) => c.correct).length;

  return {
    worksheetSlug: `${worksheet.stageId}-${worksheet.variant}`,
    total: cells.length,
    correct,
    gradeableTotal: gradeable.length,
    cells,
  };
}

function gradeOne(problem: Problem, capture: CapturedShape | undefined): GradedCell {
  const expected = expectedSingleDigit(problem);
  if (expected === null) {
    return {
      problemId: problem.id,
      gradeable: false,
      reason: reasonNotGradeable(problem),
    };
  }
  return {
    problemId: problem.id,
    gradeable: true,
    expectedDigit: expected,
    capturedDigit: capture?.digit ?? null,
    confident: capture?.confident ?? false,
    correct: capture?.confident === true && capture.digit === expected,
  };
}

// True iff a problem has exactly one numeric blank in the range 0-9
// (the only shape AnswerCell can capture today). Everything else falls
// to manual review.
function expectedSingleDigit(problem: Problem): string | null {
  if (problem.kind !== "fill-blank") return null;
  const ans = problem.answer;
  if (!Number.isInteger(ans)) return null;
  if (ans < 0 || ans > 9) return null;
  return String(ans);
}

function reasonNotGradeable(problem: Problem): string {
  switch (problem.kind) {
    case "fill-pair":
      return "Two blanks — manual review";
    case "fill-consistent-pair":
      return "Two blanks — manual review";
    case "true-false":
      return "Circle TRUE or FALSE — manual review";
    case "fill-blank":
      return "Multi-digit answer — manual review";
    default:
      return assertNever(problem);
  }
}

function assertNever(x: never): never {
  throw new Error(`unreachable problem kind ${String(x)}`);
}

// Reused by the TimeCoupon panel: same math as the printed coupon
// (1 minute per 4 correct + 2 minutes if every gradeable cell is correct).
export function computeIpadMinutes(graded: GradedWorksheet): number {
  if (graded.gradeableTotal === 0) return 0;
  const base = Math.floor(graded.correct / 4);
  const bonus = graded.correct === graded.gradeableTotal ? 2 : 0;
  return base + bonus;
}
