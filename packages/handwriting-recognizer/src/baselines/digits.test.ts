import { describe, expect, test } from "bun:test";

import { recognize } from "../recognize";
import type { DigitLabel, Stroke } from "../schema";
import { BASELINE_DIGIT_STROKES, BASELINE_DIGIT_TEMPLATES } from "./digits";

describe("baseline digit templates — coverage + self-recognition", () => {
  test("every digit 0-9 has at least 1 template", () => {
    const labels = new Set(BASELINE_DIGIT_TEMPLATES.map((t) => t.label));
    for (const d of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const) {
      expect(labels.has(d)).toBe(true);
    }
  });

  test("every template ships as source: 'baseline' (not 'user')", () => {
    for (const t of BASELINE_DIGIT_TEMPLATES) {
      expect(t.source).toBe("baseline");
    }
  });

  test("every baseline variant self-recognizes from its raw strokes", () => {
    // Feed each baseline's RAW strokes (not the preprocessed template
    // points) into recognize() against the full baseline set, and assert
    // the right digit wins with high confidence. This is the basic
    // "doesn't mis-label itself" sanity check — the real test for kid
    // handwriting is solved by templates accumulating over time.
    for (const [label, variants] of Object.entries(BASELINE_DIGIT_STROKES) as readonly [
      DigitLabel,
      readonly (readonly Stroke[])[],
    ][]) {
      variants.forEach((strokes, idx) => {
        const r = recognize(strokes, BASELINE_DIGIT_TEMPLATES);
        expect({
          label,
          variantIndex: idx,
          winner: r.label,
          confident: r.confident,
        }).toEqual({
          label,
          variantIndex: idx,
          winner: label,
          confident: true,
        });
      });
    }
  });

  test("ids are unique across all baselines", () => {
    const ids = BASELINE_DIGIT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("each digit ships >= 2 variant templates (room for the kid's shape to land somewhere close)", () => {
    const countsByLabel = new Map<DigitLabel, number>();
    for (const t of BASELINE_DIGIT_TEMPLATES) {
      countsByLabel.set(t.label, (countsByLabel.get(t.label) ?? 0) + 1);
    }
    for (const [label, count] of countsByLabel) {
      expect({ label, count }).toEqual({ label, count });
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });
});
