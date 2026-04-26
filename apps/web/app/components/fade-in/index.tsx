import { type ReactNode, useRef } from "react";

import { fadeInUp } from "~/motion/presets";
import { useAnime } from "~/motion/use-anime";

export function FadeIn({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useAnime(ref, fadeInUp);
  return (
    <div ref={ref} className="rounded-card bg-brand-500 p-4 text-white font-display">
      {children}
    </div>
  );
}
