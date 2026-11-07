// Phase 8: the Background and Fluff tabs in a real browser, headless.
// What happy-dom can't show (test/ui/background.test.ts drives the
// rest): an image picked and shown, from a blob: URL the page's
// Content-Security-Policy allows; a file the browser can't show as one,
// said so; the prose sections sharing the tab's height; and the fields
// typed in as a user types.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";

const title = "OVA Character Generator";

/** A PNG, 1 by 1 pixel. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="60">' +
    '<rect width="40" height="60" fill="teal"/></svg>',
);

async function opened(page: Page): Promise<ReturnType<typeof watch>> {
  const w = watch(page);
  await page.goto(PAGE_URL);
  return w;
}

/** pick clicks button and gives its chooser a file named name holding data. */
async function pick(
  page: Page,
  button: Locator,
  name: string,
  mimeType: string,
  data: Buffer,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await button.click();
  await (await chooser).setFiles({ name, mimeType, buffer: data });
}

/** shown says whether the portrait's image is loaded and shown. */
function shown(img: Locator): Promise<boolean> {
  return img.evaluate(
    (i: HTMLImageElement) =>
      !i.hidden && i.complete && i.naturalWidth > 0 && i.offsetWidth > 0,
  );
}

test("the portrait: an image chosen is shown, one that isn't an image said so", async ({
  page,
}) => {
  const w = await opened(page);
  await page.getByRole("tab", { name: "Fluff" }).click();
  const fluff = page.getByRole("tabpanel", { name: "Fluff" });
  const img = fluff.getByRole("img", { name: "The portrait" });
  const path = fluff.locator(".portrait-path");
  await expect(fluff).toContainText("No portrait.");
  await expect(fluff.getByRole("button", { name: "Show..." })).toBeDisabled();

  await pick(
    page,
    fluff.getByRole("button", { name: "Choose..." }),
    "face.png",
    "image/png",
    PNG,
  );
  await expect(path).toHaveText("face.png");
  await expect.poll(() => shown(img)).toBe(true);
  await expect(page).toHaveTitle(title + " *");

  await pick(
    page,
    fluff.getByRole("button", { name: "Choose..." }),
    "face.svg",
    "image/svg+xml",
    SVG,
  );
  await expect(path).toHaveText("face.svg");
  await expect.poll(() => shown(img)).toBe(true);
  expect(
    await img.evaluate((i: HTMLImageElement) => [
      i.naturalWidth,
      i.naturalHeight,
    ]),
  ).toEqual([40, 60]);
  // Contained in the 160 by 200 box.
  const box = await img.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(160);
  expect(box!.height).toBeLessThanOrEqual(200);

  await pick(
    page,
    fluff.getByRole("button", { name: "Choose..." }),
    "notes.png",
    "image/png",
    Buffer.from("not an image"),
  );
  await expect(path).toHaveText("notes.png");
  await expect(fluff).toContainText("The image can't be read.");
  await expect(img).toBeHidden();

  await fluff.getByRole("button", { name: "Remove the portrait" }).click();
  await expect(fluff).toContainText("No portrait.");
  await expect(path).toHaveText("");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("a file's portrait: Show... shows an image for its path", async ({
  page,
}) => {
  const w = await opened(page);
  await openFile(page, "Sheet.yaml");
  await expect(page).toHaveTitle(title + " - Sheet.yaml");
  await page.getByRole("tab", { name: "Fluff" }).click();
  const fluff = page.getByRole("tabpanel", { name: "Fluff" });
  await expect(fluff.locator(".portrait-path")).toHaveText("images/hana.png");
  await expect(fluff).toContainText("Show... picks the image to show.");
  await pick(
    page,
    fluff.getByRole("button", { name: "Show..." }),
    "hana.png",
    "image/png",
    PNG,
  );
  await expect
    .poll(() => shown(fluff.getByRole("img", { name: "The portrait" })))
    .toBe(true);
  await expect(fluff.locator(".portrait-path")).toHaveText("images/hana.png");
  await expect(page).toHaveTitle(title + " - Sheet.yaml");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("the Background tab: the sections share its height, and take typing", async ({
  page,
}) => {
  const w = await opened(page);
  await openFile(page, "Sheet.yaml");
  await expect(page).toHaveTitle(title + " - Sheet.yaml");
  await page.getByRole("tab", { name: "Background" }).click();
  const bg = page.getByRole("tabpanel", { name: "Background" });
  const sections = [
    "Background",
    "Appearance",
    "Personality",
    "Character Hooks",
    "Other Notes",
  ];
  const heights: number[] = [];
  for (const s of sections) {
    const b = await bg.getByLabel(s, { exact: true }).boundingBox();
    heights.push(b!.height);
  }
  for (const h of heights) {
    expect(h).toBeGreaterThanOrEqual(60);
    expect(Math.abs(h - heights[0]!)).toBeLessThanOrEqual(2);
  }
  await expect(bg.getByLabel("Appearance", { exact: true })).toHaveValue(
    /red scarf/,
  );
  await bg.getByLabel("Summary").fill("A storm.");
  await expect(page).toHaveTitle(title + " - Sheet.yaml *");

  await page.getByRole("tab", { name: "Fluff" }).click();
  const fluff = page.getByRole("tabpanel", { name: "Fluff" });
  await fluff.getByLabel("Favorite Food").fill("Melon bread");
  await fluff.getByLabel("Header").fill("Rivals");
  await fluff.getByLabel("Note text").fill("The track team's captain.");
  await fluff.getByRole("button", { name: "Add the note" }).click();
  await expect(
    fluff.getByRole("listbox", { name: "Notes" }).getByRole("option", {
      selected: true,
    }),
  ).toHaveText("Rivals");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("screenshots of the Background and Fluff tabs", async ({
  page,
  browserName,
}) => {
  await opened(page);
  await openFile(page, "Sheet.yaml");
  await expect(page).toHaveTitle(title + " - Sheet.yaml");
  for (const tab of ["Background", "Fluff"]) {
    await page.getByRole("tab", { name: tab }).click();
    await page.screenshot({
      path: `obj/screenshots/${browserName}-${tab.toLowerCase()}.png`,
    });
  }
});
