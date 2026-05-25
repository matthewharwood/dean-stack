import type { Meta, StoryObj } from "@storybook/react-vite";

import { deriveAnswerKey, generateWorksheet } from "~/worksheet/generate";

import { AnswerKeyPage } from "./index";

const meta = {
  title: "Worksheet/AnswerKeyPage",
  component: AnswerKeyPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AnswerKeyPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Stage1A: Story = {
  args: { answerKey: deriveAnswerKey(generateWorksheet("s1", "A")) },
};
export const Stage12TrueFalse: Story = {
  args: { answerKey: deriveAnswerKey(generateWorksheet("s12", "B")) },
};
export const Stage15Multiply: Story = {
  args: { answerKey: deriveAnswerKey(generateWorksheet("s15", "C")) },
};
