import type { Meta, StoryObj } from "@storybook/react-vite";

import { LoreBio } from ".";

const meta = {
  title: "Components/LoreBio",
  component: LoreBio,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[280px] max-h-[380px] overflow-y-auto px-4 py-3 bg-stone-100 text-[#1c1917] [font-family:Georgia,'Times_New_Roman',serif] text-[13px] leading-[1.55]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LoreBio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sectioned: Story = {
  args: {
    bio: `## Was

A small bristled coin of an animal, salt-stiff and prickly. The needle urchin grew its spines to keep something out, and it cannot now remember what.

## Is

It guards a circle of seafloor about as wide as a dinner plate. Inside the circle: nothing. Outside the circle: also nothing. But the circle is the urchin's, and it knows the difference even if you don't.

## To Settle It

Bring an answer small enough to fit inside the circle. If you bring something too big, the spines lift, politely, and ask you to try again.`,
  },
};

export const PlainParagraphs: Story = {
  args: {
    bio: `Once it swam in shallow water where the sun came down in pieces. It still remembers the warm parts, sort of.

Now it drifts in a slow circle the size of your hand, looking for the count it used to keep.

It is the first echo most pilots meet, and the easiest to settle.`,
  },
};

export const Single: Story = {
  args: {
    bio: "A single short paragraph. Just to verify drop-cap rendering on the very first letter.",
  },
};
