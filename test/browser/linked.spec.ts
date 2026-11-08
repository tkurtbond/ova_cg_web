// Phase 9: linked content in a real browser, headless. What happy-dom
// can't show (test/ui/linked.test.ts drives the rest): the dialog shown
// modal, and the attack dialog over it, Escape closing the top one
// first; Character > Transformed form's check, by click and by
// Alt+Shift+T, and the key doing nothing while a dialog is open; and
// the three shapes with Close in view, the Companion's sheet being
// taller than the window, and screenshots of them for the user.

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

/** openLinked picks the Ability whose line starts with name and opens its content. */
async function openLinked(
  page: Page,
  name: string,
  button: string,
): Promise<void> {
  const list = page.getByRole("listbox", { name: "Abilities" }).first();
  await list
    .getByRole("option", { name: new RegExp("^[+−-]\\d+ " + name + " ") })
    .click();
  await page.getByRole("button", { name: button, exact: true }).click();
}

const dialogs = (page: Page) => page.locator("dialog[open]");

test("the form's dialog: modal, the attack dialog over it, Escape top first", async ({
  page,
}) => {
  const w = await opened(page);
  await opens(page, "Fukiko.yaml");
  await openLinked(page, "Transformation", "Form...");
  const d = page.locator("dialog.linked-dialog[open]");
  await expect(d).toHaveAccessibleName("Transformation (p. 63)");
  await expect(d).toContainText("Transformation +4 pays for 8 (p. 63)");
  await expect(
    d.getByRole("combobox", { name: "Abilities: name" }),
  ).toBeFocused();
  await d
    .getByRole("listbox", { name: "Abilities" })
    .getByRole("option", { name: /^\+\d+ Barrier / })
    .click();
  await d.getByRole("button", { name: "Perks and Flaws..." }).click();
  await expect(dialogs(page)).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(dialogs(page)).toHaveCount(1);
  await expect(d).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialogs(page)).toHaveCount(0);
  await expect(page).toHaveTitle(title + " - Fukiko.yaml");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("Character > Transformed form: checked, by click and by key", async ({
  page,
}) => {
  const w = await opened(page);
  await opens(page, "Fukiko.yaml");
  const menu = page.getByRole("menuitem", { name: "Character" });
  const item = page.getByRole("menuitemcheckbox", {
    name: "Transformed form Alt+Shift+T",
    exact: true,
  });
  /** checked opens the menu, reads the item's check, and shuts it. */
  const checked = async (): Promise<string | null> => {
    await menu.click();
    const c = await item.getAttribute("aria-checked");
    await page.keyboard.press("Escape");
    return c;
  };
  // Its whole name: the drawn check isn't in it.
  expect(await checked()).toBe("true");
  await menu.click();
  await item.click();
  await expect(page).toHaveTitle(title + " - Fukiko.yaml *");
  expect(await checked()).toBe("false");
  await page.keyboard.press("Alt+Shift+KeyT");
  expect(await checked()).toBe("true");

  // Under a dialog the key does nothing.
  await openLinked(page, "Companion", "Companion...");
  await expect(dialogs(page)).toHaveCount(1);
  await page.keyboard.press("Alt+Shift+KeyT");
  await page.keyboard.press("Escape");
  await expect(dialogs(page)).toHaveCount(0);
  expect(await checked()).toBe("true");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("the three shapes: Close in view, and screenshots", async ({
  page,
  browserName,
}) => {
  await opened(page);
  for (const [file, name, button] of [
    ["Fukiko.yaml", "Transformation", "Form..."],
    ["Auren.yaml", "Magic, Arcane", "Spells..."],
    ["Fukiko.yaml", "Companion", "Companion..."],
  ] as const) {
    await opens(page, file);
    await openLinked(page, name, button);
    await expect(dialogs(page)).toHaveCount(1);
    const close = dialogs(page).getByRole("button", {
      name: "Close",
      exact: true,
    });
    await expect(close, button + " Close in view").toBeInViewport({
      ratio: 1,
    });
    await page.screenshot({
      path: `obj/screenshots/${browserName}-linked-${button.replace("...", "").toLowerCase()}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(dialogs(page)).toHaveCount(0);
  }
});
