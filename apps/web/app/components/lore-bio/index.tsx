import type { ReactNode } from "react";

import { defineComponent } from "~/lib/define-component";

import { LoreBioPropsSchema } from "./schema";

const PARAGRAPH_SPLIT = /\n\s*\n/;
const HEADING_PREFIX = "## ";

type Block =
  | { kind: "heading"; text: string; id: string }
  | { kind: "para"; text: string; id: string };

// Parses a raw bio string into a stream of headings + paragraphs. Blocks are
// separated by blank lines. A block whose first line begins with `## ` is a
// section heading; the heading line may stand alone or precede inline body
// text in the same block (rare — most authors put the heading on its own
// block, then a paragraph block underneath).
//
// Each block carries a stable `id` (kind + position) so React key prop is
// content-derived, not the loop index — satisfies no-array-index-as-key.
function parseBio(bio: string): readonly Block[] {
  // Single pass: split → trim → skip-empty → push. Replaces a `.split().map().filter()`
  // chain that walked the array three times.
  const out: Block[] = [];
  for (const raw of bio.split(PARAGRAPH_SPLIT)) {
    const block = raw.trim();
    if (block.length === 0) continue;
    if (block.startsWith(HEADING_PREFIX)) {
      const lines = block.split("\n");
      const headingLine = lines[0] ?? "";
      const heading = headingLine.slice(HEADING_PREFIX.length).trim();
      out.push({ kind: "heading", text: heading, id: `h${out.length}` });
      const rest = lines.slice(1).join(" ").trim();
      if (rest.length > 0) out.push({ kind: "para", text: rest, id: `p${out.length}` });
    } else {
      out.push({ kind: "para", text: block, id: `p${out.length}` });
    }
  }
  return out;
}

// LoreBio — typography surface for the flip-back of EnemyAvatar and
// PlayerAvatar. One source of truth for the fictional voice's visual
// presentation: section headings, body serif, drop cap on the very first
// paragraph, comfortable line-height. The host avatar still owns the
// scroll container around it.
//
// Drop cap: applied only to the FIRST paragraph (not first-of-type) so
// it survives intervening headings — the kid's eye should land on a big
// initial letter exactly once per bio. Computed during the parse pass
// instead of via CSS so the selector is unambiguous when paragraphs and
// headings interleave.
export const LoreBio = defineComponent(LoreBioPropsSchema, ({ bio }) => {
  const blocks = parseBio(bio);
  let paraSeen = 0;
  const rendered: ReactNode[] = [];
  for (const block of blocks) {
    if (block.kind === "heading") {
      rendered.push(
        <h3
          key={block.id}
          className="mt-4 mb-1.5 border-b border-light-gray/80 pb-1 font-openrunde text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-gray first:mt-0"
        >
          {block.text}
        </h3>,
      );
      continue;
    }
    const isFirstPara = paraSeen === 0;
    paraSeen += 1;
    rendered.push(
      <p
        key={block.id}
        className={
          isFirstPara
            ? "mb-3 last:mb-0 first-letter:float-left first-letter:mr-1.5 first-letter:font-openrunde first-letter:text-[2.4em] first-letter:font-bold first-letter:leading-[0.9] first-letter:text-medium-gray"
            : "mb-3 last:mb-0"
        }
      >
        {block.text}
      </p>,
    );
  }

  return <div data-test="lore-bio">{rendered}</div>;
});
