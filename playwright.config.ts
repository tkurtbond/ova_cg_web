// The built page in headless browsers (AGENTS.md, "Browsers and the
// desktop"): Chromium and Firefox, both required (PLAN.md, "Browsers").
// Never headed: no window opens on the desktop.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "test/browser",
  outputDir: "obj/playwright",
  forbidOnly: true,
  reporter: "list",
  use: { headless: true },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
});
