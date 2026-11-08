// The built page in headless browsers (AGENTS.md, "Browsers and the
// desktop"): Chromium and Firefox, both required (PLAN.md, "Browsers").
// Never headed: no window opens on the desktop.
//
// Each with its PDF viewer, for the rulebook (test/browser/rulebook.spec.ts):
// Chromium the full build (channel "chromium"), since the headless shell
// Playwright uses by default has none, and Firefox with pdf.js on, which
// Playwright turns off (both seen in Phase 13).

import { defineConfig, devices } from "@playwright/test";
import { HTTP_PORT } from "./test/browser/page.ts";

// OVA_HTTP set: the same tests with the page from a local http://
// server (make test-browser runs both; PLAN.md, Phase 14.1).
const http = process.env.OVA_HTTP !== undefined;

export default defineConfig({
  testDir: "test/browser",
  outputDir: http ? "obj/playwright-http" : "obj/playwright",
  webServer: http
    ? {
        command: `node test/browser/serve.ts ${HTTP_PORT}`,
        url: `http://127.0.0.1:${HTTP_PORT}/ova_cg_web.html`,
        reuseExistingServer: false,
      }
    : undefined,
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
