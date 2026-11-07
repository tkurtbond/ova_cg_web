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
