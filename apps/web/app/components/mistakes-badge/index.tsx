import type { ReactNode } from "react";

// Small chip in the Top region beside the RoundIndicator. Surfaces the
// running count of losing evaluations on the CURRENT stage so the kid can
// see their own try count climb. Hidden until the kid has missed once —
// a constant "Mistakes: 0" would just be noise.
//
// At wrongAttempts >= 3 the find-missing-result auto-assist has fired
// (one card pre-placed + locked); the badge tilts into a warmer "helped"
// styling so the kid notices the equation just got easier.
export function MistakesBadge({ count }: { count: number }): ReactNode {
  if (count <= 0) return null;
  const helped = count >= 3;
  return (
    <output
      className={
        helped
          ? "flex items-center gap-1.5 rounded-full bg-vivid-orange/15 px-3 py-1 font-openrunde text-sm font-bold text-vivid-orange"
          : "flex items-center gap-1.5 rounded-full bg-light-gray px-3 py-1 font-openrunde text-sm font-semibold text-medium-gray"
      }
      data-test="mistakes-badge"
      data-mistakes={count}
      data-helped={helped ? "true" : undefined}
      aria-label={`Mistakes this stage: ${count}`}
    >
      <span aria-hidden>✕</span>
      <span>{count}</span>
    </output>
  );
}
