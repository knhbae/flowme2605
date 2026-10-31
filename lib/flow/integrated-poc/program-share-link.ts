import { parseProgramLocation, programLocation } from './navigation';

// FC5 (FC-SPEC, UX feature-gap 13): a version-pinned link to a public Flow, shared or copied, and one return to the
// same place after a sign-in redirect. The link is the existing location fragment; it carries only the public Flow
// and version IDs, never an account or document ID.

/** `<page>#flowme/flow/<flowId>?version=<versionId>`; null when the IDs would not read back as that exact place. */
export function programFlowShareUrl(page: string, flowId: string, versionId: string): string | null {
  const hash = programLocation({ view: 'flow', id: flowId, versionId });
  const back = parseProgramLocation(hash);
  return back.view === 'flow' && back.id === flowId && back.versionId === versionId && !back.itemId ? `${page}${hash}` : null;
}

export type ProgramShareOutcome = 'shared' | 'copied' | 'cancelled' | 'fallback';
export type ProgramSharePort = { share?: (url: string) => Promise<void>; copy?: (text: string) => Promise<void> };
/** A phone's share sheet first when the host offers one, else the clipboard; a cancelled sheet says nothing, and any
 *  other failure falls back to showing the link to copy by hand. A share that never settles (a browser that offers
 *  navigator.share without a sheet) also shows the link after `waitMs`, so the button is never left waiting. */
export async function shareProgramLink(url: string, port: ProgramSharePort, waitMs = 20_000): Promise<ProgramShareOutcome> {
  if (port.share) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stalled = new Promise<'stalled'>(resolve => { timer = setTimeout(() => resolve('stalled'), waitMs); });
    try { if (await Promise.race([port.share(url).then(() => 'done' as const), stalled]) === 'stalled') return 'fallback'; return 'shared'; }
    catch (error) { if ((error as { name?: unknown } | null)?.name === 'AbortError') return 'cancelled'; }
    finally { clearTimeout(timer); }
  }
  if (port.copy) { try { await port.copy(url); return 'copied'; } catch { /* the link is shown instead */ } }
  return 'fallback';
}

/** Session storage (this tab, survives the sign-in redirect), read once and only within half an hour. */
export const PROGRAM_RETURN_KEY = 'flowme-alpha-return/1';
export const PROGRAM_RETURN_MS = 30 * 60_000;
/** Only a public Flow detail, with or without its version, read back exactly: never a document, draft or item
 *  (FC5 review 1: those would put private IDs in storage). */
const publicFlowPlace = (hash: string) => {
  if (typeof hash !== 'string') return false;
  const place = parseProgramLocation(hash);
  return place.view === 'flow' && !!place.id && !place.itemId && programLocation(place) === hash;
};
/** Drops any remembered place: every sign-in attempt starts without the last one's (FC5 review 2). */
export function forgetProgramReturn(storage: Pick<Storage, 'removeItem'> | null): void {
  try { storage?.removeItem(PROGRAM_RETURN_KEY); } catch { /* nothing kept to return to */ }
}
/** Before the sign-in redirect drops the fragment: forgets the last attempt's place, then remembers this one when it
 *  is a public Flow detail. */
export function rememberProgramReturn(storage: Pick<Storage, 'setItem' | 'removeItem'> | null, hash: string, now: number): boolean {
  forgetProgramReturn(storage);
  if (!storage || !publicFlowPlace(hash)) return false;
  try { storage.setItem(PROGRAM_RETURN_KEY, JSON.stringify({ hash, at: now })); return true; } catch { return false; }
}
/** The remembered place, once: the entry is removed on every read, and an old or unreadable one returns nothing. */
export function takeProgramReturn(storage: Pick<Storage, 'getItem' | 'removeItem'> | null, now: number): string | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PROGRAM_RETURN_KEY);
    storage.removeItem(PROGRAM_RETURN_KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== 'object') return null;
    const { hash, at } = value as { hash?: unknown; at?: unknown };
    return typeof hash === 'string' && typeof at === 'number' && at <= now && now - at <= PROGRAM_RETURN_MS && publicFlowPlace(hash) ? hash : null;
  } catch { return null; }
}
