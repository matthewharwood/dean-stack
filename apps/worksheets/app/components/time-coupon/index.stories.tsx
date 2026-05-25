import type { Meta, StoryObj } from "@storybook/react-vite";

import { TimeCoupon } from "./index";

const meta = {
  title: "Worksheet/TimeCoupon",
  component: TimeCoupon,
  parameters: { layout: "padded" },
} satisfies Meta<typeof TimeCoupon>;

export default meta;

type Story = StoryObj<typeof meta>;

// 12-problem case: 3 full groups of 4 + 2 bonus = 5 minutes max.
export const TwelveProblems: Story = {
  args: { problemCount: 12, sheetLabel: "S1 · Sheet A" },
};

// 10-problem case: 2 full groups + 2 extra, 2 minutes base + 2 bonus = 4 max.
export const TenProblems: Story = {
  args: { problemCount: 10, sheetLabel: "S3 · Sheet B" },
};

// 15-problem case: 3 full groups + 3 extra, 3 minutes base + 2 bonus = 5 max.
export const FifteenProblems: Story = {
  args: { problemCount: 15, sheetLabel: "S9 · Sheet C" },
};
