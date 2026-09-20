import { toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef, type PersonalWorkspacePocFlow, type PersonalWorkspacePocState } from '../personal-workspace-poc-contract';
import type { ProgramLegacyItemContext } from './legacy-source-context';
import { validateProgramLegacyMapPlanGroups, type ProgramLegacyMapPlanSelection } from './program-legacy-map-plan-contract';

/** Program private intent only. Neither the source catalog nor legacy state is rewritten. */
export type ProgramLegacyPlanSelection = {
  savedCopyId: string; flowId: string; sourceToken: string;
  catalogItemRefs: string[]; includedItemRefs: string[];
  personalAnchor?: string;
  planDates: Record<string, string | null>;
};
export type ProgramLegacyPlanSelections = { version: 1; flows: Record<string, ProgramLegacyPlanSelection>; groups?:Record<string,ProgramLegacyMapPlanSelection> };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v)) && Object.entries(Object.getOwnPropertyDescriptors(v)).every(([k,d]) => !['__proto__','constructor','prototype'].includes(k) && 'value' in d);
const id = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 1200 && !['__proto__','constructor','prototype'].includes(v);
export const programLegacyPlanDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0,10) === v;
const refs = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.length <= 10000 && v.every(id) && new Set(v).size === v.length;
export function validateProgramLegacyPlanSelections(v: unknown): v is ProgramLegacyPlanSelections {
  if (!record(v) || v.version !== 1 || Object.keys(v).some(k=>!['version','flows','groups'].includes(k)) || !record(v.flows) || v.groups!==undefined&&!validateProgramLegacyMapPlanGroups(v.groups)) return false;
  return Object.entries(v.flows).every(([ref, entry]) => id(ref) && record(entry)
    && Object.keys(entry).every(k => ['savedCopyId','flowId','sourceToken','catalogItemRefs','includedItemRefs','personalAnchor','planDates'].includes(k))
    && id(entry.savedCopyId) && id(entry.flowId) && toPersonalWorkspacePocFlowRef(entry.savedCopyId, entry.flowId) === ref && typeof entry.sourceToken === 'string' && entry.sourceToken.length > 0 && entry.sourceToken.length <= 2000000
    && refs(entry.catalogItemRefs) && refs(entry.includedItemRefs) && entry.includedItemRefs.every(ref => (entry.catalogItemRefs as string[]).includes(ref))
    && entry.catalogItemRefs.every(ref => { try { const parts = ref.split(':'); return parts.length === 4 && toPersonalWorkspacePocFlowItemRef(entry.savedCopyId as string,entry.flowId as string,decodeURIComponent(parts[3])) === ref; } catch { return false; } })
    && (entry.personalAnchor === undefined || programLegacyPlanDate(entry.personalAnchor)) && record(entry.planDates)
    && Object.entries(entry.planDates).every(([ref,date]) => (entry.catalogItemRefs as string[]).includes(ref) && (date === null || programLegacyPlanDate(date))))
    && Object.values((v.groups??{}) as Record<string,ProgramLegacyMapPlanSelection>).every(group=>group.childFlowRefs.every(ref=>{const mode=group.childModes[ref],anchor=mode.mode==='fixed-child'?mode.anchor:group.personalAnchor;const flow=(v.flows as Record<string,ProgramLegacyPlanSelection>)[ref];return !!flow&&(anchor===undefined||flow.personalAnchor===anchor);}));
}
function canonical(v: unknown): string { return JSON.stringify(v, (_k,x) => record(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k,x[k]])) : x); }
export function programLegacyPlanSourceToken(flow: PersonalWorkspacePocFlow, contexts?: ReadonlyMap<string, ProgramLegacyItemContext>): string {
  return canonical({ flow, contexts: contexts ? [...contexts].sort(([a],[b]) => a.localeCompare(b)) : [] });
}
/** Source changes never silently turn a previously unselected/new item into an included item. */
export function programLegacyPlanItemIncluded(owner: ProgramLegacyPlanSelection | undefined, itemRef: string): boolean {
  return !owner || owner.includedItemRefs.includes(itemRef);
}
export function programLegacyPlanExecutionDate(owner: ProgramLegacyPlanSelection | undefined, state: PersonalWorkspacePocState, itemRef: string, fallback: string | null): string | null {
  const placement = state.placements[itemRef];
  if (placement?.scheduleMode === 'fixed_date') return placement.date ?? null;
  if (placement?.scheduleMode === 'unscheduled') return null;
  return owner && Object.hasOwn(owner.planDates, itemRef) ? owner.planDates[itemRef] : fallback;
}
