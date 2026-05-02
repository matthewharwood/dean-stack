import * as z from "zod";

export const CardPropsSchema = z.object({
  // Numeric face value rendered in the center of the card. Integer; negatives
  // are allowed so future expansion (subtraction) doesn't need a schema bump.
  value: z.int(),
});
export type CardProps = z.infer<typeof CardPropsSchema>;
