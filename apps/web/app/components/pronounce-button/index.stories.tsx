import type { Meta, StoryObj } from "@storybook/react-vite";

import { PronounceButton } from ".";

const meta = {
  title: "Components/PronounceButton",
  component: PronounceButton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    // Speaker button uses a white-on-dark palette intended for the
    // avatar's name row — the decorator gives it a similar background so
    // contrast reads correctly in isolation.
    (Story) => (
      <div className="rounded-md bg-slate-ink px-3 py-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PronounceButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Registered id — renders the button.
export const Registered: Story = {
  args: { nameSoundId: "pronounce-mara-brasswake", label: "Mara Brasswake" },
};

// Missing id — renders nothing. Used to confirm the silent-no-op
// contract for templates that haven't shipped a pronunciation yet.
export const MissingSoundId: Story = {
  args: { label: "Unvoiced Character" },
};

// Unregistered id — also renders nothing. Defensive fallback for stale
// data after a refactor renames an entry.
export const UnregisteredSoundId: Story = {
  args: { nameSoundId: "pronounce-does-not-exist", label: "Ghost Character" },
};
