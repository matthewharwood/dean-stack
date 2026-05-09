import { describe, expect, test } from "bun:test";

import { encountersFor, incrementEncounter } from "./enemy-encounters";

describe("incrementEncounter", () => {
  test("missing entry → 1", () => {
    const next = incrementEncounter({}, "hadal-glass-manta-echo");
    expect(next["hadal-glass-manta-echo"]).toBe(1);
  });

  test("existing entry → +1", () => {
    const next = incrementEncounter({ "hadal-glass-manta-echo": 2 }, "hadal-glass-manta-echo");
    expect(next["hadal-glass-manta-echo"]).toBe(3);
  });

  test("does not mutate the input", () => {
    const before = { "hadal-glass-manta-echo": 2 };
    const after = incrementEncounter(before, "hadal-glass-manta-echo");
    expect(before["hadal-glass-manta-echo"]).toBe(2);
    expect(after["hadal-glass-manta-echo"]).toBe(3);
    expect(after).not.toBe(before);
  });

  test("preserves other enemies' counts", () => {
    const before = {
      "hadal-glass-manta-echo": 2,
      "hadal-kelp-censer-echo": 1,
    };
    const after = incrementEncounter(before, "hadal-glass-manta-echo");
    expect(after["hadal-kelp-censer-echo"]).toBe(1);
  });

  test("does NOT cap — true count is preserved past the variant cap", () => {
    // posterVariant clamps at L2 (count >= 2); the reducer keeps the true
    // tally so future variants or telemetry can read it later.
    const after = incrementEncounter({ x: 9 }, "x");
    expect(after.x).toBe(10);
  });
});

describe("encountersFor", () => {
  test("missing entry → 0", () => {
    expect(encountersFor({}, "hadal-glass-manta-echo")).toBe(0);
  });

  test("present entry → its count", () => {
    expect(encountersFor({ "hadal-glass-manta-echo": 4 }, "hadal-glass-manta-echo")).toBe(4);
  });

  test("null/undefined enemy id → 0", () => {
    expect(encountersFor({}, null)).toBe(0);
    expect(encountersFor({}, undefined)).toBe(0);
  });
});
