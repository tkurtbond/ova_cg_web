// The build's version and commit (src/ui/version.ts), unbundled: the
// unit tests run the source, which build/build.mjs hasn't stamped, so
// the page says it is a development copy; the stamped build's tooltip
// is test/browser/build.spec.ts's.

import { test } from "node:test";
import { about, commit, version } from "../../src/ui/version.ts";
import { checker, newWindow } from "./setup.ts";

test("version: unbundled, a development copy", () => {
  const { check, done } = checker();
  check(version === "dev" && commit === "", "no version, no commit");
  check(about() === "ova_cg_web dev", "about says so");
  const { w } = newWindow();
  check(w.titleLine.title === about(), "the title line's tooltip");
  done();
});
