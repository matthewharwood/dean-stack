import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import * as z from "zod";

import { LevelCard } from "~/components/level-card";
import { getProgressAtom } from "~/state/atoms";

const ParamsSchema = z.object({
  level: z.coerce.number().int().min(1).max(99),
});

export const Route = createFileRoute("/games/maze/$level")({
  params: { parse: (raw) => ParamsSchema.parse(raw) },
  component: MazeLevel,
});

function MazeLevel() {
  const { level } = Route.useParams();
  const id = `maze-${level}`;
  const [progress, setProgress] = useAtom(getProgressAtom(id));
  return (
    <main className="flex items-center justify-center min-h-screen">
      <LevelCard
        level={level}
        completed={progress.completed}
        onComplete={() => setProgress({ id, level, completed: true })}
      />
    </main>
  );
}
