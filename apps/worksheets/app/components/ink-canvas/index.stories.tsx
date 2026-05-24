import {
  BASELINE_DIGIT_TEMPLATES,
  type RecognitionResult,
  recognize,
  type Stroke,
} from "@dean-stack/handwriting-recognizer";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

import { InkCanvas } from "./index";

const meta = {
  title: "Worksheet/InkCanvas",
  component: InkCanvas,
  parameters: { layout: "centered" },
} satisfies Meta<typeof InkCanvas>;

export default meta;

type Story = StoryObj<typeof meta>;

// Plain canvas — no recognizer wired. Draw and see the strokes.
export const Plain: Story = {
  args: {
    width: 240,
    height: 240,
    // Allow mouse input in Storybook so the desktop dev loop works.
    // Production iPad use sticks to "pen" only via the worksheets route.
    inputModes: ["pen", "mouse"],
    endStrokeAfterMs: 600,
    inkColor: "#1f1f3f",
    initialStrokes: [],
  },
};

// Live recognition story — draws against the full baseline set and shows
// the recognized digit + score + runnerUp. This is the meaningful test:
// open it on the iPad over LAN, draw digits, see how well the baselines
// match Halid's actual hand. Templates the kid promotes via AnswerCell
// will live in IDB; this story uses only the shipped baselines.
export const WithLiveRecognition: Story = {
  args: {
    width: 240,
    height: 240,
    inputModes: ["pen", "mouse"],
    endStrokeAfterMs: 600,
    inkColor: "#1f1f3f",
    initialStrokes: [],
  },
  render: function Story() {
    // args are provided to satisfy the type-checker; the demo overrides
    // them inside RecognitionDemo with the interactive wiring.
    return <RecognitionDemo />;
  },
};

function RecognitionDemo(): ReactNode {
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [strokes, setStrokes] = useState<readonly Stroke[]>([]);
  const clear = (): void => {
    setResult(null);
    setStrokes([]);
    // Dispatch the contract event the canvas listens for.
    const canvas = document.querySelector('[data-test="ink-canvas"]');
    canvas?.dispatchEvent(new CustomEvent("ink-canvas:clear"));
  };
  return (
    <div className="flex flex-col items-center gap-3 font-display">
      <p className="text-xs uppercase tracking-widest opacity-60">
        Draw a digit · {BASELINE_DIGIT_TEMPLATES.length} baseline templates loaded
      </p>
      <div className="border-2 border-current rounded-card overflow-hidden">
        <InkCanvas
          width={240}
          height={240}
          inputModes={["pen", "mouse"]}
          endStrokeAfterMs={600}
          inkColor="#1f1f3f"
          initialStrokes={[]}
          onStrokesComplete={(s) => {
            setStrokes(s);
            setResult(recognize(s, BASELINE_DIGIT_TEMPLATES));
          }}
        />
      </div>
      <div className="flex flex-col items-center gap-1 min-h-[3rem]">
        {result ? (
          <>
            <p className="text-3xl tabular-nums">
              {result.label ?? "?"}
              <span className="text-sm ml-2 opacity-60">
                score {result.score.toFixed(2)}
                {result.runnerUp
                  ? ` · runner-up ${result.runnerUp.label} @ ${result.runnerUp.score.toFixed(2)}`
                  : ""}
              </span>
            </p>
            <p className="text-xs uppercase tracking-widest opacity-50">
              {result.confident ? "confident · would grade" : "not confident · ask to rewrite"}
            </p>
          </>
        ) : (
          <p className="text-xs uppercase tracking-widest opacity-40">
            (draw something to recognize)
          </p>
        )}
        <p className="text-[10px] opacity-40">{strokes.length} stroke(s) captured</p>
      </div>
      <button
        type="button"
        className="rounded-card border border-current px-3 py-1 text-sm"
        onClick={clear}
      >
        Clear
      </button>
    </div>
  );
}
