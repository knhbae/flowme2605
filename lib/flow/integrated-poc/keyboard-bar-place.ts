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

/** Less than one line (the textarea's 20px top padding and a 26px line) between the body's top and the bar:
 *  what is being typed would sit under the bar. */
export function programKeyboardBarCramped(bodyTop: number, barTop: number): boolean {
  return barTop - bodyTop < 46;
}
