// U44: on a tablet held sideways the writing screen's title and ⋯ sit in the editor's tool line, and the notices under
// it. Turning the tablet (or sizing the window) across that condition draws them again in their other place, so what
// the user had there is carried over, as a rule rather than case by case:
// - an open ⋯, and the document name in it as typed, with its selection;
// - the focus, found again by what the control is (its label, name or words), not by its position; where it is gone
//   (a confirmation step starts over), the focus goes to ⋯ if it was in ⋯, else to the title;
// - nothing else: a confirmation step or a closed notice starts over, and the move saves or changes nothing.
// It is put back only for the same document and only where the move took the focus (nothing focused since).

const FOCUSABLE = 'button, summary, input, select, textarea, a[href]';

/** The head's controls in either place: the editor's head slots, or anything outside the editors. Shown ones only. */
function headControls(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element => element.getClientRects().length > 0
    && (!!element.closest('[data-editor-head]') || !element.closest('[data-program-document]')));
}
function controlKey(element: Element) {
  return `${element.tagName}|${element.getAttribute('aria-label') ?? element.getAttribute('name') ?? (element.textContent ?? '').trim().slice(0, 80)}`;
}

export interface ProgramHeadCarry {
  documentId: string;
  menuOpen: boolean;
  /** The name field in ⋯, typed in or focused: its words, with the title they were typed over, and its selection. */
  name: { title: string; value: string; start: number | null; end: number | null; direction: 'forward' | 'backward' | 'none' | null } | null;
  /** The focused control: the element itself (to tell whether the move took it), what it is, and which of the same. */
  focus: { element: Element; key: string; nth: number; inMenu: boolean } | null;
}

/** Read just before the head moves, while its old place is still drawn. Null when nothing there needs carrying. */
export function carryProgramHead(documentId: string, root: ParentNode | null, menu: HTMLDetailsElement | null, active: Element | null): ProgramHeadCarry | null {
  const input = menu?.querySelector<HTMLInputElement>('input[name="title"]') ?? null;
  const name = input && (input.value !== input.defaultValue || active === input)
    ? { title: input.defaultValue, value: input.value, start: input.selectionStart, end: input.selectionEnd, direction: input.selectionDirection } : null;
  const controls = root && active ? headControls(root) : [];
  const key = active && controls.includes(active as HTMLElement) ? controlKey(active) : null;
  const focus = active && key !== null
    ? { element: active, key, nth: controls.filter(control => controlKey(control) === key).indexOf(active as HTMLElement), inMenu: !!menu?.contains(active) } : null;
  return menu?.open || name || focus ? { documentId, menuOpen: !!menu?.open, name, focus } : null;
}

/** Applied once the head is drawn in its new place. A name saved or typed there meanwhile, or a newer focus, wins. */
export function restoreProgramHead(carry: ProgramHeadCarry, documentId: string, root: ParentNode | null, menu: HTMLDetailsElement | null,
  title: HTMLElement | null, active: Element | null) {
  if (carry.documentId !== documentId) return;
  if (carry.menuOpen && menu && !menu.open) menu.open = true;
  const input = menu?.querySelector<HTMLInputElement>('input[name="title"]') ?? null;
  if (carry.name && input && input.defaultValue === carry.name.title && input.value === input.defaultValue) input.value = carry.name.value;
  const focus = carry.focus;
  if (!focus || focus.element.isConnected || active && active !== active.ownerDocument?.body) return;
  const same = root ? headControls(root).filter(control => controlKey(control) === focus.key) : [];
  const target = same[focus.nth] ?? same[0] ?? (focus.inMenu ? menu?.querySelector<HTMLElement>(':scope > summary') : null) ?? title;
  target?.focus({ preventScroll: true });
  if (carry.name && input && target === input && input.value === carry.name.value) input.setSelectionRange(carry.name.start, carry.name.end, carry.name.direction ?? undefined);
}
