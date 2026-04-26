import { describe, expect, test } from "bun:test";

import { migrateProgressV1toV2 } from "./v1-to-v2";

describe("migrateProgressV1toV2", () => {
  test("preserves id and level", () => {
    const next = migrateProgressV1toV2({ id: "maze-1", level: 3 });
    expect(next.id).toBe("maze-1");
    expect(next.level).toBe(3);
  });

  test("defaults completed to false", () => {
    const next = migrateProgressV1toV2({ id: "x", level: 1 });
    expect(next.completed).toBe(false);
  });
});
