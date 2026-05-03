import type { Meta, StoryObj } from "@storybook/react-vite";

import { DevMenu } from "~/components/dev-menu";

import { RoundJumpPanel } from "./index";

// The panel is meaningful only inside DevMenu (it consumes the close
// context). The story mounts it through DevMenu so it's visible the
// same way the kid sees it on /adding-game.
const meta = {
  title: "Components/RoundJumpPanel",
  component: RoundJumpPanel,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
        <DevMenu>
          <Story />
        </DevMenu>
      </div>
    ),
  ],
} satisfies Meta<typeof RoundJumpPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
