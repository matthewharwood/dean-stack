import type { Meta, StoryObj } from "@storybook/react-vite";

import { PixiCanvasDemo } from ".";

const meta = {
  title: "Components/PixiCanvasDemo",
  component: PixiCanvasDemo,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof PixiCanvasDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { width: 320, height: 240 },
};

export const Square: Story = {
  args: { width: 200, height: 200 },
};
