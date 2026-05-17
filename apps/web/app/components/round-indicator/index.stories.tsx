import type { Meta, StoryObj } from "@storybook/react-vite";

import { RoundIndicator } from ".";

// Matches FINAL_LEVEL_INDEX in apps/web/app/games/adding-game/levels.ts.
// The stories hardcode it so the indicator can be exercised in isolation
// without pulling in the levels module — Pillar 1 keeps stories
// dependency-light.
const TOTAL_LEVELS = 63;

const meta = {
  title: "Components/RoundIndicator",
  component: RoundIndicator,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 720, height: 200, background: "#e5e5e5", borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
  args: { totalLevels: TOTAL_LEVELS },
} satisfies Meta<typeof RoundIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

// Snapshot stories — one per round milestone. Each shows the segmented
// progress strip filled to the appropriate level with the round badge
// centered. Animation runs in the browser; story tests only assert
// data attributes.
export const Round1Start: Story = {
  args: { round: 1, levelIndex: 1, localLevel: 1, tierLevelCount: 6 },
};
export const Round1Mid: Story = {
  args: { round: 1, levelIndex: 3, localLevel: 3, tierLevelCount: 6 },
};
export const Round1Boss: Story = {
  args: { round: 1, levelIndex: 6, localLevel: 6, tierLevelCount: 6 },
};
export const Round2Start: Story = {
  args: { round: 2, levelIndex: 7, localLevel: 1, tierLevelCount: 6 },
};
export const Round3Mid: Story = {
  args: { round: 3, levelIndex: 15, localLevel: 3, tierLevelCount: 6 },
};
export const Round4Boss: Story = {
  args: { round: 4, levelIndex: 23, localLevel: 5, tierLevelCount: 5 },
};
export const Round5Start: Story = {
  args: { round: 5, levelIndex: 24, localLevel: 1, tierLevelCount: 5 },
};
export const Round6Boss: Story = {
  args: { round: 6, levelIndex: 33, localLevel: 5, tierLevelCount: 5 },
};
export const Round9StepperStart: Story = {
  args: { round: 9, levelIndex: 44, localLevel: 1, tierLevelCount: 5 },
};
export const Round12Final: Story = {
  args: { round: 12, levelIndex: 63, localLevel: 5, tierLevelCount: 5 },
};
