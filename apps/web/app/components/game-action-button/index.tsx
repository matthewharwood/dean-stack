import type { Attack, RoundOutcome } from "@dean-stack/schemas";
import { Check } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { AttackButton } from "~/components/attack-button";
import { CrossedSwordsIcon } from "~/components/crossed-swords-icon";
import { FillPrompt } from "~/components/fill-prompt";
import { SwipeToEvaluate } from "~/components/swipe-to-evaluate";

export function GameActionButton({
  outcome,
  attacks,
  canEvaluate,
  onEvaluate,
  onAttack,
  attackPending,
}: {
  outcome: RoundOutcome | null;
  // Three attacks for the active pilot. When `null`, the button falls back
  // to a single legacy "Attack" button (no pilot selected — shouldn't
  // happen during a real run, but keeps the UI safe).
  attacks: readonly [Attack, Attack, Attack] | null;
  // True iff every operandSlot in the round's equation has a card —
  // covers find-sum (both operands) and find-missing-result (kid's
  // operand AND result; static is always pre-filled). False → the
  // Evaluate button visually mutes, the click handler shakes the
  // button and shows the "Fill out the board!" prompt instead of
  // running the evaluator.
  canEvaluate: boolean;
  onEvaluate: () => void;
  onAttack: (attack: Attack | null) => void;
  // True between attack-click and animation completion. Disables every
  // attack button so the kid can't double-fire.
  attackPending: boolean;
}): ReactNode {
  // Disabled-tap feedback. `shake` flips true on a disabled tap and
  // clears 500ms later (matches the damage-shake keyframe duration);
  // re-tapping during a shake re-triggers via the toggle. `promptKey`
  // remounts <FillPrompt> on every disabled tap so the 3s lifecycle
  // restarts even if the kid taps repeatedly.
  const [shake, setShake] = useState(false);
  const [promptKey, setPromptKey] = useState(0);
  useEffect(() => {
    if (!shake) return;
    const t = window.setTimeout(() => setShake(false), 500);
    return () => window.clearTimeout(t);
  }, [shake]);
  // Disabled-grab feedback. The kid grabbed the swipe knob with the
  // equation still unfilled — shake the entire action row briefly and
  // re-mount the "Fill out the board!" prompt. Same affordance the
  // old disabled-tap Evaluate button had; just plumbed through the
  // swipe's `onDisabledAttempt` callback now.
  const handleDisabledAttempt = (): void => {
    setShake(false);
    requestAnimationFrame(() => setShake(true));
    setPromptKey((k) => k + 1);
  };
  // Two visual states:
  //   - default / loss : "Evaluate" — re-evaluates the current arrangement
  //   - won            : 3 attack-choice buttons — kid picks an attack,
  //                       its Pixi animation plays, then onAttack chains
  //                       through to the same continue/advance logic.
  const won = outcome?.won === true;
  // On a win, the row of three attack cards + the green math summary live
  // INSIDE a recessed "well" — slightly darker bg, inset shadow, rounded.
  // The well makes the win-state read as a distinct mode (you committed
  // a successful equation; now choose the strike) rather than the
  // attacks floating loose over the Center panel. The well is width-
  // constrained (max-w-[640px]) so it never bleeds past the Center
  // column on a wide iPad. The pre-win Evaluate button sits unwelled —
  // it's a single round button and a well around it would feel heavy.
  // CLS reservation: the wrapper holds either the Evaluate button (~52px)
  // or the win-state well (~152px — 24 well-pt + 80 attack-card + 8 gap +
  // 20 result line + 8 well-pb + a couple px slack). Lock min-h to the
  // taller of the two so the equation row above doesn't slide up when
  // the win state mounts. The unused space in Evaluate-state is absorbed
  // by `items-center` on this row, so the button stays vertically centered.
  // Three render branches at this row, decided by `won` × `attacks?`:
  //   - won + attacks      → 3-card attack picker (the standard flow)
  //   - won + no attacks   → legacy single "Attack!" button (no pilot)
  //   - !won               → Evaluate button (pre-eval state)
  // Independent && expressions read cleaner than a nested ternary here.
  const showAttackPicker = won && attacks;
  const showLegacyAttack = won && !attacks;
  return (
    <div className="flex w-full flex-col items-center gap-3" data-test="action-button">
      <div className="flex min-h-[160px] w-full items-center justify-center">
        {showAttackPicker && (
          <div className="flex w-full max-w-[640px] flex-col items-stretch gap-2 rounded-lg border border-light-gray bg-canvas-white px-3 pt-6 pb-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)]">
            <div className="flex items-stretch justify-center gap-2">
              {attacks.map((attack) => (
                <AttackButton
                  key={attack.id}
                  attack={attack}
                  damage={outcome?.scoreEarned ?? 0}
                  onSelect={onAttack}
                  pending={attackPending}
                />
              ))}
            </div>
            {outcome ? (
              <div
                className="flex items-center justify-center gap-2 font-openrunde text-sm font-bold text-success-green"
                data-test="evaluation-result"
                data-outcome="win"
                aria-live="polite"
              >
                <span>{outcome.computedValue}</span>
                <span aria-hidden>=</span>
                <span>{outcome.expectedValue}</span>
                <Check size={16} strokeWidth={3} aria-hidden />
                <span>−{outcome.scoreEarned} HP</span>
              </div>
            ) : null}
          </div>
        )}
        {showLegacyAttack && (
          <button
            type="button"
            onClick={() => onAttack(null)}
            className="flex items-center gap-2 rounded-full bg-radiant-violet px-8 py-3 font-bold text-white shadow-subtle transition-transform duration-150 hover:scale-[1.04] active:scale-95"
            data-test="attack-button"
          >
            <CrossedSwordsIcon />
            <span>Attack!</span>
          </button>
        )}
        {!won && (
          <div
            className="relative w-full max-w-[480px] data-[shake=true]:animate-damage-shake"
            data-shake={shake ? "true" : undefined}
          >
            <SwipeToEvaluate
              canCommit={canEvaluate}
              onCommit={onEvaluate}
              onDisabledAttempt={handleDisabledAttempt}
            />
            {promptKey > 0 ? <FillPrompt key={promptKey} onDone={() => setPromptKey(0)} /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
