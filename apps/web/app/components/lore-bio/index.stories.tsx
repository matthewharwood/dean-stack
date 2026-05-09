import type { Meta, StoryObj } from "@storybook/react-vite";

import { LoreBio } from ".";

const meta = {
  title: "Components/LoreBio",
  component: LoreBio,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div
        // eslint-disable-next-line react-doctor/no-inline-exhaustive-style -- Storybook decorator: convention is a self-contained inline style on a one-off wrapper; not a runtime component.
        style={{
          width: 280,
          maxHeight: 380,
          overflowY: "auto",
          padding: "12px 16px",
          background: "var(--color-stone-100, #f5f5f4)",
          color: "#1c1917",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
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
