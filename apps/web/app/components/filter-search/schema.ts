import * as z from "zod";

export const FilterSearchPropsSchema = z.object({
  items: z.array(z.string().min(1)),
});
