import { createFileRoute, notFound } from "@tanstack/react-router";
import * as z from "zod";

import { AnswerKeyPage } from "~/components/answer-key-page";
import { PrintControls } from "~/components/print-controls";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { RouteTransition } from "~/motion/route-transition";
import { deriveAnswerKey, generateWorksheet } from "~/worksheet/generate";
import { StageIdSchema, VariantSchema } from "~/worksheet/schema";
import { nextSheet, prevSheet, SHEET_TOTAL, sheetIndex } from "~/worksheet/sequence";
import { findStage } from "~/worksheet/stages";

const ParamsSchema = z.object({
  stageId: StageIdSchema,
  variant: VariantSchema,
});

export const Route = createFileRoute("/answer/$stageId/$variant")({
  params: {
    parse: (raw) => {
      const parsed = ParamsSchema.safeParse(raw);
      if (!parsed.success) throw notFound();
      if (!findStage(parsed.data.stageId)) throw notFound();
      return parsed.data;
    },
  },
  head: ({ params }) => {
    const path = `/answer/${params.stageId}/${params.variant}`;
    const stage = findStage(params.stageId);
    const title = stage
      ? `Answer Key · ${stage.title} · Variant ${params.variant}`
      : `Answer Key · ${params.stageId}${params.variant}`;
    return {
      meta: buildSeoMeta({
        path,
        title,
        description: "Answer key for the printable Halid worksheet.",
      }),
      links: buildSeoLinks({ path }),
    };
  },
  component: AnswerKeyRoute,
});

// KEEP — TanStack Router file-based routing wants `Route` exported
// from the route file; the route component is co-located by design.
// react-doctor-disable-next-line react-doctor/only-export-components
function AnswerKeyRoute() {
  const { stageId, variant } = Route.useParams();
  const worksheet = generateWorksheet(stageId, variant);
  const answerKey = deriveAnswerKey(worksheet);
  const stage = findStage(stageId);
  const position = sheetIndex(stageId, variant) + 1;
  const prev = prevSheet(stageId, variant);
  const next = nextSheet(stageId, variant);
  return (
    <>
      <PrintControls
        backHref={`/stage/${stageId}/${variant}`}
        pagination={{
          // Pagination cycles answer keys for the parent grading-in-a-row flow.
          prevHref: `/answer/${prev.stageId}/${prev.variant}`,
          nextHref: `/answer/${next.stageId}/${next.variant}`,
          label: `Stage ${stage?.ordinal ?? "?"} · ${variant} · ${position} / ${SHEET_TOTAL}`,
        }}
      />
      <RouteTransition routeKey={`answer-${stageId}-${variant}`}>
        <AnswerKeyPage answerKey={answerKey} />
      </RouteTransition>
    </>
  );
}
