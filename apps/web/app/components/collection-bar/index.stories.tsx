import type { CrystalId } from "@dean-stack/schemas";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { CollectionBar } from ".";

const meta = {
  title: "Components/CollectionBar",
  component: CollectionBar,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="rounded-md bg-slate-900 p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CollectionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Brand-new save — no crystals owned, bar renders null.
export const Empty: Story = { args: { ownedCrystals: [] as CrystalId[] } };

// Mid-campaign — three crystals from different categories.
export const ThreeCrystals: Story = {
  args: {
    ownedCrystals: ["marine-snow", "phosphor-numerals", "maras-compass"] as CrystalId[],
  },
};

// Late-campaign — six crystals (the kid's full take from a finished run).
export const SixCrystals: Story = {
  args: {
    ownedCrystals: [
      "marine-snow",
      "phosphor-numerals",
      "maras-compass",
      "edge-coral",
      "lucky-strike",
      "caustic-light",
    ] as CrystalId[],
  },
};
