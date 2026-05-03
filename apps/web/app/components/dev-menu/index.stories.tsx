import type { Meta, StoryObj } from "@storybook/react-vite";

import { DevMenu } from "./index";

const meta = {
  title: "Components/DevMenu",
  component: DevMenu,
  tags: ["autodocs"],
  parameters: {
    // Fixed-position element — give it a viewport-sized canvas so the
    // top-right anchoring is visible in the story, not floating off-frame.
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DevMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
