// Puts the bundled script and the CSS into the page's skeleton, making
// the one HTML file (PLAN.md, Phase 0.2).

/** The skeleton's two placeholders, each on a line of its own. */
export const STYLE = "<!-- STYLE -->";
export const SCRIPT = "<!-- SCRIPT -->";

/**
 * Text that would end, or confuse, the element it is inlined into. In a
 * <script>, "</script" ends it, and "<!--" with "<script" can put the
 * parser in its "double escaped" state (HTML, "script data"); in a
 * <style>, "</style" ends it. esbuild 0.28 writes "</script" in a
 * string or regular expression as "<\/script", but leaves "<!--" and
 * "<script" as they are (seen 2026-11-07). Whatever is left is refused,
 * not rewritten, since rewriting code blindly could change what it
 * does; refusing either of the two alone is stricter than HTML needs.
 */
const SCRIPT_UNSAFE = /<\/script|<!--|<script/i;
const STYLE_UNSAFE = /<\/style/i;

/**
 * @param {string} html the skeleton, holding STYLE and SCRIPT once each
 * @param {string} css
 * @param {string} js
 * @returns {string}
 */
export function inlinePage(html, css, js) {
  const bad = SCRIPT_UNSAFE.exec(js);
  if (bad) throw new Error(`the script holds ${JSON.stringify(bad[0])}`);
  const badCss = STYLE_UNSAFE.exec(css);
  if (badCss) throw new Error(`the CSS holds ${JSON.stringify(badCss[0])}`);
  for (const mark of [STYLE, SCRIPT]) {
    const n = html.split(mark).length - 1;
    if (n !== 1) throw new Error(`the skeleton holds ${mark} ${n} times`);
  }
  // A function as the replacement, so "$&" and the like in the code
  // stay as they are.
  return html
    .replace(STYLE, () => `<style>\n${css}</style>`)
    .replace(SCRIPT, () => `<script>\n${js}</script>`);
}
