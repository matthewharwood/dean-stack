---
name: react-compiler-rules
description: React 19 + React Compiler purity rules for dean-stack — no manual `useMemo`/`useCallback`/`React.memo`, anime.js AND PixiJS are side channels never called in render (use `useAnime` / `usePixiApp` from `useEffect`), Jotai hooks are pure subscribers safe to use directly, and the Compiler is the source of truth for memoization. Triggers on: react compiler, useMemo, useCallback, React.memo, manual memoization, render purity, side channel, compiler audit, useAnime, usePixiApp.
license: MIT
---

Sub-skill of `react`. The React Compiler is enabled for this repo and assumes pure render functions. This skill owns "what render is allowed to do" and "why your `useMemo` is wrong" — and it owns the inverse, the side-channel rule that pushes anime.js, mutable refs, and DOM reads out of render entirely.

## When to invoke
- A reviewer (or you) is about to write `useMemo`, `useCallback`, or wrap a component in `React.memo`.
- A render function is mutating a ref, reading from a `ref.current.x`, or calling a non-pure helper.
- An animation or DOM read needs to live somewhere — and you're tempted to put it in render.
- A Compiler audit error fires (`react-compiler/*` lint rule).
- A teammate asks "but isn't `useMemo` faster?"

## Owns
React Compiler purity rules: no `useMemo`/`useCallback`/`React.memo`, the side-channel rule for anime.js, and how to keep render functions pure.

## Defers to
- `react` (parent) — version pin and routing.
- `react-19-primitives` — when the right answer is "use a 19 primitive (`useTransition`, `useDeferredValue`) instead of memoizing."
- `animejs` — for the canonical `useAnime(ref, params, deps)` hook that enforces the side-channel rule by construction.
- `pixijs` — for the canonical `usePixiApp(canvasRef, setup, deps)` hook (in `apps/<name>/app/canvas/`). PixiJS is a side channel just like anime.js: `Application.init`, the Ticker, and all sprite mutation live in `useEffect`; render returns a `<canvas ref={canvasRef}>` and Pixi paints into it.
- `jotai` — for "Jotai hooks in render are fine" (the parent producer of the rule from the state side).
- `bun-test` — for unit-testing pure derivations extracted out of components.

## Dean-stack rules
- React Compiler is non-optional in this repo. Manual memoization is *noise* the Compiler must reason around — it can mask purity bugs and degrades, not improves, the optimizer's output.
- Pillar 4 (CLI-gate-first) means: the `react-compiler/*` lint rules ride in `biome ci` (or via the official ESLint plugin if added) and a violation fails the gate. Fix it; do not silence it.
- Pillar 2 (Zod-first types) means: prop validation with `defineComponent(schema, fn)` runs *outside* render in dev, after which render is a pure function of typed props. The schema gate keeps render pure (see `zod`).
- Render is a pure function of props + atoms + reads — no side effects, no DOM mutation, no `ref.current = ...`, no animation calls. Side effects belong in event handlers, `useEffect`, or `useLayoutEffect`.
- Jotai hooks (`useAtomValue`, `useSetAtom`, `useAtom`) are pure subscribers — calling them directly in render is correct and the Compiler is fine with them (see `jotai`).

## Patterns

### No manual memo — let the Compiler handle it
```tsx
// pinned: react ^19.x with React Compiler enabled
import { useAtomValue } from "jotai";
import { progressAtom } from "~/state/atoms";

export function Score({ multiplier }: { multiplier: number }) {
  const progress = useAtomValue(progressAtom);
  // No useMemo — the Compiler memoizes derived expressions automatically.
  const total = progress.level * multiplier;
  // No useCallback — the inline handler is fine.
  return <button onClick={() => console.log(total)}>{total}</button>;
}
```
The Compiler analyzes dependencies and emits the equivalent of memoization where it actually pays off. Hand-rolled `useMemo`/`useCallback` add dependency arrays the Compiler must double-check, and a stale array silently breaks correctness.

### Replace `useMemo` for "expensive" derivations with extracted pure helpers
```ts
// derive.ts — pure module, unit-testable in `bun test`
export function deriveScore(level: number, multiplier: number): number {
  return level * multiplier;
}
```
```tsx
import { deriveScore } from "./derive";

export function Score({ multiplier }: { multiplier: number }) {
  const progress = useAtomValue(progressAtom);
  return <span>{deriveScore(progress.level, multiplier)}</span>;
}
```
Pure helpers are faster to test, easier to reason about, and the Compiler memoizes the call site for free.

### Replace `React.memo` with prop-shape discipline
```tsx
// Component is "memoized" by the Compiler at every call site that has stable inputs.
export function Row({ id, label }: { id: string; label: string }) {
  return <li data-id={id}>{label}</li>;
}
```
If the parent passes referentially-stable props (and atoms make this easy — `useAtomValue` returns the same reference until the atom changes), the Compiler skips re-renders without `React.memo`.

