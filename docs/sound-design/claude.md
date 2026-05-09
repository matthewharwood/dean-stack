# The Text-to-SFX Playbook: A Working Reference for Sound Design via Generative Audio (with Deep Focus on ElevenLabs)

## TL;DR

- **The fastest path to professional-quality output from ElevenLabs Sound Effects is a six-slot prompt template — `[Source/Object] + [Action/Articulation] + [Material/Timbre] + [Environment/Acoustics] + [Temporal/Dynamic shape] + [Production/Mood modifier]` — with prompt influence at 30% as default, 40–60% when your prompt is precise, and 10–25% when you want naturalism.** Generate 3–5 variations per prompt, layer 2–4 generations per "scene" (base + accents + background + transient), and post-process with EQ, compression, and matched reverb to glue layers into the same acoustic space.
- **Treat AI text-to-SFX as Foley-by-prompt and ambience-by-prompt — not as a one-shot scene composer.** Single-event sounds (impacts, UI clicks, whooshes, single Foley moves, looping ambient beds) are where current models (ElevenLabs SFX v2, Stable Audio, Adobe Firefly Sound, Meta Audiobox, AudioGen) shine; complex multi-event sequences ("man walks through hall, falls down stairs") still need to be split into single sounds and assembled in a DAW. ElevenLabs' own docs say this explicitly.
- **Borrow the descriptive vocabulary from the canon — Schaeffer/Chion (sound object, reduced/causal/semantic listening, acousmatic, synchresis, vococentrism), Smalley (onset–continuant–termination, gesture/texture, motion & growth), Schafer/Krause (keynote/signal/soundmark; geophony/biophony/anthropophony), Murch (encoded vs. embodied; worldizing), Thom ("design the movie for sound"), Burtt ("found-sound" approach) — and use that vocabulary inside prompts.** Models trained on captioned audio respond well to material, spatial, temporal and morphological language; they respond poorly to abstract narrative or dialogue-style prose.

---

## Key Findings

1. **ElevenLabs SFX is built around three controls: prompt text, duration (auto or 0.1–30 s), and prompt influence (default 30%), plus a looping toggle for seamless ambient beds.** Cost is 40 credits per second when duration is specified; output is MP3 (44.1 kHz) or WAV (48 kHz, non-looping). Each generation returns four variations. The model "understands both natural language and audio terminology" — so technical descriptors (impact, whoosh, drone, braam, glitch, stem, one-shot) are first-class citizens of the prompt language.

2. **The single biggest output-quality lever is prompt specificity in four axes: source, action, environment, and modifier.** ElevenLabs' own help docs note that "person walking on grass" is a generic baseline and is materially improved by adding "high-quality, professionally recorded footsteps on grass, sound effects foley." Stay between roughly 10–60 words; one- and two-word prompts produce generic results, and prompts much longer than 60 words don't help and can introduce contradictions.

3. **For complex sequences, ElevenLabs explicitly recommends generating individual elements and combining them in a DAW** rather than asking for a multi-event scene in one prompt. This matches industry layering practice — base layer + accent + mid + background + transient — and aligns with Walter Murch's Law of Two-and-a-Half (sounds of the same "color" stack to roughly 2.5 layers before they congeal into a single perceptual event; sounds from different parts of the encoded↔embodied spectrum stack more freely).

4. **The current text-to-SFX field has converged on a small number of model families with different strengths.** ElevenLabs Sound Effects v2 (closed, commercial license on paid tiers, 30 s max, looping), Stability AI's Stable Audio family (Stable Audio 2.5 commercial, Stable Audio Open 1.0 ~47 s stereo at 44.1 kHz, T5-conditioned, CC-licensed training data, strong on field recordings/SFX, weaker on music), Meta's AudioGen and Audiobox (research demos; Audiobox unifies speech, SFX and soundscapes with text + voice prompts; Audiobox demo retired Feb 2026), Google's AudioLM/MusicLM (research only; AudioLM uses a hierarchical token approach — semantic/coarse/fine — that explicitly captures attack and decay), Adobe Firefly Sound Effects / Project Sound Lift (Firefly trained on licensed/public-domain content, commercially safe; Sound Lift separates rather than generates), and Suno/Udio/Riffusion in the music-generation lane. **For SFX specifically, ElevenLabs has the cleanest commercial license + API + UI combination as of mid-2026.**

5. **The most useful theoretical frameworks for prompt-craft are Chion's three listening modes and Smalley's spectromorphology.** Chion's *causal* listening (what made the sound), *semantic/codal* listening (what does it mean as a code), and *reduced* listening (the sonic traits themselves) map almost exactly onto the three classes of descriptors that a text-to-SFX model needs: source/cause language, semantic/contextual cues, and reduced acoustic descriptors (timbre, mass, grain, attack, sustain). Smalley's onset/continuant/termination is the right conceptual framework for choosing duration and for shaping prompts that need a temporal arc ("starts as a slow rise, sustains as a metallic drone, terminates with a sudden rupture").

---

## Details

### Part 1 — A Unifying Framework: How Text-to-SFX Models "Hear" Prompts

A text-to-audio model trained on captioned audio (AudioCaps, AudioSet, Freesound, etc.) is essentially learning a joint embedding between *audio descriptions humans actually write* and *waveforms*. That has three consequences for prompt-craft:

