# Game Design Bible — Hadal Tide

---

## Header

**Game Name:** Hadal Tide

**Single-Sentence Description:** A cozy-mythic deep-sea card battler where you solve math equations to fight elemental abyssal spirits.

---

## Part 1 — Inspiration

### What Games Inspire You?

| # | Game Name | Steam Page | Why does this game inspire you? |
|---|---|---|---|
| 1 | Hades | https://store.steampowered.com/app/1145360/Hades/ | The "every run is a story" structure, mythic setting that's lush rather than grim, and the way each room is one tight, juicy combat puzzle. We're stealing the *room → choice → run* rhythm and the tonally-rich underworld; we're rejecting the action-twitch ceiling because our player is 8 and using touch. |
| 2 | Slay the Spire | https://store.steampowered.com/app/646570/Slay_the_Spire/ | The cleanest card-battler skeleton on the market: a hand of cards, an enemy with HP, intent telegraphs, and turn-by-turn arithmetic the player can fully see. Our equation slots ARE the plays; our cards ARE numbers. The structural debt to StS is enormous and worth honoring. |
| 3 | Prodigy Math | https://www.prodigygame.com/ | The proof point that math-as-combat works for 1st–3rd grade — millions of kids willingly do arithmetic because it's wrapped in monster-collecting JRPG fiction. Our differentiator: Prodigy is a sprawling MMO grind with monetized cosmetics; we want a tight, hand-authored, single-player run that respects the kid's time and the parent's bandwidth. |

### Trailer Study

| # | Game Name | Trailer Link | Why does it hook the audience immediately? |
|---|---|---|---|
| 1 | Hades | https://www.youtube.com/watch?v=91t0ha9x0kI | Opens on Zagreus mid-dash through purple flame — motion + voice + a god mocking him in 2 seconds. The hook is "you are the prince of the underworld and you are *fighting your dad*" delivered as kinetic energy, not exposition. |
| 2 | Slay the Spire | https://www.youtube.com/watch?v=DiZ1bsVwToI | First frame is the play-area: a hand of cards, an enemy, numbers flying. The hook is *legibility* — you understand the entire game before the title card. |
| 3 | Cozy Grove | https://www.youtube.com/watch?v=Y7KtzhJyo0o | Bioluminescent painterly aesthetic + a friendly bear voiceover in three seconds. The hook is "this place is beautiful and nothing here will hurt you." We need that emotional safety contract for the audience-of-one. |

### Core Game Loop Study

| # | Game | Core Game Loop | Primary Mechanic | Why is it sticky? |
|---|---|---|---|---|
| 1 | Hades | Pick a boon ➜ clear a room ➜ pick a door | Real-time dash-attack combat with build-defining boon stacking | Familiar: action roguelite. Unique: every "die" is *narrative progress* — the dad mocks you, characters react, the story moves. Memorable: failure is the loop. |
| 2 | Slay the Spire | Draw 5 cards ➜ play to defeat an enemy ➜ pick a card reward | Hand-of-cards turn-based combat with deck-building between rooms | Familiar: card battler. Unique: deck-building inside a roguelike — the *deck* is the build, and every reward is a build commitment. Memorable: the moment you realize a 3-card combo will one-shot the act boss. |
| 3 | Prodigy Math | Walk to a monster ➜ solve a math problem ➜ deal damage | Math-as-attack — answer correctness equals damage; speed and streaks scale it | Familiar: turn-based JRPG. Unique: the *answer field* is the attack button. Memorable: the kid genuinely forgets they're doing schoolwork because the wizard hat has a crown on it. |

### Steam Page Study

| # | Game | Short Description (mark G / M / A / S) | Why is the cover art awesome (or not)? |
|---|---|---|---|
| 1 | Hades | "Defy the god of the dead **(M)** as you hack and slash **(M)** out of the Underworld **(S)** in this rogue-like dungeon crawler **(G)** from the creators of Bastion, Transistor, and Pyre **(A)**." | All four hit. Cover art is a stylized portrait of Zagreus framed by mythic iconography — character-first, instantly readable, sells "you play this guy." |
| 2 | Slay the Spire | "We fused card games and roguelikes **(G)** together to make the best single player deckbuilder we could **(M)**. Craft a unique deck **(M)**, encounter bizarre creatures **(S)**, discover relics of immense power **(A)**, and Slay the Spire!" | All four hit. Cover art is a literal spire in silhouette with a card frame — abstract, but communicates the verb (climb) and the noun (cards). |
| 3 | Prodigy Math | "Prodigy is a free, curriculum-aligned **(A)** math game **(G)** loved by over a million teachers and 50 million students around the world. Embark on adventures **(M)**, complete quests, and battle monsters **(M)** — all while practicing standards-aligned math skills **(S, A)**." | All four hit, with the "loved by teachers" appeal carrying real weight for the parent audience. Cover art is a roster of cute monsters — the collectibles, not the math, are forward-and-center. We will copy this calculus exactly. |

---

## Part 2 — Motivation

### What Makes Your Heart Rate Increase?

1. **Watching my son have an "I get it" moment with arithmetic.**
   - **Why:** The flicker between confusion and recognition is the most rewarding feedback loop in parenting. Engineering a game that produces it on demand, on an iPad, in 10-minute sessions, is the actual product.
