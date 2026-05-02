#!/usr/bin/env bun
// Walks dist/client/**/*.html and emits a sitemap keyed off VITE_SITE_URL.
// Runs after the cp index.html → 404.html step so 404.html exists and is
// excluded from the sitemap (it is the SPA fallback, not a discoverable page).

import { Glob } from "bun";

const DIST = "dist/client";
const LEADING_SLASH = /^\//;

function loadSiteUrl(): string {
  const raw = process.env.VITE_SITE_URL;
  if (!raw) throw new Error("VITE_SITE_URL is not set");
  if (!raw.endsWith("/")) throw new Error("VITE_SITE_URL must end with '/'");
  return raw;
}

function htmlPathToRoute(rel: string): string | null {
  if (rel === "404.html") return null;
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"/index.html".length)}/`;
  if (rel.endsWith(".html")) return `/${rel.slice(0, -".html".length)}`;
  return null;
}

async function main(): Promise<void> {
  const siteUrl = loadSiteUrl();
  const glob = new Glob("**/*.html");
  const routes = new Set<string>();
  for await (const file of glob.scan({ cwd: DIST })) {
    const route = htmlPathToRoute(file);
    if (route !== null) routes.add(route);
  }
  const sorted = [...routes].sort();
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = sorted
    .map((r) => {
      const loc = siteUrl + r.replace(LEADING_SLASH, "");
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  await Bun.write(`${DIST}/sitemap.xml`, xml);
  process.stdout.write(`sitemap: wrote ${sorted.length} URLs to ${DIST}/sitemap.xml\n`);
}

await main();