1. **The model is biased toward conventional caption language.** Captions in training data are typically of the form `[subject/source] + [action] + [optional environment]` (e.g., "a dog barks in the distance with light rain"). Mirror that structure.
2. **It understands physical-world causal categories far better than abstract narrative ones.** "Old wooden door creaks open in a cathedral, slow" is concrete; "the door of betrayal opens" is not. The Stable Audio Open paper explicitly notes that "prompt engineering may be required" because dataset captions are under-descriptive.
3. **It models morphology (onsets/continuants/terminations) implicitly.** This is why temporal modifiers like "starts quietly and builds to a crash" and "with quick decay and short tail" reliably work in ElevenLabs, Stable Audio, and Audiobox.

Against this, the master prompt template that consistently produces production-grade output across ElevenLabs SFX (and ports cleanly to Stable Audio and Firefly) is:

```
[Source / Object] + [Action / Articulation] + [Material / Timbre]
+ [Environment / Acoustics] + [Temporal / Dynamic shape]
+ [Production / Mood modifier]
```

Two of these slots can be omitted for short impacts; all six should be filled for ambiences and cinematic hits.

### Part 2 — Theoretical Canon, Operationalised for Prompts

These are not academic ornaments; each gives you a *vocabulary set* you can drop into prompts.

**Pierre Schaeffer — sound object (*objet sonore*) and TARTYP.** Schaeffer's *Traité des objets musicaux* (1966) classified sounds by mass (definite/complex/variable/unpredictable pitch) and facture (formed sustainment, impulse, formed iteration, redundant, unpredictable). The seven canonical balanced types in TARTYP are *formed sustainment*, *impulse*, and *formed iteration* (centre of the table) — these correspond directly to the three most common SFX morphologies: drones/pads, hits/impacts, and rhythmic textures. For prompts, Schaeffer's vocabulary translates as: **mass language** ("complex inharmonic spectrum", "noise-like", "pitched sustained tone"); **facture language** ("impulse", "sustained drone", "rhythmic iteration", "unpredictable bursts"). Reduced listening — listening to the sonic qualities independent of source — is the listening mode you should write *to* when you want a sound to be evocative rather than literal.

**Denis Smalley — spectromorphology.** Smalley's 1986/1997 framework gives you a working language for time and shape. The three temporal phases are **onset → continuant → termination**, and the three archetypes are **attack-impulse** (single staccato hit), **attack-decay** (impulse + resonance, e.g., bell, pizzicato — closed if quick decay, open if slow), and **graduated continuant** (slow onset, sustained body, slow termination — e.g., pad, wind). His **motion and growth** word-set (ascent, descent, plane, bi/multi-directional, cyclic, reciprocal, centric) and his **texture motion** terms (streaming, flocking, turbulence, convolution, granular) are exactly the right modifiers for ambience prompts. Smalley's gesture↔texture spectrum is the single most useful axis for choosing duration: gesture-heavy sounds want short clips with clear onset/termination; texture-heavy sounds want long, looping clips.

**R. Murray Schafer — soundscape theory.** Schafer's three categories — **keynote** (background fundamental, often unconscious — refrigerator hum, traffic), **signal** (foreground attention-grabber — bell, siren, horn), **soundmark** (community-unique sound — Big Ben, NYC steam pipes) — give you a layering hierarchy for ambiences. He also distinguished **hi-fi soundscapes** (clear S/N, distinct events, often natural) from **lo-fi soundscapes** (broadband noise, masking, often urban). Both are usable as prompt modifiers ("hi-fi forest soundscape, clear distant signals" vs. "lo-fi urban ambience, broadband traffic noise floor").

**Bernie Krause — soundscape ecology.** Three sources: **geophony** (non-biological natural — wind, water, geological), **biophony** (organisms — birdsong, insects, frogs, marine), **anthropophony** (human-made; sub-categorised as controlled — music, speech, theatre — and incoherent/technophony — machinery, traffic). Krause's **acoustic niche hypothesis** — that species partition frequency and time so as not to mask each other — is a useful prescriptive idea when layering: deliberately give each generated layer a different frequency band and rhythmic density.

