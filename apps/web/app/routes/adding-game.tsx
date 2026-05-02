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
    <main className="grid h-screen grid-cols-[1fr_2fr_1fr] gap-2 p-2 font-display">
      <section aria-label="Left panel" className="relative rounded-md bg-neutral-200" />
      <div className="grid grid-rows-3 gap-2">
        <section aria-label="Top center panel" className="relative rounded-md bg-neutral-200" />
        <section aria-label="Middle center panel" className="relative rounded-md bg-neutral-200" />
        <section aria-label="Bottom center panel" className="relative rounded-md bg-neutral-200" />
      </div>
      <section aria-label="Right panel" className="relative rounded-md bg-neutral-200">
        <Link to="/" className="absolute bottom-2 right-2 text-sm text-brand-700 underline">
          Back to home
        </Link>
      </section>
    </main>
  );
}
