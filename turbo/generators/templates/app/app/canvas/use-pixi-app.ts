import { Application } from "pixi.js";
import { type DependencyList, type RefObject, useEffect } from "react";

const PRM = "(prefers-reduced-motion: reduce)";

type SetupCleanup = (() => void) | void;
type SetupContext = { reducedMotion: boolean };
type Setup = (app: Application, ctx: SetupContext) => SetupCleanup;

// Pillar — PixiJS is a side channel exactly like anime.js. The scene graph
// mutates the canvas outside React's reconciler; render must stay pure. This
// hook owns the lifecycle: async `app.init({ canvas, ... })`, the `setup`
// callback (where the caller adds children, registers Ticker callbacks, etc.),
// and `app.destroy(true, { children: true, texture: true })` on unmount.
// `prefers-reduced-motion: reduce` is detected once and passed to setup so the
// caller can skip Ticker-driven animations the same way `useAnime` short-circuits.
export function usePixiApp(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  setup: Setup,
  deps: DependencyList = [],
): void {
  useEffect(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const reducedMotion = typeof window !== "undefined" && window.matchMedia(PRM).matches;

      let app: Application | null = null;
      let userCleanup: SetupCleanup;
      let cancelled = false;

      void (async () => {
        const next = new Application();
        await next.init({
          canvas,
          resizeTo: canvas.parentElement ?? canvas,
          antialias: true,
          // WebGL is the most reliable backend in headless Chromium (Playwright);
          // pixi will fall back to canvas if WebGL is unavailable.
          preference: "webgl",
          autoStart: !reducedMotion,
        });
        if (cancelled) {
          next.destroy(true, { children: true, texture: true });
          return;
        }
        app = next;
        userCleanup = setup(next, { reducedMotion });
      })();

      return () => {
        cancelled = true;
        if (typeof userCleanup === "function") userCleanup();
        if (app) app.destroy(true, { children: true, texture: true });
      };
    },
    // KEEP — same API-design escape as `useAnime`. `deps` is the
    // public parameter the caller owns, opaque to biome's static dep
    // verifier. See use-anime.ts for the full reasoning.
    // biome-ignore lint/correctness/useExhaustiveDependencies: API design — `deps` is a public parameter the caller owns.
    deps,
  );
}
