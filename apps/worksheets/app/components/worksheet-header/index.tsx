import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

import { MissionPatch } from "../mission-patch";

export const WorksheetHeaderPropsSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  stageOrdinal: z.int().min(1).max(15),
  variant: z.enum(["A", "B", "C"]),
  // Optional pre-fill for name (e.g., persisted in IDB); blank renders an
  // empty rule the kid signs by hand.
  defaultName: z.string().optional(),
});

function Field({
  label,
  value,
  minWidth,
}: {
  label: string;
  value?: string;
  minWidth?: string;
}): ReactNode {
  // Plain <div> instead of <label> — these are signed-by-hand placeholders,
  // not paired with a form control. (Biome's a11y rule rightly flags labels
  // without controls.) The rule line is decorative.
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display font-medium">{label}:</span>
      <span className="field-rule" style={minWidth ? { minWidth } : undefined}>
        {value}
      </span>
    </div>
  );
}

// Header layout: a left column with eyebrow + title + subtitle + Name/Date/Score
// fields, and a right column anchored at the top with the Mission Patch.
// Two columns let the patch sit at full size without eating title width.
export const WorksheetHeader = defineComponent(
  WorksheetHeaderPropsSchema,
  ({ title, subtitle, stageOrdinal, variant, defaultName }): ReactNode => (
    <header className="border-b-2 border-current pb-3 mb-4 flex items-start gap-6">
      <div className="flex-1">
        <p className="font-display text-sm uppercase tracking-widest opacity-70 mb-2">
          Stage {stageOrdinal} · Worksheet {variant} · Halid Worksheets
        </p>
        <h1 className="font-display font-bold text-4xl mb-1">{title}</h1>
        <p className="font-body text-base opacity-80 mb-4">{subtitle}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 font-body text-sm">
          <Field label="Name" {...(defaultName === undefined ? {} : { value: defaultName })} />
          <Field label="Date" />
          <Field label="Score" minWidth="4em" />
        </div>
      </div>
      <div className="shrink-0 pt-1">
        <MissionPatch stageOrdinal={stageOrdinal} />
      </div>
    </header>
  ),
);
