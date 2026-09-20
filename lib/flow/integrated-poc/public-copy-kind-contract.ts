import { PROGRAM_COPY_KIND_HANDOFF, type ProgramCopy, type ProgramCopyField, type ProgramPrivateSpace, type ProgramPublicRepository } from './contract';
import { isValidAuthoringDate } from './native-creator-vendor/text-authoring/recurrence';
import { textWorkspaceModel as M } from './text-workspace';

const fields: ProgramCopyField[] = ['title', 'description', 'completionCriteria', 'sourceUrl', 'schedule', 'subchecks'];
const id = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 1200 && !['__proto__', 'constructor', 'prototype'].includes(v);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v)) && !Object.getOwnPropertySymbols(v).length
  && Object.entries(Object.getOwnPropertyDescriptors(v)).every(([key, d]) => !['__proto__', 'constructor', 'prototype'].includes(key) && d.enumerable && 'value' in d);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const date = (v: unknown) => v === null || typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) && isValidAuthoringDate(v);
const choice = (v: unknown) => record(v) && exact(v, ['present', 'value']) && typeof v.present === 'boolean' && date(v.value) && (v.present || v.value === null);

/** Optional, strict private extension. No read-time migration or guessed lineage. */
export function validateProgramCopyKindHandoffs(copy: ProgramCopy, space: ProgramPrivateSpace, repository: ProgramPublicRepository): boolean {
  if (copy.kindHandoffs === undefined) return true;
  try {
    const handoff = copy.kindHandoffs;
    if (!record(handoff) || !exact(handoff, ['version', 'items', 'entries']) || handoff.version !== PROGRAM_COPY_KIND_HANDOFF.version
      || !record(handoff.items) || !Object.keys(handoff.items).length || Object.keys(handoff.items).length > 2000
      || !Array.isArray(handoff.entries) || !handoff.entries.length || handoff.entries.length > PROGRAM_COPY_KIND_HANDOFF.entries) return false;
    const docs = [...space.text.documents, ...space.text.flows], retainedId = space.retentionDocuments?.[copy.documentId];
    if (!retainedId || !space.archivedDocumentIds.includes(retainedId)) return false;
    const item = (versionId: unknown, itemId: string) => {
      const versions = repository.versions.filter(version => version.id === versionId && version.flowId === copy.flowId);
      const items = versions.length === 1 ? versions[0].items.filter(item => item.id === itemId) : [];
      return items.length === 1 ? items[0] : null;
    };
    const ids = new Set<string>();
    for (const [itemId, pair] of Object.entries(handoff.items)) {
      if (!id(itemId) || !Object.hasOwn(copy.itemLines, itemId) || !record(pair) || !exact(pair, ['ordinary', 'recurring'])) return false;
      const accepted = item(copy.appliedFields[itemId]?.schedule ?? copy.baseVersionId, itemId);
      if (!accepted) return false;
      const active = accepted.schedule.kind === 'recurring' ? 'recurring' : 'ordinary';
      for (const kind of ['ordinary', 'recurring'] as const) {
        const slot = pair[kind];
        if (!record(slot) || !exact(slot, ['lineId', 'subcheckLines', 'fieldVersions', 'inheritedDate', 'dateChoice', 'startChoice'])
          || !id(slot.lineId) || !record(slot.subcheckLines) || Object.keys(slot.subcheckLines).length > 2000
          || !Object.entries(slot.subcheckLines).every(([key, value]) => id(key) && id(value))
          || !record(slot.fieldVersions) || !exact(slot.fieldVersions, fields) || fields.some(field => !id(slot.fieldVersions[field]) || !item(slot.fieldVersions[field], itemId))
          || !date(slot.inheritedDate) || !choice(slot.dateChoice) || !choice(slot.startChoice)) return false;
        const schedule = item(slot.fieldVersions.schedule, itemId)!.schedule;
        if ((schedule.kind === 'recurring') !== (kind === 'recurring')
          || kind === 'recurring' && slot.dateChoice.present || kind === 'ordinary' && slot.startChoice.present
          || slot.startChoice.present && (schedule.kind !== 'recurring' || schedule.start.kind !== 'undated')) return false;
        const positions = docs.filter(doc => doc.lines.some(line => line.id === slot.lineId));
        if (positions.length !== 1 || positions[0].id !== (kind === active ? copy.documentId : retainedId)
          || kind === active && copy.itemLines[itemId] !== slot.lineId) return false;
        const parsed = M.parseDocument(positions[0], space.text);
        if ((parsed.items.some(row => row.id === slot.lineId && row.isCanonical)) !== (kind === 'ordinary')) return false;
        for (const lineId of [slot.lineId, ...Object.values(slot.subcheckLines)]) {
          if (ids.has(lineId) || docs.flatMap(doc => doc.lines).filter(line => line.id === lineId).length !== 1
            || !positions[0].lines.some(line => line.id === lineId)) return false;
          ids.add(lineId);
        }
        if (space.copies.some(other => other.id !== copy.id && [
          ...Object.values(other.itemLines), ...Object.values(other.subcheckLines).flatMap(Object.values),
          ...Object.values(other.kindHandoffs?.items ?? {}).flatMap(pair => [pair.ordinary.lineId, pair.recurring.lineId,
            ...Object.values(pair.ordinary.subcheckLines), ...Object.values(pair.recurring.subcheckLines)]),
        ].some(lineId => ids.has(lineId)))) return false;
      }
    }
    const requests = new Set<string>(), lastKind = new Map<string, boolean>();
    for (const entry of handoff.entries) {
      if (!record(entry) || !exact(entry, ['id', 'itemId', 'fromVersionId', 'toVersionId', 'at', 'personalPlanOwnerIds'])
        || ![entry.id, entry.itemId, entry.fromVersionId, entry.toVersionId].every(id) || !Object.hasOwn(handoff.items, entry.itemId)
        || requests.has(entry.id) || typeof entry.at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(entry.at)
        || !Number.isFinite(Date.parse(entry.at)) || new Date(entry.at).toISOString() !== entry.at
        || !Array.isArray(entry.personalPlanOwnerIds) || entry.personalPlanOwnerIds.length > 2000
        || !entry.personalPlanOwnerIds.every(id) || new Set(entry.personalPlanOwnerIds).size !== entry.personalPlanOwnerIds.length) return false;
      const before = item(entry.fromVersionId, entry.itemId), after = item(entry.toVersionId, entry.itemId);
      if (!before || !after || (before.schedule.kind === 'recurring') === (after.schedule.kind === 'recurring')
        || lastKind.has(entry.itemId) && lastKind.get(entry.itemId) !== (before.schedule.kind === 'recurring')) return false;
      if (entry.personalPlanOwnerIds.some(ownerId => {
        const owner = space.recurrencePlans?.owners[ownerId];
        return owner && (owner.source.publicOwner?.copyId !== copy.id || owner.source.publicOwner.flowId !== copy.flowId || owner.source.itemId !== entry.itemId);
      })) return false;
      requests.add(entry.id); lastKind.set(entry.itemId, after.schedule.kind === 'recurring');
    }
    return Object.keys(handoff.items).every(itemId => lastKind.has(itemId)
      && lastKind.get(itemId) === (item(copy.appliedFields[itemId]?.schedule ?? copy.baseVersionId, itemId)?.schedule.kind === 'recurring'));
  } catch { return false; }
}
