// Procedural Web-Audio sound effects. These are generated live from
// OscillatorNodes (no pre-recorded MP3) because the swipe-progress
// cue is a continuous parameter the kid drives in real time — a
// sample wouldn't track. The stepper +/- blips share the same module
// because they're tiny enough that an audio asset would be silly
// overhead.
//
// Lifecycle: the module is lazy. The AudioContext is created on the
// first call to any function — that always happens inside a user
// gesture (pointerdown on the swipe, click on the stepper), so iOS
// Safari unlocks the context immediately. If the context is created
// suspended (some browsers do this even inside a gesture), we resume
// it before the first sound plays.
//
// Mute / volume: mirrors the SFX player. `setProceduralEnabled` and
// `setProceduralVolume` are called from the `useSound` hook the same
// way it pushes settings into the sample-based player, so a parent
// muting once mutes both.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let enabled = true;
let masterVolume = 1;

// Two-layer swipe oscillator stack — a low triangle for the body of
// the charging tone and a higher sawtooth for grit (so the ramp feels
// like "charging up", not just a sine that gets louder). Both live in
// a shared GainNode that ramps with progress; on stop we tear down
// all three nodes together.
let swipeOscBody: OscillatorNode | null = null;
let swipeOscGrit: OscillatorNode | null = null;
let swipeGritGain: GainNode | null = null;
let swipeGain: GainNode | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  // Older Safari exposes the constructor on webkitAudioContext.
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = masterVolume;
  masterGain.connect(ctx.destination);
  return ctx;
}

function maybeResume(c: AudioContext): void {
  if (c.state === "suspended") {
    void c.resume();
  }
}

// ── Public mute/volume API ─────────────────────────────────────────
// Called by useSound's effect so a parent mute toggle silences the
// procedural cues alongside the sample-based ones.

export function setProceduralEnabled(value: boolean): void {
  enabled = value;
  if (!enabled && masterGain && ctx) {
    masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
  } else if (enabled && masterGain && ctx) {
    masterGain.gain.setTargetAtTime(masterVolume, ctx.currentTime, 0.02);
  }
}

export function setProceduralVolume(value: number): void {
  masterVolume = Math.max(0, Math.min(1, value));
  if (enabled && masterGain && ctx) {
    masterGain.gain.setTargetAtTime(masterVolume, ctx.currentTime, 0.02);
  }
}

// ── Swipe progress (charging) tone ─────────────────────────────────
// Frequencies span a wide musical interval (A3 → C#6) so the upward
// glide is unmistakable. Gain max 0.55 is well above the SFX player's
// typical sample gain — procedural triangles are perceptually quieter
// per unit linear gain than sample playback, so we compensate by
// ramping higher. Grit (sawtooth, octave up) starts silent and fades
// in across the upper half of the swipe (p² curve) so the kid hears a
// clean tone at first, then the energy builds toward the commit.

const SWIPE_FREQ_MIN_HZ = 220;
const SWIPE_FREQ_MAX_HZ = 1100;
const SWIPE_GAIN_BASE = 0.12;
const SWIPE_GAIN_MAX = 0.55;
const SWIPE_GRIT_FREQ_RATIO = 2;
const SWIPE_GRIT_MIX_MAX = 0.4;

function teardownSwipeNodes(): void {
  if (swipeOscBody) {
    try {
      swipeOscBody.stop();
    } catch {
      // already stopped
    }
    swipeOscBody.disconnect();
    swipeOscBody = null;
  }
  if (swipeOscGrit) {
    try {
      swipeOscGrit.stop();
    } catch {
      // already stopped
    }
    swipeOscGrit.disconnect();
    swipeOscGrit = null;
  }
  if (swipeGritGain) {
    swipeGritGain.disconnect();
    swipeGritGain = null;
  }
  if (swipeGain) {
    swipeGain.disconnect();
    swipeGain = null;
  }
}

export function startSwipeProgress(): void {
  const c = ensureCtx();
  if (!c || !masterGain || !enabled) return;
  maybeResume(c);

  // Cleanup any previous swipe that didn't unwind (pointercancel race).
  teardownSwipeNodes();

  const now = c.currentTime;

  swipeGain = c.createGain();
  swipeGain.gain.setValueAtTime(0, now);
  // Quick attack to the BASE gain — the kid hears the tone the moment
  // their finger lands. 40ms ramp dodges the click an instant onset
  // would produce.
  swipeGain.gain.linearRampToValueAtTime(SWIPE_GAIN_BASE, now + 0.04);
  swipeGain.connect(masterGain);

  swipeOscBody = c.createOscillator();
  swipeOscBody.type = "triangle";
  swipeOscBody.frequency.setValueAtTime(SWIPE_FREQ_MIN_HZ, now);
  swipeOscBody.connect(swipeGain);
  swipeOscBody.start(now);

  // Grit — sawtooth one octave up, attenuated by its own GainNode.
  // Routed THROUGH swipeGain so master volume + mute apply to it.
  swipeGritGain = c.createGain();
  swipeGritGain.gain.setValueAtTime(0, now);
  swipeGritGain.connect(swipeGain);
  swipeOscGrit = c.createOscillator();
  swipeOscGrit.type = "sawtooth";
  swipeOscGrit.frequency.setValueAtTime(SWIPE_FREQ_MIN_HZ * SWIPE_GRIT_FREQ_RATIO, now);
  swipeOscGrit.connect(swipeGritGain);
  swipeOscGrit.start(now);
}

