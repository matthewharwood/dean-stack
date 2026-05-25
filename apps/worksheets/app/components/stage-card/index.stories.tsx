import type { Meta, StoryObj } from "@storybook/react-vite";

import { findStage } from "~/worksheet/stages";

import { StageCard } from "./index";

const meta = {
  title: "Worksheet/StageCard",
  component: StageCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof StageCard>;

export default meta;

type Story = StoryObj<typeof meta>;

// findStage(...) is asserted in stages.ts itself — the value is always present
// for s1 / s5 / s12. The non-null assertion is a story-only convenience.
const stage = (id: string) => {
  const s = findStage(id);
  if (!s) throw new Error(`storybook seed: missing stage ${id}`);
  return s;
};

export const Stage1: Story = { args: { stage: stage("s1") } };
export const Stage5: Story = { args: { stage: stage("s5") } };
export const Stage12: Story = { args: { stage: stage("s12") } };
