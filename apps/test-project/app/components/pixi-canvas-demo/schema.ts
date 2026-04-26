import * as z from "zod";

export const PixiCanvasDemoPropsSchema = z.object({
  width: z.int().min(1).default(320),
  height: z.int().min(1).default(240),
});
export type PixiCanvasDemoProps = z.infer<typeof PixiCanvasDemoPropsSchema>;
