import * as z from "zod";

export const HintTooltipPropsSchema = z.object({
  // 2–6 word punch line displayed huge and colored. The kid reads this
  // even if they don't read the body. Authored by the hint generator
  // for each template.
  emphasis: z.string().min(1),
  // Free-form hint body. Digit runs are inline-highlighted at render
  // time. Words wrapped in `*asterisks*` render italic.
  body: z.string().min(1),
  // The failed evaluation chip. When present, the tooltip shows the
  // kid's actual computed value next to the target inside the tooltip
  // so the failure detail lives WITH the explanation, not under the
  // Evaluate button. Null on win or before any evaluation.
  failedResult: z
    .object({
      computed: z.number(),
      expected: z.number(),
    })
    .nullable(),
  // Click handler — also fires on the implicit auto-dismiss timer in the
  // parent route. Component itself does not own the timer.
  onDismiss: z.custom<() => void>((v) => typeof v === "function"),
  // Optional finger-counting visual. When present, renders a HandCount
  // beneath the body so the kid can SEE the target as fingers instead
  // of (or alongside) reading text. The hint generator decides which
  // hints carry hands — typically count-fingers / number-bonds /
  // missing-number / boundary hints.
  hands: z
    .object({
      count: z.int().min(0).max(10),
      caption: z.string().nullable().default(null),
    })
    .nullable()
    .default(null),
});
