import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { BubbleBurstFx } from ".";

const meta = {
  title: "Components/BubbleBurstFx",
  component: BubbleBurstFx,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          background: "linear-gradient(180deg, #0d2540 0%, #050e1f 100%)",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BubbleBurstFx>;

export default meta;
type Story = StoryObj<typeof meta>;

// Disabled — nothing renders (the kid doesn't own Bubble Burst yet).
export const Disabled: Story = { args: { enabled: false, trigger: 0 } };

// First burst — fires once on mount, bubbles drift up and fade.
export const Burst: Story = { args: { enabled: true, trigger: 1 } };

// Interactive — a "burst again" button bumps the trigger so the Playwright
// test can observe multiple bursts firing without remounting the whole story.
export const Interactive: Story = {
  args: { enabled: true, trigger: 1 },
  render: () => {
    function InteractiveBurst(): React.ReactNode {
      const [count, setCount] = useState(1);
      return (
        <>
          <BubbleBurstFx key={count} enabled trigger={count} />
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            className="absolute top-4 left-4 z-50 rounded-md bg-white px-4 py-2 font-openrunde text-slate-ink"
            data-test="bubble-burst-again"
          >
            Burst again ({count})
          </button>
        </>
      );
    }
    return <InteractiveBurst />;
  },
};
