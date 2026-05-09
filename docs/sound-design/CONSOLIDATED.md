# Sound Design via ElevenLabs — Consolidated Research

The single source of truth for text-to-SFX prompting in dean-stack. Synthesized from the seven source documents in `docs/sound-design/` (`claude.md`, `minmax.md`, `deep-seek.md`, `glm.md`, `google.md`, `perplexity.md`, `grok.md`) into one non-overlapping, non-conflicting reference.

The skill `sound-design` uses this document as its operating manual. The command `/sfx` is the executor that hits the `mcp__elevenlabs__text_to_sound_effects` tool. Read this before authoring any prompt.

---

## TL;DR — the load-bearing principles

1. **Treat AI text-to-SFX as Foley-by-prompt and ambience-by-prompt, not as a one-shot scene composer.** Single-event sounds (impacts, UI, whooshes, single Foley moves, looping ambient beds) are where the model shines. Multi-event sequences ("man opens door, walks across floor, falls down stairs") produce mush — split into single sounds and assemble in a DAW.
2. **Write prompts as captioned-audio sentences, not as screenplays.** The model was trained on captions of the form `[source] + [action] + [environment]`. Mirror that. 10–60 words. Concrete physical-world causal language ("old wooden door creaks open in a cathedral, slow"); never abstract narrative ("the door of betrayal opens").
3. **Six descriptive slots, in this order**: `[Source/Object] + [Action/Articulation] + [Material/Timbre] + [Environment/Acoustics] + [Temporal/Dynamic shape] + [Production/Mood modifier]`. Two slots can be omitted for short impacts; all six should be filled for ambiences and cinematic hits.
4. **Iterate by changing one axis at a time** at prompt-influence ~30%. Bump to 40–60% only when the prompt is precise. If output sounds synthetic, drop influence to 20–25% and add "naturalistic / Foley / field recording".
5. **Layer in a DAW. Don't ask one prompt to do a scene.** Generate base ambience + 1–3 accents + transients separately, glue them with shared reverb and matched EQ.

---

## The Six-Slot Framework (canonical) — and how every other framework maps to it

Every source document describes the same underlying framework with different slot counts and labels. The six-slot template is the canonical superset; the rest are aliases or subsets.

| Slot | Question it answers | Synonyms across sources |
|---|---|---|
| 1. **Source/Object** | What is producing the sound? | "Subject" (perplexity), "Object" (glm/OMES), "Source" (grok/deep-seek/google), "Lens of Acoustics" (minmax) |
| 2. **Action/Articulation** | What is happening to it? | "Action" (most), "Action/Motion" (glm), "Verb" (perplexity) |
| 3. **Material/Timbre** | What is it made of? What's its sonic color? | "Material" (deep-seek/glm), "Texture" (grok), "Lens of Evocation" timbre (minmax) |
| 4. **Environment/Acoustics** | Where does it live? What space shapes it? | "Space" (deep-seek/grok), "Environment" (most), "Reverb" (glm) |
| 5. **Temporal/Dynamic shape** | How does it evolve over time? | "Structure/ADSR" (glm), "Dynamics" (grok), "Morphology" (minmax), "Envelope" (perplexity) |
| 6. **Production/Mood modifier** | What should it feel like? What style? | "Hue" (deep-seek), "Intent" (grok), "Lens of Narrative" emotional intent (minmax) |

**Other named frameworks, mapped:**

- **SMASH** (deep-seek) = Source / Material / Action / Space / Hue → slots 1, 3, 2, 4, 6 (no temporal slot — add it)
- **OMES** (glm) = Object / Material / Environment / Structure → slots 1, 3, 4, 5 (action and mood folded in — make explicit)
- **AOE** (deep-seek) = Action / Object / Environment → slots 2, 1, 4 (a starting baseline; add 3, 5, 6 to upgrade)
- **Three Lenses** (minmax) = Acoustics / Evocation / Narrative → groups slots {1,2,3} / {3,5} / {4,6} (use as a mental checklist, not as the prompt structure)
- **Four Pillars** (perplexity) = Subject + Adjectives + Verb + Environment → slots 1, 3, 2, 4 (add 5 and 6)
- **Source-Action-Material-Space-Dynamics-Intent** (grok) = ≈ the six-slot template with different labels

**Bottom line:** if you fill all six slots, you satisfy every framework in the corpus.

### Two structural approaches (when to lead with what)

- **Object-first** — start from the source object/event, then describe environment and mood. Best for impacts, Foley, mechanical sounds, weapons, UI. Recommended default for SFX.
- **Scene-first** — start from the environment, then list elements. Best for ambiences, room tones, weather, biomes. Example: *"Nighttime tropical rainforest soundscape: distant rolling thunder, light steady rain on broad canopy leaves, intermittent insect chirps and one distant frog, faint wind movement through high foliage, hi-fi natural recording."*

---

## Theoretical canon, operationalized for prompts

These give you the **vocabulary** to drop into prompts. Treat the theorist names as mnemonic scaffolding for *you*; the model understands the descriptors because those words appear in audio captions, not because it understands the theory.

