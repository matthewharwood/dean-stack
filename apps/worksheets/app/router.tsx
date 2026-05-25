import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { NotFound, RouteError } from "./routes/__root";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    // Router-level fallbacks for errors that escape route-level boundaries:
    // route-resolution throws, loader rejects, errors during route preload,
    // and notFound() calls fired outside the route tree. The route-level
    // `errorComponent` / `notFoundComponent` on `__root__` handle in-tree
    // throws (the common case). Both wirings are gate-asserted in
    // `router.test.ts` so a future refactor can't silently drop them.
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFound,
  });
}
