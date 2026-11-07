// ova_cg_go's internal/paths/paths_test.go (ova_cg_po's TestPaths),
// with its labels. Paths are text alone, so these need no files; the
// working directory, which a page doesn't have, is "/".
import { test } from "node:test";
import assert from "node:assert/strict";
import * as paths from "../../src/core/paths.ts";

test("TestPaths", () => {
  const { normalize, absolute, dir, relative, rebase } = paths;
  const failures: string[] = [];
  for (const [got, want, label] of [
    [
      normalize("a/./b//../c/"),
      "a/c",
      "Normalize: . and doubled / dropped, .. takes out a name",
    ],
    [normalize("/../a/.."), "/", "Normalize: .. at the root stays at the root"],
    [
      normalize("../../a"),
      "../../a",
      "Normalize: a relative path's leading .. kept",
    ],
    [normalize("a/.."), ".", "Normalize: nothing left is ."],

    [
      absolute("images/a.png", "/home/u/chars"),
      "/home/u/chars/images/a.png",
      "Absolute: against the base",
    ],
    [
      absolute("../a.png", "/home/u/chars"),
      "/home/u/a.png",
      "Absolute: .. out of the base",
    ],
    [
      absolute("/x/y.png", "/home/u"),
      "/x/y.png",
      "Absolute: an absolute path is itself",
    ],
    [
      absolute("a.png", ""),
      "/a.png",
      "Absolute: no base is the working directory",
    ],
    [
      absolute("a.png", "chars"),
      "/chars/a.png",
      "Absolute: a relative base, against the working directory",
    ],
    [absolute("", "/a"), "", "Absolute: none is none"],

    [
      dir("/home/u/chars/hana.yaml"),
      "/home/u/chars",
      "Dir: the file's directory",
    ],
    [dir("/hana.yaml"), "/", "Dir: at the root"],
    [dir("hana.yaml"), "/", "Dir: of a relative name, the working directory"],

    [
      relative("/home/u/chars/images/a.png", "/home/u/chars"),
      "images/a.png",
      "Relative: below",
    ],
    [
      relative("/home/u/pics/a.png", "/home/u/chars"),
      "../pics/a.png",
      "Relative: beside",
    ],
    [
      relative("/x/a.png", "/home/u/chars"),
      "../../../x/a.png",
      "Relative: all the way up",
    ],
    [
      relative("/home/u/chars", "/home/u/chars"),
      ".",
      "Relative: the directory itself",
    ],
    [
      relative("/home/u/charsx/a.png", "/home/u/chars"),
      "../charsx/a.png",
      "Relative: a name's prefix isn't a directory",
    ],

    [
      rebase("images/a.png", "/home/u/chars", "/home/u/backup"),
      "../chars/images/a.png",
      "Rebase: the file moved, the image didn't",
    ],
    [
      rebase("/home/u/pics/a.png", "", "/home/u/chars"),
      "../pics/a.png",
      "Rebase: an absolute path, on the first save",
    ],
    [
      rebase("a.png", "", "/home/u"),
      "a.png",
      "Rebase: a relative path with no from stays",
    ],
    [rebase("", "/a", "/b"), "", "Rebase: no portrait, none"],
  ]) {
    if (got !== want) failures.push(`${label}\n    got: ${got}`);
  }
  assert.deepEqual(failures, []);
});
