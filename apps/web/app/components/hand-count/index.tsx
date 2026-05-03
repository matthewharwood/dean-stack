import type { CSSProperties } from "react";

import { defineComponent } from "~/lib/define-component";

import { HandCountPropsSchema } from "./schema";

// ─── Palette ──────────────────────────────────────────────────────────
// Vellum-warm skin matches the Hadal Tide bible's lantern-light token
// (#F4E4C1) so the hands read as "lantern-warm" rather than tied to
// any specific human skin tone — kid-friendly, abstract, and on-brand.
const SKIN = "#f4e4c1";
const SKIN_DEEP = "#d8b97a";
const OUTLINE = "#8b5a2b";
const NAIL = "#fef6e0";

// ─── Counting convention (index-first) ────────────────────────────────
// 1 = index up (point)
// 2 = index + middle (peace sign)
// 3 = index + middle + ring
// 4 = index + middle + ring + pinky (no thumb)
// 5 = all five (thumb extended last)
//
// Index-first because pointing-with-index for "1" is universal and the
// peace sign for "2" is iconic. Thumb-last keeps the order legible for
// counting upward visually: the kid sees fingers light up in the same
// order they would raise them.
type Finger = "index" | "middle" | "ring" | "pinky" | "thumb";
const COUNT_ORDER: readonly Finger[] = ["index", "middle", "ring", "pinky", "thumb"];

// ─── Geometry — canonical right hand, viewed from above ───────────────
// ViewBox is 100×140. The hand is drawn as a "right hand" (thumb on the
// LEFT side of the SVG); the left hand is rendered by mirroring this
// SVG via `scaleX(-1)`, so all geometry has one source of truth.
//
// Finger lengths approximate real proportions: middle longest, then
// index and ring tied, then pinky shortest. The thumb is shorter still
// and mounted on the side via a rotation transform.
type FingerGeom = {
  name: Exclude<Finger, "thumb">;
  x: number;
  w: number;
  topY: number; // top of finger when extended
  baseY: number; // where the finger meets the palm (knuckle line)
};
const FINGERS: readonly FingerGeom[] = [
  { name: "index", x: 30, w: 14, topY: 22, baseY: 72 },
  { name: "middle", x: 47, w: 16, topY: 12, baseY: 72 },
  { name: "ring", x: 66, w: 14, topY: 22, baseY: 72 },
  { name: "pinky", x: 83, w: 10, topY: 38, baseY: 74 },
];

