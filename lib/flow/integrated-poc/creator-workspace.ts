import { programClone, programFailure, programId, programResult, type ProgramData, type ProgramTransition } from './contract';
import { validateProgramData, programIdentifier } from './program-data';
import { programSame } from './controller';
import type { ProgramCreatorWorkspaceState, ProgramCreatorWorking } from './creator-workspace-contract';
import { validateProgramCreatorWorking } from './creator-workspace-validation';
import { createPersonalWorkspacePocCreatorDraftLibrary, isPersonalWorkspacePocCreatorDraftLibrary,
  transitionPersonalWorkspacePocCreatorDraftLibrary, type PersonalWorkspacePocCreatorDraftLibrary,
  type PersonalWorkspacePocCreatorDraftAction } from '../personal-workspace-poc-creator-drafts';
import { materializePersonalWorkspacePocAuthoring, fingerprintPersonalWorkspacePocAuthoringSource } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { buildPersonalWorkspacePocResultProjection } from '../personal-workspace-poc-result-projection';
import { textWorkspaceModel as M } from './text-workspace';
import { isProgramCreatorDraftJson } from './creator-draft-provenance';
import { prepareProgramCreatorExecution, applyProgramCreatorExecutionHandoff } from './creator-execution-handoff';
import { captureProgramCreatorSavedRevision } from './creator-history-snapshot';
import type { ProgramCreatorStructureSidecar } from './creator-structure-sidecar';
import { stableAuthoringId, stableAuthoringJson } from '../personal-workspace-poc-structure-template/runtime-adapter';
import type { NativeCreatorDocumentOwner, NativeCreatorDocumentProvenance } from './native-creator-document-contract';
import { readNativeCreatorDocument } from './native-creator-document';

