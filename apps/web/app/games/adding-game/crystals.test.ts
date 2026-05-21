import { describe, expect, test } from "bun:test";

import type { CrystalId, PullTriggerRound } from "@dean-stack/schemas";
import { ALL_CRYSTAL_IDS, buildPullOptions, CRYSTAL_REGISTRY, PULL_CADENCE } from "./crystals";

// Deterministic RNG (linear congruential) so the tests don't flake on
// Math.random shuffles. Seeded per test for reproducibility.
function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe("crystals — registry integrity", () => {
  test("every CrystalId in the registry has a definition matching its id", () => {
    // Object.entries widens the key to `string`; cast back to CrystalId
    // since CRYSTAL_REGISTRY is typed as Record<CrystalId, _>, so the
    // keys are CrystalIds by construction.
    for (const [key, def] of Object.entries(CRYSTAL_REGISTRY)) {
      expect(def.id).toBe(key as CrystalId);
    }
  });

  test("there are exactly 18 crystals in the pool", () => {
    expect(ALL_CRYSTAL_IDS.length).toBe(18);
  });

  test("every crystal category appears at least twice in the pool", () => {
    const counts = new Map<string, number>();
    for (const id of ALL_CRYSTAL_IDS) {
      const cat = CRYSTAL_REGISTRY[id].category;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    for (const [, n] of counts) expect(n).toBeGreaterThanOrEqual(2);
  });
});

describe("crystals — buildPullOptions cadence", () => {
  test("returns three options with no duplicates within a pull", () => {
    for (const cadence of PULL_CADENCE) {
      const rng = seededRng(7);
      const opts = buildPullOptions(cadence.after, [], rng);
      expect(opts.length).toBe(3);
      expect(new Set(opts).size).toBe(3);
    }
  });

  test("respects the cadence slot categories when the pool isn't depleted", () => {
    // Fresh kid — every category fully unowned.
    for (const cadence of PULL_CADENCE) {
      const rng = seededRng(42);
      const opts = buildPullOptions(cadence.after, [], rng);
      for (let i = 0; i < cadence.slots.length; i++) {
        const slotCategory = cadence.slots[i];
        const optionId = opts[i];
        if (!slotCategory || !optionId) throw new Error("test setup bad");
        expect(CRYSTAL_REGISTRY[optionId].category).toBe(slotCategory);
      }
    }
  });

  test("never returns an already-owned crystal", () => {
    const owned: CrystalId[] = ["marine-snow", "bubble-burst"];
    const rng = seededRng(13);
    for (const cadence of PULL_CADENCE) {
      const opts = buildPullOptions(cadence.after, owned, rng);
      for (const id of opts) expect(owned).not.toContain(id);
    }
  });

  test("widens to any unowned crystal when the cadence slot's category is exhausted", () => {
    // Pretend the kid already owns every Tide Sigil + every Card Charm + every
    // Math Tool. The R1 cadence is [tide-sigil, card-charm, math-tool] — none
    // of those categories have unowned candidates, so the selector must widen
    // and still return three distinct ids from the remaining categories.
    const owned: CrystalId[] = ALL_CRYSTAL_IDS.filter((id) =>
      ["tide-sigil", "card-charm", "math-tool"].includes(CRYSTAL_REGISTRY[id].category),
    );
    const rng = seededRng(99);
    const after: PullTriggerRound = 1;
    const opts = buildPullOptions(after, owned, rng);
    expect(opts.length).toBe(3);
    expect(new Set(opts).size).toBe(3);
    for (const id of opts) expect(owned).not.toContain(id);
  });
});
