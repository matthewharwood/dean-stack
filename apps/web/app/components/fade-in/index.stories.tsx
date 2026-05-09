import type { Meta, StoryObj } from "@storybook/react-vite";

import { FadeIn } from ".";

const meta = {
  title: "Components/FadeIn",
  component: FadeIn,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof FadeIn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "hello, dean" },
};
