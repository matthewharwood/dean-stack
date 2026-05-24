import {
  Bird,
  Cat,
  Cloud,
  Fish,
  Flame,
  Flower2,
  Leaf,
  type LucideIcon,
  Moon,
  Mountain,
  Rabbit,
  Sprout,
  Star,
  Sun,
  Tent,
  TreePine,
} from "lucide-react";

// Calvin's "an explorer's day": ground → sky → creatures → camp → night sky.
// Each icon is the **landmark** for one problem position, replacing the
// numeric "1." / "2." / ... that visually competed with the equation
// operands. The narrative order is the cohesion — a kid can half-remember
// "I'm on the owl one" the way they can't half-remember "I'm on problem 11".
//
// The same sequence doubles as the per-stage Mission Patch symbol: stage N's
// patch shows the position-N icon (Stage 1 = sprout, Stage 5 = mountain,
// Stage 15 = star). So the badge, the position marker, and the kid's
// vocabulary all share one alphabet.

export type ProblemIcon = { Icon: LucideIcon; label: string };

export const PROBLEM_ICONS: readonly ProblemIcon[] = [
  { Icon: Sprout, label: "sprout" }, // 1 — smallest living thing; seed of the journey
  { Icon: Leaf, label: "leaf" }, // 2 — one step up, same family
  { Icon: Flower2, label: "flower" }, // 3 — round silhouette, distinct from leaf
  { Icon: TreePine, label: "pine tree" }, // 4 — vertical triangle, unmistakable
  { Icon: Mountain, label: "mountain" }, // 5 — wider triangle, peaks above the tree
  { Icon: Sun, label: "sun" }, // 6 — radial burst, fully symmetric
  { Icon: Cloud, label: "cloud" }, // 7 — soft bumps, opposite of mountain's points
  { Icon: Bird, label: "bird" }, // 8 — first creature; introduces motion
  { Icon: Fish, label: "fish" }, // 9 — different element from bird
  { Icon: Rabbit, label: "rabbit" }, // 10 — first land animal; tall ears
  // Position 11 — dusk creature. Calvin spec'd Owl, but lucide-react 1.14
  // doesn't ship one yet (added in 2.x). Cat is the closest substitute:
  // night-coded, silhouette is triangular ears + low body, distinct from
  // Rabbit's vertical-ear stance at position 10.
  { Icon: Cat, label: "cat" }, // 11
  { Icon: Tent, label: "tent" }, // 12 — shelter; geometric, distinct from mountain
  { Icon: Flame, label: "campfire" }, // 13 — pointed, pairs with tent
  { Icon: Moon, label: "moon" }, // 14 — crescent, opposite of sun
  { Icon: Star, label: "star" }, // 15 — final reward, cosmic
];

// Lookup by 1-based position (1..15). Falls back to Star for any out-of-range
// position so a stage that ever exceeded 15 problems renders something rather
// than crashing — but the generator schema caps problemCount at 15, so this
// is paranoia, not a real branch.
export function iconFor(position: number): ProblemIcon {
  const last = PROBLEM_ICONS[PROBLEM_ICONS.length - 1];
  if (!last) throw new Error("PROBLEM_ICONS is empty (compile-time invariant violated)");
  const i = Math.max(1, Math.min(PROBLEM_ICONS.length, position)) - 1;
  return PROBLEM_ICONS[i] ?? last;
}
