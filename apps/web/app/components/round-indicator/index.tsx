import { useEffect, useRef, useState } from "react";

import { defineComponent } from "~/lib/define-component";

import { RoundIndicatorPropsSchema } from "./schema";

// Tailwind class for one progress dot, indexed by state. Hoisted to a
// helper so the JSX template doesn't carry a nested ternary.
function dotClass(current: boolean, reached: boolean): string {
  if (current) return "w-6 bg-radiant-violet";
  if (reached) return "w-1.5 bg-radiant-violet/70";
  return "w-1.5 bg-light-gray";
}

// Round indicator. Lives in the Top region. Renders the active round
// number, a one-line status, and a row of progress dots showing how far
// the kid is into the current tier.
//
// Tier-up: when `round` flips 1 → 2, a brief CSS animation (lift + glow
// + scale) plays on the whole indicator to mark the milestone. Triggered
// via a data attribute toggled by a useEffect tracking previous round.
export const RoundIndicator = defineComponent(RoundIndicatorPropsSchema, (props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prevRoundRef = useRef(props.round);
  const [tierUp, setTierUp] = useState(false);

  useEffect(() => {
    if (prevRoundRef.current === props.round) return;
    prevRoundRef.current = props.round;
    setTierUp(true);
    const t = window.setTimeout(() => setTierUp(false), 720);
    return () => window.clearTimeout(t);
  }, [props.round]);

  const localLevel = props.localLevel;

  return (
    <div
      ref={rootRef}
      className="flex size-full items-center justify-center px-6"
      data-test="round-indicator"
      data-round={props.round}
    >
      <div
        className={`flex flex-col items-center gap-1.5 ${tierUp ? "animate-tier-up" : ""}`}
        data-tier-up={tierUp ? "true" : undefined}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-openrunde text-xs font-semibold uppercase tracking-[0.2em] text-muted-gray">
            Round
          </span>
          <span className="font-openrunde text-3xl font-bold text-slate-ink">{props.round}</span>
          <span className="font-openrunde text-xs text-muted-gray">
            of <span className="font-bold text-medium-gray">9</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: props.tierLevelCount }, (_, i) => i + 1).map((level) => {
            const reached = level <= localLevel;
            const current = level === localLevel;
            return (
              <span
                key={`r${props.round}-l${level}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${dotClass(current, reached)}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});
