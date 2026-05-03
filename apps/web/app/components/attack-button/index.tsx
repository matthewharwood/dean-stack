import { defineComponent } from "~/lib/define-component";

import { AttackButtonPropsSchema } from "./schema";

// Per-attack pick button. Three of these stack horizontally to replace
// the single "Attack" button on a winning evaluation. The kid taps one;
// the consumer (route) runs the Pixi animation tied to `attack.kind`,
// awaits it, then advances state.
//
// Visual pattern: a thin colored swatch on the left (the attack's
// signature color), the glyph (one or two characters) at large size,
// and the name + damage stacked vertically. The button is wide so the
// touch target is comfortable on iPad.
export const AttackButton = defineComponent(AttackButtonPropsSchema, (props) => {
  const { attack, damage, onSelect, pending } = props;
  // Sizing rules — single row, no CLS:
  // - flex-1 + min-w-0 lets three siblings share the row evenly without
  //   any one button bullying the others when names differ in length.
  // - max-w-[200px] keeps the row visually balanced on a wide column.
  // - The name `truncate` (overflow-ellipsis) absorbs any remaining
  //   overflow on the narrowest iPad width without re-wrapping into a
  //   second line and shifting the cards below.
  return (
    <button
      type="button"
      onClick={() => onSelect(attack)}
      disabled={pending}
      className="group flex min-w-0 flex-1 max-w-[200px] items-center gap-3 rounded-md border-2 border-neutral-300 bg-white px-3 py-3 text-left shadow-md transition-transform duration-150 hover:scale-[1.04] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      data-test="attack-button"
      data-attack-id={attack.id}
      data-attack-kind={attack.kind}
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-2xl font-bold text-white shadow-inner"
        style={{ backgroundColor: attack.color }}
      >
        {attack.glyph}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="block truncate font-display text-base font-bold leading-tight text-neutral-900">
          {attack.name}
        </span>
        <span className="font-mono text-xs text-emerald-600">−{damage} HP</span>
      </span>
    </button>
  );
});
