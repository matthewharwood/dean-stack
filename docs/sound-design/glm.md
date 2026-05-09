# Sound Design from Text: A Comprehensive Research Framework

## The Core Challenge

Translating a *situation* into *text* that produces a *perfect sound* requires bridging three domains: **human experience → linguistic description → acoustic output**. Professional sound designers do this intuitively. For AI text-to-SFX, we need explicit, systematic frameworks.

---

## I. FOUNDATIONAL FRAMEWORKS FOR DEFINING SOUND

### 1. Schaeffer's Typomorphology (The Grandfather Framework)

Pierre Schaeffer, the founder of *musique concrète*, created the most rigorous system for describing sound objects. His framework operates on two axes:

**TYPOLOGY** — Classifying *what kind* of sound it is:

| Type | Description | Example |
|---|---|---|
| **Impulsive** | Short attack, immediate decay | A single footstep, a door click |
| **Sustained** | Continuous energy input | A drone, flowing water, engine hum |
| **Iterative** | Rapidly repeated impulses | Rain, rattling, machine gun |
| **Harmonic** | Clear pitched content | A bell, a note, a voice |
| **Inharmonic** | Noisy, unpitched | A crash, white noise, a scrape |

**MORPHOLOGY** — Describing the *internal qualities*:

- **Mass**: How the sound fills spectral space (thin/pure → thick/noise)
- **Dynamics**: The envelope shape (attack slope, sustain character, decay curve)
- **Timbre**: The "grain" — rough, smooth, shimmering, hollow
- **Allure**: Internal modulation — tremolo, vibrato, flutter, wow
- **Melodic Profile**: Whether pitch rises, falls, stays static, or oscillates

**Why this matters for text-to-SFX**: These are the *atoms* of sound description. A prompt that addresses typology AND morphology gives the AI far more signal than a generic description.

---

### 2. Smalley's Spectromorphology (The Shape of Sound in Time)

Dennis Smalley extended Schaeffer with a focus on how spectra *move* and *change*. His key constructs:

**Motion Types** — The trajectory of the sound through time:
- **Ascending/Descending** — rising or falling in pitch or brightness
- **Convex** — grows then recedes (a passing car)
- **Concave** — emerges from silence, drops in, then grows (reverse cymbal feel)
- **Divergent/Convergent** — spectra spreading apart or coming together
- **Streaming** — multiple parallel threads of sound (rain on different surfaces)

**Growth Processes**:
- **Onset** → **Continuant** → **Termination**
- *Onset morphology* alone is critical: is it a *sharp attack* (punch), a *gradual emergence* (fade-in), or an *explosive burst* (explosion)?

**Why this matters**: Most AI sound generation failures come from getting the *temporal shape* wrong. A "thunder clap" and "thunder rumble" have the same source — different spectromorphological profiles.

---

### 3. The Foley Categorization System (Industry Standard)

Film and game sound designers use a practical taxonomy:

| Category | What It Covers | Key Descriptors |
|---|---|---|
| **Footsteps** | Locomotion | Who (weight, shoe type), What surface, What pace, What mood |
| **Props** | Object handling | Material, action (pick up, put down, slide, drop), size |
| **Cloth** | Movement | Fabric type, speed, intensity (rustle vs. flap) |
| **Environment/Ambience** | Space itself | Density, spectral character, rhythmic patterns, weather |

**The Foley Descriptive Formula**: `AGENT + MATERIAL + ACTION + INTENSITY + SPACE`

- "A *heavy man* in *leather boots* *walking* *slowly* on *wet gravel*"
- vs. "A *child* in *bare feet* *running* *frantically* on *dry leaves*"

Same action class — completely different sound. Every variable matters.

---

## II. THE DESCRIPTIVE METHOD: HOW TO WRITE SOUND

### Framework 1: The AOE Model (Action–Object–Environment)

This is the most practical and widely-used framework for text-to-SFX prompting:

```
┌─────────────────────────────────────────────┐
│  ACTION  (What is happening?)               │
│  ── striking, scraping, flowing, cracking,  │
│     tearing, humming, shattering, dripping  │
├─────────────────────────────────────────────┤
│  OBJECT  (What material/thing is involved?) │
│  ── wood, metal, glass, water, flesh,       │
│     ceramic, leather, stone, paper          │
├─────────────────────────────────────────────┤
│  ENVIRONMENT  (Where does it happen?)       │
│  ── cave, small room, open field, forest,   │
│     underwater, cathedral, hallway          │
└─────────────────────────────────────────────┘
```

