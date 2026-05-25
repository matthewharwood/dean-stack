import type { Meta, StoryObj } from "@storybook/react-vite";

import { generateWorksheet } from "~/worksheet/generate";

import { ProblemGrid } from "./index";

const meta = {
  title: "Worksheet/ProblemGrid",
  component: ProblemGrid,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProblemGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Stage1: Story = {
  args: { problems: generateWorksheet("s1", "A").problems, columns: 2 },
};

export const Stage12TrueFalseOneColumn: Story = {
  args: { problems: generateWorksheet("s12", "A").problems, columns: 1 },
};

export const Stage15Multiply: Story = {
  args: { problems: generateWorksheet("s15", "B").problems, columns: 2 },
};
