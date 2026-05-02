import { createFileRoute, Link } from "@tanstack/react-router";

import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";

export const Route = createFileRoute("/adding-game")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/adding-game",
      title: "Adding Game",
      description: "Adding Game — a dean-stack browser game for practicing addition.",
    }),
    links: buildSeoLinks({ path: "/adding-game" }),
  }),
  component: AddingGame,
});

function AddingGame() {
  return (
    <main className="flex flex-col items-center gap-6 min-h-screen justify-center font-display">
      <h1 className="text-3xl">Adding Game</h1>
      <p className="text-base text-brand-900/70">Game scaffolding — gameplay coming next.</p>
      <Link to="/" className="text-brand-700 underline">
        Back to home
      </Link>
    </main>
  );
}
