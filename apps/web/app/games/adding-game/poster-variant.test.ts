import { describe, expect, test } from "bun:test";

import { derivePosterUrl, POSTER_VARIANTS, posterVariant } from "./poster-variant";

describe("posterVariant", () => {
  test("0 encounters → default poster (first time meeting the enemy)", () => {
    expect(posterVariant(0)).toBe("default");
  });

  test("1 encounter → L1 poster", () => {
    expect(posterVariant(1)).toBe("L1");
  });

  test("2 encounters → L2 poster", () => {
    expect(posterVariant(2)).toBe("L2");
  });

  test("3+ encounters cap at L2", () => {
    expect(posterVariant(3)).toBe("L2");
    expect(posterVariant(7)).toBe("L2");
    expect(posterVariant(1_000_000)).toBe("L2");
  });

  test("negative or NaN encounters degrade to default", () => {
    expect(posterVariant(-1)).toBe("default");
    expect(posterVariant(Number.NaN)).toBe("default");
  });

  test("POSTER_VARIANTS exposes the three variants in order", () => {
    expect(POSTER_VARIANTS).toEqual(["default", "L1", "L2"]);
  });
});

describe("derivePosterUrl", () => {
  const base = "/enemies/hadal-tide-minnow-echo.png";

  test("default returns the input untouched", () => {
    expect(derivePosterUrl(base, 0)).toBe(base);
  });

  test("L1 swaps .png → _L1.png", () => {
    expect(derivePosterUrl(base, 1)).toBe("/enemies/hadal-tide-minnow-echo_L1.png");
  });

  test("L2 swaps .png → _L2.png", () => {
    expect(derivePosterUrl(base, 2)).toBe("/enemies/hadal-tide-minnow-echo_L2.png");
  });

  test("3+ encounters cap on _L2.png", () => {
    expect(derivePosterUrl(base, 5)).toBe("/enemies/hadal-tide-minnow-echo_L2.png");
  });

  test("non-png url returned untouched (defensive)", () => {
    const svg = "/enemies/something.svg";
    expect(derivePosterUrl(svg, 1)).toBe(svg);
  });

  test("works against absolute URLs and project-base prefixed URLs", () => {
    const prefixed = "/dean-stack/enemies/hadal-glow-polyp-echo.png";
    expect(derivePosterUrl(prefixed, 1)).toBe("/dean-stack/enemies/hadal-glow-polyp-echo_L1.png");
  });
});
