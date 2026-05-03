import { type EnemyTemplate, EnemyTemplateSchema } from "@dean-stack/schemas";

// Vite serves files from `public/` at the root in dev and prefixed with the
// configured `base` in production. `import.meta.env.BASE_URL` is the canonical
// runtime way to compose those paths so the same registry works on
// localhost (base "/") and on GH Pages project sites (base "/dean-stack/").
const BASE: string = import.meta.env.BASE_URL;

// Static bestiary. Code-owned, not IDB-persisted — the round only stores
// `templateId` + current `hp`; everything else is looked up here at render
// time. Order is *not* the round order; LEVELS owns the level→enemy mapping.
//
// `parse` runs once at module load to validate the registry against the
// schema — catches typos in `rarity` and missing fields at startup, not
// silently when an avatar mounts.
//
// HP values are calibrated against the per-level damage in `levels.ts`
// (damage = equation target). Update both together if you tune one.
//
// Bios are written for ~3rd-grade readers — short sentences, kid
// vocabulary, Dav Pilkey energy (Captain Underpants / Dog Man).
// Keep the spooky-cozy ocean-monster heart, but no abstract grief
// metaphors: the kid is the audience. The wraith and kelp-censer
// remain sibling bosses (same loss, different response); recurring
// motifs are still the sunken bell and the vanished surface.
export const ENEMY_REGISTRY: readonly EnemyTemplate[] = [
  // ── Tier 1 ──────────────────────────────────────────────────────────
  EnemyTemplateSchema.parse({
    id: "hadal-tide-minnow-echo",
    name: "Tide Minnow Echo",
    type: "current",
    rarity: "common",
    maxHp: 10,
    imageUrl: `${BASE}enemies/hadal-tide-minnow-echo.png`,
    bio: `## Was

A teeny tiny fish! It used to swim where the sun made shiny stripes on the water. The water was warm. It loved the warm parts. It loved counting waves, too. One wave! Two waves! THREE waves!

## Is

Now it just floats in a little circle. The circle is about as big as your hand. It is still trying to count. But it gets stuck. "One... uhhh... two... uhhh..." Poor little guy.

## To Settle It

This one is SUPER easy. Just give it a number. Any true number! Its tiny fin will go wiggle and it will remember which way is up. Done!`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-pressure-puff-echo",
    name: "Pressure Puff Echo",
    type: "pressure",
    rarity: "uncommon",
    maxHp: 28,
    imageUrl: `${BASE}enemies/hadal-pressure-puff-echo.png`,
    bio: `## Was

The Puff is round. Like a balloon! That is because the deep ocean is HEAVY and it has been holding its breath for a really long time. Nobody told it to stop.

## Is

It moves slow. Like when you are sleepy and just woke up. Inside it is the number it used to be before it puffed up big. The number is way smaller than you think. Tiny!

## Tell

When it sighs, the water gets a tiny bit warmer. That is the only kind of weather down here. Cool, huh?`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-glow-polyp-echo",
    name: "Glow Polyp Echo",
    type: "bioluminescence",
    rarity: "rare",
    maxHp: 12,
    imageUrl: `${BASE}enemies/hadal-glow-polyp-echo.png`,
    bio: `## Was

A bunch of soft green stars stuck on a stick! It glows. It blinks in the rhythm of a song. Nobody knows the song. But if you watch the blinks long enough, you can almost count along. Blink. Blink. BLINK!

## Is

Kinda fragile. Why? Because it gave most of itself away as LIGHT. A long time ago. It was hoping someone way up top would see. Someone did see! Once. A face. The polyp can't remember whose face, though.

## To Settle It

Help it find a number. One of its little stars goes steady. That is all. That is enough.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-silt-crawler-echo",
    name: "Silt Crawler Echo",
    type: "sand",
    rarity: "epic",
    maxHp: 28,
    imageUrl: `${BASE}enemies/hadal-silt-crawler-echo.png`,
    bio: `## Was

This guy is OLD. Older than the wall it sits on. It counts time by sand. One grain. Then a hundred. Then a hundred hundred! After all that counting it forgot what number it was on. Whoops.

## Is

It does NOT hurry. It has not hurried in a thousand years. When it moves, a little gold cloud poofs up. The cloud is full of stuff that used to be shells. (Gross? Cool? Both!)

## To Settle It

Be patient with it. It has been patient with everything else. So you can be patient too.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-ember-snail-echo",
    name: "Ember Snail Echo",
    type: "magma",
    rarity: "legendary",
    maxHp: 44,
    imageUrl: `${BASE}enemies/hadal-ember-snail-echo.png`,
    bio: `## Was

Way deep where the water is super cold, this snail carries a HOT COAL inside its shell. The coal has been on fire since before there were any people! Nobody knows who lit it. Spooky!

## Is

It moves toward warm stuff. A vent! A lantern! YOU! It is not trying to steal the warm. It is checking. Snails check things real slow. It wants to know if its little fire is still the right kind of fire.

## To Settle It

Give it a true answer. The coal will get bright for a second. You can see, way deep inside the shell, the smaller snail it used to be! Then the dark comes back. But the dark is warmer now. Aww.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-pressure-wraith",
    name: "Hadal Pressure Wraith",
    type: "pressure",
    rarity: "mythic",
    maxHp: 42,
    imageUrl: `${BASE}enemies/hadal-pressure-wraith.png`,
    bio: `## Was

It used to be SOMETHING ELSE. A tide. A name. A hand on a railing. But it cannot find any of those things now. It can only feel the heavy spot where they used to be.

## Is

It has been forgetting for a LOOOONG time. So it is heavy. It floats slow. It is all bunched up. It drifts toward an old sunken bell. Nobody has rung that bell in a hundred years. But the bell is the last loud thing it can almost remember.

## To Settle It

Do not be scared! It is not mad. It is just tired. The kind of tired we do not even have a word for up here. Give it the right number, gently, and the bunchy parts loosen up. Then it rests. And way far away, the bell goes BONG. One time. And you keep going down.`,
  }),
  // ── Tier 2 ──────────────────────────────────────────────────────────
  EnemyTemplateSchema.parse({
    id: "hadal-glass-manta-echo",
    name: "Glass Manta Echo",
    type: "glass",
    rarity: "common",
    maxHp: 14,
    imageUrl: `${BASE}enemies/hadal-glass-manta-echo.png`,
    bio: `## Was

This thing is OLDER THAN GLASS. Older than even the idea of windows! It floats along a line it drew. Way back when the world was little.

## Is

You see the wall right through it before you see the manta. It will NOT cross that line. Not for a current. Not for you. Not for ANYTHING. The line is the last rule it remembers. It is the only piece of itself it has left.

## To Settle It

If your number is on its side of the line, it lets you pass. If it is not, it waits. The manta has waited longer than you can count. Like, forever.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-brine-needle-urchin-echo",
    name: "Brine Needle Urchin Echo",
    type: "brine",
    rarity: "uncommon",
    maxHp: 24,
    imageUrl: `${BASE}enemies/hadal-brine-needle-urchin-echo.png`,
    bio: `## Was

A little salty coin of an animal. With SPIKES! The spikes were to keep something out. But it forgot what. Was it sharks? Was it noodles? It just doesn't know anymore.

## Is

It guards a circle on the floor. The circle is about the size of a dinner plate. Inside the circle: NOTHING. Outside the circle: ALSO nothing! But the circle is HIS. And he knows the difference, even if you don't.

## To Settle It

It will let you come near if your answer is small enough to fit in the circle. If you bring something too big, the spikes go up. Politely! Then it asks you to try again. So polite.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-basalt-lantern-leech-echo",
    name: "Basalt Lantern Leech Echo",
    type: "basalt",
    rarity: "rare",
    maxHp: 27,
    imageUrl: `${BASE}enemies/hadal-basalt-lantern-leech-echo.png`,
    bio: `## Was

The lantern is older than the leech. The leech is older than the rock. Nobody knows where the lantern came from. A mystery! Spooky mystery time.

## Is

It sticks to the rock SUPER hard. Nobody has ever pried it off. It holds the tiny lantern in its mouth. The leech thinks — as much as a leech can think — that someone gave it the lantern to hold. They said they would come back. They didn't. Yet.

## To Settle It

When you go by, it lifts the light up a little. Hopeful! Answer it true and the lantern goes FLASH. Bright for one heartbeat. Bright enough that you can see, way far away in the dark, the shape of a sunken bell.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-sandglass-stalker-echo",
    name: "Sandglass Stalker Echo",
    type: "sand",
    rarity: "epic",
    maxHp: 36,
    imageUrl: `${BASE}enemies/hadal-sandglass-stalker-echo.png`,
    bio: `## Was

Shaped like an hourglass! Moves like one too. Slow gold sand trickles from the top to the bottom. Then it FLIPS itself over. Then more sand. It has been flipping itself for longer than the trench even had a name.

## Is

It watches. It watches EVERYTHING! Pilots. Currents. Other monsters. Even the slow dust on the floor. It is keeping count of something. And the count matters to it more than anything else.

## To Settle It

If your number comes before its number, it lets the sand fall. If your number comes after, it flips itself over and waits for you to try again. It is not in a hurry. It has all the time there ever was.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-kelp-censer-echo",
    name: "Kelp Censer Echo",
    type: "kelp",
    rarity: "legendary",
    maxHp: 60,
    imageUrl: `${BASE}enemies/hadal-kelp-censer-echo.png`,
    bio: `## Was

Picture a HUGE green hall made of seaweed. In the middle there is a big brass cup swinging on a kelp chain. The cup is full of smoke. The smoke does not go up. There is no "up" down here. Only deeper.

## Is

You know the Pressure Wraith? This one is its other half. Same sad story. But this one grew leaves instead of getting all bunched up. The Wraith floats toward the bell to remember a sound. The Censer just sits still and lets the smoke remember for it.

## To Settle It

The smoke smells like a kitchen you have never been in. Like bread. Almost like a voice calling you inside. Give it the right number, in the right order. For ONE long breath the smoke goes up the way smoke is supposed to. And way up high somewhere, a window opens. Whoa.`,
  }),
];

export function findEnemyTemplate(id: string): EnemyTemplate | undefined {
  return ENEMY_REGISTRY.find((e) => e.id === id);
}
