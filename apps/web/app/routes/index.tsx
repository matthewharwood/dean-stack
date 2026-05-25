import { createFileRoute, Link } from "@tanstack/react-router";

import { env } from "~/env";
import { buildSeoLinks } from "~/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({ links: buildSeoLinks({ path: "/" }) }),
  component: Home,
});

function Home() {
  return (
    <main className="flex flex-col items-center gap-4 min-h-screen justify-center font-openrunde">
      <h1 className="text-3xl">{env.VITE_GAME_TITLE}</h1>
      <Link
        to="/adding-game"
        className="rounded-full bg-radiant-violet px-4 py-2 text-white shadow-subtle"
      >
        Play Adding Game
      </Link>
      {/* Plain <a> (not <Link>): the worksheets app is a separate Vite build /
          deploy target, not a route in this router. The href is env-driven so
          dev (likely http://localhost:3010/) and prod (likely /worksheets/) can
          differ without code edits. */}
      <a
        href={env.VITE_WORKSHEETS_URL}
        className="rounded-full border-2 border-radiant-violet px-4 py-2 text-radiant-violet shadow-subtle"
        data-test="link-worksheets"
      >
        Print Worksheets (Take-home)
      </a>
    </main>
  );
}
