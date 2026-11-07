// Phase 6: files on the page in a real browser, headless. A download's
// bytes are what ova_cg_go saves (test/golden/), and the downloaded file
// opens again with nothing to say; Save As... asks for a name; New and
// Open... ask first with changes, and the file chooser still opens after
// that question; the notices and a file's mistakes are told in a dialog;
// a file dropped on the page opens; and closing the page with changes
// gets the browser's beforeunload question.

import { readFileSync } from "node:fs";
import { expect, test, type Download, type Page } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";

const title = "OVA Character Generator";
const golden = (name: string) =>
  readFileSync(`test/golden/${name}.yaml`, "utf8");

async function opened(page: Page): Promise<ReturnType<typeof watch>> {
  const w = watch(page);
  await page.goto(PAGE_URL);
  return w;
}

/** changed marks the characters changed, as Phase 7's fields will. */
async function changed(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = (
      globalThis as unknown as {
        ova: { modified: boolean; showTitle(): void };
      }
    ).ova;
    w.modified = true;
    w.showTitle();
  });
}

async function menu(page: Page, item: RegExp): Promise<void> {
  await page.getByRole("menuitem", { name: "File" }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

async function text(d: Download): Promise<string> {
  return readFileSync(await d.path(), "utf8");
}

const dialog = (page: Page) => page.locator("dialog[open]");

/**
 * opens opens a fixture and waits for its title: openFile returns once
 * the file is chosen, and the page reads it after, so a change marked
 * before then would be lost to the load.
 */
async function opens(page: Page, name: string, shown = ""): Promise<void> {
  await openFile(page, name);
  await expect(page).toHaveTitle(title + " - " + name + shown);
}

test("Save downloads what ova_cg_go saves, and it opens again", async ({
  page,
}) => {
  const w = await opened(page);
  await opens(page, "Ai.yaml");
  await changed(page);
  await expect(page).toHaveTitle(title + " - Ai.yaml *");
  const download = page.waitForEvent("download");
  await menu(page, /^Save\b(?! As)/);
  const d = await download;
  expect(d.suggestedFilename()).toBe("Ai.yaml");
  const saved = await text(d);
  expect(saved).toBe(golden("Ai"));
  await expect(page).toHaveTitle(title + " - Ai.yaml");

  await openFile(page, "Ai.yaml", saved);
  await expect(page).toHaveTitle(title + " - Ai.yaml");
  await expect(dialog(page)).toHaveCount(0);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("Save As... asks for a name; Ctrl+S saves as it", async ({ page }) => {
  const w = await opened(page);
  await opens(page, "two-documents.yaml", " (1 of 2)");
  await menu(page, /^Save As\.\.\./);
  const input = dialog(page).getByRole("textbox");
  await expect(input).toHaveValue("two-documents.yaml");
  await input.fill("Copy of two");
  const download = page.waitForEvent("download");
  await input.press("Enter");
  const d = await download;
  expect(d.suggestedFilename()).toBe("Copy of two.yaml");
  expect(await text(d)).toBe(golden("two-documents"));
  await expect(page).toHaveTitle(title + " - Copy of two.yaml (1 of 2)");

  await changed(page);
  const again = page.waitForEvent("download");
  await page.locator("body").press("Control+s");
  expect((await again).suggestedFilename()).toBe("Copy of two.yaml");
  await expect(page).toHaveTitle(title + " - Copy of two.yaml (1 of 2)");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("the notices, and a file's mistakes, are told", async ({ page }) => {
  const w = await opened(page);
  await openFile(page, "Group.yaml");
  await expect(dialog(page)).toContainText(
    "Numbers the file gives differently from the rules, kept as overrides:",
  );
  await expect(page).toHaveTitle(title + " - Group.yaml (1 of 8)");
  await dialog(page).getByRole("button", { name: "OK" }).click();

  await openFile(page, "bad.yaml", "name: [\n");
  await expect(dialog(page)).toContainText("bad.yaml:");
  await expect(page).toHaveTitle(title + " - Group.yaml (1 of 8)");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("New and Open... ask first; the file chooser still opens", async ({
  page,
}) => {
  const w = await opened(page);
  await opens(page, "Ai.yaml");
  await changed(page);

  await menu(page, /^Open\.\.\./);
  await expect(dialog(page)).toContainText(
    "Save the changes to Ai.yaml first?",
  );
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveTitle(title + " - Ai.yaml *");

  await menu(page, /^Open\.\.\./);
  const chooser = page.waitForEvent("filechooser");
  await dialog(page).getByRole("button", { name: "Don't save" }).click();
  await (await chooser).setFiles("testdata/two-documents.yaml");
  await expect(page).toHaveTitle(title + " - two-documents.yaml (1 of 2)");

  await changed(page);
  await menu(page, /^New/);
  const download = page.waitForEvent("download");
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("two-documents.yaml");
  await expect(page).toHaveTitle(title);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("a file dropped on the page opens", async ({ page }) => {
  const w = await opened(page);
  const drag = async (type: string, files: boolean) =>
    page.evaluate(
      ([type, files, contents]) => {
        const dt = new DataTransfer();
        if (files) {
          dt.items.add(
            new File([contents], "Ai.yaml", { type: "application/yaml" }),
          );
        } else dt.setData("text/plain", "Ai");
        const e = new DragEvent(type, {
          dataTransfer: dt,
          bubbles: true,
          cancelable: true,
        });
        document.body.dispatchEvent(e);
        return e.defaultPrevented;
      },
      [type, files, readFileSync("testdata/Ai.yaml", "utf8")] as const,
    );
  expect(await drag("dragover", false), "text: left to the browser").toBe(
    false,
  );
  expect(await drag("dragover", true), "a file: taken").toBe(true);
  expect(await drag("drop", true), "and its drop").toBe(true);
  await expect(page).toHaveTitle(title + " - Ai.yaml");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("closing with changes: the browser asks", async ({ page }) => {
  await opened(page);
  await opens(page, "Ai.yaml"); // a click: the page has been used
  await changed(page);
  const asked = page.waitForEvent("dialog");
  await page.close({ runBeforeUnload: true });
  const d = await asked;
  expect(d.type()).toBe("beforeunload");
  await d.dismiss();
  expect(page.isClosed(), "dismissed: the page stays").toBe(false);

  await page.evaluate(() => {
    (globalThis as unknown as { ova: { modified: boolean } }).ova.modified =
      false;
  });
  let dialogs = 0;
  page.on("dialog", () => dialogs++);
  const closed = page.waitForEvent("close");
  await page.close({ runBeforeUnload: true });
  await closed;
  expect(dialogs, "no changes: closed, nothing asked").toBe(0);
});
