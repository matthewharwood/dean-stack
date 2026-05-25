import type { Meta, StoryObj } from "@storybook/react-vite";

import { PowerTally } from "./index";

const meta = {
  title: "Worksheet/PowerTally",
  component: PowerTally,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PowerTally>;

export default meta;

type Story = StoryObj<typeof meta>;

// Sheet 1 of 45 — only s1/A is the current cell, everything else is future.
export const StartOfJourney: Story = {
  args: { currentOrdinal: 1, currentVariant: "A", totalStages: 15 },
};

// Mid-journey at s5/B — stages 1-4 fully slashed, s5/A slashed, s5/B is
// the heavy current ring, s5/C and stages 6-15 are hollow futures.
export const MidJourneyVariantB: Story = {
  args: { currentOrdinal: 5, currentVariant: "B", totalStages: 15 },
};

// Mid-journey at s8/C — every cell in s1-s7 plus s8/A and s8/B is slashed;
// s8/C is current. Useful for confirming the slash crosses all three shapes
// cleanly (circle, square, triangle).
export const MidJourneyVariantC: Story = {
  args: { currentOrdinal: 8, currentVariant: "C", totalStages: 15 },
};

// Final sheet — everything but s15/C is slashed. Visual closure for the
// macro-arc.
export const FinalSheet: Story = {
  args: { currentOrdinal: 15, currentVariant: "C", totalStages: 15 },
};
