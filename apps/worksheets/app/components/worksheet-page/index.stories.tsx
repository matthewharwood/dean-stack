import type { Meta, StoryObj } from "@storybook/react-vite";

import { generateWorksheet } from "~/worksheet/generate";

import { WorksheetPage } from "./index";

const meta = {
  title: "Worksheet/Page",
  component: WorksheetPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof WorksheetPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Stage1VariantA: Story = { args: { worksheet: generateWorksheet("s1", "A") } };
export const Stage5VariantB: Story = { args: { worksheet: generateWorksheet("s5", "B") } };
export const Stage12TrueFalse: Story = { args: { worksheet: generateWorksheet("s12", "A") } };
export const Stage15Multiply: Story = { args: { worksheet: generateWorksheet("s15", "C") } };
export const WithDefaultName: Story = {
  args: { worksheet: generateWorksheet("s1", "A"), defaultName: "Halid" },
};
