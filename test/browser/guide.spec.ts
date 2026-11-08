// Phase 15.4: the guide in a real browser, headless. What happy-dom
// can't show (test/ui/guide.test.ts drives the rest): Help > Guide
// opening and closing the panel; every step shown, by Next and from
// the list Steps unfolds; every Show me
// showing its control, focused and in view, on its tab or in its open
// menu; a ? opening the test PDF (test/browser/pdf.ts) at its page; the
// panel beside the sheet when the page is wide and above the tabs, and
// folding, when it is narrow; screenshots of both for the user.

import { expect, test, type Page } from "@playwright/test";
import { openFile, PAGE_URL, watch } from "./page.ts";
import { testPdf } from "./pdf.ts";

async function opened(page: Page): Promise<ReturnType<typeof watch>> {
  const w = watch(page);
  await page.goto(PAGE_URL);
  return w;
}

const guideItem = (page: Page) =>
  page.getByRole("menuitemcheckbox", { name: "Guide", exact: true });

/** openGuide opens the guide with Help > Guide. */
async function openGuide(page: Page): Promise<void> {
  await page.getByRole("menuitem", { name: "Help" }).click();
  await guideItem(page).click();
}

const panel = (page: Page) =>
  page.getByRole("complementary", { name: "Making a character" });

test("Help > Guide opens and closes it, and every step is shown", async ({
  page,
}) => {
  const w = await opened(page);
  await expect(panel(page)).toBeHidden();
  await openGuide(page);
  await expect(panel(page)).toBeVisible();
  // The list folded, the step's text in view.
  const list = panel(page).getByRole("list", { name: "Steps" });
  const stepsButton = panel(page).getByRole("button", { name: "Steps" });
  await expect(list).toBeHidden();
  await expect(stepsButton).toHaveAttribute("aria-expanded", "false");
  // A CSS locator: in Playwright 1.65's Firefox, allTextContents or
  // evaluateAll on a locator under panel(page), a getByRole, crashes
  // the page (PLAN.md, Phase 15.4).
  const titles = await page.locator("#guide-steps button").allTextContents();
  const n = titles.length;
  expect(n).toBeGreaterThan(10);
  const heading = panel(page).locator("#guide-step h3");
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  const where = panel(page).locator(".guide-where");
  const next = panel(page).getByRole("button", { name: "Next" });
  for (let i = 0; i < n; i++) {
    await expect(where).toHaveText(`Step ${String(i + 1)} of ${String(n)}`);
    await expect(heading).toHaveText(new RegExp("^" + titles[i]!));
    await expect(next).toBeEnabled({ enabled: i < n - 1 });
    if (i < n - 1) await next.click();
  }
  // Steps: the list unfolded, a step chosen from it, and folded again.
  await stepsButton.click();
  await expect(list).toBeVisible();
  await expect(list.getByRole("button").nth(n - 1)).toHaveAttribute(
    "aria-current",
    "step",
  );
  await list.getByRole("button").nth(2).click();
  await expect(list).toBeHidden();
  await expect(heading).toHaveText(new RegExp("^" + titles[2]!));
  await expect(heading).toBeFocused();
  await page.getByRole("menuitem", { name: "Help" }).click();
  await expect(guideItem(page)).toHaveAttribute("aria-checked", "true");
  await guideItem(page).click();
  await expect(panel(page)).toBeHidden();
  await openGuide(page);
  await expect(heading).toHaveText(new RegExp("^" + titles[2]!));
  await panel(page).getByRole("button", { name: "Close" }).click();
  await expect(panel(page)).toBeHidden();
  await page.getByRole("menuitem", { name: "Help" }).click();
  await expect(guideItem(page)).toHaveAttribute("aria-checked", "false");
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

/** Where the focused control is: its tab, or its menu, and highlighted. */
async function focused(page: Page) {
  return page.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    const tab = e?.closest<HTMLElement>("[role=tabpanel]");
    const menu = e?.closest<HTMLElement>("[role=menu]");
    return {
      shown: e?.classList.contains("guide-shown") === true,
      tab: tab === null || tab === undefined ? undefined : !tab.hidden,
      menu:
        menu === null || menu === undefined ? undefined : menu.offsetWidth > 0,
    };
  });
}

