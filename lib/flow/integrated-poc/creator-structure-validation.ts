import { loadBundledStructureTemplateCatalog } from '../personal-workspace-poc-structure-template/catalog';
import { validateStructureDraftContract } from '../personal-workspace-poc-structure-template/draft-validation';
import type { StructureDraft, GroupInstance, StructureTemplateValue, StructureTemplateFieldDefinition } from '../personal-workspace-poc-structure-template/types';
import type { ProgramCreatorStructureSidecar } from './creator-structure-sidecar';

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const keys = (v: Record<string, unknown>, required: string[], optional: string[] = []) => required.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => required.includes(k) || optional.includes(k));
const stamp = (v: unknown): v is string => text(v) && Number.isFinite(Date.parse(v));
const fingerprint = (v: unknown): v is string => typeof v === 'string' && (v === 'raw-v1:0:0ztntfp' || /^raw-v2:\d+:[a-f0-9]{64}$/.test(v));

function value(v: unknown, depth = 0): v is StructureTemplateValue {
  if (depth > 10) return false;
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  return Array.isArray(v) ? v.every(x => value(x, depth + 1)) : record(v) && Object.keys(v).every(k => !['__proto__', 'constructor', 'prototype'].includes(k)) && Object.values(v).every(x => value(x, depth + 1));
}
function values(v: unknown): v is Record<string, StructureTemplateValue> { return record(v) && value(v); }
function fieldValues(v: Record<string, StructureTemplateValue>, fields: readonly StructureTemplateFieldDefinition[]): boolean {
  return Object.entries(v).every(([key, val]) => {
    const field = fields.find(f => f.slotId === key); if (!field) return false;
    if (val === null || val === '') return true;
    if (field.type === 'weekday_set' || field.type === 'check_rows') return Array.isArray(val) && val.every(x => typeof x === 'string');
    if (field.type === 'positive_integer' || field.type === 'relative_day_offset') return typeof val === 'number' && Number.isFinite(val);
    return typeof val === 'string';
  });
}
function group(v: unknown, depth = 0): v is GroupInstance {
  return depth < 10 && record(v) && keys(v, ['instanceId', 'groupId', 'order', 'values', 'children']) && text(v.instanceId) && v.instanceId !== 'root' && text(v.groupId) && integer(v.order) && values(v.values) && Array.isArray(v.children) && v.children.every(x => group(x, depth + 1));
}
function materialized(v: unknown): boolean {
  return record(v) && keys(v, ['transactionId', 'at', 'sourceRevisionId', 'insertedRange']) && text(v.transactionId) && stamp(v.at) && text(v.sourceRevisionId)
    && record(v.insertedRange) && keys(v.insertedRange, ['start', 'end']) && integer(v.insertedRange.start) && integer(v.insertedRange.end) && v.insertedRange.end >= v.insertedRange.start;
}

/** Persistence admits incomplete/invalid user field values, but never unknown schema,
 * slots, group ownership or extra payload. Readiness remains the compiler's gate. */
export function validateProgramCreatorStructureSidecar(v: unknown, draftId?: string): v is ProgramCreatorStructureSidecar {
  try {
    if (!record(v) || !keys(v, ['catalogVersion', 'draft'], ['materialization']) || !record(v.draft) || JSON.stringify(v).length > 1_000_000) return false;
    const d = v.draft;
    if (!keys(d, ['schemaVersion', 'draftId', 'templateId', 'templateVersion', 'sourceFingerprint', 'values', 'groups', 'dismissedSlots', 'materialized', 'revision', 'updatedAt'], ['sourceRevisionId'])
      || d.schemaVersion !== 'p0.2' || !text(d.draftId) || (draftId !== undefined && d.draftId !== draftId) || !text(d.templateId) || !text(d.templateVersion) || !fingerprint(d.sourceFingerprint)
      || (d.sourceRevisionId !== undefined && !text(d.sourceRevisionId)) || !values(d.values) || !Array.isArray(d.groups) || !d.groups.every(x => group(x))
      || !Array.isArray(d.dismissedSlots) || !integer(d.revision) || d.revision < 1 || !stamp(d.updatedAt) || !(d.materialized === false || materialized(d.materialized))) return false;
    const catalog = loadBundledStructureTemplateCatalog(), definition = catalog.templates.find(t => t.templateId === d.templateId && t.version === d.templateVersion);
    if (v.catalogVersion !== catalog.catalogVersion || !definition) return false;
    // Missing fields and temporarily invalid URLs/dates/numbers must survive reload.
    if (validateStructureDraftContract(definition, d as StructureDraft).some(p => p.kind !== 'missing_required_value' && p.kind !== 'invalid_field_value')) return false;
    if (!fieldValues(d.values, definition.setupFields)) return false;
    const scopes = new Map<string, readonly string[]>([['root', definition.setupFields.map(f => f.slotId)]]);
    let validFields = true;
    const visit = (gs: readonly GroupInstance[], defs: typeof definition.groups) => { for (const g of gs) { const def = defs.find(x => x.groupId === g.groupId)!; validFields = validFields && fieldValues(g.values, def.fields); scopes.set(g.instanceId, def.fields.map(f => f.slotId)); visit(g.children, def.childGroups ?? []); } };
    visit(d.groups as GroupInstance[], definition.groups);
    if (!validFields) return false;
    const seen = new Set<string>();
    for (const s of d.dismissedSlots) { if (!record(s) || !keys(s, ['scopeInstanceId', 'slotId']) || !text(s.scopeInstanceId) || !text(s.slotId) || !scopes.get(s.scopeInstanceId)?.includes(s.slotId)) return false; const k = JSON.stringify([s.scopeInstanceId, s.slotId]); if (seen.has(k)) return false; seen.add(k); }
    if (d.materialized === false) return v.materialization === undefined;
    const m = v.materialization;
    return record(m) && keys(m, ['transactionId', 'beforeSourceFingerprint', 'afterSourceFingerprint']) && record(d.materialized)
      && m.transactionId === d.materialized.transactionId && m.beforeSourceFingerprint === d.sourceFingerprint && fingerprint(m.afterSourceFingerprint) && m.afterSourceFingerprint !== m.beforeSourceFingerprint;
  } catch { return false; }
}

export function validateProgramCreatorStructureSidecars(value: unknown, draftIds?: readonly string[]): value is Record<string, ProgramCreatorStructureSidecar> {
  return record(value) && Object.keys(value).every(id => !['__proto__', 'constructor', 'prototype'].includes(id) && (!draftIds || draftIds.includes(id)) && validateProgramCreatorStructureSidecar(value[id], id));
}
