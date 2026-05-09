import type { Meta, StoryObj } from "@storybook/react-vite";

import { HealthCard } from ".";

const meta = {
  title: "Components/HealthCard",
  component: HealthCard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof HealthCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
