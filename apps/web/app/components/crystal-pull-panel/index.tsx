import { animate } from "animejs";
import { useEffect, useReducer, useRef } from "react";

import { PronounceButton } from "~/components/pronounce-button";
import {
  CRYSTAL_CARD_BACK_SRC,
  CRYSTAL_REVEAL_BURST_SRC,
  CrystalIconImage,
} from "~/games/adding-game/crystal-icons";
import { CRYSTAL_REGISTRY, crystalNarrationSoundId } from "~/games/adding-game/crystals";
import { defineComponent } from "~/lib/define-component";
import { useSound } from "~/sound";

import { CrystalPullPanelPropsSchema } from "./schema";

// ── Reveal state machine ───────────────────────────────────────────────
// One useReducer drives the entire ceremony so the order of operations is
// auditable in one place. Phases are timed by setTimeouts the panel owns;
// each phase has a single side-effect (SFX, anime call) attached in the
// effect chain.
//
//   intro      → cards rising into view, buildup SFX starts
//   awaiting   → cards bobbing, kid can tap
//   selecting  → kid tapped, two cards fade, chosen card flips
//   revealed   → flip done, info shown, hold timer running
//
// Once `revealed` hold expires, the panel fires `onSelect(id)` and the
// parent unmounts it.

type Phase = "intro" | "awaiting" | "selecting" | "revealed";

interface RevealState {
  phase: Phase;
  chosenIndex: number | null;
}

type RevealAction = { type: "ready" } | { type: "select"; index: number } | { type: "reveal" };

function revealReducer(state: RevealState, action: RevealAction): RevealState {
  switch (action.type) {
    case "ready":
      return state.phase === "intro" ? { ...state, phase: "awaiting" } : state;
    case "select":
      if (state.phase !== "awaiting") return state;
      return { phase: "selecting", chosenIndex: action.index };
    case "reveal":
      return state.phase === "selecting" ? { ...state, phase: "revealed" } : state;
    default:
      return state;
  }
}

// Timing constants. Tuned for the kid: long enough that each beat lands,
// short enough that the ceremony doesn't drag across six pulls.
const INTRO_MS = 700; // cards rise + settle into bob
const FLIP_MS = 900; // 0 → 180deg rotateY for the chosen card
const FLIP_APEX_MS = 450; // half-way through the flip — release SFX fires
const REVEAL_HOLD_MS = 2200; // how long the face-up info sits before onSelect

