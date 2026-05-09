import type { Meta, StoryObj } from "@storybook/react-vite";
import { Suspense } from "react";

import { AsyncGreeting } from ".";

const meta = {
  title: "Components/AsyncGreeting",
  component: AsyncGreeting,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <Suspense fallback={<span>loading…</span>}>
        <Story />
      </Suspense>
    ),
  ],
  parameters: { layout: "centered" },
} satisfies Meta<typeof AsyncGreeting>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
