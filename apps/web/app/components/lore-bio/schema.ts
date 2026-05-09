import * as z from "zod";

// Lore bio body for the flip-back side of avatar cards (enemy + player).
// The bio is a small markdown-ish format:
//
//   ## Heading
//
//   Paragraph text.
//
//   ## Another heading
//
//   Another paragraph.
//
// Lines beginning with `## ` start a new section heading; blank lines
// separate paragraphs. Anything else is body prose. Authors keep paragraphs
// short — the avatar window is small.
export const LoreBioPropsSchema = z.object({
  bio: z.string().min(1),
});
