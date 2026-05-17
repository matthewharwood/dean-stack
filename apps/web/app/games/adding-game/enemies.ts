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
    nameSoundId: "pronounce-tide-minnow-echo",
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
    nameSoundId: "pronounce-pressure-puff-echo",
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
    nameSoundId: "pronounce-glow-polyp-echo",
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
    nameSoundId: "pronounce-silt-crawler-echo",
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
    nameSoundId: "pronounce-ember-snail-echo",
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
    nameSoundId: "pronounce-pressure-wraith",
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
    nameSoundId: "pronounce-glass-manta-echo",
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
    nameSoundId: "pronounce-brine-needle-urchin-echo",
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
    nameSoundId: "pronounce-basalt-lantern-leech-echo",
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
    nameSoundId: "pronounce-sandglass-stalker-echo",
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
    nameSoundId: "pronounce-kelp-censer-echo",
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
  // ── Tier 3 ──────────────────────────────────────────────────────────
  EnemyTemplateSchema.parse({
    id: "hadal-spark-shrimp-drone-echo",
    name: "Spark Shrimp Drone Echo",
    type: "current",
    rarity: "common",
    maxHp: 18,
    imageUrl: `${BASE}enemies/hadal-spark-shrimp-drone-echo.png`,
    bio: `## Was

A tiny shrimp scout with feelers like antennae! It zipped through the trench and tapped rocks to hear if anything was hiding inside. Tap tap tap. Zap zap zap!

## Is

Now its shell hums like a little engine. It wants to fly in a perfect pattern, but the pattern got scrambled. It keeps bumping into its own spark trail.

## To Settle It

Give it a true number and the sparks line up in neat rows. The drone salutes with one little claw, then zooms away.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-crystal-tide-oracle-echo",
    name: "Crystal Tide Oracle Echo",
    type: "crystal",
    rarity: "uncommon",
    maxHp: 22,
    imageUrl: `${BASE}enemies/hadal-crystal-tide-oracle-echo.png`,
    bio: `## Was

This oracle grew inside a coral crystal. It watched currents bend around the glassy points and guessed where every bubble would go next. It was right a LOT.

## Is

Its crystal crown is brighter now, but the guesses come too fast. Future numbers flash all over its face and make it dizzy.

## To Settle It

Show it the number that is true right now. The crown stops rattling. One bright point winks like it knew you could do it.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-brineblade-reaver-echo",
    name: "Brineblade Reaver Echo",
    type: "brine",
    rarity: "rare",
    maxHp: 26,
    imageUrl: `${BASE}enemies/hadal-brineblade-reaver-echo.png`,
    bio: `## Was

A crabby old guard with blade arms made from salt! It stood beside a warm vent and sliced big bubbles into small bubbles. Very serious bubble work.

## Is

Now the blades are too sharp and too many. It keeps chopping the same wave in half, then chopping the halves again, like it forgot when to stop.

## To Settle It

Give it the right answer. The blades fold away one by one, and the Reaver finally lets one whole bubble float past.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-void-spore-sentinel-echo",
    name: "Void Spore Sentinel Echo",
    type: "spore",
    rarity: "epic",
    maxHp: 30,
    imageUrl: `${BASE}enemies/hadal-void-spore-sentinel-echo.png`,
    bio: `## Was

This sentinel was a floating seed with armor plates. It guarded a dark garden where the plants did not need sun. They needed quiet.

## Is

The seed grew battle fins and a sleepy purple eye. It still guards the garden, but it forgot the garden is gone. So it guards EVERYTHING. Even pebbles.

## To Settle It

Answer true and the eye closes halfway. The sentinel remembers one tiny patch of quiet and lets you pass through it.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-starcurrent-seraph-echo",
    name: "Starcurrent Seraph Echo",
    type: "astral current",
    rarity: "legendary",
    maxHp: 36,
    imageUrl: `${BASE}enemies/hadal-starcurrent-seraph-echo.png`,
    bio: `## Was

Once it was a giant ribbon creature that followed falling stars into the sea. Every star made a path. Every path had a number. It remembered them all.

## Is

Now it wears a shining crown of current and acts like the deep ocean is its throne room. It is beautiful. It is bossy. It is extremely hard to impress.

## To Settle It

Bring the true number. The crown burns bright, then bows just a little. Not a big bow. A boss bow.`,
  }),
  // ── Tier 4 ──────────────────────────────────────────────────────────
  EnemyTemplateSchema.parse({
    id: "hadal-chitin-scout-echo",
    name: "Chitin Scout Echo",
    type: "chitin",
    rarity: "common",
    maxHp: 12,
    imageUrl: `${BASE}enemies/hadal-chitin-scout-echo.png`,
    bio: `## Was

A quick little shell bug that ran messages across the trench floor. Its legs clicked out a code. Click-click. Pause. Click!

## Is

The code is stuck on repeat. It dashes forward, stops, turns around, and forgets why it was in such a hurry.

## To Settle It

Give it the number it was carrying. The scout tucks the message under its shell and scurries off like it has somewhere important to be.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-warpcoral-prism-echo",
    name: "Warpcoral Prism Echo",
    type: "coral",
    rarity: "uncommon",
    maxHp: 18,
    imageUrl: `${BASE}enemies/hadal-warpcoral-prism-echo.png`,
    bio: `## Was

This coral grew in a perfect triangle. Little fish used to swim through it and pop out facing a new way. It was a door, but only for brave fish.

## Is

Now the prism bends light, sound, and numbers. It keeps making doorways to places that are only two inches away. Fancy! Not useful.

## To Settle It

Solve the number and the door points the right direction. For a blink, you can see a safe path through the glow.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-plasma-reef-lancer-echo",
    name: "Plasma Reef Lancer Echo",
    type: "plasma",
    rarity: "rare",
    maxHp: 24,
    imageUrl: `${BASE}enemies/hadal-plasma-reef-lancer-echo.png`,
    bio: `## Was

A long reef fish with one bright horn. It poked hot bubbles before they popped. That made the vent field safe for smaller swimmers.

## Is

The horn is all blue fire now. It charges at any number that looks wobbly. It means to help, but YIKES, that is a lot of poking.

## To Settle It

Give it a true equation. The horn cools from blue to gold, and the Lancer remembers how to wait before charging.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-orbital-siege-urchin-echo",
    name: "Orbital Siege Urchin Echo",
    type: "gravity",
    rarity: "epic",
    maxHp: 30,
    imageUrl: `${BASE}enemies/hadal-orbital-siege-urchin-echo.png`,
    bio: `## Was

An urchin that collected tiny stones in rings around its body. It never touched them. They just floated there, spinning like a toy planet set.

## Is

Now the rings are heavy and mean. Each stone waits for the urchin to say GO. The urchin keeps thinking every answer is GO.

## To Settle It

Find the true answer and the stones stop spinning so hard. One by one, they settle into a calm circle.`,
  }),
  EnemyTemplateSchema.parse({
    id: "hadal-abyssal-fleetmind-echo",
    name: "Abyssal Fleetmind Echo",
    type: "pressure",
    rarity: "mythic",
    maxHp: 36,
    imageUrl: `${BASE}enemies/hadal-abyssal-fleetmind-echo.png`,
    bio: `## Was

It was not one creature. It was a whole school moving like one big thought. Left together. Right together. Down together. Perfect.

## Is

Now the thought is huge and dark and wearing a crown of broken little fins. It tries to command the whole trench at once. That is too many things!

## To Settle It

Give it the final true number. The big thought becomes many small thoughts again, and the trench gets quiet enough to hear your own bubbles.`,
  }),
];

export function findEnemyTemplate(id: string): EnemyTemplate | undefined {
  return ENEMY_REGISTRY.find((e) => e.id === id);
}
