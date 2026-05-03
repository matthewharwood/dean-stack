import type { Meta, StoryObj } from "@storybook/react-vite";

import { AttackButton } from "./index";

const meta = {
  title: "Components/AttackButton",
  component: AttackButton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof AttackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = (): void => {};

export const Slash: Story = {
  args: {
    attack: {
      id: "mara-slash",
      name: "Brass Toll",
      kind: "wave",
      color: "#d4a045",
      glyph: "T",
    },
    damage: 8,
    onSelect: noop,
    pending: false,
  },
};

export const Beam: Story = {
  args: {
    attack: {
      id: "aster-beam",
      name: "Astral Beam",
      kind: "beam",
      color: "#7c3aed",
      glyph: "✦",
    },
    damage: 14,
    onSelect: noop,
    pending: false,
  },
};

export const Spark: Story = {
  args: {
    attack: {
      id: "mara-spark",
      name: "Lantern Spark",
      kind: "spark",
      color: "#f4e4c1",
      glyph: "⚡",
    },
    damage: 6,
    onSelect: noop,
    pending: false,
  },
};

export const Pending: Story = {
  args: {
    attack: {
      id: "aster-vortex",
      name: "Drowned Vortex",
      kind: "vortex",
      color: "#312e81",
      glyph: "◉",
    },
    damage: 12,
    onSelect: noop,
    pending: true,
  },
};

export const Row: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      <AttackButton
        attack={{
          id: "1",
          name: "Lantern Spark",
          kind: "spark",
          color: "#f4e4c1",
          glyph: "⚡",
        }}
        damage={6}
        onSelect={noop}
        pending={false}
      />
      <AttackButton
        attack={{
          id: "2",
          name: "Tide Whisper",
          kind: "echo",
          color: "#86c8d9",
          glyph: "≈",
        }}
        damage={6}
        onSelect={noop}
        pending={false}
      />
      <AttackButton
        attack={{
          id: "3",
          name: "Brass Toll",
          kind: "wave",
          color: "#d4a045",
          glyph: "T",
        }}
        damage={6}
        onSelect={noop}
        pending={false}
      />
    </div>
  ),
};
