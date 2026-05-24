import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { iconFor } from "~/worksheet/icons";

export const ProblemMarkerPropsSchema = z.object({
  // 1-based problem position (1..15). Index into the icon sequence.
  position: z.int().min(1).max(15),
});

// Replaces the old "1." / "2." numeric prefix on each problem row. The icon
// is the row landmark — a 6yo can't confuse a sprout glyph for an operand
// the way they sometimes confuse a small "3." next to "3 + 4". The aria-label
// preserves the ordinal so the answer key and parent-grading flow still
// thinks in numbers ("did you finish problem 7?").
export const ProblemMarker = defineComponent(
  ProblemMarkerPropsSchema,
  ({ position }): ReactNode => {
    const { Icon, label } = iconFor(position);
    return (
      <span
        className="inline-flex items-center justify-center shrink-0"
        style={{ width: "1.75rem", height: "1.75rem" }}
        aria-label={`Problem ${position}: ${label}`}
        role="img"
        data-test={`problem-marker-${position}`}
      >
        <Icon size={22} strokeWidth={1.75} aria-hidden="true" focusable={false} />
      </span>
    );
  },
);
