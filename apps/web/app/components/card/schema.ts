import * as z from "zod";

export const CardPropsSchema = z.object({
  // Numeric face value rendered in the center of the card. Integer; negatives
  // are allowed so future expansion (subtraction) doesn't need a schema bump.
  value: z.int(),
  // "default" — the standard playable card (hand or operand placement).
  // "target" — the equation right-hand-side. Visually distinct (inset frame,
  //   muted palette) to read as immutable. The drag system never wraps a
  //   target card, so this is purely a visual cue, not a permission.
  // Optional so callers default to the standard variant; component body
  // resolves `undefined → "default"`. No `.default()` here because
  // `defineComponent` parse-then-pass means the production path skips the
  // parse and would receive raw `undefined`.
  variant: z.enum(["default", "target"]).optional(),
  // Behavior, separate from `variant`. A disabled card cannot be a drop
  // target and tells the drag system to fire "invalid drop" feedback on
  // the dragged card (red ring) instead of the standard "no target"
  // silence. Today the equation right-hand-side is the only disabled card,
  // but future rounds may disable cards in other positions — that's why
  // disabled is a card property, not derived from slot kind.
  disabled: z.boolean().optional(),
});
export type CardProps = z.infer<typeof CardPropsSchema>;
