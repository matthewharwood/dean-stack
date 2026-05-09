import type { Rarity } from "@dean-stack/schemas";
import { Info, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LoreBio } from "~/components/lore-bio";
import { derivePosterUrl } from "~/games/adding-game/poster-variant";
import { defineComponent } from "~/lib/define-component";

import { EnemyAvatarPropsSchema } from "./schema";

// Rarity → border color. The mapping is the visual ramp: cool/neutral at
// common, warm/saturated at the top. Mythic is the cap (red) and signals
// "fiercest enemy" at a glance.
const RARITY_BORDER: Record<Rarity, string> = {
  common: "border-muted-gray",
  uncommon: "border-success-green",
  rare: "border-electric-blue",
  epic: "border-deep-purple",
  legendary: "border-warning-yellow",
  mythic: "border-vivid-orange",
};

// Rarity → HP-bar fill color. Echoes the border so the player reads the
// avatar as a single unit without the bar feeling stapled-on.
const RARITY_BAR_FILL: Record<Rarity, string> = {
  common: "bg-muted-gray",
  uncommon: "bg-success-green",
  rare: "bg-electric-blue",
  epic: "bg-deep-purple",
  legendary: "bg-warning-yellow",
  mythic: "bg-vivid-orange",
};

// Trigger window length. The pulse keyframe runs 300ms but the shake +
// vignette ride 500ms, so the data attribute stays on for the longest
// of the three. Toggling it off after this window lets the next hit
// re-trigger by re-setting the attribute (a CSS animation only re-fires
// when the rule transitions from absent to present).
const DAMAGE_FX_DURATION_MS = 500;

