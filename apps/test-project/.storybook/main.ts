import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

import { sharedPlugins } from "../vite.shared.ts";

const config: StorybookConfig = {
  framework: { name: "@storybook/react-vite", options: {} },

  // Co-located stories — glob walks the components tree only (Pillar 1).
  stories: ["../app/components/**/*.stories.@(ts|tsx)"],

  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],

  async viteFinal(viteConfig) {
    return mergeConfig(viteConfig, {
      plugins: sharedPlugins(),
    });
  },
};

export default config;
