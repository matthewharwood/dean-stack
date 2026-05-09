// Public surface of the SFX module.
//
// Components import `useSound` to get a stable SoundApi; everything else
// is escape-hatch for tests, the soundboard dev tool, or anyone needing
// to bypass React (e.g. a Pixi ticker callback that wants to play a hit
// sound from outside the React tree).

export { resolveAttackSfxId } from "./play-attack";
export { _resetSfxPlayerForTests, getSfxPlayer } from "./player";
export {
  isRegistered,
  type RegistryEntry,
  SFX_REGISTRY,
  type SfxEventId,
  type SfxPolicy,
} from "./registry";
export { type SoundApi, useSound } from "./use-sound";
