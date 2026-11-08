// The menu bar: File, Character and Rulebook, as ova_cg_po's FLTK
// Menu_Bar and ova_cg_go's fyne.MainMenu have them, and the page's own
// Help (PLAN.md, "The guide"), made of buttons with
// the WAI-ARIA menubar roles. A mouse opens a menu with a click, and
// another by moving over it while one is open; the keyboard reaches the
// bar with Tab (one of its menus' buttons is in the tab order), moves
// along it with Left and Right, opens a menu with Down, Up, Enter or
// Space, moves in it with Up, Down, Home and End, and leaves it with
// Escape (back to the bar) or Tab. An item that can do nothing is
// disabled, and shows grey. An item that is on or off (Transformed form)
// is a menuitemcheckbox, its check shown before its label. Each item
// shows its key, which the Window takes (keyMatches). The bar has no Alt mnemonics, which would compete
// with the browsers' own (PLAN.md, "Keys").

/** A key and its modifiers; ctrl is Ctrl, or Command on a Mac. */
export interface Key {
  code: string; // KeyboardEvent.code: "KeyS", "PageDown"
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

/** The key names a menu shows for codes that aren't a letter's. */
const codeNames: Readonly<Record<string, string>> = {
  PageDown: "PgDn",
  PageUp: "PgUp",
};

/** keyText is k as a menu shows it: "Ctrl+Shift+S", "Alt+Shift+PgDn". */
export function keyText(k: Key): string {
  let s = "";
  if (k.ctrl) s += "Ctrl+";
  if (k.alt) s += "Alt+";
  if (k.shift) s += "Shift+";
  const name = codeNames[k.code];
  return s + (name ?? k.code.replace(/^Key/, ""));
}

/** ariaKeys is k as aria-keyshortcuts has it: "Control+Shift+S". */
function ariaKeys(k: Key): string {
  const ks: string[] = [];
  if (k.ctrl) ks.push("Control");
  if (k.alt) ks.push("Alt");
  if (k.shift) ks.push("Shift");
  ks.push(k.code.replace(/^Key/, ""));
  return ks.join("+");
}

/**
 * keyMatches says whether e is k: the same key and exactly its
 * modifiers. KeyboardEvent.code names the key whatever it types, so
 * Alt+Shift+N is N where a layout or Alt makes it another character.
 */
export function keyMatches(k: Key, e: KeyboardEvent): boolean {
  return (
    e.code === k.code &&
    (e.ctrlKey || e.metaKey) === k.ctrl &&
    e.altKey === k.alt &&
    e.shiftKey === k.shift
  );
}

/** A menu's item: its button, its key, and what it does. */
export class MenuItem {
  readonly label: string;
  readonly key: Key | undefined;
  /** What the item does; undefined: nothing yet, so it is disabled. */
  readonly action: (() => void) | undefined;
  readonly button: HTMLButtonElement;
  /** Whether the item is on or off: a menuitemcheckbox (Go's Checked) */
  readonly checkable: boolean;

  constructor(
    doc: Document,
    label: string,
    key: Key | undefined,
    action: (() => void) | undefined,
    checkable = false,
  ) {
    this.label = label;
    this.key = key;
    this.action = action;
    const b = doc.createElement("button");
    b.type = "button";
    b.className = "menu-item";
    b.setAttribute("role", checkable ? "menuitemcheckbox" : "menuitem");
    b.tabIndex = -1;
    this.checkable = checkable;
    const l = doc.createElement("span");
    l.className = "menu-label";
    l.textContent = label;
    b.append(l);
    if (key !== undefined) {
      const k = doc.createElement("span");
      k.className = "menu-key";
      k.textContent = keyText(key);
      b.append(k);
      b.setAttribute("aria-keyshortcuts", ariaKeys(key));
    }
    this.button = b;
    this.disabled = action === undefined;
    if (checkable) this.checked = false;
  }

  /** Whether a checkable item is on. */
  get checked(): boolean {
    return this.button.getAttribute("aria-checked") === "true";
  }

  set checked(v: boolean) {
    if (!this.checkable) throw new Error(this.label + " can't be checked");
    this.button.setAttribute("aria-checked", String(v));
  }

  get disabled(): boolean {
    return this.button.disabled;
  }

  /** An item with no action stays disabled. */
  set disabled(v: boolean) {
    this.button.disabled = v || this.action === undefined;
  }
}

/** A separator between a menu's items. */
export const Separator = "-";

export interface Menu {
  label: string;
  items: (MenuItem | typeof Separator)[];
}

/** One menu on the bar: its button and its popup. */
interface Shown {
  menu: Menu;
  top: HTMLButtonElement;
  popup: HTMLElement;
}

export class MenuBar {
  readonly doc: Document;
  readonly element: HTMLElement;
  readonly menus: readonly Menu[];
  private readonly shown: Shown[] = [];
  /** The menu open, -1 for none. */
  current = -1;
  /** Where the focus was before a menu opened, to go back to. */
  private back: Element | null = null;

