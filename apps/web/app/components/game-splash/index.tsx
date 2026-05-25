import { ArrowRight } from "lucide-react";
import { type ReactNode, useState } from "react";

import { useSound } from "~/sound";

// The empty state the kid sees on a fresh visit before they've started a
// game. Replaces the "no enemy yet" stuck-look with a deliberate Begin
// affordance — clicking it triggers the dive-in animation, which fades
// out into the first round. The lore-fragment text sets the mood before
// the descent (8s of marine snow + light shafts) does the rest.
//
// Co-located voiceover hook: useSplashVoiceover plays the "Begin the
// descent" line then resolves into onBegin. Used only here so it lives
// in the same file (a sibling .ts is overkill for ~20 lines).
function useSplashVoiceover(onBegin: () => void): {
  handleBegin: () => void;
  beginPending: boolean;
} {
  const sfx = useSound();
  const [beginPending, setBeginPending] = useState(false);

  const handleBegin = (): void => {
    if (beginPending) return;
    setBeginPending(true);
    void (async () => {
      await sfx.playUntilEnded("event-splash-begin-descent");
      await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
      onBegin();
      // beginPending stays true through the dive-in — the splash
      // unmounts when onBegin completes its state transition, so the
      // flag doesn't matter past this point.
    })();
  };

  return { handleBegin, beginPending };
}

export function GameSplash({ onBegin }: { onBegin: () => void }): ReactNode {
  const { handleBegin, beginPending } = useSplashVoiceover(onBegin);
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-8 px-8 text-center"
      data-test="splash"
    >
      <div className="flex flex-col items-center gap-2">
        <p className="font-openrunde text-xs font-semibold uppercase tracking-[0.3em] text-muted-gray">
          The trench is waiting
        </p>
        <h2 className="font-openrunde text-5xl font-semibold text-slate-ink">Hadal Tide</h2>
        <p className="max-w-md text-base text-medium-gray">
          The echoes are confused. They've been counting in the dark for a long time. Help them
          remember.
        </p>
      </div>
      <button
        type="button"
        onClick={handleBegin}
        disabled={beginPending}
        className="flex items-center gap-2 rounded-full bg-radiant-violet px-10 py-4 font-openrunde text-xl font-bold text-white shadow-subtle transition-transform duration-150 hover:scale-[1.04] active:scale-95 disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100"
        data-test="splash-begin"
        data-begin-pending={beginPending ? "true" : undefined}
      >
        <span>Begin the descent</span>
        <ArrowRight size={22} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
