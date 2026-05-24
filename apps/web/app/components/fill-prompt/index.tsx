import { type ReactNode, useEffect } from "react";

// Shows for 3 seconds above the disabled Evaluate button, then unmounts.
// The keyframe handles the visual lifecycle (fade-in, gentle pulse, fade-
// out); the React timer drives the actual mount/unmount so a second tap
// while the prompt is up resets it (the parent re-keys this component on
// every disabled tap).
export function FillPrompt({ onDone }: { onDone: () => void }): ReactNode {
  useEffect(() => {
    const t = window.setTimeout(onDone, 3000);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <output
      className="pointer-events-none absolute -top-12 left-1/2 z-20 -translate-x-1/2 animate-fill-prompt rounded-full bg-vivid-orange px-4 py-1.5 font-openrunde text-sm font-bold whitespace-nowrap text-white shadow-lg"
      data-test="fill-prompt"
    >
      Fill out the board!
    </output>
  );
}
