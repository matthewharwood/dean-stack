import type { Score } from "@dean-stack/schemas";

export function topScore(scores: readonly Score[]): Score | null {
  if (scores.length === 0) return null;
  let best = scores[0];
  if (best === undefined) return null;
  for (let i = 1; i < scores.length; i += 1) {
    const cur = scores[i];
    if (cur && cur.value > best.value) best = cur;
  }
  return best;
}
