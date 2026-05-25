import type { Meta, StoryObj } from "@storybook/react-vite";

import { PROBLEM_ICONS } from "~/worksheet/icons";

import { ProblemMarker } from "./index";

const meta = {
  title: "Worksheet/ProblemMarker",
  component: ProblemMarker,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProblemMarker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const First: Story = { args: { position: 1 } };
export const Middle: Story = { args: { position: 8 } };
export const Last: Story = { args: { position: 15 } };

// Renders every marker in sequence so a designer can scan the full alphabet
// at print resolution (the load-bearing risk Calvin flagged: do all 15 read
// distinctly at 22px / 1.75 stroke in pure black ink?).
export const AllFifteen: Story = {
  args: { position: 1 },
  render: () => (
    <ol className="flex flex-col gap-2 font-equation text-2xl">
      {PROBLEM_ICONS.map((icon, i) => (
        <li key={`mk-${icon.label}`} className="flex items-center gap-3">
          <ProblemMarker position={i + 1} />
          <span className="text-base font-body opacity-60">
            position {i + 1} · {icon.label}
          </span>
        </li>
      ))}
    </ol>
  ),
};
