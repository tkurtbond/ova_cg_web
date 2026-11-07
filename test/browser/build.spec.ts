// Phase 0.2: the single file opens from file:// in each browser, fetches
// nothing and reports no error.

import { expect, test } from "@playwright/test";
import { PAGE_URL, watch } from "./page.ts";

test("the page opens from file://, fetching nothing", async ({ page }) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await expect(page).toHaveTitle("OVA Character Generator");
  await expect(page.locator(".title-line")).toHaveText(
    "OVA Character Generator",
  );
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