**Pierre Schaeffer — sound object & TARTYP.** Classified sounds by *mass* (definite/complex/variable/unpredictable pitch) and *facture* (formed sustainment, impulse, formed iteration, redundant, unpredictable). The three centre cells correspond to the three most common SFX morphologies: drones/pads (formed sustainment), hits/impacts (impulse), rhythmic textures (formed iteration).
- *Mass language for prompts*: "complex inharmonic spectrum", "noise-like", "pitched sustained tone".
- *Facture language for prompts*: "impulse", "sustained drone", "rhythmic iteration", "unpredictable bursts".
- *Reduced listening* = listening to sonic qualities independent of source — write *to* this when the sound is meant to be evocative, not literal.

**Denis Smalley — spectromorphology.** The working language for time and shape.
- *Three temporal phases*: **onset → continuant → termination**.
- *Three archetypes*: **attack-impulse** (single staccato hit), **attack-decay** (impulse + resonance — closed if quick decay, open if slow), **graduated continuant** (slow onset, sustained body, slow termination — pad, wind).
- *Motion & growth*: ascent, descent, plane, bi/multi-directional, cyclic, reciprocal, centric.
- *Texture motion*: streaming, flocking, turbulence, convolution, granular.
- *Gesture↔texture spectrum*: gesture-heavy sounds want short clips with clear onset/termination; texture-heavy sounds want long, looping clips. **This is the single most useful axis for choosing duration.**

**R. Murray Schafer — soundscape theory.** Three categories give you a layering hierarchy for ambiences:
- **Keynote** — background fundamental, often unconscious (refrigerator hum, traffic).
- **Signal** — foreground attention-grabber (bell, siren, horn).
- **Soundmark** — community-unique sound (Big Ben, NYC steam pipes).
- **Hi-fi soundscape** (clear S/N, distinct events, often natural) vs **lo-fi** (broadband noise, masking, often urban) — both are usable as prompt modifiers.

**Bernie Krause — soundscape ecology.** Three sources to plan layers around:
- **Geophony** (non-biological natural — wind, water, geological).
- **Biophony** (organisms — birdsong, insects, frogs, marine).
- **Anthropophony** (human-made; sub-categorised as controlled — music, speech, theatre — and incoherent/technophony — machinery, traffic).
- *Acoustic niche hypothesis*: species partition frequency and time so as not to mask each other. **Prescriptive use when layering**: deliberately give each generated layer a different frequency band and rhythmic density.

