import { createFileRoute } from "@tanstack/react-router";

import { HealthCard } from "~/components/health-card";
import { env } from "~/env";
import { buildSeoLinks } from "~/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({ links: buildSeoLinks({ path: "/" }) }),
  component: Home,
});

function Home() {
  return (
    <main className="flex flex-col items-center gap-4 min-h-screen justify-center font-display">
      <h1 className="text-3xl">{env.VITE_GAME_TITLE}</h1>
      <HealthCard />
    </main>
  );
}
