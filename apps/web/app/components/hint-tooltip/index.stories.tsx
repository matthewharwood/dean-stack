import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { HintTooltip } from "./index";

const meta = {
  title: "Components/HintTooltip",
  component: HintTooltip,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { onDismiss: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 640 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HintTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DirectionTooBig: Story = {
  args: {
    emphasis: "Try smaller!",
    body: "Your answer is *bigger* than 10. Pick smaller cards.",
    failedResult: { computed: 13, expected: 10 },
    hands: null,
  },
};

export const NumberBonds: Story = {
  args: {
    emphasis: "Find the friends.",
    body: "Numbers that make 10 come in pairs. Like 3 and 7, or 4 and 6.",
    failedResult: null,
    hands: { count: 10, caption: "Make 10" },
  },
};

export const GreaterThan: Story = {
  args: {
    emphasis: "Aim higher!",
    body: "You need an answer *bigger* than 12.",
    failedResult: { computed: 8, expected: 12 },
    hands: null,
  },
};

export const LessThan: Story = {
  args: {
    emphasis: "Stay under!",
    body: "Anything under 9 is right. Don't add too much.",
    failedResult: { computed: 13, expected: 9 },
    hands: null,
  },
};

export const Encouragement: Story = {
  args: {
    emphasis: "Great try!",
    body: "Math is like a *puzzle*. Move one card and try again.",
    failedResult: null,
    hands: null,
  },
};

export const CountFingers: Story = {
  args: {
    emphasis: "Use your fingers.",
    body: "Show one number, then *count up* to 7.",
    failedResult: null,
    hands: { count: 7, caption: "Count to 7" },
  },
};

export const SubtractionGap: Story = {
  args: {
    emphasis: "Count the gap.",
    body: "Pick the bigger card. *Count down* to the smaller one.",
    failedResult: { computed: 2, expected: 5 },
    hands: { count: 5, caption: "The gap is 5" },
  },
};
