import { Graphics } from "pixi.js";
import { useRef } from "react";

import { usePixiApp } from "~/canvas/use-pixi-app";
import { defineComponent } from "~/lib/define-component";

import { PixiCanvasDemoPropsSchema } from "./schema";

// Seed for the canvas side-channel pattern. A pink square rotates via Pixi's
// Ticker; under `prefers-reduced-motion: reduce` the Ticker callback never
// registers, so the square renders static. The wrapping `<div>` owns sizing;
// the `<canvas>` ref is what `usePixiApp` hands to `Application.init({ canvas })`.
export const PixiCanvasDemo = defineComponent(PixiCanvasDemoPropsSchema, (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  usePixiApp(
    canvasRef,
    (app, { reducedMotion }) => {
      const square = new Graphics().rect(-30, -30, 60, 60).fill(0xff4488);
      square.position.set(props.width / 2, props.height / 2);
      app.stage.addChild(square);

      if (reducedMotion) return;
      const tick = (ticker: { deltaTime: number }) => {
        square.rotation += 0.015 * ticker.deltaTime;
      };
      app.ticker.add(tick);
      return () => {
        app.ticker.remove(tick);
      };
    },
    [props.width, props.height],
  );

  return (
    <div
      data-test="pixi-canvas-demo"
      className="rounded-card bg-brand-900 p-2 shadow-md"
      style={{ width: props.width, height: props.height }}
    >
      <canvas
        ref={canvasRef}
        width={props.width}
        height={props.height}
        className="block size-full"
      />
    </div>
  );
});
