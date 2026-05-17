import { Volume2 } from "lucide-react";
import type { ReactNode } from "react";

import { defineComponent } from "~/lib/define-component";
import { isRegistered, useSound } from "~/sound";

import { PronounceButtonPropsSchema } from "./schema";

// Small speaker button rendered next to a character name. On press, plays
// the ElevenLabs-generated pronunciation MP3 registered under
// `nameSoundId`. When `nameSoundId` is missing OR the id isn't in the
// SFX registry, the button renders NOTHING — silent no-op. This keeps
// templates that legitimately ship without a pronunciation (tests,
// fixtures, future characters mid-authoring) from showing a broken
// affordance.
//
// Side-channel: the sound player is the typical useSound API. Following
// the same "event handlers only" discipline as useAnime / usePixiApp.
//
// Visual: a 14px Volume2 icon in a tight padded circle. Uses the same
// muted-on-dark palette the avatar's name row already establishes
// (white text, white/70 secondary), so the button reads as part of the
// row rather than a separate floating thing.
export const PronounceButton = defineComponent(PronounceButtonPropsSchema, (props): ReactNode => {
  const sfx = useSound();
  const size = props.size ?? "sm";
  const iconSize = size === "sm" ? 14 : 18;
  // Type-narrow the registry id at the boundary. `isRegistered` keeps
  // the runtime guard AND the SfxEventId narrowing in one check, so
  // `sfx.play(id)` stays type-safe without an `as` cast.
  const id = props.nameSoundId;
  if (!id || !isRegistered(id)) return null;
  const ariaLabel = `Say ${props.label}`;
  return (
    <button
      type="button"
      onClick={(e) => {
        // Stop the click from bubbling into avatar-level handlers (the
        // avatar flip-back, for example) — pressing the speaker is a
        // distinct action, not part of "tap the avatar".
        e.stopPropagation();
        sfx.play(id);
      }}
      className="inline-flex items-center justify-center rounded-full p-1 text-white/70 transition-colors duration-150 hover:bg-white/15 hover:text-white active:scale-95"
      aria-label={ariaLabel}
      title={ariaLabel}
      data-test="pronounce-button"
      data-sound-id={id}
    >
      <Volume2 size={iconSize} aria-hidden />
    </button>
  );
});
