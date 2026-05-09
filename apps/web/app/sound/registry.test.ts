import { describe, expect, test } from "bun:test";

import { isRegistered, SFX_REGISTRY, type SfxEventId } from "./registry";

describe("SFX_REGISTRY", () => {
  test("has at least 80 entries (matches files in apps/web/public/sfx/)", () => {
    expect(Object.keys(SFX_REGISTRY).length).toBeGreaterThanOrEqual(80);
  });

  test("every entry has a path that starts with sfx/ (no leading slash)", () => {
    for (const [id, entry] of Object.entries(SFX_REGISTRY)) {
      expect(entry.path.startsWith("sfx/"), `${id} path must start with "sfx/"`).toBe(true);
      expect(entry.path.startsWith("/"), `${id} path must NOT start with "/"`).toBe(false);
    }
  });

  test("every entry has a known policy", () => {
    const known = new Set(["restart", "polyphony", "loop"]);
    for (const [id, entry] of Object.entries(SFX_REGISTRY)) {
      expect(known.has(entry.policy), `${id} has unknown policy ${entry.policy}`).toBe(true);
    }
  });

  test("gain (when set) is in [0, 1]", () => {
    for (const [_id, entry] of Object.entries(SFX_REGISTRY)) {
      if (entry.gain === undefined) continue;
      expect(entry.gain).toBeGreaterThanOrEqual(0);
      expect(entry.gain).toBeLessThanOrEqual(1);
    }
  });

  test("paths are unique (no two events point at the same file)", () => {
    const paths = Object.values(SFX_REGISTRY).map((e) => e.path);
    const seen = new Set<string>();
    for (const p of paths) {
      expect(seen.has(p), `duplicate path ${p}`).toBe(false);
      seen.add(p);
    }
  });

  test("paths point at .mp3 files only", () => {
    for (const [id, entry] of Object.entries(SFX_REGISTRY)) {
      expect(entry.path.endsWith(".mp3"), `${id} is not an .mp3`).toBe(true);
    }
  });

  test("loop policy is only on ambience and one cinematic bed", () => {
    const loops = Object.entries(SFX_REGISTRY).filter(([, e]) => e.policy === "loop");
    for (const [id] of loops) {
      const isAmbience = id.startsWith("ambience-");
      const isDiveBed = id === "cinematic-dive-in-bed";
      expect(
        isAmbience || isDiveBed,
        `${id} has loop policy but is not ambience or the dive bed`,
      ).toBe(true);
    }
  });

  test("per-character attack keys (attack-id shape) all use polyphony", () => {
    // mara-1, oren-2, etc. — anything matching <name>-<digit>
    const pattern = /^[a-z]+-[1-9]$/;
    for (const [id, entry] of Object.entries(SFX_REGISTRY)) {
      if (pattern.test(id)) {
        expect(entry.policy, `${id} is a per-character attack but not polyphony`).toBe("polyphony");
      }
    }
  });
});

describe("isRegistered", () => {
  test("returns true for a known id", () => {
    expect(isRegistered("ui-button-click")).toBe(true);
  });

  test("returns false for an unknown id", () => {
    expect(isRegistered("never-registered-id")).toBe(false);
  });

  test("narrows the type to SfxEventId", () => {
    const id: string = "combat-slash";
    if (isRegistered(id)) {
      // Compile-time: id is now SfxEventId, indexable into the registry.
      const entry = SFX_REGISTRY[id satisfies SfxEventId];
      expect(entry.path).toContain("slash");
    }
  });
});
