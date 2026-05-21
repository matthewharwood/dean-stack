import { CrystalIconImage } from "~/games/adding-game/crystal-icons";
import { CRYSTAL_REGISTRY } from "~/games/adding-game/crystals";
import { defineComponent } from "~/lib/define-component";

import { CollectionBarPropsSchema } from "./schema";

// Compact pill row of acquired Echo Crystals. Lives in the Top panel so
// the kid sees their collection grow round-over-round without leaving
// the gameplay surface. Each pill renders the crystal's signature colour
// + 12px artwork and exposes `title=` for a native browser tooltip on
// hover (cheap, accessible, and avoids a custom tooltip component).
//
// Rendering null when empty keeps the Top panel layout unchanged for a
// brand-new save — the row only appears once the kid has picked at
// least one crystal.
export const CollectionBar = defineComponent(CollectionBarPropsSchema, ({ ownedCrystals }) => {
  if (ownedCrystals.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5" data-test="collection-bar">
      {ownedCrystals.map((id) => {
        const def = CRYSTAL_REGISTRY[id];
        return (
          <div
            key={id}
            title={`${def.name} — ${def.description}`}
            role="img"
            aria-label={`${def.name}: ${def.description}`}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/40"
            style={{
              background: `radial-gradient(circle, ${def.color}cc, transparent 75%)`,
            }}
            data-test={`collection-crystal-${id}`}
          >
            <CrystalIconImage id={id} size={12} />
          </div>
        );
      })}
    </div>
  );
});
