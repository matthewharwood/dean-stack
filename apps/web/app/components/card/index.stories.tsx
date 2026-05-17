import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from ".";

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 96, height: 144 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Three: Story = { args: { value: 3 } };
export const Seven: Story = { args: { value: 7 } };
export const Ten: Story = { args: { value: 10 } };
export const Target: Story = { args: { value: 10, variant: "target" } };

// ── Ten-frame display (R5–R8) ────────────────────────────────────────────
// 2×5 grid of dots. First `value` cells filled. Used in the find-missing-
// result rounds so the kid subitizes / counts dots instead of reading a
// numeral. Stories cover the full value envelope our levels actually
// produce: 1–10 single frame (R5/R6), 11–20 stacked double frame (R7/R8).
export const TenFrameOne: Story = { args: { value: 1, display: "ten-frame" } };
export const TenFrameThree: Story = { args: { value: 3, display: "ten-frame" } };
export const TenFrameFive: Story = { args: { value: 5, display: "ten-frame" } };
export const TenFrameSeven: Story = { args: { value: 7, display: "ten-frame" } };
export const TenFrameNine: Story = { args: { value: 9, display: "ten-frame" } };
export const TenFrameTen: Story = { args: { value: 10, display: "ten-frame" } };
export const TenFrameTargetSeven: Story = {
  args: { value: 7, display: "ten-frame", variant: "target", disabled: true },
};

// Stacked double-ten-frame (R7/R8). Top frame always fills to 10; bottom
// frame holds value − 10. Eleven is the first stacked value (one dot in
// the bottom frame); twenty is the cap (both frames fully filled). The
// target-variant story confirms the stack lays out cleanly inside the
// inset dotted frame at the larger value.
export const TenFrameEleven: Story = { args: { value: 11, display: "ten-frame" } };
export const TenFrameThirteen: Story = { args: { value: 13, display: "ten-frame" } };
export const TenFrameSeventeen: Story = { args: { value: 17, display: "ten-frame" } };
export const TenFrameTwenty: Story = { args: { value: 20, display: "ten-frame" } };
export const TenFrameTargetFifteen: Story = {
  args: { value: 15, display: "ten-frame", variant: "target", disabled: true },
};

// ── Verdict card (R9 true-false-multiply) ────────────────────────────────
// Bold TRUE / FALSE text card. Rendered when `verdict` is set; `value` and
// `display` are ignored in this mode. Green for true, red for false so the
// affordance reads at a glance for a 7-year-old.
export const VerdictTrue: Story = { args: { verdict: true } };
export const VerdictFalse: Story = { args: { verdict: false } };