export function updateSwipeProgress(progress: number): void {
  const c = ensureCtx();
  if (!c || !swipeOscBody || !swipeOscGrit || !swipeGain || !swipeGritGain) return;
  const p = Math.max(0, Math.min(1, progress));
  const freq = SWIPE_FREQ_MIN_HZ + p * (SWIPE_FREQ_MAX_HZ - SWIPE_FREQ_MIN_HZ);
  const targetGain = SWIPE_GAIN_BASE + p * (SWIPE_GAIN_MAX - SWIPE_GAIN_BASE);
  swipeOscBody.frequency.setTargetAtTime(freq, c.currentTime, 0.04);
  swipeOscGrit.frequency.setTargetAtTime(freq * SWIPE_GRIT_FREQ_RATIO, c.currentTime, 0.04);
  swipeGain.gain.setTargetAtTime(targetGain, c.currentTime, 0.04);
  // p² keeps the early grit nearly silent — the kid hears the body
  // tone clean at first, then grit emerges as they near commit.
  swipeGritGain.gain.setTargetAtTime(p * p * SWIPE_GRIT_MIX_MAX, c.currentTime, 0.05);
}

// Ends the swipe. `committed=true` fires a short "ding" (a quick
// upward chime); `committed=false` fires a "miss" (descending blip).
// Always fades the oscillators out cleanly first so the kid doesn't
// hear a click on stop.
export function stopSwipeProgress(committed: boolean): void {
  const c = ensureCtx();
  if (!c) return;
  if (swipeGain) {
    const localGain = swipeGain;
    const localBody = swipeOscBody;
    const localGrit = swipeOscGrit;
    const localGritGain = swipeGritGain;
    localGain.gain.cancelScheduledValues(c.currentTime);
    localGain.gain.setTargetAtTime(0, c.currentTime, 0.04);
    window.setTimeout(() => {
      if (localBody) {
        try {
          localBody.stop();
        } catch {
          // already stopped
        }
        localBody.disconnect();
      }
      if (localGrit) {
        try {
          localGrit.stop();
        } catch {
          // already stopped
        }
        localGrit.disconnect();
      }
      localGritGain?.disconnect();
      localGain.disconnect();
    }, 180);
    swipeOscBody = null;
    swipeOscGrit = null;
    swipeGritGain = null;
    swipeGain = null;
  }
  if (committed) playDing();
  else playMiss();
}

// ── One-shot envelope helper ───────────────────────────────────────
// Used by ding / miss / stepper blip. Creates a fresh oscillator+gain,
// schedules an envelope, and self-cleans after the tail. `type`
// defaults to sine for a soft cue; "triangle" gives a slightly
// brighter edge for the ding.

type Tone = {
  freq: number;
  endFreq?: number;
  duration: number;
  gain?: number;
  type?: OscillatorType;
};

function playTone({ freq, endFreq, duration, gain = 0.2, type = "sine" }: Tone): void {
  const c = ensureCtx();
  if (!c || !masterGain || !enabled) return;
  maybeResume(c);

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + duration);
  }
  // Quick attack, slow release — gives the cue a pluck rather than a
  // hard onset/cutoff click.
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration + 0.04);
  osc.addEventListener("ended", () => {
    osc.disconnect();
    g.disconnect();
  });
}

// ── Discrete cues ──────────────────────────────────────────────────

function playDing(): void {
  // Bright upward chime — A5 → E6 over 220ms. Triangle wave keeps it
  // friendly without being saccharine.
  playTone({ freq: 880, endFreq: 1320, duration: 0.22, gain: 0.2, type: "triangle" });
}

function playMiss(): void {
  // Soft falling tone — F4 → C4 over 180ms. Sine keeps it gentle so
  // the kid doesn't feel scolded for releasing early.
  playTone({ freq: 349, endFreq: 261, duration: 0.18, gain: 0.16, type: "sine" });
}

// Stepper +/- blip. Direction "up" rises (D5 → A5); "down" falls
// (A5 → D5). Tiny 70ms tail so a fast tap rhythm doesn't stack.
export function playStepperBlip(direction: "up" | "down"): void {
  const up = direction === "up";
  playTone({
    freq: up ? 587 : 880,
    endFreq: up ? 880 : 587,
    duration: 0.07,
    gain: 0.12,
    type: "sine",
  });
}
