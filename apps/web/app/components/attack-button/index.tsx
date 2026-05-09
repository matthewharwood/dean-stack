import { ATTACK_ICON } from "~/games/adding-game/attack-icons";
import { defineComponent } from "~/lib/define-component";
import { useSound } from "~/sound";

import { AttackButtonPropsSchema } from "./schema";

// Per-attack pick button. Three of these stack horizontally to replace
// the single "Attack" button on a winning evaluation. The kid taps one;
// the consumer (route) runs the Pixi animation tied to `attack.kind`,
// awaits it, then advances state.
//
// Layout: a small colored circle holds the lucide icon and overlaps the
// top-center of the card. Card body is left-aligned: the attack name
// stacks above the damage tally. The card has top padding to give the
// circle visual breathing room without clipping the icon.
//
// Sizing: flex-1 + min-w-0 lets three siblings share the row evenly. We
// allow the name to wrap to 2 lines (`line-clamp-2`) instead of
// truncating with ellipsis — names like "Drowned Vortex" were getting
// chopped on the narrowest iPad width before this change.
export const AttackButton = defineComponent(AttackButtonPropsSchema, (props) => {
  const { attack, damage, onSelect, pending } = props;
  const Icon = ATTACK_ICON[attack.kind];
  const sfx = useSound();
  return (
    <button
      type="button"
      onClick={() => {
        // Play per-character variant if registered, kind-base fallback, silent if neither.
        sfx.playAttack(attack);
        onSelect(attack);
      }}
      disabled={pending}
      className="group relative flex min-h-[80px] min-w-0 flex-1 max-w-[200px] flex-col items-start gap-0.5 rounded-lg border-2 border-light-gray bg-white px-3 pt-6 pb-2 text-left shadow-subtle transition-transform duration-150 hover:scale-[1.04] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      data-test="attack-button"
      data-attack-id={attack.id}
      data-attack-kind={attack.kind}
    >
      <span
        aria-hidden="true"
        className="absolute -top-3.5 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white text-white shadow-md"
        style={{ backgroundColor: attack.color }}
      >
        <Icon size={16} strokeWidth={2.25} />
      </span>
      <span className="block w-full font-openrunde text-sm font-bold leading-tight text-slate-ink line-clamp-2">
        {attack.name}
      </span>
      <span className="font-openrunde text-xs text-success-green">−{damage} HP</span>
    </button>
  );
});
