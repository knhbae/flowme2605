import type { ProgramCreatorWorkspaceState, ProgramCreatorWorking } from './creator-workspace-contract';
import { isPersonalWorkspacePocCreatorDraftLibrary, isPersonalWorkspacePocCreatorDraftRecord, isPersonalWorkspacePocCreatorDraftId } from '../personal-workspace-poc-creator-drafts';
import { getPersonalWorkspacePocAuthoringTemplate } from '../personal-workspace-poc-authoring';
import { isProgramCreatorDraftJson } from './creator-draft-provenance';
import { validateProgramCreatorExecutionSources } from './creator-execution-source';
import { validCreatorSourceIdentity } from './creator-source-order';
import { validateProgramCreatorSavedHistory, validateProgramCreatorSavedContext } from './creator-history-validation';
import { validateProgramCreatorStructureSidecar } from './creator-structure-validation';
import { validateProgramCreatorNativeContext } from './creator-native-context';
import {validateProgramNativeExecutionSources} from './creator-native-execution-validation';
import {validateCreatorNativeSourceSession} from './creator-native-source-update';
import {programNativeLineageOwnsRawSource} from './creator-native-lineage-contract';

const obj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const shape = (v: Record<string, unknown>, keys: string[], optional: string[] = []) => keys.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => keys.includes(k) || optional.includes(k));
const positive = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;
export function validateProgramCreatorWorking(value: unknown): value is ProgramCreatorWorking {
  return obj(value) && shape(value, ['draftId', 'rawText', 'title', 'baseRecordRevision'], ['templateId', 'sourceIdentity', 'structure', 'nativeDocument', 'nativeSelection', 'nativePendingRawText'])
    && isPersonalWorkspacePocCreatorDraftId(value.draftId) && typeof value.rawText === 'string' && value.rawText.length <= 100000
    && typeof value.title === 'string' && value.title.length <= 200 && !/[\r\n]/u.test(value.title)
    && (value.baseRecordRevision === null || positive(value.baseRecordRevision))
    && (value.templateId === undefined || typeof value.templateId === 'string' && !!getPersonalWorkspacePocAuthoringTemplate(value.templateId))
    && (value.sourceIdentity === undefined || validCreatorSourceIdentity(value.sourceIdentity, value.rawText))
    && (value.structure === undefined || validateProgramCreatorStructureSidecar(value.structure,value.draftId))
    && validateProgramCreatorNativeContext(value.nativeDocument,value.nativeSelection,value.draftId,value.rawText)
    && (value.nativePendingRawText===undefined || value.nativeDocument!==undefined && typeof value.nativePendingRawText==='string' && value.nativePendingRawText.length<=100000 && value.nativePendingRawText!==value.rawText);
}
/** No Program-data import: safe for the envelope validator to call. */
export function validateProgramCreatorWorkspace(value: unknown, space: { text: { documents: readonly { id: string }[]; flows: readonly { id: string }[] } }): value is ProgramCreatorWorkspaceState {
  try {
    if (!isProgramCreatorDraftJson(value) || !obj(value) || !shape(value, ['version', 'library', 'origins', 'handoffs', 'working'], ['executionSources', 'nativeExecutionSources', 'sourceUpdateSessions', 'sourceIdentities', 'savedHistory', 'structureDrafts']) || value.version !== 1
      || !isPersonalWorkspacePocCreatorDraftLibrary(value.library) || !obj(value.origins) || !obj(value.handoffs)
      || Object.keys(value.library.records).length > 200 || Object.values(value.library.records).some(r => r.rawText.length > 100000 || /[\r\n]/u.test(r.title))) return false;
    const ids = new Set([...space.text.documents, ...space.text.flows].map(d => d.id));
    const sourceIds = new Set<string>(), documentIds = new Set<string>();
    for (const [id, origin] of Object.entries(value.origins)) {
      if (!value.library.records[id] || !obj(origin) || !shape(origin, ['creatorDraftId', 'libraryRevision', 'current', 'undo'])
        || !positive(origin.libraryRevision) || !isPersonalWorkspacePocCreatorDraftRecord(origin.current)
        || origin.creatorDraftId !== origin.current.draftId || sourceIds.has(origin.creatorDraftId as string)
        || origin.undo !== null && (!isPersonalWorkspacePocCreatorDraftRecord(origin.undo) || origin.undo.draftId !== origin.creatorDraftId)) return false;
      sourceIds.add(origin.creatorDraftId as string);
    }
    for (const [id, link] of Object.entries(value.handoffs)) {
      if (!value.library.records[id] || !obj(link) || !shape(link, ['documentId', 'recordRevision', 'raw', 'title'])
        || typeof link.documentId !== 'string' || !ids.has(link.documentId) || documentIds.has(link.documentId)
        || !positive(link.recordRevision) || link.recordRevision > value.library.records[id].recordRevision
        || typeof link.raw !== 'string' || link.raw.length > 100000 || typeof link.title !== 'string' || !link.title.trim() || /[\r\n]/u.test(link.title)) return false;
      documentIds.add(link.documentId);
    }
    if (value.working !== null) {
      if (!validateProgramCreatorWorking(value.working)) return false;
      const record = value.library.records[value.working.draftId];
      if (value.working.baseRecordRevision === null ? !!record : !record || value.working.baseRecordRevision > record.recordRevision) return false;
    }
    if (value.sourceIdentities !== undefined) {
      if (!obj(value.sourceIdentities)) return false;
      for (const [id, entry] of Object.entries(value.sourceIdentities)) {
        const record=value.library.records[id];
        if (!record || !obj(entry) || !shape(entry,['recordRevision','identity']) || entry.recordRevision !== record.recordRevision || !validCreatorSourceIdentity(entry.identity,record.rawText)) return false;
      }
    }
    const records=value.library.records;
    if(value.sourceUpdateSessions!==undefined&&(!obj(value.sourceUpdateSessions)||Object.keys(value.sourceUpdateSessions).length>200||!Object.entries(value.sourceUpdateSessions).every(([id,entry])=>!!records[id]&&obj(entry)&&shape(entry,['version','session','baseSourceIdentity'])&&entry.version===1&&validateCreatorNativeSourceSession(entry.session)&&entry.session.draftId===id&&(entry.baseSourceIdentity===null||validCreatorSourceIdentity(entry.baseSourceIdentity,entry.session.baseOwner.document.rawText)))))return false;
    if(value.structureDrafts!==undefined&&(!obj(value.structureDrafts)||!Object.entries(value.structureDrafts).every(([id,context])=>!!records[id]&&validateProgramCreatorSavedContext(context,id,records[id].recordRevision)
      &&(context.nativeDocument===undefined||context.nativeDocument.document.rawText===records[id].rawText))))return false;
    if(value.savedHistory!==undefined&&!validateProgramCreatorSavedHistory(value.savedHistory,records,value.structureDrafts as ProgramCreatorWorkspaceState['structureDrafts']))return false;
    if (value.executionSources !== undefined && !validateProgramCreatorExecutionSources(value.executionSources, space, value.library.records)) return false;
    if(value.nativeExecutionSources!==undefined&&!validateProgramNativeExecutionSources(value.nativeExecutionSources,{...space,creatorWorkspace:{executionSources:value.executionSources as ProgramCreatorWorkspaceState['executionSources']}},value.library.records))return false;
    const handoffs = value.handoffs;
    if (value.executionSources !== undefined && Object.entries(value.executionSources).some(([draftId,source]) => {
      const link = handoffs[draftId]; return !obj(link) || link.documentId !== source.documentId || link.recordRevision !== source.revisions.at(-1)!.recordRevision
        && !programNativeLineageOwnsRawSource((value as ProgramCreatorWorkspaceState).nativeExecutionSources?.[draftId],source);
    })) return false;
    return true;
  } catch { return false; }
}
