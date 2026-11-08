// What every browser test needs: the built page's URL, and a record of
// what the page asked the network for (blob: and data: URLs aside) and
// said on its console.

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

/** The port test/browser/serve.ts serves the page on. */
export const HTTP_PORT = 8713;

/**
 * The page: from file://, or, when OVA_HTTP is set, from the local
 * server playwright.config.ts starts (test/browser/serve.ts).
 */
export const PAGE_URL =
  process.env.OVA_HTTP === undefined
    ? pathToFileURL(resolve("dist/ova_cg_web.html")).href
    : `http://127.0.0.1:${HTTP_PORT}/ova_cg_web.html`;

export interface Watch {
  requests: string[];
  errors: string[];
}

/** Starts recording; call before page.goto. */
export function watch(page: Page): Watch {
  const w: Watch = { requests: [], errors: [] };
  // A blob: or data: URL is the page's own memory, not the network:
  // Chromium reports the portrait's blob: image as a request, Firefox
  // doesn't (both seen in Phase 8).
  page.on("request", (r) => {
    const u = r.url();
    if (u !== PAGE_URL && !/^(blob|data):/.test(u)) w.requests.push(u);
  });
  page.on("console", (m) => {
    if (m.type() === "error") w.errors.push(m.text());
  });
  page.on("pageerror", (e) => w.errors.push(String(e)));
  return w;
}

/** The fixtures' directory, testdata/. */
export const DATA_DIR = resolve("testdata");

/**
 * openFile opens a file through File > Open... and the file chooser it
 * opens, as a user would: the fixture testdata/NAME, or, given contents,
 * a file named name holding them.
 */
export async function openFile(
  page: Page,
  name: string,
  contents?: string,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: "File" }).click();
  await page.getByRole("menuitem", { name: /^Open\.\.\./ }).click();
  const c = await chooser;
  if (contents === undefined) await c.setFiles(resolve(DATA_DIR, name));
  else
    await c.setFiles({
      name,
      mimeType: "application/yaml",
      buffer: Buffer.from(contents),
    });
}
