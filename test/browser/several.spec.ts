// Phase 11: several characters in a file in a real browser, headless.
// What happy-dom can't show (test/ui/several.test.ts drives the rest):
// the <select> chosen by the user, the Character menu by click,
// Remove's question as a real <dialog> with Cancel focused, and
// Alt+Shift+PgDn and PgUp from the real keyboard.

import { expect, test } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";

const title = "OVA Character Generator";

test("several characters: chosen, added, moved, removed", async ({ page }) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await openFile(page, "Acacia.yaml");
  // Acacia's notices first.
  await page
    .locator("dialog[open]")
    .getByRole("button", { name: "OK" })
    .click();
  await expect(page).toHaveTitle(title + " - Acacia.yaml (1 of 3)");
  const select = page.getByRole("combobox", { name: "Character shown" });
  const name = page.getByRole("textbox", { name: "Character Name" });

  await select.selectOption({ label: "3. High Fructo Cezar" });
  await expect(page).toHaveTitle(title + " - Acacia.yaml (3 of 3)");
  await expect(name).toHaveValue("High Fructo Cezar");

  await page.keyboard.press("Alt+Shift+PageUp");
  await expect(page).toHaveTitle(title + " - Acacia.yaml (2 of 3)");
  await expect(name).toHaveValue("Sazza and Fraz");
  await page.keyboard.press("Alt+Shift+PageDown");
  await expect(name).toHaveValue("High Fructo Cezar");

  const character = page.getByRole("menuitem", {
    name: "Character",
    exact: true,
  });
  const item = (label: string) =>
    page.getByRole("menuitem", { name: new RegExp("^" + label) });
  await character.click();
  await expect(item("Next Character")).toBeDisabled();
  await item("Add Character").click();
  await expect(page).toHaveTitle(title + " - Acacia.yaml (4 of 4) *");
  await expect(name).toHaveValue("");
  await name.fill("Imp");
  await expect(select.locator("option")).toHaveText([
    "1. Acacia",
    "2. Sazza and Fraz",
    "3. High Fructo Cezar",
    "4. Imp",
  ]);

  await character.click();
  await item("Move Up").click();
  await expect(page).toHaveTitle(title + " - Acacia.yaml (3 of 4) *");
  await expect(select).toHaveValue("3. Imp");

  await character.click();
  await item("Remove Character").click();
  const d = page.locator("dialog[open]");
  await expect(d).toContainText("Remove Imp from the file?");
  await expect(d.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(select.locator("option")).toHaveCount(4);
  await character.click();
  await item("Remove Character").click();
  await d.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(select.locator("option")).toHaveText([
    "1. Acacia",
    "2. Sazza and Fraz",
    "3. High Fructo Cezar",
  ]);
  await expect(page).toHaveTitle(title + " - Acacia.yaml (3 of 3) *");
  await expect(name).toHaveValue("High Fructo Cezar");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
