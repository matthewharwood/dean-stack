import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { StepperCard } from ".";

// Hoisted no-op for the meta's default args — biome's
// no-empty-block-statements rule blocks `() => {}` inline; an expression-
// body arrow returning a literal is the canonical workaround.
const noop = (): void => undefined;

const meta = {
  title: "Components/StepperCard",
  component: StepperCard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 96, height: 144 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    // Real handlers are wired up by the route. The stories use no-op
    // stubs so the buttons fire without affecting story state — the
    // Interactive story below overrides with real state-mutating ones.
    onIncrement: noop,
    onDecrement: noop,
  },
} satisfies Meta<typeof StepperCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default — small value, both buttons enabled.
export const Zero: Story = { args: { value: 0 } };
export const Seven: Story = { args: { value: 7 } };
export const Twenty: Story = { args: { value: 20 } };

// Disabled — both halves grayed out. The route uses this state between
// rounds while the win/loss UI is up so the kid can't keep tapping.
export const Disabled: Story = { args: { value: 5, disabled: true } };

// Live, wired-up stepper — owns its own state so clicks actually mutate
// the displayed numeral. The Playwright test exercises this story to
// verify the increment / decrement handlers are wired through to React
// state (not just the no-op props the other stories use). Clamped at 0
// the same way the route's reducer does.
export const Interactive: Story = {
  args: { value: 7 },
  render: (initial) => {
    function InteractiveStepper() {
      const [v, setV] = useState(initial.value);
      return (
        <StepperCard
          value={v}
          onIncrement={() => setV((prev) => prev + 1)}
          onDecrement={() => setV((prev) => Math.max(0, prev - 1))}
        />
      );
    }
    return <InteractiveStepper />;
  },
};
