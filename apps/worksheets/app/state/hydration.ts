import { TemplateSetSchema } from "@dean-stack/handwriting-recognizer";
import { BASELINE_DIGIT_TEMPLATES } from "@dean-stack/handwriting-recognizer/baselines";
import {
  type Progress,
  ProgressSchema,
  SETTINGS_DEFAULT,
  type Settings,
  SettingsSchema,
} from "@dean-stack/schemas";

import { getDB } from "./db";
import {
  INK_MODE_SETTINGS_DEFAULT,
  type InkModeSettings,
  InkModeSettingsSchema,
  type TemplateSetRow,
  TemplateSetRowSchema,
  type WorksheetAnswers,
  WorksheetAnswersSchema,
} from "./ink-schemas";

type HydratedState = {
  progress: ReadonlyMap<string, Progress>;
  settings: Settings;
  inkMode: InkModeSettings;
  templates: TemplateSetRow;
  answers: ReadonlyMap<string, WorksheetAnswers>;
};

// First-run template seed — wraps the baseline digit templates from the
// recognizer package in the row-shaped record the IDB store expects.
const DEFAULT_TEMPLATE_SET: TemplateSetRow = TemplateSetRowSchema.parse({
  id: "templates",
  set: TemplateSetSchema.parse({
    version: 1,
    templates: BASELINE_DIGIT_TEMPLATES,
  }),
});

// Started at module-evaluation time. The root <Suspense> boundary calls
// `use(idbHydrationPromise)` once; until it resolves, the tree doesn't
// render. In a prerender / SSR-shell context (no indexedDB), resolves
// with the in-code defaults so the prerendered shell is consistent.
export const idbHydrationPromise: Promise<HydratedState> = (async () => {
  if (typeof indexedDB === "undefined") {
    return {
      progress: new Map(),
      settings: SETTINGS_DEFAULT,
      inkMode: INK_MODE_SETTINGS_DEFAULT,
      templates: DEFAULT_TEMPLATE_SET,
      answers: new Map(),
    };
  }
  const db = await getDB();
  const [rawProgress, rawSettings, rawInkMode, rawTemplates, rawAnswers] = await Promise.all([
    db.getAll("progress"),
    db.get("settings", "settings"),
    db.get("inkMode", "settings"),
    db.get("templates", "templates"),
    db.getAll("answers"),
  ]);

  const progress = new Map<string, Progress>();
  for (const raw of rawProgress) {
    const parsed = ProgressSchema.safeParse(raw);
    if (parsed.success) progress.set(parsed.data.id, parsed.data);
  }
  const settings = SettingsSchema.parse(rawSettings ?? SETTINGS_DEFAULT);
  const inkMode = InkModeSettingsSchema.parse(rawInkMode ?? INK_MODE_SETTINGS_DEFAULT);

  // First-run seed: if there's no templates row yet, write the baseline
  // set so the recognizer has something to match against immediately.
  let templates: TemplateSetRow;
  if (rawTemplates) {
    templates = TemplateSetRowSchema.parse(rawTemplates);
  } else {
    templates = DEFAULT_TEMPLATE_SET;
    // In-line keyPath: id is taken from the value, no separate key arg.
    await db.put("templates", templates);
  }

  const answers = new Map<string, WorksheetAnswers>();
  for (const raw of rawAnswers) {
    const parsed = WorksheetAnswersSchema.safeParse(raw);
    if (parsed.success) answers.set(parsed.data.id, parsed.data);
  }

  return { progress, settings, inkMode, templates, answers };
})();
