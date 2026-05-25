import { useAtomValue } from "jotai";
import { type ReactNode, useState } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { inkModeAtom } from "~/state/ink-atoms";
import { WorksheetSchema } from "~/worksheet/schema";

import { GradeView } from "../grade-view";
import { PowerTally } from "../power-tally";
import { ProblemGrid } from "../problem-grid";
import { SubmitButton } from "../submit-button";
import { TimeCoupon } from "../time-coupon";
import { WorksheetHeader } from "../worksheet-header";
import { WorksheetIntro } from "../worksheet-intro";

export const WorksheetPagePropsSchema = z.object({
  worksheet: WorksheetSchema,
  defaultName: z.string().optional(),
});

export const WorksheetPage = defineComponent(
  WorksheetPagePropsSchema,
  ({ worksheet, defaultName }): ReactNode => {
    const { stage, variant, problems } = worksheet;
    // True-false stretches horizontally with the TRUE/FALSE choices, so we
    // give it the full row width. Everything else stays in two columns.
    const columns = stage.paperShape === "true-false" ? 1 : 2;

    const inkSettings = useAtomValue(inkModeAtom());
    const isIpad = inkSettings.mode === "ipad";
    const worksheetId: `s${number}-${"A" | "B" | "C"}` = `${stage.id as `s${number}`}-${variant}`;

    const [showGrade, setShowGrade] = useState(false);

    return (
      <article className="worksheet-page print-page print-bg-paper" data-test="worksheet-page">
        <WorksheetHeader
          title={stage.title}
          subtitle={stage.subtitle}
          stageOrdinal={stage.ordinal}
          variant={variant}
          {...(defaultName === undefined ? {} : { defaultName })}
        />
        <WorksheetIntro
          introCopy={stage.introCopy}
          instruction={stage.instruction}
          {...(stage.fieldLog === undefined ? {} : { fieldLog: stage.fieldLog })}
          dayNumber={stage.ordinal}
        />
        <ProblemGrid
          problems={problems}
          columns={columns}
          inkMode={inkSettings.mode}
          worksheetId={worksheetId}
        />
        {isIpad ? (
          <div className="no-print mt-6 flex items-center justify-end gap-3 bg-brand-700 text-white px-4 py-3 rounded-card shadow-md">
            <SubmitButton worksheet={worksheet} onSubmit={() => setShowGrade(true)} />
          </div>
        ) : null}
        <footer className="mt-8">
          {/* The iPad-time coupon subsumes what was the CompletionStamp's role
              — the "graded by" line on the coupon IS the parent's signature.
              The Power Tally stays as the macro-arc progress indicator above
              the coupon's tear line. */}
          <div className="border-t border-current pt-3 pb-1">
            <PowerTally currentOrdinal={stage.ordinal} currentVariant={variant} totalStages={15} />
          </div>
          <TimeCoupon
            problemCount={problems.length}
            sheetLabel={`S${stage.ordinal} · Sheet ${variant}`}
          />
        </footer>
        {showGrade ? <GradeView worksheet={worksheet} onClose={() => setShowGrade(false)} /> : null}
      </article>
    );
  },
);
