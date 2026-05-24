import { describe, expect, test } from "bun:test";

import { fromIndex, nextSheet, prevSheet, SHEET_TOTAL, sheetIndex } from "./sequence";

describe("sheet sequence — linear ordering across 15 stages × 3 variants", () => {
  test("total is 45", () => {
    expect(SHEET_TOTAL).toBe(45);
  });

  test("sheetIndex follows stage*3 + variant offset", () => {
    expect(sheetIndex("s1", "A")).toBe(0);
    expect(sheetIndex("s1", "B")).toBe(1);
    expect(sheetIndex("s1", "C")).toBe(2);
    expect(sheetIndex("s2", "A")).toBe(3);
    expect(sheetIndex("s15", "C")).toBe(44);
  });

  test("fromIndex is the inverse of sheetIndex", () => {
    for (let i = 0; i < SHEET_TOTAL; i++) {
      const { stageId, variant } = fromIndex(i);
      expect(sheetIndex(stageId, variant)).toBe(i);
    }
  });

  test("nextSheet advances by 1 within a stage", () => {
    expect(nextSheet("s1", "A")).toEqual({ stageId: "s1", variant: "B" });
    expect(nextSheet("s1", "B")).toEqual({ stageId: "s1", variant: "C" });
  });

  test("nextSheet rolls into the next stage's A on variant C", () => {
    expect(nextSheet("s1", "C")).toEqual({ stageId: "s2", variant: "A" });
  });

  test("nextSheet wraps from the last sheet (s15/C) back to s1/A", () => {
    expect(nextSheet("s15", "C")).toEqual({ stageId: "s1", variant: "A" });
  });

  test("prevSheet wraps from s1/A back to s15/C", () => {
    expect(prevSheet("s1", "A")).toEqual({ stageId: "s15", variant: "C" });
  });

  test("prev and next are mutual inverses everywhere", () => {
    for (let i = 0; i < SHEET_TOTAL; i++) {
      const here = fromIndex(i);
      const there = nextSheet(here.stageId, here.variant);
      const back = prevSheet(there.stageId, there.variant);
      expect(back).toEqual(here);
    }
  });

  test("unknown stageId falls back to index 0 (defensive — shouldn't happen in practice)", () => {
    expect(sheetIndex("bogus", "A")).toBe(0);
  });
});
