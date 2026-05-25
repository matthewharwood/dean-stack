import { describe, expect, test } from "bun:test";

import {
  beatDurationSeconds,
  CHANT_BPM,
  chantTotalDurationSeconds,
  currentBeatIndex,
  isOnBeat,
  TAP_WINDOW_MS,
  TOTAL_BEATS,
} from "./chant-clock";

// 90 BPM → 0.6667s per beat. Tests pin this so a future BPM change
// (which would shift the entire chant pacing) requires a deliberate
// test bump alongside the audio re-render.
const BEAT_SEC = 60 / CHANT_BPM;

describe("beatDurationSeconds", () => {
  test("default BPM matches the const", () => {
    expect(beatDurationSeconds()).toBeCloseTo(BEAT_SEC, 6);
  });

  test("alternative BPM scales inversely", () => {
    expect(beatDurationSeconds(120)).toBeCloseTo(0.5, 6);
    expect(beatDurationSeconds(60)).toBeCloseTo(1, 6);
  });
});

describe("currentBeatIndex", () => {
  test("time 0 → beat 0 (chant just starting)", () => {
    expect(currentBeatIndex(0)).toBe(0);
  });

  test("time halfway through beat 3 → beat 3", () => {
    expect(currentBeatIndex(BEAT_SEC * 3.5)).toBe(3);
  });

  test("time at exact beat 5 → beat 5", () => {
    expect(currentBeatIndex(BEAT_SEC * 5)).toBe(5);
  });

  test("time just before beat 10 → beat 9", () => {
    expect(currentBeatIndex(BEAT_SEC * 10 - 0.001)).toBe(9);
  });

  test("time at last beat (10) → beat 10", () => {
    expect(currentBeatIndex(BEAT_SEC * 10)).toBe(10);
  });

  test("time past the chant → null (post-chant idle)", () => {
    expect(currentBeatIndex(BEAT_SEC * TOTAL_BEATS)).toBeNull();
    expect(currentBeatIndex(BEAT_SEC * 20)).toBeNull();
  });

  test("negative time → null (defensive — playback hasn't started)", () => {
    expect(currentBeatIndex(-0.5)).toBeNull();
  });

  test("NaN time → null (audio.currentTime can spike NaN during seek)", () => {
    expect(currentBeatIndex(Number.NaN)).toBeNull();
  });

  test("custom BPM is honored", () => {
    // 120 BPM → 0.5s per beat. Time 1.25s = beat 2 (1.0 ≤ 1.25 < 1.5).
    expect(currentBeatIndex(1.25, 120)).toBe(2);
  });
});

describe("isOnBeat", () => {
  test("exact beat time → on beat", () => {
    expect(isOnBeat(BEAT_SEC * 3, 3)).toBe(true);
  });

  test("within tap window early → on beat", () => {
    expect(isOnBeat(BEAT_SEC * 3 - (TAP_WINDOW_MS - 10) / 1000, 3)).toBe(true);
  });

  test("within tap window late → on beat", () => {
    expect(isOnBeat(BEAT_SEC * 3 + (TAP_WINDOW_MS - 10) / 1000, 3)).toBe(true);
  });

  test("outside tap window early → off beat", () => {
    expect(isOnBeat(BEAT_SEC * 3 - (TAP_WINDOW_MS + 10) / 1000, 3)).toBe(false);
  });

  test("outside tap window late → off beat", () => {
    expect(isOnBeat(BEAT_SEC * 3 + (TAP_WINDOW_MS + 10) / 1000, 3)).toBe(false);
  });

  test("tap on a different beat than target → off beat", () => {
    expect(isOnBeat(BEAT_SEC * 3, 4)).toBe(false);
    expect(isOnBeat(BEAT_SEC * 3, 2)).toBe(false);
  });

  test("negative tap time → off beat (defensive)", () => {
    expect(isOnBeat(-0.1, 0)).toBe(false);
  });
});

describe("chantTotalDurationSeconds", () => {
  test("default → 12 beats × 0.6667 ≈ 8s tail included", () => {
    // 11 beats + 1 tail beat = 12 beats. 12 × 0.6667 ≈ 8s.
    expect(chantTotalDurationSeconds()).toBeCloseTo(BEAT_SEC * 12, 5);
  });

  test("scales with BPM and beat count", () => {
    expect(chantTotalDurationSeconds(60, 5)).toBeCloseTo(6, 5); // (5+1) × 1s
  });
});
