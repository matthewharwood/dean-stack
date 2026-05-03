import type { Rarity } from "@dean-stack/schemas";
import { Info, X } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { LoreBio } from "~/components/lore-bio";
import { defineComponent } from "~/lib/define-component";

import { PlayerAvatarPropsSchema } from "./schema";

// Rarity → border color. Mirrors EnemyAvatar so the two columns read as
// siblings — same visual ramp, just left/right.
const RARITY_BORDER: Record<Rarity, string> = {
  common: "border-muted-gray",
  uncommon: "border-success-green",
  rare: "border-electric-blue",
  epic: "border-deep-purple",
  legendary: "border-warning-yellow",
  mythic: "border-vivid-orange",
};

// Rarity → XP-fill base color. EnemyAvatar uses this for HP fill; the
// player's bottom rule shares the same accent so the rarity vocabulary
// stays consistent across both columns. The textural diagonal stripes
// ride on top via a mix-blend overlay (see the bar markup).
const RARITY_ACCENT: Record<Rarity, string> = {
  common: "bg-muted-gray",
  uncommon: "bg-success-green",
  rare: "bg-electric-blue",
  epic: "bg-deep-purple",
  legendary: "bg-warning-yellow",
  mythic: "bg-vivid-orange",
};

// Confetti palette — vellum, lantern-yellow, kelp-green, brass. Same warm
// + cool spread as the cozy-mythic Hadal Tide bible's color rules.
const CONFETTI_COLORS = ["#fbbf24", "#34d399", "#f4e4c1", "#a3e635", "#fcd34d"] as const;
const CONFETTI_COUNT = 16;
const LEVEL_UP_MS = 1500;

type ConfettiSpec = {
  cx: number;
  cy: number;
  cr: number;
  color: string;
  delay: number;
};

// One burst's worth of particles. Distributed roughly radially with a
// slight upward bias so the dots "fountain" out of the avatar centre
// rather than just exploding evenly. Generated once per level-up so
// the animation is stable across renders within a single burst.
function generateConfetti(): ConfettiSpec[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / CONFETTI_COUNT + (Math.random() - 0.5) * 0.4;
    const distance = 70 + Math.random() * 40;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? "#fbbf24";
    return {
      cx: Math.cos(angle) * distance,
      cy: Math.sin(angle) * distance - 30,
      cr: (Math.random() - 0.5) * 720,
      color,
      delay: Math.random() * 80,
    };
  });
}

