import type { PlayerTemplate } from "@dean-stack/schemas";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { PlayerAvatar } from ".";

const bride: PlayerTemplate = {
  id: "hadal-player-mythical-lantern-bride-bathypel",
  name: "Bathypel, the Lantern Bride",
  role: "vow-keeper",
  rarity: "mythic",
  imageUrl: "/players/hadal-player-mythical-lantern-bride-bathypel.png",
  bio: `## Role

Vow-keeper. Bathypel made a promise to the deep when she was very young, and she has been keeping it for so long that the lantern she carries has begun to keep her back.

## Quirk

She does not blink in the dark. The crew used to find this unsettling. They have, over the years, found it comforting.

## On Watch

She walks the lower deck alone with the lantern held at her chest, and where she walks the air warms by half a degree.`,
  attacks: [
    { id: "story-1", name: "Veil Slash", kind: "slash", color: "#f4e4c1", glyph: "✦" },
    { id: "story-2", name: "Wedding Toll", kind: "echo", color: "#fefce8", glyph: "◌" },
    { id: "story-3", name: "Bridal Storm", kind: "rain", color: "#fbcfe8", glyph: "❅" },
  ],
};

const meta = {
  title: "Components/PlayerAvatar",
  component: PlayerAvatar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 280, height: 460 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlayerAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = (): void => {
  // story-only stub for the cycle handler
};

export const Empty: Story = {
  args: {
    player: null,
    profileIndex: null,
    profileCount: null,
    onCycle: null,
    progress: null,
    xpThreshold: null,
  },
};

export const FreshPilot: Story = {
  args: {
    player: { ...bride, rarity: "common", name: "Mara Brasswake", role: "apprentice" },
    profileIndex: 1,
    profileCount: 10,
    onCycle: noop,
    progress: { xp: 0, level: 1 },
    xpThreshold: 20,
  },
};

export const MidXp: Story = {
  args: {
    player: { ...bride, rarity: "rare", name: "Ivo Bellcurrent", role: "bell-ringer" },
    profileIndex: 5,
    profileCount: 10,
    onCycle: noop,
    progress: { xp: 12, level: 2 },
    xpThreshold: 30,
  },
};

export const HighLevel: Story = {
  args: {
    player: { ...bride, rarity: "epic", name: "Luma Pearlspoke", role: "diplomat" },
    profileIndex: 7,
    profileCount: 10,
    onCycle: noop,
    progress: { xp: 35, level: 5 },
    xpThreshold: 60,
  },
};

export const MythicAlmostLeveled: Story = {
  args: {
    player: bride,
    profileIndex: 10,
    profileCount: 10,
    onCycle: noop,
    progress: { xp: 38, level: 4 },
    xpThreshold: 50,
  },
};

export const NoCycle: Story = {
  args: {
    player: bride,
    profileIndex: 1,
    profileCount: 1,
    onCycle: null,
    progress: { xp: 5, level: 1 },
    xpThreshold: 20,
  },
};
