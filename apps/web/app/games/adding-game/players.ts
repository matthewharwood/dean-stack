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
//   - prose is ~3rd-grade reading level, Dav Pilkey energy: short
//     sentences, kid vocabulary, exclamation points where they earn
//     it. The lantern-warm spirit stays; the vocabulary doesn't.
export const PLAYER_REGISTRY: readonly PlayerTemplate[] = [
  PlayerTemplateSchema.parse({
    id: "hadal-player-common-mara-brasswake",
    name: "Mara Brasswake",
    nameSoundId: "pronounce-mara-brasswake",
    role: "apprentice",
    rarity: "common",
    imageUrl: `${BASE}players/hadal-player-common-mara-brasswake.png`,
    bio: `## Role

Lantern helper! She is the NEWEST helper on the ship. She is in charge of nothing. That is actually the most important job. Every other job has somebody bossing it. Mara just has the lanterns and the kelp. And that is plenty!

## Quirk

She talks to the lanterns when she thinks nobody is listening. She is SURE they answer her back. Some of them might. Spooky? Maybe. Cool? Definitely.

## On Watch

She wakes up FIRST before going down deep. She goes to bed LAST. And — fun fact — she is the only person who has ever caught the captain humming a song!`,
    attacks: attacksFor("hadal-player-common-mara-brasswake"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-common-oren-tideledger",
    name: "Oren Tideledger",
    nameSoundId: "pronounce-oren-tideledger",
    role: "bookkeeper",
    rarity: "common",
    imageUrl: `${BASE}players/hadal-player-common-oren-tideledger.png`,
    bio: `## Role

Number guy! Oren has a big book with brass corners. He writes EVERYTHING in it. Every wave the ship rode. Every monster they met. Every number they yelled into the dark. So many numbers!

## Quirk

He counts under his breath. ALL the time. Even when he is asleep. The crew sets their watches by his sleepy counting. Tick. Tick. Tick. Oren. Tick.

## On Watch

He sits by the round window with a warm pencil. He writes the deep ocean down in nice neat little columns. Like maybe if he makes it neat, the deep will be nice to him. Maybe!`,
    attacks: attacksFor("hadal-player-common-oren-tideledger"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-uncommon-sable-kett",
    name: "Sable Kett",
    nameSoundId: "pronounce-sable-kett",
    role: "engineer",
    rarity: "uncommon",
    imageUrl: `${BASE}players/hadal-player-uncommon-sable-kett.png`,
    bio: `## Role

The fix-it lady! Sable knows every bolt on the ship by NAME. She also knows everybody in her own house. Their names? She uses silence for those. She likes the bolts more.

## Quirk

She fixes stuff BEFORE it breaks. Like, how does she know? The captain stopped asking. She does not always know either. Whoa. Spooky.

## On Watch

She walks around the engine room. Wrench in one hand. Hot tea in the other. The engines hum a little happier when she goes by. A whole half-step happier!`,
    attacks: attacksFor("hadal-player-uncommon-sable-kett"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-uncommon-pella-copperkeel",
    name: "Pella Copperkeel",
    nameSoundId: "pronounce-pella-copperkeel",
    role: "cook",
    rarity: "uncommon",
    imageUrl: `${BASE}players/hadal-player-uncommon-pella-copperkeel.png`,
    bio: `## Role

The COOK! She has a big copper pot. It has been bubbling since before the ship even had a name. She swears the deep ocean can smell it all the way at the bottom! YUM.

## Quirk

She over-feeds EVERYBODY. She thinks being hungry is a kind of forgetting. And she is NOT going to let her crew forget anything. Not on her watch! Eat up!

## On Watch

She bakes bread on dive days. The smoke goes up the chimney pipe. Out into the dark. And way down deep, some monster lifts its head. And almost remembers a kitchen. Aww.`,
    attacks: attacksFor("hadal-player-uncommon-pella-copperkeel"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-rare-ivo-bellcurrent",
    name: "Ivo Bellcurrent",
    nameSoundId: "pronounce-ivo-bellcurrent",
    role: "bell-ringer",
    rarity: "rare",
    imageUrl: `${BASE}players/hadal-player-rare-ivo-bellcurrent.png`,
    bio: `## Role

The BELL guy! Ivo carries the deck bell. It calls the crew to their watch. To meals. To the long quiet hour right before they go down deep. DING DING!

## Quirk

He rings the bell ONE time. Every night. For NOBODY. He has done this since he was a tiny kid. He will not say why. (Mystery!)

## On Watch

He is listening for the sunken bell. Everybody knows it. Nobody talks about it. When he hears it ring, the whole ship will hear it too. And THAT will be the night the deep answers back. Whoa.`,
    attacks: attacksFor("hadal-player-rare-ivo-bellcurrent"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-rare-nemi-valeglass",
    name: "Nemi Valeglass",
    nameSoundId: "pronounce-nemi-valeglass",
    role: "cartographer",
    rarity: "rare",
    imageUrl: `${BASE}players/hadal-player-rare-nemi-valeglass.png`,
    bio: `## Role

The map maker! Nemi draws the trench from her brain. And from the shape the lanterns make on the ceiling at night. Cool.

## Quirk

Her maps are WRONG on purpose! She says the trench moves. So a true map has to move too. Nobody is brave enough to test her. Smart!

## On Watch

She picks where the ship goes next. She does NOT ask the others. By the time she folds up her map, the ship is already turning. Boss energy!`,
    attacks: attacksFor("hadal-player-rare-nemi-valeglass"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-epic-luma-pearlspoke",
    name: "Luma Pearlspoke",
    nameSoundId: "pronounce-luma-pearlspoke",
    role: "diplomat",
    rarity: "epic",
    imageUrl: `${BASE}players/hadal-player-epic-luma-pearlspoke.png`,
    bio: `## Role

The talker! Luma was trained to talk to people. Then she found out, kind of late, that the only language she really knows is what pearls speak when they get squished. Weird? Yes. Useful? Also yes!

## Quirk

She listens before she talks. Then she listens AGAIN. The crew learned that her quiet means she is picking the perfect word to say to the deep.

## On Watch

When a monster will not calm down, the captain sends Luma. She does not bring a lantern. Just a tiny string of pearls. She puts them in her mouth. She holds them. And the monster ALWAYS — always — listens. Every time.`,
    attacks: attacksFor("hadal-player-epic-luma-pearlspoke"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-epic-thane-oxbell",
    name: "Thane Oxbell",
    nameSoundId: "pronounce-thane-oxbell",
    role: "watchman",
    rarity: "epic",
    imageUrl: `${BASE}players/hadal-player-epic-thane-oxbell.png`,
    bio: `## Role

He has the BIG bell! The loud one! The one that wakes EVERYBODY up when the deep ocean wakes up first. CLANG!

## Quirk

Nobody has EVER seen him sit down. Not one time! The crew has a bet going about it. The bet is older than some of them. Crazy!

## On Watch

He stands at the front of the ship every dive. Hand on the bell rope. Eyes on the dark. And the dark — very politely — watches him right back. Polite dark.`,
    attacks: attacksFor("hadal-player-epic-thane-oxbell"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-mythical-aster-drownedstar",
    name: "Aster Drownedstar",
    nameSoundId: "pronounce-aster-drownedstar",
    role: "astronomer",
    rarity: "mythic",
    imageUrl: `${BASE}players/hadal-player-mythical-aster-drownedstar.png`,
    bio: `## Role

She watches stars! But not sky stars. Her stars are way at the BOTTOM of the ocean. And they are very dim. And SUPER old.

## Quirk

She sleeps in the day. She works in the deepest dark. She says the deep has its own star pictures. Somebody has to learn their names before they blink out forever! That is her job.

## On Watch

She holds a tiny piece of glass to her eye. She looks at NOTHING. Or at least, nothing the rest of the crew can see. She nods slowly. Then she writes one number down. Just one.`,
    attacks: attacksFor("hadal-player-mythical-aster-drownedstar"),
  }),
  PlayerTemplateSchema.parse({
    id: "hadal-player-mythical-lantern-bride-bathypel",
    name: "Bathypel, the Lantern Bride",
    nameSoundId: "pronounce-bathypel-lantern-bride",
    role: "vow-keeper",
    rarity: "mythic",
    imageUrl: `${BASE}players/hadal-player-mythical-lantern-bride-bathypel.png`,
    bio: `## Role

She made a PROMISE to the deep when she was very little. She has been keeping it for so long that the lantern she carries has started keeping HER back. Whoa. Trippy.

## Quirk

She does NOT blink in the dark. The crew used to think this was super creepy. But over the years they decided it was kind of comforting. Funny how that works!

## On Watch

She walks the lower deck alone. Lantern held at her chest. Where she walks, the air gets a little warmer. And the monsters — even the oldest, even the Wraith — turn their heads toward her. Gentle. The way a kid turns toward their mom's voice in the next room. Aww.`,
    attacks: attacksFor("hadal-player-mythical-lantern-bride-bathypel"),
  }),
];

export function findPlayerTemplate(id: string): PlayerTemplate | undefined {
  return PLAYER_REGISTRY.find((p) => p.id === id);
}
