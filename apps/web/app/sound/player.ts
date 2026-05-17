import { type RegistryEntry, SFX_REGISTRY, type SfxEventId } from "./registry";

// SfxPlayer — singleton Web Audio player.
//
// Why Web Audio (not HTMLAudioElement): each `play()` creates a fresh
// `AudioBufferSourceNode` that points at the same decoded `AudioBuffer`.
// Multiple simultaneous plays = multiple source nodes, no contention. The
// "rapid replay garbles the audio" problem is the HTMLAudioElement-reuse
// trap; Web Audio sidesteps it by construction.
//
// Per-event policy decides what "play again while playing" means:
//   - restart  : cancel current instance(s), start fresh (UI feedback)
//   - polyphony: allow stacking (combat hits)
//   - loop     : start once, persist until stop() (ambience beds)
//
// iOS Safari requires AudioContext to be created/resumed inside a user
// gesture handler — `unlock()` is called by the React hook on first
// pointerdown / keydown / touchstart. Until then, plays are queued
// silently (the AudioContext just isn't running).

interface ActiveInstance {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface BrowserAudioGlobals {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

const POLYPHONY_CAP = 6; // max simultaneous instances of one event

// Lazily-initialized cross-singleton state. Module-scope so two `useSound()`
// hook callers share buffers, the AudioContext, and active instance lists.
class SfxPlayer {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers = new Map<SfxEventId, AudioBuffer>();
  private inFlightLoads = new Map<SfxEventId, Promise<AudioBuffer | null>>();
  private active = new Map<SfxEventId, ActiveInstance[]>();
  private loops = new Map<SfxEventId, ActiveInstance>();
  private enabled = true;
  private masterVolume = 1;
  private unlocked = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }

  setMasterVolume(v: number): void {
    this.masterVolume = v;
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  // Must be called from a user-gesture handler. Idempotent.
  unlock(): void {
    if (this.unlocked) return;
    this.ensureContext();
    if (this.context && this.context.state === "suspended") {
      void this.context.resume();
    }
    this.unlocked = true;
  }

  // Fire-and-forget. Returns a promise mostly for tests; production callers
  // shouldn't need to await — sound is a side effect.
  //
  // `options.volumeScale` (0..1) multiplies the per-event gain for this
  // ONE call only. Used by the auto-play character-name effect to play
  // the same MP3 the speaker button uses, but at 75% — so the kid
  // doesn't get blasted every time a new pilot or enemy enters the
  // board. Loop entries ignore the scale (they go through
  // `startLoop`, which doesn't currently propagate per-instance gain).
  async play(eventId: SfxEventId, options?: { volumeScale?: number }): Promise<void> {
    if (!this.enabled) return;
    if (typeof window === "undefined") return;

    this.ensureContext();
    if (!this.context || !this.masterGain) return;

    // Resume if suspended — happens after page-tab backgrounding on some browsers.
    if (this.context.state === "suspended" && this.unlocked) {
      void this.context.resume();
    }

    const entry = SFX_REGISTRY[eventId];
    if (!entry) return;

    const buffer = await this.loadBuffer(eventId, entry);
    if (!buffer) return;
    if (!this.context || !this.masterGain) return; // re-check post-await

    if (entry.policy === "loop") {
      this.startLoop(eventId, entry, buffer);
      return;
    }

    if (entry.policy === "restart") {
      this.stopActive(eventId);
    } else if (entry.policy === "polyphony") {
      this.enforcePolyphonyCap(eventId);
    }

    this.spawnInstance(eventId, entry, buffer, options?.volumeScale);
  }

  // Like `play()` but the returned Promise resolves when the sample
  // FINISHES playing (i.e. the underlying source's `ended` event).
  // Loops resolve immediately because they would otherwise never
  // settle. Used by the attack flow so the enemy doesn't die until
  // the attack sound has finished — preserving the "attack lands,
  // THEN the world advances" beat.
  async playUntilEnded(eventId: SfxEventId, options?: { volumeScale?: number }): Promise<void> {
    if (!this.enabled) return;
    if (typeof window === "undefined") return;

    this.ensureContext();
    if (!this.context || !this.masterGain) return;
    if (this.context.state === "suspended" && this.unlocked) {
      void this.context.resume();
    }

    const entry = SFX_REGISTRY[eventId];
    if (!entry) return;

    const buffer = await this.loadBuffer(eventId, entry);
    if (!buffer) return;
    if (!this.context || !this.masterGain) return;

    if (entry.policy === "loop") {
      // Loop entries don't have a natural end — fire and forget so the
      // caller can keep moving. The route owns when to stop a loop.
      this.startLoop(eventId, entry, buffer);
      return;
    }

    if (entry.policy === "restart") {
      this.stopActive(eventId);
    } else if (entry.policy === "polyphony") {
      this.enforcePolyphonyCap(eventId);
    }

    return new Promise<void>((resolve) => {
      if (!this.context || !this.masterGain) {
        resolve();
        return;
      }
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      const gain = this.context.createGain();
      const scale =
        options?.volumeScale === undefined ? 1 : Math.max(0, Math.min(1, options.volumeScale));
      gain.gain.value = (entry.gain ?? 1) * scale;
      source.connect(gain);
      gain.connect(this.masterGain);

      const instance: ActiveInstance = { source, gain };
      const list = this.active.get(eventId) ?? [];
      list.push(instance);
      this.active.set(eventId, list);

      source.onended = () => {
        const current = this.active.get(eventId);
        if (current) {
          const idx = current.indexOf(instance);
          if (idx >= 0) current.splice(idx, 1);
        }
        resolve();
      };

      source.start(0);
    });
  }

  stop(eventId: SfxEventId): void {
    this.stopActive(eventId);
    this.stopLoop(eventId);
  }

  stopAll(): void {
    for (const id of [...this.active.keys()]) this.stopActive(id);
    for (const id of [...this.loops.keys()]) this.stopLoop(id);
  }

  // Test/cleanup hook — fully tear down. Real apps should never need this.
  destroy(): void {
    this.stopAll();
    if (this.context) {
      void this.context.close().catch(() => undefined);
    }
    this.context = null;
    this.masterGain = null;
    this.buffers.clear();
    this.inFlightLoads.clear();
    this.unlocked = false;
  }

  private ensureContext(): void {
    if (this.context) return;
    if (typeof window === "undefined") return;
    const globals = window as unknown as BrowserAudioGlobals;
    const Ctx = globals.AudioContext ?? globals.webkitAudioContext;
    if (!Ctx) return;
    this.context = new Ctx();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.context.destination);
  }

