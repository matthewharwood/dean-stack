import {
  BASELINE_DIGIT_TEMPLATES,
  TemplateSchema,
  TemplateSetSchema,
} from "@dean-stack/handwriting-recognizer";
import { atom, type WritableAtom } from "jotai";

import { atomWithIDB } from "~/lib/atom-with-idb";

import {
  CapturedAnswerSchema,
  INK_MODE_SETTINGS_DEFAULT,
  type InkModeSettings,
  InkModeSettingsSchema,
  type TemplateSetRow,
  TemplateSetRowSchema,
  type WorksheetAnswers,
  WorksheetAnswersSchema,
} from "./ink-schemas";

// Used as the templates fallback when installInkAtoms hasn't been
// called yet — relevant for Storybook stories that mount components
// outside the route tree (which is what owns the hydration suspense).
const DEFAULT_TEMPLATE_SET: TemplateSetRow = TemplateSetRowSchema.parse({
  id: "templates",
  set: TemplateSetSchema.parse({
    version: 1,
    templates: BASELINE_DIGIT_TEMPLATES,
  }),
});

// Pillar 3 — atoms are constructed AFTER hydration resolves so each one
// initializes synchronously from the preloaded snapshot. The atoms are
// declared as module-level `let` slots; the root suspense boundary calls
// `installInkAtoms(snapshot)` before any consumer mounts.
//
// Why not lazy-create at first read? Because Jotai stores atom identity
// in `Provider`'s WeakMap — if a route mounts and calls inkModeAtom()
// twice during the same render pass we'd get two different atom objects
// and lose subscriber semantics. Module-level slots keep identity stable.

let _inkModeAtom:
  | WritableAtom<
      InkModeSettings,
      [InkModeSettings | ((prev: InkModeSettings) => InkModeSettings)],
      void
    >
  | undefined;

let _templatesAtom:
  | WritableAtom<
      TemplateSetRow,
      [TemplateSetRow | ((prev: TemplateSetRow) => TemplateSetRow)],
      void
    >
  | undefined;

// One atom per worksheet (`${stageId}-${variant}`). Cached so reentering
// a route picks up the same atom instance.
const _answersAtoms = new Map<
  string,
  WritableAtom<
    WorksheetAnswers,
    [WorksheetAnswers | ((prev: WorksheetAnswers) => WorksheetAnswers)],
    void
  >
>();

// Cached snapshot of the answers map from hydration, used as the initial
// value for per-worksheet atoms created after install.
let _hydratedAnswers: ReadonlyMap<string, WorksheetAnswers> = new Map();

// Called exactly once from the root suspense, after `use(idbHydrationPromise)`
// resolves. Idempotent — calling twice is a no-op.
export function installInkAtoms(snapshot: {
  inkMode: InkModeSettings;
  templates: TemplateSetRow;
  answers: ReadonlyMap<string, WorksheetAnswers>;
}): void {
  if (_inkModeAtom !== undefined) return;
  _hydratedAnswers = snapshot.answers;

  _inkModeAtom = atomWithIDB({
    storeName: "inkMode",
    key: "settings",
    schema: InkModeSettingsSchema,
    defaultValue: INK_MODE_SETTINGS_DEFAULT,
    hydrated: snapshot.inkMode,
    // Mode toggle is a discrete user action, not a stream — write
    // immediately so a reload right after the click doesn't lose it.
    debounceMs: 0,
  });

  _templatesAtom = atomWithIDB({
    storeName: "templates",
    key: "templates",
    schema: TemplateSetRowSchema,
    defaultValue: snapshot.templates,
    hydrated: snapshot.templates,
  });
}

// Accessors. If installInkAtoms hasn't been called yet (e.g. Storybook
// stories mounting a worksheet component outside the route tree, where
// the hydration suspense lives), auto-install with safe defaults. The
// real app calls installInkAtoms from the root suspense, which wins by
// being idempotent.

function ensureInstalled(): void {
  if (_inkModeAtom !== undefined) return;
  installInkAtoms({
    inkMode: INK_MODE_SETTINGS_DEFAULT,
    templates: DEFAULT_TEMPLATE_SET,
    answers: new Map(),
  });
}

export function inkModeAtom(): NonNullable<typeof _inkModeAtom> {
  ensureInstalled();
  // After ensureInstalled, _inkModeAtom is guaranteed non-undefined.
  return _inkModeAtom as NonNullable<typeof _inkModeAtom>;
}

export function templatesAtom(): NonNullable<typeof _templatesAtom> {
  ensureInstalled();
  return _templatesAtom as NonNullable<typeof _templatesAtom>;
}

export function answersAtomForWorksheet(
  id: string,
): NonNullable<ReturnType<typeof _answersAtoms.get>> {
  ensureInstalled();
  const existing = _answersAtoms.get(id);
  if (existing) return existing;
  const parsed = WorksheetAnswersSchema.shape.id.safeParse(id);
  if (!parsed.success) {
    throw new Error(`answersAtomForWorksheet: invalid id '${id}' — expected 's{1..15}-{A|B|C}'`);
  }
  const hydrated = _hydratedAnswers.get(id);
  const defaultValue: WorksheetAnswers = { id, entries: {} };
  const created = atomWithIDB({
    storeName: "answers",
    key: id,
    schema: WorksheetAnswersSchema,
    defaultValue,
    hydrated,
    debounceMs: 150,
  });
  _answersAtoms.set(id, created);
  return created;
}

// Write-only derived atom: update a single problem's captured answer.
// Set this atom with a CapturedAnswer and it merges into the worksheet's
// entries record.
export function updateAnswerAtom(worksheetId: string) {
  const base = answersAtomForWorksheet(worksheetId);
  return atom(null, (get, set, payload: unknown) => {
    const parsed = CapturedAnswerSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("updateAnswerAtom: invalid payload", parsed.error);
      return;
    }
    const prev = get(base);
    set(base, {
      ...prev,
      entries: { ...prev.entries, [parsed.data.problemId]: parsed.data },
    });
  });
}

// Write-only: append a new user-promoted template to the active set.
// The recognizer's makeTemplate() builds the Template; this atom merges
// it into the persisted set.
export function appendUserTemplateAtom() {
  const base = templatesAtom();
  return atom(null, (get, set, payload: unknown) => {
    const parsed = TemplateSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("appendUserTemplateAtom: invalid template", parsed.error);
      return;
    }
    const prev = get(base);
    set(base, {
      ...prev,
      set: { ...prev.set, templates: [...prev.set.templates, parsed.data] },
    });
  });
}