export const PlayerAvatar = defineComponent(PlayerAvatarPropsSchema, (props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  // Flip-card state: false = portrait, true = bio. Reset on pilot
  // change so cycling lands on a fresh portrait.
  const [flipped, setFlipped] = useState(false);

  // Level-up FX: detect when `progress.level` increases (within the same
  // pilot — a pilot SWITCH is excluded by resetting prevLevelRef in the
  // pilot-change effect below). On detection, generate a fresh confetti
  // burst, arm the green vignette, and render a "1 → 2" badge in the
  // centre of the avatar (sequenced via CSS keyframes — see
  // styles/index.css `level-up-from` / `level-up-to`). The from/to
  // numbers are captured at trigger time so the badge keeps showing
  // them even if `progress` changes mid-animation.
  const prevLevelRef = useRef<number | null>(props.progress?.level ?? null);
  const [levelUpActive, setLevelUpActive] = useState(false);
  const [levelUpFrom, setLevelUpFrom] = useState<number | null>(null);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);
  const [confetti, setConfetti] = useState<readonly ConfettiSpec[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only the id matters
  useEffect(() => {
    setFlipped(false);
    // Switching pilots reveals a different stored level — that is NOT a
    // level-up event, so reset the comparator to the new pilot's level
    // before the level-up effect runs and would compare prev (old
    // pilot's level) to curr (new pilot's level).
    prevLevelRef.current = props.progress?.level ?? null;
  }, [props.player?.id]);

  useEffect(() => {
    const curr = props.progress?.level ?? null;
    const prev = prevLevelRef.current;
    prevLevelRef.current = curr;
    if (prev == null || curr == null) return;
    if (curr <= prev) return;
    setLevelUpActive(true);
    setLevelUpFrom(prev);
    setLevelUpTo(curr);
    setConfetti(generateConfetti());
    const t = window.setTimeout(() => {
      setLevelUpActive(false);
      setLevelUpFrom(null);
      setLevelUpTo(null);
    }, LEVEL_UP_MS);
    return () => window.clearTimeout(t);
  }, [props.progress?.level]);

  // Empty state — same dotted-border language as EnemyAvatar's empty.
  if (!props.player) {
    return (
      <div
        ref={rootRef}
        className="grid h-full w-full place-items-center rounded-lg border-2 border-dashed border-muted-gray/60 bg-canvas-white/40 p-4 text-center"
        data-test="player-avatar"
        data-state="empty"
      >
        <span className="text-sm font-medium text-muted-gray">No player yet</span>
      </div>
    );
  }

  const { player, profileIndex, onCycle, progress, xpThreshold } = props;
  const borderClass = RARITY_BORDER[player.rarity];
  const accentClass = RARITY_ACCENT[player.rarity];
  const xpRatio =
    progress != null && xpThreshold != null && xpThreshold > 0
      ? Math.max(0, Math.min(1, progress.xp / xpThreshold))
      : 0;

  return (
    <div
      ref={rootRef}
      className={`group relative grid h-full grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border-4 bg-slate-ink ${borderClass}`}
      data-test="player-avatar"
      data-state="filled"
      data-rarity={player.rarity}
      data-levelup={levelUpActive ? "true" : undefined}
    >
      <div className="bg-black/70 px-3 py-2 text-white">
        <div className="font-openrunde text-sm font-bold leading-tight">{player.name}</div>
        <div className="text-[11px] uppercase tracking-wide text-white/70">
          {player.role} · {player.rarity}
        </div>
      </div>
      <div className="relative min-h-0" style={{ perspective: "1200px" }}>
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* FRONT — static centred portrait. */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            <img
              src={player.imageUrl}
              alt={player.name}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          </div>
          {/* BACK — bio. Same parchment + serif body as EnemyAvatar. */}
          <div
            className="absolute inset-0 overflow-y-auto bg-canvas-white px-4 py-3 text-slate-ink"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
            data-test="player-bio"
          >
            <LoreBio bio={player.bio} />
          </div>
        </div>
        {/* Cycle button — shows the CURRENT pilot's 1-based number; pressing
            advances modulo registry length (the route owns the modulo).
            Sits to the LEFT of the info button. */}
        {onCycle != null && profileIndex != null ? (
          <button
            type="button"
            onClick={onCycle}
            aria-label={`Pilot ${profileIndex} — switch to next`}
            className="absolute top-1.5 right-10 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-black/55 text-white shadow-md backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
            data-test="player-cycle-button"
          >
            <span className="font-openrunde text-xs font-bold leading-none tabular-nums">
              {profileIndex}
            </span>
          </button>
        ) : null}
        {/* Info button — flip to bio. */}
        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          aria-label={flipped ? "Show portrait" : "Show bio"}
          aria-pressed={flipped}
          className="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-black/55 text-white shadow-md backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
          data-test="player-bio-toggle"
        >
          <span aria-hidden className="flex items-center justify-center">
            {flipped ? <X size={14} strokeWidth={2.5} /> : <Info size={14} strokeWidth={2.5} />}
          </span>
        </button>
        {/* Level-up overlay — green vignette + confetti. Pointer-events
            none so it never eats taps; mounted only while
            `levelUpActive` so the keyframes auto-restart on the next
            level-up by re-mounting the layer. */}
        {levelUpActive ? (
          <div
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
            data-test="player-levelup-fx"
          >
            <div
              aria-hidden
              className="absolute inset-0 animate-level-up-vignette"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 35%, rgba(34, 197, 94, 0.7) 100%)",
              }}
            />
            {confetti.map((c, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: stable for one burst
                key={i}
                aria-hidden
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <span
                  className="block h-2 w-2 animate-level-up-confetti rounded-lg shadow-md"
                  style={
                    {
                      background: c.color,
                      "--cx": `${c.cx}px`,
                      "--cy": `${c.cy}px`,
                      "--cr": `${c.cr}deg`,
                      animationDelay: `${c.delay}ms`,
                    } as CSSProperties
                  }
                />
              </div>
            ))}
            {/* Level-up badge — sits on top of the vignette, dead-centre.
                The "from" number rides in first, scales up, then bows out;
                the "to" number arrives a beat later, overshoots, settles,
                and finally fades. The whole sequence is timed entirely
                via CSS keyframes (level-up-from / level-up-to / level-up-
                eyebrow) so React only owns mount/unmount — the keyframes
                drive the timeline. */}
            {levelUpFrom != null && levelUpTo != null ? (
              <div
                className="absolute inset-0 grid place-items-center"
                data-test="player-levelup-badge"
              >
                <div className="flex flex-col items-center gap-1 text-center">
                  <span
                    className="animate-level-up-eyebrow font-openrunde text-[10px] font-semibold uppercase tracking-[0.32em] text-pale-mint drop-shadow-md"
                    aria-hidden
                  >
                    Level Up
                  </span>
                  <div className="relative flex h-16 w-24 items-center justify-center">
                    <span
                      className="absolute animate-level-up-from font-openrunde text-5xl font-bold text-white tabular-nums"
                      style={{
                        textShadow:
                          "0 0 18px rgba(34, 197, 94, 0.85), 0 2px 8px rgba(0, 0, 0, 0.6)",
                      }}
                      aria-hidden
                    >
                      {levelUpFrom}
                    </span>
                    <span
                      className="absolute animate-level-up-to font-openrunde text-6xl font-bold text-warning-yellow/30 tabular-nums"
                      style={{
                        textShadow:
                          "0 0 24px rgba(250, 204, 21, 0.95), 0 0 12px rgba(34, 197, 94, 0.7), 0 4px 12px rgba(0, 0, 0, 0.65)",
                      }}
                      aria-live="polite"
                    >
                      {levelUpTo}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {/* Footer — XP / threshold on the left, LV chip on the right, brass-
          textured fill rule below. The diagonal-stripe overlay rides the
          rarity-accent base via mix-blend-overlay so the texture reads
          across the spectrum without per-rarity tuning. */}
      <div className="bg-black/70 px-3 py-2">
        <div className="mb-1 flex items-baseline justify-between font-openrunde text-xs text-white">
          <span data-test="player-xp-chip" className="tabular-nums">
            {progress != null && xpThreshold != null ? `${progress.xp}/${xpThreshold}` : "—"}
          </span>
          <span className="text-white/70 tabular-nums" data-test="player-level-chip">
            LV {progress?.level ?? 1}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-lg bg-slate-ink">
          <div
            className={`relative h-full transition-[width] duration-300 ease-out ${accentClass}`}
            style={{ width: `${xpRatio * 100}%` }}
            data-test="player-xp-bar"
          >
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(255,255,255,0.22) 0 4px, rgba(0,0,0,0.18) 4px 9px)",
                mixBlendMode: "overlay",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
