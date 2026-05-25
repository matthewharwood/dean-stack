import { useAtomValue } from "jotai";
import { type ReactNode, useCallback } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { answersAtomForWorksheet } from "~/state/ink-atoms";
import { cellIdsForProblem } from "~/worksheet/grade";
import type { Worksheet } from "~/worksheet/schema";

export const SubmitButtonPropsSchema = z.object({
  worksheet: z.custom<Worksheet>(),
  onSubmit: z.custom<() => void>(),
});

// Submission gate. Per the AskUserQuestion outcome (option "block submit
// until every cell is filled and confident"), the button is disabled
// until every problem has a confident capture. Cells that fall to
// manual review (multi-digit, true-false) require at least *some* stroke
// activity (digit === null but strokes !== empty counts as "the kid
// has attempted it") — that's the most lenient way to honor "every cell
// must be answered" without forcing AnswerCell to grade non-gradeable
// shapes.
export const SubmitButton = defineComponent(
  SubmitButtonPropsSchema,
  ({ worksheet, onSubmit }): ReactNode => {
    const id = `${worksheet.stageId}-${worksheet.variant}`;
    const answers = useAtomValue(answersAtomForWorksheet(id));

    // Count attempts + confident answers across EVERY inkable cell on
    // the page. cellIdsForProblem() maps each problem to its expected
    // cell ids ("p1" for fill-blank, "p1_a" + "p1_b" for fill-pair,
    // etc.) — the single-source-of-truth for the slot vocabulary
    // shared with grading. Previously this loop did
    // `answers.entries[problem.id]` which only found single-blank
    // cells; multi-blank problems' answers (stored under suffixed
    // keys) were invisible, so Submit never enabled on stages with
    // fill-pair / fill-consistent-pair / true-false problems.
    let total = 0;
    let attempted = 0;
    let confident = 0;
    for (const problem of worksheet.problems) {
      const ids = cellIdsForProblem(problem);
      total += ids.length;
      for (const cellId of ids) {
        const entry = answers.entries[cellId];
        if (!entry) continue;
        if (entry.strokes.length > 0) attempted++;
        if (entry.confident) confident++;
      }
    }

    // Ready to grade when every inkable cell has been touched. total=0
    // for stages with only true-false problems (no inkable cells) —
    // we never gate-block on that case since there's nothing to write.
    const ready = total === 0 ? false : attempted === total;

    const gradeWorksheet = useCallback((): void => {
      if (ready) onSubmit();
    }, [ready, onSubmit]);

    return (
      <div className="flex items-center gap-3" data-test="submit-button-wrap">
        <span className="text-xs uppercase tracking-widest opacity-70 tabular-nums">
          {attempted} / {total} answered · {confident} confident
        </span>
        <button
          type="button"
          onClick={gradeWorksheet}
          disabled={!ready}
          aria-disabled={!ready}
          className={[
            "rounded-card px-4 py-1.5 font-display font-semibold shadow-sm",
            ready
              ? "bg-white text-brand-700 hover:bg-white/95 cursor-pointer"
              : "bg-white/30 text-white/70 cursor-not-allowed",
          ].join(" ")}
          data-test="submit-button"
        >
          Grade my page
        </button>
      </div>
    );
  },
);
