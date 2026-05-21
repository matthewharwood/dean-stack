import type { CrystalId } from "@dean-stack/schemas";
import type { CSSProperties, ReactNode } from "react";

export const CRYSTAL_CARD_BACK_SRC = "/img/crystals/_card-back.svg";
export const CRYSTAL_REVEAL_BURST_SRC = "/img/crystals/_reveal-burst.png";

export const CRYSTAL_ICON_SRC: Record<CrystalId, string> = {
  "bioluminescent-trail": "/img/crystals/bioluminescent-trail.svg",
  "bubble-burst": "/img/crystals/bubble-burst.svg",
  "caustic-light": "/img/crystals/caustic-light.svg",
  "marine-snow": "/img/crystals/marine-snow.svg",
  "phosphor-numerals": "/img/crystals/phosphor-numerals.svg",
  "soft-hover": "/img/crystals/soft-hover.svg",
  "edge-coral": "/img/crystals/edge-coral.svg",
  "whisper-scale": "/img/crystals/whisper-scale.svg",
  "maras-compass": "/img/crystals/maras-compass.svg",
  "orens-ledger": "/img/crystals/orens-ledger.svg",
  "sables-edge": "/img/crystals/sables-edge.svg",
  "pellas-keel": "/img/crystals/pellas-keel.svg",
  "ivos-bell": "/img/crystals/ivos-bell.svg",
  "counting-pearls": "/img/crystals/counting-pearls.svg",
  "echo-listener": "/img/crystals/echo-listener.svg",
  "gentle-tide": "/img/crystals/gentle-tide.svg",
  "lucky-strike": "/img/crystals/lucky-strike.svg",
  "tide-pool": "/img/crystals/tide-pool.svg",
};

interface CrystalIconImageProps {
  id: CrystalId;
  size: number;
  className?: string;
  style?: CSSProperties;
}

export function CrystalIconImage({ id, size, className, style }: CrystalIconImageProps): ReactNode {
  return (
    <img
      src={CRYSTAL_ICON_SRC[id]}
      alt=""
      aria-hidden
      draggable={false}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        ...style,
      }}
    />
  );
}