**Example progression** (from vague to precise):

| Level | Prompt | Quality |
|---|---|---|
| ❌ Minimal | "Door closing" | Generic, unpredictable |
| ⚠️ Better | "Wooden door closing" | Adds material |
| ✅ Good | "Heavy wooden door slamming shut" | Adds weight + action intensity |
| ✨ Excellent | "Thick oak door slamming shut in a stone corridor, reverberating with a deep boom and a metallic latch click" | Full AOE + temporal + spectral |

---

### Framework 2: The SMASH Method (Purpose-Built for Text-to-SFX)

I've synthesized the research into a structured prompting method:

| Element | Question | Example Terms |
|---|---|---|
| **S**ource | What is producing the sound? | Thunder, engine, sword, breath |
| **M**aterial | What is it made of? | Steel, glass, wet mud, dry bone |
| **A**ction | What force/interaction creates it? | Struck, dragged, dropped, crushed, sliced |
| **S**pace | Where is it? How does the room shape it? | Cathedral (long reverb), closet (tight), open plain (no reflection) |
| **H**ue | What is the emotional/spectral color? | Dark, bright, warm, cold, harsh, muffled, distant, intimate |

**Applied example: "A sword being drawn"**

| Element | Poor | Rich |
|---|---|---|
| Source | Sword | Long katana |
| Material | Metal | High-carbon steel, slightly oiled |
| Action | Drawn | Sharply drawn from a leather scabbard with a singing ring |
| Space | — | In a quiet dojo, slight room resonance |
| Hue | — | Bright, sharp, menacing, clean |

**Poor prompt**: "Sword being drawn"
**Rich prompt**: "A high-carbon steel katana sharply drawn from a leather scabbard, bright metallic singing ring with a slight oil whisper, in a quiet dojo with gentle room resonance, menacing and precise"

---

### Framework 3: The Temporal Narrative Method

For *complex, evolving soundscapes*, use a timeline structure:

```
[ONSET] → [DEVELOPMENT] → [CLIMAX] → [RESOLUTION]
```

**Example: "A building collapsing"**

- **ONSET**: "Begins with a deep structural groan, low rumbling at 40-80Hz, steel cables pinging and snapping one by one"
- **DEVELOPMENT**: "Rumbling intensifies, concrete cracking with sharp reports, dust and debris patter escalating, glass shattering in cascading sequence"
- **CLIMAX**: "Massive roar of collapse, full-spectrum impact, concussive low-end thud, chaotic debris cascade"
- **RESOLUTION**: "Settling rumble, individual plinks of falling glass, hiss of dust, low fading resonance"

This gives the AI a *script* rather than a *label*.

---

### Framework 4: Cross-Modal Metaphor Method

Professional sound designers constantly use metaphors from other senses. This works because AI models are trained on human language — the same metaphors humans use:

| Sensory Domain | Sound Application | Examples |
|---|---|---|
| **Visual** | Brightness, color, shape | "Bright shimmer," "dark rumble," "round tone," "sharp attack" |
| **Tactile** | Texture, weight, temperature | "Rough scrape," "smooth tone," "heavy impact," "cold metallic" |
| **Kinetic** | Motion, force, trajectory | "Sweeping whoosh," "punching hit," "rising wail," "cascading waterfall" |
| **Gustatory** | Density, richness | "Thick drone," "crunchy texture," "bitter distortion" |

**Key principle**: The more *sensory channels* you engage in your description, the more precisely the model can target the acoustic properties.

---

## III. ADVANCED DESCRIPTIVE DIMENSIONS

### The Spectral Axis

| Descriptor | Acoustic Meaning | Opposite |
|---|---|---|
| Bright | High-frequency energy present | Dark / Muffled |
| Harsh | Aggressive upper-mids | Smooth / Warm |
| Hollow | Missing mids (scooped) | Full / Rich |
| Thin | Narrow spectral content | Thick / Dense |
| Metallic | Inharmonic overtones | Wooden / Warm |
| Boomy | Excessive low-end | Tight / Controlled |

### The Spatial Axis

| Descriptor | Acoustic Meaning |
|---|---|
| Close / Intimate | Minimal room, dry signal, detailed |
| Distant / Far | High-frequency rolloff, early reflections |
| Wide | Stereo spread, environmental |
| Narrow | Mono-focused, direct |
| Reverberant | Long tail, reflective space |
| Dry | No reflections, anechoic |

