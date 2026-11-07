// build/inline.mjs: the one HTML file is the skeleton with the script
// and the CSS put in, and nothing that would end either element early.

import { test } from "node:test";
import assert from "node:assert/strict";
import { inlinePage, SCRIPT, STYLE } from "../../build/inline.mjs";

const skeleton = `<head>${STYLE}</head><body>${SCRIPT}</body>`;

test("inlinePage puts the CSS and the script in their places", () => {
  assert.equal(
    inlinePage(skeleton, "a{}\n", "x();\n"),
    "<head><style>\na{}\n</style></head><body><script>\nx();\n</script></body>",
  );
});

test("inlinePage keeps $ patterns in the code as they are", () => {
  const page = inlinePage(skeleton, "", "s.replace(r, '$&$1$$');\n");
  assert.ok(page.includes("s.replace(r, '$&$1$$');"));
});

for (const bad of ["</script>", "</SCRIPT", "<!--", "<Script"]) {
  test(`inlinePage refuses a script holding ${bad}`, () => {
    assert.throws(() => inlinePage(skeleton, "", `"${bad}"`), /script holds/);
  });
}

test("inlinePage refuses CSS holding </style", () => {
  assert.throws(() => inlinePage(skeleton, "</style>", ""), /CSS holds/);
});

test("inlinePage refuses a skeleton without each placeholder once", () => {
  assert.throws(() => inlinePage(`${STYLE}`, "", ""), /SCRIPT|-- SCRIPT/);
  assert.throws(
    () => inlinePage(`${STYLE}${STYLE}${SCRIPT}`, "", ""),
    /2 times/,
  );
});
