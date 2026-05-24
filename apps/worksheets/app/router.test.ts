import { describe, expect, test } from "bun:test";
import { getRouter } from "./router";
import { NotFound, Route as RootRoute, RouteError } from "./routes/__root";

// The Pillar-adjacent contract: every dean-stack app MUST wire both a
// route-level error/notFound boundary on __root__ AND a router-level
// fallback for things that escape it. Removing either is a Pillar-3
// regression — IDB-corrupt-state recovery, Zod parse-on-set throws, and
// side-channel setup failures all funnel through these slots.
describe("router error / notFound contract", () => {
  test("__root__ wires per-route boundaries", () => {
    expect(RootRoute.options.errorComponent).toBe(RouteError);
    expect(RootRoute.options.notFoundComponent).toBe(NotFound);
  });

  test("router.tsx wires router-level fallbacks", () => {
    const router = getRouter();
    expect(router.options.defaultErrorComponent).toBe(RouteError);
    expect(router.options.defaultNotFoundComponent).toBe(NotFound);
  });

  test("RouteError re-throws on the server so prerender.failOnError aborts the build", () => {
    // bun test runs in Node — `typeof window === "undefined"` is naturally
    // true here, so the SSR re-throw branch is exercised without mocking.
    const boom = new Error("kaboom");
    expect(() => {
      RouteError({ error: boom, reset: () => {} });
    }).toThrow("kaboom");
  });
});
