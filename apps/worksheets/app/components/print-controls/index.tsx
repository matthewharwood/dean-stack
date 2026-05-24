import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

import { ModeToggle } from "../mode-toggle";

export const PrintControlsPropsSchema = z.object({
  // Optional href to the matching answer-key route. Renders as a sibling link.
  answerHref: z.string().optional(),
  // Optional href back to the index.
  backHref: z.string().optional(),
  // Pagination: prev/next URLs in the 45-sheet cyclical sequence, plus a
  // human-readable position label ("Stage 5 · A · 13 / 45"). All three are
  // required as a group — the route computes them via worksheet/sequence.ts.
  pagination: z
    .object({
      prevHref: z.string(),
      nextHref: z.string(),
      label: z.string(),
    })
    .optional(),
});

function handlePrint(): void {
  if (typeof window !== "undefined") window.print();
}

// Why `<Link>` instead of `<a>` for the pagination + back/answer links:
// TanStack Router only intercepts <Link> clicks for SPA navigation; plain
// anchors cause a full document load and a visible white-flash flicker
// between sheets. The Link string-URL form (`to={"/stage/s1/B"}`) skips the
// typed-params machinery while still giving us client-side navigation, which
// lets the sticky nav bar stay perfectly mounted across paginations and
// hands the content swap off to RouteTransition.
//
// Print button stays a plain button — window.print() is a browser API, not
// a route.
//
// Pillar 1 note — there is intentionally no `*.stories.tsx` sibling for
// this component. Link requires a fully-mounted RouterProvider context;
// faking one for Storybook adds more complexity than it removes. Same
// pattern as apps/web, where router consumers live at the route level
// (which Playwright app tests cover, not Storybook stories).
export const PrintControls = defineComponent(
  PrintControlsPropsSchema,
  ({ answerHref, backHref, pagination }): ReactNode => (
    <nav
      className="no-print sticky top-0 z-10 bg-brand-700 text-white px-4 py-3 flex items-center gap-3 shadow-md font-display"
      data-test="print-controls"
    >
      {backHref ? (
        <Link to={backHref} className="text-sm underline decoration-2 underline-offset-4">
          ← All worksheets
        </Link>
      ) : null}
      {pagination ? (
        <div className="flex items-center gap-2" data-test="pagination">
          <Link
            to={pagination.prevHref}
            className="inline-flex items-center gap-1 rounded-card border border-white/40 px-2 py-1 text-sm hover:bg-white/10"
            data-test="pagination-prev"
            aria-label="Previous worksheet"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span>Prev</span>
          </Link>
          <span
            className="text-xs uppercase tracking-widest opacity-80 tabular-nums"
            data-test="pagination-label"
          >
            {pagination.label}
          </span>
          <Link
            to={pagination.nextHref}
            className="inline-flex items-center gap-1 rounded-card border border-white/40 px-2 py-1 text-sm hover:bg-white/10"
            data-test="pagination-next"
            aria-label="Next worksheet"
          >
            <span>Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
      <span className="flex-1" />
      <ModeToggle />
      {answerHref ? (
        <Link
          to={answerHref}
          className="rounded-card border-2 border-white/80 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          Open answer key
        </Link>
      ) : null}
      <button
        type="button"
        onClick={handlePrint}
        className="rounded-card bg-white text-brand-700 px-4 py-1.5 font-semibold shadow-sm hover:bg-white/95"
      >
        Print / Save as PDF
      </button>
    </nav>
  ),
);
