// ASK-FIRST decisions:
//   1. Level: app (real prerendered HTML + SPA hydration).
//   2. Assertion: title, description, og:*, twitter:*, canonical, JSON-LD on
//      `/` (defaults). Plus /robots.txt, /llms.txt, /sitemap.xml return 200.
//   3. Selector: page.locator('meta[name|property="..."]') for tags;
//      page.request for static files.
//   4. IDB: fresh (default fixture wipes IDB before the test). Doesn't matter
//      for the SEO contract but keeps tests independent.
//   5. Network: online.
//   6. Reduced motion: forced (default).

import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

async function metaContent(page: Page, selector: string): Promise<string> {
  const value = await page.locator(`head ${selector}`).first().getAttribute("content");
  expect(value).not.toBeNull();
  return value as string;
}

test("home (/) renders default SEO meta + JSON-LD", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/.+/);

  const description = await metaContent(page, 'meta[name="description"]');
  expect(description.length).toBeGreaterThanOrEqual(40);

  expect(await metaContent(page, 'meta[property="og:type"]')).toBe("website");
  expect(await metaContent(page, 'meta[property="og:url"]')).toMatch(/^https?:\/\//);
  expect(await metaContent(page, 'meta[property="og:image"]')).toMatch(/^https?:\/\//);
  expect(await metaContent(page, 'meta[property="og:description"]')).toBe(description);

  expect(await metaContent(page, 'meta[name="twitter:card"]')).toBe("summary_large_image");

  const canonical = await page.locator('head link[rel="canonical"]').first().getAttribute("href");
  expect(canonical).toMatch(/^https?:\/\/.+\/$/);

  const ldJson = await page
    .locator('head script[type="application/ld+json"]')
    .first()
    .textContent();
  expect(ldJson).not.toBeNull();
  const parsed = JSON.parse(ldJson as string);
  expect(parsed["@context"]).toBe("https://schema.org");
  expect(Array.isArray(parsed["@graph"])).toBe(true);
  const types = (parsed["@graph"] as { "@type": string }[]).map((n) => n["@type"]);
  expect(types).toContain("WebSite");
  expect(types).toContain("SoftwareApplication");
});

test("/robots.txt is served and references the sitemap", async ({ page }) => {
  const res = await page.request.get("/robots.txt");
  expect(res.ok()).toBe(true);
  const body = await res.text();
  expect(body).toMatch(/User-agent:\s*\*/);
  expect(body).toMatch(/Sitemap:/);
});

test("/llms.txt is served with project description", async ({ page }) => {
  const res = await page.request.get("/llms.txt");
  expect(res.ok()).toBe(true);
  const body = await res.text();
  expect(body.length).toBeGreaterThan(100);
});

test("/sitemap.xml is built and references at least one URL", async ({ page }) => {
  const res = await page.request.get("/sitemap.xml");
  expect(res.ok()).toBe(true);
  const body = await res.text();
  expect(body).toMatch(/<urlset/);
  expect(body).toMatch(/<loc>https?:\/\//);
});
