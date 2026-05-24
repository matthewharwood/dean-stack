import * as z from "zod";

// Stairs for the R16 "Echo the Chant" mechanic. Eleven steps labeled
// 0..10 (the multiplier index); the kid taps a step to commit a
// multiplier on the chant's beat. The currently-lit step is the one
// the chant is calling out — driven by the parent's audio clock, not
// by the component itself (the component stays a pure visual leaf).
//
// Pure presentation: no audio, no timer logic. Tap → onStepTap(index).
// Lit step → which one to highlight. Mastered steps → which steps
// already passed (filled-in vs hollow).
export const ChantStepRowPropsSchema = z.object({
  // Which multiplier index (0..10) is currently being chanted. The lit
  // step renders with the active highlight. `null` means no step is
  // currently lit (between beats, or initial idle state before
  // playback starts).
  litStep: z.int().min(0).max(10).nullable(),
  // Indexes (0..10) the kid has already successfully tapped on this
  // pass. Visual marker only — no semantic effect beyond rendering.
  // Defaulted to [] so simple stories don't have to thread it.
  masteredSteps: z.array(z.int().min(0).max(10)).default([]),
  // Tap handler. Fires once per tap with the step index 0..10. The
  // component DOES NOT debounce or disable taps on lit/mastered
  // steps — parent owns that policy (rhythm window, ignore-when-
  // already-mastered, etc.). This way the component stays a simple
  // visual leaf and the rhythm rules live in one place (ChantClock).
  onStepTap: z.custom<(index: number) => void>((v) => typeof v === "function"),
  // Disabled state grays out every step and drops onStepTap entirely.
  // Used between chant passes (e.g. while the win cinematic plays).
  disabled: z.boolean().optional(),
});
