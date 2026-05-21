import { useState } from "react";

import { defineComponent } from "~/lib/define-component";

import { BubbleBurstFxPropsSchema } from "./schema";

// Per-burst bubble geometry. Computed once via useState's lazy initializer
// each time the burst remounts (the route bumps the React key so the whole
// component tree re-runs), so Math.random keeps its variety without
// re-rolling on every render.
interface Bubble {
  id: string;
  leftPct: number;
  sizePx: number;
  delayMs: number;
  driftPx: number;
  durationMs: number;
}

const BUBBLE_COUNT = 9;

function makeBubbles(): Bubble[] {
  return Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
    id: `bubble-${i}`,
    leftPct: 25 + Math.random() * 50,
    sizePx: 10 + Math.random() * 18,
    delayMs: i * 70 + Math.random() * 80,
    driftPx: (Math.random() - 0.5) * 60,
    durationMs: 1400 + Math.random() * 700,
  }));
}

// Bubble Burst — fires once per correct-answer winning evaluation when
// the Bubble Burst Tide Sigil is owned. The route mounts a fresh copy
// (via key={trigger}) so the CSS animation restarts cleanly on every
// win; the burst self-removes after ~2.5s when the keyframe completes
// — no JS cleanup needed.
export const BubbleBurstFx = defineComponent(BubbleBurstFxPropsSchema, ({ enabled }) => {
  const [bubbles] = useState<Bubble[]>(makeBubbles);
  if (!enabled) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
      data-test="bubble-burst-fx"
      aria-hidden
    >
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="absolute bottom-0 block rounded-full bg-white animate-crystal-bubble-rise"
          style={{
            left: `${b.leftPct}%`,
            width: `${b.sizePx}px`,
            height: `${b.sizePx}px`,
            // Per-bubble custom props drive the keyframe's translateX
            // drift and animation timing so each bubble takes its own path.
            ["--bubble-drift" as string]: `${b.driftPx}px`,
            animationDelay: `${b.delayMs}ms`,
            animationDuration: `${b.durationMs}ms`,
          }}
        />
      ))}
    </div>
  );
});
