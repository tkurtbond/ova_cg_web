// Phase 7: the Character and Attacks tabs in a real browser, headless.
// What happy-dom can't show (test/ui/sheet.test.ts drives the rest): an
// override taken on Enter and on leaving its box, once; the name's
// <select> showing its placeholder until a name is chosen; a list's
// lines chosen with the keys; and the attack dialog, opened, filled,
// and closed with OK, Cancel and Escape.

import { expect, test, type Page } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";

const title = "OVA Character Generator";

async function opened(page: Page): Promise<ReturnType<typeof watch>> {
  const w = watch(page);
  await page.goto(PAGE_URL);
  return w;
}

async function opens(page: Page, name: string): Promise<void> {
  await openFile(page, name);
  await expect(page).toHaveTitle(title + " - " + name);
}

/** health is the character's HEALTH: its number, and whether overridden. */
function health(page: Page): Promise<[number, boolean]> {
  return page.evaluate(() => {
    const h = (
      globalThis as unknown as {
        ova: { character: { health: { get(): number; overridden: boolean } } };
      }
    ).ova.character.health;
    return [h.get(), h.overridden] as [number, boolean];
  });
}

const dialog = (page: Page) => page.locator("dialog[open]");

test("an override is taken on Enter, and on leaving its box, once", async ({
  page,
}) => {
  const w = await opened(page);
  await opens(page, "Ai.yaml");
  await page.getByRole("tab", { name: "Attacks" }).click();
  const box = page.getByRole("textbox", { name: "HEALTH override" });
  await box.fill("55");
  await box.press("Enter");
  expect(await health(page)).toEqual([55, true]);
  await expect(page).toHaveTitle(title + " - Ai.yaml *");
  await box.fill("60");
  await box.press("Tab");
  expect(await health(page)).toEqual([60, true]);
  // Enter, then leaving the box: one message, not two.
  await box.fill("lots");
  await box.press("Enter");
  await expect(dialog(page)).toHaveCount(1);
  await expect(dialog(page)).toContainText("Not a number for HEALTH");
  await dialog(page).getByRole("button", { name: "OK", exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await box.focus();
  await box.press("Tab");
  await expect(dialog(page)).toHaveCount(0);
  expect((await health(page))[1]).toBe(false);
  await expect(box).toHaveValue("");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("the name's <select> shows its placeholder, and adds a line", async ({
  page,
}) => {
  const w = await opened(page);
  const name = page.getByRole("combobox", { name: "Abilities: name" });
  await expect(name).toHaveValue("(choose a name)");
  expect(await name.evaluate((s: HTMLSelectElement) => s.selectedIndex)).toBe(
    0,
  );
  const panel = page.getByRole("region", { name: "Abilities" });
  await panel.getByRole("button", { name: "Add" }).click();
  await expect(dialog(page)).toContainText("Choose a name first.");
  await dialog(page).getByRole("button", { name: "OK", exact: true }).click();
  await name.selectOption({ label: "Flight (p. 54)" });
  await panel.getByRole("spinbutton").fill("2");
  await panel.getByRole("spinbutton").press("Tab");
  await panel.getByRole("textbox").fill("on a broom");
  await panel.getByRole("button", { name: "Add" }).click();
  const list = page.getByRole("listbox", { name: "Abilities" });
  await expect(list.getByRole("option", { selected: true })).toContainText(
    "+2 Flight (on a broom)",
  );
  await expect(page.getByRole("tab", { name: "Character" })).toBeVisible();
  await expect(page).toHaveTitle(title + " *");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("a list's lines are chosen with the keys", async ({ page }) => {
  const w = await opened(page);
  await opens(page, "Ai.yaml");
  const list = page.getByRole("listbox", { name: "Abilities" });
  const name = page.getByRole("combobox", { name: "Abilities: name" });
  await list.focus();
  await list.press("Home");
  const first = await list.getByRole("option").first().textContent();
  await expect(list.getByRole("option", { selected: true })).toHaveText(first!);
  await list.press("ArrowDown");
  const second = list.getByRole("option").nth(1);
  await expect(second).toHaveAttribute("aria-selected", "true");
  // The line's name loaded into the <select>: no longer the placeholder.
  await expect(name).not.toHaveValue("(choose a name)");
  await list.press("End");
  await expect(list.getByRole("option").last()).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("the attack dialog: OK adds a row, Cancel and Escape put it back", async ({
  page,
}) => {
  const w = await opened(page);
  await opens(page, "Ai.yaml");
  await page.getByRole("tab", { name: "Attacks" }).click();
  const rows = page.locator(".attack-rows .attack-row");
  await expect(rows).toHaveCount(2);
  await page.getByRole("button", { name: "Add attack..." }).click();
  const d = dialog(page);
  await expect(d).toHaveAccessibleName("Attack");
  await expect(d.getByLabel("Name", { exact: true })).toBeFocused();
  await d.getByLabel("Name", { exact: true }).fill("Wind Lance");
  const perks = d.getByRole("region", { name: "Perks" });
  await perks
    .getByRole("combobox", { name: "Perks: name" })
    .selectOption({ label: "Accurate (p. 83)" });
  await perks.getByRole("button", { name: "Add" }).click();
  await expect(
    perks.getByRole("listbox").getByRole("option", { selected: true }),
  ).toContainText("Accurate");
  await d.getByRole("button", { name: "OK", exact: true }).click();
  await expect(d).toHaveCount(0);
  await expect(rows).toHaveCount(3);
  await expect(rows.last()).toContainText("Wind Lance");
  await expect(page).toHaveTitle(title + " - Ai.yaml *");

  // Edit, a Perk removed, then Escape: as it was.
  await page.getByRole("button", { name: "Edit Wind Lance" }).click();
  await perks.getByRole("listbox").press("Home");
  await perks.getByRole("button", { name: "Remove" }).click();
  await expect(perks.getByRole("listbox").getByRole("option")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(d).toHaveCount(0);
  await page.getByRole("button", { name: "Edit Wind Lance" }).click();
  await expect(perks.getByRole("listbox").getByRole("option")).toHaveCount(1);
  await d.getByRole("button", { name: "Cancel", exact: true }).click();

  // A new attack cancelled: no row.
  await page.getByRole("button", { name: "Add attack..." }).click();
  await d.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(rows).toHaveCount(3);
  await page.getByRole("button", { name: "Remove Wind Lance" }).click();
  await expect(rows).toHaveCount(2);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
