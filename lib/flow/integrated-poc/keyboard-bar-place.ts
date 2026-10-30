type View = { innerWidth: number; innerHeight: number };
type Visual = { width: number; height: number; offsetTop: number; offsetLeft: number };

/** The bottom of what the user sees, in page (layout viewport) coordinates: the visual viewport's bottom (an
 *  Android keyboard shrinks and pans the visual viewport, not the page), or a fixed bottom bar's top if higher. */
export function programVisibleBottom(view: View, visual: Visual | null | undefined, navTop: number | null): number {
  const bottom = Math.min(view.innerHeight, visual ? visual.offsetTop + visual.height : view.innerHeight);
  return navTop === null ? bottom : Math.min(bottom, navTop);
}

/** N1 fix 3: the phone writing bar is fixed with its bottom on that visible bottom and across the visible
 *  width, so it stays right above the keyboard however the keyboard shrinks or pans the view. */
export function programKeyboardBarPlace(view: View, visual: Visual | null | undefined, bottom: number): Record<string, string> {
  return {
    '--writing-bar-bottom': `${Math.max(0, view.innerHeight - bottom)}px`,
    '--writing-bar-left': `${visual?.offsetLeft ?? 0}px`,
    '--writing-bar-width': `${visual?.width ?? view.innerWidth}px`,
  };
}

/** N1 fix 5: room under the body while writing on a phone, so the page can scroll the body (and its last line)
 *  above the fixed bar. With a keyboard up (the visual viewport ends above the screen's bottom) it is a whole
 *  screen, so the scroll range does not change as the page scrolls; without one it is the bar's height. */
export function programKeyboardRoom(view: View, visualBottom: number, barSpace: number): number {
  if (barSpace <= 0) return 0;
  return visualBottom < view.innerHeight ? view.innerHeight : barSpace;
}

/** The body reaches under the bar (N1 fix 5): the text above left less room than the body's minimum height (its
 *  textarea padding), so its height could not end above the bar and the line at its end sits under the bar.
 *  Room for one line above the bar (fix 3's rule) was not enough: the body is taller than one line. */
export function programKeyboardBarCramped(bodyBottom: number, barTop: number): boolean {
  return bodyBottom > barTop + 1;
}

type FlowNode = { parentElement: FlowNode | null; nextElementSibling: FlowNode | null; getBoundingClientRect(): { top: number; bottom: number; height: number } };
type FlowStyle = { display: string; position: string; marginTop: string; marginBottom: string; paddingBottom: string; borderBottomWidth: string };

/** The page's height below the body, in flow (the 17px fix): what follows it inside each ancestor up to the root,
 *  with its bottom margin and their bottom paddings and borders. A parent's own height is never read, so a
 *  min-height stretch (the page's 100dvh) does not count and the body's height cannot feed back into it. Hidden,
 *  fixed or absolute elements, and ones beside it rather than below it, are left out. */
export function programFlowBelow<N extends FlowNode>(host: N, root: FlowNode, style: (node: FlowNode) => FlowStyle): number {
  const px = (value: string) => parseFloat(value) || 0;
  let below = 0;
  for (let node: FlowNode = host; node !== root && node.parentElement; node = node.parentElement) {
    const end = node.getBoundingClientRect().bottom;
    below += px(style(node).marginBottom);
    for (let next = node.nextElementSibling; next; next = next.nextElementSibling) {
      const own = style(next), box = next.getBoundingClientRect();
      if (own.display === 'none' || own.position === 'fixed' || own.position === 'absolute' || box.top < end - 1) continue;
      below += box.height + px(own.marginTop) + px(own.marginBottom);
    }
    const parent = style(node.parentElement);
    below += px(parent.paddingBottom) + px(parent.borderBottomWidth);
  }
  return below;
}
