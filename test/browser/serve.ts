// The built page from a local http:// server, for the browser tests'
// second run (PLAN.md, Phase 14.1): dist/ova_cg_web.html at
// http://127.0.0.1:PORT/ova_cg_web.html, and nothing else (404), so a
// request the page shouldn't make fails as it would from file://.
//
//   node test/browser/serve.ts [PORT]

import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 8713);
const page = "/ova_cg_web.html";

createServer((req, res) => {
  if (req.method === "GET" && req.url === page) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync("dist/ova_cg_web.html"));
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found\n");
}).listen(port, "127.0.0.1", () => {
  console.log(`serving http://127.0.0.1:${port}${page}`);
});
