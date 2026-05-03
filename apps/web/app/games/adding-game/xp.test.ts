import { describe, expect, test } from "bun:test";

import { applyXpGain, progressFor, xpThresholdForLevel } from "./xp";

describe("xpThresholdForLevel", () => {
  test("scales linearly with level", () => {
    expect(xpThresholdForLevel(1)).toBe(20);
    expect(xpThresholdForLevel(2)).toBe(30);
    expect(xpThresholdForLevel(3)).toBe(40);
    expect(xpThresholdForLevel(5)).toBe(60);
  });
});

describe("progressFor", () => {
  test("returns the default for an unknown pilot", () => {
    const result = progressFor({}, "unknown-id");
    expect(result).toEqual({ xp: 0, level: 1 });
  });

  test("returns the stored progress for a known pilot", () => {
    const byId = { "pilot-a": { xp: 7, level: 2 } };
    expect(progressFor(byId, "pilot-a")).toEqual({ xp: 7, level: 2 });
  });
});

describe("applyXpGain", () => {
  test("accrues XP without leveling under the threshold", () => {
    const r = applyXpGain({ xp: 0, level: 1 }, 8);
    expect(r.next).toEqual({ xp: 8, level: 1 });
    expect(r.levelsGained).toBe(0);
  });

  test("levels up exactly on threshold and resets xp", () => {
    const r = applyXpGain({ xp: 12, level: 1 }, 8);
    expect(r.next).toEqual({ xp: 0, level: 2 });
    expect(r.levelsGained).toBe(1);
  });

  test("carries overflow into the next level", () => {
    const r = applyXpGain({ xp: 18, level: 1 }, 5);
    expect(r.next).toEqual({ xp: 3, level: 2 });
    expect(r.levelsGained).toBe(1);
  });

  test("crosses multiple thresholds on a single huge gain", () => {
    // L1→L2 costs 20, L2→L3 costs 30 → 50 spent, 10 overflow, lands at L3 with 10 xp
    const r = applyXpGain({ xp: 0, level: 1 }, 60);
    expect(r.next).toEqual({ xp: 10, level: 3 });
    expect(r.levelsGained).toBe(2);
  });

  test("ignores zero or negative gains", () => {
    const r = applyXpGain({ xp: 5, level: 2 }, -3);
    expect(r.next).toEqual({ xp: 5, level: 2 });
    expect(r.levelsGained).toBe(0);
  });

  test("floors fractional gains", () => {
    const r = applyXpGain({ xp: 0, level: 1 }, 7.9);
    expect(r.next).toEqual({ xp: 7, level: 1 });
    expect(r.levelsGained).toBe(0);
  });
});
