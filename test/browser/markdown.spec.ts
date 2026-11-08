// Phase 12: the Markdown tab in a real browser, headless. What happy-dom
// can't show (test/ui/markdown.test.ts drives the rest): Copy reaching
// the clipboard from file:// in each browser, the downloads' names and
// bytes, which are ova_cg_go's (test/golden/), the sheet monospaced,
// and a screenshot of it for the user.

import { readFileSync } from "node:fs";
import { expect, test, type Download } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";

const title = "OVA Character Generator";

const golden = (name: string) => readFileSync(`test/golden/${name}`, "utf8");

async function text(d: Download): Promise<string> {
  return readFileSync(await d.path(), "utf8");
}

test("the Markdown tab: Copy, Save Markdown..., Inline", async ({
  page,
  browserName,
}) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await openFile(page, "Ai.yaml");
  await expect(page).toHaveTitle(title + " - Ai.yaml");
  await page.getByRole("tab", { name: "Markdown" }).click();
  const sheet = page.getByLabel("Markdown sheet");
  await expect(sheet).toBeVisible();
  const ai = golden("Ai.md");
  expect(await sheet.textContent()).toBe(ai);
  expect(await sheet.evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(
    /mono/i,
  );
  await page.screenshot({
    path: `obj/screenshots/${browserName}-markdown.png`,
  });

  // Copy: Firefox takes writeText and gives it back; Chromium refuses
  // it on file:// and won't give its clipboard back, so the fallback's
  // copy event, with the sheet selected, is what shows it copied.
  await page.evaluate(() => {
    const g = window as unknown as { copied?: string };
    document.addEventListener("copy", () => {
      g.copied = String(document.getSelection());
    });
  });
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  if (browserName === "firefox") {
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(ai);
  } else {
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { copied?: string }).copied),
      )
      .toBe(ai);
  }
  await expect(page.locator(".copy-buffer")).toHaveCount(0);

  // Save Markdown...: the name suggested, the sheet downloaded.
  const save = page.getByRole("button", { name: "Save Markdown..." });
  await save.click();
  const input = page.locator("dialog[open]").getByRole("textbox");
  await expect(input).toHaveValue("Ai.md");
  let download = page.waitForEvent("download");
  await input.press("Enter");
  let d = await download;
  expect(d.suggestedFilename()).toBe("Ai.md");
  expect(await text(d)).toBe(ai);
  await expect(page).toHaveTitle(title + " - Ai.yaml");

  // Inline: the paragraph, saved as NAME-inline.md.
  await page.getByRole("checkbox", { name: "Inline" }).check();
  const paragraph = golden("Ai.inline.md");
  expect(await sheet.textContent()).toBe(paragraph);
  await save.click();
  await expect(input).toHaveValue("Ai-inline.md");
  download = page.waitForEvent("download");
  await input.press("Enter");
  d = await download;
  expect(d.suggestedFilename()).toBe("Ai-inline.md");
  expect(await text(d)).toBe(paragraph);
  await page.getByRole("checkbox", { name: "Inline" }).uncheck();
  expect(await sheet.textContent()).toBe(ai);
  await expect(page).toHaveTitle(title + " - Ai.yaml");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
