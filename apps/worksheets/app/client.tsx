import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

import { applyEngineDefaults } from "./motion/engine-defaults";
import "./styles/index.css";

applyEngineDefaults();

// react-scan is intentionally NOT loaded here — v0.5.x patches React 19 in a
// way that crashes TanStack Router's HeadContent (useContext returns null).
// Component-level re-render diagnostics happen in Storybook (.storybook/preview.tsx)
// where there's no TanStack Router. Route-level work in the app uses the TanStack
// DevTools panel below + `react-scan` in Storybook until upstream resolves the
// React 19 / TanStack Router clash.

// PWA service-worker registration is intentionally absent — see vite.config.ts
// for the rationale (vite-plugin-pwa is parked until the closeBundle/prerender
// ordering with TanStack Start is fixed upstream).

// TanStack Start in SPA + prerender mode renders the full document via
// __root__'s <html>...</html>. Hydration replaces the entire document; there
// is no <div id="root"> in the SSR output. StartClient internally awaits
// hydrateStart() and renders the RouterProvider.
hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
);
