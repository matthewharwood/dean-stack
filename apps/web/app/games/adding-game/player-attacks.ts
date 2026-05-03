import type { Attack } from "@dean-stack/schemas";

// Per-player attack kits. Each player has THREE attacks; on a winning
// evaluation the kid picks one. All three apply the same damage — the
// difference is purely the visual animation that plays. The map keys
// match `PlayerTemplate.id` so `players.ts` can inject the right tuple
// at parse time.
//
// Attack design notes:
//   - `kind` selects the Pixi animation primitive (slash / burst / beam /
//     rain / vortex / etc.). See attack-fx/runtime.ts for the kind table.
//   - `color` tints particles + lines. Per-player palettes echo each
//     pilot's lore (Mara → lantern-warm, Aster → drowned-star indigo).
//   - `glyph` is a 1–2 character symbol shown on the attack button next
//     to the name. Single emoji or unicode glyph.
//   - Names are placeholders the user will refine per-character; the
//     animations are the load-bearing part for the kid.
//
// The 3-tuple type is enforced by the PlayerTemplate schema, not here —
// the `as` cast tightens this lookup-table definition into the tuple shape
// that schema.parse expects.
export const ATTACKS_BY_PLAYER_ID: Record<string, readonly [Attack, Attack, Attack]> = {
  // ── Common ─────────────────────────────────────────────────────────
  "hadal-player-common-mara-brasswake": [
    { id: "mara-1", name: "Lantern Spark", kind: "spark", color: "#f4e4c1", glyph: "✨" },
    { id: "mara-2", name: "Tide Whisper", kind: "echo", color: "#86c8d9", glyph: "◌" },
    { id: "mara-3", name: "Brass Toll", kind: "wave", color: "#d4a045", glyph: "◯" },
  ],
  "hadal-player-common-oren-tideledger": [
    { id: "oren-1", name: "Ledger Strike", kind: "slash", color: "#1e293b", glyph: "✎" },
    { id: "oren-2", name: "Tally Mark", kind: "thrust", color: "#b87333", glyph: "✓" },
    { id: "oren-3", name: "Tide Column", kind: "rain", color: "#0f2459", glyph: "▌" },
  ],
  // ── Uncommon ───────────────────────────────────────────────────────
  "hadal-player-uncommon-sable-kett": [
    { id: "sable-1", name: "Bolt Flurry", kind: "burst", color: "#b87333", glyph: "✦" },
    { id: "sable-2", name: "Wrench Spin", kind: "vortex", color: "#94a3b8", glyph: "⌬" },
    { id: "sable-3", name: "Steam Lance", kind: "beam", color: "#dc2626", glyph: "⟶" },
  ],
  "hadal-player-uncommon-pella-copperkeel": [
    { id: "pella-1", name: "Copper Cleave", kind: "slash", color: "#b87333", glyph: "⚔" },
    { id: "pella-2", name: "Kettle Wave", kind: "wave", color: "#4ca5c7", glyph: "◯" },
    { id: "pella-3", name: "Galley Burst", kind: "burst", color: "#e8a657", glyph: "✦" },
  ],
  // ── Rare ───────────────────────────────────────────────────────────
  "hadal-player-rare-ivo-bellcurrent": [
    { id: "ivo-1", name: "Bell Toll", kind: "echo", color: "#e8d090", glyph: "🔔" },
    { id: "ivo-2", name: "Current Beam", kind: "beam", color: "#67e8f9", glyph: "⟿" },
    { id: "ivo-3", name: "Sonic Shatter", kind: "shatter", color: "#cbd5e1", glyph: "✺" },
  ],
  "hadal-player-rare-nemi-valeglass": [
    { id: "nemi-1", name: "Glass Slash", kind: "slash", color: "#a7f3d0", glyph: "❖" },
    { id: "nemi-2", name: "Vale Vortex", kind: "vortex", color: "#5eead4", glyph: "❀" },
    { id: "nemi-3", name: "Crystal Rain", kind: "rain", color: "#c4b5fd", glyph: "❅" },
  ],
  // ── Epic ───────────────────────────────────────────────────────────
  "hadal-player-epic-luma-pearlspoke": [
    { id: "luma-1", name: "Pearl Beam", kind: "beam", color: "#f5f5f4", glyph: "⟿" },
    { id: "luma-2", name: "Spoke Burst", kind: "burst", color: "#e7e5e4", glyph: "✺" },
    { id: "luma-3", name: "Halo Echo", kind: "echo", color: "#fef3c7", glyph: "◌" },
  ],
  "hadal-player-epic-thane-oxbell": [
    { id: "thane-1", name: "Ox Charge", kind: "thrust", color: "#7c2d12", glyph: "⚔" },
    { id: "thane-2", name: "Watch Bell", kind: "wave", color: "#b87333", glyph: "🔔" },
    { id: "thane-3", name: "Iron Shatter", kind: "shatter", color: "#52525b", glyph: "✺" },
  ],
  // ── Mythic ─────────────────────────────────────────────────────────
  "hadal-player-mythical-aster-drownedstar": [
    { id: "aster-1", name: "Star Spark", kind: "spark", color: "#f0f9ff", glyph: "✦" },
    { id: "aster-2", name: "Astral Beam", kind: "beam", color: "#7c3aed", glyph: "⟿" },
    { id: "aster-3", name: "Drowned Vortex", kind: "vortex", color: "#312e81", glyph: "✺" },
  ],
  "hadal-player-mythical-lantern-bride-bathypel": [
    { id: "bathypel-1", name: "Veil Slash", kind: "slash", color: "#f4e4c1", glyph: "✦" },
    { id: "bathypel-2", name: "Wedding Toll", kind: "echo", color: "#fefce8", glyph: "◌" },
    { id: "bathypel-3", name: "Bridal Storm", kind: "rain", color: "#fbcfe8", glyph: "❅" },
  ],
};
