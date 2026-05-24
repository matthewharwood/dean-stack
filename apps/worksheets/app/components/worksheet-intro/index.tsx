import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

export const WorksheetIntroPropsSchema = z.object({
  introCopy: z.string().min(1),
  instruction: z.string().min(1),
  // When set, replaces introCopy with the shorter in-world brief and stamps
  // a "FIELD LOG · DAY N" eyebrow above it. The recurrence of the eyebrow
  // across all 15 stages is the load-bearing narrative anchor — not the
  // word count of any single brief.
  fieldLog: z.string().optional(),
  dayNumber: z.int().min(1).max(15).optional(),
});

export const WorksheetIntro = defineComponent(
  WorksheetIntroPropsSchema,
  ({ introCopy, instruction, fieldLog, dayNumber }): ReactNode => {
    const hasFieldLog = fieldLog !== undefined && dayNumber !== undefined;
    return (
      <section className="mb-5 grid gap-3" data-test="worksheet-intro">
        {hasFieldLog ? (
          <div className="border-l-4 border-current pl-3 py-1">
            <p className="font-display text-[11px] uppercase tracking-[0.25em] opacity-60 mb-1">
              Field Log · Day {dayNumber} of 15
            </p>
            <p className="font-body text-[15px] leading-snug italic">{fieldLog}</p>
          </div>
        ) : (
          <p className="font-body text-[15px] leading-snug">{introCopy}</p>
        )}
        <p className="font-display font-semibold text-[15px] leading-snug border-l-4 border-current pl-3 py-1">
          {instruction}
        </p>
      </section>
    );
  },
);