for (const width of [1280, 760])
  test(`every Show me shows its control, ${String(width)} px wide`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 720 });
    const w = await opened(page);
    // An Ability chosen, with linked content, so that Perks and Flaws...
    // and Form... can take the focus.
    await openFile(page, "Miho.yaml");
    await page
      .getByRole("listbox", { name: "Abilities" })
      .first()
      .getByRole("option", { name: /^[+−-]\d+ Transformation / })
      .click();
    await openGuide(page);
    const n = await page.locator("#guide-steps button").count();
    const next = panel(page).getByRole("button", { name: "Next" });
    let shows = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) await next.click();
      const buttons = panel(page).locator("#guide-step button.guide-show");
      for (let j = 0; j < (await buttons.count()); j++) {
        const b = buttons.nth(j);
        const target = await b.getAttribute("data-target");
        await b.click();
        const at = await focused(page);
        expect(at.shown, `${target!}: focused, highlighted`).toBe(true);
        expect(at.tab !== false && at.menu !== false, `${target!}: shown`).toBe(
          true,
        );
        await expect(page.locator(":focus"), target!).toBeInViewport();
        await expect(b, `${target!}: its Show me in view`).toBeInViewport();
        await page.keyboard.press("Escape"); // a menu shut; the guide stays
        await expect(panel(page)).toBeVisible();
        shows++;
      }
    }
    expect(shows).toBeGreaterThan(15);
    await expect(page.locator(".guide-shown")).toHaveCount(0, {
      timeout: 3000,
    });
    expect(w.requests).toEqual([]);
    expect(w.errors).toEqual([]);
  });

test("a ? in the guide opens the rulebook at its page", async ({
  page,
  browserName,
}) => {
  const w = await opened(page);
  await openGuide(page);
  await panel(page).getByRole("button", { name: "Next" }).click();
  // Talk with your GM: Discussion (p. 17), the PDF's page 19.
  await panel(page)
    .getByRole("button", { name: "The rulebook at p. 17" })
    .first()
    .click();
  const d = page.locator("dialog[open]");
  await expect(d).toContainText("hasn't been chosen");
  const chooser = page.waitForEvent("filechooser");
  await d.getByRole("button", { name: "Choose PDF..." }).click();
  const popup = page.waitForEvent("popup");
  await (
    await chooser
  ).setFiles({
    name: "OVA.pdf",
    mimeType: "application/pdf",
    buffer: testPdf(30),
  });
  const tab = await popup;
  await expect(tab).toHaveURL(/^blob:.*#page=19$/);
  await tab.screenshot({
    path: `obj/screenshots/${browserName}-guide-rulebook.png`,
  });
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});

test("beside the sheet when wide, above the tabs and folding when narrow", async ({
  page,
  browserName,
}) => {
  const w = await opened(page);
  const box = async (sel: string) => (await page.locator(sel).boundingBox())!;

  await page.setViewportSize({ width: 1280, height: 720 });
  await openGuide(page);
  const fold = panel(page).locator("button.guide-fold");
  let g = await box("#guide");
  let s = await box(".sheet");
  expect(g.x, "at the sheet's right").toBeGreaterThanOrEqual(s.x + s.width);
  expect(g.y, "beside it").toBeLessThan(s.y + 40);
  await expect(fold).toBeHidden();
  await expect(panel(page).locator("#guide-content")).toBeVisible();
  await page.screenshot({
    path: `obj/screenshots/${browserName}-guide-wide.png`,
  });

  await page.setViewportSize({ width: 760, height: 720 });
  g = await box("#guide");
  const tabs = await box("[role=tablist]");
  expect(g.y + g.height, "above the tabs").toBeLessThanOrEqual(tabs.y + 1);
  expect(g.width, "across the page").toBeGreaterThan(700);
  expect(g.height, "a third of the height at most").toBeLessThanOrEqual(
    720 / 3 + 1,
  );
  await expect(fold).toBeVisible();
  await expect(fold).toHaveAttribute("aria-expanded", "true");
  await page.screenshot({
    path: `obj/screenshots/${browserName}-guide-narrow.png`,
  });
  await fold.click();
  await expect(fold).toHaveAttribute("aria-expanded", "false");
  await expect(panel(page).locator("#guide-content")).toBeHidden();
  expect((await box("#guide")).height, "folded").toBeLessThan(40);
  await page.screenshot({
    path: `obj/screenshots/${browserName}-guide-folded.png`,
  });
  await fold.click();
  await expect(panel(page).locator("#guide-content")).toBeVisible();
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
