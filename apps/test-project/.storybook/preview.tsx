import type { Preview } from "@storybook/react-vite";
import { Provider } from "jotai";
import { type ReactNode, Suspense, use } from "react";

import { idbHydrationPromise } from "../app/state/hydration";
// Same Tailwind entry the app imports — guarantees stories see the design tokens.
import "../app/styles/index.css";

// React Compiler diagnostic — outlines re-rendering components while authoring stories.
// Storybook always builds in dev mode for `storybook dev`; the static build (`storybook build`) tree-shakes.
if (import.meta.env.DEV) {
  const { scan } = await import("react-scan");
  scan();
}

function HydrateThenRender({ children }: { children: ReactNode }): ReactNode {
  use(idbHydrationPromise);
  return <>{children}</>;
}

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <Suspense fallback={<div data-test="story-hydrating">…</div>}>
        <HydrateThenRender>
          <Provider>
            <Story />
          </Provider>
        </HydrateThenRender>
      </Suspense>
    ),
  ],
};

export default preview;
