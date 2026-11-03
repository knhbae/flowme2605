import { programClone, programFailure, programResult, type ProgramData, type ProgramFailure, type ProgramTransition } from '../contract';
import { importCatalogContentWorkspace } from '../catalog-content-import';
import type { CatalogLibrarySnapshot } from '../catalog-library';
import { validateProgramData, programIdentifier } from '../program-data';
import { programSame } from '../controller';
import { setProgramCreatorWorking, applyProgramCreatorAction, handoffProgramCreatorDraft, creatorWorkingFromRecord } from '../creator-workspace';
import { applyProgramNativeCreatorOperation } from '../creator-native-workspace';
import { stageProgramNativeSourceUpdate, transitionProgramNativeSourceUpdate, upgradeProgramNativeSourceAbsences } from '../creator-native-source-store';
import { previewProgramCreatorSavedRestore, restoreProgramCreatorSavedRevision } from '../creator-history';
import { createNativeCreatorDocumentOwner, restoreNativeCreatorDocument, readNativeCreatorSavedDocument } from '../native-creator-document';
import { inspectProgramNativeCreatorHandoff, applyProgramNativeCreatorHandoff } from '../creator-native-execution-adapter';
import { inspectProgramCreatorNativeLineage, applyProgramCreatorNativeLineage } from '../creator-native-lineage';
import { inspectCreatorUpdate, applyCreatorUpdate } from '../creator-update';
import { fingerprintPersonalWorkspacePocAuthoringSource } from '../../personal-workspace-poc-authoring';
import { isAccountForOwner } from '../alpha-auth/account-access';
import type { AlphaAccount, AlphaChange, AlphaReferenceContext } from '../alpha-persistence/contract';
import { materializeAccount, privateChanges } from '../alpha-persistence/program-adapter';
import { canonicalJson, detached } from '../alpha-persistence/json';
import { allowedAlphaCreatorWorking, preservesAlphaCreatorBoundary } from './boundary';
import { isAlphaCreatorCommand, isAlphaCreatorIntent, alphaCreatorRawUpdateRowKey, type AlphaCreatorCommand, type AlphaCreatorIntent } from './contract';

/** Only the server supplies this provider. Browser dispatch has no frozen source bytes. */
export type AlphaCreatorCatalogSource = { library(now: string): CatalogLibrarySnapshot };

/** Account-owned immutable native history is already copied and validated. Its
 * availability cannot depend on another device's original localStorage library. */
export function previewAlphaCreatorSavedRestore(data: ProgramData, actorId: string, draftId: string, revisionId: string): ReturnType<typeof previewProgramCreatorSavedRestore> {
  if (!validateProgramData(data) || data.activeActorId !== actorId) return { ok: false, reason: 'invalid' };
  const space = data.spaces[actorId], own = space?.creatorWorkspace, record = own?.library.records[draftId], entry = own?.savedHistory?.drafts[draftId]?.find(e => e.id === revisionId);
  if (!record || !entry) return { ok: false, reason: 'missing' };
  if (entry.kind === 'program') return previewProgramCreatorSavedRestore(data, actorId, draftId, revisionId, null);
  if (own.working && !programSame(own.working, creatorWorkingFromRecord(own, own.working.draftId))) return { ok: false, reason: 'unsaved-working' };
  if (record.status !== 'active') return { ok: false, reason: 'archived' };
  if (!entry.rawText.trim()) return { ok: false, reason: 'empty-source' };
  if (!readNativeCreatorSavedDocument(entry.origin)) return { ok: false, reason: 'unsupported-native-document-codec' };
  return { ok: true, value: { mode: 'full-document', draftId, entry: programClone(entry), expectedSpace: programClone(space), expectedRaw: null, currentTitle: record.title, currentRaw: record.rawText } };
}
function restoreAccountHistory(data: ProgramData, actorId: string, draftId: string, revisionId: string, requestId: string, now: string): ProgramTransition<string> {
  const preview = previewAlphaCreatorSavedRestore(data, actorId, draftId, revisionId);
  if (!preview.ok) return programFailure(data, preview.reason === 'missing' ? 'missing' : 'conflict');
  const p = preview.value;
  if (p.entry.kind === 'program') return restoreProgramCreatorSavedRevision(data, { actorId, requestId, preview: p }, null, now);
  const workspace = data.spaces[actorId].creatorWorkspace!, record = workspace.library.records[draftId];
  const current = workspace.working?.draftId === draftId ? workspace.working.nativeDocument : workspace.structureDrafts?.[draftId]?.nativeDocument;
  const native = current ? restoreNativeCreatorDocument(current, { expectedOwner: current, requestId: `${requestId}:native`, source: p.entry.origin }, now)
    : createNativeCreatorDocumentOwner({ id: draftId, source: p.entry.origin }, now);
  if (!native.ok) return programFailure(data, native.reason === 'history-capacity' || native.reason === 'document-capacity' ? 'limit' : 'unresolved');
  const working = { draftId, title: p.entry.title, rawText: p.entry.rawText, baseRecordRevision: record.recordRevision, nativeDocument: native.owner, nativeSelection: p.entry.origin };
  const opened = setProgramCreatorWorking(data, { actorId, expectedWorking: workspace.working, working }, now);
  if (!opened.ok) return opened;
  return applyProgramCreatorAction(opened.data, { actorId, requestId, expectedStructure: null, expectedNativeDocument: native.owner, expectedNativeSelection: p.entry.origin,
    action: { type: 'save', draftId, title: working.title, rawText: working.rawText, sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(working.rawText), expectedLibraryRevision: workspace.library.revision, expectedRecordRevision: record.recordRevision, now } }, now);
}

