import type { Meta, StoryObj } from "@storybook/react-vite";

import { WorksheetIntro } from "./index";

const meta = {
  title: "Worksheet/Intro",
  component: WorksheetIntro,
  parameters: { layout: "padded" },
  args: {
    introCopy:
      "Welcome to Stage 1! Find two numbers that add up to the target on the right side of each equation. There are many right answers — pick any pair that works.",
    instruction: "Write two numbers in the blanks that add up to each target.",
  },
} satisfies Meta<typeof WorksheetIntro>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TrueFalseInstruction: Story = {
  args: {
    introCopy:
      "Multiplication! For each equation, decide if it's TRUE or FALSE. Circle your answer. You can draw rows of dots to check.",
    instruction: "Decide if each multiplication equation is TRUE or FALSE. Circle one.",
  },
};