export function createProgramCreatorWorkspace(now: string): ProgramCreatorWorkspaceState {
  return { version: 1, library: createPersonalWorkspacePocCreatorDraftLibrary(now), origins: {}, handoffs: {}, working: null };
}
const iso = (now: string) => Number.isFinite(Date.parse(now)) && new Date(now).toISOString() === now;
/** Receipts are outside the private space: never put creator raw text there. */
function requestFingerprint(value: unknown) {
  const raw = JSON.stringify(value);
  return `${raw.length}:${fingerprintPersonalWorkspacePocAuthoringSource(raw)}:${fingerprintPersonalWorkspacePocAuthoringSource([...raw].reverse().join(''))}`;
}
function allowed(data: ProgramData, actorId: string, now: string) {
  return validateProgramData(data) && iso(now) && !!data.spaces[actorId] && data.activeActorId === actorId;
}
function finished(data: ProgramData, next: ProgramData, result: string): ProgramTransition<string> {
  return validateProgramData(next) ? programResult(data, next, result) : programFailure(data, 'invalid');
}
function receipt(data: ProgramData, actorId: string, requestId: string, kind: string, fingerprint: string) {
  if (!programIdentifier(requestId)) return programFailure(data, 'invalid');
  const prior = data.receipts.find(row => row.actorId === actorId && row.id === requestId);
  if (prior) {
    if (prior.kind !== kind || prior.fingerprint !== fingerprint) return programFailure(data, 'duplicate-request');
    const workspace = data.spaces[actorId]?.creatorWorkspace;
    const retained = kind === 'creator-handoff' ? Object.values(workspace?.handoffs ?? {}).some(link => link.documentId === prior.resultId)
      : !!workspace?.library.records[prior.resultId];
    return retained ? programResult(data, data, prior.resultId) : programFailure(data, 'conflict');
  }
  if (data.receipts.length >= 2000) return programFailure(data, 'limit');
  return null;
}
function appendReceipt(next: ProgramData, actorId: string, requestId: string, kind: string, fingerprint: string, resultId: string) {
  next.receipts.push({ actorId, id: requestId, kind, fingerprint, resultId });
}
export function creatorWorkingFromRecord(workspace: ProgramCreatorWorkspaceState, id: string): ProgramCreatorWorking | null {
  const record = workspace.library.records[id];
  return record ? { draftId: id, title: record.title, rawText: record.rawText, baseRecordRevision: record.recordRevision,
    ...(workspace.sourceIdentities?.[id] ? { sourceIdentity: programClone(workspace.sourceIdentities[id].identity) } : {}),
    ...(workspace.structureDrafts?.[id]?.structure ? { structure: programClone(workspace.structureDrafts[id].structure) } : {}),
    ...(workspace.structureDrafts?.[id]?.nativeDocument ? { nativeDocument: programClone(workspace.structureDrafts[id].nativeDocument) } : {}),
    ...(workspace.structureDrafts?.[id]?.nativeSelection ? { nativeSelection: programClone(workspace.structureDrafts[id].nativeSelection) } : {}),
    ...(record.templateId ? { templateId: record.templateId } : {}) } : null;
}
/** Autosave is a working source only, not an explicit saved CreatorDraft revision. */
export function importedCreatorWorking(workspace:ProgramCreatorWorkspaceState,candidateId:string):ProgramCreatorWorking|null{
  const candidate=workspace.importedWorkingCandidates?.candidates[candidateId];
  if(!candidate||candidate.readOnly)return null;
  const working=programClone(candidate.working),record=workspace.library.records[working.draftId];
  if(record?.status==='archived')return null;
  working.baseRecordRevision=record?.recordRevision??null;
  return working;
}
/** Autosave is a working source only, not an explicit saved CreatorDraft revision. */
export function setProgramCreatorWorking(data: ProgramData, input: { actorId: string; expectedWorking: ProgramCreatorWorking | null; working: ProgramCreatorWorking | null }, now: string): ProgramTransition<string> {
  if (!allowed(data, input.actorId, now) || input.working !== null && !validateProgramCreatorWorking(input.working)) return programFailure(data, 'invalid');
  const current = data.spaces[input.actorId].creatorWorkspace;
  if (!programSame(current?.working ?? null, input.expectedWorking)) return programFailure(data, 'conflict');
  if (programSame(current?.working ?? null, input.working)) return programResult(data, data, input.working?.draftId ?? 'closed');
  const next = programClone(data), target = next.spaces[input.actorId];
  target.creatorWorkspace ??= createProgramCreatorWorkspace(now);
  target.creatorWorkspace.working = programClone(input.working);
  return finished(data, next, input.working?.draftId ?? 'closed');
}
/** The original device library is an explicit read-only source. New IDs belong to Program. */
export function continueProgramCreatorDraft(data: ProgramData, library: PersonalWorkspacePocCreatorDraftLibrary,
  input: { actorId: string; requestId: string; creatorDraftId: string; expectedLibraryRevision: number; expectedRecordRevision: number }, now: string): ProgramTransition<string> {
  if (!allowed(data, input.actorId, now) || !isProgramCreatorDraftJson(library) || !isPersonalWorkspacePocCreatorDraftLibrary(library)) return programFailure(data, 'invalid');
  if (input.actorId !== 'local-user') return programFailure(data, 'forbidden');
  const fingerprint = requestFingerprint({ ...input, library }), kind = 'creator-continue';
  const repeated = receipt(data, input.actorId, input.requestId, kind, fingerprint); if (repeated) return repeated;
  const record = library.records[input.creatorDraftId];
  if (!record) return programFailure(data, 'missing');
  if (library.revision !== input.expectedLibraryRevision || record.recordRevision !== input.expectedRecordRevision || now < library.updatedAt) return programFailure(data, 'conflict');
  const space = data.spaces[input.actorId], workspace = space.creatorWorkspace;
  const origin = Object.entries(workspace?.origins ?? {}).find(([, source]) => source.creatorDraftId === record.draftId);
  if (origin) return programSame(origin[1].current, record) ? programResult(data, data, origin[0]) : programFailure(data, 'conflict');
  if (workspace?.working && !programSame(workspace.working, creatorWorkingFromRecord(workspace, workspace.working.draftId))) return programFailure(data, 'conflict');
  const next = programClone(data), target = next.spaces[input.actorId]; target.creatorWorkspace ??= createProgramCreatorWorkspace(now);
  const own = target.creatorWorkspace, draftId = programId('creator');
  const saved = transitionPersonalWorkspacePocCreatorDraftLibrary(own.library, { type: 'save', expectedLibraryRevision: own.library.revision,
    draftId, title: record.title, rawText: record.rawText, sourceFingerprint: record.sourceFingerprint, ...(record.templateId ? { templateId: record.templateId } : {}), now });
  if (!saved.changed) return programFailure(data, 'invalid');
  own.library = saved.library;
  own.origins[draftId] = { creatorDraftId: record.draftId, libraryRevision: library.revision, current: programClone(record), undo: programClone(library.undo?.snapshot.records[record.draftId] ?? null) };
  const priorImport = space.creatorDraftImports?.find(row => row.creatorDraftId === record.draftId);
  if (priorImport) own.handoffs[draftId] = { documentId: priorImport.documentId, recordRevision: 1, raw: priorImport.source.current.rawText.replace(/\r\n?/gu, '\n'), title: priorImport.source.current.title };
  own.working = creatorWorkingFromRecord(own, draftId);
  appendReceipt(next, input.actorId, input.requestId, kind, fingerprint, draftId);
  return finished(data, next, draftId);
}
export function applyProgramCreatorAction(data: ProgramData, input: { actorId: string; requestId: string; action: PersonalWorkspacePocCreatorDraftAction; expectedStructure?: ProgramCreatorStructureSidecar | null; expectedNativeDocument?: NativeCreatorDocumentOwner | null; expectedNativeSelection?: NativeCreatorDocumentProvenance | null }, now: string): ProgramTransition<string> {
  if (!allowed(data, input.actorId, now) || !isProgramCreatorDraftJson(input.action)) return programFailure(data, 'invalid');
  const workspace = data.spaces[input.actorId].creatorWorkspace;
  if (!workspace) return programFailure(data, 'missing');
  if (input.action.type === 'cancel') return programResult(data, data, workspace.working?.draftId ?? 'cancelled');
  // Whole-Program Undo owns library, handoff and personal document together.
  if (!['save', 'rename', 'duplicate', 'archive', 'restore'].includes(input.action.type) || input.action.type === 'undo') return programFailure(data, 'unresolved');
  if (input.action.now !== now) return programFailure(data, 'invalid');
  if (input.expectedStructure !== undefined && !isProgramCreatorDraftJson(input.expectedStructure)) return programFailure(data,'invalid');
  if (input.expectedNativeDocument !== undefined && !isProgramCreatorDraftJson(input.expectedNativeDocument)) return programFailure(data,'invalid');
  if (input.expectedNativeSelection !== undefined && !isProgramCreatorDraftJson(input.expectedNativeSelection)) return programFailure(data,'invalid');
  const fingerprint = requestFingerprint(input.expectedNativeDocument !== undefined || input.expectedNativeSelection !== undefined ? stableAuthoringJson({action:input.action,expectedStructure:input.expectedStructure??null,expectedNativeDocument:input.expectedNativeDocument??null,expectedNativeSelection:input.expectedNativeSelection??null})
    : input.expectedStructure === undefined ? input.action : stableAuthoringJson({ action: input.action, expectedStructure: input.expectedStructure })), kind = 'creator-action';
  const repeated = receipt(data, input.actorId, input.requestId, kind, fingerprint); if (repeated) return repeated;
  const action = input.action;
  if(action.type==='save' && workspace.working?.nativePendingRawText!==undefined)return programFailure(data,'conflict');
  if(action.type==='save' && (workspace.working?.structure || workspace.structureDrafts?.[action.draftId] || input.expectedStructure !== undefined)
    && (input.expectedStructure === undefined || !programSame(workspace.working?.structure??null,input.expectedStructure)))return programFailure(data,'conflict');
  if(action.type==='save' && (workspace.working?.nativeDocument || workspace.structureDrafts?.[action.draftId]?.nativeDocument || input.expectedNativeDocument !== undefined)
    && (input.expectedNativeDocument === undefined || !programSame(workspace.working?.nativeDocument??null,input.expectedNativeDocument)))return programFailure(data,'conflict');
  if(action.type==='save' && (workspace.working?.nativeSelection || workspace.structureDrafts?.[action.draftId]?.nativeSelection || input.expectedNativeSelection !== undefined)
    && (input.expectedNativeSelection === undefined || !programSame(workspace.working?.nativeSelection??null,input.expectedNativeSelection)))return programFailure(data,'conflict');
  if (action.type !== 'save' && action.type !== 'duplicate' && workspace.working?.draftId === action.draftId
    && !programSame(workspace.working, creatorWorkingFromRecord(workspace, action.draftId))) return programFailure(data, 'conflict');
  if (action.type === 'save' && (!workspace.working || workspace.working.draftId !== action.draftId
    || workspace.working.rawText !== action.rawText || workspace.working.title.trim() !== action.title?.trim()
    || workspace.working.baseRecordRevision !== (action.expectedRecordRevision ?? null))) return programFailure(data, 'conflict');
  let transition;
  try { transition = transitionPersonalWorkspacePocCreatorDraftLibrary(workspace.library, action); } catch { return programFailure(data, 'invalid'); }
  const id = action.type === 'duplicate' ? action.newDraftId : action.draftId;
  const oldContext=workspace.structureDrafts?.[id];
  const contextChanged=action.type==='save'&&(!programSame(oldContext?.structure??null,workspace.working?.structure??null)
    ||!programSame(workspace.sourceIdentities?.[id]?.identity??null,workspace.working?.sourceIdentity??null)
    ||!programSame(oldContext?.nativeDocument??null,workspace.working?.nativeDocument??null)
    ||!programSame(oldContext?.nativeSelection??null,workspace.working?.nativeSelection??null));
  if (!transition.changed && !(transition.code === 'no-op' && contextChanged)) return transition.code === 'no-op' ? programResult(data, data, id)
    : programFailure(data, transition.code.startsWith('stale') ? 'conflict' : transition.code === 'not-found' ? 'missing' : 'invalid');
  const next = programClone(data), own = next.spaces[input.actorId].creatorWorkspace!;
  if(action.type==='save'&&own.library.records[id])captureProgramCreatorSavedRevision(own,own.library.records[id]);
  own.library = transition.library;
  if (action.type === 'save') {
    if (workspace.working?.sourceIdentity) {
      own.sourceIdentities ??= {};
      own.sourceIdentities[id] = { recordRevision: own.library.records[id].recordRevision, identity: programClone(workspace.working.sourceIdentity) };
    } else if (own.sourceIdentities) delete own.sourceIdentities[id];
    if(oldContext || workspace.working?.structure || contextChanged) {
      if(now<(oldContext?.savedAt??own.library.records[id].updatedAt))return programFailure(data,'conflict');
      own.structureDrafts??={};
      own.structureDrafts[id]={version:1,recordRevision:own.library.records[id].recordRevision,contextRevision:(oldContext?.contextRevision??0)+1,savedAt:now,
        ...(workspace.working?.structure?{structure:programClone(workspace.working.structure)}:{}),...(workspace.working?.nativeDocument?{nativeDocument:programClone(workspace.working.nativeDocument)}:{}),
        ...(workspace.working?.nativeSelection?{nativeSelection:programClone(workspace.working.nativeSelection)}:{}),
        ...(oldContext?.copiedFromDraftId?{copiedFromDraftId:oldContext.copiedFromDraftId}:{})};
    }
  } else if (own.sourceIdentities?.[id]) own.sourceIdentities[id].recordRevision = own.library.records[id].recordRevision;
  if(action.type!=='save' && own.structureDrafts?.[id])own.structureDrafts[id].recordRevision=own.library.records[id].recordRevision;
  if(action.type==='duplicate'){
    const sourceContext=workspace.structureDrafts?.[action.sourceDraftId];
    if(sourceContext){
      const structure=sourceContext.structure?programClone(sourceContext.structure):undefined;
      if(structure){
        const d={...structure.draft,draftId:id};
        // This token identifies a genuine Program copy, not an editor materialize event.
        if(d.materialized!==false){const copyId=stableAuthoringId('structure-copy',id,action.sourceDraftId,sourceContext.contextRevision);
          d.materialized={...d.materialized,transactionId:copyId,sourceRevisionId:copyId};
          if(d.sourceRevisionId!==undefined)d.sourceRevisionId=copyId;
          Object.assign(structure,{draft:d,materialization:{...structure.materialization!,transactionId:copyId}});
        }else Object.assign(structure,{draft:d});
      }
      const nativeDocument=sourceContext.nativeDocument?{...programClone(sourceContext.nativeDocument),id}:undefined;
      own.structureDrafts??={};own.structureDrafts[id]={version:1,recordRevision:own.library.records[id].recordRevision,contextRevision:1,savedAt:now,copiedFromDraftId:action.sourceDraftId,...(structure?{structure}:{}),...(nativeDocument?{nativeDocument}:{}),...(sourceContext.nativeSelection?{nativeSelection:programClone(sourceContext.nativeSelection)}:{})};
    }
  }
  if (action.type === 'save' || own.working?.draftId === id) own.working = creatorWorkingFromRecord(own, id);
  if(action.type==='save'||action.type==='duplicate')captureProgramCreatorSavedRevision(own,own.library.records[id]);
  // A duplicate has its own identity and no personal handoff/provenance claim.
  appendReceipt(next, input.actorId, input.requestId, kind, fingerprint, id);
  return finished(data, next, id);
}
export function previewProgramCreatorSource(working: ProgramCreatorWorking, today: string, now: string, view: { baseDate?: string; selectedDate?: string } = {}) {
  // A saved D2 document owns canonical roles, inclusion and review state that
  // cannot be reconstructed from raw text. Pending input is not yet canonical.
  if (working.nativeDocument) return { kind: 'native' as const, materialized: null, result: null,
    native: working.rawText === working.nativeDocument.document.rawText
      ? readNativeCreatorDocument(working.nativeDocument) : { ok: false as const, reason: 'invalid' as const },
    pendingRaw: working.nativePendingRawText !== undefined };
  const materialized = materializePersonalWorkspacePocAuthoring({ handoffId: `creator-handoff:${working.draftId}`, documentId: working.draftId,
    revisionId: `creator-revision:${working.baseRecordRevision ?? 0}`, rawText: working.rawText, committedAt: now,
    ...(working.templateId ? { templateId: working.templateId } : {}) });
  const result = materialized.ok ? buildPersonalWorkspacePocResultProjection({ model: { version: 1, flows: [materialized.flow] }, state: createPersonalWorkspacePocState(now),
    flowRef: materialized.flow.ref, localToday: today, purpose: 'authoring-preview', ...view }) : null;
  return { kind: 'raw' as const, materialized, result, native: null, pendingRaw: false };
}
/** Private projection keeps source prose but resolves ordinary relative dates.
 * Source checkmarks are facts, never new personal completion records. */
