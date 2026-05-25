import type { Meta, StoryObj } from "@storybook/react-vite";

import { WorksheetHeader } from "./index";

const meta = {
  title: "Worksheet/Header",
  component: WorksheetHeader,
  parameters: { layout: "padded" },
  args: {
    title: "Stage 1: Adding Up",
    subtitle: "Pick two numbers that add to the target.",
    stageOrdinal: 1,
    variant: "A",
  },
} satisfies Meta<typeof WorksheetHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithName: Story = {
  args: { defaultName: "Halid" },
};

export const VariantC: Story = {
  args: {
    variant: "C",
    title: "Stage 12: True or False?",
    subtitle: "Multiplication checks.",
    stageOrdinal: 12,
  },
};