### The Temporal Axis

| Descriptor | Acoustic Meaning |
|---|---|
| Staccato | Short, detached, percussive |
| Legato | Smooth, connected, sustained |
| Tremolo | Amplitude modulation |
| Glissando | Sliding pitch |
| Accelerando | Speeding up |
| Ritardando | Slowing down |

---

## IV. THE LAYER METHOD: DESCRIBING COMPLEX SOUNDS

Professional sound design is *always* layered. A single real-world sound is rarely one thing. Describe each layer:

```
┌──────────────────────────────────────────┐
│  LAYER 1: BASE (The identity)            │
│  "Deep low-frequency rumble"             │
├──────────────────────────────────────────┤
│  LAYER 2: DETAIL (The texture/grain)     │
│  "Crackling, popping, uneven surface"    │
├──────────────────────────────────────────┤
│  LAYER 3: ACCENT (The transients)        │
│  "Sharp intermittent cracks and pops"    │
├──────────────────────────────────────────┤
│  LAYER 4: ATMOSPHERE (The space/air)     │
│  "Distant echo, hissing steam, wind"     │
└──────────────────────────────────────────┘
```

**Full layered example: "Campfire"**

> *"A crackling campfire: a warm, deep low-frequency woody rumble as the base, with irregular sharp pops and hisses as small twigs catch and sap bubbles burst, occasional louder cracks as thicker logs shift and split, all surrounded by a gentle ambient hiss of rising hot air and soft wind, in an open forest clearing with no echo"*

---

## V. PROMPT ENGINEERING FOR TEXT-TO-SFX (ElevenLabs-Specific)

### General Principles

1. **Be specific about materials** — "metal" is vague; "rusted iron" or "polished brass" is actionable
2. **Be specific about actions and forces** — "hitting" is vague; "lightly tapping," "forcefully slamming," "glancing off" are distinct
3. **Use temporal markers** — "starting with... then... followed by... ending with..."
4. **Specify scale** — "tiny," "massive," "distant," "close-up" all change the acoustic result
5. **Include emotional qualifiers** — "eerie," "comedic," "heroic," "subtle" help the model calibrate intensity
6. **Onomatopoeia works** — Words like "buzz," "clang," "whoosh," "thud," "crackle" are acoustic tokens the model understands directly
7. **Chain events for narrative** — Sequential descriptions produce multi-event sounds

### Prompt Structure Template

```
[EMOTIONAL/SCENIC CONTEXT], [PRIMARY SOURCE + MATERIAL + ACTION],
[SPECTRAL QUALITY], [TEMPORAL SHAPE], [SPATIAL CONTEXT],
[SECONDARY DETAILS/LAYERS]
```

### Before/After Examples

**Door creak:**
- ❌ "Door creaking"
- ✅ "An old heavy wooden door slowly creaking open on rusty iron hinges, high-pitched squealing groan, long sustained strain, in a dark empty hallway with distant reverb, eerie and tense"

**Explosion:**
- ❌ "Big explosion"
- ✅ "A massive industrial explosion: starts with a sharp cracking detonation, instantly followed by a deep concussive boom that shakes the ground, then a rolling wave of crumbling debris and shattering glass, fading into a low rumbling afterglow with the hiss of fires, outdoor open space"

**Sci-fi weapon:**
- ❌ "Laser gun"
- ✅ "A futuristic plasma rifle firing: a quick high-pitched electronic whine charging up for half a second, then a sharp bright energy discharge with a sizzling crackle, followed by a deep resonant bass punch and fading electric hum, in a metallic spaceship corridor with echo"

**Rain:**
- ❌ "Rain sound"
- ✅ "Steady heavy rain falling on a tin roof with a metallic pattering texture, occasional louder drops hitting with a resonant ping, distant rolling thunder underneath, warm and cozy atmosphere, nighttime"

---

## VI. EXPERT MENTAL MODEL: THE SOUND DESIGNER'S DECISION TREE

When a professional sound designer approaches a scene description, they implicitly run this process:

```
1. WHAT IS THE SCENE?
   → Identify all sound sources present

2. WHAT IS THE FOCAL POINT?
   → Which sound carries the narrative? Prioritize that.

3. WHAT ARE THE MATERIALS?
   → Every object has an acoustic signature based on material.

4. WHAT ARE THE FORCES?
   → How much energy? What direction? Continuous or impulsive?

5. WHAT IS THE SPACE?
   → Room size, surface materials, open/closed, humidity even.

6. WHAT IS THE PERSPECTIVE?
   → Close-up (intimate, detailed) vs. wide (environmental, distant)

7. WHAT IS THE EMOTIONAL INTENT?
   → This determines intensity, brightness, and pacing.

8. WHAT LAYERS ARE NEEDED?
   → Base identity + texture + accents + atmosphere + silence
```

