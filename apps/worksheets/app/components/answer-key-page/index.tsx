import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { AnswerKeySchema } from "~/worksheet/schema";

export const AnswerKeyPagePropsSchema = z.object({
  answerKey: AnswerKeySchema,
});

export const AnswerKeyPage = defineComponent(
  AnswerKeyPagePropsSchema,
  ({ answerKey }): ReactNode => (
    <article className="worksheet-page print-page print-bg-paper" data-test="answer-key-page">
      <header className="border-b-2 border-current pb-3 mb-5">
        <p className="font-display text-sm uppercase tracking-widest opacity-70">
          Answer Key · For grown-ups
        </p>
        <h1 className="font-display font-bold text-3xl mt-1">
          {answerKey.stageTitle} · Variant {answerKey.variant}
        </h1>
        <p className="font-body text-sm opacity-70">
          Sheet ID: <code className="font-mono">{answerKey.worksheetSlug}</code>
        </p>
      </header>
      <ol
        className="grid grid-cols-2 gap-x-8 gap-y-1 font-equation text-lg"
        data-test="answer-key-list"
      >
        {answerKey.entries.map((entry) => (
          <li key={entry.id} className="problem-row flex items-baseline gap-3 py-1">
            <span className="font-display font-medium text-base opacity-70 w-8 text-right shrink-0">
              {entry.index + 1}.
            </span>
            <span>{entry.display}</span>
          </li>
        ))}
      </ol>
      <footer className="mt-8 border-t border-current pt-3 text-xs font-body opacity-60">
        Square brackets [n] mark numbers the kid was asked to fill in.
      </footer>
    </article>
  ),
);
