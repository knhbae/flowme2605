/** Show a line just added from the ＋ menu: scroll it into the editor's view and mark it for 1.5 s.
 * The mark is a data attribute on the painted row only; the text and the caret are untouched. */
export function revealProgramEditorLine(area: HTMLTextAreaElement, index: number) {
  requestAnimationFrame(() => {
    const line = area.closest('.tle-root')?.querySelector<HTMLElement>(`.tle-line[data-line-index="${index}"]`);
    if (line) {
      const top = line.offsetTop, bottom = top + line.offsetHeight;
      if (top < area.scrollTop || bottom > area.scrollTop + area.clientHeight) area.scrollTop = Math.max(0, top - Math.round(area.clientHeight / 3));
      line.dataset.justAdded = 'true';
      setTimeout(() => { if (line.isConnected) delete line.dataset.justAdded; }, 1500);
    }
    area.scrollIntoView({ block: 'nearest' });
  });
}
