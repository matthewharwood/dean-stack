import * as z from "zod";

export const PronounceButtonPropsSchema = z.object({
  // SFX registry id for the name pronunciation MP3. Optional because
  // templates may ship without a pronunciation (the button renders
  // nothing in that case — no broken UI, no fallback noise).
  nameSoundId: z.string().min(1).optional(),
  // Human-readable label used in the aria-label / title. Typically the
  // character's name ("Mara Brasswake"). Required so the button's
  // accessibility text is meaningful — never reuses the technical
  // nameSoundId.
  label: z.string().min(1),
  // Size variant. "sm" matches the avatar name-row sizing (14px icon);
  // "md" is reserved for future story / settings surfaces.
  size: z.enum(["sm", "md"]).optional(),
});
