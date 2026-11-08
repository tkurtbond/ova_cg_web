// Builds dist/ova_cg_web.html: esbuild bundles src/main.ts into one
// script, and inlinePage puts it and src/style.css into src/index.html.
//
//   node build/build.mjs           the release: minified, no source map
//   node build/build.mjs --debug   not minified, an inline source map

import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { inlinePage } from "./inline.mjs";
import { parse, stripComments } from "../src/core/guide.ts";

const debug = process.argv.includes("--debug");
const out = "dist/ova_cg_web.html";
// The release's size budget (PLAN.md, Phase 14.1): 227,812 bytes when
// it was set, the yaml library 97 KB of it. A release over it fails
// the build, so growth is a decision, not an accident.
const budget = 256 * 1024;

// Which build this is (src/ui/version.ts): package.json's version, and
// the commit, with "+" if the tree has changes it doesn't record.
const { version } = JSON.parse(await readFile("package.json", "utf8"));
/** @param {string[]} args */
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
let commit = "";
try {
  commit = git("rev-parse", "--short=12", "HEAD");
  if (git("status", "--porcelain", "--untracked-files=no") !== "")
    commit += "+";
} catch {
  commit = "unknown";
}

// The guide is part of the page: a mistake in its text fails the build,
// with its line, before the page would throw as it opens.
parse(await readFile("src/guide/guide.md", "utf8"));

const result = await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  // The browsers of PLAN.md, "Browsers": current Firefox and Chromium.
  target: ["firefox115", "chrome120"],
  minify: !debug,
  sourcemap: debug ? "inline" : false,
  legalComments: "eof",
  charset: "utf8",
  // The guide's text (src/guide/guide.md), imported by main.ts.
  // Its comments are taken out, since inlinePage refuses "<!--".
  plugins: [
    {
      name: "guide",
      setup(b) {
        b.onLoad({ filter: /\.md$/ }, async (args) => ({
          contents: stripComments(await readFile(args.path, "utf8")),
          loader: "text",
        }));
      },
    },
  ],
  logLevel: "warning",
  define: {
    OVA_VERSION: JSON.stringify(version),
    OVA_COMMIT: JSON.stringify(commit),
  },
});
const js = result.outputFiles[0]?.text;
if (js === undefined) throw new Error("esbuild wrote no script");

const [html, css] = await Promise.all([
  readFile("src/index.html", "utf8"),
  readFile("src/style.css", "utf8"),
]);
await mkdir("dist", { recursive: true });
await writeFile(out, inlinePage(html, css, js));
const size = Buffer.byteLength(await readFile(out));
console.log(`${out}: ${size} bytes`);
if (!debug && size > budget) {
  console.error(`${out}: over its budget of ${budget} bytes (build/build.mjs)`);
  process.exit(1);
}