export const CrystalPullPanel = defineComponent(CrystalPullPanelPropsSchema, (props) => {
  const sound = useSound();
  const [state, dispatch] = useReducer(revealReducer, {
    phase: "intro",
    chosenIndex: null,
  });
  // Latest-callable refs so the phase-driven effects can fire side effects
  // (SFX + onSelect) without re-running when those identities churn each
  // render. Refs are exempt from useExhaustiveDependencies, so the effect
  // deps stay [phase, chosenIndex] — only the phase transitions trigger work.
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const onSelectRef = useRef(props.onSelect);
  onSelectRef.current = props.onSelect;
  const optionsRef = useRef(props.options);
  optionsRef.current = props.options;

  // One ref per card for the flip animation. Same trick as Hand — fixed-size
  // tuple of refs, indexed by slot, so the anime call can target a specific
  // card without keys.
  const card0 = useRef<HTMLDivElement | null>(null);
  const card1 = useRef<HTMLDivElement | null>(null);
  const card2 = useRef<HTMLDivElement | null>(null);
  const cardRefs = [card0, card1, card2] as const;

  // ── Phase: intro → awaiting (cards rising, buildup SFX) ────────────────
  useEffect(() => {
    soundRef.current.play("event-pull-buildup");
    const t = window.setTimeout(() => dispatch({ type: "ready" }), INTRO_MS);
    return () => window.clearTimeout(t);
  }, []);

  // ── Phase: selecting → revealed (flip the chosen card) ─────────────────
  useEffect(() => {
    if (state.phase !== "selecting") return;
    const chosen = state.chosenIndex;
    if (chosen === null) return;
    const el = cardRefs[chosen]?.current;
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const releaseTimer = window.setTimeout(
      () => {
        soundRef.current.play("event-pull-release");
      },
      reduced ? 0 : FLIP_APEX_MS,
    );
    const revealTimer = window.setTimeout(
      () => dispatch({ type: "reveal" }),
      reduced ? 50 : FLIP_MS,
    );
    if (!reduced) {
      const a = animate(el, {
        rotateY: [0, 180],
        duration: FLIP_MS,
        ease: "outCubic",
      });
      return () => {
        a.cancel();
        window.clearTimeout(releaseTimer);
        window.clearTimeout(revealTimer);
      };
    }
    return () => {
      window.clearTimeout(releaseTimer);
      window.clearTimeout(revealTimer);
    };
  }, [state.phase, state.chosenIndex, cardRefs]);

  // ── Phase: revealed → onSelect (after the hold) ────────────────────────
  useEffect(() => {
    if (state.phase !== "revealed" || state.chosenIndex === null) return;
    const id = optionsRef.current[state.chosenIndex];
    if (!id) return;
    const t = window.setTimeout(() => onSelectRef.current(id), REVEAL_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [state.phase, state.chosenIndex]);

  function onCardTap(index: number): void {
    if (state.phase !== "awaiting") return;
    soundRef.current.play("event-pull-select");
    dispatch({ type: "select", index });
  }

  const chosenId = state.chosenIndex !== null ? (props.options[state.chosenIndex] ?? null) : null;
  const chosenDef = chosenId ? CRYSTAL_REGISTRY[chosenId] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
      data-test="crystal-pull-panel"
      data-phase={state.phase}
    >
      <div className="relative flex w-full max-w-[720px] flex-col items-center gap-8 px-6">
        <h2
          className="font-openrunde text-2xl font-semibold text-white drop-shadow-lg"
          data-test="crystal-pull-headline"
        >
          {state.phase === "revealed" ? "Crystal acquired" : "Choose a crystal"}
        </h2>
        <div className="flex w-full items-center justify-center gap-6">
          {props.options.map((id, index) => {
            const def = CRYSTAL_REGISTRY[id];
            const isChosen = state.chosenIndex === index;
            const hidden = state.chosenIndex !== null && !isChosen;
            const showFace = state.phase === "revealed" && isChosen;
            return (
              <button
                type="button"
                key={id}
                onClick={() => onCardTap(index)}
                disabled={state.phase !== "awaiting"}
                aria-label={
                  showFace ? `${def.name} — ${def.description}` : `Face-down crystal ${index + 1}`
                }
                data-test={`crystal-card-${index}`}
                data-chosen={isChosen ? "true" : undefined}
                data-revealed={showFace ? "true" : undefined}
                className={`relative h-56 w-40 cursor-pointer rounded-2xl border-2 border-white/40 transition-opacity duration-300 ${hidden ? "pointer-events-none opacity-0" : "opacity-100"} ${isChosen ? "scale-110" : "hover:scale-105"}`}
                style={{
                  // 3D context — the flip pivots on Y. Backface hidden so the
                  // FRONT swap is invisible until rotation crosses 90deg.
                  transformStyle: "preserve-3d",
                  background: `linear-gradient(135deg, ${def.color}33, #1e293b 70%)`,
                }}
              >
                <div
                  ref={cardRefs[index]}
                  className="absolute inset-0"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Back — visible at rotateY=0 */}
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-2xl"
                    style={{
                      backfaceVisibility: "hidden",
                      background:
                        "radial-gradient(circle at 50% 40%, rgb(255 255 255 / 14%), transparent 60%), linear-gradient(180deg, #0c2541, #050e1f)",
                    }}
                  >
                    <img
                      src={CRYSTAL_CARD_BACK_SRC}
                      alt=""
                      aria-hidden
                      draggable={false}
                      className="h-full w-full rounded-2xl object-fill"
                    />
                  </div>
                  {/* Front — rendered behind the back at rotateY=0, visible
                      when the card flips past 90deg. */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-between gap-2 rounded-2xl p-4"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      background: `radial-gradient(circle at 50% 30%, ${def.color}AA, transparent 70%), linear-gradient(180deg, #f8fbff, #c7e2f0)`,
                    }}
                  >
                    <CrystalIconImage id={id} size={36} className="drop-shadow-sm" />
                    <div className="text-center font-openrunde text-sm font-semibold text-slate-ink">
                      {def.name}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {chosenDef && state.phase === "revealed" && (
          <img
            src={CRYSTAL_REVEAL_BURST_SRC}
            alt=""
            aria-hidden
            draggable={false}
            data-test="crystal-reveal-burst"
            className="pointer-events-none absolute z-0 h-72 w-72 opacity-75 mix-blend-screen"
            style={{
              top: "58%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
        {chosenId && chosenDef && state.phase === "revealed" && (
          <div
            className="relative z-10 mt-2 flex max-w-[480px] flex-col items-center gap-2 rounded-xl bg-white/95 px-6 py-4 text-center shadow-2xl"
            data-test="crystal-reveal-info"
          >
            <CrystalIconImage id={chosenId} size={28} />
            <div className="flex items-center gap-1.5 font-openrunde text-lg font-semibold text-slate-ink">
              {chosenDef.name}
              {/* Tinted button-wrap so the speaker reads against the
                  light reveal card (PronounceButton's default white-on-
                  dark palette would disappear here). */}
              <span className="rounded-full bg-slate-ink/10 text-slate-ink/80 hover:bg-slate-ink/20">
                <PronounceButton
                  nameSoundId={crystalNarrationSoundId(chosenId)}
                  label={chosenDef.name}
                  size="md"
                />
              </span>
            </div>
            <div className="font-openrunde text-sm text-slate-ink/80">{chosenDef.description}</div>
          </div>
        )}
      </div>
    </div>
  );
});
