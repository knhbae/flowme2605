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
