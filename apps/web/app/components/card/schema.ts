import * as z from "zod";

export const CardPropsSchema = z.object({
  // Numeric face value rendered in the center of the card. Integer; negatives
  // are allowed so future expansion (subtraction) doesn't need a schema bump.
  // Optional because R9 verdict cards have no numeric value — they're
  // boolean. When `verdict` is set, `value` is ignored.
  value: z.int().optional(),
  // R9 verdict card. When set, the card renders as a bold "True" / "False"
  // text card (green for true, red for false). Wins over `value` and
  // `display` when present.
  verdict: z.boolean().optional(),
  // "default" — the standard playable card (hand or operand placement).
  // "target" — the equation right-hand-side. Visually distinct (inset frame,
  //   muted palette) to read as immutable. The drag system never wraps a
  //   target card, so this is purely a visual cue, not a permission.
  // Optional so callers default to the standard variant; component body
  // resolves `undefined → "default"`. No `.default()` here because
  // `defineComponent` parse-then-pass means the production path skips the
  // parse and would receive raw `undefined`.
  variant: z.enum(["default", "target"]).optional(),
  // How the value is shown on the card face.
  //   "numeric"   — bold OpenRunde digit (R1–R4). The default.
  //   "ten-frame" — 2×5 grid of dots; first `value` cells filled. Forces
  //                 visual subitizing instead of numeral abstraction.
  //                 Used in R5–R8 to match the kid's ten-frame math
  //                 worksheets. Values >10 stack a second 2×5 frame
  //                 beneath the first (the standard double-ten-frame /
  //                 twenty-frame). Cap is 20 (clamped). Negative values
  //                 render as 0 dots (defensive — none of our levels
  //                 produce them today).
  display: z.enum(["numeric", "ten-frame"]).optional(),
  // Behavior, separate from `variant`. A disabled card cannot be a drop
  // target and tells the drag system to fire "invalid drop" feedback on
  // the dragged card (red ring) instead of the standard "no target"
  // silence. Today the equation right-hand-side is the only disabled card,
  // but future rounds may disable cards in other positions — that's why
  // disabled is a card property, not derived from slot kind.
  disabled: z.boolean().optional(),
});
