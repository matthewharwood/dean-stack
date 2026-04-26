import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { NotFound } from "./routes/__root";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    // Router-level fallback for notFound errors thrown outside the route tree
    // (prerender init, dev-time probes, etc). The route-level
    // `notFoundComponent` on `__root__` handles in-tree misses.
    defaultNotFoundComponent: NotFound,
  });
}
