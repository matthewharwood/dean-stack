import { type Variant, VariantSchema } from "./schema";
import { STAGES } from "./stages";

const VARIANTS = VariantSchema.options;
const VARIANTS_LEN = VARIANTS.length;

// Linear ordering across all worksheets: stage1/A → stage1/B → stage1/C →
// stage2/A → … → stage15/C, then wraps. 15 stages × 3 variants = 45 sheets.
// Used by PrintControls to render cyclical prev/next pagination and the
// "k of 45" position pill.
export const SHEET_TOTAL = STAGES.length * VARIANTS_LEN;

export type SheetCoord = {
  stageId: string;
  variant: Variant;
};

// 0-based index in the 45-sheet sequence. Used to derive the position pill.
export function sheetIndex(stageId: string, variant: Variant): number {
  const stagePos = STAGES.findIndex((s) => s.id === stageId);
  if (stagePos === -1) return 0;
  return stagePos * VARIANTS_LEN + VARIANTS.indexOf(variant);
}

function variantAt(i: number): Variant {
  const v = VARIANTS[i];
  if (!v) throw new Error(`variantAt: out-of-range index ${i}`);
  return v;
}

// Wrap-around index resolution. Negative indices wrap to the end; indices
// past the end wrap to the start. The double-modulo handles negatives in JS
// (where `-1 % 45 === -1`, not `44`).
export function fromIndex(i: number): SheetCoord {
  const wrapped = ((i % SHEET_TOTAL) + SHEET_TOTAL) % SHEET_TOTAL;
  const stage = STAGES[Math.floor(wrapped / VARIANTS_LEN)];
  if (!stage) throw new Error(`fromIndex: missing stage at index ${wrapped}`);
  return { stageId: stage.id, variant: variantAt(wrapped % VARIANTS_LEN) };
}

export function nextSheet(stageId: string, variant: Variant): SheetCoord {
  return fromIndex(sheetIndex(stageId, variant) + 1);
}

export function prevSheet(stageId: string, variant: Variant): SheetCoord {
  return fromIndex(sheetIndex(stageId, variant) - 1);
}
