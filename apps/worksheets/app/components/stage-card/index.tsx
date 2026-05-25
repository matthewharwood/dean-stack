import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { StageSchema } from "~/worksheet/schema";

export const StageCardPropsSchema = z.object({
  stage: StageSchema,
});

const VARIANTS = ["A", "B", "C"] as const;

// Links stay as plain <a>: a full navigation is acceptable here because each
// worksheet is a leaf print destination (users routinely Cmd+Click to a new
// tab anyway), and the prerendered HTML for every stage/variant is already on
// disk. Keeping the dependency surface to zero also lets this component
// render inside Storybook without a router context decorator.
export const StageCard = defineComponent(
  StageCardPropsSchema,
  ({ stage }): ReactNode => (
    <article
      className="rounded-card border-2 border-current/15 bg-paper p-5 shadow-sm flex flex-col gap-3"
      data-test={`stage-card-${stage.id}`}
    >
      <header>
        <p className="font-display text-xs uppercase tracking-widest opacity-70">
          Stage {stage.ordinal}
        </p>
        <h2 className="font-display font-semibold text-xl mt-1">{stage.title}</h2>
        <p className="font-body text-sm opacity-80 mt-1">{stage.subtitle}</p>
      </header>
      <ul className="flex gap-2 mt-auto">
        {VARIANTS.map((v) => (
          <li key={v}>
            <a
              href={`/stage/${stage.id}/${v}`}
              className="inline-flex items-center justify-center rounded-card bg-brand-500 text-white font-display font-semibold text-sm px-3 py-1.5 shadow-sm hover:bg-brand-700"
              data-test={`stage-link-${stage.id}-${v}`}
            >
              Variant {v}
            </a>
          </li>
        ))}
      </ul>
    </article>
  ),
);
