import config from "@dean-stack/stylelint-config";

// Tailwind v4 emits paired type-scale tokens with double hyphens
// (e.g. --text-display--line-height, --text-display--letter-spacing).
// The default kebab-case `custom-property-pattern` rejects them. Widen
// the regex to allow an optional `--<modifier>` suffix that itself is
// kebab-case. Everything else stays kebab-case as before.
export default {
  ...config,
  rules: {
    ...(config.rules ?? {}),
    "custom-property-pattern": [
      "^[a-z][a-z0-9]*(-[a-z0-9]+)*(--[a-z][a-z0-9]*(-[a-z0-9]+)*)?$",
      {
        message:
          "Custom property must be kebab-case, with an optional `--<modifier>` suffix for Tailwind v4 paired tokens.",
      },
    ],
  },
};
