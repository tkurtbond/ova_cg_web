// Phase 14.1: every fixture in testdata/ opened in a real browser,
// headless, as the user opens one (File > Open...), each of its
// characters shown in turn and each tab looked at, with no request and
// no console error. A fixture that opens with notices, or doesn't open,
// says so in a dialog, as the page should; which says what is
// test/ui's and test/files.sh's.

import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { DATA_DIR, openFile, PAGE_URL, watch } from "./page.ts";

const title = "OVA Character Generator";
const tabs = ["Character", "Attacks", "Background", "Fluff", "Markdown"];
/** The fixtures that don't open: their mistakes are told instead. */
const refused = new Set(["Broken.yaml"]);
const fixtures = readdirSync(DATA_DIR)
  .filter((f) => f.endsWith(".yaml"))
  .sort();

test("there are fixtures", () => {
  expect(fixtures.length).toBeGreaterThan(50);
});

for (const name of fixtures) {
  test(`${name}: opened, every character and tab shown`, async ({ page }) => {
    const w = watch(page);
    await page.goto(PAGE_URL);
    await openFile(page, name);
    const dialog = page.locator("dialog[open]");
    // Opened (its name in the title), or told why not, or both.
    await expect
      .poll(async () => {
        const opened = (await page.title()).startsWith(`${title} - ${name}`);
        return opened || (await dialog.count()) > 0;
      })
      .toBe(true);
    if ((await dialog.count()) > 0) {
      await expect(dialog.locator(".dialog-body")).not.toBeEmpty();
      await dialog.getByRole("button").first().click();
      await expect(dialog).toHaveCount(0);
    }
    const opened = (await page.title()).startsWith(`${title} - ${name}`);
    expect(opened).toBe(!refused.has(name));
    if (opened) {
      const shown = page.getByRole("combobox", { name: "Character shown" });
      const n = await shown.locator("option").count();
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        await shown.selectOption({ index: i });
        if (n > 1) {
          await expect(page).toHaveTitle(
            `${title} - ${name} (${i + 1} of ${n})`,
          );
        }
        for (const t of tabs) {
          await page.getByRole("tab", { name: t, exact: true }).click();
          await expect(page.getByRole("tabpanel")).toBeVisible();
        }
        await page.getByRole("tab", { name: "Character", exact: true }).click();
      }
      await expect(page).not.toHaveTitle(/\*$/);
    }
    expect(w.requests).toEqual([]);
    expect(w.errors).toEqual([]);
  });
}
