import type { Meta, StoryObj } from "@storybook/react-vite";

import { RoundIndicator } from "./index";

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
} satisfies Meta<typeof RoundIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

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
export const Round5Boss: Story = {
  args: { round: 5, levelIndex: 28, localLevel: 5, tierLevelCount: 5 },
};
export const Round6Start: Story = {
  args: { round: 6, levelIndex: 29, localLevel: 1, tierLevelCount: 5 },
};
export const Round6Boss: Story = {
  args: { round: 6, levelIndex: 33, localLevel: 5, tierLevelCount: 5 },
};
