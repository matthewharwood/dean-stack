import { type AnimationParams, animate } from "animejs";
import { type DependencyList, type RefObject, useEffect } from "react";

const PRM = "(prefers-reduced-motion: reduce)";

// Pillar — animations are a side channel; never call anime.js during render.
// `useAnime` runs the animation in `useEffect` and short-circuits on
// `prefers-reduced-motion: reduce` so the system-wide setting is honored once,
// not re-implemented at every site.
export function useAnime<T extends Element>(
  ref: RefObject<T | null>,
  params: AnimationParams,
  deps: DependencyList = [],
): void {
  useEffect(() => {
    if (!ref.current) return;
    if (typeof window !== "undefined" && window.matchMedia(PRM).matches) {
      return;
    }
    const a = animate(ref.current, params);
    return () => {
      a.cancel();
    };
    // Per-call-site deps; the React Compiler audit relies on the caller passing the right list.
    // biome-ignore lint/correctness/useExhaustiveDependencies: caller-controlled deps
  }, deps);
}
