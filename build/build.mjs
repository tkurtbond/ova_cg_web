// Builds dist/ova_cg_web.html: esbuild bundles src/main.ts into one
// script, and inlinePage puts it and src/style.css into src/index.html.
//
//   node build/build.mjs           the release: minified, no source map
//   node build/build.mjs --debug   not minified, an inline source map

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { inlinePage } from "./inline.mjs";

const debug = process.argv.includes("--debug");
const out = "dist/ova_cg_web.html";

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
  logLevel: "warning",
});
const js = result.outputFiles[0]?.text;
if (js === undefined) throw new Error("esbuild wrote no script");

const [html, css] = await Promise.all([
  readFile("src/index.html", "utf8"),
  readFile("src/style.css", "utf8"),
]);
await mkdir("dist", { recursive: true });
await writeFile(out, inlinePage(html, css, js));
console.log(`${out}: ${Buffer.byteLength(await readFile(out))} bytes`);
