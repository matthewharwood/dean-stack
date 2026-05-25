import type { Meta, StoryObj } from "@storybook/react-vite";

import { CompletionStamp } from "./index";

const meta = {
  title: "Worksheet/CompletionStamp",
  component: CompletionStamp,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CompletionStamp>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
