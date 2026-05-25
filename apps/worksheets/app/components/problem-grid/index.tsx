import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { ProblemSchema } from "~/worksheet/schema";

import { ProblemRow } from "../problem-row";

export const ProblemGridPropsSchema = z.object({
  problems: z.array(ProblemSchema).min(1),
  // True-false problems eat horizontal space; default to 1 column for them.
  columns: z.union([z.literal(1), z.literal(2)]).default(2),
  // Worksheet id (`${stageId}-${variant}`) — needed by ProblemRow when
  // it renders AnswerCells (each cell writes into the per-worksheet
  // answers atom). Optional — when omitted, the grid is always print-mode.
  worksheetId: z
    .string()
    .regex(/^s(?:[1-9]|1[0-5])-[ABC]$/)
    .optional(),
  // Render mode. Falls back to "print" when omitted so existing
  // print-mode call sites + stories don't have to pass it explicitly.
  inkMode: z.enum(["print", "ipad"]).optional(),
});

export const ProblemGrid = defineComponent(
  ProblemGridPropsSchema,
  ({ problems, columns, worksheetId, inkMode = "print" }): ReactNode => (
    <div
      className={columns === 1 ? "grid gap-1" : "grid gap-x-8 gap-y-1 grid-cols-2"}
      data-test="problem-grid"
    >
      {problems.map((p, i) => (
        <ProblemRow
          key={p.id}
          problem={p}
          position={i + 1}
          inkMode={inkMode}
          {...(worksheetId === undefined ? {} : { worksheetId })}
        />
      ))}
    </div>
  ),
);
