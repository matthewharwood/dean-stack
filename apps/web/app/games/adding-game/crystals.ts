// Echo-Crystal registry — metadata for the 18 crystals the kid collects
// across the campaign. Schema (CrystalId, CrystalCategory, PendingPull) lives
// in packages/schemas/src/adding-game.ts; this module owns the in-app
// presentation + the pull-pool selector.
//
// The pull cadence is six pulls across the campaign:
//   after R1, R3, R5, R7, R9, R11 → 1 crystal kept each → 6 of 18.
// Each pull offers three crystals from THREE DIFFERENT categories so the
// kid never sees a homogenous slate. Across replays the shuffle inside
// each category varies, so a second run reveals different choices.

import type { CrystalCategory, CrystalId, PullTriggerRound } from "@dean-stack/schemas";

export interface CrystalDef {
  id: CrystalId;
  name: string;
  category: CrystalCategory;
  // Short one-line copy shown on the reveal card. Reads as the kid's
  // first introduction to the effect — keep it kid-grade.
  description: string;
  // Signature colour from the oceanic palette. Drives the card border /
  // halo / icon tint on reveal. Each crystal gets its own so the kid
  // learns "the blue one with the swirl is Marine Snow" by face.
  color: string;
  // Semantic icon key retained with the registry metadata. The actual
  // custom artwork renders by crystal id from crystal-icons.tsx.
  icon: CrystalIcon;
}

// Stable semantic icon keys for the crystal metadata. The names started as
// Lucide placeholders, but now double as compact effect descriptors.
export type CrystalIcon =
  | "sparkles"
  | "droplet"
  | "sun"
  | "snowflake"
  | "lightbulb"
  | "feather"
  | "shell"
  | "wind"
  | "compass"
  | "scroll-text"
  | "swords"
  | "shield"
  | "bell"
  | "hand"
  | "ear"
  | "waves"
  | "zap"
  | "heart";

