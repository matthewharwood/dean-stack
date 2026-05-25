import { describe, expect, test } from "bun:test";

import { cellState, VARIANTS_IN_ORDER } from "./state";

describe("PowerTally — cell-state derivation across the 15 × 3 grid", () => {
  test("variants ordered A, B, C (matches sequence.ts)", () => {
    expect([...VARIANTS_IN_ORDER]).toEqual(["A", "B", "C"]);
  });

  test("a cell that equals the current sheet is 'current'", () => {
    expect(cellState(5, "B", 5, "B")).toBe("current");
    expect(cellState(1, "A", 1, "A")).toBe("current");
    expect(cellState(15, "C", 15, "C")).toBe("current");
  });

  test("cells in earlier stages are always 'past'", () => {
    // At s5/A, every cell in stages 1-4 is past regardless of variant.
    for (let ordinal = 1; ordinal <= 4; ordinal++) {
      for (const v of VARIANTS_IN_ORDER) {
        expect(cellState(ordinal, v, 5, "A")).toBe("past");
      }
    }
  });

  test("earlier variants within the current stage are 'past'", () => {
    // At s5/B: s5/A is past, s5/B is current, s5/C is future.
    expect(cellState(5, "A", 5, "B")).toBe("past");
    expect(cellState(5, "B", 5, "B")).toBe("current");
    expect(cellState(5, "C", 5, "B")).toBe("future");
  });

  test("later stages are always 'future'", () => {
    // At s5/B, every cell in stages 6-15 is future.
    for (let ordinal = 6; ordinal <= 15; ordinal++) {
      for (const v of VARIANTS_IN_ORDER) {
        expect(cellState(ordinal, v, 5, "B")).toBe("future");
      }
    }
  });

  test("last sheet (s15/C) leaves every other cell as 'past'", () => {
    // Touch every off-diagonal cell.
    for (let ordinal = 1; ordinal < 15; ordinal++) {
      for (const v of VARIANTS_IN_ORDER) {
        expect(cellState(ordinal, v, 15, "C")).toBe("past");
      }
    }
    expect(cellState(15, "A", 15, "C")).toBe("past");
    expect(cellState(15, "B", 15, "C")).toBe("past");
    expect(cellState(15, "C", 15, "C")).toBe("current");
  });

  test("first sheet (s1/A) leaves every other cell as 'future'", () => {
    for (let ordinal = 1; ordinal <= 15; ordinal++) {
      for (const v of VARIANTS_IN_ORDER) {
        const expected = ordinal === 1 && v === "A" ? "current" : "future";
        expect(cellState(ordinal, v, 1, "A")).toBe(expected);
      }
    }
  });
});
