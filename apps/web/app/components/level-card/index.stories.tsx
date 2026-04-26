import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { LevelCard } from "./index";

const meta = {
  title: "Components/LevelCard",
  component: LevelCard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { onComplete: fn() },
} satisfies Meta<typeof LevelCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  args: { level: 1, completed: false },
};

export const Completed: Story = {
  args: { level: 1, completed: true },
};
