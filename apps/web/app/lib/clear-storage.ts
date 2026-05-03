// Wipe every browser-side storage surface this app touches. Called by the
// dev menu's "Clear state" affordance to recover from stale-schema bugs:
// e.g. a persisted IDB row from before a schema field was added still
// satisfies the parser via `.default()`, so the gameStart effect never
// re-deals because `round` already exists. Nuke everything and reload.
//
// Order is intentional: SW unregister + cache flush first so the next
// page-load fetch can't be served stale assets; then storage; then cookies.
// IDB deletion is best-effort — `onblocked` resolves anyway because we're
// about to reload and the browser will close the connection.
export async function clearAllStorage(): Promise<void> {
  if (typeof window === "undefined") return;

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
  // future migration leaves a stray DB behind.
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
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            // `onblocked` fires when another tab still has the DB open. We're
            // about to reload anyway — resolve and let the reload close it.
            req.onblocked = () => resolve();
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
    const eq = cookie.indexOf("=");
    const name = (eq > -1 ? cookie.slice(0, eq) : cookie).trim();
    if (!name) continue;
    // biome-ignore lint/suspicious/noDocumentCookie: defensive cleanup; CookieStore not yet universal
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    // biome-ignore lint/suspicious/noDocumentCookie: defensive cleanup; CookieStore not yet universal
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${window.location.pathname}`;
  }
}