  constructor(doc: Document, menus: Menu[]) {
    this.doc = doc;
    this.menus = menus;
    const bar = doc.createElement("nav");
    bar.className = "menubar";
    bar.setAttribute("role", "menubar");
    bar.setAttribute("aria-label", "Menus");
    menus.forEach((m, i) => {
      const wrap = doc.createElement("div");
      wrap.className = "menu";
      const top = doc.createElement("button");
      top.type = "button";
      top.className = "menu-top";
      top.setAttribute("role", "menuitem");
      top.setAttribute("aria-haspopup", "menu");
      top.setAttribute("aria-expanded", "false");
      top.tabIndex = i === 0 ? 0 : -1;
      top.textContent = m.label;
      const popup = doc.createElement("div");
      popup.className = "menu-popup";
      popup.setAttribute("role", "menu");
      popup.setAttribute("aria-label", m.label);
      popup.hidden = true;
      for (const it of m.items) {
        if (it === Separator) {
          const hr = doc.createElement("div");
          hr.className = "menu-separator";
          hr.setAttribute("role", "separator");
          popup.append(hr);
        } else {
          it.button.addEventListener("click", () => this.choose(it));
          it.button.addEventListener("mouseenter", () => {
            if (!it.disabled) it.button.focus();
          });
          popup.append(it.button);
        }
      }
      // A press in the popup keeps the focus where it is, so a press on
      // a disabled item doesn't take it out of the menu.
      popup.addEventListener("mousedown", (e) => e.preventDefault());
      popup.addEventListener("keydown", (e) => this.popupKey(i, e));
      top.addEventListener("click", () => {
        if (this.current === i) this.close(true);
        else this.open(i, "first");
      });
      top.addEventListener("mouseenter", () => {
        if (this.current >= 0 && this.current !== i) this.open(i, "none");
      });
      top.addEventListener("keydown", (e) => this.topKey(i, e));
      wrap.append(top, popup);
      bar.append(wrap);
      this.shown.push({ menu: m, top, popup });
    });
    // Anything pressed, or focused, outside the bar closes the menu.
    doc.addEventListener("mousedown", (e) => {
      if (this.current >= 0 && !bar.contains(e.target as Node)) {
        this.close(false);
      }
    });
    bar.addEventListener("focusout", (e) => {
      const to = e.relatedTarget as Node | null;
      if (this.current >= 0 && to !== null && !bar.contains(to)) {
        this.close(false);
      }
    });
    this.element = bar;
  }

  /** Every item, menu by menu. */
  items(): MenuItem[] {
    return this.menus.flatMap((m) =>
      m.items.filter((it): it is MenuItem => it !== Separator),
    );
  }

  /** The bar's button for menu i. */
  top(i: number): HTMLButtonElement {
    return this.shown[i]!.top;
  }

  /** The popup of menu i. */
  popup(i: number): HTMLElement {
    return this.shown[i]!.popup;
  }

  /**
   * open opens menu i, closing any other, the focus on its first or last
   * enabled item, or left where it is ("none").
   */
  open(i: number, focus: "first" | "last" | "none"): void {
    if (this.current < 0) this.back = this.doc.activeElement;
    if (this.current >= 0 && this.current !== i) this.hide(this.current);
    const s = this.shown[i]!;
    this.current = i;
    s.popup.hidden = false;
    s.top.setAttribute("aria-expanded", "true");
    s.top.classList.add("open");
    this.rove(i);
    const enabled = this.enabled(i);
    if (focus === "first" && enabled.length > 0) enabled[0]!.focus();
    else if (focus === "last" && enabled.length > 0) enabled.at(-1)!.focus();
    else s.top.focus();
  }

  /**
   * close closes the open menu; the focus goes back where it was before
   * it opened if back, else is left where it is.
   */
  close(back: boolean): void {
    if (this.current < 0) return;
    const i = this.current;
    this.hide(i);
    this.current = -1;
    const b = this.back;
    this.back = null;
    if (back) {
      if (b !== null && b.isConnected && "focus" in b && b !== this.doc.body) {
        (b as HTMLElement).focus();
      } else {
        this.shown[i]!.top.focus();
      }
    }
  }

  private hide(i: number): void {
    const s = this.shown[i]!;
    s.popup.hidden = true;
    s.top.setAttribute("aria-expanded", "false");
    s.top.classList.remove("open");
  }

  /** rove makes menu i's button the bar's one in the tab order. */
  private rove(i: number): void {
    this.shown.forEach((s, j) => (s.top.tabIndex = j === i ? 0 : -1));
  }

  private enabled(i: number): HTMLButtonElement[] {
    return this.shown[i]!.menu.items.flatMap((it) =>
      it !== Separator && !it.disabled ? [it.button] : [],
    );
  }

  /** choose is item it chosen: the menu closed, then its action. */
  private choose(it: MenuItem): void {
    if (it.disabled || it.action === undefined) return;
    this.close(true);
    it.action();
  }

  private step(i: number, d: number): number {
    return (i + d + this.shown.length) % this.shown.length;
  }

  private topKey(i: number, e: KeyboardEvent): void {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowLeft": {
        const j = this.step(i, e.key === "ArrowRight" ? 1 : -1);
        if (this.current >= 0) this.open(j, "first");
        else {
          this.rove(j);
          this.shown[j]!.top.focus();
        }
        break;
      }
      // Enter and Space are the button's click.
      case "ArrowDown":
        this.open(i, "first");
        break;
      case "ArrowUp":
        this.open(i, "last");
        break;
      case "Escape":
        if (this.current < 0) return;
        this.close(false);
        this.shown[i]!.top.focus();
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  private popupKey(i: number, e: KeyboardEvent): void {
    const items = this.enabled(i);
    const at = items.indexOf(this.doc.activeElement as HTMLButtonElement);
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (items.length === 0) break;
        const d = e.key === "ArrowDown" ? 1 : -1;
        const n = at < 0 ? (d > 0 ? 0 : items.length - 1) : at + d;
        items[(n + items.length) % items.length]!.focus();
        break;
      }
      case "Home":
        items[0]?.focus();
        break;
      case "End":
        items.at(-1)?.focus();
        break;
      case "ArrowRight":
      case "ArrowLeft":
        this.open(this.step(i, e.key === "ArrowRight" ? 1 : -1), "first");
        break;
      case "Escape":
        this.close(false);
        this.shown[i]!.top.focus();
        break;
      case "Tab":
        this.close(false);
        this.shown[i]!.top.focus();
        return; // and Tab moves on from the bar
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  }
}
