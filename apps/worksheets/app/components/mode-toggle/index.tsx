import { useAtom } from "jotai";
import { PenTool, Printer } from "lucide-react";
import { type ReactNode, useCallback } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { inkModeAtom } from "~/state/ink-atoms";

export const ModeTogglePropsSchema = z.object({
  className: z.string().optional(),
});

// Print ⇄ iPad mode toggle. Persisted to IDB via the inkMode atom so
// the choice survives reloads and applies to every sheet you open until
// you flip it back. Per the AskUserQuestion outcome: per-app, persisted.
export const ModeToggle = defineComponent(ModeTogglePropsSchema, ({ className }): ReactNode => {
  const [settings, setSettings] = useAtom(inkModeAtom());
  const isIpad = settings.mode === "ipad";
  const toggle = useCallback((): void => {
    setSettings({ id: "settings", mode: isIpad ? "print" : "ipad" });
  }, [isIpad, setSettings]);
  return (
    <button
      type="button"
      onClick={toggle}
      className={[
        "inline-flex items-center gap-1.5 rounded-card border-2 px-3 py-1.5 text-sm font-display",
        isIpad
          ? "border-white bg-white text-brand-700"
          : "border-white/80 text-white hover:bg-white/10",
        className ?? "",
      ].join(" ")}
      aria-pressed={isIpad}
      data-test="mode-toggle"
      data-mode={settings.mode}
    >
      {isIpad ? (
        <>
          <PenTool size={14} aria-hidden="true" />
          <span>iPad</span>
        </>
      ) : (
        <>
          <Printer size={14} aria-hidden="true" />
          <span>Print</span>
        </>
      )}
    </button>
  );
});
