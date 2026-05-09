import type { Meta, StoryObj } from "@storybook/react-vite";

import { FilterSearch } from ".";

const meta = {
  title: "Components/FilterSearch",
  component: FilterSearch,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof FilterSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: ["maze", "platformer", "tic-tac-toe", "snake", "minesweeper"],
  },
};
