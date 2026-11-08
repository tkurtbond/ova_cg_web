// The guide's panel (PLAN.md, "The guide"): the page's own, ova_cg_go
// has none. Help > Guide shows it beside the sheet, not as a dialog, so
// the user works on the sheet while following it: at the sheet's right
// when the page is wide enough for both, else above the tabs, where it
// folds to its heading line (style.css says where the width is).
//
// One step at a time: the steps' titles, a list to jump to any; the
// step shown, its paragraphs and lists; Back, Next and Close. Every
// name with a page in it is shown as the rest of the page shows names
// (rules.label, rules.pageLabel), with a ? opening the rulebook at that
// page; a Show me button asks the Window to show one of its controls.
// The step is kept while the page is open, closed or not, and nowhere
// else. Nothing here touches the character.
//
// Made with createElement and textContent, never innerHTML: the guide's
// text is the page's, but its Markdown is guide.ts's subset, parsed.

import type { Guide, Inline, Block, Step } from "../core/guide.ts";
import * as rules from "../core/rules.ts";
import { button, el, HelpButton } from "./widgets.ts";

export class GuidePanel {
  readonly guide: Guide;
  readonly element: HTMLElement;
  /** The heading line's button that folds the panel when it is narrow */
  readonly fold: HTMLButtonElement;
  /** The steps' titles, each a button showing its step */
  readonly stepButtons: HTMLButtonElement[] = [];
  /** The step shown */
  readonly body: HTMLElement;
  readonly back: HTMLButtonElement;
  readonly next: HTMLButtonElement;
  readonly close: HTMLButtonElement;
  /** The step shown, an index into guide.steps */
  step = 0;
  /** Close, and the panel's own close: the Window hides it */
  onClose: () => void = () => {};
  private readonly doc: Document;
  private readonly openPage: (page: number) => void;
  private readonly show: (target: string) => void;

  /**
   * The panel showing g's first step; openPage opens the rulebook at a
   * printed page, show shows the Window's control that a Show me names.
   */
  constructor(
    doc: Document,
    g: Guide,
    openPage: (page: number) => void,
    show: (target: string) => void,
  ) {
    this.doc = doc;
    this.guide = g;
    this.openPage = openPage;
    this.show = show;

    const e = el(doc, "aside", "guide");
    e.id = "guide";
    e.hidden = true;
    const title = el(doc, "h2", "guide-title");
    title.id = "guide-title";
    title.append(...this.inlines(g.title));
    e.setAttribute("aria-labelledby", title.id);

    this.fold = el(doc, "button", "guide-fold");
    this.fold.type = "button";
    this.fold.setAttribute("aria-controls", "guide-content");
    this.fold.setAttribute("aria-labelledby", title.id);
    this.fold.addEventListener("click", () => (this.folded = !this.folded));
    const head = el(doc, "div", "guide-head");
    head.append(this.fold, title);

    const list = el(doc, "ol", "guide-steps");
    list.setAttribute("aria-label", "Steps");
    g.steps.forEach((s, i) => {
      const b = el(doc, "button", "guide-step-button");
      b.type = "button";
      b.append(...this.inlines(s.title, false));
      b.addEventListener("click", () => this.showStep(i));
      const li = el(doc, "li");
      li.append(b);
      list.append(li);
      this.stepButtons.push(b);
    });

    this.body = el(doc, "div", "guide-body");
    this.body.id = "guide-step";
    this.body.setAttribute("aria-live", "polite");
    this.back = button(doc, "Back", () => this.showStep(this.step - 1));
    this.next = button(doc, "Next", () => this.showStep(this.step + 1));
    this.close = button(doc, "Close", () => this.onClose());
    const buttons = el(doc, "div", "guide-buttons");
    buttons.append(this.back, this.next, el(doc, "span", "spacer"), this.close);

    const content = el(doc, "div", "guide-content");
    content.id = "guide-content";
    content.append(list, this.body, buttons);
    e.append(head, content);
    this.element = e;
    this.folded = false;
    this.showStep(0);
  }

  /** Whether the panel is shown: Help > Guide's check. */
  get open(): boolean {
    return !this.element.hidden;
  }

  /**
   * Whether the panel is folded to its heading line; only a narrow
   * panel folds, so a wide one shows its content either way (style.css).
   */
  get folded(): boolean {
    return this.element.classList.contains("folded");
  }

  set folded(v: boolean) {
    this.element.classList.toggle("folded", v);
    this.fold.setAttribute("aria-expanded", String(!v));
  }

  /** showStep shows step i, its title marked in the list. */
  showStep(i: number): void {
    const n = this.guide.steps.length;
    if (i < 0 || i >= n)
      throw new Error(`no step ${String(i)} of ${String(n)}`);
    this.step = i;
    this.stepButtons.forEach((b, j) => {
      if (j === i) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
    this.back.disabled = i === 0;
    this.next.disabled = i === n - 1;
    this.body.replaceChildren(...this.stepContent(this.guide.steps[i]!));
  }

  /** The heading of the step shown, which the panel focuses as it opens. */
  stepHeading(): HTMLElement {
    return this.body.querySelector("h3")!;
  }

  private stepContent(s: Step): HTMLElement[] {
    const h = el(this.doc, "h3", "guide-step-title");
    h.tabIndex = -1;
    h.append(...this.inlines(s.title));
    return [h, ...s.blocks.map((b) => this.block(b))];
  }

  private block(b: Block): HTMLElement {
    if (b.kind === "paragraph") {
      const p = el(this.doc, "p");
      p.append(...this.inlines(b.content));
      return p;
    }
    const l = el(this.doc, b.ordered ? "ol" : "ul");
    for (const it of b.items) {
      const li = el(this.doc, "li");
      li.append(...this.inlines(it));
      l.append(li);
    }
    return l;
  }

  /**
   * The nodes rs is shown as; buttons false where they would be inside
   * another button (a step's title in the list), which shows only text.
   */
  private inlines(rs: readonly Inline[], buttons = true): Node[] {
    const doc = this.doc;
    const out: Node[] = [];
    for (const r of rs)
      switch (r.kind) {
        case "text":
          out.push(doc.createTextNode(r.text));
          break;
        case "strong":
        case "emphasis": {
          const s = el(doc, r.kind === "strong" ? "strong" : "em");
          s.append(...this.inlines(r.content, buttons));
          out.push(s);
          break;
        }
        case "code":
          out.push(el(doc, "code", undefined, r.text));
          break;
        case "item":
          out.push(...this.named(rules.label(r.item), r.item.page, buttons));
          break;
        case "page":
          out.push(
            ...this.named(
              rules.pageLabel(r.text, r.page.page),
              r.page.page,
              buttons,
            ),
          );
          break;
        case "show": {
          if (!buttons) {
            out.push(doc.createTextNode(r.text));
            break;
          }
          const b = button(doc, r.text, () => this.show(r.target));
          b.classList.add("guide-show");
          b.dataset.target = r.target;
          out.push(b);
          break;
        }
      }
    return out;
  }

  /** A name with its page, and a ? for the page unless !buttons. */
  private named(label: string, page: number, buttons: boolean): Node[] {
    const s = el(this.doc, "span", "guide-name", label);
    if (!buttons) return [s];
    const h = new HelpButton(this.doc, page, this.openPage);
    h.button.setAttribute("aria-label", `The rulebook at p. ${String(page)}`);
    return [s, this.doc.createTextNode(" "), h.button];
  }
}
