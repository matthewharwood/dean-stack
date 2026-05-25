import { createFileRoute, notFound } from "@tanstack/react-router";
import * as z from "zod";

import { PrintControls } from "~/components/print-controls";
import { WorksheetPage } from "~/components/worksheet-page";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { RouteTransition } from "~/motion/route-transition";
import { generateWorksheet } from "~/worksheet/generate";
import { StageIdSchema, VariantSchema } from "~/worksheet/schema";
import { nextSheet, prevSheet, SHEET_TOTAL, sheetIndex } from "~/worksheet/sequence";
import { findStage } from "~/worksheet/stages";

const ParamsSchema = z.object({
  stageId: StageIdSchema,
  variant: VariantSchema,
});

export const Route = createFileRoute("/stage/$stageId/$variant")({
  params: {
    parse: (raw) => {
      const parsed = ParamsSchema.safeParse(raw);
      if (!parsed.success) throw notFound();
      if (!findStage(parsed.data.stageId)) throw notFound();
      return parsed.data;
    },
  },
  head: ({ params }) => {
    const path = `/stage/${params.stageId}/${params.variant}`;
    const stage = findStage(params.stageId);
    const title = stage
      ? `${stage.title} · Variant ${params.variant}`
      : `Worksheet ${params.stageId}${params.variant}`;
    return {
      meta: buildSeoMeta({
        path,
        title,
        description: stage?.introCopy ?? "A printable Halid worksheet.",
      }),
      links: buildSeoLinks({ path }),
    };
  },
  component: WorksheetRoute,
});

// KEEP — TanStack Router file-based routing wants `Route` exported
// from the route file; the route component is co-located by design.
// react-doctor-disable-next-line react-doctor/only-export-components
function WorksheetRoute() {
  const { stageId, variant } = Route.useParams();
  // generateWorksheet is pure + deterministic; safe to call in render. The
  // result is stable across renders for the same (stageId, variant), so the
  // React Compiler will memoize it without manual help.
  const worksheet = generateWorksheet(stageId, variant);
  const stage = findStage(stageId);
  const position = sheetIndex(stageId, variant) + 1;
  const prev = prevSheet(stageId, variant);
  const next = nextSheet(stageId, variant);
  return (
    <>
      <PrintControls
        answerHref={`/answer/${stageId}/${variant}`}
        backHref="/"
        pagination={{
          prevHref: `/stage/${prev.stageId}/${prev.variant}`,
          nextHref: `/stage/${next.stageId}/${next.variant}`,
          label: `Stage ${stage?.ordinal ?? "?"} · ${variant} · ${position} / ${SHEET_TOTAL}`,
        }}
      />
      <RouteTransition routeKey={`stage-${stageId}-${variant}`}>
        <WorksheetPage worksheet={worksheet} />
      </RouteTransition>
    </>
  );
}