**Michel Chion — audio-vision.** Most directly useful concepts:
- *Three listening modes*: **causal** ("metal scraping on concrete" — for diegetic SFX), **reduced** ("dense low-frequency drone with granular texture" — for abstract design), **semantic/codal** (sparingly — models don't understand "a sound that says danger" well, but they do understand "low rising menacing drone").
- *Acousmatic* — sound without visible source. Text-to-SFX is acousmatic by construction; the prompt does the causal work the absent image would have done.
- *Synchresis* — the involuntary perceptual welding of synchronous sound and image. You can lean on synchresis when synced to picture even if the sound is approximate.
- *Vococentrism / rendered sound* — prompt for the *felt* sound, not the literally accurate one.
- *Added value* — the expressive surplus a sound brings to an image. Prompt for added value, not literal reproduction.

**Walter Murch — encoded vs. embodied; worldizing; the Law of Two-and-a-Half.**
- *Encoded↔embodied spectrum*: encoded (language, dialogue — left-brain, requires decoding) vs embodied (music — pure perceptual, no decoding). SFX float between. **Practical**: dialogue-adjacent SFX (intelligible bells, machine speech, R2-D2-like beeps) → centre and dry. Embodied/textural SFX (drones, ambiences, score-like braams) → wide and wet.
- *Worldizing* — render the AI clip, play it through a small monitor or phone speaker in the actual target room, re-record. Perfect post-processing step for AI SFX that sound "too clean".
- *Law of Two-and-a-Half* — three or more layers of the same "color" congeal into one perceptual mass; sounds from different colors stack much more freely. **Stack at most 2–3 same-category AI generations.**

**Randy Thom — "Designing a Movie for Sound."** "Starving the eye of information forces the brain to use the ear for information." At prompt level: **starve the prompt of generic visuals and the model leans on audio specificity.** Sound design is a *context* problem before it is a *sounds* problem.

**Ben Burtt — found-sound philosophy.** Burtt built the lightsaber from a film-projector idle plus broken-TV feedback, the blaster from striking a guy-wire, R2-D2 from his own vocalisations through an ARP 2600. **Transferable principle**: describe a *real-world causal source* even for fictional sounds ("metallic guy-wire being struck with a hammer, slowed down, with electric hum") rather than asking for the fictional thing directly ("blaster shot"). Models have far more training data on real causal sources than on movie-specific synthetic effects.

**Foley conventions.** Standard taxonomy:
- **Feet** — footsteps, runs, landings, varied by surface and shoe.
- **Moves/Cloth** — clothing rustle, body movement, gear, armour, straps.
- **Specifics/Props** — object handling, doors, glass, keys, papers, weapons.

**Universal Category System (UCS) v8.2** — the industry-standard sound-library taxonomy. 82 main categories, 750+ subcategories. Examples: WATR (Water), METL (Metal), ELEC (Electricity), VEH (Vehicles), AMB (Ambience), FOOT (Footsteps). Filenames follow `CatID_FXName_CreatorID_SourceID.wav`. **You don't need to replicate the filename string in a prompt, but leading with the UCS top-level category dramatically improves the model's ability to locate the right latent space**, because that taxonomy is exactly what was in the training-data captions:

> *"Category: METAL. Subcategory: Stress. Groaning, high-tension creak of a thick steel bridge support under immense weight."*

---

## Descriptor vocabulary (deduped, working dictionary)

A checklist — you don't need every category in every prompt. Pick the slots that matter for the sound at hand.

### A. Acoustic / physical primitives
- *Frequency*: low / sub-bass / low-mid / mid / high-mid / bright / airy; pitched / unpitched / inharmonic / noise-like; specific Hz when it matters ("60 Hz hum", "around 2 kHz").
- *Amplitude / dynamics*: quiet / loud / swelling / decaying / transient-heavy / smooth; "soft", "thunderous", "subtle", "explosive".
- *Timbre*: bright / dark / warm / cold / hollow / dense / thin / fat / metallic / wooden / glassy / vocal-like / breathy / nasal / gritty / smooth / silky / shrill / mellow / muddy.
- *Envelope (ADSR)* — controlled by temporal language in the prompt: "sharp transient", "with long resonant tail", "no decay", "slow swell", "blooming attack".

### B. Spectromorphological (Smalley)
- *Archetypes*: attack-impulse, attack-decay (closed/open), graduated continuant.
- *Onset*: sudden, attack-led, gradual, emergent, anacrusic.
- *Continuant*: sustained, iterative, granular, turbulent, pulsating.
- *Termination*: closed, open, decaying, fading, ruptured, abrupt.
- *Motion*: ascending, descending, planar, bi/multi-directional, cyclic, centric, reciprocal, convex, concave, divergent, convergent, streaming.
- *Texture*: streaming, flocking, convolution, turbulence, granular.
- *Behaviour*: dominant/subordinate, conflict/coexistence, voluntary/pressured.

### C. Schaefferian (mass × facture)
- *Mass*: definite pitch, complex pitch, slightly variable, unpredictable, noise.
- *Facture*: formed (sustainment / impulse / iteration), redundant, unpredictable.

### D. Schafer / Krause (soundscape)
- *Schafer*: keynote, signal, soundmark; hi-fi vs lo-fi.
- *Krause*: geophony, biophony, anthropophony, technophony.

### E. Material descriptors (the most important slot for ElevenLabs)
- *Solids*: metal (steel/iron/aluminium/brass/copper/tin/rusted iron/polished steel), wood (hardwood/softwood/hollow/dry/damp/oak/aged), stone (granite/marble/sandstone/concrete), glass (thin/thick/tempered), plastic, ceramic, rubber, leather (taut, wet).
- *Granular/loose*: gravel, sand, dirt, snow, dry leaves, wet leaves, broken glass shards.
- *Fluids*: water (still/flowing/dripping/splashing), oil, mud, slush, blood.
- *Soft/organic*: cloth, fur, flesh, foliage, paper, cardboard, dense foam, brittle plastic.
- *Composite descriptors*: "metal-on-metal", "wood-on-stone", "wet leather", "dry brittle", "hollow", "dense", "porous", "resonant", "deadened".

### F. Spatial / acoustic descriptors
- *Mic perspective*: close-mic'd, ORTF, mid-distance, distant, far-field, lavalier-on-body, boom overhead.
- *Acoustics*: dry / reverberant / wet; small room / medium room / large hall / cathedral / cave / tunnel / outdoor open / outdoor wooded / underwater / muffled / through-the-wall.
- *Specific spaces*: "in a stairwell", "in a small padded studio", "across a wide canyon", "in a tiled bathroom", "in an underground parking garage", "in a vast empty concrete cavern".

### G. Temporal descriptors
- One-shot / impact / hit / staccato; sustained / drone / bed / pad; looping / cyclic / pulsing / rhythmic; sudden / gradual; rising / falling; build / release / swell / drop; "starts X then becomes Y"; accelerando, ritardando, tremolo, glissando.

### H. Emotional / affective (use sparingly — *one* modifier is usually enough)
- Menacing, ominous, foreboding, eerie, uncanny, unsettling, anxious, urgent, frantic, aggressive, violent, brutal, tense, suspenseful.
- Serene, calm, peaceful, intimate, warm, comforting, gentle.
- Playful, whimsical, cute, satisfying, crisp, clean.
- Epic, cinematic, heroic, triumphant.
- Sad, melancholic, lonely, desolate.

### I. Reference / style
- *Genre-style*: "in the style of an 80s sci-fi film", "synthwave UI", "classic Foley recording", "60s spaghetti western".
- *Production-style*: lo-fi / hi-fi / vintage / modern / pristine / gritty / processed / raw / overdriven / distorted / clipped; "tape-saturated", "vinyl-crackled", "8-bit", "broadcast-clean".
- *Caveat*: highly copyrighted reference (specific film titles, proper nouns) over-fits and introduces artifacts on Riffusion/Suno-style models. On ElevenLabs SFX, neutral genre-style descriptors work better than IP names.

### J. Layering language
- Foreground / midground / background; primary / secondary / tertiary; base layer / accent / transient; "with subtle … in the background"; "punctuated by occasional …".

### K. Production / engineering
- "EQ'd bright", "low-pass filtered", "compressed", "with reverb tail", "stem", "loop", "one-shot", "transient sample", "44.1 kHz", "stereo", "mono"; BPM and key when generating musical SFX ("88 bpm in F# minor").

### L. Onomatopoeia (use sparingly, *with* descriptive language — never replacing it)
- whoosh, swoosh, swish, whip; thud, thump, thunk, slam, smack, crack, crunch, clang, clank, clatter; sizzle, hiss, fizz, crackle; boom, bang, blast; ding, chime, ping, pluck, tick, click, beep; rustle, flutter, flap; gurgle, splash, drip; whirr, hum, drone, buzz, throb.

### M. Audio-terminology tokens the model has demonstrably learned
*impact, whoosh, ambience, one-shot, loop, stem, braam, glitch, drone.* Use these as-is — they're first-class citizens of the prompt language.

---

## Subjective adjective → frequency-band translation

When directors / designers say abstract things like "warm" or "muddy" or "punchy", translate to the corresponding frequency band before writing the prompt. Adapted from glm.md and aligned with ITU-R BS.2399-0.

| Frequency range | Positive descriptor | Negative descriptor (avoid) | Prompt phrasing |
|---|---|---|---|
| < 75 Hz (Sub-bass) | power, impact, foundation, deep, weight | tubby, boomy, uncontrolled rumble | "deep, booming sub-bass foundation" |
| 75 Hz – 200 Hz (Bass) | weight, body, warmth, fullness | flabby, muddy, thick, cluttered | "warm, thick low-end body" |
| 200 Hz – 600 Hz (Low-mid) | fullness, consistency, strength, solid | boxy, congested, hollow, muddy | "solid midrange, no boxy congestion" |
| 600 Hz – 2 kHz (Mid) | attack, articulation, chug, detailed | honky, nasal, telephone-like | "detailed midrange articulation, sharp attack" |
| 2 kHz – 6 kHz (Upper-mid) | presence, intelligibility, edge, bite | harsh, piercing, brittle, grating | "aggressive forward presence with biting edge" |
| 6 kHz – 10 kHz (High) | brilliance, sizzle, crisp, energetic | sibilant, hissy, piercing, messy | "crisp high-frequency crackle, energetic sizzle" |
| > 10 kHz (Air) | air, openness, sheen, glassy, shimmering | unnatural, distracting, overly bright | "airy, ethereal high-frequency shimmer, glassy top-end" |

---

## The prompt template + worked walk-through

```
[SOURCE/OBJECT] + [ACTION/ARTICULATION] + [MATERIAL/TIMBRE]
+ [ENVIRONMENT/ACOUSTICS] + [TEMPORAL/DYNAMIC SHAPE]
+ [PRODUCTION/MOOD MODIFIER]
```

**Worked example — "blast door slamming shut":**

> "A heavy iron blast door [source+material] slamming shut [action], reinforced metal-on-metal with a dense thud [timbre], in a long reverberant industrial corridor [environment], sharp transient with a slow decaying tail and faint mechanical aftermath [temporal], cinematic, low-end heavy [production+mood]."

**Worked example — UCS-led variant:**

> "Format: Hard SFX. Category: METAL. Subcategory: Impact. Heavy iron blast door slamming shut against a steel frame in a long reverberant industrial corridor. Sharp transient followed by a deep 60 Hz resonant boom and a slow decaying metallic tail. Cinematic, low-end heavy, no music."

Both work. The UCS-led variant trades naturalness for tighter latent-space targeting; use it when the prompt is technical and the influence setting is high (45–60%).

---

## Iteration protocol

| Round | Action |
|---|---|
| 1 | Default prompt at 30% influence. Listen to all four variations. Identify which axis is wrong (source / action / material / environment / temporal / mood). |
| 2 | If sound *type* is right but *details* are wrong: change one or two specific descriptors, hold structure. ("heavy rain" → "light drizzle"; "metal door" → "wooden door"). Same influence. |
| 3 | If sound *type* is wrong: simplify aggressively. Strip modifiers down to source + action + material. Once the base is right, add modifiers back one at a time. |
| 4 | If you're 80% there but missing one critical element: bump prompt influence to 40–50%, keep prompt unchanged. |
| 5 | If output is too literal/synthetic-sounding: drop influence to 20–25% and add a "naturalistic, raw recording" modifier. |

Most production-quality results land within 2–3 rounds.

### Common failure modes & fixes

| Failure | Cause | Fix |
|---|---|---|
| Too short / clipped | Auto duration guessed wrong | Set `duration_seconds` manually; check that prompt implies a temporal arc. |
| Too generic | Missing material + environment | Add material adjectives, environment, one mood modifier. |
| Too synthetic / "AI-sounding" | Influence too high; missing naturalism cue | Drop influence to 20%; add "naturalistic", "raw field recording", "Foley-recorded", "hand-performed". |
| Wrong genre of sound entirely | Modifiers confusing the model | Simplify aggressively; remove all but source + action + material. |
| Conflicting elements | Internal contradictions ("loud whisper", "silent explosion") | Rewrite to remove contradiction. |
| Wrong space | Environment unspecified — model defaults to medium-dry studio | Make environment explicit ("in a small padded studio" vs "in an open field"). |
| Doesn't loop cleanly | Looping ON for an event-based prompt | Loop only with continuous-source prompts (rain, wind, machinery, crowd); avoid distinct events. |
| Sounds artificial / uncanny | Missing organic detail | Add imperfection cues: "slightly uneven", "random", "irregular". |
| Inconsistent environment | Conflicting spatial cues | Ensure space matches source (no cathedral reverb on a car-interior shot). |

### Negative descriptors

ElevenLabs SFX has no formal negative-prompt field. In practice, including phrases like *"no music"*, *"without dialogue"*, *"no human voices"*, *"no melody"* inside the prompt is respected.

### Length guidance

Keep prompts **10–60 words**. Below 10 → generic. Above 60 → coherence drops, contradictions creep in. For complex scenes, split into 2–4 prompts and layer.

---

## ElevenLabs interface contract (and the MCP-specific subset we actually use)

**Public ElevenLabs UI / API** (for reference):
- Text prompt: any length, 10–60 words optimal.
- Duration: Auto, or **0.1–30 seconds** manually. Cost: 40 credits/sec when manual.
- Looping toggle (seamless wrap; only useful for continuous sources).
- Prompt influence: 0–100%, default 30%.
- Each generation returns 4 variations.
- Export: MP3 44.1 kHz or WAV 48 kHz (WAV not available for looping clips).
- Commercial use: cleared on paid tiers (Starter $5/mo and up). Free tier non-commercial.

**dean-stack MCP subset** (`mcp__elevenlabs__text_to_sound_effects`) — what we can actually call from this repo:
- `text` — the prompt.
- `duration_seconds` — **0.5 to 5 seconds only** (NOT 30s; the MCP is more restrictive than the public UI).
- `loop` — boolean, default false.
- `output_directory` — defaults to `$HOME/Desktop`; we override to a project dir.
- `output_format` — defaults to `mp3_44100_128`; PCM 44.1 kHz needs Pro tier.
- **No prompt-influence parameter exposed on the MCP** — control adherence through prompt precision and "naturalistic" modifiers instead.
- **Single generation per call** (the MCP returns one file, not four variations).

**Implication for product use in dean-stack**: the MCP is fit for one-shot SFX, UI cues, short impacts, short Foley moves, and short loops (≤ 5s). For longer ambient beds (>5s) you'd need the full ElevenLabs UI/API or a different tool — call this out to the user before generating.

### Prompt influence — the most misunderstood control (for when you DO have it)

- **10–25%**: model takes prompt as loose suggestion. Best for naturalistic ambiences and field recordings.
- **30%** (default): balanced. Good unless you have a clear miss.
- **40–60%**: tighter adherence. Best for specific UI sounds, exact transitions, well-crafted detailed prompts.
- **70–100%**: literal interpretation. Can sound stiff/synthetic if prompt isn't clean. Use rarely.

**Conflict resolution** between sources: minmax/google's "~70% for Foley" and claude/glm's "25–30% for naturalistic" are *both right in their context*. Use 25–30% when you want raw, hand-performed Foley naturalism. Use 45–70% when the prompt is technically precise and you want literal adherence (UI sounds, sci-fi tech, designed effects).

### ElevenLabs-specific pitfalls

1. **Multi-event prompts produce mush.** "A man opens a door, walks across a creaky floor, and falls down stairs" yields a confused blur. Generate the three events separately, sequence in DAW.
2. **Music and SFX overlap.** Drift into musical territory ("epic orchestral hit") and the SFX model partially complies but at lower fidelity than the dedicated ElevenLabs Music endpoint. Use Music for full musical content; SFX for one-shot stings.
3. **No SSML, no audio tags inside SFX prompts.** `[whispering]` and `<break>` are TTS-only features and will be ignored or produce artifacts in SFX prompts. (They DO work in ElevenLabs V3 dialogue mode for blended speech-plus-SFX, but that's a different endpoint.)
4. **Looping toggle requires continuous-source prompts.** Toggle looping ON for a one-shot impact and the model may repeat the impact awkwardly.
5. **Auto duration tends slightly long for UI.** For sub-1-second UI clicks, set duration manually (0.5–1.0s).
6. **Generations are non-deterministic.** Same prompt → different results each call. Keep a prompt log if you need to recreate.

### Worked before/after examples (the iteration patterns that produce production-quality output)

| Use case | Before (generic) | After (production-quality) | Settings |
|---|---|---|---|
| **Game UI level-up** | "level up sound" | "Bright triumphant level-up chime, three ascending bell-like tones with a sparkle of high-frequency shimmer, warm digital synth, short tail, satisfying and rewarding, one-shot, clean and crisp, modern mobile game UI" | 50% influence, 1.5s |
| **Cinematic tension build** | "tension" | "Slow rising cinematic tension drone, dark low-frequency hum with subtle dissonant high overtones gradually swelling over 8 seconds, ending with a short held breath of silence before release, ominous and foreboding, trailer-style braam buildup" | 35% influence, 8s (full UI only — exceeds MCP cap) |
| **Foley footsteps on cobblestone** | "footsteps on cobblestone" | "Heavy leather boots walking slowly on wet uneven cobblestones at night, weight-forward gait, occasional puddle splash, naturalistic close-mic Foley recording, slight reverb of narrow alley walls" | 25% influence, 5s |
| **Sci-fi spaceship ambience (loop)** | "spaceship hum" | "Continuous low-frequency spaceship interior hum, layered with subtle high-frequency electrical whine, distant mechanical rhythmic pulse every few seconds, faint air-circulation hiss, hi-fi seamless loop, deep and immersive" | 30% influence, 5s, **loop ON** |
| **Magic spell cast** | "magic spell" | "Crystalline arcane spell being cast: rising shimmering high-frequency particles building for one second, sudden bright impact with bell-like resonance, decaying with a sparkling reverse-reverb tail, ethereal and weightless, fantasy game SFX, one-shot" | 45% influence, 3s |
| **Jump scare** | "jump scare" | "Sudden harsh dissonant string-like screech with a sharp metallic transient at the front, immediately followed by a deep low-frequency boom and a brief breath of silence, horror cinematic stinger, one-shot, aggressive" | 60% influence, 2s |
| **Door slam** | "door slam" | "Heavy solid oak door slamming shut forcefully in a large empty stone hall, deep resonant thud with metallic latch click, long echoing reverb tail, cinematic, high detail, realistic physics" | 40% influence, 3s |

---

## Layering & DAW-side practices (for sounds that exceed one MCP call)

Single MCP calls cap at 5 seconds. Anything longer-running, multi-event, or scene-shaped is built by layering multiple single-event generations in a DAW.

**Layer plan** (do this BEFORE generating):

```
LAYER 1: BASE         — the identity (e.g., "deep low-frequency rumble")
LAYER 2: DETAIL       — the texture/grain ("crackling, popping, uneven surface")
LAYER 3: ACCENT       — the transients ("sharp intermittent cracks and pops")
LAYER 4: ATMOSPHERE   — the space/air ("distant echo, hissing steam, wind")
```

Schaeferian + Krause layering for ambiences:
- Pick a **keynote** (the bed) — generate ≤ 5s, loop in DAW.
- Pick 1–2 **signals** (foreground events) — generate as one-shots, scatter on timeline.
- Pick 0–1 **soundmarks** (location-defining events) — generate as one-shots, key moments.
- Respect Krause's acoustic-niche idea — give each layer a different frequency band and rhythmic density.

**Murch's Law of Two-and-a-Half**: stack at most 2–3 same-category AI generations; freely stack across categories (encoded UI sound + embodied drone + Foley footstep all stack cleanly).

---

## Post-processing pipeline ("make it not sound AI")

ElevenLabs SFX outputs are clean but tend to feel "centred", slightly compressed, and acoustically generic. Apply this chain to every AI stem before the mix:

1. **High-pass filter** at 30–80 Hz — remove sub-rumble (unless the sound *is* sub-rumble).
2. **Subtractive EQ** — carve a frequency window that doesn't fight other layers. Krause's acoustic-niche idea applied to the mix bus.
3. **Gentle compression** (2:1 or 3:1, slow attack to preserve transients) — even out generation-to-generation variation. Don't crush; many AI generations already have light dynamic processing baked in.
4. **Reverb / spatialisation** — place the sound in the *same* acoustic environment as adjacent layers. Single shared reverb send across all SFX in a scene to glue them.
5. **Worldizing** (Murch) — for sounds that need to feel real-space-anchored: render the AI clip, play it through a small monitor or phone speaker in the actual target room, re-record with a phone or field recorder, and mix the worldized version under the clean version at -10 to -15 dB.
6. **Pitch / time variation** when stacking same-category layers — pitch each duplicate by ±1–3 semitones and slightly time-stretch, so the model's residual sameness doesn't expose itself.
7. **Saturation / tape** for "vintage" or naturalistic targets — subtle harmonic distortion masks AI artifacts.
8. **Stereo widening** judiciously — ElevenLabs SFX is often closer to mono-centred than full stereo. Don't over-widen UI or impact transients (Murch's encoded zone wants centre).

---

## When NOT to use AI-generated SFX

- **Hero sounds with iconic identity** (flagship weapon in a AAA game, signature character sound) — these benefit from custom Foley + sound design where you control every variable. Burtt's lightsaber would not have come out of a prompt.
- **Real-world specificity** (a particular 1967 Mustang engine, a named church bell, a specific celebrity's voice) — stock libraries or original recordings.
- **Performance-bound timing** (sync-to-frame Foley with complex micro-rhythm) — traditional Foley is faster and tighter.
- **Where licensing diligence requires audited training data** — prefer Adobe Firefly Sound Effects or Stable Audio Open with documented CC sources.

---

## The AI-Augmented Cue Sheet (translating director's-brief → prompt)

For batches of scene-driven SFX, run the translation in a structured worksheet. The skill `sound-design` consults this format when a request describes a scene rather than an isolated sound.

| Timecode | On-screen action | Director's narrative brief | Translated technical AI prompt |
|---|---|---|---|
| 00:15:03 | Protagonist steps into an abandoned cathedral. | "It needs to feel vast, empty, and haunting. The footsteps should feel isolating and heavy." | Format: Foley. Slow deliberate footsteps of heavy leather boots on cracked stone pavement. Massive expansive cathedral reverberation with a long haunting decay. Subtle eerie high-frequency wind draft in the background. Texture: sparse, isolated. |
| 00:18:05 | Digital security system detects an intruder. | "Make the alarm sound futuristic, not like a normal bell. It should induce immediate panic and feel aggressive." | Format: Designed SFX. Piercing high-pitched synthetic sonar ping, rapidly repeating alarm sequence with severe digital distortion and heavy glitch artifacts, aggressive fast attack envelope, unyielding upper-mid presence. |
| 00:25:40 | Colossal spacecraft emerges from hyperspace. | "I want the audience to feel the sheer weight and gravity of this thing arriving. It should rattle their teeth." | Format: Cinematic Hit. Massive low-frequency synthetic braam, deep sub-bass rumble (under 75 Hz) blending into a heavy crump of displaced air, juddering impact, immense scale, evolving dark drone tail with long sustain. |
| 00:32:12 | Character drops a set of keys on a table. | "Just a normal set of old keys, but make it sound final and definitive." | Format: Hard SFX. Sharp metallic clatter of heavy iron keys dropping onto a solid wooden table, resonating clang with a short dry release, close-miked, high intelligibility, no room reverb. |

---

## Worked prompt library (deduped, ready to paste)

For each entry: the polished prompt + recommended duration + (where the public UI matters) influence. Anything > 5s requires the public ElevenLabs UI; the MCP can't do it in one call.

### Game UI / feedback (≤ 5s — MCP-fit)
- **Button click**: "Soft satisfying button click, crisp short transient with subtle digital undertone, modern mobile UI, one-shot." `0.5s`
- **Achievement**: "Bright triumphant achievement chime, three ascending bell-like tones with high-frequency shimmer sparkle, warm digital synth, short tail, rewarding and celebratory, one-shot." `1.5s`
- **Error**: "Subtle two-tone descending error notification, muted and gentle but unmistakable, low-mid frequency, modern app UI, one-shot." `0.8s`
- **Toggle/swipe**: "Quick crisp digital toggle switch with mechanical click and subtle synth sweep, short and clean." `0.4s`
- **Notification**: "Soft pleasant notification ping, two ascending tones, clean digital, modern messaging app, one-shot." `0.7s`

### Game ambience (loop ON, layer in DAW for >5s)
- **Forest day**: "Daytime temperate forest soundscape, layered birdsong from multiple species in middle distance, gentle wind through leaves, occasional distant insect, hi-fi naturalistic field recording, seamless loop." `5s loop ON`
- **Dungeon**: "Damp underground stone dungeon ambience, slow water dripping in the distance, low subterranean rumble, faint distant chains, occasional small rock falls, claustrophobic reverberant, dark, looping." `5s loop ON`
- **Cyberpunk city night**: "Cyberpunk megacity ambience at night, continuous low-frequency traffic hum, distant neon-sign electrical buzz, occasional far-off siren, intermittent flying-vehicle whoosh overhead, layered indistinct crowd murmur, slight rain on metal, lo-fi gritty atmosphere, seamless loop." `5s loop ON`
- **Underwater**: "Underwater ambience, muffled low-frequency rumble of deep water, occasional distant whale-like resonant tones, faint bubble streams rising and dissipating, slight pressure-modulated movement, claustrophobic and immersive, looping field-recording style." `5s loop ON`
- **Tavern interior**: "Medieval tavern interior, layered indistinct conversation, occasional laughter, wooden cup clinks, distant lute, subtle fire crackle, warm wooden room reverb, loopable." `5s loop ON`

### Cinematic (≤ 5s — MCP-fit; longer requires UI)
- **Jump scare**: "Sudden harsh dissonant string-like screech with a sharp metallic transient at the front, immediately followed by a deep low-frequency boom and a brief breath of silence, horror cinematic stinger, one-shot, aggressive." `2s`
- **Transition whoosh**: "Cinematic transition whoosh, deep wide stereo movement left to right with rising mid-frequency air and a low-end thump on arrival, modern trailer style, one-shot." `2s`
- **Braam**: "Massive cinematic braam, sustained brassy low-end hit with metallic resonance, slow decay, trailer style, dramatic and ominous, one-shot." `3s`

### Foley (≤ 5s — MCP-fit)
- **Footsteps wood**: "Bare feet walking softly on creaky old hardwood floor, weight shifting, occasional board creak, close-mic Foley recording, dry intimate." `3s`
- **Footsteps gravel**: "Heavy boots walking on dry coarse gravel, distinct crunch on each step, even pace, naturalistic close-mic Foley." `4s`
- **Cloth movement**: "Heavy wool coat rustling and swishing as a person turns and walks, close-mic Foley, dry, naturalistic." `3s`
- **Keys**: "Bunch of metal keys being picked up from a wooden table, jangle and clink, then placed in a fabric pocket, close Foley." `3s`
- **Glass**: "Glass bottle being set down firmly on a wooden bar, single hollow clink, dry." `1s`
- **Paper**: "Crumpling a single sheet of office paper into a ball, slow deliberate, close intimate Foley." `3s`

### Mechanical / sci-fi (≤ 5s — MCP-fit)
- **Robot movement**: "Bipedal humanoid robot taking three steps, servo motors whirring on each joint movement, metallic mechanical clank on foot impact, hydraulic hiss, hi-fi sci-fi." `3s`
- **Weapon charging**: "Energy weapon charging up over 1.5 seconds, rising electrical hum and high-frequency whine, ending in a held tone ready to fire, sci-fi, one-shot." `2s`
- **Laser blast**: "Single sci-fi laser blast, sharp electrical zap with downward pitch slide and short metallic resonant tail, retro-futuristic, one-shot." `0.7s`
- **Sci-fi door hiss**: "Sci-fi pneumatic door sliding open, pressurised hiss of air, smooth motorised slide, soft mechanical clunk on stop, hi-fi." `2s`

### Nature (loop ON for ambiences)
- **Rain on tin roof**: "Steady heavy rain falling on a corrugated tin roof, dense layered drops, occasional larger splash, naturalistic field recording, looping." `5s loop ON`
- **Forest wind**: "Strong wind moving through tall pine trees, layered needle-rustle, occasional gust building and releasing, naturalistic outdoor recording, looping." `5s loop ON`
- **Owl**: "Single distant great horned owl hooting twice in a quiet nighttime forest with subtle insect background, hi-fi field recording." `5s`
- **Campfire**: "Close-mic campfire, continuous wood crackling with occasional small pops and embers, warm and intimate, looping." `5s loop ON`
- **Ocean waves**: "Gentle ocean waves lapping a sandy beach, slow rhythmic swells, distant gulls, hi-fi naturalistic, looping." `5s loop ON`

### Generative audio for product features (i.e. dean-stack runtime use)

- **Best practice**: pre-generate a *bank* of 5–10 variations per logical sound (so calls hit cache, not the API live), tag with the prompt + date, randomise selection at runtime to avoid repetition fatigue.
- **For UI sounds** in real apps: prefer manual short durations and (in the public UI) influence 45–60% for predictable, consistent timbre across variations. On the MCP, simulate this by writing precise, 30–50-word prompts with explicit material + temporal language.
- **For dynamic ambiences** (procedurally generated game world): generate looping beds offline by biome/scenario; modulate volume and crossfade at runtime rather than asking the API for new audio per scene.

---

## Caveats (consolidated from all sources)

- **Multi-event ≠ single prompt.** Treat any vendor claim of "describe a whole scene" as marketing. Layer in a DAW.
- **MCP duration cap is 5 s, NOT 30 s.** The public UI allows 30s; the dean-stack MCP doesn't. Use the public UI (or chained MCP calls + DAW assembly) for anything longer.
- **Prompt influence is not exposed on the dean-stack MCP** — the influence guidance still applies if you hop to the public UI for a problem clip; on the MCP, control adherence through prompt precision.
- **Numbers in this doc evolve.** Default 30%, 40 credits/sec when manual, 30 s public-UI cap, 4 variations per public-UI generation, MP3 44.1 kHz / WAV 48 kHz are correct as of mid-2026; verify against live docs at time of use.
- **"Royalty-free" ≠ "indemnified."** Most text-to-SFX vendors grant a commercial license to *output* but do not indemnify against infringement claims arising from training data. Keep prompt + plan + date evidence for client work.
- **Theoretical frameworks are mnemonic scaffolding, not literal model interfaces.** Models do not understand "graduated continuant" — they understand the descriptors ("slow swell, sustained drone, granular texture") because those words appear in audio captions. Use the theorist names for *your* mental model; the descriptors are what go into the prompt.
- **Worldizing produces real-room artefacts** (HVAC, mic self-noise, room modes) — desirable for cinematic feel, undesirable for clean UI/product audio. Use selectively.
- **AI-generated SFX still has subtle telltale artefacts** — slight timbral sameness across stacked layers, occasional pitch/phase drift in long generations, tendency toward mid-distance perspective even when prompted close-mic. Layering across categories (Murch's color-spectrum diversity), pitch/time variation, and worldizing all help mask these.
- **Source documents already merged here**: `claude.md`, `minmax.md`, `deep-seek.md`, `glm.md`, `google.md`, `perplexity.md`, `grok.md`. Do not re-cite the originals from a prompt — use this consolidated reference.
