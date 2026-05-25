import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { Provider } from "jotai";
import { type ReactNode, Suspense, use } from "react";

import { buildJsonLd, buildSeoMeta } from "~/lib/seo";
import { idbHydrationPromise } from "~/state/hydration";
import { installInkAtoms } from "~/state/ink-atoms";

// TanStack DevTools intentionally NOT mounted here — see vite.config.ts. This
// is a print-targeted app the kid uses on an iPad; any dev overlay leaks into
// `window.print()`, screen-recordings, and the LAN iPad view itself. If you
// genuinely need to debug routing here, temporarily restore from apps/web's
// __root.tsx (which keeps the full devtools wiring as the active dev surface).

// KEEP — Route + RouteComponent co-exist in the same file by TanStack
// Router's design (file-based routing wants `Route` exported from the
// route file). Splitting would require either re-exporting from a
// pure-component file or losing the discoverability that the route
// file IS the route.
// react-doctor-disable-next-line react-doctor/only-export-components
export const Route = createRootRoute({
  head: () => ({
    // Defaults for every route. Children override per-tag (title, description,
    // og:*, twitter:*) by returning their own buildSeoMeta({ path, title, ... })
    // — TanStack Router deep-merges head entries by key.
    //
    // Canonical link is intentionally NOT emitted here: link entries with the
    // same `rel` do not deduplicate, so emitting it at the root would produce
    // two <link rel="canonical"> on every leaf page. Each route owns its own
    // canonical via buildSeoLinks({ path }).
    meta: buildSeoMeta({ path: "/" }),
    links: [
      // Inline data-URI favicon — silences the browser's auto `/favicon.ico`
      // request without needing a public/ asset.
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%231f1f3f'/%3E%3C/svg%3E",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildJsonLd()),
      },
    ],
  }),
  component: RootComponent,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
});

function HydrateThenRender({ children }: { children: ReactNode }): ReactNode {
  // Pillar 3 — exactly one root <Suspense> + use(idbHydrationPromise).
  // After this resolves, every atomWithIDB reads its initial value synchronously.
  const snapshot = use(idbHydrationPromise);
  // Install ink-mode/templates/answers atoms now that hydration is loaded.
  // Idempotent — re-renders are no-ops after the first install.
  installInkAtoms(snapshot);
  return <>{children}</>;
}

function RootComponent(): ReactNode {
  return (
    // Browser/extension instrumentation (Chrome remote-debugger's
    // __gchrome_remoteframetoken, password-manager bookkeeping, etc.) routinely
    // mutates <html>'s attributes before React boots. React 19's strict
    // hydration treats those as mismatches and surfaces them as the "Invalid
    // HTML tag nesting" variant. Suppress on this element only — it doesn't
    // cascade into children, so real hydration bugs deeper in the tree still
    // throw normally.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <Provider>
          <Suspense fallback={null}>
            <HydrateThenRender>
              <Outlet />
            </HydrateThenRender>
          </Suspense>
        </Provider>
        <Scripts />
      </body>
    </html>
  );
}

// Exported so router.tsx can wire it as `defaultNotFoundComponent` —
// the router-level fallback for notFound errors thrown outside the route
// tree (prerender init, missed dev-time probes, etc). The route-level
// `notFoundComponent` above handles in-tree misses.
export function NotFound(): ReactNode {
  return (
    <main className="flex flex-col items-center gap-4 min-h-screen justify-center font-display">
      <h1 className="text-3xl">404: page not found</h1>
      <Link to="/" className="rounded-card bg-brand-500 px-4 py-2 text-white shadow-md">
        Go home
      </Link>
    </main>
  );
}

// Exported so router.tsx can wire it as `defaultErrorComponent` — the
// router-level fallback for render / loader errors not caught by a deeper
// `errorComponent`. The route-level `errorComponent` on `__root__` above
// handles in-tree throws (Pillar 3 IDB-corrupt-state recovery, Pillar 2
// Zod parse failures from atom setters, side-channel setup throws). On the
// SSR/prerender side this re-throws so `prerender.failOnError: true`
// aborts the build instead of silently baking a "Something broke" page
// into static HTML for a route that should have failed.
export function RouteError({ error, reset }: { error: Error; reset: () => void }): ReactNode {
  if (typeof window === "undefined") throw error;
  if (import.meta.env.DEV) {
    console.error("[Route error boundary caught]", error);
  }
  return (
    <main className="flex flex-col items-center gap-4 min-h-screen justify-center font-display">
      <h1 className="text-3xl">Something broke</h1>
      {import.meta.env.DEV ? (
        <pre className="text-sm text-red-700 max-w-2xl whitespace-pre-wrap">
          {error.message}
          {error.stack ? `\n\n${error.stack}` : null}
        </pre>
      ) : null}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-card bg-brand-500 px-4 py-2 text-white shadow-md"
        >
          Try again
        </button>
        <Link to="/" className="rounded-card bg-gray-200 px-4 py-2 shadow-md">
          Go home
        </Link>
      </div>
    </main>
  );
}
