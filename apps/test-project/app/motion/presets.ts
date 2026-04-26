import type { AnimationParams } from "animejs";

export const fadeInUp: AnimationParams = {
  opacity: [0, 1],
  translateY: [12, 0],
  duration: 320,
  ease: "outExpo",
};

export const popIn: AnimationParams = {
  opacity: [0, 1],
  scale: [0.92, 1],
  duration: 240,
  ease: "outBack",
};
