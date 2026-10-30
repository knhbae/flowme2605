import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData } from '../contract';
import { createProgramPrivateSpace, validateProgramData } from '../program-data';
import { ALPHA_SCHEMA, type AlphaAccount } from '../alpha-persistence/contract';
import { materializeAccount } from '../alpha-persistence/program-adapter';
import { canonicalJson } from '../alpha-persistence/json';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from '../../personal-workspace-poc-authoring';
import { createTextAuthoringDocument } from '../native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner } from '../native-creator-document';
import { setProgramCreatorWorking } from '../creator-workspace';
import { inspectProgramNativeCreatorHandoff } from '../creator-native-execution-adapter';
import { inspectProgramCreatorNativeLineage } from '../creator-native-lineage';
import { buildProgramNativeCreatorRawSyncOperation } from '../creator-native-workspace';
import { inspectCreatorUpdate } from '../creator-update';
import { prepareProgramNativeSourceInput, programNativeSourceMatches } from '../creator-native-source-input';
import { readProgramNativeSourceUpdate } from '../creator-native-source-store';
import { importNativeCreatorSavedHistory } from '../creator-history';
import { createProgramData } from '../program-data';
import { textWorkspaceModel as M } from '../text-workspace';
import { ALPHA_CREATOR_COMMAND_SCHEMA, isAlphaCreatorCommand, normalizeAlphaCreatorRawUpdateChoices, type AlphaCreatorCommand, type AlphaCreatorIntent } from './contract';
import { allowedAlphaCreatorWorking, preservesAlphaCreatorBoundary } from './boundary';
import { dispatchAlphaCreatorCommand, previewAlphaCreatorSavedRestore } from './dispatch-source';
import { importedCreatorWorking } from '../creator-workspace';
import { createLocalImportSource } from '../alpha-preservation/source';
import { prepareLocalImport } from '../alpha-preservation/import';

const OWNER = '11111111-1111-4111-8111-111111111111', NOW = '2026-09-21T10:00:00.000Z', LATER = '2026-09-21T11:00:00.000Z';
const RAW = '# 준비\r\n\r\n- [ ] 챙기기\r\n  - 날짜: 2026-09-22\r\n  - 시간: 09:00';
const choices = { source: 'incoming', date: 'keep', time: 'incoming', children: 'keep' } as const;
const references = { actorIds: [OWNER], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
function empty(): AlphaAccount { return { schema: ALPHA_SCHEMA, ownerId: OWNER, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: OWNER, revision: 0 }, space: createProgramPrivateSpace(), legacyReceipts: [], legacyUndo: [] }; }
const data = (account: AlphaAccount) => materializeAccount(account, references).data;
const command = (account: AlphaAccount, intent: AlphaCreatorIntent, requestId = `command-${account.revision}`): AlphaCreatorCommand => ({ schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'creator', requestId, expectedRevision: account.revision, intent });
function commit(account: AlphaAccount, intent: AlphaCreatorIntent) {
  const before = canonicalJson(account), result = dispatchAlphaCreatorCommand(account, command(account, intent));
  assert(result.ok, JSON.stringify(result)); assert.equal(canonicalJson(account), before);
  const next = structuredClone(account);
  for (const change of result.changes) { if (change.present) Object.assign(next.space, { [change.field]: change.value }); else delete next.space[change.field]; }
  if (result.changed) next.revision++;
  assert(isAccountForOwner(next, OWNER)); return { account: next, result };
}
function save(account: AlphaAccount, now = LATER) {
  const w = account.space.creatorWorkspace!, working = w.working!;
  return commit(account, { type: 'library-action', now, action: { type: 'save', draftId: working.draftId, title: working.title, rawText: working.rawText,
    sourceFingerprint: fingerprint(working.rawText), expectedLibraryRevision: w.library.revision, ...(working.baseRecordRevision === null ? {} : { expectedRecordRevision: working.baseRecordRevision }), now } }).account;
}
function rawSaved() {
  const a = commit(empty(), { type: 'working', now: NOW, working: { draftId: 'draft', title: '준비', rawText: RAW, baseRecordRevision: null } }).account;
  return save(a);
}
/** Existing account fixture, not an import endpoint or operating data read. */
function nativeSeed() {
  const account = empty(), doc = createTextAuthoringDocument(RAW, { documentId: 'native-source', ownership: 'creator', now: NOW });
  const source = { storageKey: 'flow:text-authoring:drafts:v1' as const, draftId: 'original-fixture', versionId: 'fixture-saved-1', revisionId: doc.revision.revisionId, documentJson: JSON.stringify(doc) };
  const native = createNativeCreatorDocumentOwner({ id: 'draft', source }, NOW); assert(native.ok);
  const transition = setProgramCreatorWorking(data(account), { actorId: OWNER, expectedWorking: null, working: { draftId: 'draft', title: '준비', rawText: RAW, baseRecordRevision: null, nativeDocument: native.owner, nativeSelection: source } }, NOW); assert(transition.ok);
  account.space = transition.data.spaces[OWNER]; assert(isAccountForOwner(account, OWNER)); return account;
}

