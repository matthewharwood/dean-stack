import type { Meta, StoryObj } from "@storybook/react-vite";

import { WaterCanvas } from ".";

const meta = {
  title: "Components/WaterCanvas",
  component: WaterCanvas,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    // Fixed-size frame so the canvas has a real width/height to fill
    // in isolation (Pixi's `resizeTo` reads the parent rect).
    (Story) => (
      <div style={{ width: 720, height: 360, borderRadius: 8, overflow: "hidden" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WaterCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
