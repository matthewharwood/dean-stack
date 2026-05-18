import type { Attack } from "@dean-stack/schemas";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

import { soundSettingsAtom } from "~/state/atoms";

import { resolveAttackSfxId } from "./play-attack";
import { getSfxPlayer } from "./player";
import { setProceduralEnabled, setProceduralVolume, unlockProceduralAudio } from "./procedural";
import type { SfxEventId } from "./registry";

export interface SoundApi {
  // Play any registered event by its typed ID. The optional
  // `options.volumeScale` (0..1) multiplies the per-event gain for
  // this one call only — used by the auto-play character-name effect
  // so the same MP3 the speaker button uses can play softer when it
  // auto-fires.
  play: (id: SfxEventId, options?: { volumeScale?: number }) => void;
  // Play an event and resolve when the sample FINISHES. Loops resolve
  // immediately (they have no natural end). Used by the splash flow
  // so the dive-in transition waits for the voiceover to land.
  playUntilEnded: (id: SfxEventId, options?: { volumeScale?: number }) => Promise<void>;
  // Stop any playing instance(s) of an event (and any active loop).
  stop: (id: SfxEventId) => void;
  // Stop every active sound — useful on route change or game reset.
  stopAll: () => void;
  // Resolve an Attack to its sound (per-character preferred, kind base
  // fallback) and play it. Silent when neither is registered.
  playAttack: (attack: Attack) => void;
  // Resolve an Attack to its sound, play it, and resolve when the
  // sound FINISHES. Returns an already-resolved Promise when no
  // sound is registered. Used by the attack flow so the enemy
  // doesn't die until the sound completes.
  playAttackUntilEnded: (attack: Attack) => Promise<void>;
}

// Module-scope stable reference. Returning a new object literal from the
// hook on every render would force consumers that put `sfx` in a deps
// array to re-fire effects unnecessarily; the React Compiler memoizes
// reads, but explicit stability here is cheap insurance.
//
// All methods just dispatch to the singleton player — they don't close
// over component-scoped state, so module-scope is safe.
const STABLE_API: SoundApi = {
  play: (id, options) => {
    void getSfxPlayer().play(id, options);
  },
  playUntilEnded: (id, options) => getSfxPlayer().playUntilEnded(id, options),
  stop: (id) => {
    getSfxPlayer().stop(id);
  },
  stopAll: () => {
    getSfxPlayer().stopAll();
  },
  playAttack: (attack) => {
    const id = resolveAttackSfxId(attack);
    if (id) void getSfxPlayer().play(id);
  },
  playAttackUntilEnded: async (attack) => {
    const id = resolveAttackSfxId(attack);
    if (!id) return;
    await getSfxPlayer().playUntilEnded(id);
  },
};

let unlockListenerInstalled = false;

// iOS Safari + Chrome autoplay-policy require AudioContext to be created
// or resumed inside a user-gesture handler. We attach one-shot listeners
// to the document and tear them down after the first interaction.
function installUnlockListener(): void {
  if (unlockListenerInstalled) return;
  if (typeof window === "undefined") return;
  unlockListenerInstalled = true;

  const unlock = (): void => {
    getSfxPlayer().unlock();
    unlockProceduralAudio();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  // passive: true — none of these handlers call preventDefault(); declaring
  // passive lets the browser scroll/scale immediately on first interaction
  // without waiting to see if the listener will block.
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true, passive: true });
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
}

// useSound — the only React entry point to the SFX module.
//
// - Returns a stable SoundApi reference (safe in dependency arrays).
// - Subscribes to soundSettingsAtom; pushes enabled / masterVolume into
//   the singleton player whenever they change. Mute persists via IDB
//   (Pillar 3) so a parent mute survives reloads.
// - Side channel discipline (Pillar implicit, mirrors useAnime / usePixiApp):
//   the returned `play()` MUST be called from event handlers / effects,
//   never during render. The React Compiler's purity contract holds
//   because the hook itself reads no audio state.
export function useSound(): SoundApi {
  const settings = useAtomValue(soundSettingsAtom);

  useEffect(() => {
    installUnlockListener();
  }, []);

  useEffect(() => {
    const player = getSfxPlayer();
    player.setEnabled(settings.enabled);
    player.setMasterVolume(settings.masterVolume);
    // Mirror the same settings onto the procedural Web-Audio pipeline
    // so a single mute toggle silences BOTH the sample-based player
    // AND the swipe / stepper procedural cues.
    setProceduralEnabled(settings.enabled);
    setProceduralVolume(settings.masterVolume);
  }, [settings.enabled, settings.masterVolume]);

  return STABLE_API;
}
