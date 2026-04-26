import { createFileRoute } from "@tanstack/react-router";

import { HealthCard } from "~/components/health-card";
import { env } from "~/env";

export const Route = createFileRoute("/")({
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