2. **The deep ocean as a mythic place — not a hostile one.**
   - **Why:** The Hadal Zone is alien geography that already exists on this planet. Pairing it with the Hades-style "underworld is a workplace" trope gives us a setting that's *visually loud, emotionally calm, and metaphorically rich* without violence. Bioluminescence is gameplay-legible.
3. **Authoring a thing my kid will remember was made for him.**
   - **Why:** The game is a love letter with a build pipeline. Everything else — the monorepo, the IDB-first architecture, the CLI gate — is in service of the fact that a hot-reload on the iPad cannot lose his progress, because if it does, the whole point is gone.

---

## Part 3A — The Trinity Hook

### Story

You are the **last submarine pilot of the Lantern Guild**, descending alone into a Pacific trench that opened in your grandmother's lifetime and has been singing ever since. The "monsters" down here aren't monsters — they're **echoes**: drowned elemental spirits that have forgotten their names. To pass each one, you have to *answer* them. They speak in equations. You speak in numbers. Every spirit you balance gets to rest, and every rest pushes you a little deeper toward whatever is humming at the bottom.

The wish-fulfillment: *I am small, but I am the only one who can hear them, and I always have the right answer somewhere in my hand.* The curiosity-by-contrast: *the deepest, scariest place on the planet is where the ghosts go to be helped.*

> **Designer note:** This is deliberately a "Kind Game" in Cook's sense. There is no combat-as-violence framing; you are *answering* spirits, not killing them. The kid wins by being *correct and patient*, not by being aggressive. Hold this line — it's the prosocial spine.

### Mechanics

**Slay the Spire, but the cards are numbers and the plays are equations.**

Drag-and-drop card slotting *is* the attack input. You don't pick "Strike" — you pick which two of your five numbers to drop into the operand slots so the equation balances. The enemy's HP bar is the equation's right-hand side; bringing it to zero by balancing the equation is the damage event. The juiciness already shipping in `apps/web/app/games/adding-game/drag.tsx` (press tilt, friction rotation, green hover ring, swipe-down send-home) is the moment-to-moment hook.

The "big but" line: **Slay the Spire, but every card is a number and the boss is your math homework — and you don't notice.**

### Art Style

Painterly bioluminescent silhouette work against deep navy darks. Think the chromatic palette of *Cozy Grove* and *Subnautica: Below Zero*'s twilight zones, the silhouette readability of *Gris*, and the chunky UI legibility of *Slay the Spire*. Cards are vellum-warm against the dark — they read as *light sources* on the screen, not props. Enemies are silhouettes with one or two glowing accents in their elemental color (magma orange, current cyan, sand gold, abyss violet, bubble pearl). UI chrome is brass-and-copper Victorian-submersible; the cards are the only "warm" thing in the frame so the kid's attention follows them naturally.

---

## Part 3B — The Core Game Loop

### The Loop

**Deal ➜ Match ➜ Evaluate ➜ Resolve ➜ Score ➜ (next round)**

| Step | Action |
|---|---|
| 1 | **Deal** — five cards animate into the hand; the equation reveals its operator and target; the next echo-spirit fades into the left column. |
| 2 | **Match** — player drags cards from hand into operand slots, freely re-arranging until the equation looks right. Hover ring is green when valid, red over a disabled card; swipe-down on a placed card returns it home. |
| 3 | **Evaluate** — player taps Evaluate. The equation computes; on a match, the spirit takes damage; on a miss, the spirit retaliates and the player loses HP. |
| 4 | **Resolve** — outcome animation plays. Win: spirit shimmers, HP bar drains, "✓" particles. Loss: gentle shake, HP bar drains by the loss formula, the equation stays so the kid can *see* what didn't add up. |
| 5 | **Score** — score ticks, a treasure-fragment may drop, used cards leave the catalog, the screen breathes for ~1.5s. |
| 6 | **Next round** — deal animation re-fires; the spirit either remains (multi-equation fight) or a new one rises. |

> **Designer note:** Steps 1-5 already exist as named phases in `packages/schemas/src/adding-game.ts` (`dealing → matching → evaluating → resolved → scoring`). The Bible's loop is the ground-truth phase machine, not aspirational. The only addition the schema needs is enemy HP and a "spirit defeated" terminal phase per fight.

### The Primary Mechanic

**Drag-to-balance an equation against a target.** One verb. Every difficulty knob — operator, operand count, missing-side position, hand size — bends this single mechanic without replacing it.

### What Makes It Sticky?

| Trait | Description |
|---|---|
| **Familiar** | Card-battler hand at the bottom, enemy on the left, score up top — every kid who's seen a tablet game in 2025 reads this layout in two seconds. |
| **Unique** | The cards are *numbers*, the plays are *equations*, and progressing the math curriculum is the difficulty curve. There is no other commercial product where the *equation shape itself* is the level designer. |
| **Memorable** | The drag/drop juice — press tilt, friction wobble, snap-on-drop, swipe-down send-home, FLIP swap animation — is what the kid will mime with their hands away from the iPad. Combined with the bioluminescent reveal of a defeated spirit, the moment-to-moment is pure tactile pleasure. |

---

## Part 4 — Game Overview

### Game Title

**Hadal Tide**

