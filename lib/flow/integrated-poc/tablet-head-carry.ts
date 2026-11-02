// U44: on a tablet held sideways the writing screen's title and ⋯ sit in the editor's tool line. Turning the tablet (or
// sizing the window) across that condition draws them again in their other place, so what the user had there is
// carried over: an open ⋯, the document name being typed in it (with its selection) and the focus on the title or in ⋯.

const MENU_FOCUSABLE = 'summary, button, input, select';

export interface ProgramHeadCarry {
  menuOpen: boolean;
  /** The name typed in ⋯ and not yet changed, with the title it was typed over. */
  name: { title: string; value: string; start: number | null; end: number | null; direction: 'forward' | 'backward' | 'none' | null } | null;
  /** The title button, or the index of the control in ⋯, that had the focus. */
  focus: 'title' | number | null;
}

/** Read just before the head moves, while its old place is still drawn. Null when nothing there needs carrying. */
export function carryProgramHead(menu: HTMLDetailsElement | null, title: HTMLElement | null, active: Element | null): ProgramHeadCarry | null {
  const input = menu?.querySelector<HTMLInputElement>('input[name="title"]') ?? null;
  const name = input && input.value !== input.defaultValue
    ? { title: input.defaultValue, value: input.value, start: input.selectionStart, end: input.selectionEnd, direction: input.selectionDirection } : null;
  const inMenu = menu && active ? Array.from(menu.querySelectorAll(MENU_FOCUSABLE)).indexOf(active) : -1;
  const focus = active && active === title ? 'title' : inMenu >= 0 ? inMenu : null;
  return menu?.open || name || focus !== null ? { menuOpen: !!menu?.open, name, focus } : null;
}

/** Applied once the head is drawn in its new place. A name saved or typed there meanwhile wins. */
export function restoreProgramHead(carry: ProgramHeadCarry, menu: HTMLDetailsElement | null, title: HTMLElement | null) {
  if (carry.menuOpen && menu && !menu.open) menu.open = true;
  const input = menu?.querySelector<HTMLInputElement>('input[name="title"]') ?? null;
  if (carry.name && input && input.defaultValue === carry.name.title && input.value === input.defaultValue) input.value = carry.name.value;
  const target = carry.focus === 'title' ? title : carry.focus !== null && menu ? menu.querySelectorAll<HTMLElement>(MENU_FOCUSABLE)[carry.focus] ?? null : null;
  target?.focus({ preventScroll: true });
  if (carry.name && input && target === input && input.value === carry.name.value) input.setSelectionRange(carry.name.start, carry.name.end, carry.name.direction ?? undefined);
}
