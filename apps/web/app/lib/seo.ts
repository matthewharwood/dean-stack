import { env } from "~/env";

export type RouteHead = {
  path: string;
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
};

const SITE = env.VITE_SITE_URL;
const ABSOLUTE_URL = /^https?:\/\//;
const LEADING_SLASHES = /^\/+/;

function absoluteUrl(pathOrUrl: string): string {
  if (ABSOLUTE_URL.test(pathOrUrl)) return pathOrUrl;
  return SITE + pathOrUrl.replace(LEADING_SLASHES, "");
}

export function canonicalUrl(path: string): string {
  return absoluteUrl(path);
}

export function buildSeoMeta(opts: RouteHead): Record<string, string>[] {
  const title = opts.title ?? env.VITE_GAME_TITLE;
  const description = opts.description ?? env.VITE_SITE_DESCRIPTION;
  const url = canonicalUrl(opts.path);
  const image = absoluteUrl(opts.image ?? env.VITE_OG_IMAGE);
  const ogType = opts.type ?? "website";

  const meta: Record<string, string>[] = [
    { charSet: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:url", content: url },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: env.VITE_GAME_TITLE },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];

  if (env.VITE_TWITTER_HANDLE) {
    meta.push({ name: "twitter:site", content: env.VITE_TWITTER_HANDLE });
    meta.push({ name: "twitter:creator", content: env.VITE_TWITTER_HANDLE });
  }
  if (env.VITE_AUTHOR_NAME) {
    meta.push({ name: "author", content: env.VITE_AUTHOR_NAME });
  }
  if (env.VITE_AUTHOR_URL) {
    meta.push({ property: "article:author", content: env.VITE_AUTHOR_URL });
  }

  return meta;
}

export function buildSeoLinks(opts: { path: string }): Record<string, string>[] {
  return [{ rel: "canonical", href: canonicalUrl(opts.path) }];
}

type JsonLdNode = Record<string, unknown>;

export function buildJsonLd(): JsonLdNode {
  const personRef = env.VITE_AUTHOR_NAME
    ? {
        "@type": "Person",
        name: env.VITE_AUTHOR_NAME,
        ...(env.VITE_AUTHOR_URL ? { url: env.VITE_AUTHOR_URL } : {}),
      }
    : null;

  const website: JsonLdNode = {
    "@type": "WebSite",
    "@id": `${SITE}#website`,
    url: SITE,
    name: env.VITE_GAME_TITLE,
    description: env.VITE_SITE_DESCRIPTION,
    ...(personRef ? { author: personRef } : {}),
  };

  const app: JsonLdNode = {
    "@type": "SoftwareApplication",
    "@id": `${SITE}#app`,
    name: env.VITE_GAME_TITLE,
    url: SITE,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    description: env.VITE_SITE_DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    ...(personRef ? { author: personRef } : {}),
  };

  return { "@context": "https://schema.org", "@graph": [website, app] };
}
