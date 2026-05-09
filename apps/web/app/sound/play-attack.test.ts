import { describe, expect, test } from "bun:test";
import type { Attack } from "@dean-stack/schemas";

import { resolveAttackSfxId } from "./play-attack";
import type { SfxEventId } from "./registry";

function attack(overrides: Partial<Attack>): Attack {
  return {
    id: "test-1",
    name: "Test Attack",
    kind: "spark",
    color: "#fff",
    glyph: "✨",
    ...overrides,
  };
}

describe("resolveAttackSfxId", () => {
  test("prefers per-character variant when registered", () => {
    // mara-1 is in the registry as the per-character LANTERN-SPARK file.
    const result = resolveAttackSfxId(attack({ id: "mara-1", kind: "spark" }));
    expect(result).toBe("mara-1");
  });

  test("falls back to combat-<kind> when per-character variant missing", () => {
    // some-future-pilot-1 is NOT in the registry; combat-slash IS.
    const result = resolveAttackSfxId(attack({ id: "future-pilot-1", kind: "slash" }));
    expect(result).toBe("combat-slash");
  });

  test("returns null when neither variant nor kind is registered", () => {
    // Hypothetical future kind that's not in the registry.
    const result = resolveAttackSfxId(
      attack({ id: "future-pilot-99", kind: "totally-new-kind" as Attack["kind"] }),
    );
    expect(result).toBeNull();
  });

  test("every existing player-attack id from player-attacks.ts resolves to a sound", () => {
    // The 30 character-specific attack ids (mara-1..mara-3, oren-1..oren-3, etc).
    const characterIds = [
      "mara-1",
      "mara-2",
      "mara-3",
      "oren-1",
      "oren-2",
      "oren-3",
      "sable-1",
      "sable-2",
      "sable-3",
      "pella-1",
      "pella-2",
      "pella-3",
      "ivo-1",
      "ivo-2",
      "ivo-3",
      "nemi-1",
      "nemi-2",
      "nemi-3",
      "luma-1",
      "luma-2",
      "luma-3",
      "thane-1",
      "thane-2",
      "thane-3",
      "aster-1",
      "aster-2",
      "aster-3",
      "bride-1",
      "bride-2",
      "bride-3",
    ];
    for (const id of characterIds) {
      const result = resolveAttackSfxId(attack({ id, kind: "spark" }));
      expect(result, `${id} should resolve to a per-character sound`).toBe(id as SfxEventId);
    }
  });

  test("every attack kind has a combat-<kind> base sound", () => {
    const kinds = [
      "slash",
      "thrust",
      "burst",
      "beam",
      "rain",
      "vortex",
      "wave",
      "shatter",
      "spark",
      "echo",
    ] as const;
    for (const kind of kinds) {
      // Use an unknown id so we trigger the kind fallback path.
      const result = resolveAttackSfxId(attack({ id: "unknown-99", kind }));
      const expected = `combat-${kind}` as SfxEventId;
      expect(result, `kind ${kind} should fall back to ${expected}`).toBe(expected);
    }
  });
});
