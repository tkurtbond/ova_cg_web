// What every browser test needs: the built page's file:// URL, and a
// record of what the page asked the network for and said on its console.

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

export const PAGE_URL = pathToFileURL(resolve("dist/ova_cg_web.html")).href;

export interface Watch {
  requests: string[];
  errors: string[];
}

/** Starts recording; call before page.goto. */
export function watch(page: Page): Watch {
  const w: Watch = { requests: [], errors: [] };
  page.on("request", (r) => {
    if (r.url() !== PAGE_URL) w.requests.push(r.url());
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
