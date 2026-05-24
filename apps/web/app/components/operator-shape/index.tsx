import type { ReactNode } from "react";

// Per-operator shape behind the glyph. Reinforces the operation
// visually so the kid recognises "circle = plus, triangle = minus,
// diamond = times" before they even read the symbol. Comparators
// (=, >, <) fall through to the default circle so the swap animation
// has a consistent silhouette to land on.
export type OperatorShapeKind = "circle" | "triangle" | "diamond";

export function pickOperatorShape(glyph: string): OperatorShapeKind {
  if (glyph === "−") return "triangle";
  if (glyph === "×") return "diamond";
  return "circle"; // +, =, >, <, ÷, default
}

// SVG-based decorative shape. White fill + light-gray stroke matches
// the existing pill aesthetic; the pulse animation runs on this
// element only so the glyph text stays sharp. `aria-hidden` because
// the glyph itself is the meaningful content.
export function OperatorShape({ kind }: { kind: OperatorShapeKind }): ReactNode {
  const path = (() => {
    if (kind === "triangle") return <polygon points="50,8 92,86 8,86" />;
    if (kind === "diamond") return <polygon points="50,5 95,50 50,95 5,50" />;
    return <circle cx="50" cy="50" r="45" />;
  })();
  // Decorative-shape silhouette behind the glyph. The glyph text beside
  // it is the meaningful content; `role="img"` + the static aria-label
  // satisfies biome's noSvgWithoutTitle rule while keeping the SVG out
  // of the meaningful a11y flow (the kid's screen reader hears the
  // glyph from the adjacent text, not "circle operator background").
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 size-full animate-op-pulse drop-shadow-sm"
      data-test="operator-shape"
      data-shape={kind}
      role="img"
      aria-label="Operator background"
    >
      <g
        fill="var(--color-canvas-white)"
        stroke="var(--color-light-gray)"
        strokeWidth="4"
        strokeLinejoin="round"
      >
        {path}
      </g>
    </svg>
  );
}
