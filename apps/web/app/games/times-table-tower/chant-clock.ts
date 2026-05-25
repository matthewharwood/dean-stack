// R16 ChantClock — pure audio-time → beat-index logic for the
// "Echo the Chant" mechanic. Decoupled from the DOM so the rhythm
// rules (which step is currently lit, has the chant finished, are we
// inside the tap window for beat N) are independently testable in Bun
// without spinning up an audio context.
//
// Pedagogy: each chant has 11 beats (one per multiplier 0..10),
// played at a steady BPM. The kid taps on the beat. We compute the
// CURRENT beat index from audio.currentTime / beatDurationSeconds,
// floor it, and clamp to [0, 10]. A small "tap window" around each
// beat means a tap landing slightly early or late still counts —
// otherwise a 7-year-old can never hit the beat exactly.
//
// All inputs (currentTime, BPM, totalBeats) are injected so unit
// tests pass mocked numbers; no `new Audio()`, no `performance.now`.

// Beats per minute the chant is recorded at. 90 BPM feels brisk
// enough to sound like a song, slow enough that a 7yo can react.
// One chant beat = 60 / 90 = 0.6667 seconds.
export const CHANT_BPM = 90;

// 11 multipliers per row: 0, 1, 2, …, 10.
export const TOTAL_BEATS = 11;

// Time on either side of a beat where a tap still counts as
// "on the beat". 220ms gives a 7yo room to read the lit step
// AND tap; tighter feels punishing, looser blurs the beats.
export const TAP_WINDOW_MS = 220;

export function beatDurationSeconds(bpm: number = CHANT_BPM): number {
  return 60 / bpm;
}

// Given a playback position in seconds, return the beat index 0..10
// the kid SHOULD currently see lit. Returns `null` when playback
// hasn't yet reached beat 0 (negative or NaN time) or has passed the
// last beat (chant finished — no step lit, post-chant idle state).
export function currentBeatIndex(
  currentTimeSec: number,
  bpm: number = CHANT_BPM,
  totalBeats: number = TOTAL_BEATS,
): number | null {
  if (!Number.isFinite(currentTimeSec) || currentTimeSec < 0) return null;
  const beat = Math.floor(currentTimeSec / beatDurationSeconds(bpm));
  if (beat < 0 || beat >= totalBeats) return null;
  return beat;
}

// Did the kid tap "on the beat" for `targetBeat` given that their
// tap landed at `tapTimeSec`? True when |tap - beat| ≤ tap window.
// Useful when validating Echo-pass taps against the chanted beat.
export function isOnBeat(
  tapTimeSec: number,
  targetBeat: number,
  bpm: number = CHANT_BPM,
  windowMs: number = TAP_WINDOW_MS,
): boolean {
  if (!Number.isFinite(tapTimeSec) || tapTimeSec < 0) return false;
  if (!Number.isInteger(targetBeat) || targetBeat < 0) return false;
  const beatTime = targetBeat * beatDurationSeconds(bpm);
  return Math.abs(tapTimeSec - beatTime) * 1000 <= windowMs;
}

// Total chant duration in seconds — last-beat-time + one beat of
// tail so the audio file doesn't cut off the final product name.
// Used by the parent to know when to advance from one chant to the
// next (or kick into a post-chant celebration).
export function chantTotalDurationSeconds(
  bpm: number = CHANT_BPM,
  totalBeats: number = TOTAL_BEATS,
): number {
  return (totalBeats + 1) * beatDurationSeconds(bpm);
}
