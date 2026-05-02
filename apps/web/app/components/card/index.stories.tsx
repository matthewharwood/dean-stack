import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "./index";

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 96, height: 144 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Three: Story = { args: { value: 3 } };
export const Seven: Story = { args: { value: 7 } };
export const Ten: Story = { args: { value: 10 } };
