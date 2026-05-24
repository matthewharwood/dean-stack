import { type Variant, VariantSchema } from "~/worksheet/schema";

// Per-cell state for the 15 × 3 mission grid. Derived from the linear
// 45-sheet ordering used by pagination (sequence.ts): A → B → C within a
// stage, then bump to the next stage's A. A cell is "past" if its sheet
// index comes before today's, "current" if it matches, "future" otherwise.
export type CellState = "past" | "current" | "future";

export const VARIANTS_IN_ORDER: readonly Variant[] = VariantSchema.options;

export function cellState(
  cellStageOrdinal: number,
  cellVariant: Variant,
  currentStageOrdinal: number,
  currentVariant: Variant,
): CellState {
  const cellIdx = linearIndex(cellStageOrdinal, cellVariant);
  const currIdx = linearIndex(currentStageOrdinal, currentVariant);
  if (cellIdx < currIdx) return "past";
  if (cellIdx === currIdx) return "current";
  return "future";
}

function linearIndex(stageOrdinal: number, variant: Variant): number {
  return (stageOrdinal - 1) * VARIANTS_IN_ORDER.length + VARIANTS_IN_ORDER.indexOf(variant);
}
