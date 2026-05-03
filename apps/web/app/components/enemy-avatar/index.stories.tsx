import type { EnemyTemplate } from "@dean-stack/schemas";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { EnemyAvatar } from "./index";

const wraith: EnemyTemplate = {
  id: "hadal-pressure-wraith",
  name: "Hadal Pressure Wraith",
  type: "pressure",
  rarity: "mythic",
  maxHp: 42,
  imageUrl: "/hadal-pressure-wraith.png",
  bio: `The wraith is what the Forgetting looks like when it has had a long time to settle. Heavy. Slow. Folded in on itself the way grief folds.

It was something else once — a tide, a name, a hand on a railing. It cannot find any of those things now, only the weight where they used to be.

Do not be afraid of it. It is not angry. It is tired in a way the surface does not have a word for.`,
};

const meta = {
  title: "Components/EnemyAvatar",
  component: EnemyAvatar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 280, height: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EnemyAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { enemy: null, hp: null } };

export const FullHealth: Story = { args: { enemy: wraith, hp: wraith.maxHp } };

export const WoundedMythic: Story = { args: { enemy: wraith, hp: 34 } };

export const NearDeath: Story = { args: { enemy: wraith, hp: 4 } };

export const RarityRamp: Story = {
  args: { enemy: { ...wraith, rarity: "common", name: "Tide Imp" }, hp: 18 },
};

export const RarityEpic: Story = {
  args: { enemy: { ...wraith, rarity: "epic", name: "Abyssal Lurker" }, hp: 30 },
};

export const RarityLegendary: Story = {
  args: { enemy: { ...wraith, rarity: "legendary", name: "Magma Maw" }, hp: 28 },
};