### Side-channel rule — anime.js, DOM, refs all live outside render
```tsx
import { useRef, useEffect } from "react";
import { animate } from "animejs"; // v4 named import

export function FadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  // Side channel: the animation mutates style outside React. Never in render.
  useEffect(() => {
    if (!ref.current) return;
    const a = animate(ref.current, { opacity: [0, 1], duration: 300 });
    return () => a.cancel();
  }, []);
  return <div ref={ref} />;
}
```
The render returns a `<div>`; the animation is set up inside `useEffect` and torn down on cleanup. See `animejs` for the `useAnime(ref, params, deps)` hook that wraps this pattern so you don't have to write it by hand each time.

### Compiler audit — the lint rules to keep on
```jsonc
// biome.json (excerpt) — or eslint config if the official plugin is added
{
  "linter": {
    "rules": {
      "correctness": {
        "noNestedComponentDefinitions": "error"
      }
    }
  }
}
```
Plus the official `eslint-plugin-react-hooks` v5+ rules (`react-hooks/exhaustive-deps`, `react-hooks/react-compiler`) wherever they live in this repo's lint pipeline. A violation fails `bun run check` (see `biome` for the JS/TS lint surface).

### Diagnosing render issues — `react-scan`
[`react-scan`](https://github.com/aidenybai/react-scan) is loaded automatically in dev via `apps/<name>/app/client.tsx` and `.storybook/preview.tsx` (gated by `import.meta.env.DEV` so it tree-shakes from prod). It outlines re-rendering components with a visual box. **Use it as the visual companion to this skill** — if the Compiler can't memoize a component, react-scan is what surfaces the failure. Common causes for an unexpected highlight:

- A side-channel violation — anime.js or PixiJS call leaking into render (see anti-patterns below)
- An unstable atom return — a new object identity per `get` instead of a stable reference
- A nested component definition (a Component inside another Component's render — also fails the lint rule above)

**Don't suppress the highlight by adding manual `useMemo` / `useCallback` / `React.memo`** — that's forbidden in dean-stack. Fix the cause. There is no `react-scan` skill: it has no version-specific deprecations, no opinionated patterns, no migration cliffs. Just look at the boxes.

### When `useTransition` replaces a `useMemo` instinct
```tsx
// Instead of memoizing an expensive derivation, mark the update non-urgent.
import { useTransition } from "react";

export function FilterableList({ items }: { items: string[] }) {
  const [pending, startTransition] = useTransition();
  const setQuery = useSetAtom(queryAtom);
  return (
    <input
      onChange={(e) => startTransition(() => setQuery(e.target.value))}
      aria-busy={pending}
    />
  );
}
```
If the *real* problem was responsiveness, a 19 primitive solves it (see `react-19-primitives`). Don't reach for `useMemo` to fix lag — fix the scheduling.

## Anti-patterns
- **Don't write `useMemo`** — the React Compiler memoizes for you. Manual `useMemo` is noise that can mask a purity bug. If you genuinely need a stable identity, the Compiler already provides one.
- **Don't write `useCallback`** — same reason. Inline arrow handlers are correct in React 19 + Compiler.
- **Don't wrap a component in `React.memo`** — the Compiler decides what re-renders. `React.memo` wraps with a shallow-equality check the Compiler can't see through.
- **Don't call `animate(...)`, `createTimeline(...)`, or any anime.js function during render** — see `animejs` for the canonical `useAnime` hook. Animations are a side channel; render is pure.
- **Don't call `Application.init`, `app.ticker.add`, or any PixiJS scene-graph mutation during render** — see `pixijs` for the canonical `usePixiApp(canvasRef, setup, deps)` hook. PixiJS is a side channel that paints into a `<canvas>` React owns; render returns the `<canvas ref={canvasRef}>` and Pixi mutates it from `useEffect`.
- **Don't read or write `ref.current` during render** — read after mount in `useEffect`/`useLayoutEffect`, or in an event handler. Render-time ref reads return stale values and break the Compiler's analysis.
- **Don't define a component inside another component's render** — `noNestedComponentDefinitions`. The inner component's identity changes every render and remounts subtrees.
- **Don't mutate props or atoms during render** — render is a pure function of inputs. Mutate via `useSetAtom` (Jotai) or in event handlers / effects.
- **Don't silence a `react-compiler/*` lint error** — it's flagging a real bug. Fix the purity violation; do not add an ignore comment.
- **Don't use class components or `componentDidMount`/`componentWillUnmount`** — function components only. Lifecycle is `useEffect`.

## Triggers on
react compiler, useMemo, useCallback, React.memo, manual memoization, render purity, side channel, compiler audit
