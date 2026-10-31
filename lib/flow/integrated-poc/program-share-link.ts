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
 *  other failure falls back to showing the link to copy by hand. */
export async function shareProgramLink(url: string, port: ProgramSharePort): Promise<ProgramShareOutcome> {
  if (port.share) {
    try { await port.share(url); return 'shared'; }
    catch (error) { if ((error as { name?: unknown } | null)?.name === 'AbortError') return 'cancelled'; }
  }
  if (port.copy) { try { await port.copy(url); return 'copied'; } catch { /* the link is shown instead */ } }
  return 'fallback';
}

/** Session storage (this tab, survives the sign-in redirect), read once and only within half an hour. */
export const PROGRAM_RETURN_KEY = 'flowme-alpha-return/1';
export const PROGRAM_RETURN_MS = 30 * 60_000;
const meaningful = (hash: string) => typeof hash === 'string' && hash !== '#flowme/space' && programLocation(parseProgramLocation(hash)) === hash;
/** Remembers an exact, readable place (not the default space) before the sign-in redirect drops the fragment. */
export function rememberProgramReturn(storage: Pick<Storage, 'setItem'> | null, hash: string, now: number): boolean {
  if (!storage || !meaningful(hash)) return false;
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
    return typeof hash === 'string' && typeof at === 'number' && at <= now && now - at <= PROGRAM_RETURN_MS && meaningful(hash) ? hash : null;
  } catch { return null; }
}
