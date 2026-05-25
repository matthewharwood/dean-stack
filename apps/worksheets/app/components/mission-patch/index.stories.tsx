import type { Meta, StoryObj } from "@storybook/react-vite";

import { MissionPatch } from "./index";

const meta = {
  title: "Worksheet/MissionPatch",
  component: MissionPatch,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MissionPatch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Stage1: Story = { args: { stageOrdinal: 1 } };
export const Stage5: Story = { args: { stageOrdinal: 5 } };
export const Stage12: Story = { args: { stageOrdinal: 12 } };
export const Stage15: Story = { args: { stageOrdinal: 15 } };

// All 15 — verify the patches collectively read as a coherent set.
export const AllFifteen: Story = {
  args: { stageOrdinal: 1 },
  render: () => (
    <div className="grid grid-cols-5 gap-6">
      {Array.from({ length: 15 }, (_, i) => i + 1).map((ordinal) => (
        <MissionPatch key={`p-${ordinal}`} stageOrdinal={ordinal} />
      ))}
    </div>
  ),
};
