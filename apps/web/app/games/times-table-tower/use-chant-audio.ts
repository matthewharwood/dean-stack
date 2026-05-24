import { useEffect, useRef, useState } from "react";

import { SFX_REGISTRY, type SfxEventId } from "~/sound/registry";

// useChantAudio — owns one HTMLAudioElement per chant sound id, exposes
// play / pause / currentTime through state + ref. The existing sound
// player (`getSfxPlayer`) is great for fire-and-forget SFX but doesn't
// expose the playback time we need for R16's beat-by-beat tap
// validation, so this hook spins up its own <audio> element behind
// the scenes.
//
// React-Compiler-safe: the audio element + the polling RAF live in
// refs / effects, never in render. The hook returns a small stable
// API the parent can call from event handlers.
//
// Reduced-motion is NOT short-circuited here — audio is not motion;
// the chant still needs to play for the kid to learn the row.

export type ChantAudioApi = {
  // Trigger playback from the beginning. No-op when already playing
  // — call stop() first to restart from zero.
  play: () => Promise<void>;
  stop: () => void;
  // Live snapshot of the audio's playhead position. Polled at ~60Hz
  // while playing so consumers can re-render lit-step state. Caller
  // should treat `currentTime` as the kid's eligible-to-tap watermark
  // (any beat whose start time ≤ currentTime has "been called out").
  currentTime: number;
  isPlaying: boolean;
  hasEnded: boolean;
};

export function useChantAudio(soundId: SfxEventId): ChantAudioApi {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  // Lazy-init the audio element on first play(); we don't preload on
  // mount because the kid might never visit this route.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
      }
      audioRef.current = null;
    };
  }, []);

  // Re-init on sound id change (kid advances to next row). The
  // soundId reference inside the effect closure is what makes the
  // dep array load-bearing — biome's exhaustive-deps rule otherwise
  // flags it as unused. We tag the variable here as a deliberate
  // trigger so future readers know the dep is the whole point.
  useEffect(() => {
    const _triggerOnSoundChange = soundId;
    void _triggerOnSoundChange;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setCurrentTime(0);
    setIsPlaying(false);
    setHasEnded(false);
  }, [soundId]);

  const api: ChantAudioApi = {
    play: async () => {
      const entry = SFX_REGISTRY[soundId];
      if (!entry) return;
      const baseUrl = `${import.meta.env.BASE_URL}${entry.path}`;
      // Lazy-init audio on first play to keep the page load slim.
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio(baseUrl);
        audio.preload = "auto";
        audio.addEventListener("ended", () => {
          setIsPlaying(false);
          setHasEnded(true);
          if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        });
        audioRef.current = audio;
      }
      audio.currentTime = 0;
      setHasEnded(false);
      setIsPlaying(true);
      try {
        await audio.play();
      } catch {
        // Browser blocked playback (autoplay policy). The kid tapped
        // the play button so this is rare — swallow defensively.
        setIsPlaying(false);
        return;
      }
      // Poll currentTime via rAF. We don't use audio's `timeupdate`
      // event because Safari only fires it every ~250ms — too coarse
      // for the kid's tap-eligibility watermark.
      const tick = (): void => {
        const a = audioRef.current;
        if (!a) return;
        setCurrentTime(a.currentTime);
        if (!a.paused) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    stop: () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setIsPlaying(false);
      setHasEnded(false);
      setCurrentTime(0);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    },
    currentTime,
    isPlaying,
    hasEnded,
  };
  return api;
}
