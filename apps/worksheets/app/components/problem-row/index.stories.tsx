import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProblemRow } from "./index";

const meta = {
  title: "Worksheet/ProblemRow",
  component: ProblemRow,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProblemRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FillPairAdd: Story = {
  args: {
    position: 1,
    problem: {
      kind: "fill-pair",
      id: "p1",
      index: 0,
      operator: "add",
      comparator: "eq",
      target: 7,
      answer: { a: 3, b: 4 },
    },
  },
};

export const FillPairSubtractGreaterThan: Story = {
  args: {
    position: 5,
    problem: {
      kind: "fill-pair",
      id: "p5",
      index: 4,
      operator: "subtract",
      comparator: "gt",
      target: 6,
      answer: { a: 9, b: 1 },
    },
  },
};

export const FillConsistentPairAdd: Story = {
  args: {
    position: 1,
    problem: {
      kind: "fill-consistent-pair",
      id: "p1",
      index: 0,
      operator: "add",
      locked: { position: "a", value: 3 },
      answer: { otherOperand: 4, result: 7 },
    },
  },
};

export const FillBlankMissingAddend: Story = {
  args: {
    position: 3,
    problem: {
      kind: "fill-blank",
      id: "p3",
      index: 2,
      operator: "add",
      a: 5,
      b: 3,
      c: 8,
      blank: "b",
      answer: 3,
    },
  },
};

export const FillBlankMultiplyProduct: Story = {
  args: {
    position: 1,
    problem: {
      kind: "fill-blank",
      id: "p1",
      index: 0,
      operator: "multiply",
      a: 3,
      b: 4,
      c: 12,
      blank: "c",
      answer: 12,
    },
  },
};

export const TrueFalse: Story = {
  args: {
    position: 1,
    problem: {
      kind: "true-false",
      id: "p1",
      index: 0,
      operator: "multiply",
      a: 3,
      b: 2,
      claimedResult: 6,
      actualResult: 6,
      answer: true,
    },
  },
};
