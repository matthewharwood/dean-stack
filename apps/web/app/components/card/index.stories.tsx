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

// ── Ten-frame display (R5/R6) ────────────────────────────────────────────
// 2×5 grid of dots. First `value` cells filled. Used in the find-missing-
// result rounds so the kid subitizes / counts dots instead of reading a
// numeral. Stories cover the full value envelope our levels actually
// produce (1–9) plus the cap (10).
export const TenFrameOne: Story = { args: { value: 1, display: "ten-frame" } };
export const TenFrameThree: Story = { args: { value: 3, display: "ten-frame" } };
export const TenFrameFive: Story = { args: { value: 5, display: "ten-frame" } };
export const TenFrameSeven: Story = { args: { value: 7, display: "ten-frame" } };
export const TenFrameNine: Story = { args: { value: 9, display: "ten-frame" } };
export const TenFrameTen: Story = { args: { value: 10, display: "ten-frame" } };
export const TenFrameTargetSeven: Story = {
  args: { value: 7, display: "ten-frame", variant: "target", disabled: true },
};
