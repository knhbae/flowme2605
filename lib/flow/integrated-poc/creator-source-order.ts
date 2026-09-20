import { parsePersonalWorkspacePocAuthoring as parse, fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from '../personal-workspace-poc-authoring';
import type { TextLine } from './text-workspace';
import type { DateOrderSelection } from './date-block-order';

/** Program working-source identity, never a replacement for immutable materializer provenance. */
export type ProgramCreatorSourceIdentity = { version: 1; rawText: string; sourceFingerprint: string; lines: TextLine[] };
export const creatorNativeText = (raw: string) => raw.replace(/\r\n?/gu,'\n');
export const creatorSourceOffsetToNative = (raw: string, offset: number) => creatorNativeText(raw.slice(0,offset)).length;
export function creatorNativeOffsetToSource(raw: string, offset: number) {
  let source=0,native=0;
  while(source<raw.length && native<offset){source += raw[source]==='\r' && raw[source+1]==='\n' ? 2 : 1;native++;}
  return source;
}
export function validCreatorSourceIdentity(value: unknown, raw?: string): value is ProgramCreatorSourceIdentity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as ProgramCreatorSourceIdentity;
  return Object.keys(v).sort().join(',') === 'lines,rawText,sourceFingerprint,version' && v.version === 1 && typeof v.rawText === 'string' && v.rawText.length <= 100000
    && (raw === undefined || raw === v.rawText) && fingerprint(v.rawText) === v.sourceFingerprint && Array.isArray(v.lines) && v.lines.length <= 100001
    && v.lines.every(l => !!l && Object.keys(l).sort().join(',') === 'id,text' && typeof l.id === 'string' && !!l.id.trim() && l.id.length <= 1200 && !['__proto__','prototype','constructor'].includes(l.id)
      && typeof l.text === 'string' && !/[\r\n]/u.test(l.text)) && new Set(v.lines.map(l => l.id)).size === v.lines.length
    && v.lines.map(l => l.text).join('\n') === v.rawText.replace(/\r\n?/gu, '\n');
}
export function creatorSourceIdentity(rawText: string, lines: readonly TextLine[]): ProgramCreatorSourceIdentity {
  return { version: 1, rawText, sourceFingerprint: fingerprint(rawText), lines: lines.map(l => ({ ...l })) };
}
export type CreatorSourceOrderPlan = { status: 'blocked'; reason: string } | { status: 'noop' } | {
  status: 'ready'; before: ProgramCreatorSourceIdentity; after: ProgramCreatorSourceIdentity;
  beforeTitles: string[]; afterTitles: string[]; selectionBefore: DateOrderSelection; selectionAfter: DateOrderSelection;
  replacement: { start: number; end: number; text: string };
};
/** A read-only Calendar result's first-row ranks, bound to the exact working source.
 * Repeated occurrences must map to a single source block. Unranked blocks follow
 * Calendar blocks in their original relative order, matching D2 alignment. */
export type CreatorCalendarSourceRanks = { sourceFingerprint: string; sourceLines: readonly number[] };
/** K4 body/gap-slot permutation. Real authoring parser owns dates and item boundaries.
 * A block includes every owned property/subcheck, including unknown properties.
 * Undated items occupy their existing slots; no occurrence is fabricated for a series.
 */
