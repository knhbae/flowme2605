import type { ProgramPublicVersion } from './contract';
import type { ProgramDiscoveryDetailPresentation } from './navigation';
import { programDate, programIdentifier, programShape, programRecord } from './program-data';
import { isProgramOutputRecurrenceWindow, validProgramOutputRecurrenceStarts, inspectProgramOutputSeries } from './public-output-recurrence';

/** Public output presentation only. Never an execution target, actor or persisted state. */
export type ProgramPublicOutputReturn = { version: 1; origin: string; flowId: string; versionId: string; itemId: string; detail: ProgramDiscoveryDetailPresentation };
export function programPublicOutputBase(input: string): string | null {
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/my'
      || url.search !== '?personalWorkspacePoc=v1') return null;
    return `${url.origin}/my?personalWorkspacePoc=v1`;
  } catch { return null; }
}
export function readProgramPublicOutputReturn(token: unknown): ProgramPublicOutputReturn | null {
  try {
    if (typeof token !== 'string' || token.length > 24000) return null;
    const value = JSON.parse(token);
    if (!programShape(value, ['version','origin','flowId','versionId','itemId','detail']) || value.version !== 1
      || ![value.flowId,value.versionId,value.itemId].every(programIdentifier)
      || typeof value.origin !== 'string' || new URL(value.origin).origin !== value.origin
      || !programPublicOutputBase(`${value.origin}/my?personalWorkspacePoc=v1`)) return null;
    const d = value.detail;
    if (!programShape(d, ['selectedItemIds','anchor','format', ...(Object.hasOwn(d ?? {}, 'recurrenceWindow') ? ['recurrenceWindow'] : []), ...(Object.hasOwn(d ?? {}, 'recurrenceStarts') ? ['recurrenceStarts'] : [])])
      || !Array.isArray(d.selectedItemIds) || !d.selectedItemIds.length || d.selectedItemIds.length > 1200
      || !d.selectedItemIds.every(programIdentifier) || new Set(d.selectedItemIds).size !== d.selectedItemIds.length
      || !d.selectedItemIds.includes(value.itemId as string) || !(d.anchor === '' || programDate(d.anchor))
      || typeof d.format !== 'string' || !['txt','csv','ics'].includes(d.format)
      || d.recurrenceWindow !== undefined && !isProgramOutputRecurrenceWindow(d.recurrenceWindow)
      || d.recurrenceStarts !== undefined && (!programRecord(d.recurrenceStarts) || !Object.entries(d.recurrenceStarts).every(([id,date]) => programIdentifier(id) && programDate(date)))) return null;
    return value as ProgramPublicOutputReturn;
  } catch { return null; }
}
export function resolveProgramPublicOutputReturn(token: unknown, currentUrl: string, version: ProgramPublicVersion | undefined, itemId: string | undefined): ProgramDiscoveryDetailPresentation | null {
  const value = readProgramPublicOutputReturn(token), base = programPublicOutputBase(currentUrl);
  if (!value || !base || !version || value.origin !== new URL(base).origin || value.flowId !== version.flowId
    || value.versionId !== version.id || value.itemId !== itemId) return null;
  const d = value.detail;
  if (d.selectedItemIds.some(id => !version.items.some(item => item.id === id))
    || d.recurrenceStarts && !validProgramOutputRecurrenceStarts(d.recurrenceStarts, version.items)) return null;
  for (const item of version.items.filter(item => d.selectedItemIds.includes(item.id))) {
    if (item.schedule.kind === 'relative' && !d.anchor) return null;
    if (item.schedule.kind === 'recurring') {
      const series = inspectProgramOutputSeries({...item, schedule:item.schedule}, d.anchor || null, d.recurrenceStarts?.[item.id], d.recurrenceWindow);
      if (!series || !d.recurrenceWindow || d.format === 'ics' && !series.dates.length) return null;
    }
  }
  return d;
}
