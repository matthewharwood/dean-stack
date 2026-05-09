import type { Meta, StoryObj } from "@storybook/react-vite";

import { SoundBoard } from "./index";

const meta = {
  title: "Components/SoundBoard",
  component: SoundBoard,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SoundBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {
  args: {},
};

export const UIOnly: Story = {
  args: { prefix: "ui-" },
};

export const FoleyOnly: Story = {
  args: { prefix: "foley-" },
};

export const CombatOnly: Story = {
  args: { prefix: "combat-" },
};

export const AmbienceOnly: Story = {
  args: { prefix: "ambience-" },
};
