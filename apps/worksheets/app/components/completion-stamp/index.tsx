import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

export const CompletionStampPropsSchema = z.object({});

// Calvin's #7 idea — prosocial close-out. Two micro-elements stamped into
// the footer: (1) a 5-hollow-star self-rating ("how did this sheet feel?"),
// asking the kid about their own experience rather than scoring them; and
// (2) a small box for a grown-up's initial. Together they form the tiny
// shared moment that closes the session: kid rates, kid shows parent, parent
// initials.
export const CompletionStamp = defineComponent(
  CompletionStampPropsSchema,
  (): ReactNode => (
    <div className="flex items-end gap-5" data-test="completion-stamp">
      <div className="flex flex-col gap-1">
        <p className="font-display text-[9px] uppercase tracking-[0.22em] opacity-60">
          How was this sheet?
        </p>
        <div className="flex gap-1" aria-hidden="true">
          {["s1", "s2", "s3", "s4", "s5"].map((id) => (
            <svg
              key={id}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12,2 14.9,8.6 22,9.3 16.6,14 18.2,21 12,17.3 5.8,21 7.4,14 2,9.3 9.1,8.6" />
            </svg>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-display text-[9px] uppercase tracking-[0.22em] opacity-60">Grown-up</p>
        <span
          className="inline-block border-b-2 border-current"
          style={{ minWidth: "5em", height: "1.4em" }}
        />
      </div>
    </div>
  ),
);
