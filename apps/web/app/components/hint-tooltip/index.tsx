import { Fragment, type ReactNode } from "react";

import { HandCount } from "~/components/hand-count";
import { defineComponent } from "~/lib/define-component";

import { HintTooltipPropsSchema } from "./schema";

// Module-scope so we don't allocate a new regex per render call.
const DIGIT_RUN = /(\d+)/g;
const ALL_DIGITS = /^\d+$/;
const ITALIC_RUN = /(\*[^*]+\*)/g;

// Walks a body fragment, splitting on `*italic*` markers first then on
// digit runs inside each non-italic piece. Italic markers come from the
// hint generator templates ("Stay *under* the line.") and are intentionally
// markdown-ish so authoring stays compact. Digit highlighting + italic
// composition gives templates two emphasis modes without inline JSX.
function renderBody(body: string): ReactNode {
  const result: ReactNode[] = [];
  let charOffset = 0;
  for (const segment of body.split(ITALIC_RUN)) {
    if (segment.length === 0) {
      charOffset += segment.length;
      continue;
    }
    const isItalic = segment.startsWith("*") && segment.endsWith("*") && segment.length > 2;
    const text = isItalic ? segment.slice(1, -1) : segment;
    // Highlight digits within each piece. Wrap the whole piece in <em>
    // when italic.
    const inner: ReactNode[] = [];
    let innerOffset = 0;
    for (const part of text.split(DIGIT_RUN)) {
      if (part.length === 0) continue;
      const key = `${charOffset}-${innerOffset}`;
      innerOffset += part.length;
      if (ALL_DIGITS.test(part)) {
        inner.push(
          <span
            key={key}
            className="rounded-[3px] bg-amber-200 px-1 py-[1px] font-bold text-amber-900"
          >
            {part}
          </span>,
        );
      } else {
        inner.push(<Fragment key={key}>{part}</Fragment>);
      }
    }
    const node = isItalic ? (
      <em key={`em-${charOffset}`} className="font-semibold italic text-amber-900">
        {inner}
      </em>
    ) : (
      <Fragment key={`f-${charOffset}`}>{inner}</Fragment>
    );
    result.push(node);
    charOffset += segment.length;
  }
  return result;
}

// Failure chip — prominently shows the kid's actual computed value next
// to the target with the actual relation. Lives INSIDE the tooltip so
// failure context sits with explanation context. Red, bold, biggish so
// the chip itself emphasizes what didn't work; the emphasis line above
// emphasizes how to fix it.
function FailureChip({ computed, expected }: { computed: number; expected: number }): ReactNode {
  const glyph = computed === expected ? "=" : computed > expected ? ">" : "<";
  return (
    <div className="flex items-center gap-2 rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-1.5 font-mono text-xl font-bold text-rose-700">
      <span>{computed}</span>
      <span className="text-rose-400">{glyph}</span>
      <span>{expected}</span>
      <span aria-hidden className="ml-1 text-rose-500">
        ✗
      </span>
    </div>
  );
}

export const HintTooltip = defineComponent(HintTooltipPropsSchema, (props) => {
  // Click anywhere on the tooltip dismisses it. role="alert" gives screen
  // readers a polite announcement of the new hint without seizing focus.
  // The button-as-card pattern (whole surface clickable) is the simplest
  // touch target for a 7-year-old; an explicit X button would be smaller
  // and easier to miss.
  return (
    <button
      type="button"
      onClick={props.onDismiss}
      className="flex w-full items-start gap-4 rounded-md border border-amber-300 bg-amber-50 px-5 py-4 text-left shadow-lg animate-hint-slide-in cursor-pointer"
      data-test="hint-tooltip"
      aria-label="Hint — tap to dismiss"
    >
      <span aria-hidden className="shrink-0 text-3xl animate-hint-icon-bounce origin-bottom">
        💡
      </span>
      <div className="flex min-w-0 flex-col gap-1.5 flex-1">
        {/* Emphasis — large, colored, uppercase punch line. The kid reads
            this even if they read nothing else. */}
        <h3 className="font-display text-2xl font-extrabold leading-tight text-amber-900 tracking-tight">
          {props.emphasis}
        </h3>
        {/* Failure chip — only when there's a failed result to show. */}
        {props.failedResult ? (
          <div className="my-0.5">
            <FailureChip
              computed={props.failedResult.computed}
              expected={props.failedResult.expected}
            />
          </div>
        ) : null}
        {/* Body — smaller, regular weight, with digit highlights and
            italic emphasis from the *asterisk* markers in the template. */}
        <p className="font-display text-sm leading-snug text-amber-950/90">
          {renderBody(props.body)}
        </p>
        {/* Finger-counting visual — drawn hands extending the right
            number of fingers, animated to count up on mount. Sits
            beneath the body so the kid reads the punch line, glances
            at the chip if there is one, scans the body, and lands on
            the hands as the closing visual cue. */}
        {props.hands ? (
          <div className="mt-1.5">
            <HandCount count={props.hands.count} caption={props.hands.caption} />
          </div>
        ) : null}
      </div>
    </button>
  );
});
