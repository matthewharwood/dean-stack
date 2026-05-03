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
// Bios authored via the calvin-game-designer agent against the Bible
// (docs/hadal-tide.md) — the wraith and kelp-censer are sibling tier
// bosses (different responses to the same loss); minor recurring motifs
// are the sunken bell and the vanished surface.
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

Once it swam in shallow water where the sun came down in pieces. It still remembers the warm parts, sort of. The shape of a kelp shadow. The taste of a wave.

## Is

Now it drifts in a slow circle the size of your hand, looking for the count it used to keep. Minnows always counted. One-of-us, two-of-us, three-of-us, all-of-us. If you're quiet you can hear it trying.

## To Settle It

The first echo most pilots meet, and the easiest. Give it back a small true number and watch its little fin remember which way is up.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-pressure-puff-echo",
    name: "Pressure Puff Echo",
    type: "pressure",
    rarity: "uncommon",
    maxHp: 28,
    imageUrl: `${BASE}enemies/hadal-pressure-puff-echo.png`,
    bio: `## Was

The Puff is round because the deep is heavy and it has been holding its breath for a very long time. Nobody told it the holding was over.

## Is

It moves the way a thought moves when you are sleepy: slow, big, almost. Inside it, somewhere, is the number it used to be before it swelled. Smaller than you'd guess.

## Tell

When it sighs, the water around it warms by half a degree. That is the only weather down here.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-glow-polyp-echo",
    name: "Glow Polyp Echo",
    type: "bioluminescence",
    rarity: "rare",
    maxHp: 12,
    imageUrl: `${BASE}enemies/hadal-glow-polyp-echo.png`,
    bio: `## Was

A handful of soft green stars on a stem. The polyp glows in the rhythm of a song no one alive can name, and if you watch the pulses long enough you can almost count along.

## Is

Fragile. Not because the deep is cruel, but because it gave most of itself away as light a long time ago, hoping someone above might see. Someone did, once. The polyp remembers a face but not whose.

## To Settle It

Help it find a number and one of its stars steadies. That is enough.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-silt-crawler-echo",
    name: "Silt Crawler Echo",
    type: "sand",
    rarity: "epic",
    maxHp: 28,
    imageUrl: `${BASE}enemies/hadal-silt-crawler-echo.png`,
    bio: `## Was

Older than the trench wall it rests against. The crawler measures time in settled silt — one grain, then a hundred, then a hundred hundred — and somewhere under all that quiet it forgot which number it was on.

## Is

It does not hurry. It has not hurried in a thousand years. When it shifts, a small gold cloud rises and the cloud is full of things that used to be shells.

## To Settle It

Be patient with it. It has been patient with everything.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-ember-snail-echo",
    name: "Ember Snail Echo",
    type: "magma",
    rarity: "legendary",
    maxHp: 44,
    imageUrl: `${BASE}enemies/hadal-ember-snail-echo.png`,
    bio: `## Was

Deep where the water is cold enough to hurt, the ember snail carries a coal in the curl of its shell. The coal has been lit since before there were people. Nobody knows who lit it.

## Is

It moves toward warm things. A vent. A lantern. A pilot. Not to take the warmth — to compare. The snail is checking, in its slow snail way, whether its little fire is still the right kind of fire.

## To Settle It

Give it a true answer and the coal brightens for a moment. You can see, deep inside the shell, the smaller snail it used to be. Then the dark again. But warmer.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-pressure-wraith",
    name: "Hadal Pressure Wraith",
    type: "pressure",
    rarity: "mythic",
    maxHp: 42,
    imageUrl: `${BASE}enemies/hadal-pressure-wraith.png`,
    bio: `## Was

Something else once — a tide, a name, a hand on a railing. It cannot find any of those things now, only the weight where they used to be.

## Is

The Forgetting given a long time to settle. Heavy. Slow. Folded in on itself the way grief folds. It drifts toward a sunken bell that nobody has rung in a hundred years, because the bell is the last loud thing it can almost remember.

## To Settle It

Do not be afraid of it. It is not angry. It is tired in a way the surface does not have a word for. Give it the right number, gently, and the folding loosens. Then it rests, and the bell rings once, very far away, and you keep going down.`,
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

