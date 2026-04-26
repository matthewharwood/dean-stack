import type { Meta, StoryObj } from "@storybook/react-vite";

import { Scoreboard } from "./index";

const meta = {
  title: "Components/Scoreboard",
  component: Scoreboard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Scoreboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreePlayers: Story = {
  args: {
    scores: [
      { player: "Dean", value: 30 },
      { player: "Alex", value: 25 },
      { player: "Sam", value: 18 },
    ],
    highlightTop: true,
  },
};

export const Empty: Story = {
  args: {
    scores: [],
    highlightTop: false,
  },
};
