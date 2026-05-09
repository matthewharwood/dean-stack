import type { Attack } from "@dean-stack/schemas";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

import { soundSettingsAtom } from "~/state/atoms";

import { resolveAttackSfxId } from "./play-attack";
import { getSfxPlayer } from "./player";
import type { SfxEventId } from "./registry";

export interface SoundApi {
  // Play any registered event by its typed ID.
  play: (id: SfxEventId) => void;
  // Stop any playing instance(s) of an event (and any active loop).
  stop: (id: SfxEventId) => void;
  // Stop every active sound — useful on route change or game reset.
  stopAll: () => void;
  // Resolve an Attack to its sound (per-character preferred, kind base
  // fallback) and play it. Silent when neither is registered.
  playAttack: (attack: Attack) => void;
}

// Module-scope stable reference. Returning a new object literal from the
// hook on every render would force consumers that put `sfx` in a deps
// array to re-fire effects unnecessarily; the React Compiler memoizes
// reads, but explicit stability here is cheap insurance.
//
// All methods just dispatch to the singleton player — they don't close
// over component-scoped state, so module-scope is safe.
const STABLE_API: SoundApi = {
  play: (id) => {
    void getSfxPlayer().play(id);
  },
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
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
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
  }, [settings.enabled, settings.masterVolume]);

  return STABLE_API;
}