// One hand. Internal — exported via the HandCount composite below so
// the public surface is one component (Pillar 1: one component, one
// story file).
function Hand({
  count,
  side,
  delayOffset,
  ariaLabel,
}: {
  count: number;
  side: "left" | "right";
  delayOffset: number;
  ariaLabel: string;
}) {
  const isExt = (name: Finger): boolean => COUNT_ORDER.indexOf(name) < count;
  // Per-finger animation delay — each newly-extended finger lights up
  // 80ms after the previous one, in counting order. The kid sees them
  // count themselves up: one, two, three, four, five.
  const delay = (name: Finger): number => delayOffset + COUNT_ORDER.indexOf(name) * 80;

  // Finger styles. Two flavours:
  //   - extended: scaleY animates 0.22 → 1 from the bottom (the
  //               knuckle), so the finger appears to grow up out of
  //               the palm in time with the counting cadence.
  //   - curled: a stubby rect at the top of the palm — no animation,
  //             no growth. Reads as "this finger is folded down."
  // `transform-box: fill-box` makes percentage transform-origin
  // resolve to the rect's box, not the SVG viewport.
  const extendedStyle = (name: Finger): CSSProperties => ({
    transformBox: "fill-box",
    transformOrigin: "50% 100%",
    animation: "finger-extend 380ms ease-out backwards",
    animationDelay: `${delay(name)}ms`,
  });

  return (
    <svg
      viewBox="0 0 100 140"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      style={
        side === "left"
          ? ({ transform: "scaleX(-1)", overflow: "visible" } as CSSProperties)
          : { overflow: "visible" }
      }
    >
      {/* Wrist — small rounded-lg rectangle anchoring the bottom of the
          composition. Kept narrower than the palm so the silhouette
          reads as a hand rather than a paddle. */}
      <rect
        x="32"
        y="122"
        width="36"
        height="18"
        rx="6"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="2"
      />

      {/* Palm — rounded-lg path with gentle inward curves at the knuckle
          line and wrist. The path is anchored so the four-finger
          knuckles sit along the top edge (y=72) and the side near the
          thumb (left edge in canonical orientation) bulges out. */}
      <path
        d="M22 88
           Q22 72 38 72
           L82 72
           Q92 72 92 86
           L92 116
           Q92 130 78 130
           L34 130
           Q22 130 22 116
           Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Knuckle dimples — small darker spots at each finger's base.
          Sells the "back of hand" view (you wouldn't see knuckles on
          a palm). */}
      {FINGERS.map((f) => (
        <circle
          key={`knuckle-${f.name}`}
          cx={f.x + f.w / 2}
          cy={f.baseY + 1}
          r="1.6"
          fill={SKIN_DEEP}
        />
      ))}

      {/* Thumb — rotated rectangle anchored at the side of the palm.
          Two distinct geometries: extended is long and angled outward
          (~ −22°), curled is tucked against the palm at a steeper
          angle (~ −45°) and much shorter. */}
      {isExt("thumb") ? (
        <g
          style={{
            transformOrigin: "22px 100px",
            transform: "rotate(-22deg)",
          }}
        >
          <g style={extendedStyle("thumb")}>
            <rect
              x="14"
              y="54"
              width="16"
              height="50"
              rx="8"
              fill={SKIN}
              stroke={OUTLINE}
              strokeWidth="2"
            />
            <ellipse
              cx="22"
              cy="61"
              rx="4"
              ry="2.6"
              fill={NAIL}
              stroke={OUTLINE}
              strokeWidth="0.7"
            />
          </g>
        </g>
      ) : (
        <g
          style={{
            transformOrigin: "22px 100px",
            transform: "rotate(-45deg)",
          }}
        >
          <rect
            x="14"
            y="86"
            width="16"
            height="18"
            rx="8"
            fill={SKIN_DEEP}
            stroke={OUTLINE}
            strokeWidth="2"
          />
        </g>
      )}

      {/* Four main fingers. Each one renders either the full extended
          rect (with stagger animation + fingernail) or a stubby
          curled rect (no animation, no nail). */}
      {FINGERS.map((f) => {
        const extended = isExt(f.name);
        if (!extended) {
          return (
            <rect
              key={`curled-${f.name}`}
              x={f.x}
              y={f.baseY - 10}
              width={f.w}
              height={12}
              rx={f.w / 2}
              fill={SKIN_DEEP}
              stroke={OUTLINE}
              strokeWidth="2"
            />
          );
        }
        const length = f.baseY - f.topY;
        return (
          <g key={`extended-${f.name}`}>
            <rect
              x={f.x}
              y={f.topY}
              width={f.w}
              height={length}
              rx={f.w / 2}
              fill={SKIN}
              stroke={OUTLINE}
              strokeWidth="2"
              style={extendedStyle(f.name)}
            />
            <ellipse
              cx={f.x + f.w / 2}
              cy={f.topY + 6}
              rx={f.w * 0.32}
              ry={f.w * 0.26}
              fill={NAIL}
              stroke={OUTLINE}
              strokeWidth="0.7"
              style={extendedStyle(f.name)}
            />
          </g>
        );
      })}
    </svg>
  );
}

// HandCount — public composite. Splits `count` (0–10) across two hands
// in counting order (left fills first, then right) and renders both
// hands side-by-side. Captioned underneath when a caption is supplied.
//
// Stagger delays cascade across BOTH hands so the kid sees them count
// themselves up: 1, 2, 3, 4, 5, 6, 7… without a pause between hands.
export const HandCount = defineComponent(HandCountPropsSchema, (props) => {
  const total = Math.max(0, Math.min(10, props.count));
  const left = Math.min(5, total);
  const right = Math.max(0, total - 5);

  return (
    <div className="flex flex-col items-center gap-2" data-test="hand-count" data-count={total}>
      <div className="flex items-end gap-3">
        <div className="h-24 w-16">
          <Hand count={left} side="left" delayOffset={0} ariaLabel={`Left hand showing ${left}`} />
        </div>
        <div className="h-24 w-16">
          <Hand
            count={right}
            side="right"
            delayOffset={left * 80}
            ariaLabel={`Right hand showing ${right}`}
          />
        </div>
      </div>
      {props.caption ? (
        <span className="font-openrunde text-xs font-semibold uppercase tracking-[0.18em] text-medium-gray">
          {props.caption}
        </span>
      ) : null}
    </div>
  );
});
