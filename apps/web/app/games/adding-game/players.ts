import { type PlayerTemplate, PlayerTemplateSchema } from "@dean-stack/schemas";

import { attacksFor } from "./player-attacks";

// Vite serves files from `public/` at the root in dev and prefixed with the
// configured `base` in production. Mirrors the BASE handling in enemies.ts.
const BASE: string = import.meta.env.BASE_URL;

// Lantern Guild roster — the player-side counterpart to ENEMY_REGISTRY.
//
// Today this is **purely presentational lore**. The right column of the
// /adding-game route shows one player at a time and the kid cycles
// through the crew with a button. No mechanics attached yet — bios are
// the whole point. Mechanics may attach later (e.g. selected pilot
// modifies the dive); the schema is shaped so that's additive.
//
// Authoring follows the same pattern as enemies.ts:
//   - rarity drives the avatar's border color (visual ramp)
//   - bios use `## Heading` markdown-ish sections, parsed by LoreBio
//   - prose stays short, lyrical, and consistent with the Hadal Tide
//     bible's voice (cozy-mythic, dieselpunk-Victorian, lantern-warm)
export const PLAYER_REGISTRY: readonly PlayerTemplate[] = [
  PlayerTemplateSchema.parse({
    id: "hadal-player-common-mara-brasswake",
    name: "Mara Brasswake",
    role: "apprentice",
    rarity: "common",
    imageUrl: `${BASE}players/hadal-player-common-mara-brasswake.png`,
    bio: `## Role

Apprentice tender. She is in charge of nothing, which is the most important job on the ship — every other job has someone above it, and Mara has only the lanterns and the kelp.

## Quirk

She talks to the lanterns when she thinks no one is listening. She is sure they answer. Some of them might.

## On Watch

She is the first one up before a descent and the last one to bed after, and the only one who has ever caught the captain humming.`,
    attacks: attacksFor("hadal-player-common-mara-brasswake"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-common-oren-tideledger",
    name: "Oren Tideledger",
    role: "bookkeeper",
    rarity: "common",
    imageUrl: `${BASE}players/hadal-player-common-oren-tideledger.png`,
    bio: `## Role

Bookkeeper of currents. Oren keeps a brass-bound ledger that tracks every tide the ship has ridden, every echo it has met, and every number it has spoken back into the dark.

## Quirk

He counts under his breath. Always. Even sleeping. The crew has learned to set their watches by the cadence of his breathing.

## On Watch

He sits beside the porthole with a warm pencil and writes the trench down in tidy little columns, as if making it tidy will make it kind.`,
    attacks: attacksFor("hadal-player-common-oren-tideledger"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-uncommon-sable-kett",
    name: "Sable Kett",
    role: "engineer",
    rarity: "uncommon",
    imageUrl: `${BASE}players/hadal-player-uncommon-sable-kett.png`,
    bio: `## Role

Engineer. Sable knows every bolt on the ship by name and every name in her own house by silence. She prefers the bolts.

## Quirk

She fixes things before they are broken. The captain has stopped asking how she knew. She does not always know herself.

## On Watch

She walks the engine deck with a wrench in one hand and a cup of tea in the other, and the engines hum a half-step happier when she passes.`,
    attacks: attacksFor("hadal-player-uncommon-sable-kett"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-uncommon-pella-copperkeel",
    name: "Pella Copperkeel",
    role: "cook",
    rarity: "uncommon",
    imageUrl: `${BASE}players/hadal-player-uncommon-pella-copperkeel.png`,
    bio: `## Role

Cook. Pella keeps a copper kettle that has been simmering since before the ship had a name, and she swears the trench can smell it from the bottom.

## Quirk

She over-feeds everyone. She believes hunger is a kind of forgetting and she will not have any of her crew forgetting on her watch.

## On Watch

She bakes bread on dive days. The smoke goes up the galley flue and out into the dark, and somewhere down there an echo lifts its head and almost remembers a kitchen.`,
    attacks: attacksFor("hadal-player-uncommon-pella-copperkeel"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-rare-ivo-bellcurrent",
    name: "Ivo Bellcurrent",
    role: "bell-ringer",
    rarity: "rare",
    imageUrl: `${BASE}players/hadal-player-rare-ivo-bellcurrent.png`,
    bio: `## Role

Bell-ringer. Ivo carries the deck-bell that calls the crew to watch, to meals, to the long quiet hour before a descent.

## Quirk

He rings the bell once, every night, for nobody. He has done it since he was small. He will not say why.

## On Watch

He is listening for the sunken bell. Everybody knows it. Nobody mentions it. When he hears it, the whole ship will hear it, and that will be the night the trench answers back.`,
    attacks: attacksFor("hadal-player-rare-ivo-bellcurrent"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-rare-nemi-valeglass",
    name: "Nemi Valeglass",
    role: "cartographer",
    rarity: "rare",
    imageUrl: `${BASE}players/hadal-player-rare-nemi-valeglass.png`,
    bio: `## Role

Cartographer. Nemi draws the trench from memory and from the shape the lanterns make on the cabin ceiling at night.

## Quirk

Her maps are wrong on purpose. She says the trench moves and a true map has to move with it. Nobody has been brave enough to test her.

## On Watch

She is the one who decides where the ship goes next. She does not consult the others. By the time she folds the map and looks up, the helm is already turning.`,
    attacks: attacksFor("hadal-player-rare-nemi-valeglass"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-epic-luma-pearlspoke",
    name: "Luma Pearlspoke",
    role: "diplomat",
    rarity: "epic",
    imageUrl: `${BASE}players/hadal-player-epic-luma-pearlspoke.png`,
    bio: `## Role

Diplomat. Luma was trained to speak to people and discovered, late, that the only language she truly knows is the one the pearls speak under pressure.

## Quirk

She listens before she speaks. Then she listens again. The crew has learned that her silences mean she is choosing the right syllable for the trench.

## On Watch

When an echo will not settle, the captain sends Luma. She carries no lantern, only a small string of pearls that she puts in her mouth and holds, and the echo always — always — listens.`,
    attacks: attacksFor("hadal-player-epic-luma-pearlspoke"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-epic-thane-oxbell",
    name: "Thane Oxbell",
    role: "watchman",
    rarity: "epic",
    imageUrl: `${BASE}players/hadal-player-epic-thane-oxbell.png`,
    bio: `## Role

Watchman. Thane carries the loud bell — the one that wakes the whole crew when the trench wakes first.

## Quirk

He has never been seen sitting down. Not once. The crew has a small wager going. The wager is older than some of them.

## On Watch

He stands at the prow on every descent with his hand on the bell-rope and his eyes on the dark, and the dark, very politely, watches him back.`,
    attacks: attacksFor("hadal-player-epic-thane-oxbell"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-mythical-aster-drownedstar",
    name: "Aster Drownedstar",
    role: "astronomer",
    rarity: "mythic",
    imageUrl: `${BASE}players/hadal-player-mythical-aster-drownedstar.png`,
    bio: `## Role

Astronomer. Aster is here because the stars she charts are not in the sky. They are at the bottom, and they are very dim, and they are very old.

## Quirk

She sleeps in the day and works at the deepest dark. She says the trench has its own constellations and someone has to learn their names before they go out.

## On Watch

She holds a small piece of glass to her eye and looks at nothing the rest of the crew can see, and she nods, slowly, and writes a single number down.`,
    attacks: attacksFor("hadal-player-mythical-aster-drownedstar"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-mythical-lantern-bride-bathypel",
    name: "Bathypel, the Lantern Bride",
    role: "vow-keeper",
    rarity: "mythic",
    imageUrl: `${BASE}players/hadal-player-mythical-lantern-bride-bathypel.png`,
    bio: `## Role

Vow-keeper. Bathypel made a promise to the deep when she was very young, and she has been keeping it for so long that the lantern she carries has begun to keep her back.

## Quirk

She does not blink in the dark. The crew used to find this unsettling. They have, over the years, found it comforting.

## On Watch

She walks the lower deck alone with the lantern held at her chest, and where she walks the air warms by half a degree, and the echoes — even the oldest, even the wraith — turn their heads toward her, gently, the way a child turns toward a mother's voice in the next room.`,
    attacks: attacksFor("hadal-player-mythical-lantern-bride-bathypel"),
  }),
];

export function findPlayerTemplate(id: string): PlayerTemplate | undefined {
  return PLAYER_REGISTRY.find((p) => p.id === id);
}
