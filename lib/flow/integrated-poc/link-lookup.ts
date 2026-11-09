import type { ProgramData, ProgramPrivateSpace, ProgramPublicFlow, ProgramPublicVersion } from './contract';
import { programDocumentContentLock } from './reference-execution-guard';
import { classifyProgramUrl } from './output';
import { isPublicCatalogFlowOnHold } from '../public-source-review-policy';
import { programDateHeaderPlan } from './input-bar';

/** Flow pipeline stage 4 (S8, 11/8): a link pasted into Flow 찾기 finds the public Flows made from it — the same source
 *  link on the Flow, or on one of its items. Everything compared is already on this device: the public repository comes
 *  whole with every account read (flowme_alpha_read_full_v2 / social_read_v1), so nothing is fetched and nothing new is
 *  sent. Links are compared by one key: the existing safe, canonical form (https, host, path without the trailing slash,
 *  tracking parameters gone, the rest sorted), and `www.`/`m.` and youtu.be folded. */
const BARE_VIDEO_LINK = /^(?:(?:m\.)?youtube\.com|youtu\.be)(?:[/?#]\S*)?$/i;
const LINK_TEXT = /^(?:https?:\/\/|www\.)\S+$/i;
/** Whether the search text is a link (a pasted address), not words to search for. */
export function programLooksLikeLink(text: string): boolean {
  const value = text.trim();
  return LINK_TEXT.test(value) || BARE_VIDEO_LINK.test(value);
}
/** The address a link is kept and shown as (its canonical form), or null when it is not a public http(s) link we take
 *  (credentials, a local or unsafe host, a sensitive parameter, another scheme). */
export function programCanonicalLink(text: string): string | null {
  const value = text.trim(), withScheme = /^www\./i.test(value) || BARE_VIDEO_LINK.test(value) ? `https://${value}` : value;
  const classified = classifyProgramUrl(withScheme, []);
  return classified.kind === 'invalid' ? null : classified.url;
}
/** The key two links are the same by. */
export function programLinkKey(text: string): string | null {
  const canonical = programCanonicalLink(text);
  if (!canonical) return null;
  const url = new URL(canonical);
  let host = url.hostname.replace(/^(?:www|m)\./, '');
  if (host === 'youtu.be' && url.pathname.length > 1) { url.searchParams.set('v', url.pathname.slice(1)); url.pathname = '/watch'; host = 'youtube.com'; }
  if (host === 'youtube.com' && /^\/shorts\/[^/]+$/.test(url.pathname)) { url.searchParams.set('v', url.pathname.split('/')[2]); url.pathname = '/watch'; }
  if (host === 'youtube.com' && url.pathname === '/watch') for (const key of [...url.searchParams.keys()]) if (key !== 'v') url.searchParams.delete(key);
  const query = [...url.searchParams.entries()].sort(([a, x], [b, y]) => a.localeCompare(b) || x.localeCompare(y));
  return `${host}${url.pathname}${query.length ? `?${new URLSearchParams(query).toString()}` : ''}`;
}

export type ProgramLinkMatch = { flow: ProgramPublicFlow; version: ProgramPublicVersion; on: 'flow' | 'item'; items: string[] };
/** The listed public Flows (not taken back, not held) whose current version names this link: as its source, or as an
 *  item's source (then those items' titles). Flow-level matches first, in the list's own order. */
export function programFlowsByLink(data: Pick<ProgramData, 'public'>, text: string): ProgramLinkMatch[] {
  const key = programLinkKey(text);
  if (!key) return [];
  const matches: ProgramLinkMatch[] = [];
  for (const flow of data.public.flows) {
    if (flow.archived || isPublicCatalogFlowOnHold(flow.id)) continue;
    const version = data.public.versions.find(row => row.id === flow.currentVersionId);
    if (!version) continue;
    const items = version.items.filter(item => item.sourceUrl && programLinkKey(item.sourceUrl) === key).map(item => item.title);
    if (version.source.url && programLinkKey(version.source.url) === key) matches.push({ flow, version, on: 'flow', items });
    else if (items.length) matches.push({ flow, version, on: 'item', items });
  }
  return [...matches.filter(row => row.on === 'flow'), ...matches.filter(row => row.on === 'item')];
}

/** [내 글에 링크로 두기]: the document with `- {link}` as a memo line under today's head line — at the end of today's block,
 *  or a new head for today where input v2's date chip would put it (programDateHeaderPlan: no line moves to another
 *  head, no task changes its date). Null when the link is not one we keep. */
export function programLinkMemoRaw(raw: string, today: string, text: string): string | null {
  const link = programCanonicalLink(text);
  if (!link) return null;
  const plan = programDateHeaderPlan(raw, 0, today);
  if (!plan) return null;
  const next = raw.slice(0, plan.offset) + plan.text + raw.slice(plan.offset);
  return next.slice(0, plan.caret) + `- ${link}` + next.slice(plan.caret);
}
/** Where [내 글에 링크로 두기] writes: the writing document whose caret was kept last (the one I was writing in), while it
 *  is mine to write in (not a Flow document, not archived, trashed or kept for recovery) and holds no input waiting. */
export function programLinkHome(space: ProgramPrivateSpace, pending: readonly string[]): string | null {
  const id = space.position?.documentId;
  if (!id || pending.includes(id) || !space.text.documents.some(doc => doc.id === id)) return null;
  return programDocumentContentLock(space, id) === 'active' ? id : null;
}
/** [이 링크로 Flow 만들기] writes `- 출처: {link}` into a new document; its first such line fills the publication draft's
 *  source link (S7), so the link is not typed twice. */
export const PROGRAM_SOURCE_LINE = /^- 출처: (https?:\/\/\S+)\s*$/;
export function programDocumentSourceLink(raw: string): string | null {
  for (const line of raw.split('\n')) { const match = PROGRAM_SOURCE_LINE.exec(line); if (match) return programCanonicalLink(match[1]); }
  return null;
}
