import type { Meta, StoryObj } from "@storybook/react-vite";

import { HandCount } from "./index";

const meta = {
  title: "Components/HandCount",
  component: HandCount,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ padding: 24, background: "#fef3c7", borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HandCount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Zero: Story = { args: { count: 0, caption: "Make 0" } };
export const One: Story = { args: { count: 1, caption: "Make 1" } };
export const Two: Story = { args: { count: 2, caption: "Make 2" } };
export const Three: Story = { args: { count: 3, caption: "Make 3" } };
export const Four: Story = { args: { count: 4, caption: "Make 4" } };
export const Five: Story = { args: { count: 5, caption: "Make 5" } };
export const Six: Story = { args: { count: 6, caption: "Make 6" } };
export const Seven: Story = { args: { count: 7, caption: "Make 7" } };
export const Eight: Story = { args: { count: 8, caption: "Make 8" } };
export const Nine: Story = { args: { count: 9, caption: "Make 9" } };
export const Ten: Story = { args: { count: 10, caption: "Make 10" } };

export const NoCaption: Story = { args: { count: 7, caption: null } };
