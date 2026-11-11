/**
 * W-VER-01~03 (기획 prd-version-20261111-1008, 총괄 11/11): a screen opened before a deploy keeps running the old
 * code (11/11 08:40, a tablet saved with an int6a-era bundle for hours). The page knows its own build (the
 * `flowme-build` meta of the HTML it was loaded with) and asks the server's (the `X-FlowMe-Build` header of the light
 * health answer) when the screen shows again and every 15 minutes while it shows. Comparing changes nothing on the
 * screen, in the text or in the save state; a different build only raises the notice. The page never reloads by itself.
 */
export const ALPHA_VERSION = Object.freeze({
  meta: 'flowme-build', header: 'X-FlowMe-Build', path: '/api/alpha/health',
  /** A screen left open asks again this often (within the hour, W-VER-01). */
  everyMs: 15 * 60_000,
  /** Showing again within this gap does not ask again. */
  gapMs: 30_000,
  /** [새로 고침] waits this long for the input to be saved, then gives up and says so (W-VER-03). */
  waitMs: 30_000,
});

const BUILD = /^[\w-]{1,64}$/;

/** The build of the HTML this page was loaded with; '' when unknown (then nothing is compared). */
export function alphaOwnBuild(doc: Pick<Document, 'querySelector'> | null | undefined): string {
  const value = doc?.querySelector(`meta[name="${ALPHA_VERSION.meta}"]`)?.getAttribute('content')?.trim() ?? '';
  return BUILD.test(value) ? value : '';
}

/** The server's build when it is known and not this page's own; else null. */
export function alphaNewerBuild(own: string, served: string | null | undefined): string | null {
  const value = served?.trim() ?? '';
  return own && BUILD.test(own) && BUILD.test(value) && value !== own ? value : null;
}

export type AlphaVersionWatch = { check: (force?: boolean) => Promise<string | null> };

/** One comparison at a time, at most once per gap unless forced. A failed answer is no answer (no notice). */
export function createAlphaVersionWatch(options: { own: string; served: () => Promise<string | null>; onNewer: (build: string) => void;
  now: () => number }): AlphaVersionWatch {
  let last = -Infinity, running: Promise<string | null> | null = null;
  return {
    check(force = false) {
      if (!options.own) return Promise.resolve(null);
      if (running) return running;
      if (!force && options.now() - last < ALPHA_VERSION.gapMs) return Promise.resolve(null);
      last = options.now();
      running = options.served().then(served => {
        const newer = alphaNewerBuild(options.own, served);
        if (newer) options.onNewer(newer);
        return newer;
      }, () => null).finally(() => { running = null; });
      return running;
    },
  };
}

/** The served build from the health answer's header (any status: a 503 still names its build). */
export async function fetchAlphaServedBuild(fetcher: typeof fetch = fetch): Promise<string | null> {
  const response = await fetcher(ALPHA_VERSION.path, { cache: 'no-store', credentials: 'same-origin' });
  return response.headers.get(ALPHA_VERSION.header);
}
