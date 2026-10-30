type View = { innerWidth: number; innerHeight: number };
type Visual = { width: number; height: number; offsetTop: number; offsetLeft: number };

/** Where a writing dialog sits, as CSS variables. Wide screens keep a box near the top of the visible view.
 *  On a phone (W5) it is a sheet: its bottom is the visual viewport's bottom, so an open keyboard pushes it
 *  up rather than covering it, and it spans the visible width. */
export function programWritingDialogPlace(view: View, visual: Visual | null | undefined): Record<string, string> {
  const width = visual?.width ?? view.innerWidth, height = visual?.height ?? view.innerHeight;
  const top = visual?.offsetTop ?? 0, left = visual?.offsetLeft ?? 0;
  return {
    '--writing-view-height': `${height}px`,
    '--writing-view-width': `${width}px`,
    '--writing-dialog-top': `${top + 12}px`,
    '--writing-dialog-left': `${left + Math.max(12, (width - 430) / 2)}px`,
    '--writing-view-left': `${left}px`,
    '--writing-dialog-bottom': `${Math.max(0, view.innerHeight - top - height)}px`,
  };
}
