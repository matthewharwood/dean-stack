import type { Attack } from "@dean-stack/schemas";

import { isRegistered, type SfxEventId } from "./registry";

// Resolve an Attack to the SfxEventId that should fire when it's used.
// Tries the per-character key (Attack.id like "mara-1") first; if that
// isn't in the registry, falls back to the kind base ("combat-spark").
// Returns null when neither is registered — caller stays silent.
//
// Pure resolver — kept separate from the player so it's trivially testable
// without touching Web Audio.
export function resolveAttackSfxId(attack: Attack): SfxEventId | null {
  if (isRegistered(attack.id)) return attack.id;
  const kindKey = `combat-${attack.kind}`;
  if (isRegistered(kindKey)) return kindKey;
  return null;
}
