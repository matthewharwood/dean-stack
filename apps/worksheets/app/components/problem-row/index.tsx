import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { type Problem, ProblemSchema } from "~/worksheet/schema";

import { AnswerCell } from "../answer-cell";
import { ProblemMarker } from "../problem-marker";

export const ProblemRowPropsSchema = z.object({
  problem: ProblemSchema,
  position: z.int().min(1).max(15),
  worksheetId: z
    .string()
    .regex(/^s(?:[1-9]|1[0-5])-[ABC]$/)
    .optional(),
  // Falls back to "print" when omitted so existing stories don't need
  // an explicit value.
  inkMode: z.enum(["print", "ipad"]).optional(),
});

const OPERATOR_SYMBOL = { add: "+", subtract: "−", multiply: "×" } as const;
const OPERATOR_WORD = { add: "plus", subtract: "minus", multiply: "times" } as const;
const COMPARATOR_SYMBOL = { eq: "=", gt: ">", lt: "<" } as const;
const COMPARATOR_WORD = { eq: "equals", gt: "is greater than", lt: "is less than" } as const;

export const ProblemRow = defineComponent(
  ProblemRowPropsSchema,
  ({ problem, position, worksheetId, inkMode = "print" }): ReactNode => (
    <div className="problem-row flex items-center gap-3 py-2">
      {/* Position marker: a Lucide icon (sprout, leaf, flower, …, star) instead
          of a numeral. A 6yo can't accidentally read the marker as part of the
          equation; the answer key still grades by the underlying position
          number via aria-label. */}
      <ProblemMarker position={position} />
      {/* role="math" is the canonical ARIA role for math equations and
          accepts aria-label without the lint warnings that role="img" on a
          generic tag triggers. Every inner span is aria-hidden so the SR
          uses this single label rather than reading individual numerals. */}
      <div
        className="equation flex items-center gap-2 flex-wrap"
        role="math"
        aria-label={describeProblem(problem)}
      >
        {renderEquation(problem, {
          inkMode,
          ...(worksheetId === undefined ? {} : { worksheetId }),
          problemId: problem.id,
        })}
      </div>
    </div>
  ),
);

// Print-mode `<span className="blank">` OR iPad-mode <AnswerCell>. Per
// the scope cut in worksheet/grade.ts, AnswerCell captures one digit per
// blank — multi-digit / two-blank problems still render inkable cells
// but their grading falls back to manual review.
type BlankRenderOpts = {
  inkMode: "print" | "ipad";
  worksheetId?: string;
  problemId: string;
};

function Blank({
  wide,
  opts,
  slotKey,
}: {
  wide?: boolean;
  opts: BlankRenderOpts;
  slotKey: string;
}): ReactNode {
  if (opts.inkMode === "ipad" && opts.worksheetId !== undefined) {
    // Pillar 3: the per-blank id is the problemId; for multi-blank
    // problems we suffix the slotKey ("a", "b", "c") so each cell gets
    // a unique entry. The grader only auto-grades fill-blank with a
    // single answer, so multi-blank cells just store strokes.
    const suffix = slotKey === "default" ? "" : `_${slotKey}`;
    const cellId = `${opts.problemId}${suffix}` as `p${number}`;
    return (
      <AnswerCell
        worksheetId={opts.worksheetId}
        problemId={cellId}
        width={wide ? 64 : 56}
        height={72}
      />
    );
  }
  return <span className={wide ? "blank blank-wide" : "blank"} aria-hidden="true" />;
}

// Single readable string for screen readers — every numeric/operator span in
// the visible equation is aria-hidden so the SR uses this label instead.
function describeProblem(p: Problem): string {
  switch (p.kind) {
    case "fill-pair":
      return `blank ${OPERATOR_WORD[p.operator]} blank ${COMPARATOR_WORD[p.comparator]} ${p.target}`;
    case "fill-consistent-pair": {
      const left = p.locked.position === "a" ? String(p.locked.value) : "blank";
      const right = p.locked.position === "a" ? "blank" : String(p.locked.value);
      return `${left} ${OPERATOR_WORD[p.operator]} ${right} equals blank`;
    }
    case "fill-blank": {
      const a = p.blank === "a" ? "blank" : String(p.a);
      const b = p.blank === "b" ? "blank" : String(p.b);
      const c = p.blank === "c" ? "blank" : String(p.c);
      return `${a} ${OPERATOR_WORD[p.operator]} ${b} equals ${c}`;
    }
    case "true-false":
      return `${p.a} times ${p.b} equals ${p.claimedResult}, circle true or false`;
    default:
      return assertNever(p);
  }
}

function assertNever(x: never): never {
  throw new Error(`unreachable: unexpected discriminant ${String(x)}`);
}

function renderEquation(problem: Problem, opts: BlankRenderOpts): ReactNode {
  switch (problem.kind) {
    case "fill-pair": {
      const op = OPERATOR_SYMBOL[problem.operator];
      const cmp = COMPARATOR_SYMBOL[problem.comparator];
      return (
        <>
          <Blank opts={opts} slotKey="a" />
          <span aria-hidden="true">{op}</span>
          <Blank opts={opts} slotKey="b" />
          <span aria-hidden="true">{cmp}</span>
          <span aria-hidden="true">{problem.target}</span>
        </>
      );
    }
    case "fill-consistent-pair": {
      const op = OPERATOR_SYMBOL[problem.operator];
      const leftLocked = problem.locked.position === "a";
      return (
        <>
          {leftLocked ? (
            <span aria-hidden="true">{problem.locked.value}</span>
          ) : (
            <Blank opts={opts} slotKey="a" />
          )}
          <span aria-hidden="true">{op}</span>
          {leftLocked ? (
            <Blank opts={opts} slotKey="b" />
          ) : (
            <span aria-hidden="true">{problem.locked.value}</span>
          )}
          <span aria-hidden="true">=</span>
          <Blank wide opts={opts} slotKey="c" />
        </>
      );
    }
    case "fill-blank": {
      const op = OPERATOR_SYMBOL[problem.operator];
      return (
        <>
          {problem.blank === "a" ? (
            <Blank opts={opts} slotKey="default" />
          ) : (
            <span aria-hidden="true">{problem.a}</span>
          )}
          <span aria-hidden="true">{op}</span>
          {problem.blank === "b" ? (
            <Blank opts={opts} slotKey="default" />
          ) : (
            <span aria-hidden="true">{problem.b}</span>
          )}
          <span aria-hidden="true">=</span>
          {problem.blank === "c" ? (
            <Blank wide opts={opts} slotKey="default" />
          ) : (
            <span aria-hidden="true">{problem.c}</span>
          )}
        </>
      );
    }
    case "true-false":
      return (
        <>
          <span aria-hidden="true">{problem.a}</span>
          <span aria-hidden="true">×</span>
          <span aria-hidden="true">{problem.b}</span>
          <span aria-hidden="true">=</span>
          <span aria-hidden="true">{problem.claimedResult}</span>
          <span
            className="ml-3 flex items-center gap-2 text-base font-body font-normal"
            aria-hidden="true"
          >
            <span className="border-2 border-current rounded-full px-3 py-0.5">TRUE</span>
            <span className="border-2 border-current rounded-full px-3 py-0.5">FALSE</span>
          </span>
        </>
      );
    default:
      return assertNever(problem);
  }
}
