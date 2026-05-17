import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { SwipeToEvaluate } from ".";

const noop = (): void => undefined;

const meta = {
  title: "Components/SwipeToEvaluate",
  component: SwipeToEvaluate,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
  args: { onCommit: noop, canCommit: true },
} satisfies Meta<typeof SwipeToEvaluate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = { args: { canCommit: true } };
export const Disabled: Story = { args: { canCommit: false } };
export const CustomLabel: Story = {
  args: { canCommit: true, label: "Swipe to commit" },
};

// Live story — owns a commit counter so the Playwright drag test can
// observe a real onCommit firing without the parent route's state.
// The counter renders next to the swipe so the assertion is a visible
// text change ("commits: 0" → "commits: 1") rather than a transient
// data-attribute.
export const Interactive: Story = {
  args: { canCommit: true },
  render: (args) => {
    function InteractiveSwipe() {
      const [count, setCount] = useState(0);
      return (
        <div>
          <SwipeToEvaluate canCommit={args.canCommit} onCommit={() => setCount((c) => c + 1)} />
          <div
            className="mt-3 text-center font-openrunde text-sm text-slate-ink"
            data-test="commit-counter"
          >
            commits: {count}
          </div>
        </div>
      );
    }
    return <InteractiveSwipe />;
  },
};
