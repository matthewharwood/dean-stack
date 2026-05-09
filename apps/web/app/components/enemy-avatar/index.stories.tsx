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

// Real tier-2 enemy with all three poster files in apps/web/public/enemies/.
// Used by the PosterProgression story so the poster swap is visible without
// having to ship test fixtures alongside the story.
const glassManta: EnemyTemplate = {
  id: "hadal-glass-manta-echo",
  name: "Glass Manta Echo",
  type: "glass",
  rarity: "common",
  maxHp: 14,
  imageUrl: "/enemies/hadal-glass-manta-echo.png",
  bio: `Older than glass. Older than the idea of windows. It floats along a line it drew when the world was little and refuses to cross it for any reason. The line is the last rule it remembers — the only piece of itself that's still its own.`,
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

// ── Poster progression (encounter-driven) ────────────────────────────────
// Each tier-2 enemy ships three posters (default / _L1 / _L2). The
// component derives the URL from `encounters` via `derivePosterUrl`. These
// stories drive the variant directly so a Playwright story-spec can mount
// each one and assert on the rendered <img src> suffix.
export const PosterDefault: Story = {
  name: "Poster — default (encounters: 0)",
  args: { enemy: glassManta, hp: 14, encounters: 0 },
};
export const PosterL1: Story = {
  name: "Poster — L1 (encounters: 1)",
  args: { enemy: glassManta, hp: 14, encounters: 1 },
};
export const PosterL2: Story = {
  name: "Poster — L2 (encounters: 2)",
  args: { enemy: glassManta, hp: 14, encounters: 2 },
};
// Cap test — anything past 2 still resolves to L2.
export const PosterL2Capped: Story = {
  name: "Poster — L2 capped (encounters: 5)",
  args: { enemy: glassManta, hp: 14, encounters: 5 },
};
