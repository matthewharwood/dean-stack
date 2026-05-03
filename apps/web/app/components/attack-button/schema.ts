import { AttackSchema } from "@dean-stack/schemas";
import * as z from "zod";

// Single attack-choice button. Three of these replace the old "Attack"
// button on a winning evaluation — one per attack in the player's
// 3-tuple. The visible glyph + name come from the attack data; the
// color is used for the left-hand swatch.
export const AttackButtonPropsSchema = z.object({
  attack: AttackSchema,
  // Damage tally shown beside the name. Already computed by the round
  // outcome — passed through so the button is a pure presenter.
  damage: z.int().min(0),
  // Click handler. Receives the attack so the route doesn't need to
  // index into props.attack itself; the consumer chooses what to do
  // (typically: run the Pixi animation, then continue).
  onSelect: z.custom<(attack: z.infer<typeof AttackSchema>) => void>(
    (value) => typeof value === "function",
  ),
  // True while another attack is mid-animation. All three buttons in
  // the row disable together so the kid can't double-fire during the
  // 500ms window.
  pending: z.boolean().default(false),
});
export type AttackButtonProps = z.infer<typeof AttackButtonPropsSchema>;
