import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Provider } from "jotai";
import { lazy, type ReactNode, Suspense, use } from "react";

import { env } from "~/env";
import { idbHydrationPromise } from "~/state/hydration";

// Dev-only TanStack DevTools host + Router plugin. The `import.meta.env.DEV`
// ternary is statically known at build time, so Vite tree-shakes the lazy()
// branch (and its dynamic imports) out of the production bundle.
const TanStackDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const [{ TanStackDevtools: Host }, { TanStackRouterDevtoolsPanel }] = await Promise.all([
        import("@tanstack/react-devtools"),
        import("@tanstack/react-router-devtools"),
      ]);
      return {
        default: () => (
          <Host
            config={{ position: "bottom-right" }}
            plugins={[{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> }]}
          />
        ),
      };
    })
  : null;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: env.VITE_GAME_TITLE },
    ],
    links: [
      // Inline data-URI favicon — silences the browser's auto `/favicon.ico`
      // request without needing a public/ asset.
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%231f1f3f'/%3E%3C/svg%3E",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function HydrateThenRender({ children }: { children: ReactNode }): ReactNode {
  // Pillar 3 — exactly one root <Suspense> + use(idbHydrationPromise).
  // After this resolves, every atomWithIDB reads its initial value synchronously.
  use(idbHydrationPromise);
  return <>{children}</>;
}

function RootComponent(): ReactNode {
  return (
    <html lang="en">
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
        {TanStackDevtools ? (
          <Suspense fallback={null}>
            <TanStackDevtools />
          </Suspense>
        ) : null}
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
      <h1 className="text-3xl">404 — page not found</h1>
      <a href="/" className="rounded-card bg-brand-500 px-4 py-2 text-white shadow-md">
        Go home
      </a>
    </main>
  );
}
