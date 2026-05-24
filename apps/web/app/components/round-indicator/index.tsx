import { useEffect, useRef, useState } from "react";

import { defineComponent } from "~/lib/define-component";

import { RoundIndicatorPropsSchema } from "./schema";

// Tier-up animation: the parent passes `<RoundIndicator key={round} ... />`
// (see adding-game.tsx) so the component remounts whenever `round` changes.
// That means the badge-pulse effect can be a plain mount-only useEffect with
// an empty dep array — no prop-watching, no derived-state pattern. The
// initial mount also pulses (welcome to round 1!) which is intentional.

// Round indicator. Lives in the Top region. Renders a segmented
// progress strip — one vertical bar per level in the whole campaign
// (totalLevels) — with the kid's completed bars filled in oceanic
// blue and an animated wave traveling across the filled segments.
// A centered "Round N / 16" badge overlays the strip.
//
// Why a per-level strip (not per-round dots)? Higher resolution: the
// kid sees not just "round 5" but "level 26 of 63" — every successful
// equation lights one more bar. The wave makes the progress feel
// alive without competing with the play area.
//
// Tier-up: when `round` flips N → N+1, the centered badge plays the
// tier-up animation (lift + glow + scale) to mark the milestone.

// Tailwind class for one progress bar, indexed by state.
function barClass(filled: boolean, current: boolean): string {
  if (current)
    return "bg-gradient-to-b from-sky-300 to-blue-700 animate-round-bar-wave shadow-[0_0_4px_rgba(59,130,246,0.4)]";
  if (filled) return "bg-gradient-to-b from-sky-300 to-blue-700 animate-round-bar-wave";
  return "bg-light-gray/70";
}

// Build a stable id per bar so React doesn't reuse keys across mounts.
// 63 entries by default; we generate `totalLevels` from the schema.
function barId(round: number, idx: number): string {
  return `r${round}-b${idx}`;
}

export const RoundIndicator = defineComponent(RoundIndicatorPropsSchema, (props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  // tierUp starts true so the badge pulses immediately on mount, and an
  // effect flips it off after the keyframe duration. Parent passes
  // `key={round}` so the component remounts each round, restarting the
  // initial-true state without watching props inside.
  const [tierUp, setTierUp] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only animation timer
  useEffect(() => {
    const t = window.setTimeout(() => setTierUp(false), 720);
    return () => window.clearTimeout(t);
  }, []);

  const { round, levelIndex, totalLevels } = props;
  // Wave traverses the strip at ~one cycle per animation period. Per-
  // bar delay = (i / totalLevels) * period. With period 2400ms and
  // 63 bars that's ~38ms per bar — perceptually smooth.
  const WAVE_PERIOD_MS = 2400;
  const bars = Array.from({ length: totalLevels }, (_, i) => i + 1);

  return (
    <div
      ref={rootRef}
      className="relative size-full overflow-hidden"
      data-test="round-indicator"
      data-round={round}
      data-level-index={levelIndex}
      data-total-levels={totalLevels}
    >
      {/* Segmented bar strip. One bar per level. Gap is 1px so the
          strip reads as continuous water rather than discrete blocks. */}
      <div className="flex h-full w-full items-stretch gap-px px-2 py-3">
        {bars.map((level, i) => {
          const filled = level <= levelIndex;
          const current = level === levelIndex;
          // Stagger the wave: each bar's animation starts a bit later
          // than the previous, so the brightness/scale pulse travels
          // left-to-right. We compute the delay in ms inline (CSS var
          // would also work; inline is simpler for ~63 items).
          const delayMs = Math.round((i / totalLevels) * WAVE_PERIOD_MS);
          return (
            <span
              key={barId(round, i)}
              className={`flex-1 origin-bottom rounded-[2px] ${barClass(filled, current)}`}
              style={{ animationDelay: `${delayMs}ms` }}
              data-test="round-indicator-bar"
              data-bar-level={level}
              data-bar-filled={filled ? "true" : "false"}
              data-bar-current={current ? "true" : undefined}
            />
          );
        })}
      </div>
      {/* Centered round badge. Absolute over the bar strip with a
          subtle white scrim so the text stays legible no matter which
          bar sits behind it. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={`rounded-md border border-light-gray/80 bg-canvas-white/85 px-5 py-2 text-center font-openrunde shadow-subtle backdrop-blur-sm ${tierUp ? "animate-tier-up" : ""}`}
          data-tier-up={tierUp ? "true" : undefined}
        >
          <div className="text-xs italic tracking-wide text-muted-gray">Round</div>
          <div className="text-lg font-bold leading-tight text-slate-ink">
            {round} <span className="text-muted-gray">/</span> 16
          </div>
        </div>
      </div>
    </div>
  );
});