> **Designer note:** Working title. "Hadal" is the actual oceanographic term for the trench zone (>6,000m) — accurate, evocative, and not in any major game's namespace. "Tide" reads soft and rhythmic, signaling cozy over horror. If a better title appears in playtesting, swap it; I'd put weight behind this one until then.

### Single-Sentence Description

A deep-sea card-battler where math equations are your only weapon.

### Short Description

Hadal Tide is a kid-first card battler set in a mythic Pacific trench. Drag numbered cards into a glowing equation to defeat the elemental spirits drifting up from the abyss — one balanced equation, one rested ghost.

### Long Description

You pilot the last lantern-submarine of a forgotten guild, descending into a trench that has been humming a song no one alive can name. The spirits down here are not monsters — they are echoes of drowned elements (magma, current, sand, pressure, bioluminescence) who have lost their numbers and need yours. Each fight is a math equation: drag two of your five hand cards into the operand slots, tap Evaluate, and if the equation balances, the spirit settles. If it doesn't, the spirit's confusion rolls back over you as damage.

The deeper you descend, the harder the equations: addition becomes subtraction becomes multiplication; targets move from the right side of the equals sign to the left; hands grow from five to seven cards; spirits start asking for three operands instead of two. By the time you reach the trench floor, you're solving the kind of problem your teacher would set in third grade — but down here, getting it right means a ghost finally gets to rest.

**Key Features**

- One-handed iPad play with juicy drag-and-drop card slotting (press tilt, friction wobble, FLIP-style swap, swipe-down send-home).
- Curriculum-aligned difficulty curve from grade-1 addition (`x + y = 10`) through grade-3 multi-operand multiplication, gated on the player's per-avatar progression and not on a calendar.
- A roster of **five Lantern Guides** (cycling avatars on the right column), each with a persistent profile so siblings, cousins, or "Tuesday-me vs. Saturday-me" can all keep their own runs.
- A mythic-but-cozy elemental bestiary — magma, current, sand, pressure, bubble — each with a distinct visual signature and a distinct equation shape.
- All-local, no-account, no-server, runs offline once installed. Progress survives every iPad reload.

### Plot

| Element | Description |
|---|---|
| **Hook** | The trench is *singing*. It has been since your grandmother was a girl. Nobody alive can read the song. You can — but only by answering. |
| **Setting** | The Hadal Zone of an unnamed Pacific trench, 6,000–11,000 metres down. A vertical descent through five thematic strata. The "underworld" is geography, not metaphor. |
| **Protagonist** | The chosen pilot of the Lantern Guild — represented by one of five Guides (player swaps between portraits in the right column). |
| **Antagonist** | The **Forgetting** — not a villain, a *condition*. Elemental spirits accumulate at depth and slowly forget their numbers. The deeper you go, the more confused they are, and the more confused they are, the louder they sing. The trench itself is the antagonist; the spirits are its symptoms. |
| **Struggle** | You are 8. The equations get harder. You are alone in a small submarine, and every spirit you can't answer pushes you a little further from the surface. But the further you go, the more the song makes sense. |
| **The Black Box** | What is at the bottom? Why is it singing? Why can only *you* hear it? (Answer reserved for endgame; we want the kid to *want* the next descent.) |
| **Gameplay Relation** | The math is the answering. There is no other verb. Equation = spirit's confusion; balanced equation = spirit at rest; balanced equations all the way down = the song finally legible. |

**Plot — Combined Paragraph**

Hadal Tide opens at the trench mouth: you are the chosen pilot of the Lantern Guild, descending into a Pacific trench that has been humming an unreadable song since before your grandmother was born. The antagonist is not a creature but a condition — *the Forgetting* — which causes drowned elemental spirits to lose their numbers at depth and sing in confused equations. Your only tool is your hand of five number-cards and the equation-slate that maps the spirit's confusion. You answer them by dragging cards into the right shape; the song clears one note at a time. The struggle is curriculum-shaped: equations grow from grade-1 addition at the surface to grade-3 multi-operand multiplication at the floor. The Black Box is what is humming at the bottom of the trench, and why only the chosen pilot of the Guild can hear it; the gameplay is the answering, and every balanced equation is one ghost finally at rest and one verse of the song finally legible.

### Characters

#### The Protagonist

| Field | Description |
|---|---|
| **Overview** | The **Chosen Pilot of the Lantern Guild** — physically represented by one of five rotating Guides (Marin the cartographer, Kelp the cook, Brass the engineer, Pearl the medic, Echo the silent twin). Age 8–12 in fiction, gender neutral; each avatar has its own portrait, voice barks, and progression file. |
| **The Flaw** | *Smaller than the trench.* Each Guide carries a personal flaw: Marin is afraid of getting lost, Kelp is impatient, Brass overthinks, Pearl over-helps, Echo doesn't speak. The flaw is mirrored by the equation shapes that trip them up most — Brass keeps over-stacking operands; Kelp jumps to Evaluate too fast; etc. (Implementation hook: each Guide has a "weakness equation shape" that earns them slightly more score when they balance it correctly — a built-in encouragement for facing the flaw.) |
| **The Struggle** | The Guides take turns descending because *no one Guide can hold all the equations*. The struggle is interdependence — each spirit at depth needs the right Guide's hand. The trench teaches them they're not alone. |