export const EnemyAvatar = defineComponent(EnemyAvatarPropsSchema, (props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prevHpRef = useRef<number | null>(props.hp);
  // Flip-card state: false = portrait, true = bio. Resets when the enemy
  // template changes (round transition flips back to portrait so the new
  // enemy's art is visible by default).
  const [flipped, setFlipped] = useState(false);
  // Reset the flip on enemy change — a new round shouldn't pre-flip the
  // player into a bio they haven't asked for. Keyed on enemy id (a string)
  // so React doesn't re-run on prop-object identity churn.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the id matters
  useEffect(() => {
    setFlipped(false);
  }, [props.enemy?.id]);

  // Damage pulse: when HP drops, briefly flash the avatar root via a
  // one-shot CSS animation. Implemented via a data attribute + setTimeout
  // so the animation can re-fire on consecutive hits — toggling the attr
  // off and on restarts the keyframes (a class would have the same
  // behavior; the data attr keeps the trigger discoverable from devtools).
  useEffect(() => {
    const prev = prevHpRef.current;
    const curr = props.hp;
    prevHpRef.current = curr;
    if (prev == null || curr == null) return;
    if (curr >= prev) return; // no damage, no pulse (heal or no-op)
    const el = rootRef.current;
    if (!el) return;
    el.dataset.damagePulse = "true";
    const t = window.setTimeout(() => {
      // Guard: the element may have unmounted (round transition) before
      // the timer fires.
      if (rootRef.current === el) delete el.dataset.damagePulse;
    }, DAMAGE_FX_DURATION_MS);
    return () => {
      window.clearTimeout(t);
      delete el.dataset.damagePulse;
    };
  }, [props.hp]);

  // Empty state — same outer dotted-border language as an empty CardSlot so
  // the panel reads as "ready to be filled" before a round starts.
  if (!props.enemy) {
    return (
      <div
        ref={rootRef}
        className="grid h-full w-full place-items-center rounded-lg border-2 border-dashed border-muted-gray/60 bg-canvas-white/40 p-4 text-center"
        data-test="enemy-avatar"
        data-state="empty"
      >
        <span className="text-sm font-medium text-muted-gray">No enemy yet</span>
      </div>
    );
  }

  const { enemy, hp } = props;
  // Per-round max overrides the template baseline. Same enemy can return
  // with a different ceiling each round; the bar's denominator follows.
  const effectiveMax = props.maxHp ?? enemy.maxHp;
  const liveHp = hp ?? effectiveMax;
  const hpRatio = effectiveMax > 0 ? Math.max(0, Math.min(1, liveHp / effectiveMax)) : 0;
  const borderClass = RARITY_BORDER[enemy.rarity];
  const fillClass = RARITY_BAR_FILL[enemy.rarity];
  // Poster variant — derived from prior-defeat count. The route reads the
  // count from `addingGame.enemyEncounters[enemy.id]`; the component is
  // pure so stories can drive variants directly via the `encounters` arg.
  const posterUrl = derivePosterUrl(enemy.imageUrl, props.encounters ?? 0);

  // Single-column grid: header (name + type), portrait (square, fills),
  // footer (HP bar). The grid lets the portrait grow while header/footer
  // stay tight — and keeps the HP bar visually anchored to the bottom of
  // the rarity-ringed frame instead of floating below it.
  //
  // The portrait `<img>` runs the ken-burns yo-yo via `animate-ken-burns-pan`
  // (custom keyframe in styles/index.css). Animating `object-position`
  // pans the visible window across artwork that's wider than the frame —
  // no transform, no layout cost, no GPU compositor surprises.
  //
  // The damage-pulse animation lives on the avatar ROOT so the entire
  // frame flashes (border + portrait + HP bar) — reads as "the enemy
  // took the hit" rather than just the artwork blinking.
  return (
    <div
      ref={rootRef}
      className={`group relative grid h-full grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border-4 bg-slate-ink data-[damage-pulse=true]:animate-damage-pulse ${borderClass}`}
      data-test="enemy-avatar"
      data-state="filled"
      data-rarity={enemy.rarity}
    >
      <div className="bg-black/70 px-3 py-2 text-white">
        <div className="font-openrunde text-sm font-bold leading-tight">{enemy.name}</div>
        <div className="text-[11px] uppercase tracking-wide text-white/70">
          {enemy.type} · {enemy.rarity}
        </div>
      </div>
      <div
        className="relative min-h-0 group-data-[damage-pulse=true]:animate-damage-shake"
        style={{ perspective: "1200px" }}
      >
        {/* The shake transform lives on this container so it composes with
            the img's object-position ken-burns pan without conflict —
            transform vs object-position are independent properties.
            `perspective` here gives the inner flip a 3D feel rather than
            a flat scale-Y. */}
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* FRONT — portrait + ken-burns + vignette. backface-visibility
              hides this side when flipped past 90°. */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            <img
              src={posterUrl}
              alt={enemy.name}
              className="absolute inset-0 h-full w-full animate-ken-burns-pan object-cover"
              draggable={false}
              data-test="enemy-poster"
              data-poster-encounters={props.encounters ?? 0}
            />
            {/* Red vignette overlay — radial gradient with a transparent
                center so the artwork stays legible. Opacity ramps via
                `animate-damage-vignette` keyframe. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 group-data-[damage-pulse=true]:animate-damage-vignette"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 45%, rgba(220, 38, 38, 0.85) 100%)",
              }}
            />
          </div>
          {/* BACK — bio. Slate parchment background, serif body, comfortable
              line-height, scrollable if the bio overflows the avatar
              window. Pre-rotated 180° so it reads correctly once the
              container flips. The LoreBio component owns the typography
              of the body — section headings, drop cap, paragraph rhythm —
              shared with PlayerAvatar so both avatars read like pages
              from the same field journal. */}
          <div
            className="absolute inset-0 overflow-y-auto bg-canvas-white px-4 py-3 text-slate-ink"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
            data-test="enemy-bio"
          >
            <LoreBio bio={enemy.bio} />
          </div>
        </div>
        {/* Toggle button — small "i / ✕" pill in the top-right of the
            portrait. Sits OUTSIDE the rotating flip-inner so its tap
            target stays consistent regardless of flip state. */}
        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          aria-label={flipped ? "Show portrait" : "Show bio"}
          aria-pressed={flipped}
          className="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-black/55 text-white shadow-md backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
          data-test="enemy-bio-toggle"
        >
          <span aria-hidden className="flex items-center justify-center">
            {flipped ? <X size={14} strokeWidth={2.5} /> : <Info size={14} strokeWidth={2.5} />}
          </span>
        </button>
      </div>
      <div className="bg-black/70 px-3 py-2">
        <div className="mb-1 flex items-baseline justify-between font-openrunde text-xs text-white">
          <span data-test="enemy-hp">
            {liveHp}/{effectiveMax}
          </span>
          <span className="text-white/60">HP</span>
        </div>
        <div className="h-2 overflow-hidden rounded-lg bg-slate-ink">
          <div
            className={`h-full transition-[width] duration-300 ease-out ${fillClass}`}
            style={{ width: `${hpRatio * 100}%` }}
            data-test="enemy-hp-bar"
          />
        </div>
      </div>
    </div>
  );
});
