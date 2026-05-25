// Deterministic RNG so worksheet variant A/B/C are reproducible across
// machines, builds, and prints. Same seed -> same problem set, forever.
// Linear-congruential generator (Numerical Recipes constants). Sufficient
// for the variety we need across ~15 problems per worksheet; not for crypto.

const A = 1_103_515_245;
const C = 12_345;
const M = 0x7fff_ffff;

export function seededRandom(seed: number): () => number {
  let state = (seed | 0) >>> 0;
  if (state === 0) state = 1;
  return () => {
    state = (Math.imul(state, A) + C) >>> 0;
    state &= M;
    return state / M;
  };
}

// FNV-1a 32-bit. Stable, fast, no deps. Used to convert a (stageId, variant)
// pair into a numeric seed without colliding the variants together.
export function hashString(input: string): number {
  let hash = 0x811c_9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x0100_0193);
  }
  return hash >>> 0;
}

export function pickInt(rng: () => number, min: number, max: number): number {
  if (max < min) throw new Error(`pickInt: max (${max}) < min (${min})`);
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pickOne<T>(rng: () => number, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pickOne: empty array");
  const item = items[Math.floor(rng() * items.length)];
  // Guard for noUncheckedIndexedAccess — the bounds above guarantee a hit.
  if (item === undefined) throw new Error("pickOne: index out of bounds");
  return item;
}
