import { useAtom } from "jotai";

import { defineComponent } from "~/lib/define-component";
import { SFX_REGISTRY, type SfxEventId, useSound } from "~/sound";
import { soundSettingsAtom } from "~/state/atoms";

import { SoundBoardPropsSchema } from "./schema";

// Group event IDs by their first segment (before the first dash) so the
// soundboard renders categorized rows. "ui-button-click" → "ui";
// per-character keys without a category prefix ("mara-1") → "character".
function categoryOf(id: string): string {
  const dash = id.indexOf("-");
  if (dash < 0) return "other";
  const head = id.slice(0, dash);
  const known = new Set(["ui", "foley", "combat", "cinematic", "mechanical", "ambience", "event"]);
  if (known.has(head)) return head;
  return "character"; // mara-1, oren-2, etc.
}

const CATEGORY_ORDER = [
  "ui",
  "foley",
  "combat",
  "character",
  "cinematic",
  "mechanical",
  "event",
  "ambience",
  "other",
];

// SoundBoard — dev tool for ear-testing every registered event. Renders a
// grid of buttons (one per event ID) plus a global mute toggle and master
// volume slider. Loops have a separate Stop button next to Play.
//
// Lives in `app/components/` so it benefits from the Storybook-first
// Pillar — the story IS the manual ear-test surface.
export const SoundBoard = defineComponent(SoundBoardPropsSchema, (props) => {
  const { prefix } = props;
  const sfx = useSound();
  const [settings, setSettings] = useAtom(soundSettingsAtom);

  const allIds = Object.keys(SFX_REGISTRY) as SfxEventId[];
  const ids = prefix ? allIds.filter((id) => id.startsWith(prefix)) : allIds;
  const grouped = new Map<string, SfxEventId[]>();
  for (const id of ids) {
    const cat = categoryOf(id);
    const list = grouped.get(cat) ?? [];
    list.push(id);
    grouped.set(cat, list);
  }

  const orderedCategories = CATEGORY_ORDER.filter((c) => grouped.has(c));

  return (
    <div className="flex flex-col gap-6 p-6 font-openrunde" data-test="sound-board">
      <div className="flex items-center gap-6 rounded-lg border border-light-gray bg-canvas-white p-4 shadow-subtle">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => {
              setSettings({ ...settings, enabled: e.target.checked });
            }}
            data-test="sfx-enabled-toggle"
          />
          <span className="font-bold">Sound enabled</span>
        </label>
        <label className="flex flex-1 items-center gap-2 text-sm">
          <span className="font-bold">Master volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.masterVolume}
            onChange={(e) => {
              setSettings({ ...settings, masterVolume: Number(e.target.value) });
            }}
            className="flex-1"
            data-test="sfx-volume-slider"
          />
          <span className="w-12 text-right tabular-nums">
            {Math.round(settings.masterVolume * 100)}%
          </span>
        </label>
        <button
          type="button"
          onClick={() => sfx.stopAll()}
          className="rounded-md bg-radiant-violet px-3 py-1.5 text-sm font-bold text-white shadow-subtle transition-transform duration-150 hover:scale-[1.04] active:scale-95"
          data-test="sfx-stop-all"
        >
          Stop all
        </button>
      </div>

      {orderedCategories.map((cat) => (
        <section key={cat} className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-gray">
            {cat} ({grouped.get(cat)?.length ?? 0})
          </h3>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {grouped.get(cat)?.map((id) => {
              const entry = SFX_REGISTRY[id];
              const isLoop = entry.policy === "loop";
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-md border border-light-gray bg-canvas-white px-2 py-1.5 shadow-subtle"
                >
                  <button
                    type="button"
                    onClick={() => sfx.play(id)}
                    className="flex-1 truncate text-left text-xs hover:text-radiant-violet"
                    data-test={`sfx-play-${id}`}
                    title={entry.path}
                  >
                    <span className="font-bold">{id}</span>
                    <span className="ml-1 text-muted-gray">({entry.policy})</span>
                  </button>
                  {isLoop ? (
                    <button
                      type="button"
                      onClick={() => sfx.stop(id)}
                      className="rounded bg-vivid-orange/10 px-2 py-0.5 text-xs font-bold text-vivid-orange"
                      data-test={`sfx-stop-${id}`}
                    >
                      stop
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
});
