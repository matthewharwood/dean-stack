import { Sprite, Texture } from "pixi.js";

// Shared texture utilities for the attack-fx kinds.
//
// Lives in its own module (NOT in `runtime.ts`) so the kinds files
// can import these helpers WITHOUT pulling in the runtime — avoids a
// circular dependency: `runtime.ts` imports every `runX` from each
// kind file, and each kind file used to import `tintedSoftCircle`
// back from `runtime.ts`. fallow's `circular-dependencies` check
// flagged 7 of those cycles. Extracting the shared leaf to this
// module breaks every one.
//
// Pixi is browser-only; the SSR/prerender path returns `Texture.EMPTY`
// so the kinds still type-check and render a no-op outside the browser.

let softCircleTexCache: Texture | null = null;

// Re-used soft-circle texture for every kind that wants a glow particle.
// Generated once at module load (well, on first request) and shared.
function softCircleTexture(): Texture {
  if (softCircleTexCache) return softCircleTexCache;
  if (typeof document === "undefined") return Texture.EMPTY;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.EMPTY;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.6)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  softCircleTexCache = Texture.from(canvas);
  return softCircleTexCache;
}

// Convenience wrapper for kinds that want a tinted soft-circle sprite.
export function tintedSoftCircle(color: string): Sprite {
  const sprite = new Sprite(softCircleTexture());
  sprite.anchor.set(0.5);
  sprite.tint = color;
  return sprite;
}

// Drop the cached texture so the next `tintedSoftCircle` rebuilds it.
// Called from `runtime.detach()` when the AttackFxLayer unmounts —
// keeps cache lifetime aligned with the Pixi app's lifetime.
//
// Why `destroy(true)` BEFORE nulling: `runtime.detach()` calls
// `app.destroy(true, { children: true, texture: false })` — note
// `texture: false`, which intentionally tells Pixi to leave its own
// textures alone (Pixi can't know we're caching this one separately).
// That means our cached `softCircleTexCache` GPU resource (VRAM-backed
// canvas → Texture) is NOT freed by the app teardown. Without an explicit
// `.destroy(true)` here, every attach/detach cycle leaks one canvas-
// backed texture. Caught by CodeRabbit on PR #3.
export function resetSoftCircleCache(): void {
  softCircleTexCache?.destroy(true);
  softCircleTexCache = null;
}
