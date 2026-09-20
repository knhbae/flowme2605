import { programLocation, parseProgramLocation } from './navigation';
export type ProgramOutputReturnTarget = { documentId: string; executionKey: string };
/** Only the current loopback PoC page, never a deployment/account/sync address. */
export function programOutputReturnBase(pageUrl: string | undefined): string | null {
  try {
    if (!pageUrl || pageUrl.length > 40000) return null;
    const url = new URL(pageUrl);
    if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || url.username || url.password || url.pathname !== '/my' || url.search !== '?personalWorkspacePoc=v1') return null;
    return `${url.origin}/my?personalWorkspacePoc=v1`;
  } catch { return null; }
}
export function programOutputReturnUrl(pageUrl: string | undefined, actorId: string, target: ProgramOutputReturnTarget | undefined): string | null {
  const base = programOutputReturnBase(pageUrl); if (!base || !target) return null;
  const hash = programLocation({ view: 'space', id: target.documentId, returnActorId: actorId, executionKey: target.executionKey });
  const parsed = parseProgramLocation(hash);
  return parsed.id === target.documentId && parsed.returnActorId === actorId && parsed.executionKey === target.executionKey ? `${base}${hash}` : null;
}
