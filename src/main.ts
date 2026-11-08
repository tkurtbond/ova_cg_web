// The page's entry point: makes the Window on the document.
//
// The Window is also globalThis.ova, so a browser test can reach what
// the page offers no control for yet (marking a change before Phase 7
// gives the page anything to change), and a user can look at it from
// the console.

import { Window } from "./ui/window.ts";
import { parse } from "./core/guide.ts";
import guideText from "./guide/guide.md";

declare global {
  var ova: Window;
}

globalThis.ova = new Window(document, parse(guideText));
