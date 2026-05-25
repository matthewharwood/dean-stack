import { useAtomValue } from "jotai";
import { Check, ScrollText, X } from "lucide-react";
import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { answersAtomForWorksheet } from "~/state/ink-atoms";
import { computeIpadMinutes, type GradedCell, gradeWorksheet } from "~/worksheet/grade";
import type { Worksheet } from "~/worksheet/schema";

type CellStatus = "correct" | "wrong" | "review";

function statusFor(cell: GradedCell): CellStatus {
  if (!cell.gradeable) return "review";
  return cell.correct ? "correct" : "wrong";
}

export const GradeViewPropsSchema = z.object({
  worksheet: z.custom<Worksheet>(),
  onClose: z.custom<() => void>(),
});

// Modal-ish overlay shown after Submit. Renders a per-problem grade
// table, the total iPad-minutes the kid earned, and a Close button to
// dismiss and let the parent verify before redeeming.
export const GradeView = defineComponent(
  GradeViewPropsSchema,
  ({ worksheet, onClose }): ReactNode => {
    const id = `${worksheet.stageId}-${worksheet.variant}`;
    const answers = useAtomValue(answersAtomForWorksheet(id));

    // Build the captures map from the IDB-backed answer entries. The
    // grader is pure — same call signature as the bun-test fixture.
    const captureMap = new Map<
      string,
      { problemId: string; digit: string | null; confident: boolean }
    >();
    for (const [pid, entry] of Object.entries(answers.entries)) {
      captureMap.set(pid, {
        problemId: pid,
        digit: entry.digit,
        confident: entry.confident,
      });
    }
    const graded = gradeWorksheet(worksheet, captureMap);
    const minutes = computeIpadMinutes(graded);

    return (
      // KEEP — semantic <dialog> would be the right answer but it has
      // its own positioning + backdrop + imperative open/close API
      // (dialog.showModal()) that doesn't compose with the existing
      // CSS-positioned overlay pattern. Refactor to <dialog> is its
      // own pass; role="dialog" + aria-modal is correct in the
      // meantime per WAI-ARIA modal guidance.
      // react-doctor-disable-next-line react-doctor/prefer-tag-over-role
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 font-display"
        data-test="grade-view"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grade-view-title"
      >
        <div className="bg-paper rounded-card shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <header className="px-6 py-4 border-b-2 border-current flex items-baseline justify-between">
            <h2 id="grade-view-title" className="text-2xl font-semibold flex items-center gap-2">
              <ScrollText size={22} aria-hidden="true" />
              <span>
                Stage {worksheet.stage.ordinal} · Variant {worksheet.variant}
              </span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-card border border-current px-3 py-1 text-sm hover:bg-current/10"
            >
              Close
            </button>
          </header>
          <section className="px-6 py-4">
            <p className="text-xl tabular-nums">
              <strong>{graded.correct}</strong> / {graded.gradeableTotal} graded right
              {graded.gradeableTotal < graded.total
                ? ` · ${graded.total - graded.gradeableTotal} for grown-up review`
                : ""}
            </p>
            <p className="mt-2 text-3xl tabular-nums">
              <strong>{minutes}</strong>{" "}
              <span className="text-base opacity-70">
                iPad minute{minutes === 1 ? "" : "s"} earned
              </span>
            </p>
          </section>
          <section className="px-6 py-4 border-t border-current/30">
            <ol className="grid grid-cols-2 gap-x-6 gap-y-1" data-test="grade-cells">
              {graded.cells.map((cell) => {
                const status = statusFor(cell);
                return (
                  <li
                    key={cell.problemId}
                    className="flex items-center gap-2 text-sm"
                    data-test={`grade-cell-${cell.problemId}`}
                    data-status={status}
                  >
                    {status === "correct" ? <Check size={14} aria-hidden="true" /> : null}
                    {status === "wrong" ? <X size={14} aria-hidden="true" /> : null}
                    {status === "review" ? (
                      <span aria-hidden="true" className="text-xs opacity-60">
                        ✎
                      </span>
                    ) : null}
                    <span className="opacity-80">{cell.problemId}</span>
                    {cell.gradeable ? (
                      <span className="tabular-nums opacity-70">
                        wrote <strong>{cell.capturedDigit ?? "—"}</strong> · expected{" "}
                        <strong>{cell.expectedDigit}</strong>
                      </span>
                    ) : (
                      <span className="text-xs opacity-50 italic">{cell.reason}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    );
  },
);