function handoffRaw(working: ProgramCreatorWorking, _today: string, now: string): string | null {
  // Native canonical inclusion/roles cannot be faithfully replaced by a raw reparse.
  if(working.nativeDocument)return null;
  return prepareProgramCreatorExecution(working.rawText, working.draftId, working.baseRecordRevision ?? 0, now, working.templateId)?.raw ?? null;
}
export function inspectProgramCreatorHandoff(data: ProgramData, actorId: string, draftId: string, today: string, now: string) {
  const space = data.spaces[actorId], workspace = space?.creatorWorkspace;
  const working = workspace ? creatorWorkingFromRecord(workspace, draftId) : null;
  if (!working) return null;
  const link = workspace!.handoffs[draftId], doc = link ? M.getDocument(space.text, link.documentId) : null;
  const owner = workspace!.executionSources?.[draftId], prepared = working.nativeDocument?null:prepareProgramCreatorExecution(working.rawText, draftId, working.baseRecordRevision ?? 0, now, working.templateId, owner, working.sourceIdentity);
  const oldRows = owner?.revisions.at(-1)?.rows ?? [], nextSourceIds = new Set(prepared?.materialized.parseResult.items.map(item => prepared.sourceLines[item.sourceLine - 1].id));
  return { draftId, recordRevision: working.baseRecordRevision, documentId: link?.documentId ?? null, previous: link?.raw ?? null, personal: doc ? M.raw(doc) : null,
    executionChange: prepared ? { series: prepared.materialized.parseResult.items.filter(item => item.recurrence).length,
      timeZones: [...new Set(prepared.materialized.parseResult.items.flatMap(item => item.timeZone ? [item.timeZone] : []))],
      retainedRows: oldRows.filter(row => nextSourceIds.has(row.sourceLineId)).length, removedRows: oldRows.filter(row => !nextSourceIds.has(row.sourceLineId)).length,
      newRows: [...nextSourceIds].filter(id => !oldRows.some(row => row.sourceLineId === id)).length } : null,
    next: handoffRaw(working, today, now), source: working.rawText, ...(working.nativeDocument?{unresolvedReason:'native-canonical-handoff-required' as const}:{}),
    conflict: !!link && (!doc || M.raw(doc) !== link.raw || doc.title !== link.title || space.archivedDocumentIds.includes(doc.id)) };
}
export function handoffProgramCreatorDraft(data: ProgramData, input: { actorId: string; requestId: string; draftId: string; expectedRecordRevision: number; today: string }, now: string): ProgramTransition<string> {
  if (!allowed(data, input.actorId, now)) return programFailure(data, 'invalid');
  const fingerprint = JSON.stringify(input), kind = 'creator-handoff';
  const repeated = receipt(data, input.actorId, input.requestId, kind, fingerprint); if (repeated) return repeated;
  const space = data.spaces[input.actorId], workspace = space.creatorWorkspace, record = workspace?.library.records[input.draftId];
  if (!record) return programFailure(data, 'missing');
  if (record.status !== 'active' || record.recordRevision !== input.expectedRecordRevision) return programFailure(data, 'conflict');
  if(workspace?.working?.draftId===input.draftId && workspace.working.nativePendingRawText!==undefined)return programFailure(data,'conflict');
  const inspection = inspectProgramCreatorHandoff(data, input.actorId, input.draftId, input.today, now);
  if (!inspection || inspection.next === null) return programFailure(data, 'unresolved');
  if (inspection.conflict) return programFailure(data, 'conflict');
  const previous = workspace!.handoffs[input.draftId];
  if (previous && previous.recordRevision === record.recordRevision && workspace!.executionSources?.[input.draftId]) return programResult(data, data, previous.documentId);
  const next = programClone(data), target = next.spaces[input.actorId];
  if (!previous && [...target.text.documents, ...target.text.flows].length >= 100) return programFailure(data, 'limit');
  const applied = applyProgramCreatorExecutionHandoff(target, { draftId: input.draftId, recordRevision: record.recordRevision, title: record.title, raw: record.rawText, ...(record.templateId ? { templateId: record.templateId } : {}), ...(workspace!.sourceIdentities?.[input.draftId] ? { sourceIdentity: workspace!.sourceIdentities[input.draftId].identity } : {}) }, now);
  if (!applied) return programFailure(data, 'conflict');
  const documentId = applied.documentId;
  appendReceipt(next, input.actorId, input.requestId, kind, fingerprint, documentId);
  return finished(data, next, documentId);
}
export { fingerprintPersonalWorkspacePocAuthoringSource };
