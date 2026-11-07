// The page on happy-dom, under plain Node: a Window built into a fresh
// document, and fakes in place of what would wait for the user, as
// ova_cg_go's newWindow sets them (internal/ui/window_test.go). The
// real dialogs are tested in dialogs.test.ts, and in the browsers by
// test/browser/shell.spec.ts.

import { readFileSync } from "node:fs";
import { Window as HappyWindow } from "happy-dom";
import { Cancel, Window, type Answer } from "../../src/ui/window.ts";

export const DATA_DIR = "testdata/";

/** What answers for the user, and what it was asked. */
export interface Fakes {
  tells: number; // how many messages were shown
  told: string; // the last
  answer: Answer; // what ask answers,
  asked: number; // and how often it was asked
  question: string; // what ask or confirm asked last
  yes: boolean; // what confirm answers,
  confirmed: number; // and how often it was asked
  chosen: string | undefined; // the fixture chooseFile gives; undefined: cancelled
  chooses: number; // how often chooseFile was asked
  typed: string | undefined; // what askText answers; undefined: cancelled
  texts: number; // how often askText was asked,
  suggested: string; // and the text it began with last
  downloads: { name: string; text: string }[];
  page: number; // the last page openPage was asked for
}

/** A fresh document with the page's #app, on happy-dom. */
export function newDocument(): { happy: HappyWindow; doc: Document } {
  const happy = new HappyWindow({ url: "file:///ova_cg_web.html" });
  happy.document.body.innerHTML = '<main id="app"></main>';
  return { happy, doc: happy.document as unknown as Document };
}

export function newWindow(): {
  w: Window;
  f: Fakes;
  doc: Document;
  happy: HappyWindow;
} {
  const { happy, doc } = newDocument();
  const w = new Window(doc);
  const f: Fakes = {
    tells: 0,
    told: "",
    answer: Cancel,
    asked: 0,
    question: "",
    yes: false,
    confirmed: 0,
    chosen: undefined,
    chooses: 0,
    typed: undefined,
    texts: 0,
    suggested: "",
    downloads: [],
    page: 0,
  };
  w.tell = (text) => {
    f.tells++;
    f.told = text;
  };
  w.ask = (q, answer) => {
    f.asked++;
    f.question = q;
    answer(f.answer);
  };
  w.confirm = (q, _yes, then) => {
    f.confirmed++;
    f.question = q;
    then(f.yes);
  };
  w.chooseFile = (_accept, then) => {
    f.chooses++;
    if (f.chosen === undefined) return;
    const text = readFileSync(DATA_DIR + f.chosen, "utf8");
    then(new happy.File([text], f.chosen) as unknown as File);
  };
  w.askText = (_p, text, then) => {
    f.texts++;
    f.suggested = text;
    if (f.typed === undefined) then("", false);
    else then(f.typed, true);
  };
  w.download = (name, text) => f.downloads.push({ name, text });
  w.openPage = (p) => (f.page = p);
  return { w, f, doc, happy };
}

/** load opens the fixture name, as the page would. */
export function load(w: Window, name: string): boolean {
  return w.load(readFileSync(DATA_DIR + name, "utf8"), name);
}

/** settled waits until a file's text, being read, has been loaded. */
export function settled(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

/** A key pressed on target (the focused element, by default). */
export function press(
  doc: Document,
  init: KeyboardEventInit,
  target?: Element | null,
): KeyboardEvent {
  const view = doc.defaultView as unknown as typeof globalThis;
  const e = new view.KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  (target ?? doc.activeElement ?? doc.body).dispatchEvent(e);
  return e;
}
