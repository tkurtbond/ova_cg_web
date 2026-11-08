// Phase 5: the page's shell in a real browser, headless: a fixture
// opened through the file chooser, the menus by mouse and keyboard, the
// keys, a dialog's Escape and focus, and screenshots for the user to
// judge the look (obj/screenshots/, never shown on the desktop).

import { expect, test, type Page } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";

const title = "OVA Character Generator";

async function opened(page: Page): Promise<ReturnType<typeof watch>> {
  const w = watch(page);
  await page.goto(PAGE_URL);
  return w;
}

test("a fixture opens through File > Open...", async ({ page }) => {
  const w = await opened(page);
  await openFile(page, "Ai.yaml");
  await expect(page).toHaveTitle(title + " - Ai.yaml");
  await expect(page.locator(".characters")).toHaveValue("1. Ai");
  await openFile(page, "two-documents.yaml");
  await expect(page).toHaveTitle(title + " - two-documents.yaml (1 of 2)");
  await page.locator(".characters").selectOption("2. Second Of Two");
  await expect(page).toHaveTitle(title + " - two-documents.yaml (2 of 2)");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("the menus, by mouse and by keyboard", async ({ page }) => {
  await opened(page);
  const file = page.getByRole("menuitem", { name: "File" });
  const fileMenu = page.getByRole("menu", { name: "File" });
  const charMenu = page.getByRole("menu", { name: "Character" });
  await expect(fileMenu).toBeHidden();
  await file.click();
  await expect(fileMenu).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /^Save As/ })).toBeEnabled();
  // Over another menu's name, that menu opens instead.
  await page.getByRole("menuitem", { name: "Character" }).hover();
  await expect(charMenu).toBeVisible();
  await expect(fileMenu).toBeHidden();
  await page.mouse.click(400, 400);
  await expect(charMenu).toBeHidden();

  // The keyboard, on a fresh page (Chromium starts Tab from where the
  // mouse last pressed): Tab reaches the bar, Down opens, Right moves on.
  await page.reload();
  await page.keyboard.press("Tab");
  await expect(file).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: /^New/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: /^Open/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: /^Save\b(?! As)/ }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: /^Save As/ })).toBeFocused();
  // Down wraps to New.
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: /^New/ })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(charMenu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(charMenu).toBeHidden();
  await expect(page.getByRole("menuitem", { name: "Character" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(charMenu).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("ArrowLeft");
  await expect(file).toBeFocused();
  await page.keyboard.press("Enter");
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("ArrowDown"); // Open...
  await page.keyboard.press("Enter");
  await chooser;
  await expect(fileMenu).toBeHidden();
});

test("the tabs", async ({ page }) => {
  await opened(page);
  const tab = (n: string) => page.getByRole("tab", { name: n });
  await expect(tab("Character")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#panel-character")).toBeVisible();
  await tab("Fluff").click();
  await expect(page.locator("#panel-fluff")).toBeVisible();
  await expect(page.locator("#panel-character")).toBeHidden();
  await page.keyboard.press("ArrowRight");
  await expect(tab("Markdown")).toBeFocused();
  await expect(page.locator("#panel-markdown")).toBeVisible();
});

test("the keys reach the page", async ({ page }) => {
  await opened(page);
  // Ctrl+O opens the chooser.
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles("testdata/Ai.yaml");
  await expect(page).toHaveTitle(title + " - Ai.yaml");
  // Alt+Shift+N is New.
  await page.keyboard.press("Alt+Shift+N");
  await expect(page).toHaveTitle(title);
  // Ctrl+S is prevented (a nameless character: Save asks for a name).
  const prevented = await page.evaluate(() => {
    const e = new KeyboardEvent("keydown", {
      key: "s",
      code: "KeyS",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(prevented).toBe(true);
});

// Every key in PLAN.md's "Keys" (Ctrl+O is above), pressed with the
// real keyboard: the page gets it and prevents the browser's default,
// greyed item or not. A listener on window runs after the page's on
// document, in the bubble phase. Headless, the browsers' own shortcuts
// (new window, next tab) never act, so whether they give a key up is
// the user's to see in a real browser.
test("every key reaches the page and is prevented", async ({ page }) => {
  await opened(page);
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    window.addEventListener("keydown", (e) => {
      if (e.key === "Control" || e.key === "Shift" || e.key === "Alt") return;
      seen.push(`${e.code} ${e.defaultPrevented}`);
    });
  });
  const pressed: [string, string][] = [
    ["Alt+Shift+N", "KeyN"],
    ["Alt+Shift+T", "KeyT"],
    ["Alt+Shift+PageDown", "PageDown"],
    ["Alt+Shift+PageUp", "PageUp"],
  ];
  for (const [key] of pressed) await page.keyboard.press(key);
  // The Saves after New: a named character, so Ctrl+S downloads; then
  // Ctrl+Shift+S asks for a name. Ctrl+E (Limits...) last, under that
  // dialog: prevented, but it does nothing.
  await page.evaluate(() => {
    (
      globalThis as unknown as { ova: { character: { name: string } } }
    ).ova.character.name = "Ai";
  });
  const saves: [string, string][] = [
    ["Control+s", "KeyS"],
    ["Control+Shift+S", "KeyS"],
    ["Control+e", "KeyE"],
  ];
  for (const [key] of saves) await page.keyboard.press(key);
  pressed.push(...saves);
  const seen = await page.evaluate(
    () => (window as unknown as { seen: string[] }).seen,
  );
  expect(seen).toEqual(pressed.map(([, code]) => `${code} true`));
  await expect(page).toHaveTitle(title + " - Ai.yaml"); // Ctrl+S saved
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await expect(page.locator("dialog[open]")).toContainText(
    "Save the characters as:",
  );
});

test("a dialog: Escape closes it, the focus goes back", async ({ page }) => {
  await opened(page);
  await openFile(page, "bad.yaml", "name: [\n");
  const d = page.locator("dialog[open]");
  await expect(d).toBeVisible();
  await expect(d.getByRole("button", { name: "OK" })).toBeFocused();
  await expect(page).toHaveTitle(title); // nothing else changed
  await page.keyboard.press("Escape");
  await expect(d).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "File" })).toBeFocused();
  // And again, with OK.
  await openFile(page, "bad.yaml", "name: [\n");
  await expect(d).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(d).toHaveCount(0);
});

test("screenshots", async ({ page, browserName }) => {
  await opened(page);
  await openFile(page, "Ai.yaml");
  for (const [w, h] of [
    [640, 800],
    [1280, 800],
    [544, 700],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.screenshot({
      path: `obj/screenshots/${browserName}-${w}x${h}.png`,
    });
  }
  await page.setViewportSize({ width: 640, height: 800 });
  await page.getByRole("menuitem", { name: "Character" }).click();
  await page.screenshot({ path: `obj/screenshots/${browserName}-menu.png` });
  await page.keyboard.press("Escape");
  await openFile(page, "bad.yaml", "name: [\n");
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.screenshot({ path: `obj/screenshots/${browserName}-tell.png` });
});
