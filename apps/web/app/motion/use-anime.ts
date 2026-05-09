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
    // KEEP — this is a parameterized hook, not a runtime bug. The `deps`
    // arg is the public API: callers control when the animation re-fires.
    // useExhaustiveDependencies can only verify dep arrays it can see
    // statically; a parameter type-erased to DependencyList is opaque to
    // it. Refactoring to remove the parameter would break the call-site
    // contract (replay-on-state-change). Documented at hook-author time
    // — do not chase this disable.
    // biome-ignore lint/correctness/useExhaustiveDependencies: API design — `deps` is a public parameter the caller owns.
  }, deps);
}
