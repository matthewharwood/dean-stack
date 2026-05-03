import { useEffect, useRef } from "react";

import { attackFxRuntime } from "./runtime";

// Full-viewport overlay canvas where the singleton Pixi app paints attack
// animations. Mounted once at the route level. The canvas is
// `pointer-events-none` so it never intercepts clicks on the cards or
// buttons underneath. `z-index: 30` puts it above the equation/cards
// (regular content) and below the dive-in intro / round-complete fx
// overlays, which run their own canvases.
export function AttackFxLayer(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void (async () => {
      try {
        await attackFxRuntime.attach(canvas);
      } catch {
        // Runtime errors during init are caught by the route's error boundary
        // on next render. Silent here so a single GL hiccup doesn't take
        // down the rest of the UI.
      }
      if (cancelled) {
        attackFxRuntime.detach();
      }
    })();
    return () => {
      cancelled = true;
      attackFxRuntime.detach();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30"
      data-test="attack-fx-layer"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