---

## VII. COMMON FAILURE MODES AND CORRECTIONS

| Failure | Cause | Fix |
|---|---|---|
| Sound too generic | Missing material/action specificity | Add material adjectives and force descriptors |
| Wrong temporal shape | No envelope description | Add onset/continuation/ending description |
| Sounds "flat" / lacking depth | No spatial information | Add room/space/distance descriptors |
| Too much going on | Overloaded prompt with competing elements | Prioritize 2-3 elements, use temporal sequencing |
| Wrong emotional tone | Missing affective qualifiers | Add mood words: "gentle," "aggressive," "melancholic" |
| Sounds artificial/uncanny | Missing organic detail | Add imperfection cues: "slightly uneven," "random," "irregular" |
| Inconsistent environment | Conflicting spatial cues | Make sure space matches source (no cathedral reverb on a car interior) |

---

## VIII. QUICK-REFERENCE: MASTER DESCRIPTION VOCABULARY

### Materials
Rusted iron, polished steel, wet concrete, dry gravel, rough stone, smooth glass, aged wood, fresh snow, thick mud, cracked ceramic, taut leather, dense foam, brittle plastic, coarse sand, slimy moss

### Actions
Struck, scraped, dragged, dropped, crushed, sliced, torn, shattered, splashed, squeezed, crumpled, tapped, slammed, brushed, flicked, sawed, hammered, ground, wrung, snapped

### Spectral
Bright, dark, warm, cold, harsh, mellow, shrill, deep, tinny, full-bodied, hollow, nasal, crisp, muddy, airy, dense, thin, fat

### Spatial
Reverberant, dry, close, distant, wide, narrow, intimate, expansive, echoing, muffled, direct, ambient, cavernous, claustrophobic

### Temporal
Sudden, gradual, sustained, brief, staccato, legato, accelerating, decelerating, rhythmic, irregular, pulsing, continuous, intermittent

### Emotional/Atmospheric
Eerie, comforting, tense, peaceful, chaotic, serene, ominous, playful, dramatic, subtle, intense, delicate, brutal, haunting, joyful

---

## IX. SYNTHESIS: THE ULTIMATE PROMPT FORMULA

Combining all frameworks, here is a meta-template:

> **[Atmosphere/Mood]** scene of **[Primary Source: material + object]** being **[Action with force/velocity modifier]**, producing a **[Spectral descriptor]** sound with a **[Temporal/envelope descriptor]** profile, **[Secondary details and layers]**, in a **[Spatial/environment descriptor]** space, **[Perspective/distance qualifier]**

**Filled in:**

> *"An eerie, tense scene of an old rusted iron gate being slowly pushed open with a grinding scrape, producing a harsh, metallic shrieking sound with a long sustained onset and trembling decay, layered with the squeal of unoiled hinges and the scrape of metal on stone floor, in a dark, cavernous stone corridor with long reverberant tail, heard from close-up perspective"*

---

## X. KEY TAKEAWAYS

1. **Sound is never one thing** — it's always layers. Describe each layer.
2. **Material determines everything** — "wood" vs "metal" vs "glass" creates fundamentally different acoustic signatures even for the same action.
3. **The envelope is the identity** — how a sound starts, sustains, and ends is often more recognizable than its spectral content. A "door slam" and a "gunshot" can have similar spectra — different envelopes.
4. **Space is not decoration — it IS the sound** — a sound without a space description will default to some generic acoustic environment. Always specify.
5. **Imperfection is realism** — real sounds have micro-variations, unevenness, and randomness. Add cues like "slightly irregular," "random paces," "uneven surface."
6. **Temporal narrative beats labels** — "Explosion" gives the model one token. "Sharp crack → deep boom → rolling debris → fading rumble" gives it a script to follow.
7. **Metaphors are acoustic instructions** — "shimmering" = high-frequency modulation. "Heavy" = low-frequency emphasis. The model speaks this language.

The gap between *what you hear in your mind* and *what the AI generates* is almost always a gap in **descriptive precision**, not a gap in the model's capability. These frameworks give you the vocabulary to close that gap systematically.