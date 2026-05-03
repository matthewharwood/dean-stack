import { useSetAtom } from "jotai";

import { useDevMenu } from "~/components/dev-menu";
import { jumpToRound, ROUND_START_LEVEL } from "~/games/adding-game/jump";
import { addingGameAtom } from "~/state/atoms";

// Dev-menu sub-panel: jump straight to the first level of any round.
// Mounted under "Clear state" inside the gear menu on /adding-game.
//
// Behavior (see jump.ts for the full contract):
//   - clicking "Round N" sets the game to playing at the first level of N
//   - the active pilot is credited XP for every prior level (round 3 →
//     credit for rounds 1+2; round 1 → no credit, fresh start)
//   - jumping BACK to an earlier round overwrites pilot XP to that
//     round's baseline, "clearing" credit from the round we came from
//
// Five-round expansion: this panel iterates ROUND_START_LEVEL keys, so a
// new round added in jump.ts shows up here automatically — but read the
// FIVE-ROUND CHECKLIST comment block in jump.ts before adding one. The
// type-narrowing on `Number(roundStr)` below also needs the literal
// union (currently 1|2|3|4) widened.
export function RoundJumpPanel() {
  const setGame = useSetAtom(addingGameAtom);
  const { close } = useDevMenu();

  // `Object.keys` returns `string[]` even when the record is keyed by a
  // numeric union — TS rejects a direct cast to `Round[]` because string
  // and number-literal types don't overlap. Funneling through `unknown`
  // is the canonical workaround; the sort comparator handles the
  // string-to-number coercion at runtime.
  const rounds = (
    Object.keys(ROUND_START_LEVEL) as unknown as Array<keyof typeof ROUND_START_LEVEL>
  ).sort((a, b) => Number(a) - Number(b));

  const handleJump = (round: keyof typeof ROUND_START_LEVEL): void => {
    setGame((prev) => jumpToRound(prev, round));
    close();
  };

  return (
    <div className="flex flex-col" data-test="dev-menu-round-jump">
      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-gray">
        Jump to round
      </div>
      <div className="grid grid-cols-4 gap-1 px-2 pb-2">
        {rounds.map((round) => (
          <button
            key={round}
            type="button"
            onClick={() => handleJump(round)}
            className="flex flex-col items-center gap-0.5 rounded-lg border border-light-gray bg-white px-2 py-1.5 text-medium-gray shadow-sm transition-colors hover:bg-whisper-purple hover:text-slate-ink active:scale-95"
            data-test={`dev-menu-jump-round-${round}`}
            data-round={round}
          >
            <span className="font-openrunde text-base font-bold leading-none">{round}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-gray">
              {roundLabel(round)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Short caption beneath each round number — mirrors the round structure
// the kid sees in-game so the dev tool reads the same way as the
// indicator. Update when round structure changes.
function roundLabel(round: 1 | 2 | 3 | 4): string {
  if (round === 1) return "Add";
  if (round === 2) return "Sub";
  if (round === 3) return "Cmp";
  return "Mix";
}
