import { engine } from "animejs";

// Apply once at app bootstrap so every animate(...) inherits these defaults.
// Direct property assignment on `engine.defaults` is the documented v4 API —
// `utils.set` is the animation API and pipes values through animejs's value
// parser, which would blow up on a non-string `defaults` object.
export function applyEngineDefaults(): void {
  engine.defaults.duration = 400;
  engine.defaults.ease = "out(2)";
  engine.pauseOnDocumentHidden = true;
}