/** Serializable semantic dispatch shared by the account UI and the server. Never
 * consumes client WeakMap captures, actor assertions, or precomputed after-state. */
export function executeAlphaCreatorIntent(data: ProgramData, actorId: string, intent: AlphaCreatorIntent, requestId: string, catalog?: AlphaCreatorCatalogSource): ProgramTransition<string> {
  try {
    if (!validateProgramData(data) || data.activeActorId !== actorId || !data.spaces[actorId] || !programIdentifier(requestId) || requestId.length > 160 || !isAlphaCreatorIntent(intent)) return programFailure(data, 'invalid');
    const workspace = data.spaces[actorId].creatorWorkspace, now = intent.now;
    if (intent.type === 'catalog-library-import') {
      if (!catalog) return programFailure(data, 'forbidden');
      const library = catalog.library(now);
      if (library.catalogVersion !== intent.catalogVersion) return programFailure(data, 'conflict');
      const existing = data.spaces[actorId].catalogLibrary;
      if (existing) return existing.catalogVersion === library.catalogVersion
        ? programResult(data, data, library.catalogVersion) : programFailure(data, 'conflict');
      const next = programClone(data); next.spaces[actorId].catalogLibrary = library;
      return validateProgramData(next) ? programResult(data, next, library.catalogVersion) : programFailure(data, 'invalid');
    }
    if (intent.type === 'catalog-content-import') {
      if (!catalog) return programFailure(data, 'forbidden');
      const imported = importCatalogContentWorkspace(workspace, intent, catalog.library(now));
      if (!imported.ok) return programFailure(data, imported.reason);
      if (!imported.changed) return programResult(data, data, imported.draftId);
      const next = programClone(data); next.spaces[actorId].creatorWorkspace = imported.workspace;
      return validateProgramData(next) ? programResult(data, next, imported.draftId) : programFailure(data, 'invalid');
    }
    if (intent.type === 'working') return allowedAlphaCreatorWorking(workspace, intent.working)
      ? setProgramCreatorWorking(data, { actorId, expectedWorking: workspace?.working ?? null, working: intent.working }, now) : programFailure(data, 'forbidden');
    if (intent.type === 'library-action') return applyProgramCreatorAction(data, { actorId, requestId, action: intent.action,
      expectedStructure: workspace?.working?.structure ?? null, expectedNativeDocument: workspace?.working?.nativeDocument ?? null, expectedNativeSelection: workspace?.working?.nativeSelection ?? null }, now);
    const working = workspace?.working;
    const sourceHead = { actorId, draftId: intent.draftId, expectedWorking: working ?? null, expectedSession: workspace?.sourceUpdateSessions?.[intent.draftId]?.session ?? null };
    switch (intent.type) {
      case 'native-operation': return working?.draftId === intent.draftId && working.nativeDocument
        ? applyProgramNativeCreatorOperation(data, { actorId, requestId, draftId: intent.draftId, expectedWorking: working, expectedOwner: working.nativeDocument, operation: intent.operation }, now) : programFailure(data, 'missing');
      case 'source-stage': return stageProgramNativeSourceUpdate(data, { ...sourceHead, envelope: intent.envelope, candidateDocument: intent.candidateDocument,
        ...(intent.matches === undefined ? {} : { matches: intent.matches }), ...(intent.projectionOptions === undefined ? {} : { projectionOptions: intent.projectionOptions }), ...(intent.replaceSession === undefined ? {} : { replaceSession: intent.replaceSession }) }, now);
      case 'source-transition': return transitionProgramNativeSourceUpdate(data, { ...sourceHead, requestId, event: intent.event }, now);
      case 'source-upgrade': return upgradeProgramNativeSourceAbsences(data, { ...sourceHead, requestId }, now);
      case 'history-restore': return restoreAccountHistory(data, actorId, intent.draftId, intent.revisionId, requestId, now);
      case 'raw-handoff': return handoffProgramCreatorDraft(data, { actorId, requestId, draftId: intent.draftId, expectedRecordRevision: intent.expectedRecordRevision, today: intent.today }, now);
      case 'native-handoff': {
        const review = inspectProgramNativeCreatorHandoff(data, { actorId, draftId: intent.draftId, ...(intent.anchor === undefined ? {} : { anchor: intent.anchor }) }, now);
        return review.ok ? applyProgramNativeCreatorHandoff(data, { actorId, requestId, preview: review.preview, choices: intent.choices }, now) : programFailure(data, 'conflict');
      }
      case 'native-lineage': {
        const review = inspectProgramCreatorNativeLineage(data, { actorId, draftId: intent.draftId, ...(intent.anchor === undefined ? {} : { anchor: intent.anchor }) }, now);
        return review.ok ? applyProgramCreatorNativeLineage(data, { actorId, requestId, preview: review.preview, mapping: intent.mapping }, now) : programFailure(data, 'conflict');
      }
      case 'raw-update': {
        const preview = inspectCreatorUpdate(data, intent.draftId, now); if (!preview) return programFailure(data, 'conflict');
        const keys = preview.rows.map((_, index) => alphaCreatorRawUpdateRowKey(preview, index));
        if (Object.keys(intent.choices).some(key => !keys.includes(key))) return programFailure(data, 'conflict');
        const choices = Object.fromEntries(preview.rows.flatMap((row, index) => intent.choices[keys[index]] ? [[row.id, intent.choices[keys[index]]]] : []));
        return applyCreatorUpdate(data, { actorId, preview, choices });
      }
    }
  } catch { return programFailure(data, 'invalid'); }
}
export type AlphaCreatorDispatchResult = { ok: true; changes: AlphaChange[]; result: string; changed: boolean } | { ok: false; reason: ProgramFailure | 'revision-conflict' };
export function dispatchAlphaCreatorCommand(account: AlphaAccount, command: AlphaCreatorCommand, publicReferences?: AlphaReferenceContext, catalog?: AlphaCreatorCatalogSource): AlphaCreatorDispatchResult {
  try {
    if (!isAlphaCreatorCommand(command) || !isAccountForOwner(account, account.ownerId, publicReferences)) return { ok: false, reason: 'invalid' };
    if (command.expectedRevision !== account.revision) return { ok: false, reason: 'revision-conflict' };
    const references = publicReferences ?? { actorIds: [account.ownerId], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
    const baseline = materializeAccount(detached(account), references);
    const transition = executeAlphaCreatorIntent(detached(baseline.data), account.ownerId, detached(command.intent), command.requestId, catalog);
    if (!transition.ok) return { ok: false, reason: transition.reason };
    const guarded = detached(transition.data); guarded.spaces[account.ownerId] = baseline.data.spaces[account.ownerId];
    if (canonicalJson(guarded.receipts.slice(0, baseline.data.receipts.length)) !== canonicalJson(baseline.data.receipts)
      || guarded.receipts.slice(baseline.data.receipts.length).some(receipt => receipt.actorId !== account.ownerId)) return { ok: false, reason: 'forbidden' };
    guarded.receipts = baseline.data.receipts;
    if (canonicalJson(guarded) !== canonicalJson(baseline.data)) return { ok: false, reason: 'forbidden' };
    const next = detached(account); next.space = transition.data.spaces[account.ownerId];
    if (!preservesAlphaCreatorBoundary(account, next, command.intent, references, catalog)) return { ok: false, reason: 'forbidden' };
    const changes = privateChanges(account.space, next.space);
    return { ok: true, changes, result: transition.result, changed: changes.length > 0 };
  } catch { return { ok: false, reason: 'invalid' }; }
}