test('M6 imported working candidates remain immutable through open, explicit save and reopen',async()=>{
 const key='flow:poc:personal-workspace:v1:authoring-draft',raw=JSON.stringify({version:1,rawText:'# unsaved\r\n- [ ] keep'});
 const source=createLocalImportSource({length:1,key:()=>key,getItem:k=>k===key?raw:null});assert(source.ok);
 const imported=await prepareLocalImport(source.raw,'local-user',empty(),references);assert(imported.ok);
 let account=imported.account;const originals=canonicalJson(account.space.creatorWorkspace!.importedWorkingCandidates);
 const id=Object.keys(account.space.creatorWorkspace!.importedWorkingCandidates!.candidates)[0];
 account=commit(account,{type:'working',working:null,now:NOW}).account;
 const working=importedCreatorWorking(account.space.creatorWorkspace!,id);assert(working);
 account=commit(account,{type:'working',working,now:NOW}).account;assert.equal(Object.keys(account.space.creatorWorkspace!.library.records).length,0);
 account=save(account);assert.equal(Object.keys(account.space.creatorWorkspace!.library.records).length,1);
 account=commit(account,{type:'working',working:null,now:LATER}).account;
 const reopened=importedCreatorWorking(account.space.creatorWorkspace!,id);assert(reopened);assert.equal(reopened.baseRecordRevision,1);
 account=commit(account,{type:'working',working:reopened,now:LATER}).account;
 assert.equal(canonicalJson(account.space.creatorWorkspace!.importedWorkingCandidates),originals);
 const bad=structuredClone(account);bad.space.creatorWorkspace!.importedWorkingCandidates!.sources[key]+='tampered';
 assert(!preservesAlphaCreatorBoundary(account,bad,{type:'working',working:reopened,now:LATER},references));
});

