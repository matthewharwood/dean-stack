import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ChantStepRow } from ".";

const noop = (): void => undefined;

const meta = {
  title: "Components/ChantStepRow",
  component: ChantStepRow,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 220, padding: 8 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    litStep: null,
    masteredSteps: [],
    onStepTap: noop,
  },
} satisfies Meta<typeof ChantStepRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// Idle — no step lit, no steps mastered yet.
export const Idle: Story = { args: {} };

// One step lit. The chant is currently calling out "two sevens are 14"
// (or whatever the parent row is); step 2 glows sky-blue.
export const LitTwo: Story = { args: { litStep: 2 } };

// Three steps mastered, none currently lit. Mid-pass state where the
// kid has tapped 0/1/2 and is waiting for the next beat.
export const ThreeMastered: Story = {
  args: { masteredSteps: [0, 1, 2] },
};

// Lit step is one already mastered — re-encounter on a re-listen pass.
// Renders amber + star glyph as the "you nailed this one before AND
// it's now playing back" state.
export const LitAndMastered: Story = {
  args: { litStep: 5, masteredSteps: [0, 1, 2, 3, 4, 5] },
};

// Disabled — all steps grayed, no tap firing. Used between chant
// passes (win cinematic, modal, etc.).
export const Disabled: Story = {
  args: { litStep: 3, masteredSteps: [0, 1, 2], disabled: true },
};

// Interactive — own state, click a step → mark it mastered. The
// Playwright test exercises this story to confirm the tap handler
// fires + mastery updates without any audio.
export const Interactive: Story = {
  args: {},
  render: () => {
    function InteractiveRow() {
      const [mastered, setMastered] = useState<number[]>([]);
      return (
        <ChantStepRow
          litStep={null}
          masteredSteps={mastered}
          onStepTap={(i) => setMastered((prev) => (prev.includes(i) ? prev : [...prev, i]))}
        />
      );
    }
    return <InteractiveRow />;
  },
};
