import { createFileRoute } from "@tanstack/react-router";

import { StageCard } from "~/components/stage-card";
import { env } from "~/env";
import { buildSeoLinks } from "~/lib/seo";
import { listStages } from "~/worksheet/stages";

export const Route = createFileRoute("/")({
  head: () => ({ links: buildSeoLinks({ path: "/" }) }),
  component: Home,
});

function Home() {
  const stages = listStages();
  return (
    <main className="min-h-screen bg-paper text-ink font-body">
      <header className="bg-brand-700 text-white px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <p className="font-display uppercase tracking-widest text-sm opacity-80">
            Take-home math
          </p>
          <h1 className="font-display font-bold text-4xl mt-1">{env.VITE_GAME_TITLE}</h1>
          <p className="font-body text-base mt-3 max-w-2xl opacity-90">
            Printable companion worksheets for the Halidzone math game. Each of the 15 stages has
            three reproducible variants — same difficulty, different problems — so the kid can
            practice with pen and paper after a screen session.
          </p>
          <ul className="font-body text-sm mt-4 grid grid-cols-1 sm:grid-cols-2 max-w-2xl gap-1 opacity-90">
            <li>· US Letter (8.5×11 in), 0.5 in margins</li>
            <li>· Save-as-PDF friendly</li>
            <li>· Accessible typography (Atkinson Hyperlegible)</li>
            <li>· Separate answer key per variant</li>
          </ul>
        </div>
      </header>
      <section className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="font-display font-semibold text-lg uppercase tracking-widest opacity-70 mb-4">
          Pick a stage · {stages.length} total
        </h2>
        <div
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          data-test="stage-grid"
        >
          {stages.map((stage) => (
            <StageCard key={stage.id} stage={stage} />
          ))}
        </div>
      </section>
    </main>
  );
}
