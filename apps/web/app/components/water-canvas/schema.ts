import * as z from "zod";

// Water canvas takes no props — it fills its parent and runs forever.
// Empty schema kept for Pillar 2 consistency (every component declares
// props as a zod object, even the prop-less ones).
export const WaterCanvasPropsSchema = z.object({});
