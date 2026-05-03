import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";

import { clearAllStorage } from "~/lib/clear-storage";

// Context exposed to DevMenu children so route-specific menu items can
// dismiss the panel after they fire (e.g. RoundJumpPanel closes the
// menu so the kid sees the new round immediately). Only valid inside a
// rendered DevMenu — useDevMenu throws otherwise to surface misuse.
type DevMenuApi = { close: () => void };
const DevMenuContext = createContext<DevMenuApi | null>(null);

export function useDevMenu(): DevMenuApi {
  const ctx = useContext(DevMenuContext);
  if (!ctx) throw new Error("useDevMenu: must be used inside <DevMenu>");
  return ctx;
}

// Lucide-style gear glyph. Inline so there's no icon-package dependency for
// a single icon, and so the path renders identically in Storybook and prod.
function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// Dev / parent menu. Lives top-right, fixed to the viewport so it floats
// above the game grid without affecting layout. Click outside or press
// Esc to dismiss.
//
// First-party items: "Clear state". Route-specific items can be passed
// as `children` (e.g. the adding-game route renders a round-jump panel
// here). Children get a `useDevMenu().close()` to dismiss the menu
// after they act.
//
// Intentionally not gated behind `import.meta.env.DEV` — the user wants this
// available in deployed builds too while iterating on the schema. When the
// game stabilizes, gate it or move it behind a long-press affordance.
export function DevMenu({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current) return;
      if (e.target instanceof Node && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleClearState() {
    if (busy) return;
    const ok = window.confirm(
      "Clear ALL game state and reload?\n\nThis wipes saved progress, settings, and cached assets.",
    );
    if (!ok) return;
    setBusy(true);
    try {
      await clearAllStorage();
    } finally {
      // Reload regardless — even if a single storage surface failed, the rest
      // are wiped and a fresh boot is the recovery path the user wanted.
      window.location.reload();
    }
  }

  return (
    <DevMenuContext.Provider value={{ close: () => setOpen(false) }}>
      <div ref={containerRef} className="fixed top-3 right-3 z-50">
        <button
          type="button"
          aria-label="Open dev menu"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white/85 text-neutral-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-neutral-900 active:scale-95"
          data-test="dev-menu-button"
        >
          <GearIcon />
        </button>
        {open ? (
          <div
            role="menu"
            aria-label="Dev menu"
            className="absolute top-full right-0 mt-2 min-w-[200px] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg"
            data-test="dev-menu-panel"
          >
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={handleClearState}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 active:bg-rose-100 disabled:opacity-60"
              data-test="dev-menu-clear-state"
            >
              <span>{busy ? "Clearing…" : "Clear state"}</span>
              <span aria-hidden className="text-xs text-rose-400">
                ↻
              </span>
            </button>
            {children ? (
              <div className="border-t border-neutral-200" data-test="dev-menu-extra">
                {children}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </DevMenuContext.Provider>
  );
}
