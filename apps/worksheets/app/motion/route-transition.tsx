import { cubicBezier } from "animejs";
import { type ReactNode, useRef } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

import { useAnime } from "./use-anime";

export const RouteTransitionPropsSchema = z.object({
  // Stable identity for the current route — when this changes, the entrance
  // animation re-fires. For worksheet routes, pass `${stageId}-${variant}`
  // so navigating between any two sheets retriggers the entrance.
  routeKey: z.string().min(1),
  children: z.unknown(),
});

// Page entrance animation. Subtle but deliberate: opacity + translateY +
// scale + a hair of rotation, all on a cubic-bezier curve borrowed from iOS
// page transitions (very smooth ease-out with a touch of momentum).
//
// `prefers-reduced-motion: reduce` short-circuits the animation entirely via
// useAnime — the page just appears, no flash.
export const RouteTransition = defineComponent(
  RouteTransitionPropsSchema,
  ({ routeKey, children }): ReactNode => {
    const ref = useRef<HTMLDivElement>(null);
    useAnime(
      ref,
      {
        opacity: [0, 1],
        translateY: [16, 0],
        scale: [0.985, 1],
        rotate: [0.4, 0],
        duration: 520,
        // Apple's "ease out" cubic-bezier — smooth deceleration with a
        // confident finish. Mathematically a snappy decelerator, perceptually
        // a "settle into place" gesture.
        ease: cubicBezier(0.32, 0.72, 0, 1),
      },
      [routeKey],
    );
    return (
      <div ref={ref} data-test="route-transition" style={{ transformOrigin: "50% 0%" }}>
        {children as ReactNode}
      </div>
    );
  },
);