#### The Antagonist

| Field | Description |
|---|---|
| **Overview** | **The Forgetting** — a phenomenon, not a person. It manifests as elemental spirits (magma, current, sand, pressure, bubble) who have lost their numbers. Each spirit is named: Cinder, Drift, Silt, Weight, Hush. They are confused, not malicious. |
| **Threat to Protagonist** | A confused spirit's song *wraps the submarine* — it pulls the Guide deeper than they meant to go and drains lantern oil (HP) when the Guide misreads its equation. The Forgetting threatens by being inscrutable, not aggressive: the longer you stand still, the further down you drift. |
| **Believability** | The Forgetting maps to a feeling every 8-year-old already knows: when the math doesn't make sense, the world gets a little louder and a little smaller and you feel a little further from the people who can help. We are giving that feeling a name and letting the kid *answer it*. |

#### Minor Character — Captain Tern

| Field | Description |
|---|---|
| **Overview** | The **Lantern Guild's Captain Tern** — the surface voice on the radio. Older, dry-humored, encouraging, never patronizing. Modeled tonally on Cozy Grove's Flamey + Hades' House Contractor. |
| **Purpose** | Tutorialization and emotional regulation. Tern explains new equation shapes, congratulates a defeated spirit, and *says something kind when the kid loses HP*. Critical: Tern never says "wrong." Tern says "the spirit didn't hear you yet." |
| **Salt** | Tern is the only voice the protagonist hears. When a Guide is lost (HP zero), Tern is the one who tells the player to swap to the next Guide. Tern intensifies the antagonist's threat by being a *thread back to the surface* — a reminder of how far down you are. |

#### Minor Character — Cinder (the magma spirit, first encounter)

| Field | Description |
|---|---|
| **Overview** | A glowing silhouette in molten orange, drifting at the upper edge of the trench. Cinder is the player's first equation: `x + y = 10`. |
| **Purpose** | The tutorial spirit. Cinder is friendly, slow-moving, speaks in single-syllable equations, and is *visibly relieved* when balanced. Establishes that the antagonist is the Forgetting, not the spirits. |
| **Salt** | Cinder reappears at depth as an echo, harder equations on the same orange silhouette — a callback that signals "you've been here before, you're going further." |

### Genre

| Field | Value | Wikipedia Definition |
|---|---|---|
| **Primary Genre** | Card battler (Roguelite-lite) | A turn-based game in which gameplay revolves around playing cards from a hand against an opponent, with run-based progression and meta-unlocks between runs. |
| **Secondary Genre** | Educational / serious game | A game whose primary purpose extends beyond entertainment to skill development — here, primary-school arithmetic. |

### Target Audience

| Field | Value |
|---|---|
| **Age Group** | 6–10 years old (target: 7–9) |
| **Language** | English only at launch; localization out of scope. |
| **Gender** | None (the Guides are gender-neutral by design). |
| **Taste** | Loves Pokémon, Bluey, Hilda, Frog Detective, Cozy Grove, Prodigy. Tolerates *but does not seek out* worksheets and Khan Academy Kids. Will play Slay the Spire if a parent is also playing it; will not boot it solo. |
| **Other Traits** | Plays on a shared family iPad over LAN. Sessions are 10–20 minutes between dinner and bath. Has a parent willing to iterate the game weekly. Currently working through 1st-grade math at school; 3rd-grade is the runway. |

### Rewards

#### Plot Rewards

