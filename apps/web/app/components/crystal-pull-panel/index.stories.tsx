import type { CrystalId } from "@dean-stack/schemas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { CrystalPullPanel } from ".";

const noop = (_: CrystalId): void => undefined;

const meta = {
  title: "Components/CrystalPullPanel",
  component: CrystalPullPanel,
  parameters: { layout: "fullscreen" },
  args: {
    options: ["marine-snow", "phosphor-numerals", "gentle-tide"] as [
      CrystalId,
      CrystalId,
      CrystalId,
    ],
    onSelect: noop,
  },
} satisfies Meta<typeof CrystalPullPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default triple — one Tide Sigil, one Card Charm, one Math Tool.
// Mirrors the R1 cadence so the story is what the kid sees on their
// FIRST pull.
export const FirstPull: Story = {};

// Mid-campaign triple — Crew Bond, Math Tool, Echo Magic. Mirrors the
// R9 cadence so the story shows the more advanced visual variety.
export const MidCampaign: Story = {
  args: {
    options: ["sables-edge", "echo-listener", "lucky-strike"] as [CrystalId, CrystalId, CrystalId],
  },
};

// Interactive — wires a visible "picked: <id>" indicator the Playwright
// test can assert on without a parent route. The panel onSelect fires
// AFTER the reveal hold, so the indicator only ticks once the full
// ceremony completes.
export const Interactive: Story = {
  render: (args) => {
    function InteractivePanel(): React.ReactNode {
      const [picked, setPicked] = useState<CrystalId | null>(null);
      if (picked) {
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 font-openrunde text-white"
            data-test="crystal-pick-result"
          >
            picked: {picked}
          </div>
        );
      }
      return <CrystalPullPanel options={args.options} onSelect={setPicked} />;
    }
    return <InteractivePanel />;
  },
};
