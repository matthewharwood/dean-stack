import { atom, type WritableAtom } from "jotai";
import type * as z from "zod";

import type { AppDB } from "~/state/db";
import { getDB } from "~/state/db";

// Pillar 3 — `atomWithIDB`. IDB is the source of truth; this is the
// in-memory cache. Reads happen synchronously from a preloaded snapshot
// (the root `use(idbHydrationPromise)` is what surfaces that snapshot
// into render); writes go through the Zod schema, then debounce-flush to
// IDB with a ~150ms timer.
//
// Single-key stores (e.g. inkMode at id="settings") and multi-key stores
// (answers per worksheet) both use this factory — the only difference is
// the IDB key passed in.

type AtomWithIDBOptions<T> = {
  storeName: keyof AppDB;
  key: string;
  schema: z.ZodType<T>;
  defaultValue: T;
  // Initial value sourced from the hydration snapshot. The Provider in
  // `__root.tsx` plumbs a `Map<storeName.key, value>` keyed cache that
  // every atom-creation call reads from.
  hydrated: T | undefined;
  // Debounce ms; defaults to 150ms. Set to 0 to flush immediately (used
  // by the answer cell where the kid expects every stroke to be saved).
  debounceMs?: number;
};

// SSR/prerender-safe: typeof indexedDB === "undefined" → no-op writes.
const HAS_IDB = typeof indexedDB !== "undefined";

export function atomWithIDB<T>(
  options: AtomWithIDBOptions<T>,
): WritableAtom<T, [T | ((prev: T) => T)], void> {
  const { storeName, key, schema, defaultValue, hydrated, debounceMs = 150 } = options;
  const initial = hydrated ?? defaultValue;
  const inner = atom<T>(initial);

  let pendingTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingValue: T | undefined;

  async function write(value: T): Promise<void> {
    if (!HAS_IDB) return;
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      console.error(
        `atomWithIDB(${String(storeName)}:${key}) — Zod validation failed`,
        parsed.error,
      );
      return;
    }
    const db = await getDB();
    // All worksheets-app stores use in-line keyPath: "id" (see state/db.ts),
    // so we must NOT pass a separate key arg — the value carries its own id.
    // `idb`'s typed `put` rejects the union-of-storeNames boundary even
    // though every member resolves to a valid Put call. The Zod parse above
    // is the real safety net for value shape.
    // biome-ignore lint/suspicious/noExplicitAny: idb typed-union-store boundary
    await (db as any).put(storeName, parsed.data);
  }

  async function flush(): Promise<void> {
    if (pendingTimer !== undefined) {
      clearTimeout(pendingTimer);
      pendingTimer = undefined;
    }
    if (pendingValue !== undefined) {
      const v = pendingValue;
      pendingValue = undefined;
      await write(v);
    }
  }

  function schedule(value: T): void {
    pendingValue = value;
    if (pendingTimer !== undefined) clearTimeout(pendingTimer);
    if (debounceMs === 0) {
      void flush();
      return;
    }
    pendingTimer = setTimeout(() => {
      void flush();
    }, debounceMs);
  }

  return atom(
    (get) => get(inner),
    (get, set, update: T | ((prev: T) => T)) => {
      const prev = get(inner);
      const next = typeof update === "function" ? (update as (p: T) => T)(prev) : update;
      const parsed = schema.safeParse(next);
      if (!parsed.success) {
        console.error(`atomWithIDB(${String(storeName)}:${key}) — invalid set value`, parsed.error);
        return;
      }
      set(inner, parsed.data);
      schedule(parsed.data);
    },
  );
}
