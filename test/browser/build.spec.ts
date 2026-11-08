// Phase 0.2: the single file opens in each browser, from file:// (and,
// from Phase 14.1, from http://), fetches nothing and reports no error.

import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PAGE_URL, watch } from "./page.ts";

test("the page opens, fetching nothing", async ({ page }) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await expect(page).toHaveTitle("OVA Character Generator");
  await expect(page.locator(".title-line")).toHaveText(
    "OVA Character Generator",
  );
  // Which build: package.json's version and the commit, as the title
  // line's tooltip (Phase 14.3).
  const { version } = JSON.parse(readFileSync("package.json", "utf8"));
  await expect(page.locator(".title-line")).toHaveAttribute(
    "title",
    new RegExp(
      `^ova_cg_web ${version.replace(/\./g, "\\.")}, built from [0-9a-f]{12}\\+?$`,
    ),
  );
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