The trench's song becomes legible. The final "boss" equation, at the trench floor, resolves into a single sentence — the song's first line — that names what was humming. The reward is *understanding*. (Working draft of the song's first line: *"We were the numbers before there was anyone to count us."* — emotional, not scary, and earnable in a single completed run.)

The carrot from trailer to ending: the song is *audible from frame one* — a low, layered ambient hum the player can feel without recognizing. Every defeated spirit clears one frequency. By the floor, the hum has resolved into music. The kid hears it before they understand it; understanding it is the ending.

#### Gameplay Rewards

Three layers, all persisted in IDB per-Guide:

1. **Treasure Fragments** — earned per defeated spirit, spent between fights to unlock cosmetic upgrades for the lantern-submarine (paint, lantern color, sticker decals on the porthole). Pure cosmetic; no power-creep.
2. **Lantern Oil Capacity (HP max)** — tied to grade-progression milestones. Finishing a "depth zone" on a given equation shape (e.g. clearing the 5-spirit Magma Reef on `x + y = 10`) raises the Guide's HP cap by a small amount.
3. **Spirit Codex** — a journal entry per unique spirit defeated, with a hand-drawn portrait, the equation shape they sang, and a one-line poem. The codex is the long-tail collectible — kid-readable trophy case that survives across runs.

The carrot from trailer to ending: the trailer shows the **Lantern at full bloom** — every cosmetic unlocked, the codex full, the song complete. The starting Lantern is plain brass. The visual delta between "where you are" and "what's possible" is a permanent in-game tease.

> **Designer note:** No timed daily streak, no FOMO event, no "log in tomorrow for a free X." The only externality is *the parent built a new spirit this week* — and that's a relatedness vector, not a dark pattern.

### Punishments

| # | Trigger (If…) | Effect (Then…) |
|---|---|---|
| 1 | The player taps Evaluate and the equation does not balance. | The Guide loses **lantern oil (HP)** equal to `|computed − expected|`, capped at a per-grade ceiling (G1: 2, G2: 3, G3: 4). The equation stays on screen so the player can *read* what didn't match; the spirit shimmers but does not advance. The cards used in the failed equation return to the hand for re-arrangement — no card loss. |
| 2 | A Guide's lantern oil reaches zero during a fight. | That Guide goes "quiet" — they retreat to the surface and are unavailable for the rest of the run. **The run continues** with the next Guide. (See Multi-Guide Party below.) Quiet Guides return at full HP between runs. |
| 3 | All five Guides go quiet in the same run. | The run ends. The submarine surfaces; the player keeps any treasure fragments and codex entries earned; the trench resets. *No save loss.* The next session starts a fresh descent at the trench mouth. |

> **Designer note (HP loss formula):** I'm picking `|computed − expected|` capped per-grade because it is *legible to the kid* — "I was 3 off, I lost 3 oil" — which turns the loss into a teachable metric instead of a black-box punishment. The cap prevents an early-grade kid from getting wrecked by accidentally dropping a 9 into a `1+x=10` slot. Tune the cap; do not remove the legibility.

### Other Gameplay Mechanics

| Mechanic | Description |
|---|---|
| **Player Movement** | None in the conventional sense. The submarine *descends* between fights along a vertical map; the player taps a "dive" button or a depth-marker to advance. There is no free roam. |
| **Health Collection & Loss** | Lantern oil = HP. Lost on failed equations (formula above). Recovered between fights via "thermal vent" map nodes (consumable healing, ~30% max HP). Max HP grows with grade-progression milestones. |
| **Player Conversation** | One NPC: Captain Tern, one-line radio messages. No dialogue trees. Spirits "speak" their equation shape — the equation IS their dialogue. |
| **Saving** | Auto-save on every state change via `atomWithIDB`. No save slots — each Guide IS a save slot. (This aligns 1:1 with Pillar 3.) |
| **Gaining & Losing Abilities** | Per-Guide passives unlocked by clearing depth zones (e.g. Marin: "first card placed each round shows a hint shimmer if it's part of a valid solution"). No active abilities — the verb is always "drag a card into a slot." |
| **Currency** | Treasure Fragments only. Cosmetic spend, no economy. |
| **Inventory Management** | None for the player. The "inventory" is the hand-of-5 dealt fresh per round. The codex is a passive collection, not a managed one. |
| **Map** | A vertical depth-strip on the right edge during the inter-fight screen; clear nodes glow, locked nodes are silhouettes. Five strata: Magma Reef, Drift Hollow, Sand Cathedral, Pressure Spires, The Hum (boss). |

### Level Design

#### Generic Level Design

The world is a **vertical run** through five thematic strata. Each stratum is 5–7 fights long; each fight is 1–4 rounds (an equation per round). Between fights the player chooses one of two map-nodes — a *spirit fight* or a *thermal vent* (heal). At the bottom of each stratum is a *Choir* — three spirits who sing in chorus, requiring three balanced equations in sequence on a shared HP pool. The bottom of the trench is **The Hum** — a single boss spirit whose equation shape is the hardest the run has shown.

Structure mirrors Slay the Spire's act-then-boss skeleton, but compressed for a 10-minute session: a complete *descent* (Level 1 only, surface-side) is one stratum (~8 fights, ~10 minutes). Reaching the trench floor is a multi-session goal.

#### Specific Level Design

##### Level 1 — Magma Reef (Surface stratum, 6,000–7,000m)

- **Look:** Warm orange bioluminescence against deep navy water. Slow-drifting magma silhouettes; pumice particles rising. UI chrome warm-brass.
- **Purpose:** Tutorialization. Equation shape locked to `x + y = N` where N ∈ {6, 7, 8, 9, 10}. Two operand slots, target on the right, operator: `+`. Hand size: 5.
- **Required for entry:** None. Start here.
- **Revisitable:** Yes — completed strata are replayable for codex fill, treasure, and a different Guide's first dive.
- **Gained:** First Treasure Fragments. First codex entry (Cinder). First Lantern cosmetic unlock at completion.
- **Mood:** Welcoming, warm, slow, never-failing-feels-bad. This is where the kid is *taught the verb*.
- **Relation to other levels:** The 5-spirit boss-Choir at the floor of the Reef is the gate to Drift Hollow — and the Choir requires the same equation shape across all 3 verses, no escalation. The escalation is in the *next* stratum, never the current one.

##### Level 2 — Drift Hollow (7,000–8,000m)

- **Look:** Cyan and teal. Currents visible as drifting particles. Cooler, more echoey ambient. Brass UI gains verdigris.
- **Purpose:** Equation shape escalation #1. Now `N + x = M` and `x + N = M` — the unknown can be on either side of the equation. Operator still `+`. Two operands. Hand size: 5.
- **Required for entry:** Clear Magma Reef Choir.
- **Gained:** First "side-flip" hint cards in the tutorial. Drift the spirit codex entry. Lantern paint unlock #2.
- **Mood:** Slightly disorienting, by design — the equation shape just moved. Captain Tern's barks acknowledge it.
- **Relation:** Side-flip mastery here is the prerequisite for subtraction in Sand Cathedral.

##### Level 3 — Sand Cathedral (8,000–9,000m)

- **Look:** Pale gold silt, vaulted shapes in the silhouettes — abandoned-architecture vibe. Quieter ambient.
- **Purpose:** **Operator change**: `−` enters. Equation shapes: `N − x = M`, `x − N = M`, mixed with prior shapes. Hand size: 5.
- **Required for entry:** Clear Drift Hollow Choir.
- **Mood:** Reverent. Spirits here are slower, longer-bodied, more ancient.
- **Relation:** The first stratum where the *operator slot itself* is the difficulty knob — the player sees `−` and has to recompute their entire reading of the screen.

##### Level 4 — Pressure Spires (9,000–10,000m)

- **Look:** Violet-black. Spires of compressed bioluminescence. Heaviest ambient — the song is loudest here.
- **Purpose:** **Multiplication enters and operand count grows.** Equation shapes: `x × N = M`, `N × x = M`, then 3-operand additive forms `a + b + c = N`. Hand size grows to 6.
- **Required for entry:** Clear Sand Cathedral Choir.
- **Mood:** Awe. The kid should feel like they're doing real math here, and they are — this is solid 2nd-to-3rd grade territory.
- **Relation:** Last stratum before the boss. Establishes that the player is genuinely capable.

##### Level 5 — The Hum (Trench floor, 10,000–11,000m)

- **Look:** The "color" is *all colors at once* — the elemental palettes blend into a single iridescent silhouette. The song is now music.
- **Purpose:** Boss-fight stratum. One spirit, the **Hum-Singer**, with three equation phases that escalate across the fight: a 2-operand multiplicative phase, a 3-operand additive-subtractive phase, and a final phase where the *target itself* is unknown (the kid solves for the right-hand side instead of an operand). Hand size: 7.
- **Required for entry:** Clear Pressure Spires Choir.
- **Gained:** The song's first line. The full codex. A new starting cosmetic for the next descent ("The Hum's Lantern" — iridescent paint).
- **Mood:** Reverent, then ecstatic. The hardest math the game asks of the player, paid off with the largest narrative reveal.
- **Relation:** The cap. After the Hum is heard, the trench resets and a new Guide can dive — the codex persists.

### Music

| Field | Description |
|---|---|
| **Genre** | Ambient + chamber strings + processed choir. Underwater-filtered piano on top. Think Disasterpeace meets Nobuo Uematsu's *Aerith's Theme* meets the *Subnautica* score. |
| **Layering** | Yes — load-bearing. Each stratum adds a "voice" to the underlying hum (Magma: low brass; Drift: high strings; Sand: bell-tones; Spires: choir; Hum: all five harmonized). The player's progress is *audibly* legible. |
| **Mood** | Awe. Calm. Slightly sad in the way good lullabies are slightly sad. Never tense, never spiky, never failure-shamed. |
| **Sample Track #1** | "On the Subject of Trees" — *Hyper Light Drifter* OST (Disasterpeace). Texture and patience. |
| **Sample Track #2** | "Aerith's Theme" — *Final Fantasy VII* OST. Melodic kindness. |
| **Sample Track #3** | "Crash Site" — *Subnautica* OST (Simon Chylinski). The exact "deep ocean is awe, not horror" register we want. |

### Control Scheme

Touch only. iPad. Single-pointer with a fallback to mouse for desktop dev/testing.

| Input | Action |
|---|---|
| Tap on a card | Lift / select (currently a no-op visual; reserved for an alt-mode if drag-and-drop fails accessibility testing). |
| Press-and-drag a card | Press tilt + scale-up → drag with friction wobble → green hover ring on valid drop, red over disabled, snap-on-release. |
| Drag card from hand → equation slot | Place card. If slot occupied, swap; the displaced card returns to the dragged-from hand slot. |
| Drag card from equation → hand slot | Un-place card back to a chosen hand slot. |
| Swipe-down on an equation card (fast) | Send-home gesture: card auto-routes to the leftmost empty hand slot. |
| Tap "Evaluate" button | Compute the equation; resolve the round. |
| Tap a Guide portrait (right column) | Switch active Guide between runs (locked during a fight). |
| Tap a depth-map node | Advance the submarine to that node (between fights). |
| `prefers-reduced-motion` toggled on at OS level | All anime.js feedback short-circuits to instant; gameplay logic untouched. |

---

## Part 5 — The Stop & Stare Factor

### Color Palette

The world is **deep, mostly-dark navy** with **bioluminescent accents in the elemental colors of the current stratum**. The cards are the only consistently warm element in frame — vellum-warm, deliberately *the lightest thing on screen* so the player's eye is drawn to them.

| # | Hex | Role |
|---|---|---|
| 1 | `#0A1628` | **Abyss Navy** — primary background across all strata. The screen is mostly this color. |
| 2 | `#F4E4C1` | **Vellum** — card face, lantern-light, the warm anchor. The kid's attention follows this color. |
| 3 | `#5BC8AC` | **Lumen Teal** — the "valid drop" / progress / hope color. Used for the green hover ring (`emerald-400/80` in the current code is the sibling — the Bible's spec is to align that to Lumen Teal in the next iteration). |

**Stratum accent colors (additional, not part of the core 3):**

| Stratum | Hex | Element |
|---|---|---|
| Magma Reef | `#FF6B35` | Magma orange |
| Drift Hollow | `#4FB6C9` | Current cyan |
| Sand Cathedral | `#D4A857` | Sand gold |
| Pressure Spires | `#8B5FBF` | Pressure violet |
| The Hum | iridescent gradient | All five blended |

### Atmosphere

**Slow drift.** Particles rise (bubbles, silt, embers) at 5–15px/s; ambient lighting pulses at ~0.2Hz to simulate bioluminescent breathing. Spirits enter from the left edge of the screen with a long fade-in (~1.2s). The hum is always audible. The submarine's lantern is the brightest light source in frame; everything else is in silhouette. There is no weather; the only environmental change between strata is the dominant accent color and the new layered voice in the score.

The atmosphere's job is to make sitting still feel okay. The kid will spend 5–15 seconds staring at an equation; the screen has to *reward that stillness*, not pressure them. No timers, no urgency cues, no enemy "intent" countdowns. The spirit is patient. The math is patient.

### Sample Art

- *Cozy Grove* — for the painterly bioluminescence-against-darkness palette and the emotional safety contract. https://store.steampowered.com/app/1207170/
- *Subnautica: Below Zero* — twilight zone screenshots; reference for "deep ocean is awe, not horror." https://store.steampowered.com/app/848450/
- *Gris* — silhouette readability, palette discipline, UI restraint. https://store.steampowered.com/app/683320/
- *Slay the Spire* — card legibility against a dark backdrop; UI chrome restraint. https://store.steampowered.com/app/646570/

---

## Part 6 — Don't Quit!

### Visualizing Success

It's a Saturday morning. The kid is on the iPad on the couch. The dad is in the kitchen. The kid says "Dad, I beat Drift Hollow without losing any oil." The dad says "show me." The kid runs over with the iPad and replays the last fight by memory, narrating which card went where. They're not *talking about math.* They're talking about Cinder's cousin and Marin's lucky run. The dad has built a thing his kid is proud of, and the kid has done third-grade arithmetic for forty straight minutes without anyone calling it that. The codex has thirty-six entries. The dad opens the laptop on Monday night and adds spirit number thirty-seven.

### Visualizing Failure

The kid plays it twice and gets bored. The dad ships it anyway because the *building of it* was the thing that made the build pipeline real. The dean-stack monorepo is now load-bearing for the next idea. Nobody sees Hadal Tide except the kid and his cousins on Christmas. That is fine. The architecture survived; the love letter was sent; the kid knows the dad made something for him. Failure here is a footnote in a longer project. *I can ship this and have it be played twelve times and it will still have been worth doing.*

### Scope

| Field | Value |
|---|---|
| **Hourly Rate** | Hobby project — opportunity cost of senior engineer time, ~$150/hr if billed. |
| **Hours to Complete** | Ballpark: 12 weekends × 6 hours = ~72 hours to first playable; +60 hours to feature-complete = ~130 hours. |
| **Total Hourly Cost** | ~$19,500 in opportunity cost. |
| **Other Cost — Assets** | $0–$300. CC0 sound effects, hand-drawn or AI-assisted spirit silhouettes, free fonts. Keep at zero if possible. |
| **Other Cost — Localization** | $0. English only. |
| **Other Cost — PR** | $0. Audience is one boy plus his cousins. |
| **Total Game Cost** | ~$19,800 opportunity, ~$300 cash. |

Reality check vs. AAA: *Hades* cost $5–10M. *Slay the Spire* cost ~$200K + 3 years of two-person time. *Prodigy Math* is a venture-backed product with hundreds of staff. We are at 0.001% of any of those budgets, which is correct — we're building a hand-authored single-player roguelite-lite for one player. **Scope is honest.** If multi-Guide or a sixth stratum doubles the hours, *cut the sixth stratum.* The first five-stratum complete loop is the ship target.

---

## Part 7 — Prototype Extension

**Primary Mechanic (pasted from Part 3B):** Drag-to-balance an equation against a target.

**Extension Ideas**

- **Side-flip equations** — `N + x = M` instead of `x + y = N`, the unknown moves to the operand side. (This is the Drift Hollow stratum — the first scheduled escalation.)
- **Operator escalation** — `+` → `−` → `×` → mixed-operator equations. (Stratum 3 onward; already accommodated by `OperatorSchema` in the existing code.)
- **Variable operand count** — 2 operands → 3 operands → 4 operands. (`EquationSchema.operandSlots` is already `array().min(1)` — n-ary by construction; no schema change needed.)
- **Hand-size growth** — 5 cards → 6 → 7. Requires a `HAND_SIZE` change from constant to per-stratum config. *(Implementation note: the existing `HAND_SIZE` constant in `packages/schemas/src/adding-game.ts` is `5`; this needs to become a field on `Round` or `PlayerSchema` to support per-fight scaling.)*
- **Disabled-card mechanics** — some cards in hand are "salt-soaked" and locked for the round; player must solve with the remaining cards. The disabled-card visual (red ring) is already implemented in `drag.tsx`. Pure additive content.
- **Combo-equation Choir fights** — three equations in sequence on a shared HP pool; if you fail one, the spirit's HP doesn't reset but the fight continues. Already accommodated by the round phase machine.
- **Solve-for-target equations** — the *right side of the equals sign* is the unknown. The player drags a card into the target slot. The hardest variant; reserved for The Hum boss. *(Implementation note: today the target card is non-draggable per `deal.ts`; this needs `EquationSchema.target` to become a slot rather than a fixed card.)*
- **Per-Guide passive equation hints** — Marin shimmers a valid card; Brass disables an obviously-wrong card. Requires a `Guide` schema and a per-Guide-passive registry.
- **Spirit "intent" preview** — the spirit telegraphs which equation shape is incoming, so the player can mentally prepare. (StS-style intent.) Optional, low-priority.
- **Reveal-the-codex meta-progression** — the codex page for an unreleased spirit shows a question-mark silhouette with the equation shape it will sing, as a tease. Pulls the player toward the next descent.

---

## Part 8 — The Schedule

**Launch Date:** Hobby cadence — no calendar deadline. Target: a complete five-stratum playable build before end of summer 2026 holiday, so the kid has it during a long break. Weekly sub-milestones; ship-when-ready, not by date.

> **Designer note:** The user did not provide a launch date and explicitly framed this as a hobby project. I'm declining to invent one. The milestones below are *ordered*, not *dated* — each gates on a green `bun run check` per the dean-stack working agreement.

### Milestones

| # | Milestone Description | Completion Deadline |
|---|---|---|
| 1 | **Enemy data model** — extend `packages/schemas/src/adding-game.ts` `EnemySchema` with `hp`, `maxHp`, `element`, `defeatedAt`. Add `Spirit` content schema (id, name, element, equation-shape, codex copy). Migrate IDB. | When `bun test` passes for the new shape and the existing route still mounts. |
| 2 | **HP loss model + Evaluate damage** — wire `evaluateRound`'s `RoundOutcome` to apply damage to player on miss (via formula `|computed − expected|` capped) and to enemy on hit. Add `playerHp` / `enemyHp` to atom; persist. | When a Storybook story exists demonstrating both outcomes and Playwright story test passes. |
| 3 | **Lantern (HP bar) UI + Spirit (left col) presence** — Pixi-rendered HP bars, anime.js shake on damage, fade-in spirit silhouette. Reduced-motion honored. | When the Pixi-mounted HP-bar component has its own story + test. |
| 4 | **Equation-shape escalation engine** — refactor `dealRound` to take an `EquationShape` config (operator, operandCount, unknownPosition, handSize, valueRange). One file per shape under `apps/web/app/games/adding-game/shapes/`. | When grade-1 (`x + y = N`) and grade-1.5 (`N + x = M`) both deal correctly under unit tests. |
| 5 | **Stratum/depth-map progression** — `StratumSchema` with ordered list of fights; `DescentStateSchema` tracking which fights are cleared. Map screen between fights. | When the player can clear two fights in sequence and the second uses a different equation shape from the first. |
| 6 | **Multi-Guide party (5 avatars)** — `GuideSchema`, per-Guide IDB-persisted state, right-column avatar swap UI, Guide-goes-quiet logic. (See verdict below.) | When two Guides are playable and the active-Guide swap is locked during a fight. |
| 7 | **Spirit Codex + cosmetic unlocks** — codex screen, treasure-fragment economy, lantern cosmetic shop. Pure cosmetic. | When clearing a spirit adds a codex entry and unlocks one fragment that can be spent on a paint. |
| 8 | **Audio layering engine** — five layered ambient tracks, per-stratum mix, spirit-defeat stinger. | When at least Magma Reef has its track and the layering test passes (Playwright with audio assertion or manual). |
| 9 | **The Hum boss + endgame song reveal** — three-phase boss fight, song-line reveal screen, post-credit "new Guide cosmetic" unlock. | When a single-session run can reach and defeat the Hum on grade-1 difficulty. |
| 10 | **PWA + offline polish** — Workbox precache verified for all spirit assets, deep-link offline test green, iPad LAN deploy verified, kid plays it on the couch. | When the kid plays the offline build on a Saturday morning and asks for "one more dive." |

### Multi-Guide Party — Verdict

**Commit to it.** Build it as Milestone 6, after the single-Guide vertical slice (Milestones 1–5) is shippable and green.

Rationale: the right column of the existing layout already exists for "the player's avatar / profile" and the user explicitly mentioned multiple portraits cycling with persistent profiles. Cutting it would orphan the layout. *But* — five fully-distinct Guides with five passive abilities is scope-creep. **Phased rollout:**

- **Phase A (Milestone 6):** Five Guides as *cosmetic-only* portraits with persistent IDB profiles. No mechanical differentiation. This is the version that unlocks "my brother and I both have saves." Cheap to build.
- **Phase B (post-launch, content-pack #1):** Per-Guide passives. One Guide at a time. Cinder-passive ships first; iterate.
- **Cut criterion:** if Phase B's first passive requires a refactor of the deal/swap/evaluate trio, *cut Phase B and ship cosmetic-only Guides forever.* The five-portrait roster is still meaningful as save slots.

> **Designer note:** This is the most opinionated call in the document. The user said "unconfirmed but worth designing toward." I am converting that to "ship a thin version always, ship a thick version only if cheap." The thin version preserves the layout and the per-kid save promise; the thick version is dessert.

---
