# Subtraction, Ordering, and Synesthesia
### Designing for Asana — a Hadal Tide design memo

---

## How to read this doc

This is a design memo, not a spec. It's for the parent (you) — the only person shipping code into Hadal Tide — and it argues a single thesis: **Asana's subtraction problem is an ordering problem, and ordering problems are best solved by moving the order out of working memory and into the world**.

Read it top-to-bottom once. Then come back to **Section 5** when you're ready to implement, and to **Section 6** when you're choosing what to build first. Section 7 is the "do not build this" list — read it before you accept any tempting feature request from yourself, your kid, or a friendly LLM. Section 8 is the open-question stack: things to playtest with Asana before locking anything in.

Every pattern is named, scoped, and tagged with a one-line implementation note tied to the dean-stack (Pixi v8, anime.js v4, Web Audio, Jotai/IDB). You should be able to skim the bold lines in Section 5 and pick up the gist without reading prose.

---

## 1. The diagnosis, restated

You said three things, and they fit together cleanly:

1. **Subtraction failure is downstream of an ordering bottleneck**, not a numeric one. He can compute, but he loses track of *which step he is on*.
2. **Brute force is the failure mode** — when the order falls out of working memory, he reaches for guess-and-check, and guess-and-check teaches the wrong loop.
3. **Cross-modal externalization** (sound, color, position, rhythm) is the intervention vector you're excited about.

Here is the specific cognitive shape this takes inside the existing `adding-game`:

In addition (`a + b = N`), order does not matter. `3 + 7 = 10` and `7 + 3 = 10` are interchangeable, so the equation slate has *two slots and one decision* — pick any pair that adds to N. Asana can solve this by trial-and-error with no penalty: he tries pairs until the green ring confirms one, and the world rewards him.

In subtraction (`a − b = N`), order is the entire problem. `7 − 3 = 4` is right. `3 − 7 = -4` is wrong. The two slots now carry *two roles* — minuend and subtrahend — and the kid has to (a) pick a pair, *and* (b) decide which card goes in which slot, *and* (c) hold the rule "the bigger one goes first" alongside the actual digits. That's three things in working memory at once. For a kid whose ordering scaffolding is the brittle part of his cognition, this is the exact load that snaps the wire.

When the wire snaps he does what every kid does: he brute-forces. He drags a card into slot 1, then drags any other card into slot 2, taps Evaluate, sees the red, drags again. This *masquerades as engagement* — he is touching the game — but it's the wrong loop. He's not modeling the equation; he's running a search. The synesthetic intervention has one job: **to make the order so present in the room that he cannot forget it, even if he wants to**.

---

## 2. The design principle

> **Order belongs in the world, not in his head.** Every dimension of the equation that imposes working-memory load — *which slot is which*, *what role each slot plays*, *what step of the sequence we are on* — gets a redundant cross-modal anchor: spatial position **and** color **and** sound **and** weight-of-motion. He should be able to look away from the digits and still feel which slot is the minuend.

This principle ladders directly into the Hadal Tide bible:

- **Cook's Humanistic era**: the experience we are engineering is *the kid feeling competent at subtraction without being patronized about it*. Synesthesia carries the cognitive load so he gets to feel like the hero, not the patient.
- **Koster's pattern-learning**: the synesthetic anchor is a **second pattern** layered on the equation. He learns "this side hums lower" before he learns "this side is the bigger number," and the second insight sneaks in on the back of the first.
- **Cook's Skill Atom**: the anchor turns a single hard skill atom (read-and-order-an-equation) into a chain of two easy ones (read-the-room → read-the-equation). Easier skill atoms compose; brittle ones break.
- **Schell's lens of the senses**: most edu-math products commit the sin of being *visually busy and audibly silent*. The trench gives us bell-tones, water-pressure, and bioluminescent breathing for free — refusing to use them would be malpractice.
- **The Kind Game contract**: a synesthetic anchor is a *gift to the player*, not a hurdle. We are not gating progress on whether he can read the chime; we are *giving him the chime as a backup channel for the brain that's tired*.

**The single sentence to defend at every design meeting**: *if he closes his eyes, he should still know which slot is which.*

---

## 3. What the Hadal Tide world gives us, for free

Before prescribing patterns, here's the synesthetic vocabulary already in the bible we get to draw from. Every pattern below uses these as ingredients, never invents new ones:

