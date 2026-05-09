import { closeDB } from "~/state/db";
import { cancelPendingWrites } from "~/state/persist";

// Hard timeout for a single `deleteDatabase` request. If the request stays
// blocked past this (another tab or PWA window has the DB open and won't
// release it), we give up and reload anyway — the browser closes our tab's
// handle on unload and the queued delete completes against an empty origin.
const DELETE_TIMEOUT_MS = 3000;

// Wipe every browser-side storage surface this app touches. Called by the
// dev menu's "Clear state" affordance to recover from stale-schema bugs:
// e.g. a persisted IDB row from before a schema field was added still
// satisfies the parser via `.default()`, so the gameStart effect never
// re-deals because `round` already exists. Nuke everything and reload.
//
// Order is intentional and load-bearing — get this wrong and the button
// silently no-ops on iPad:
//
//   1. Cancel pending debounced persist writes. Otherwise a `setTimeout`
//      scheduled before the click fires mid-clear, calls `getDB()`, opens
//      a fresh connection, and blocks `deleteDatabase`. The race that put
//      the user back on round 304 after clearing.
//   2. Close our own IDB connection AND set the closed flag (in `db.ts`)
//      so any code path that still calls `getDB()` after step 1 gets a
//      rejected promise instead of a fresh handle.
//   3. SW unregister + cache flush so the next page-load fetch can't be
//      served stale assets.
//   4. `deleteDatabase` for every DB the origin owns. The call is
//      name-only — version-agnostic — so a DB at any version (including
//      one bumped past the code's current `DB_VERSION`) gets blown away.
//      Wait for `onsuccess` (NOT `onblocked`) with a hard timeout fallback.
//   5. localStorage / sessionStorage / cookies.
export async function clearAllStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  // Steps 1–2: stop new IDB connections from being created and close the
  // existing one. Order matters — cancel writes BEFORE close so a
  // setTimeout that's already in the macrotask queue can't fire and
  // re-open between these two lines.
  cancelPendingWrites();
  await closeDB();

  // Service Worker registrations — unregister so the next load isn't
  // intercepted by a SW that's still serving the old shell.
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }

  // Workbox / runtime cache storage.
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  // IndexedDB — every database, not just the one we know about, in case a
  // future migration leaves a stray DB behind. Wait for `onsuccess` so the
  // reload doesn't race ahead of the delete; on `onblocked`, log and let
  // the timeout decide rather than resolving immediately (that was the
  // round-304 bug).
  if ("databases" in indexedDB) {
    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs.map(
        (db) =>
          new Promise<void>((resolve) => {
            if (!db.name) {
              resolve();
              return;
            }
            const name = db.name;
            const req = indexedDB.deleteDatabase(name);
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              resolve();
            };
            req.onsuccess = finish;
            req.onerror = finish;
            req.onblocked = () => {
              console.warn(`idb: delete blocked for "${name}" — another connection still open`);
              // Don't resolve — wait for the holder to close, or hit the timeout.
            };
            setTimeout(() => {
              if (!done) console.warn(`idb: delete timed out for "${name}"; reloading anyway`);
              finish();
            }, DELETE_TIMEOUT_MS);
          }),
      ),
    );
  }

  // localStorage + sessionStorage.
  try {
    window.localStorage.clear();
  } catch {
    // localStorage can throw in private mode / SecurityError contexts.
  }
  try {
    window.sessionStorage.clear();
  } catch {
    // ditto
  }

  // Cookies — biome flags `document.cookie` because the modern path is the
  // CookieStore API. CookieStore landed in iPad Safari 17.4 but isn't in
  // every supported browser yet, and the app sets zero cookies of its own:
  // this loop only kicks in if a dev tool / extension / Storybook iframe
  // dropped one on the origin. document.cookie is the single API guaranteed
  // to work everywhere we deploy. Suppress with intent.
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    // eslint-disable-next-line react-doctor/js-set-map-lookups -- false positive: this is String#indexOf finding a single char in a single string, not Array#indexOf in a hot loop. There's no Set/Map equivalent for character search.
    const eq = cookie.indexOf("=");
    const name = (eq === -1 ? cookie : cookie.slice(0, eq)).trim();
    if (!name) continue;
    // biome-ignore lint/suspicious/noDocumentCookie: defensive cleanup; CookieStore not yet universal
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    // biome-ignore lint/suspicious/noDocumentCookie: defensive cleanup; CookieStore not yet universal
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${window.location.pathname}`;
  }
}