  private async loadBuffer(eventId: SfxEventId, entry: RegistryEntry): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(eventId);
    if (cached) return cached;
    const inFlight = this.inFlightLoads.get(eventId);
    if (inFlight) return inFlight;

    if (!this.context) return null;
    const ctx = this.context;
    const url = resolveAssetUrl(entry.path);

    const promise: Promise<AudioBuffer | null> = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        this.buffers.set(eventId, buffer);
        return buffer;
      } catch {
        return null;
      } finally {
        this.inFlightLoads.delete(eventId);
      }
    })();

    this.inFlightLoads.set(eventId, promise);
    return promise;
  }

  private spawnInstance(
    eventId: SfxEventId,
    entry: RegistryEntry,
    buffer: AudioBuffer,
    volumeScale?: number,
  ): void {
    if (!this.context || !this.masterGain) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    // Per-event default × per-call scale × (later) the master volume on
    // this.masterGain. Clamp the scale defensively so callers passing
    // garbage don't damage the kid's hearing.
    const scale = volumeScale === undefined ? 1 : Math.max(0, Math.min(1, volumeScale));
    gain.gain.value = (entry.gain ?? 1) * scale;
    source.connect(gain);
    gain.connect(this.masterGain);

    const instance: ActiveInstance = { source, gain };
    const list = this.active.get(eventId) ?? [];
    list.push(instance);
    this.active.set(eventId, list);

    source.onended = () => {
      const current = this.active.get(eventId);
      if (!current) return;
      const idx = current.indexOf(instance);
      if (idx >= 0) current.splice(idx, 1);
    };

    source.start(0);
  }

  private stopActive(eventId: SfxEventId): void {
    const list = this.active.get(eventId);
    if (!list || list.length === 0) return;
    for (const instance of list) {
      try {
        instance.source.stop();
      } catch {
        // already-stopped sources throw on second stop(); ignore
      }
    }
    list.length = 0;
  }

  private enforcePolyphonyCap(eventId: SfxEventId): void {
    const list = this.active.get(eventId);
    if (!list) return;
    while (list.length >= POLYPHONY_CAP) {
      const oldest = list.shift();
      if (oldest) {
        try {
          oldest.source.stop();
        } catch {
          // ignore
        }
      }
    }
  }

  private startLoop(eventId: SfxEventId, entry: RegistryEntry, buffer: AudioBuffer): void {
    if (!this.context || !this.masterGain) return;
    if (this.loops.has(eventId)) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = this.context.createGain();
    gain.gain.value = entry.gain ?? 1;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(0);
    this.loops.set(eventId, { source, gain });
  }

  private stopLoop(eventId: SfxEventId): void {
    const instance = this.loops.get(eventId);
    if (!instance) return;
    try {
      instance.source.stop();
    } catch {
      // ignore
    }
    this.loops.delete(eventId);
  }
}

let singleton: SfxPlayer | null = null;

export function getSfxPlayer(): SfxPlayer {
  if (!singleton) singleton = new SfxPlayer();
  return singleton;
}

interface ImportMetaEnvLike {
  BASE_URL?: string;
}

const LEADING_SLASH = /^\//;

// Resolve a relative asset path against Vite's BASE_URL so files load
// correctly under the GH Pages base path (e.g. "/dean-stack/sfx/...").
// Falls back to "/" outside Vite (bun:test).
function resolveAssetUrl(rel: string): string {
  const env = (import.meta as { env?: ImportMetaEnvLike }).env;
  const base = env?.BASE_URL ?? "/";
  return base + rel.replace(LEADING_SLASH, "");
}
