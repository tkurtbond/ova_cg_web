// The built page in headless browsers (AGENTS.md, "Browsers and the
// desktop"): Chromium and Firefox, both required (PLAN.md, "Browsers").
// Never headed: no window opens on the desktop.
//
// Each with its PDF viewer, for the rulebook (test/browser/rulebook.spec.ts):
// Chromium the full build (channel "chromium"), since the headless shell
// Playwright uses by default has none, and Firefox with pdf.js on, which
// Playwright turns off (both seen in Phase 13).

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "test/browser",
  outputDir: "obj/playwright",
  forbidOnly: true,
  reporter: "list",
  use: { headless: true },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        launchOptions: { firefoxUserPrefs: { "pdfjs.disabled": false } },
      },
    },
  ],
});