Older than glass — older than the idea of windows. The manta drifts on a line it drew for itself when the world was younger.

## Is

You see the trench wall through it before you see it. It will not cross that line. Not for a current, not for a pilot, not for anything. The line is the last rule it can remember, and the rule is the only piece of itself it has left.

## To Settle It

If your number is on its side of the line, it lets you pass. If it isn't, it waits. The manta has waited longer than you can count.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-brine-needle-urchin-echo",
    name: "Brine Needle Urchin Echo",
    type: "brine",
    rarity: "uncommon",
    maxHp: 24,
    imageUrl: `${BASE}enemies/hadal-brine-needle-urchin-echo.png`,
    bio: `## Was

A small bristled coin of an animal, salt-stiff and prickly. The needle urchin grew its spines to keep something out, and it cannot now remember what.

## Is

It guards a circle of seafloor about as wide as a dinner plate. Inside the circle: nothing. Outside the circle: also nothing. But the circle is the urchin's, and it knows the difference even if you don't.

## To Settle It

It will let you near if your answer is small enough to fit inside the circle. If you bring something too big, the spines lift, politely, and ask you to try again.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-basalt-lantern-leech-echo",
    name: "Basalt Lantern Leech Echo",
    type: "basalt",
    rarity: "rare",
    maxHp: 27,
    imageUrl: `${BASE}enemies/hadal-basalt-lantern-leech-echo.png`,
    bio: `## Was

The lantern is older than the leech. The leech is older than the rock. Nobody knows where the lantern came from.

## Is

It clings to volcanic stone with a grip nothing has ever pried loose, carrying the tiny lantern in its mouth. The leech believes — as much as a leech believes anything — that it was given the lantern to hold until someone came back for it. The someone has not come back.

## To Settle It

When you pass, it lifts the light a little, hopeful. Answer it true and the lantern flares, just for a heartbeat, bright enough that you can see, far away in the dark, the shape of a sunken bell.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-sandglass-stalker-echo",
    name: "Sandglass Stalker Echo",
    type: "sand",
    rarity: "epic",
    maxHp: 36,
    imageUrl: `${BASE}enemies/hadal-sandglass-stalker-echo.png`,
    bio: `## Was

Shaped like an hourglass and moving like one — a slow trickle of gold from the top half to the bottom, then a turn, then another slow trickle. The stalker has been turning itself for longer than the trench has had a name.

## Is

It watches. Patiently. Pilots, currents, other echoes, the slow drift of silt on the floor. It is keeping count of something, and the count matters to it more than anything else.

## To Settle It

If your number comes before its number, it lets the sand fall. If your number comes after, it turns itself over and waits for you to try again. It is not in a hurry. It has all the time there ever was.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-kelp-censer-echo",
    name: "Kelp Censer Echo",
    type: "kelp",
    rarity: "legendary",
    maxHp: 60,
    imageUrl: `${BASE}enemies/hadal-kelp-censer-echo.png`,
    bio: `## Was

Imagine a cathedral made of seaweed. Imagine, in the middle of it, a great brass cup swinging on a chain of kelp, and inside the cup a smoke that does not rise because there is no up down here, only deeper.

## Is

What the pressure-wraith might have been, if grief had grown leaves instead of folding in. It is the wraith's other half — the same loss, answered with green instead of weight. Where the wraith drifts toward the sunken bell to remember a sound, the censer stays still and lets the smoke do the remembering for it.

## To Settle It

The smoke smells like a kitchen you have never been in. Like bread, almost. Like a voice calling you inside. Give it the right number, in the right order, and for one long breath the smoke rises the way smoke is supposed to, and somewhere very far up, a window opens.`,
  }),
];

export function findEnemyTemplate(id: string): EnemyTemplate | undefined {
  return ENEMY_REGISTRY.find((e) => e.id === id);
}
