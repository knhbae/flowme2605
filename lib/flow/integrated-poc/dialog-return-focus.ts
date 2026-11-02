/** Closing a native dialog must not focus an action hidden inside a collapsed menu.
 * Choose the outermost closed details summary without opening or changing that menu. */
export function programDialogReturnTarget(opener: HTMLElement | null): HTMLElement | null {
  if (!opener?.isConnected) return null;
  let target = opener;
  for (let parent = opener.parentElement; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS' && !parent.hasAttribute('open')) {
      const summary = parent.querySelector<HTMLElement>(':scope > summary');
      if (summary) target = summary;
    }
  }
  if (!target.isConnected || target.closest('[hidden],[inert]') || target.matches(':disabled') || target.getClientRects().length === 0) return null;
  return target;
}

export function restoreProgramDialogFocus(opener: HTMLElement | null): boolean {
  const target = programDialogReturnTarget(opener);
  if (!target) return false;
  target.focus({ preventScroll: true });
  return target.ownerDocument.activeElement === target;
}

/** FC7: where the writing stood when a Flow screen opened from it (caret, editor and page scroll). Tab memory only. */
export type ProgramWritingReturn = {
  documentId: string; raw: string; area: HTMLTextAreaElement;
  start: number; end: number; direction: 'forward' | 'backward' | 'none'; top: number; left: number; pageX: number; pageY: number;
};

/** The editor, hidden while the Flow screen was up, lost its scroll. Put caret and scroll back only on that same
 *  editor still showing that same text and holding the returned focus; otherwise the focus-only return stands. */
export function restoreProgramWritingReturn(writing: ProgramWritingReturn | undefined, frames = 3): boolean {
  const area = writing?.area, view = area?.ownerDocument.defaultView;
  const holds = () => !!writing && !!area?.isConnected && !area.readOnly && area.value === writing.raw
    && area.id === `program-text-${encodeURIComponent(writing.documentId)}` && area.ownerDocument.activeElement === area;
  if (!writing || !area || !holds()) return false;
  area.setSelectionRange(writing.start, writing.end, writing.direction);
  const place = (tries: number) => {
    area.scrollTop = writing.top; area.scrollLeft = writing.left;
    view?.scrollTo({ left: writing.pageX, top: writing.pageY, behavior: 'instant' });
    // On a phone the focus brings the writing bar a frame later; until then the taller editor clamps the scroll.
    // Place it again then, unless the person has already moved the caret or the scroll.
    const placed = area.scrollTop, page = view?.scrollY;
    if (tries > 0 && view && (placed !== writing.top || page !== writing.pageY)) view.requestAnimationFrame(() => {
      if (holds() && area.scrollTop === placed && view.scrollY === page
        && area.selectionStart === writing.start && area.selectionEnd === writing.end) place(tries - 1);
    });
  };
  place(frames);
  return true;
}
