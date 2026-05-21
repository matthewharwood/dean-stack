import type { CrystalId } from "@dean-stack/schemas";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { CrystalEffectsLayer } from ".";

const meta = {
  title: "Components/CrystalEffectsLayer",
  component: CrystalEffectsLayer,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          background: "radial-gradient(circle at 30% 30%, #0d2540, #050e1f 70%)",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CrystalEffectsLayer>;

export default meta;
type Story = StoryObj<typeof meta>;

// No crystals owned — the layer should render null (no effects visible).
export const Empty: Story = {
  args: { ownedCrystals: [] as CrystalId[] },
};

// Marine Snow alone — drifting particle field.
export const MarineSnowOnly: Story = {
  args: { ownedCrystals: ["marine-snow"] as CrystalId[] },
};

// Caustic Light alone — radial gradient pulse.
export const CausticLightOnly: Story = {
  args: { ownedCrystals: ["caustic-light"] as CrystalId[] },
};

// Both ambient sigils together — snow drifting through pulsing light.
export const SnowAndCaustic: Story = {
  args: { ownedCrystals: ["marine-snow", "caustic-light"] as CrystalId[] },
};
