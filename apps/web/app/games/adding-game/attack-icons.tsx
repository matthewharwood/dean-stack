import type { AttackKind } from "@dean-stack/schemas";
import {
  AudioLines,
  CloudRain,
  type LucideIcon,
  Sparkle,
  Sparkles,
  Swords,
  Target,
  Tornado,
  Triangle,
  Waves,
  Zap,
} from "lucide-react";

// Single source of truth mapping the attack `kind` enum to a Lucide icon.
// The schema's `attack.glyph` is intentionally NOT consulted by the UI
// anymore — it's frozen legacy data on the records. New attacks just need
// a kind that already lives here.
//
// Lucide was picked over emoji-glyphs because the iPad text rendering of
// the old glyphs was inconsistent (some pilots got system emoji, others
// fell back to the display font's missing-glyph box) and the buttons were
// truncating tight names like "Drowned Vortex". Vector icons are uniform
// at any scale, draw with `currentColor`, and never block on a font load.
export const ATTACK_ICON: Record<AttackKind, LucideIcon> = {
  slash: Swords,
  thrust: Target,
  burst: Sparkles,
  beam: Zap,
  rain: CloudRain,
  vortex: Tornado,
  wave: Waves,
  shatter: Triangle,
  spark: Sparkle,
  echo: AudioLines,
};
