import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { iconFor } from "~/worksheet/icons";

export const MissionPatchPropsSchema = z.object({
  stageOrdinal: z.int().min(1).max(15),
});

// Calvin's #1 idea — the cohesion anchor. A small circular "mission patch"
// in the header that reuses the stage's ordinal-indexed icon (so Stage 5
// gets a Mountain patch, Stage 12 gets a Tent, Stage 15 gets a Star). The
// hollow star next to it is the kid's color-in completion mark. 15 patches
// shared with the position-marker icon set = single shared visual alphabet.
//
// Pure SVG, stroke only — no fills, no per-stage hand-authoring needed,
// prints at any resolution.
export const MissionPatch = defineComponent(
  MissionPatchPropsSchema,
  ({ stageOrdinal }): ReactNode => {
    const { Icon, label } = iconFor(stageOrdinal);
    return (
      // KEEP — role="img" wrapper with a meaningful aria-label is how
      // a composite icon-plus-caption gets announced as a single
      // badge. Semantic <img> is for raster sources; this is
      // inline-SVG composition.
      // react-doctor-disable-next-line react-doctor/prefer-tag-over-role
      <div
        className="inline-flex items-center gap-2"
        data-test={`mission-patch-${stageOrdinal}`}
        role="img"
        aria-label={`Stage ${stageOrdinal} of 15, badge: ${label}`}
      >
        {/* Patch: 56px circle with the stage icon inside + "N / 15" caption */}
        <div className="relative inline-flex flex-col items-center">
          <div
            className="inline-flex items-center justify-center rounded-full border-2 border-current"
            style={{ width: "3.4rem", height: "3.4rem" }}
            aria-hidden="true"
          >
            <Icon size={28} strokeWidth={1.75} />
          </div>
          <p className="font-display text-[9px] uppercase tracking-[0.18em] opacity-70 mt-1">
            {stageOrdinal} <span className="opacity-50">/</span> 15
          </p>
        </div>
        {/* Color-in star: hollow 5-point star the kid fills when the
            worksheet is done. Stroke-only so it works as a "ready to color"
            outline at any printer resolution. */}
        <div className="inline-flex flex-col items-center">
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="12,2 14.9,8.6 22,9.3 16.6,14 18.2,21 12,17.3 5.8,21 7.4,14 2,9.3 9.1,8.6" />
          </svg>
          <p className="font-display text-[9px] uppercase tracking-[0.18em] opacity-70 mt-1">
            color when done
          </p>
        </div>
      </div>
    );
  },
);
