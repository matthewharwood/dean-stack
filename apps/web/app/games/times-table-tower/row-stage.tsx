import { Play, RotateCcw } from "lucide-react";

import { ChantStepRow } from "~/components/chant-step-row";
import type { SfxEventId } from "~/sound/registry";

import { currentBeatIndex } from "./chant-clock";
import { useChantAudio } from "./use-chant-audio";

// R16 row-stage view. Renders the chant playback button + stairs.
// The kid taps "Sing it" → audio plays → kid taps the matching step
// on the stairs as each product is called out. A step is eligible to
// tap once the audio playhead passes that beat's start (no tap-
// ahead, no perfect-rhythm punishment — the kid just needs to
// recognize the call-out before tapping).
//
// Pure presentation; mastery / damage accounting happens via the
// parent route's onStepMastered callback. The view itself owns no
// game state — masteredSteps comes in as a prop.

export function RowStage({
  multiplier,
  masteredSteps,
  onStepMastered,
}: {
  // The static row factor (0..10). Drives chant MP3 selection and
  // sits at the top of the stage as the "X's row" header.
  multiplier: number;
  // Step indexes 0..10 the kid has already nailed on this row.
  // Drives the visual ✓ markers on the stairs.
  masteredSteps: readonly number[];
  // Fired when the kid taps a step that's BOTH currently eligible
  // (audio playhead has passed its beat) AND not already mastered.
  // Parent owns whether this fires (e.g. ignores during win
  // celebration). The parent also owns damage application.
  onStepMastered: (stepIndex: number) => void;
}) {
  const soundId = chantSoundIdForMultiplier(multiplier);
  const audio = useChantAudio(soundId);
  const eligibleBeat = currentBeatIndex(audio.currentTime);

  const handleTap = (stepIndex: number): void => {
    // Eligibility rule: the audio must have called out this product
    // (beat ≥ stepIndex) AND the step must not already be mastered.
    // The "≥" matters — exactly-at-beat counts. Off-beat early taps
    // are silently ignored (no fail state, no error sound).
    if (eligibleBeat == null) return;
    if (stepIndex > eligibleBeat) return;
    if (masteredSteps.includes(stepIndex)) return;
    onStepMastered(stepIndex);
  };

  return (
    <div
      className="flex flex-col items-center gap-4"
      data-test="row-stage"
      data-multiplier={multiplier}
    >
      <header className="text-center">
        <div className="text-xs italic uppercase tracking-wider text-muted-gray">
          The {ordinal(multiplier)} floor
        </div>
        <div className="font-openrunde text-2xl font-bold text-slate-ink">The {multiplier}s</div>
      </header>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => {
            void audio.play();
          }}
          disabled={audio.isPlaying}
          className="flex items-center gap-2 rounded-lg border-2 border-slate-ink bg-sky-200 px-4 py-2 font-openrunde text-sm font-bold text-slate-ink shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          data-test="chant-play"
        >
          <Play className="h-4 w-4" aria-hidden />
          {audio.hasEnded ? "Replay the chant" : "Sing it to me"}
        </button>
        {audio.isPlaying ? (
          <button
            type="button"
            onClick={audio.stop}
            className="flex items-center gap-2 rounded-lg border-2 border-medium-gray bg-canvas-white px-3 py-2 font-openrunde text-xs text-muted-gray shadow-sm hover:bg-whisper-purple"
            data-test="chant-stop"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Stop
          </button>
        ) : null}
      </div>
      <ChantStepRow
        litStep={eligibleBeat}
        masteredSteps={[...masteredSteps]}
        onStepTap={handleTap}
      />
    </div>
  );
}

// Map the row's static multiplier 0..10 to its registered chant MP3.
// Listed explicitly (not template-string'd) so a typo crashes the
// build via the literal union check on SfxEventId.
function chantSoundIdForMultiplier(multiplier: number): SfxEventId {
  switch (multiplier) {
    case 0:
      return "chant-row-0";
    case 1:
      return "chant-row-1";
    case 2:
      return "chant-row-2";
    case 3:
      return "chant-row-3";
    case 4:
      return "chant-row-4";
    case 5:
      return "chant-row-5";
    case 6:
      return "chant-row-6";
    case 7:
      return "chant-row-7";
    case 8:
      return "chant-row-8";
    case 9:
      return "chant-row-9";
    default:
      return "chant-row-10";
  }
}

// "first", "second", "third"… "eleventh". Hoisted out of the JSX so
// the call site stays expression-level. Only used at the top of the
// stage so 1..11 is the full needed range; falls back to the bare
// number for out-of-range inputs.
function ordinal(n: number): string {
  const labels = [
    "zeroth",
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
    "eleventh",
  ];
  return labels[n] ?? String(n);
}