**Michel Chion — audio-vision.** Most directly useful concepts:
- **Three listening modes** — *causal* (what produced the sound), *semantic/codal* (what does it mean as code), *reduced* (the sound's intrinsic qualities). Use causal language ("metal scraping on concrete") for diegetic SFX; reduced language ("dense low-frequency drone with granular texture") for abstract design; semantic/codal language sparingly — models don't understand "a sound that says danger" well, but they do understand "low rising menacing drone."
- **Acousmatic** — sound without visible source. The whole text-to-SFX paradigm is acousmatic by construction; the prompt has to do the causal work the absent image would have done.
- **Synchresis** — the involuntary perceptual welding of synchronous sound and image. This is why post-processed AI SFX synced to picture tend to "work" even when imperfect; you can lean on synchresis when the sound is approximate.
- **Vococentrism / rendered sound** — the soundtrack prioritises voice; SFX exists to *render* (give felt experience of) the diegetic event, not to recreate it acoustically. So prompt for the *felt* sound, not the literally accurate one.
- **Added value** — "the expressive and informative value with which a sound enriches a given image so as to create the definite impression that this information is already contained in the image itself." Prompt for added value, not literal reproduction.

**Walter Murch — encoded vs. embodied; worldizing; the Law of Two-and-a-Half.** Murch's "Dense Clarity – Clear Density" essay places sounds on a spectrum from **encoded** (language, dialogue — left-brain, requires decoding) to **embodied** (music — pure perceptual, no decoding). SFX are "centaurs" that float between. Practical implication: generate dialogue-adjacent SFX (intelligible bells, machine speech, R2-D2-like beeps) panned centre and dry; generate embodied/textural SFX (drones, ambiences, score-like braams) wide and wet. **Worldizing** — playing recorded audio through speakers in a real space and re-recording it — is the perfect post-processing step for AI SFX that sound "too clean": render the AI clip, play it back through a small monitor in the actual room you want it to live in, and re-record. **Law of Two-and-a-Half** — three or more layers of the same "color" congeal into one perceptual mass, while sounds from different colors stack much more freely. So in your DAW: stack at most 2–3 same-category AI generations; freely stack across categories.

**Randy Thom — "Designing a Movie for Sound."** The headline argument — "starving the eye of information forces the brain to use the ear for information" — is also a prompt-level principle: **starve the prompt of generic visuals and the model leans on audio specificity.** Thom's other key idea is that sound design is a *context* problem before it is a *sounds* problem; in prompt practice this means thinking about the scene's POV and dynamics first, then writing prompts for individual elements that fit that envelope.

**Ben Burtt — found-sound philosophy.** Burtt built the lightsaber from a film-projector idle plus broken-TV feedback, the blaster from striking a guy-wire, R2-D2 from his own vocalisations through an ARP 2600. The transferable principle for prompts: **describe a *real-world causal source* even for fictional sounds** ("metallic guy-wire being struck with a hammer, slowed down, with electric hum") rather than asking for the fictional thing directly ("blaster shot"). This works because models have far more training data on real causal sources than on movie-specific synthetic effects.

**Foley conventions.** Standard taxonomy is **feet** (footsteps, runs, landings — varied by surface and shoe), **moves/cloth** (clothing rustle, body movement, gear, armour, straps), and **specifics/props** (object handling, doors, glass, keys, papers, weapons). Foley is performed live to picture, layered in passes. ElevenLabs is strong at all three, with the right material/surface descriptors.

### Part 3 — Taxonomy of Sound Descriptors (the Reusable Vocabulary)

This is the working dictionary to draw on when writing prompts. Use it as a checklist; you don't need every category in every prompt.

**A. Acoustic / physical primitives**
- *Frequency*: low/sub-bass/low-mid/mid/high-mid/bright/airy; pitched / unpitched / inharmonic / noise-like; specific Hz when it matters ("60 Hz hum", "around 2 kHz")
- *Amplitude / dynamics*: quiet / loud / swelling / decaying / transient-heavy / smooth; "soft", "thunderous", "subtle", "explosive"
- *Timbre*: bright / dark / warm / cold / hollow / dense / thin / fat / metallic / wooden / glassy / vocal-like / breathy / nasal / gritty / smooth / silky
- *Envelope (ADSR)*: fast attack / slow attack; quick decay / long decay; high sustain / no sustain; short release / long tail. For SFX, ADSR is largely controlled by the temporal language in the prompt — "sharp transient", "with long resonant tail", "no decay", "slow swell".

**B. Spectromorphological (Smalley)**
- *Archetypes*: attack-impulse, attack-decay (closed/open), graduated continuant
- *Onset descriptors*: sudden, attack-led, gradual, emergent, anacrusic
- *Continuant descriptors*: sustained, iterative, granular, turbulent, pulsating
- *Termination descriptors*: closed, open, decaying, fading, ruptured, abrupt
- *Motion*: ascending, descending, planar, bi/multi-directional, cyclic, centric, reciprocal
- *Texture*: streaming, flocking, convolution, turbulence, granular
- *Behaviour*: dominant/subordinate, conflict/coexistence, voluntary/pressured

**C. Schaefferian (mass × facture)**
- *Mass*: definite pitch, complex pitch, slightly variable, unpredictable, noise
- *Facture*: formed (sustainment / impulse / iteration), redundant, unpredictable

**D. Schafer / Krause (soundscape)**
- *Schafer*: keynote, signal, soundmark; hi-fi vs. lo-fi
- *Krause*: geophony, biophony, anthropophony, technophony

**E. Material descriptors (the most important for ElevenLabs)**
- Solids: metal (steel/iron/aluminium/brass/copper/tin), wood (hardwood/softwood/hollow/dry/damp), stone (granite/marble/sandstone/concrete), glass (thin/thick/tempered), plastic, ceramic, rubber, leather
- Granular/loose: gravel, sand, dirt, snow, dry leaves, wet leaves, broken glass shards
- Fluids: water (still/flowing/dripping/splashing), oil, mud, slush, blood
- Soft/organic: cloth, fur, flesh, foliage, paper, cardboard
- Composite descriptors: "metal-on-metal", "wood-on-stone", "wet leather", "dry brittle", "hollow", "dense", "porous", "resonant", "deadened"

**F. Spatial / acoustic descriptors**
- *Mic perspective*: close-mic'd, ORTF, mid-distance, distant, far-field, lavalier-on-body, boom overhead
- *Acoustics*: dry / reverberant / wet; small room / medium room / large hall / cathedral / cave / tunnel / outdoor open / outdoor wooded / underwater / muffled / through-the-wall
- *Specific spaces*: "in a stairwell", "in a small padded studio", "across a wide canyon", "in a tiled bathroom", "in an underground parking garage"

**G. Temporal descriptors**
- One-shot / impact / hit / staccato; sustained / drone / bed / pad; looping / cyclic / pulsing / rhythmic; sudden / gradual; rising / falling; build / release / swell / drop; "starts X then becomes Y"

**H. Emotional / affective**
- Menacing, ominous, foreboding, eerie, uncanny, unsettling, anxious, urgent, frantic, aggressive, violent, brutal, tense, suspenseful; serene, calm, peaceful, intimate, warm, comforting, gentle; playful, whimsical, cute, satisfying, crisp, clean; epic, cinematic, heroic, triumphant; sad, melancholic, lonely, desolate. Use sparingly — *one* affective modifier is usually enough; stacking them is counterproductive.

**I. Reference / style**
- Genre-style: "in the style of an 80s sci-fi film", "synthwave UI", "classic Foley recording", "60s spaghetti western"
- Production-style: lo-fi / hi-fi / vintage / modern / pristine / gritty / processed / raw / overdriven / distorted / clipped; "tape-saturated", "vinyl-crackled", "8-bit", "broadcast-clean"
- Be aware: highly copyrighted reference (e.g., specific film titles or proper nouns) tends to over-fit and produce artifacts on Riffusion/Suno-style models; on ElevenLabs SFX, neutral genre-style descriptors work better than IP names.

**J. Layering language**
- Foreground / midground / background; primary / secondary / tertiary; base layer / accent / transient; "with subtle … in the background"; "punctuated by occasional …"

**K. Production / engineering**
- "EQ'd bright", "low-pass filtered", "compressed", "with reverb tail", "stem", "loop", "one-shot", "transient sample", "44.1 kHz", "stereo", "mono"; BPM and key when generating musical SFX ("88 bpm in F# minor", per ElevenLabs' own example prompt)

**L. Onomatopoeia (use sparingly, as clarification)**
- whoosh, swoosh, swish, whip; thud, thump, thunk, slam, smack, crack, crunch, crack, clang, clank, clatter; sizzle, hiss, fizz, crackle; boom, bang, blast; ding, chime, ping, pluck, tick, click, beep; rustle, flutter, flap; gurgle, splash, drip; whirr, hum, drone, buzz, throb. ElevenLabs documentation explicitly recommends pairing onomatopoeia *with* descriptive language, not replacing it.

### Part 4 — Prompt Engineering Frameworks

**The master template (recommended default):**

```
[SOURCE] + [ACTION/ARTICULATION] + [MATERIAL/TIMBRE]
+ [ENVIRONMENT/ACOUSTICS] + [TEMPORAL/DYNAMIC SHAPE]
+ [PRODUCTION/MOOD MODIFIER]
```

Worked example:
> "A heavy iron blast door [source+material] slamming shut [action] reinforced metal-on-metal with a dense thud [timbre] in a long reverberant industrial corridor [environment] sharp transient with a slow decaying tail and faint mechanical aftermath [temporal] cinematic, low-end heavy [production+mood]"

This is one of two structural approaches:

1. **Object-first** (recommended for SFX): start from the source object/event, then describe its environment and mood. Best for impacts, Foley, mechanical sounds, weapons, UI.
2. **Scene-first** (recommended for ambience/soundscapes): start from the environment, then list elements. Best for ambiences, room tones, weather, biomes. Example: "Nighttime tropical rainforest soundscape: distant rolling thunder, light steady rain on broad canopy leaves, intermittent insect chirps and one distant frog, faint wind movement through high foliage, hi-fi natural recording."

**Iteration protocol** (this saves enormous time):

| Round | Action |
|---|---|
| 1 | Default prompt at 30% influence. Listen to all four variations. Identify which axis is wrong (source / action / material / environment / temporal / mood). |
| 2 | If sound *type* is right but *details* are wrong: change one or two specific descriptors, hold structure. Example: "heavy rain" → "light drizzle"; "metal door" → "wooden door". Same influence. |
| 3 | If sound *type* is wrong: simplify. Strip modifiers down to source + action + material. Once the base is right, add modifiers back one at a time. |
| 4 | If you're 80% there but missing one critical element: bump prompt influence to 40–50%, keep prompt unchanged. |
| 5 | If output is too literal/synthetic-sounding: drop influence to 20–25% and add a "naturalistic, raw recording" modifier. |

Most production-quality results land within 2–3 rounds.

**Common failure modes & fixes:**
- *Too short / clipped* → set duration manually; check that prompt implies a temporal arc.
- *Too generic* → add material + environment + one mood modifier.
- *Too synthetic / "AI-sounding"* → reduce influence to 20%; add "naturalistic", "raw field recording", "Foley-recorded", "hand-performed".
- *Wrong genre of sound entirely* → simplify aggressively; the modifiers are confusing the model.
- *Conflicting elements* (e.g., "loud whisper", "silent explosion") → rewrite to remove contradiction.
- *Wrong space* → make environment explicit ("in a small padded studio" vs. "in an open field"); models default to medium-dry studio if unspecified.
- *Doesn't loop cleanly* → enable Looping toggle, prompt for *continuous* sources only (rain, wind, machinery, crowd), avoid distinct events.

**Negative descriptors.** ElevenLabs SFX does not have a formal negative-prompt field, but in practice you can include "no music", "without dialogue", "no human voices", "no melody" inside the prompt and it tends to be respected. Stable Audio supports CFG-style guidance which behaves similarly when phrased this way.

**Length guidance.** Keep prompts 10–60 words. Below 10 produces generic results; above 60 the model struggles to maintain coherence. For complex scenes, split into 2–4 prompts and layer.

### Part 5 — ElevenLabs-Specific Mechanics, Tips, and Gotchas

**The interface contract (as of mid-2026):**
- Text prompt field (any length, but 10–60 words optimal)
- Duration: Auto, or 0.1–30 seconds manually. Cost: 40 credits/sec when manual.
- Looping toggle (seamless wrap; only useful for continuous sources)
- Prompt influence: 0–100%, default 30%
- Each generation returns 4 variations
- Export: MP3 44.1 kHz or WAV 48 kHz (WAV not available for looping clips at present)

**Prompt influence — the most misunderstood control:**
- 10–25%: model takes prompt as loose suggestion; best for naturalistic ambiences and field recordings.
- 30% (default): balanced; good unless you have a clear miss.
- 40–60%: tighter adherence; best for specific UI sounds, exact transitions, and well-crafted detailed prompts.
- 70–100%: literal interpretation; can sound stiff or synthetic if prompt isn't clean. Use rarely.

**Audio-terminology tokens that the model has clearly learned** (from official docs and behaviour): *impact, whoosh, ambience, one-shot, loop, stem, braam, glitch, drone*. Use these as-is.

**Worked before/after examples** (these are the iteration patterns that produce production-quality output):

*Example A — Game UI level-up:*
- Before: "level up sound" → generic ascending chime, doesn't fit any aesthetic.
- After: "Bright triumphant level-up chime, three ascending bell-like tones with a sparkle of high-frequency shimmer, warm digital synth, short tail, satisfying and rewarding, one-shot, clean and crisp, modern mobile game UI" (influence 50%, duration 1.5 s) → on-target ~3 of 4 variations.

*Example B — Cinematic tension build:*
- Before: "tension" → ambient drone, no shape.
- After: "Slow rising cinematic tension drone, dark low-frequency hum with subtle dissonant high overtones gradually swelling over 8 seconds, ending with a short held breath of silence before release, ominous and foreboding, trailer-style braam buildup" (influence 35%, duration 8 s).

*Example C — Foley footsteps on cobblestone:*
- Before: "footsteps on cobblestone" → flat, library-feeling.
- After: "Heavy leather boots walking slowly on wet uneven cobblestones at night, weight-forward gait, occasional puddle splash, naturalistic close-mic Foley recording, slight reverb of narrow alley walls" (influence 25%, duration 6 s) → naturalistic, performable.

*Example D — Sci-fi spaceship ambience (loop):*
- Before: "spaceship hum" → thin, repetitive.
- After: "Continuous low-frequency spaceship interior hum, layered with subtle high-frequency electrical whine, distant mechanical rhythmic pulse every few seconds, faint air-circulation hiss, hi-fi seamless loop, deep and immersive" (influence 30%, duration 30 s, **looping ON**).

*Example E — Magic spell cast:*
- Before: "magic spell" → vague swoosh.
- After: "Crystalline arcane spell being cast: rising shimmering high-frequency particles building for one second, sudden bright impact with bell-like resonance, decaying with a sparkling reverse-reverb tail, ethereal and weightless, fantasy game SFX, one-shot" (influence 45%, duration 3 s).

*Example F — Underwater ambience:*
- Before: "underwater" → tonally flat low-pass noise.
- After: "Underwater ambience: muffled low-frequency rumble of deep water, occasional distant whale-like resonant tones, faint bubble streams rising and dissipating, slight pressure-modulated movement, claustrophobic and immersive, looping field-recording style" (influence 25%, looping ON, duration 30 s).

*Example G — Jump scare:*
- Before: "jump scare" → generic stinger.
- After: "Sudden harsh dissonant string-like screech with a sharp metallic transient at the front, immediately followed by a deep low-frequency boom and a brief breath of silence, horror cinematic stinger, one-shot, aggressive" (influence 60%, duration 2 s).

**ElevenLabs-specific pitfalls:**
1. *Multi-event prompts produce mush.* "A man opens a door, walks across a creaky floor, and falls down stairs" yields a confused blur. Generate the three events separately, sequence them in your DAW.
2. *Music and SFX overlap.* If your prompt drifts into musical territory ("epic orchestral hit"), the SFX model will partially comply but with lower fidelity than the dedicated ElevenLabs Music endpoint. Use Music for full musical content and SFX for one-shot stings.
3. *No SSML, no audio tags inside SFX prompts.* These are TTS-only features; don't put `[whispering]` or `<break>` into SFX prompts.
4. *Looping toggle requires continuous-source prompts.* If you toggle looping on for a one-shot impact, the model may repeat the impact awkwardly or produce a poorly-wrapping clip.
5. *Auto duration tends slightly long for UI.* For sub-1-second UI clicks/notifications, set duration manually to 0.5–1.5 s.
6. *Generations are non-deterministic.* The same prompt produces different results each time. This is a feature for variation but a bug if you need reproducibility — keep a prompt log if you need to recreate.

**Commercial use.** All SFX generated on paid ElevenLabs plans (Starter $5/mo and up) are cleared for commercial use including ads and client work. Free-tier output is non-commercial only. ElevenLabs' terms also prohibit using output to develop competitive products.

**API.** The Sound Effects endpoint accepts the same prompt + duration + prompt_influence parameters via the JS/Python SDK; this is how you'd bake SFX generation into an agentic pipeline (e.g., generate UI sounds on demand for a game build, or per-scene Foley for a video pipeline).

### Part 6 — The Other Tools (Comparative Read)

| Tool | Strength | License posture | Best fit |
|---|---|---|---|
| **ElevenLabs SFX v2** | Strong on broad SFX/Foley/UI/ambience; clean API; commercial license on paid tiers; 30 s max | Commercial-clean | Default pick for SFX in production pipelines |
| **Stable Audio 2.5 / Open** | Long stereo (up to ~47 s Open, longer commercial), strong on field recordings; Open trained on CC data with attribution | Commercial-clean (Stable Audio); CC-only training (Open) | Open-source workflows, longer ambient beds, audio-to-audio inpainting |
| **Adobe Firefly Sound Effects** | Trained on licensed/PD content, integrated with Premiere; voice-to-SFX feature lets you act out timing | Commercial-safe by design | Adobe-shop creators; copyright-sensitive client work |
| **Meta Audiobox** (research demo, retired Feb 2026) | Unified SFX + speech + soundscape; voice + text dual-input; "in a cathedral" style restyling | Research-only, non-commercial | Reference for what dual-input prompting looks like |
| **Meta AudioGen / AudioCraft** | Open-source autoregressive text-to-audio; ~5 s outputs; strong baseline | Research / mixed commercial | Self-hosted experimentation |
| **Google AudioLM / MusicLM** | Hierarchical token model (semantic / coarse acoustic / fine acoustic) — explicitly captures attack/decay; impressive long-form coherence | Research-only, no public release of weights | Reference architecture; not usable in production |
| **Adobe Project Sound Lift** | Separates rather than generates; isolates voice/music/applause/noise | Preview/sneak | Cleanup of *real* recordings before layering AI-generated SFX |
| **Suno / Udio / Riffusion** | Music-first; not SFX-first. Suno = "Canva of music"; Udio = more produced/granular; Riffusion = loops, ambient beds, near-real-time | Suno/Udio: licensing under litigation as of 2026, agency-risky; Riffusion: workable | When the SFX is actually a piece of music or a beat-driven texture |
| **ElevenLabs Music** | Companion to SFX; license-clean; 4–6 min generations; clean API | Commercial-clean | When you cross from SFX into score |

**Picking quickly:**
- *One-shot, Foley, UI, impacts, ambience under 30 s, agency/client-safe* → **ElevenLabs SFX**.
- *Long ambient bed (>30 s), need stereo audio-to-audio inpainting* → **Stable Audio**.
- *Already in Adobe stack, paranoid about copyright* → **Firefly Sound Effects**.
- *Research / self-hosted* → **AudioCraft / AudioGen / Stable Audio Open**.
- *Crossing into music* → **ElevenLabs Music** (license-safe) or **Suno/Udio** (with eyes open about licensing risk).

### Part 7 — Worked Prompt Library by Use Case

For each, a short tested-pattern prompt; assume ElevenLabs SFX, default 30% influence and Auto duration unless otherwise noted.

**Game UI / feedback**
- Button click: "Soft satisfying button click, crisp short transient with subtle digital undertone, modern mobile UI, one-shot, 0.3 seconds" (manual 0.4 s, influence 50%)
- Achievement: "Bright triumphant achievement chime, three ascending bell-like tones with high-frequency shimmer sparkle, warm digital synth, short tail, rewarding and celebratory, one-shot" (manual 1.5 s)
- Error: "Subtle two-tone descending error notification, muted and gentle but unmistakable, low-mid frequency, modern app UI, one-shot" (manual 0.8 s)
- Level up: see Example A above
- Toggle/swipe: "Quick crisp digital toggle switch with mechanical click and subtle synth sweep, short and clean" (manual 0.4 s)
- Notification: "Soft pleasant notification ping, two ascending tones, clean digital, modern messaging app, one-shot" (manual 0.7 s)

**Game ambience**
- Forest day: "Daytime temperate forest soundscape, layered birdsong from multiple species in middle distance, gentle wind through leaves, occasional distant insect, hi-fi naturalistic field recording, seamless loop" (looping ON, 30 s, influence 25%)
- Dungeon: "Damp underground stone dungeon ambience, slow water dripping in the distance, low subterranean rumble, faint distant chains, occasional small rock falls, claustrophobic reverberant, dark, looping" (looping ON, 30 s)
- Cyberpunk city: "Cyberpunk megacity ambience at night: continuous low-frequency traffic hum, distant neon-sign electrical buzz, occasional far-off siren, intermittent flying-vehicle whoosh overhead, layered indistinct crowd murmur, slight rain on metal, lo-fi gritty atmosphere, seamless loop" (looping ON, 30 s)
- Underwater: see Example F above
- Tavern interior: "Medieval tavern interior, layered indistinct conversation, occasional laughter, wooden cup clinks, distant lute, subtle fire crackle, warm wooden room reverb, loopable" (looping ON, 30 s, influence 25%)
- Space station corridor: see Example D above

**Cinematic**
- Tension build: see Example B
- Jump scare: see Example G
- Emotional swell: "Slow cinematic emotional swell, warm sustained low strings rising in intensity over 6 seconds, gentle high overtone shimmer, no sharp transients, hopeful and bittersweet, scoring stem" (manual 6 s, influence 30%)
- Transition whoosh: "Cinematic transition whoosh, deep wide stereo movement left to right with rising mid-frequency air and a low-end thump on arrival, modern trailer style, one-shot" (manual 2 s, influence 50%)
- Braam: "Massive cinematic braam, sustained brassy low-end hit with metallic resonance, slow decay, trailer style, dramatic and ominous, one-shot" (manual 3 s, influence 40%)
- Riser: "Six-second cinematic riser, gradually building noise sweep with rising pitch, increasing density, ending in held silence before release, trailer transition" (manual 6 s)

**Foley**
- Footsteps wood: "Bare feet walking softly on creaky old hardwood floor, weight shifting, occasional board creak, close-mic Foley recording, dry intimate" (3 s, influence 25%)
- Footsteps gravel: "Heavy boots walking on dry coarse gravel, distinct crunch on each step, even pace, naturalistic close-mic Foley" (4 s, influence 25%)
- Footsteps wet cobblestone: see Example C
- Cloth movement: "Heavy wool coat rustling and swishing as a person turns and walks, close-mic Foley, dry, naturalistic" (3 s)
- Prop — keys: "Bunch of metal keys being picked up from a wooden table, jangle and clink, then placed in a fabric pocket, close Foley" (3 s)
- Prop — glass: "Glass bottle being set down firmly on a wooden bar, single hollow clink, dry" (1 s, influence 50%)
- Prop — paper: "Crumpling a single sheet of office paper into a ball, slow deliberate, close intimate Foley" (3 s)

**Mechanical / sci-fi**
- Spaceship hum: see Example D
- Robot movement: "Bipedal humanoid robot taking three steps, servo motors whirring on each joint movement, metallic mechanical clank on foot impact, hydraulic hiss, hi-fi sci-fi" (3 s, influence 45%)
- Weapon charging: "Energy weapon charging up over 1.5 seconds, rising electrical hum and high-frequency whine, ending in a held tone ready to fire, sci-fi, one-shot" (manual 2 s, influence 50%)
- Laser blast: "Single sci-fi laser blast, sharp electrical zap with downward pitch slide and short metallic resonant tail, retro-futuristic, one-shot" (manual 0.7 s, influence 55%)
- Door hiss: "Sci-fi pneumatic door sliding open: pressurised hiss of air, smooth motorised slide, soft mechanical clunk on stop, hi-fi" (2 s)

**Nature**
- Rain on tin roof: "Steady heavy rain falling on a corrugated tin roof, dense layered drops, occasional larger splash, naturalistic field recording, looping" (looping ON, 30 s, influence 25%)
- Thunder: "Single distant rumbling thunder rolling across an open plain, slow build, deep low frequency, gradual decay" (manual 8 s)
- Forest wind: "Strong wind moving through tall pine trees, layered needle-rustle, occasional gust building and releasing, naturalistic outdoor recording, looping" (looping ON, 30 s)
- Wildlife — owl: "Single distant great horned owl hooting twice in a quiet nighttime forest with subtle insect background, hi-fi field recording" (5 s, influence 25%)
- Campfire: "Close-mic campfire, continuous wood crackling with occasional small pops and embers, warm and intimate, looping" (looping ON, 30 s)
- Ocean waves: "Gentle ocean waves lapping a sandy beach, slow rhythmic swells, distant gulls, hi-fi naturalistic, looping" (looping ON, 30 s)

**Generative audio for product features** (i.e., when you're building a product that calls the SFX API at runtime)
- Best practice: pre-generate a *bank* of 5–10 variations per logical sound (so calls hit cache, not the API live), tag with prompt + seed if available, and randomise selection at runtime to avoid repetition fatigue.
- For UI sounds in real apps, prefer manual short durations and influence 45–60% for predictable, consistent timbre across variations.
- For dynamic ambiences (e.g., procedurally generated game world), generate looping beds offline by biome/scenario; modulate volume and crossfade at runtime rather than asking the API for new audio per scene.

### Part 8 — Post-Processing AI SFX (the "make it not sound AI" pipeline)

ElevenLabs SFX outputs are clean but tend to feel "centred", slightly compressed, and acoustically generic. The standard cleanup chain that makes them sit in a mix:

1. **High-pass filter** at 30–80 Hz to remove sub-rumble (unless the sound *is* sub-rumble).
2. **Subtractive EQ** to carve a frequency window that doesn't fight other layers — Krause's acoustic-niche idea applied to a mix bus.
3. **Gentle compression** (2:1 or 3:1, slow attack to preserve transients) to even out generation-to-generation variation. Don't crush — many AI generations already have light dynamic processing baked in.
4. **Reverb / spatialisation** to place the sound in the *same* acoustic environment as adjacent layers. Use a single shared reverb send across all SFX in a scene to glue them.
5. **Worldizing** (Murch) for sounds that need to feel real-space-anchored: render the AI clip, play it through a small monitor or phone speaker in the actual target room, re-record with a phone or field recorder, and mix the worldized version under the clean version at -10 to -15 dB.
6. **Pitch / time variation** when stacking same-category layers: pitch each duplicate by ±1–3 semitones and slightly time-stretch, so the model's residual sameness doesn't expose itself.
7. **Saturation / tape** for "vintage" or naturalistic targets; subtle harmonic distortion masks AI artifacts.
8. **Stereo widening** judiciously; ElevenLabs SFX is often closer to mono-centred than full stereo. Don't over-widen UI or impact transients (Murch's encoded zone wants centre).

### Part 9 — When NOT to Use AI-Generated SFX

- *Hero sounds with iconic identity* (e.g., flagship weapon in a AAA game, signature character sound) — these benefit from custom Foley + sound design where you control every variable. Burtt's lightsaber would not have come out of a prompt.
- *Real-world specificity* (a particular 1967 Mustang engine, a named church bell, a specific celebrity's voice) — stock libraries or original recordings.
- *Performance-bound timing* (sync-to-frame Foley with complex micro-rhythm) — traditional Foley is still faster and tighter.
- *Where licensing diligence requires audited training data* — prefer Adobe Firefly Sound Effects or Stable Audio Open with documented CC sources over models with opaque training data.

### Part 10 — Decision Tree (the "if you only remember three things" summary)

1. **Write the prompt as a captioned-audio sentence, not as a screenplay.** Source + action + material + environment + temporal arc + one mood word. 10–60 words. Mirror how AudioCaps captions are written.
2. **Iterate by changing one axis at a time** at influence 30%, then bump influence to 40–60% only when prompt is clean. If output sounds synthetic, drop influence to 20–25% and add "naturalistic / Foley / field recording".
3. **Layer in a DAW, don't ask one prompt to do a scene.** Generate base ambience + 1–3 accents + transients separately, glue them with a shared reverb bus and matched EQ. Respect Murch's Two-and-a-Half: don't stack more than ~2.5 layers of the same color.

---

## Recommendations

**Stage 1 — Adopt the template and toolchain (Week 1).**
- Standardise on ElevenLabs SFX as your default text-to-SFX engine for production work. Pay for at least the Creator tier so commercial license is in scope and you have enough credits to iterate.
- Adopt the six-slot prompt template and the iteration protocol verbatim. Keep a spreadsheet of `(prompt, influence, duration, looping, seed-if-available, notes, file path)` so generations are reproducible-ish.
- Build a personal SFX library organised by category (Footsteps, Ambience, Impacts, UI, Transitions, Nature, Mechanical/SciFi, Magic). Generate 5–10 variations per common sound and store as WAV.

**Stage 2 — Build the layered workflow (Week 2–3).**
- Set up a DAW project template with: SFX bus, Ambience bus, Foley bus, Music bus, and a single shared reverb send. This is your "scene engine".
- For every scene, plan layers before generating: base + 1–3 accents + transients. Generate each separately, import, mix.
- Apply the post-processing chain (HPF, subtractive EQ, gentle compression, shared reverb, optional worldizing) to every AI-generated stem before mix.

**Stage 3 — Operationalise for product/agent use (Week 3+).**
- For agent / runtime use, pre-generate banks of 5–10 variations per logical sound, tag with prompt metadata, and randomise at runtime rather than calling the API live.
- For voice-driven products, plan around vococentrism: voice in the centre dry, SFX panned and wetter, music wide and embodied. This is Murch's encoded↔embodied principle expressed as a mix architecture.
- Maintain a copyright-evidence trail per generation (source tool, plan tier, date, prompt) — useful if a content-ID system flags a clip.

**Stage 4 — Escalate to specialised tools when SFX hits limits.**
- If you need >30 s stereo ambience or audio-to-audio inpainting → switch to **Stable Audio**.
- If client requires audited training-data provenance → **Adobe Firefly Sound Effects**.
- If the SFX is actually music → **ElevenLabs Music** (license-safe), or **Suno/Udio** with eyes open about ongoing litigation.
- If you need dialogue-adjacent vocal SFX (creature vocalisations, robot speech) → use ElevenLabs voice tools (TTS, voice design) and treat them as encoded-side SFX, layered into the scene.

**Benchmarks that should change these recommendations:**
- *ElevenLabs SFX adds a multi-event timeline / "Director's Mode" with explicit per-event timing* → drop the "split into single sounds" rule and shift to scene prompts.
- *Stable Audio or Audiobox-class model adds open commercial license + ≥60 s stereo + clean API* → reconsider default engine.
- *Major Suno/Udio training-data ruling clarifies licensing* → revisit music-generation defaults for client work.
- *ElevenLabs SFX exposes seeds or deterministic generation* → drop the "pre-generate variation banks" workaround for product use.

---

## Caveats

- **The current generation of text-to-SFX models excels at single events and continuous ambiences and is materially worse at multi-event sequences.** ElevenLabs' own help docs say so; treat any vendor claim of "describe a whole scene" as marketing. Layer in a DAW.
- **Prompt influence settings, default behaviours, and credit costs evolve.** The numbers cited above (default 30%, 40 credits/sec when manual, 30 s max, 4 variations per generation, MP3 44.1 kHz / WAV 48 kHz) are from ElevenLabs documentation as of mid-2026 and from third-party guides published April–May 2026; verify against the live docs at the time of use.
- **"Royalty-free" is not the same as "indemnified."** Most text-to-SFX vendors grant a commercial license to *output* but do not indemnify against infringement claims arising from training data. ElevenLabs and Adobe Firefly are clearer than most; Suno and Udio are subject to active 2024–2026 lawsuits. Keep prompt + plan + date evidence for client work.
- **The Schaefferian, spectromorphological, and soundscape frameworks were developed for analysis and composition, not for prompting AI.** I've translated them into prompt vocabulary, but the mapping is heuristic — these models do not literally understand "graduated continuant" or "TARTYP centre cells", they understand the words because those words appear in audio captions and adjacent corpora. Treat the framework names as mnemonic scaffolding for *you*, and the actual descriptors (sustained drone, slow swell, granular texture, hi-fi field recording) as the model-facing language.
- **Several theorist-level claims here are summarised from secondary sources** (Designing Sound, A Sound Effect, FilmSound.org, Wikipedia, ResearchGate) rather than from the primary texts (Schaeffer's *Traité*, Smalley's *Spectromorphology* in *Organised Sound* 2(2), Schafer's *Tuning of the World*, Chion's *Audio-Vision*, Murch's *Dense Clarity / Clear Density*, Thom's *Designing a Movie for Sound*). For original-source rigour, those primary documents should be consulted; for working prompt-craft purposes, the operationalised summaries above are sufficient.
- **Meta Audiobox's public demo was retired in February 2026**, so the dual-input voice+text restyle workflow it pioneered is no longer publicly testable; it's referenced here as evidence of where the field is going (dual-input prompting, voice-anchored timbre + text-anchored style), not as a tool you can use today.
- **"Worldizing" produces files with real-room artefacts** (HVAC, mic self-noise, room modes) that may be desirable for cinematic feel but undesirable for clean UI/product audio. Use selectively.
- **AI-generated SFX still has subtle telltale artefacts** at close listening — slight timbral sameness across stacked layers, occasional pitch/phase drift in long generations, and a tendency toward mid-distance perspective even when prompted close-mic. Layering across categories (Murch's color-spectrum diversity), pitch/time variation, and worldizing all help mask these.