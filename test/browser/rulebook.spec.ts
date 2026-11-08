// Phase 13: the rulebook in a real browser, headless, from file://, with
// a PDF made for the test (test/browser/pdf.ts), never the rulebook.
// What happy-dom can't show (test/ui/rulebook.test.ts drives the rest):
// Choose PDF...'s file chooser, the tab ? opens and the page its viewer
// shows, and a second ? reusing that tab at its own page.
//
// The browsers' PDF viewers: Playwright's Firefox turns pdf.js off and
// its default Chromium, the headless shell, has none, so this project's
// Chromium is the full build (channel "chromium") and its Firefox has
// pdfjs.disabled false (playwright.config.ts). Firefox's pdf.js says
// which page it shows (PDFViewerApplication.page), Chromium's viewer in
// its "Page number" field, in a chrome-extension: frame Playwright
// reaches (both seen in Phase 13).

import { expect, test, type Page } from "@playwright/test";
import { PAGE_URL, watch } from "./page.ts";
import { testPdf } from "./pdf.ts";

const pdf = {
  name: "OVA.pdf",
  mimeType: "application/pdf",
  buffer: testPdf(60),
};

function dialog(page: Page) {
  return page.locator("dialog[open]");
}

/** shown is the page Firefox's pdf.js shows, once it has the PDF. */
async function shown(tab: Page): Promise<number | undefined> {
  return tab.evaluate(() => {
    const app = (
      window as unknown as {
        PDFViewerApplication?: { page: number; pagesCount: number };
      }
    ).PDFViewerApplication;
    return app !== undefined && app.pagesCount > 0 ? app.page : undefined;
  });
}

/** pages is how many pages the PDF Firefox's pdf.js shows has. */
async function pages(tab: Page): Promise<number | undefined> {
  return tab.evaluate(
    () =>
      (
        window as unknown as {
          PDFViewerApplication?: { pagesCount: number };
        }
      ).PDFViewerApplication?.pagesCount,
  );
}

/**
 * viewerPage is the page Chromium's PDF viewer shows: the value of its
 * "Page number" field, in the viewer's chrome-extension: frame.
 */
async function viewerPage(tab: Page): Promise<number | undefined> {
  const f = tab.frames().find((f) => f.url().startsWith("chrome-extension:"));
  if (f === undefined) return undefined;
  const field = f.getByLabel("Page number");
  if ((await field.count()) === 0) return undefined;
  return Number(await field.inputValue());
}

/** at checks that tab shows the PDF's page n. */
async function at(tab: Page, n: number, browserName: string): Promise<void> {
  await expect(tab).toHaveURL(new RegExp(`^blob:.*#page=${n}$`));
  const read = browserName === "firefox" ? shown : viewerPage;
  await expect.poll(() => read(tab)).toBe(n);
}

test("the rulebook: asked for, chosen, opened at the page; ? reuses its tab", async ({
  page,
  context,
  browserName,
}) => {
  const w = watch(page);
  await page.goto(PAGE_URL);

  // ? with none chosen: asked, then the chooser, then the tab.
  const name = page.getByRole("combobox", { name: "Abilities: name" });
  await name.selectOption({ label: "Flight (p. 54)" });
  const help = page
    .getByRole("region", { name: "Abilities" })
    .getByRole("button", { name: "The rulebook at this name's page" });
  await help.click();
  await expect(dialog(page)).toContainText("hasn't been chosen");
  const chooser = page.waitForEvent("filechooser");
  await dialog(page).getByRole("button", { name: "Choose PDF..." }).click();
  const c = await chooser;
  expect(c.isMultiple()).toBe(false);
  let popup = page.waitForEvent("popup");
  await c.setFiles(pdf);
  const tab = await popup;
  await at(tab, 56, browserName);
  await tab.screenshot({
    path: `obj/screenshots/${browserName}-rulebook-56.png`,
  });
  expect(context.pages().length).toBe(2);

  // Rulebook > Open: page 1, the PDF's 3, in the same tab, not asked.
  await page.bringToFront();
  await page.getByRole("menuitem", { name: "Rulebook" }).click();
  await page.getByRole("menuitem", { name: "Open", exact: true }).click();
  await at(tab, 3, browserName);
  await tab.screenshot({
    path: `obj/screenshots/${browserName}-rulebook-3.png`,
  });
  expect(context.pages().length).toBe(2);
  await expect(dialog(page)).toHaveCount(0);

  // Choose PDF...: another PDF used from then on.
  await page.bringToFront();
  const chooser2 = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: "Rulebook" }).click();
  await page.getByRole("menuitem", { name: "Choose PDF..." }).click();
  await (
    await chooser2
  ).setFiles({ ...pdf, name: "Other.pdf", buffer: testPdf(70) });
  await expect(dialog(page)).toHaveCount(0);
  expect(context.pages().length).toBe(2);
  await name.selectOption({ label: "Attack (p. 50)" });
  await help.click();
  await at(tab, 52, browserName);
  if (browserName === "firefox") {
    expect(await pages(tab)).toBe(70); // the PDF chosen second
  }
  expect(context.pages().length).toBe(2);

  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("the rulebook: the question cancelled opens nothing", async ({
  page,
  context,
}) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await page.getByRole("menuitem", { name: "Rulebook" }).click();
  await page.getByRole("menuitem", { name: "Open", exact: true }).click();
  await expect(dialog(page)).toContainText("hasn't been chosen");
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(context.pages().length).toBe(1);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
