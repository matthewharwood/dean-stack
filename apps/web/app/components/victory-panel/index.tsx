import type { ReactNode } from "react";

export function VictoryPanel({ onPlayAgain }: { onPlayAgain: () => void }): ReactNode {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6 p-[18px] text-center"
      data-test="victory-panel"
    >
      <h2 className="font-openrunde text-4xl font-semibold text-slate-ink">The trench is calm.</h2>
      <p className="max-w-md text-lg text-medium-gray">
        You sent every wraith back to sleep. The Hadal Tide remembers your kindness.
      </p>
      <button
        type="button"
        onClick={onPlayAgain}
        className="rounded-full bg-radiant-violet px-8 py-3 font-bold text-white shadow-subtle transition-transform duration-150 hover:scale-[1.04] active:scale-95"
        data-test="play-again-button"
      >
        Dive again
      </button>
    </div>
  );
}