export const CRYSTAL_REGISTRY: Record<CrystalId, CrystalDef> = {
  // ── Tide Sigils — ambient cosmetic on the water canvas + page bg ───────
  "bioluminescent-trail": {
    id: "bioluminescent-trail",
    name: "Bioluminescent Trail",
    category: "tide-sigil",
    description: "Your hand remembers the old light. It follows where you reach.",
    color: "#7FE3FF",
    icon: "sparkles",
  },
  "bubble-burst": {
    id: "bubble-burst",
    name: "Bubble Burst",
    category: "tide-sigil",
    description: "The trench bubbles when you count right, like it's whispering thanks.",
    color: "#9FD8F6",
    icon: "droplet",
  },
  "caustic-light": {
    id: "caustic-light",
    name: "Caustic Light",
    category: "tide-sigil",
    description: "Sunlight remembers its way down. The deep grows a little brighter.",
    color: "#FFE9A8",
    icon: "sun",
  },
  "marine-snow": {
    id: "marine-snow",
    name: "Marine Snow",
    category: "tide-sigil",
    description: "Old snow keeps falling here. Each flake is a number the sea forgot.",
    color: "#E7F6FF",
    icon: "snowflake",
  },

  // ── Card Charms — per-card visual flourishes ───────────────────────────
  "phosphor-numerals": {
    id: "phosphor-numerals",
    name: "Phosphor Numerals",
    category: "card-charm",
    description: "The numbers remember they were once light. They glow a little now.",
    color: "#B8F0E0",
    icon: "lightbulb",
  },
  "soft-hover": {
    id: "soft-hover",
    name: "Soft Hover",
    category: "card-charm",
    description: "The cards know your hand. They lift to meet it.",
    color: "#C4E7FF",
    icon: "feather",
  },
  "edge-coral": {
    id: "edge-coral",
    name: "Edge Coral",
    category: "card-charm",
    description: "Coral grows on the cards, as if they've been here a long time.",
    color: "#FFB7A2",
    icon: "shell",
  },
  "whisper-scale": {
    id: "whisper-scale",
    name: "Whisper Scale",
    category: "card-charm",
    description: "The cards breathe with you, slow and patient.",
    color: "#D5C9FF",
    icon: "wind",
  },

  // ── Crew Bonds — pilot-specific buffs ──────────────────────────────────
  "maras-compass": {
    id: "maras-compass",
    name: "Mara's Compass",
    category: "crew-bond",
    description: "Mara's compass points true again. Her first strike rings louder.",
    color: "#FFD27A",
    icon: "compass",
  },
  "orens-ledger": {
    id: "orens-ledger",
    name: "Oren's Ledger",
    category: "crew-bond",
    description: "Oren keeps a quiet ledger. After three slips, he helps you find the answer.",
    color: "#E2B58F",
    icon: "scroll-text",
  },
  "sables-edge": {
    id: "sables-edge",
    name: "Sable's Edge",
    category: "crew-bond",
    description: "Sable's blade remembers a song. Every third swing sings a little.",
    color: "#A8B6C7",
    icon: "swords",
  },
  "pellas-keel": {
    id: "pellas-keel",
    name: "Pella's Keel",
    category: "crew-bond",
    description: "Pella's hull holds steady. It carries a little more this round.",
    color: "#C9A678",
    icon: "shield",
  },
  "ivos-bell": {
    id: "ivos-bell",
    name: "Ivo's Bell",
    category: "crew-bond",
    description: "Ivo's bell wakes up. Each strike rings clear through the deep.",
    color: "#E3C266",
    icon: "bell",
  },

  // ── Math Tools — quiet helpers ─────────────────────────────────────────
  "counting-pearls": {
    id: "counting-pearls",
    name: "Counting Pearls",
    category: "math-tool",
    description: "The counting hints turn to pearls. Easier to follow, easier to hold.",
    color: "#F5E6C8",
    icon: "hand",
  },
  "echo-listener": {
    id: "echo-listener",
    name: "Echo Listener",
    category: "math-tool",
    description: "You hear the echo of a wrong answer. It tells you how close you came.",
    color: "#B5D6E8",
    icon: "ear",
  },
  "gentle-tide": {
    id: "gentle-tide",
    name: "Gentle Tide",
    category: "math-tool",
    description: "A gentle tide brings help sooner when you need it.",
    color: "#B6E0D6",
    icon: "waves",
  },

  // ── Echo Magic — gameplay surprises ────────────────────────────────────
  "lucky-strike": {
    id: "lucky-strike",
    name: "Lucky Strike",
    category: "echo-magic",
    description: "Every fifth right answer, the deep remembers a stronger word. It strikes twice.",
    color: "#FFE36C",
    icon: "zap",
  },
  "tide-pool": {
    id: "tide-pool",
    name: "Tide Pool",
    category: "echo-magic",
    description:
      "When an echo remembers, it leaves a shining pool — a small thank-you from the trench.",
    color: "#A0E0D8",
    icon: "heart",
  },
};

export const ALL_CRYSTAL_IDS: readonly CrystalId[] = Object.keys(CRYSTAL_REGISTRY) as CrystalId[];

// The SFX-registry id under which each crystal's "Counting Was Lost"
// narration MP3 lives. Kept in lockstep with the `pronounce-crystal-*`
// entries in apps/web/app/sound/registry.ts; this helper centralises
// the convention so the panel + collection bar + future codex page
// derive the id rather than concatenating strings inline.
export function crystalNarrationSoundId(id: CrystalId): `pronounce-crystal-${CrystalId}` {
  return `pronounce-crystal-${id}` as const;
}

