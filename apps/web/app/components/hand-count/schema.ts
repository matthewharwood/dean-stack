import * as z from "zod";

// Visual finger-count for the hint tooltip. The kid sees an actual
// drawing of hands with the right number of fingers extended so they
// can count them instead of (or alongside) reading text.
//
// `count` is the TOTAL fingers extended across two hands (0–10). The
// composite component splits the count: first hand fills up to 5, then
// the second hand starts. That mirrors how kids naturally count on
// their own fingers — fill one hand, then move to the next.
export const HandCountPropsSchema = z.object({
  count: z.int().min(0).max(10),
  // Optional caption shown beneath the hands. Null hides it; nullable +
  // default keeps the schema stable for the tooltip wiring (which sets
  // the caption from a hint template).
  caption: z.string().nullable().default(null),
});
