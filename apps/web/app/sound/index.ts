// Public surface of the SFX module.
//
// Components import `useSound` to play sounds; SFX_REGISTRY + SfxEventId
// are exposed because the dev SoundBoard iterates the full registry.
// Everything else (player singleton, attack resolver, registry helpers,
// per-instance types) is import-direct from its source file when needed —
// no point re-exporting code that has zero current consumers.

export { SFX_REGISTRY, type SfxEventId } from "./registry";
export { useSound } from "./use-sound";