| Dimension      | Anchor we already have                                          | Free for ordering use? |
|----------------|-----------------------------------------------------------------|------------------------|
| **Pitch**      | Layered ambient hum (one voice per stratum)                     | Yes — pitch maps cleanly to magnitude |
| **Color hue**  | Vellum cards, abyss navy bg, stratum accents, Lumen Teal "valid"| Yes — slot-as-color is read instantly |
| **Brightness** | Bioluminescent breathing at ~0.2Hz                              | Yes — pulse can carry "you are here" |
| **Position**   | Card slots are already left/right on the slate                  | Yes — directional reading order |
| **Weight**     | Card friction wobble, press tilt, snap                          | Yes — heavier card = bigger number |
| **Rhythm**     | Captain Tern's radio cadence, deal animation timing             | Yes — tempo signals sequence |
| **Texture**    | Vellum (warm), brass (chrome), bioluminescent (cool)            | Sparingly — already overloaded |

**What we do not have, and should not invent**: haptics (no iPad web haptics on Safari iPadOS), real spatial audio (browser stereo only — fine for L/R but we won't do height), and stylus pressure (touch-only). Patterns below don't depend on these.

---

## 4. Ordering, sequencing, and "which step am I on" — the three problems behind one symptom

Subtraction in this game asks the kid to do three different *kinds* of ordering, and a 7-year-old fuses them into one undifferentiated "I'm stuck." Naming them separately is how we design separately for them.

| Problem                  | What the kid is actually doing                          | Where it shows up first       |
|--------------------------|---------------------------------------------------------|-------------------------------|
| **Slot ordering**        | "Which slot is the minuend? Which is the subtrahend?"   | Equation slate, mid-drag      |
| **Magnitude ordering**   | "Which of my five cards is the bigger number?"          | Hand, while choosing          |
| **Step ordering**        | "What am I supposed to do next? Pick? Place? Evaluate?" | Whole-screen, when he's stalled |

Most "math game UX" attacks problem 2 (magnitude) and ignores problems 1 and 3. The Hadal Tide existing hint system mostly addresses problem 2. The bottleneck the parent described — *order, sequencing, which-step-am-I-on* — is dominantly problems 1 and 3. **The patterns below are weighted toward 1 and 3 on purpose.**

---

## 5. The patterns

Eight patterns, each with the same shape: the ordering problem it solves, the beat-by-beat interaction, the synesthetic mapping, the focus-recovery behavior, the reduced-motion / muted fallback, and the dean-stack implementation note.

### 5.1 The Lantern Slate — slots that *are* their role

**Solves:** Slot ordering. The kid never has to remember which slot is the minuend; the slot is *visibly, audibly, structurally* the minuend.

**Beat-by-beat:**
1. The equation slate renders two slots, but they are *not visually identical*. Slot 1 (the minuend, left) is rendered as a **brass-rimmed bowl** with a soft warm glow under it, sitting *low* on the slate. Slot 2 (the subtrahend, right) is rendered as a **smaller brass cup** with a cool glow, sitting *higher* on the slate. The operator (`−`) sits between them, drawn as a small lantern-chain link.
2. Above slot 1, a one-word lantern-stenciled label reads **"BIG"**. Above slot 2, **"TAKE"**. Above the target, **"LEFT"**. (Three words, no full sentence: "the BIG one, TAKE this many, this many LEFT.")
3. When the round deals, the slots breathe in sequence — slot 1 pulses warm once (~400ms), slot 2 pulses cool once, target pulses teal once. A low-mid-high three-note bell cadence plays alongside the pulses (C4, E4, G4, ~120ms each). This is the *step-order overture*: every round opens with the slate teaching the kid the order it expects.
4. While the kid drags a card, only the slot whose role *fits* glows. If he picks a card and hovers over the wrong slot first, the slot dims slightly — not a red error, just a quiet "not me." When he finds the slot whose role fits, that slot's glow brightens.

**Synesthetic mapping:**
- *Position* — left/down = bigger, right/up = smaller. Reading direction matches subtraction direction.
- *Color* — warm (low-frequency wavelength) = big, cool = small.
- *Pitch* — low note = big slot, high note = small slot. (Same direction as color.)
- *Word* — "BIG / TAKE / LEFT" replaces algebraic role names with kindergarten-grade verbs.

**Focus-recovery:** If the kid drops a card into the *wrong* slot (small in slot 1, big in slot 2 — physically possible, just produces a negative computed value), the slate doesn't error. Instead the slate's two slots **trade their pulses** for one cycle: the small card's slot now hums low and warm, the big card's slot hums high and cool, and the slate's bottom edge glows with a single line of text: *"feels backwards."* No red. No retry pressure. He has 5+ seconds to swap them; the slate is doing the thinking.

**Reduced-motion / muted fallback:** The pulse becomes an **immediate static color difference** (warm/cool) and a **persistent label** ("BIG" / "TAKE"). The chime is paired with a brief *visible ripple ring* on the slot that fired, so a muted iPad still sees the order anchor. The "feels backwards" hint becomes a single static line instead of a glow.

**Dean-stack implementation:** Pixi `Container` per slot with a `Graphics` for the brass rim and a `BitmapText` for the label. Anime.js timeline drives the deal-overture pulse sequence. Web Audio `OscillatorNode` (sine, brief envelope) for the chime triplet. Slot pulse state lives in plain `useState` (ephemeral); the *labels* and the *role-to-slot mapping* live in `EquationSchema` (Zod) so they survive a hot reload.

---

### 5.2 The Weighing-Hand — magnitude order felt as weight

**Solves:** Magnitude ordering. "Which of my five cards is the bigger number?" becomes a tactile question instead of a digit-comparison question.

**Beat-by-beat:**
1. While the kid is *holding* (press-down, not yet dragging) any card, the four other cards in his hand subtly *react to it* — cards with *smaller* values lift slightly upward (like they're lighter than the held one); cards with *larger* values sink slightly (heavier). The held card itself stays put.
2. The reaction is small — 2–4px of vertical translation — but visible. It only fires while a card is held and the round's operator is `−`.
3. As the kid sweeps his finger across the hand without lifting, each card he passes over briefly *glows in proportion to its magnitude* against the held card: cool-cyan glow for cards smaller than held, warm-amber for bigger. This is the **magnitude compass** — it tells him the relative size of every card without him having to read any digits.
4. When he finally drags a card to slot 1 ("BIG"), the chosen card *settles heavier* — slightly bigger snap, slightly lower bell pitch. When he drags one to slot 2 ("TAKE"), it settles lighter — smaller snap, higher pitch.

**Synesthetic mapping:**
- *Position-of-others* — bigger-than-held cards sink, smaller rise. Magnitude = vertical position relative to the touched card.
- *Color* — warm = bigger than the reference; cool = smaller.
- *Pitch* — placement chime pitch reflects the magnitude relationship.
- *Weight (motion)* — bigger cards snap with more friction.

**Focus-recovery:** If the kid has been holding a card for >3 seconds without moving, the *biggest* card in his hand pulses warm twice and the *smallest* pulses cool twice. The screen is whispering "here are the extremes" without telling him the answer. If 6 seconds pass with no progress, Captain Tern's radio crackles once: *"the big one first."* (Tern's voice line — never patronizing — is the only verbal nudge in the whole pattern.)

**Reduced-motion / muted fallback:** The vertical translation is replaced by a **static badge in the corner of each card** showing a `>` or `<` glyph relative to the held card. The chime is replaced by a brief border-color flash on the slot. The Tern voice line is muted but the same words appear as a single line above the slate.

**Dean-stack implementation:** Pixi cards already exist as scene-graph nodes; the magnitude reaction is a Pixi ticker callback that interpolates each card's `y` toward a target offset based on `held.value − card.value`. Anime.js drives the pulse cycles for stalled-state nudges. Web Audio for the placement chime — a single `OscillatorNode` per placement, pitch a function of magnitude. Held-card state lives in `useState`; the magnitude-compass *enabled* flag is a per-Guide setting in IDB so a parent can toggle it off if it ever becomes a crutch.

---

### 5.3 The Three-Bell Cadence — step ordering as a phrase

**Solves:** Step ordering. The kid is never confused about *what to do next*, because the screen is playing a three-beat phrase that has only one place to put each card.

**Beat-by-beat:**
1. The round opens with a three-bell phrase: low bell (slot 1), mid bell (slot 2), high bell (target). Three notes, ~120ms each, total under half a second. The phrase is the round's *intro music*.
2. As the kid places each card, *that bell rings again* — slot 1 placement plays the low bell, slot 2 plays the mid, target placement plays the high. The *unfilled* bells continue their soft drone in the background, slightly louder than the ambient.
3. When all three bells have been "answered" (slots filled), the three notes resolve into a **single major chord** — that's the audible cue that the equation is *evaluable*. The Evaluate button doesn't pulse; the *audio* tells him it's time.
4. After Evaluate: on a win, the chord resolves up a fifth (G → D), shimmer particles fire, spirit takes damage. On a loss, the chord *un-resolves* — drops down a half-step, no shimmer, slate stays put. The chord is the verdict.

**Synesthetic mapping:**
- *Pitch sequence* — the order of the three bells matches the order of the equation roles.
- *Resolution-vs-suspension* — unfinished phrase = unfinished equation, finished phrase = ready to evaluate.
- *Chord direction* — up = right answer, down = wrong answer. This is *culturally universal in Western tonal music*; do not invert.

**Focus-recovery:** If the kid stalls (10s no input), the bell that *would* play next ramps up by ~6dB and pulses. If he *placed a card in the wrong order* (e.g., placed slot 2 before slot 1), the system doesn't disallow it — it plays the bells in the order he placed them. Then, when both slots have a card, it replays the *correct* sequence on top, like a teacher saying "and here's how it goes." A muted iPad gets the same pulse on the slot itself.

**Reduced-motion / muted fallback:** Bells become a horizontal **progress bar of three pips** above the slate. Pip 1 lights when slot 1 is filled, pip 2 when slot 2, pip 3 when target. The "evaluable" cue is the third pip going from cool to warm. Chord-resolution becomes a single line of text: "ready" / "not yet."

**Dean-stack implementation:** Web Audio `AudioContext` shared at the app level. A small `useChord` hook (sibling to `useAnime`) owns the three `OscillatorNode`s and their gain envelopes. Round-bell-state lives in `useState`; the *muted/visual-fallback* preference lives in a per-Guide IDB setting. The chord is computed from the operator + outcome, not stored — pure derivation.

---

### 5.4 The Anchor Drift — "where am I" as an ambient breath

**Solves:** Step ordering, drift-back-to-flow. When the kid is unfocused but not stalled — staring out the window, fiddling with the case — the screen *breathes* in time with the next thing he should do, gently pulling him back.

**Beat-by-beat:**
1. The slate has an **anchor glow** around the *next* unfilled element — slot 1 if empty, then slot 2 if empty, then the Evaluate button if both filled. The glow breathes at ~0.25Hz (the bible's bioluminescent rate), warm and slow.
2. The breath is silent by default. It is a peripheral-vision cue, not an attention-grab.
3. After 8 seconds of no input, the breath gets a *very* faint companion sound — a single bowed-cello note on the same pulse, ~12dB below the ambient hum. (Audible if the room is quiet, inaudible if the iPad is muted or the kid is talking.)
4. After 20 seconds of no input, the breath migrates: the *Captain Tern radio handle* in the top-left starts breathing instead, signaling "ask for help" without nagging. Tapping it surfaces a hint from the existing hints system.

**Synesthetic mapping:**
- *Brightness pulse rate* — slow = "we're still here, no rush." Faster pulses would feel anxious; we deliberately stay at 0.25Hz.
- *Pulse location* — wherever the kid should be looking.
- *Pulse migration* — when help-asking becomes the right next step, the help button is what breathes.

**Focus-recovery:** This *is* the focus-recovery pattern. It does nothing else. The migration to the help button after 20s is the only escalation; we never escalate to red borders, popups, timers, or sound stings.

**Reduced-motion / muted fallback:** The breath becomes a **persistent border** (no pulse) on the next-action target. The migration to the help button becomes an instant tier (border appears on Tern's icon at 20s). The cello note is dropped entirely.

**Dean-stack implementation:** A single `useAnime` hook drives a CSS variable on the document root (`--anchor-glow-target`); each slot subscribes via CSS `@container` queries or a class binding. Pixi-side, the same hook can drive a `Filter` opacity. Idle timer is a `setTimeout` cleared on every input; the timer state is ephemeral (`useState`), but the *idle threshold* is a per-Guide IDB setting (some kids need 5s, some 15).

---

### 5.5 The Number-Line River — magnitude order as a horizontal landscape

**Solves:** Magnitude ordering, *and* gives the kid a place to externalize "where my answer needs to land" for inequality levels (`gt`/`lt`) where the existing hints already do good work.

**Beat-by-beat:**
1. Below the equation slate, a **horizontal river of light** runs left-to-right with tick marks at every integer in the round's `handValueRange`. The target sits as a small **lantern-buoy** on the river at its value — at `target = 7` the buoy is at position 7 on the river.
2. As the kid hovers a card over slot 1, a ghost-image of the card slides along the river to its value's position. As he hovers a card over slot 2, a *second* ghost slides to its position. The two ghosts are connected by a **glowing chain** — the chain's length is the gap (the answer to a subtraction).
3. When both slots are filled, the chain becomes solid. If the chain *exactly* reaches the target buoy, the buoy lights up Lumen Teal. If the chain falls short or overshoots, the buoy stays dim and the chain's far end *points* at where it landed.
4. Evaluate button now has a built-in preview: the kid can see *whether the chain reaches the buoy* before tapping. He's not guessing; he's reading.

**Synesthetic mapping:**
- *Spatial position* — magnitude is x-position on a fixed line. The number system is laid out in space.
- *Length* — the chain's length is the *answer*. He sees the difference, not just the operands.
- *Color* — buoy lights teal at correct, stays dim at wrong. No red — just "not yet glowing."
- *Sound* — when the chain meets the buoy, a soft chime plays. Optional.

**Focus-recovery:** If the chain has been "almost reaching" (within 1 of the buoy) for >5 seconds, the *closer* of the two ghost cards in his hand subtly pulses, suggesting the swap-by-one. This is the only place we directly suggest a swap, and only on near-miss.

**Reduced-motion / muted fallback:** The river becomes a static row of digits with a highlighted target. The ghost-cards become small numbers under the cards in slots. The chain becomes a static bracket spanning the two values. All information preserved; motion stripped.

**Dean-stack implementation:** Pixi `Container` for the river with a `TilingSprite` for the water, `Graphics` for the chain, `BitmapText` for the tick marks, and a small `Sprite` for the buoy. Anime.js drives the ghost-card slide. The river config (range, target position) lives in the existing `EquationSchema`. *No new schema needed*; render-time derivation only.

---

### 5.6 The Patient Slate — the anti-brute-force tax

**Solves:** Brute-force discouragement. Right now, a wrong Evaluate costs HP based on `|computed − expected|`. That's *legible* (per the bible), but the cost is paid *after* he taps. The Patient Slate adds a *small, pre-tap* friction that makes brute-force feel slower than thinking — without ever feeling punitive.

**Beat-by-beat:**
1. The Evaluate button has a **resting state** (dim) and an **attentive state** (bright Lumen Teal). The attentive state activates when both slots are filled.
2. Crucially, the button takes **~600ms to bloom** from resting to attentive after the second slot is filled. This is the Patient Slate's signature — the button is *thinking* with him for 600ms before it lets him tap.
3. During that 600ms, the slate plays a **sealing animation**: the two operand slots and the target slot are connected by a brief brass-chain shimmer that travels left → right. This is the moment the equation *commits*. The kid can still un-place a card during the shimmer (it cancels the bloom and resets); the shimmer is non-blocking.
4. After bloom, the button is tappable. Tapping triggers Evaluate. *No urgency cue ever plays on the button* — no red, no countdown, no "are you sure?".

**Synesthetic mapping:**
- *Time-as-thought* — 600ms is too short to feel like a wait, long enough to interrupt finger-spam.
- *Brass-chain shimmer* — the visual language of "this is sealing" — borrowed from the Hadal Tide chrome.
- *Bloom on the button* — the button waking up as a *gift*, not a permission slip.

**Focus-recovery:** If the kid has tapped Evaluate three times in a row with three different wrong answers (true brute-force signal), the bloom delay extends to ~1.4s on the *fourth* attempt, *and* a hint surfaces from the existing hints system *before* he can tap. He's not blocked; he's just walking through honey for one round. The next correct answer resets the delay to 600ms. **Crucial**: this never blocks him — it just slows the loop until the slower loop produces a thought.

**Reduced-motion / muted fallback:** The bloom is replaced by a **discrete state change** at the 600ms mark — the button is dim, then teal. No shimmer. The brute-force escalation still applies, but visually the button just darkens for the longer 1.4s window.

**Dean-stack implementation:** Evaluate-button-attentive-state is derived state; the bloom delay is a `useEffect` with `setTimeout(600)` cleared on slot changes. Brute-force counter (`consecutiveWrongAttempts`) is a per-round atom field — *and persisted to IDB* so a hot reload preserves the kindness. New schema field: `RoundSchema.consecutiveWrongAttempts: z.number().int().min(0)`.

---

### 5.7 The Operator Theme — every operator has its own soundscape

**Solves:** Operator ordering / context-switching. When the kid arrives at a `−` round after twelve `+` rounds, half his confusion is "wait, what kind of round is this?" The world should *sound* like a subtraction round before he reads anything.

**Beat-by-beat:**
1. Each operator has a **signature ambient bed** layered into the stratum's hum. Addition rounds get a *rising* low-mid drone (it accumulates — additive!). Subtraction rounds get a *sustaining* drone with a slow *decay* tail (it depletes — subtractive!). Greater-than rounds get an *upward arpeggio* repeating at ~8s intervals. Less-than gets a *downward arpeggio*.
2. The operator sigil on the slate (the `+`, `−`, `>`, `<`) is rendered with a **per-operator color and motion**:
   - `+` — vellum-warm, two-pixel breathing pulse, neutral.
   - `−` — slightly *cooler* than `+`, with a tiny "drop" animation that re-fires every 4s (a single pixel falls from the top of the sigil to the bottom).
   - `>` and `<` — arrows tinted to the stratum, with a slow drift in the indicated direction.
3. When the round transitions from one operator type to another (e.g., end of round 6 → start of round 7), there's an **operator-handoff cinematic** — about 1.2s — where the old ambient bed crossfades to the new, the slate's operator sigil dissolves and re-forms, and Captain Tern says one short line: *"new shape."* This is the only between-round narrative beat.

**Synesthetic mapping:**
- *Ambient timbre* — operator is the world's mood.
- *Sigil micro-motion* — operator is also a small visible behavior on the slate, not a static glyph.
- *Color temperature shift* — addition is warm (build-up), subtraction is slightly cool (take-away), inequality is stratum-neutral.

**Focus-recovery:** If the kid solves a subtraction round by *additive* logic (places `3` in slot 1 and `7` in slot 2 trying to make 10, gets a `-4` mismatch), the ambient bed *subtly leans into the subtractive decay* — the next 5 seconds of ambient feature a more pronounced decay tail, and the operator sigil's drop animation fires twice in quick succession. He's being reminded what world he's in, in the language of the world.

**Reduced-motion / muted fallback:** The ambient bed differences are replaced with a **persistent operator-themed border** on the slate — warm for `+`, cool for `−`, directional gradient for `>`/`<`. The handoff cinematic becomes an instant cut. Tern's "new shape" line surfaces as a one-line caption that appears for ~2s.

**Dean-stack implementation:** Web Audio `OscillatorNode` + `BiquadFilterNode` per operator, layered on the existing stratum hum. The `useChord` hook from 5.3 generalizes to manage any number of layered oscillators. Operator sigil micro-motion is anime.js on a Pixi `Sprite`. Crossfade is a single anime.js timeline. *No new schema*; the per-operator config is a static record keyed off the existing `OperatorSchema`.

---

### 5.8 The Codex Replay — turning correct equations into ordered artifacts

**Solves:** Step ordering as *retrospective*, and the relatedness vector. When Asana finishes a fight, the spirit's codex entry doesn't just show the final equation — it *replays* the order in which he placed the cards, with the bells and the synesthetic cues. He gets to *show his dad* what he did, in the order he did it, and the dad sees the kid's actual cognitive sequence.

**Beat-by-beat:**
1. After a spirit is defeated, the codex entry for that spirit gets a small **"how I solved it"** thumbnail — a 3-second animation showing the empty slate, then the cards landing in the order he placed them (with bells ringing on each), then the chord resolving up.
2. The thumbnail is replayable from the codex screen — tap once to play. It's a *trophy*, not a tutorial: the artifact is *his order*, not the canonical order.
3. When the kid solves a *particularly hard* equation (first subtraction win, first inequality win, first 3-operand win), the thumbnail is auto-promoted to the home screen as a "watch this" moment for the next time the iPad is opened. Parent-mediated relatedness without any social server.

**Synesthetic mapping:**
- *Time as artifact* — the order he chose is a *thing he made*, not a thing he failed at.
- *Sound + motion + color* — every cue from the live game is preserved in the replay so his dad sees the same world he saw.

**Focus-recovery:** N/A — this is a post-fight pattern. But: if the kid is in a slump (3+ consecutive losses on the same level), the codex screen *surfaces a previous win replay* on the loss screen as a "you have done harder than this" reminder. The replay is the kindness.

**Reduced-motion / muted fallback:** Replay becomes a static frame showing the final equation with small numbered annotations (1, 2, 3) on the slots in the order he placed them. The chord is replaced by a single line: *"you solved this."* The auto-promotion to the home screen still happens, just as a static thumbnail.

**Dean-stack implementation:** Each round's *placement sequence* gets persisted to IDB as part of the round resolution. New schema: `RoundResolutionSchema` with `placementOrder: z.array(z.object({ slotId: z.string(), cardId: z.string(), placedAt: z.number() }))`. Replay is a deterministic anime.js timeline reconstructed from `placementOrder`. The codex screen reads the array from IDB and renders the timeline. **This is the highest-leverage pattern in this doc** because it produces a parent-shareable artifact for every win.

---

## 6. The recommended starter combo

If you can only ship two patterns first, ship **5.1 (The Lantern Slate)** and **5.3 (The Three-Bell Cadence)**. Here's why.

**Lantern Slate is a one-time investment that pays off forever.** Every existing round and every future round needs a slate. Building the labeled, color-coded, position-anchored slate *once* fixes the ordering problem at the architectural level — every subtraction round Asana ever plays inherits the fix. It's a Pillar-1 win: small components (a slot, a label, a glow) that compose into the slate, each its own Storybook story.

**Three-Bell Cadence is the synesthetic spine.** It's the audio half of the contract. Once you have it, every subsequent pattern (operator theme, codex replay, anchor drift) plugs into the same `useChord` hook. Building it now de-risks everything downstream. And it solves *step ordering* — the "what do I do next" half of the parent's diagnosis — in one stroke.

The two together attack both halves of the diagnosis (slot order via the slate, step order via the cadence) and lay the ingredient-level foundation for all six remaining patterns. **Do not start with the Number-Line River, the Codex Replay, or the Operator Theme** — they are richer but each presupposes the slate and the cadence. Building them first is a refactor magnet.

A reasonable shipping order, if asked:

1. **Lantern Slate** (5.1) — Storybook story per slot variant, then slate composite, then route integration.
2. **Three-Bell Cadence** (5.3) — `useChord` hook + Storybook test harness, then route integration on the slate.
3. **Anchor Drift** (5.4) — cheap; layers on the slate.
4. **Patient Slate** (5.6) — schema bump for `consecutiveWrongAttempts`; smallest mechanical change.
5. **Weighing-Hand** (5.2) — Pixi ticker work; biggest implementation cost. Worth it.
6. **Codex Replay** (5.8) — schema bump for `placementOrder`; depends on the cadence existing.
7. **Operator Theme** (5.7) — once the audio engine is solid.
8. **Number-Line River** (5.5) — nice-to-have; defer until inequality rounds are the bottleneck.

---

## 7. Anti-patterns — do not add these

These are the tempting bad ideas. Each one is named so you can name it and decline it.

- **The "show me the answer" button.** It teaches "I get stuck → I press a button → the world solves it." That's the brute-force loop with extra steps. The hint system already has the right shape: *prompt to think*, never *give the answer*. Do not add a reveal.
- **A timer or count-down on Evaluate.** Asana stalls because his working memory is full, not because he's lazy. Pressuring him with a timer fills working memory *more*. There is no version of "you have 10 seconds" that helps.
- **A streak meter / combo counter.** Streaks teach the kid that the loss is a *break in identity*, not a step in learning. A 5-streak means a single wrong answer feels like losing five things at once. The bible is correct: no streaks.
- **Cheering mascot voice lines on win.** "Great job!!!" is the death of the Hadal Tide tone. Captain Tern's restraint is the voice contract. A spirit shimmering and resting is the celebration.
- **Adaptive difficulty that silently lowers the equation.** If we secretly hand him `1 + 1` after he loses three times on `7 + 8`, he eventually figures it out and the *world stops being trustworthy*. Difficulty should adjust at the *stratum* level (the bible's depth gating), not silently per-round.
- **A "tutorial mode" toggle.** The synesthetic anchors should be *always on* for everyone, with a per-Guide IDB toggle for parents to dim them later if needed. A tutorial mode treats the synesthesia as training wheels; the bible's claim is that the synesthesia is a *gift the kid keeps*.
- **Particles on every interaction.** The bible says motion is purposeful, not decorative. Every particle effect should answer "which ordering question does this resolve?" If it doesn't, cut it.
- **Voice-to-text or "speak the answer."** Tempting cross-modal idea, ruinous in practice — kids speaking out loud is a great signal but a terrible *control method*; iPad ASR fails on 7-year-old voices, and the parent can't iterate it.
- **A second screen / parent dashboard.** "What if the parent sees the kid's fights?" — it's a server feature on a server-less stack. The Codex Replay is the prosocial vector that fits the stack.
- **Confetti.** No.

---

## 8. Open questions — playtest these

Things I'd want to learn from Asana before we lock anything down.

1. **Does the warm/cool slot color difference register, or do we need the labels?** I've assumed labels ("BIG" / "TAKE") are belt-and-suspenders; they may be *the* anchor and the colors are decorative. Test by toggling labels off in a story and watching where his eye goes.
2. **Is 600ms the right Patient Slate bloom delay?** It feels right for an adult; a kid may experience it as a freeze. Tune by watching how often he taps Evaluate during the bloom (treat as a "wanted to evaluate now" signal).
3. **Does the bell cadence work with iPad-muted-by-default?** If 80% of his sessions are silent, the audio half of every pattern is decorative. Record actual mute rate before investing in the audio engine.
4. **Does the magnitude compass (5.2) become a crutch?** If he stops reading digits and only watches the warm/cool glow, we may have built a workaround instead of a scaffold. Watch for this around session 5–6.
5. **Is "bigger first" the wrong rule to teach?** In real curriculum, kids eventually learn that subtraction is non-commutative *and* that you can subtract a bigger number from a smaller one (negative results, eventually). The Lantern Slate's "BIG" label may need a graceful retirement around grade 3. Plan the retirement now.
6. **Does the Operator Theme handoff (5.7) startle him, or orient him?** A 1.2s cinematic between rounds is a flow risk. If it bores him, kill it.
7. **Codex Replay (5.8) — does he actually want to show his dad?** This is the bet of the whole prosocial spine. If he doesn't naturally want to share the replay, the relatedness vector needs rethinking — *not* abandoning, but rethinking.
8. **Is there a pattern we're missing for the *between-fights* moment?** All eight patterns fire during the equation; the descent map is silent. Worth a separate memo.

---

## 9. Schemas implied (Zod-first, IDB-first)

For when you sit down to implement. None of these are large. All extend existing schemas, none replace them.

- **`RoundSchema.consecutiveWrongAttempts: z.number().int().min(0)`** — drives the Patient Slate brute-force escalation. Lives in the existing round atom. Persisted (cheap to lose, but a hot reload mid-round shouldn't reset the kindness).
- **`PlacementEventSchema = z.object({ slotId: z.string(), cardId: z.string(), placedAt: z.number().int().nonnegative() })`** — one entry per card placement in a round.
- **`RoundResolutionSchema.placementOrder: z.array(PlacementEventSchema)`** — the artifact the Codex Replay reads. Written once at evaluation, never mutated.
- **`GuidePreferencesSchema = z.object({ idleNudgeThresholdMs: z.number().int().min(2000).max(30000), magnitudeCompassEnabled: z.boolean(), audioEnabled: z.boolean(), reducedMotion: z.boolean() })`** — per-Guide IDB record so siblings on the same iPad can have different ambient settings. Defaults are forgiving.
- **`SlateRoleLabelSchema = z.enum(["BIG", "TAKE", "LEFT", "ANY", "TARGET"])`** — operator-aware mapping for the Lantern Slate labels. Subtraction uses BIG/TAKE/LEFT; addition uses ANY/ANY/TARGET; inequality uses ANY/ANY/TARGET with a comparator suffix.

---

## 10. The single sentence to tape above your monitor

> ***Order belongs in the world, not in his head. If he closes his eyes, he should still know which slot is which.***

Everything else in this document is in service of that line.