test('first working checkpoint and library revision zero save are separate from explicit history', () => {
  const a = commit(empty(), { type: 'working', now: NOW, working: { draftId: 'draft', title: '준비', rawText: '', baseRecordRevision: null } }).account;
  assert.equal(a.space.creatorWorkspace!.library.revision, 0); assert.equal(a.space.creatorWorkspace!.savedHistory, undefined);
  const b = commit(a, { type: 'working', now: NOW, working: { ...a.space.creatorWorkspace!.working!, rawText: RAW } }).account;
  const c = save(b); assert.equal(c.space.creatorWorkspace!.library.records.draft.recordRevision, 1); assert.equal(c.space.creatorWorkspace!.savedHistory!.drafts.draft.length, 1);
  assert.deepEqual(c.space.text, empty().space.text); assert.deepEqual(JSON.parse(JSON.stringify(c)), c);
});
test('creator wire rejects owner, unknown fields, wrong version, non-finite revision and stale account', () => {
  const account = empty(), good = command(account, { type: 'working', now: NOW, working: null }); assert(isAlphaCreatorCommand(good));
  for (const bad of [{ ...good, ownerId: OWNER }, { ...good, schema: 'flowme-alpha-creator-command/2' }, { ...good, expectedRevision: -1 }, { ...good, expectedRevision: NaN }, { ...good, intent: { ...good.intent, injected: true } }]) assert(!isAlphaCreatorCommand(bad));
  assert.deepEqual(dispatchAlphaCreatorCommand(account, { ...good, expectedRevision: 1 }), { ok: false, reason: 'revision-conflict' });
});
test('working cannot forge a saved base, insert native import, or replace prior native provenance/journal', () => {
  const raw = rawSaved(), own = raw.space.creatorWorkspace!;
  assert(!allowedAlphaCreatorWorking(own, { ...own.working!, baseRecordRevision: 99 }));
  const native = nativeSeed(), working = native.space.creatorWorkspace!.working!;
  assert(!dispatchAlphaCreatorCommand(empty(), command(empty(), { type: 'working', now: LATER, working })).ok);
  const forged = structuredClone(working); forged.nativeDocument!.actions = []; const forgedSource = forged.nativeDocument!.source;
  assert('versionId' in forgedSource); forgedSource.versionId = 'forged';
  assert(!allowedAlphaCreatorWorking(native.space.creatorWorkspace, forged));
  assert(!dispatchAlphaCreatorCommand(native, command(native, { type: 'working', now: LATER, working: forged })).ok);
});
test('native pending input is stored as pending, blocks save, and synchronizes only by native operation', () => {
  let a = save(nativeSeed()); const before = a.space.creatorWorkspace!.savedHistory;
  a = commit(a, { type: 'working', now: LATER, working: { ...a.space.creatorWorkspace!.working!, nativePendingRawText: RAW + '\r\n사용자 미반영 입력' } }).account;
  assert.deepEqual(a.space.creatorWorkspace!.savedHistory, before);
  const w = a.space.creatorWorkspace!, raw = w.working!;
  const failed = dispatchAlphaCreatorCommand(a, command(a, { type: 'library-action', now: LATER, action: { type: 'save', draftId: 'draft', title: raw.title, rawText: raw.rawText, sourceFingerprint: fingerprint(raw.rawText), expectedLibraryRevision: w.library.revision, expectedRecordRevision: 1, now: LATER } })); assert(!failed.ok);
  const operation = buildProgramNativeCreatorRawSyncOperation(raw.nativeDocument!, raw.nativePendingRawText!); assert(operation.ok);
  a = commit(a, { type: 'native-operation', now: LATER, draftId: 'draft', operation: operation.operation }).account;
  assert.equal(a.space.creatorWorkspace!.working!.nativePendingRawText, undefined); assert.deepEqual(a.space.creatorWorkspace!.savedHistory, before);
  a = save(a); assert.match(a.space.creatorWorkspace!.library.records.draft.rawText, /사용자 미반영 입력/);
});
test('native operation appends journal and private handoff preserves immutable source and saved binding', () => {
  let a = save(nativeSeed()); const nativeSource = a.space.creatorWorkspace!.working!.nativeDocument!.source;
  const preview = inspectProgramNativeCreatorHandoff(data(a), { actorId: OWNER, draftId: 'draft' }, LATER); assert(preview.ok);
  const result = commit(a, { type: 'native-handoff', now: LATER, draftId: 'draft', choices: Object.fromEntries(preview.preview.rows.map(row => [row.itemId, choices])) }); a = result.account;
  assert.equal(a.space.text.documents.length, 1); assert.equal(a.space.legacySnapshot, null); assert.deepEqual(a.space.savedBindings, []);
  assert.deepEqual(a.space.creatorWorkspace!.working!.nativeDocument!.source, nativeSource);
  const itemId = a.space.creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items[0].itemId;
  const text = structuredClone(a.space.text); a = commit(a, { type: 'native-operation', now: LATER, draftId: 'draft', operation: { type: 'exclude', itemId } }).account;
  assert.equal(a.space.creatorWorkspace!.working!.nativeDocument!.actions.length, 1); assert.deepEqual(a.space.text, text);
  a = commit(a, { type: 'native-operation', now: LATER, draftId: 'draft', operation: { type: 'undo' } }).account;
  assert.equal(a.space.creatorWorkspace!.working!.nativeDocument!.actions.length, 2); assert.deepEqual(a.space.text, text);
});
test('native duplicate retains known provenance; rename, archive and restore stay creator-only', () => {
  let a = save(nativeSeed()); const source = structuredClone(a.space.creatorWorkspace!.working!.nativeDocument!.source);
  const w = a.space.creatorWorkspace!;
  a = commit(a, { type: 'library-action', now: LATER, action: { type: 'duplicate', sourceDraftId: 'draft', newDraftId: 'copy', expectedLibraryRevision: w.library.revision, expectedSourceRecordRevision: 1, now: LATER } }).account;
  assert.deepEqual(a.space.creatorWorkspace!.structureDrafts!.copy.nativeDocument!.source, source);
  assert.equal(a.space.creatorWorkspace!.handoffs.copy, undefined);
  for (const type of ['rename', 'archive', 'restore'] as const) {
    const library = a.space.creatorWorkspace!.library;
    const base = { draftId: 'copy', expectedLibraryRevision: library.revision, expectedRecordRevision: library.records.copy.recordRevision, now: LATER };
    a = commit(a, { type: 'library-action', now: LATER, action: type === 'rename' ? { ...base, type, title: '복제 제목' } : { ...base, type } }).account;
  }
  assert.equal(a.space.creatorWorkspace!.library.records.copy.title, '복제 제목');
  assert.equal(a.space.creatorWorkspace!.library.records.copy.status, 'active'); assert.deepEqual(a.space.text, empty().space.text);
});
test('native lineage recreates server preview, preserving explicitly linked private IDs and prior raw revisions', () => {
  let a = rawSaved(); a = commit(a, { type: 'raw-handoff', now: LATER, draftId: 'draft', expectedRecordRevision: 1, today: '2026-09-21' }).account;
  const seedWorking = nativeSeed().space.creatorWorkspace!.working!;
  // Synthetic pre-existing canonical context only; the live wire does not import it.
  const inserted = setProgramCreatorWorking(data(a), { actorId: OWNER, expectedWorking: a.space.creatorWorkspace!.working,
    working: { ...seedWorking, baseRecordRevision: 1 } }, LATER); assert(inserted.ok); a.space = inserted.data.spaces[OWNER]; a = save(a);
  const text = structuredClone(a.space.text), rawOwner = structuredClone(a.space.creatorWorkspace!.executionSources!.draft);
  const review = inspectProgramCreatorNativeLineage(data(a), { actorId: OWNER, draftId: 'draft' }, LATER); assert(review.ok);
  const mapping = { items: { [review.preview.items[0].itemId]: review.preview.existing[0].rowId }, remaining: {} };
  assert(!dispatchAlphaCreatorCommand(a, command(a, { type: 'native-lineage', now: LATER, draftId: 'draft', mapping: { items: { [review.preview.items[0].itemId]: 'unowned-row' }, remaining: {} } })).ok);
  a = commit(a, { type: 'native-lineage', now: LATER, draftId: 'draft', mapping }).account;
  assert.deepEqual(a.space.text, text); assert.deepEqual(a.space.creatorWorkspace!.executionSources!.draft.revisions, rawOwner.revisions);
  assert(a.space.creatorWorkspace!.nativeExecutionSources!.draft.rawLineage);
});
test('raw update selectors survive server regenerated random row IDs including new rows', () => {
  let a = rawSaved(); a = commit(a, { type: 'raw-handoff', now: LATER, draftId: 'draft', expectedRecordRevision: 1, today: '2026-09-21' }).account;
  a = commit(a, { type: 'working', now: LATER, working: { ...a.space.creatorWorkspace!.working!, rawText: RAW + '\r\n- [ ] 새 항목' } }).account; a = save(a);
  const preview = inspectCreatorUpdate(data(a), 'draft', LATER); assert(preview);
  const normalized = normalizeAlphaCreatorRawUpdateChoices(preview, Object.fromEntries(preview.rows.map(row => [row.id, choices])));
  const intent: AlphaCreatorIntent = { type: 'raw-update', now: LATER, draftId: 'draft', choices: normalized };
  assert(isAlphaCreatorCommand(command(a, intent))); const result = commit(a, intent);
  assert(M.tasks(result.account.space.text).some(task => task.title === '새 항목'));
  const forged = { ...intent, choices: { ...normalized, stale: choices } }; assert(!dispatchAlphaCreatorCommand(a, command(a, forged)).ok);
});
test('source candidate, decisions and apply update working only; source Undo leaves private execution intact', () => {
  let a = save(nativeSeed()); const before = structuredClone(a.space);
  const prepared = prepareProgramNativeSourceInput(a.space.creatorWorkspace!.working!.nativeDocument!, { rawText: RAW.replace('09:00', '11:00'), version: 'B', actorId: OWNER }, LATER); assert(prepared);
  const oldId = prepared.owner.document.parseResult.canonical.items[0].itemId, incomingId = prepared.candidateDocument.parseResult.canonical.items[0].itemId;
  const matches = programNativeSourceMatches(prepared, { [oldId]: incomingId }); assert(matches);
  a = commit(a, { type: 'source-stage', now: LATER, draftId: 'draft', envelope: prepared.envelope, candidateDocument: prepared.candidateDocument, matches }).account;
  const view = readProgramNativeSourceUpdate(data(a), OWNER, 'draft'); assert(view?.ok);
  for (const change of view.value.changes) a = commit(a, { type: 'source-transition', now: LATER, draftId: 'draft', event: { kind: 'decision', changeId: change.changeId, decision: 'use_incoming' } }).account;
  a = commit(a, { type: 'source-transition', now: LATER, draftId: 'draft', event: { kind: 'apply' } }).account;
  assert.deepEqual(a.space.text, before.text); assert.deepEqual(a.space.creatorWorkspace!.savedHistory, before.creatorWorkspace!.savedHistory);
  a = commit(a, { type: 'source-transition', now: LATER, draftId: 'draft', event: { kind: 'undo' } }).account; assert.deepEqual(a.space.text, before.text);
});
test('before/after guard rejects immutable history/source/binding modifications even with valid shapes', () => {
  const before = rawSaved(), intent: AlphaCreatorIntent = { type: 'working', now: LATER, working: before.space.creatorWorkspace!.working! };
  const history = structuredClone(before); delete history.space.creatorWorkspace!.savedHistory; assert(!preservesAlphaCreatorBoundary(before, history, intent));
  const source = structuredClone(before); source.source.revision++; assert(!preservesAlphaCreatorBoundary(before, source, intent));
  const text = structuredClone(before); text.space.text = M.addDocument(text.space.text, { title: 'smuggled' }); assert(!preservesAlphaCreatorBoundary(before, text, intent));
});
test('account native history restore uses retained immutable entry without device storage', () => {
  const make = (raw: string, revisionId: string) => { const doc = createTextAuthoringDocument(raw, { documentId: 'native-original', ownership: 'creator', title: '기존 제작', now: NOW }); return { ...doc, revision: { ...doc.revision, revisionId } }; };
  const original = createProgramData(), actorId = original.activeActorId;
  const payload = JSON.stringify({ schemaVersion: 1, drafts: { native: { draftId: 'native', title: '기존 제작', ownership: 'creator', status: 'draft', document: make(RAW + '\n새 문장', 'revision-b'), revisionId: 'revision-b', history: [
    { versionId: 'save-a', kind: 'saved', savedAt: NOW, revisionId: 'revision-a', document: make(RAW, 'revision-a') },
    { versionId: 'save-b', kind: 'saved', savedAt: LATER, revisionId: 'revision-b', document: make(RAW + '\n새 문장', 'revision-b') } ] } }, recoveries: {} });
  const imported = importNativeCreatorSavedHistory(original, { actorId, requestId: 'fixture-import', draftId: 'native', expectedSpace: original.spaces[actorId], expectedRaw: payload }, payload, LATER); assert(imported.ok);
  const a = empty(); a.space = imported.data.spaces[actorId]; assert(isAccountForOwner(a, OWNER));
  const draftId = imported.result, rows = a.space.creatorWorkspace!.savedHistory!.drafts[draftId], entry = rows.find(r => r.kind === 'text-authoring-v1')!;
  assert(previewAlphaCreatorSavedRestore(data(a), OWNER, draftId, entry.id).ok);
  const after = commit(a, { type: 'history-restore', now: LATER, draftId, revisionId: entry.id }).account;
  assert.equal(after.space.creatorWorkspace!.library.records[draftId].rawText, RAW);
  assert.deepEqual(after.space.creatorWorkspace!.savedHistory!.drafts[draftId].filter(r => r.kind === 'text-authoring-v1'), rows.filter(r => r.kind === 'text-authoring-v1'));
  assert.deepEqual(after.space.text, a.space.text); assert(validateProgramData(data(after)));
});