export function planCreatorSourceOrder(identity: ProgramCreatorSourceIdentity, stepLine: number, selection: DateOrderSelection, calendar?: CreatorCalendarSourceRanks): CreatorSourceOrderPlan {
  const blocked = (reason: string): CreatorSourceOrderPlan => ({ status: 'blocked', reason });
  if (!validCreatorSourceIdentity(identity)) return blocked('invalid-identity');
  const raw = identity.rawText, parsed = parse(raw), lines = parsed.fidelityManifest.sourceLines;
  if (calendar && (calendar.sourceFingerprint !== identity.sourceFingerprint || !Array.isArray(calendar.sourceLines)
    || new Set(calendar.sourceLines).size !== calendar.sourceLines.length
    || calendar.sourceLines.some(line => !Number.isInteger(line) || !parsed.items.some(item => item.sourceLine === line)))) return blocked('invalid-calendar-ranks');
  if (!Number.isInteger(stepLine) || !/^##\s+\S/u.test(lines[stepLine - 1]?.rawLine ?? '')) return blocked('explicit-step-required');
  if (![selection.start,selection.end].every(Number.isInteger) || selection.start < 0 || selection.end < selection.start || selection.end > raw.length || !['none','forward','backward'].includes(selection.direction)) return blocked('invalid-selection');
  const limit = lines.find(l => l.line > stepLine && /^#{1,2}\s/u.test(l.rawLine))?.line ?? lines.length + 1;
  if (parsed.blockingIssues.some(i => !i.line || i.line > stepLine && i.line < limit)) return blocked('unsupported-source');
  const items = parsed.items.filter(i => i.sourceLine > stepLine && i.sourceLine < limit);
  if (items.length < 2) return { status: 'noop' };
  if (!calendar && items.some(i => i.recurrence || i.relativeDate)) return blocked('relative-or-series-order');
  const offsets: number[] = []; let offset = 0;
  lines.forEach(l => { offsets.push(offset); offset += l.locator.rawText.length; });
  const bodies = items.map((item,index) => {
    const endLine = (items[index+1]?.sourceLine ?? limit) - 1;
    let last = endLine; while (last > item.sourceLine && !lines[last-1].rawLine.trim()) last--;
    const owned = lines.slice(item.sourceLine-1,last);
    // Fidelity marks unknown properties as source-only but still records their owner.
    const unsafe = owned.some(l => l.line !== item.sourceLine && l.rawLine.trim() && l.ownerItemLine !== item.sourceLine);
    const start = offsets[item.sourceLine-1], end = offsets[last-1] + lines[last-1].rawLine.length;
    return { item, last, start, end, unsafe, text: raw.slice(start,end), rows: identity.lines.slice(item.sourceLine-1,last) };
  });
  if (lines.slice(stepLine,items[0].sourceLine-1).some(l => l.rawLine.trim()) || bodies.some(b => b.unsafe)) return blocked('ambiguous-block-owner');
  const dated = bodies.filter(b => !!b.item.date).sort((a,b) => a.item.date!.localeCompare(b.item.date!) || (a.item.time ?? '').localeCompare(b.item.time ?? '') || a.item.sourceOrder-b.item.sourceOrder);
  let n=0;
  const rank = new Map(calendar?.sourceLines.map((line, index) => [line,index]));
  const sorted = calendar ? bodies.slice().sort((a,b) => (rank.get(a.item.sourceLine) ?? Infinity) - (rank.get(b.item.sourceLine) ?? Infinity)
    || a.item.sourceOrder-b.item.sourceOrder) : bodies.map(b => b.item.date ? dated[n++] : b);
  if (sorted.every((b,i) => b === bodies[i])) return { status: 'noop' };
  const start = bodies[0].start, end = bodies.at(-1)!.end, positions = new Map<typeof bodies[number],number>(); let nextOffset=start;
  const nextLines=identity.lines.slice(0,items[0].sourceLine-1);
  const text = sorted.map((body,i) => {
    positions.set(body,nextOffset); nextLines.push(...body.rows);
    const gap = i < bodies.length-1 ? raw.slice(bodies[i].end,bodies[i+1].start) : '';
    if(i < bodies.length-1) nextLines.push(...identity.lines.slice(bodies[i].last,bodies[i+1].item.sourceLine-1));
    nextOffset += body.text.length+gap.length; return body.text+gap;
  }).join('');
  nextLines.push(...identity.lines.slice(bodies.at(-1)!.last));
  const afterRaw=raw.slice(0,start)+text+raw.slice(end), after=creatorSourceIdentity(afterRaw,nextLines);
  if (!validCreatorSourceIdentity(after)) return blocked('line-permutation-mismatch');
  let selectionAfter={...selection};
  if (!(selection.end <= start || selection.start >= end)) {
    const body=bodies.find(b => selection.start >= b.start && selection.end <= b.end);
    if(!body)return blocked('selection-crosses-block');
    const delta=positions.get(body)!-body.start; selectionAfter={...selection,start:selection.start+delta,end:selection.end+delta};
  }
  return { status:'ready',before:creatorSourceIdentity(raw,identity.lines),after,beforeTitles:bodies.map(b=>b.item.title),afterTitles:sorted.map(b=>b.item.title),selectionBefore:{...selection},selectionAfter,replacement:{start,end,text} };
}
