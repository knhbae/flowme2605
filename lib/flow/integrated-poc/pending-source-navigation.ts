/** One ephemeral source intent. No content, persistence, timer or retry owner. */
export function createPendingProgramSourceNavigation() {
  let current: object | null = null;
  return {
    cancel() { current = null; },
    begin(valid: () => boolean) {
      const token = {};
      current = token;
      const isCurrent = () => current === token && valid();
      let waiting: Promise<boolean> | null = null;
      return {
        isCurrent,
        wait(ready: () => Promise<boolean>): Promise<boolean> {
          if (!waiting) waiting = (async () => {
            if (!isCurrent()) return false;
            try { return await ready() && isCurrent(); } catch { return false; }
          })();
          return waiting;
        },
      };
    },
  };
}

/** Wait only the captured operation; a replacement never extends this wait. */
export async function programSourceNavigationReady(
  operation: Promise<{ ok: boolean }> | null,
  current: () => boolean,
  ready: () => boolean,
): Promise<boolean> {
  if (!current()) return false;
  try { if (operation && !(await operation).ok) return false; } catch { return false; }
  return current() && ready();
}
