/// <reference types="vite-plugin-pwa/client" />
import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

import { applyEngineDefaults } from "./motion/engine-defaults";
import "./styles/index.css";

applyEngineDefaults();

if ("serviceWorker" in navigator) {
  void import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

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