// ───── Pull cadence — which categories surface at each milestone ─────────
// The schema's PULL_TRIGGER_ROUNDS is `[1, 3, 5, 7, 9, 11]`. Each entry
// here mirrors that array and names the three category SLOTS for that
// pull. The selector below fills each slot with one unowned crystal from
// the named category. If a category has no unowned options at the time of
// the pull, the slot widens to any unowned crystal — keeps replay clean
// when the kid has nearly completed a category.
//
// Slot order MATTERS for first-pull tutorial reasons: the kid's eye
// reads left-to-right, and the most visually-striking option goes left
// in the early pulls (Tide Sigil) so the kid grasps "oh, picking changes
// the world" instantly.

interface PullSlots {
  readonly after: PullTriggerRound;
  readonly slots: readonly [CrystalCategory, CrystalCategory, CrystalCategory];
}

export const PULL_CADENCE: readonly PullSlots[] = [
  // After R1 — tutorial pull, no Crew Bonds yet (kid hasn't met enough pilots
  // for the crew bond UX to land). Three quick-payoff categories.
  { after: 1, slots: ["tide-sigil", "card-charm", "math-tool"] },
  // After R3 — first Crew Bond chance, still anchored by a Tide Sigil.
  { after: 3, slots: ["tide-sigil", "card-charm", "crew-bond"] },
  // After R5 — entering find-missing-result; helpers + a pilot bond.
  { after: 5, slots: ["crew-bond", "card-charm", "math-tool"] },
  // After R7 — mid-stepper prep, Tide Sigil returns for vibe.
  { after: 7, slots: ["tide-sigil", "crew-bond", "math-tool"] },
  // After R9 — stepper rhythm established, Echo Magic introduced.
  { after: 9, slots: ["crew-bond", "math-tool", "echo-magic"] },
  // After R11 — final pull before multiplication, vibe-heavy send-off.
  { after: 11, slots: ["tide-sigil", "echo-magic", "card-charm"] },
];

// noUncheckedIndexedAccess makes every array read `T | undefined`. We assert
// non-emptiness BEFORE calling pickRandom so this throw is structurally
// unreachable; it exists to satisfy the type system without scattering `!`
// non-null assertions across the selector.
function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  const item = arr[Math.floor(rng() * arr.length)];
  if (item === undefined) throw new Error("pickRandom called on empty array");
  return item;
}

// Build the three-option pool for the pull that fires after `triggeredAfterRound`.
// `ownedIds` is the kid's current collection (used to skip duplicates).
// Pure function: returns a freshly-shuffled triple. The route persists this
// to state.pendingPull so a mid-pull reload restores the same triple.
export function buildPullOptions(
  triggeredAfterRound: PullTriggerRound,
  ownedIds: readonly CrystalId[],
  rng: () => number = Math.random,
): [CrystalId, CrystalId, CrystalId] {
  const cadence = PULL_CADENCE.find((p) => p.after === triggeredAfterRound);
  const picked: CrystalId[] = [];
  const usedIds = new Set<CrystalId>(ownedIds);

  if (cadence) {
    for (const category of cadence.slots) {
      const candidates = ALL_CRYSTAL_IDS.filter(
        (id) => CRYSTAL_REGISTRY[id].category === category && !usedIds.has(id),
      );
      const widened = ALL_CRYSTAL_IDS.filter((id) => !usedIds.has(id));
      const pool = candidates.length > 0 ? candidates : widened;
      if (pool.length === 0) break; // collection complete
      const pick = pickRandom(pool, rng);
      picked.push(pick);
      usedIds.add(pick);
    }
  }

  // Top up if the structured pass ran out (a future cadence-map edit or
  // a kid on their final crystal). Falls back to "any unowned" then to
  // "wrap around" so the panel always gets exactly three ids.
  while (picked.length < 3) {
    const widened = ALL_CRYSTAL_IDS.filter((id) => !usedIds.has(id));
    if (widened.length > 0) {
      const pick = pickRandom(widened, rng);
      picked.push(pick);
      usedIds.add(pick);
    } else {
      picked.push(pickRandom(ALL_CRYSTAL_IDS, rng));
    }
  }
  return [picked[0], picked[1], picked[2]] as [CrystalId, CrystalId, CrystalId];
}
