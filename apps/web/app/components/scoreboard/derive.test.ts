import { describe, expect, test } from "bun:test";

import { topScore } from "./derive";

describe("topScore", () => {
  test("returns null on empty list", () => {
    expect(topScore([])).toBeNull();
  });

  test("returns the highest scoring entry", () => {
    expect(
      topScore([
        { player: "a", value: 10 },
        { player: "b", value: 30 },
        { player: "c", value: 20 },
      ]),
    ).toEqual({ player: "b", value: 30 });
  });

  test("returns the first entry on a tie", () => {
    expect(
      topScore([
        { player: "a", value: 10 },
        { player: "b", value: 10 },
      ]),
    ).toEqual({ player: "a", value: 10 });
  });
});
