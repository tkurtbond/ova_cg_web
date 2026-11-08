// Phase 10: Character > Limits... in a real browser, headless. What
// happy-dom can't show (test/ui/limits.test.ts drives the rest): Ctrl+E
// opening the dialog, modal, with the focus on Base Zero; a rule turned
// on by click turning the Character Total red; Escape as Cancel; OK in
// view; and a screenshot of it for the user.

import { expect, test } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";

const title = "OVA Character Generator";

test("Limits...: Ctrl+E, a rule turning the Total red, Escape as Cancel", async ({
  page,
  browserName,
}) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await openFile(page, "Ai.yaml");
  await expect(page).toHaveTitle(title + " - Ai.yaml");
  const total = page.locator(
    ".number-pair:has(input[aria-label='Character Total override']) .number-shown",
  );
  await expect(total).not.toHaveClass(/\bred\b/);

  await page.keyboard.press("Control+KeyE");
  const d = page.locator("dialog.limits-dialog[open]");
  await expect(d).toHaveAccessibleName("Limits");
  const baseZero = d.getByRole("checkbox", { name: /^Base Zero \(p\. 21\)/ });
  await expect(baseZero).toBeFocused();
  const range = d.getByRole("spinbutton").first();
  await expect(range).toBeDisabled();
  await baseZero.click();
  await expect(range).toBeEnabled();
  await range.fill("0");
  await range.press("Tab");
  await expect(total).toHaveClass(/\bred\b/);
  await expect(page).toHaveTitle(title + " - Ai.yaml *");
  await expect(
    d.getByRole("button", { name: "OK", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    path: `obj/screenshots/${browserName}-limits.png`,
  });

  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(total).not.toHaveClass(/\bred\b/);
  await expect(page).toHaveTitle(title + " - Ai.yaml");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
