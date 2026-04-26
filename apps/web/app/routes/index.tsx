import { createFileRoute, Link } from "@tanstack/react-router";

import { env } from "~/env";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="flex flex-col items-center gap-4 min-h-screen justify-center font-display">
      <h1 className="text-3xl">{env.VITE_GAME_TITLE}</h1>
      <Link
        to="/games/maze/$level"
        params={{ level: 1 }}
        className="rounded-card bg-brand-500 px-4 py-2 text-white shadow-md"
      >
        Play maze, level 1
      </Link>
    </main>
  );
}
