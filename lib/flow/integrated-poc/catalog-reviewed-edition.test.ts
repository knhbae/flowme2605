import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { buildCatalogLibrarySnapshot } from './catalog-library-source';
import { CATALOG_LIBRARY_VERSION } from './catalog-library';
import { CATALOG_CONTENT_SEALS } from './catalog-content-seals';
import { buildCatalogContent, catalogContentFingerprint, CATALOG_CONTENT_REVIEWED_VERSION, CATALOG_CONTENT_V2_VERSION,
  projectCatalogContent, validateCatalogContent, type CatalogContent, type CatalogContentBundle } from './catalog-content-source';
import { getCurrentPublicSourceBundle, getPublishedPublicSourceEdition, getReviewedPublicSourceVersion,
  publicSourceBundleSha256 } from '../public-source-editions';
import { createNativeCreatorDocumentOwner, readNativeCreatorDocument, readNativeCreatorSourceDocument } from './native-creator-document';
import { isNativeCreatorCatalogContentSource, type NativeCreatorCatalogContentSource } from './native-creator-document-contract';
import { createProgramCreatorWorkspace, creatorWorkingFromRecord } from './creator-workspace';
import { buildProgramNativeCreatorRawSyncOperation } from './creator-native-workspace';
import { captureProgramCreatorSavedRevision } from './creator-history-snapshot';
import { transitionPersonalWorkspacePocCreatorDraftLibrary } from '../personal-workspace-poc-creator-drafts';
import { fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from '../personal-workspace-poc-authoring';
import { inspectProgramNativeCreatorHandoff } from './creator-native-execution-adapter';
import { programNativeExecutionRef } from './creator-native-execution-contract';
import { programNativeExecutionItemFacts } from './creator-native-execution-facts';
import { readProgramExecutionOccurrences } from './recurrence-state';
import { nativeInspectorPatch, nativeInspectorUnsafeReason } from '../../../components/flow/integrated-poc/creator-native-context-model';
import { ALPHA_CREATOR_COMMAND_SCHEMA, type AlphaCreatorIntent } from './alpha-creator/contract';
import { dispatchAlphaCreatorCommand } from './alpha-creator/dispatch-source';
import { ALPHA_COMMAND_SCHEMA, ALPHA_SCHEMA, type AlphaAccount, type AlphaPrivateCommand } from './alpha-persistence/contract';
import { createAlphaFakeServer } from './alpha-persistence/fake-server';
import { commandFromProgramTransition, materializeAccount } from './alpha-persistence/program-adapter';
import { canonicalJson } from './alpha-persistence/json';
import { isAccountForOwner } from './alpha-auth/account-access';
import { ALPHA_SOCIAL_CONTEXT_SCHEMA, alphaSocialReferences, emptyAlphaReferences, readAlphaSocialResponse,
  type AlphaSocialContext } from './alpha-social/projection';
import { recordProgramTaskProgress, updateProgramTask } from './private-space';
import { programReferenceExecutionAccess } from './reference-execution-guard';
import { createTextAuthoringDocument } from './native-creator-vendor/text-authoring/parser';
import { textWorkspaceModel as M } from './text-workspace';
import { publishedSourceEditions } from '../public-source-edition-data';
import { inspectCatalogContentCapability } from './catalog-content-source';

const OWNER = '11111111-1111-4111-8111-111111111111';
const NOW = '2026-10-10T03:00:00.000Z';
const SLUG = 'kitchen-reset-organize';
const OLD_DRAFT = 'kitchen-frozen-v2';
const NEW_DRAFT = 'kitchen-reviewed-v1';
const references = emptyAlphaReferences(OWNER);

function empty(): AlphaAccount {
  return { schema: ALPHA_SCHEMA, ownerId: OWNER, revision: 0,
    source: { schema: PROGRAM_SCHEMA, actorId: OWNER, revision: 0 },
    space: createProgramPrivateSpace(), legacyReceipts: [], legacyUndo: [] };
}

function reviewed() {
  const projected = buildCatalogContent(SLUG);
  assert(projected.ok, JSON.stringify(projected));
  assert.equal(projected.content.contractVersion, CATALOG_CONTENT_REVIEWED_VERSION);
  return projected;
}

function frozenKitchen() {
  const library = buildCatalogLibrarySnapshot(NOW);
  const original = library.bundles.find(bundle => bundle.flow.slug === SLUG);
  assert(original);
  const { status: _status, usage_count: _usage, copy_count: _copies, ...flow } = original.flow;
  const bundle: CatalogContentBundle = { ...structuredClone(original), flow: structuredClone(flow) };
  const content: CatalogContent = { contractVersion: CATALOG_CONTENT_V2_VERSION, catalogVersion: CATALOG_LIBRARY_VERSION,
    sourceSlug: SLUG, versionId: CATALOG_CONTENT_SEALS[SLUG].versionId, bundle };
  assert.equal(content.versionId, `catalog-content-v2-${SLUG}-${catalogContentFingerprint({ catalogVersion: CATALOG_LIBRARY_VERSION, bundle })}`);
  assert(validateCatalogContent(content), 'Only the actual frozen, sealed kitchen-v2 bytes may seed legacy replay.');
  const projected = projectCatalogContent(content);
  assert(projected.ok, JSON.stringify(projected));
  return { library, original, projected };
}

// Represents an already-saved legacy intake, not a request to import an old
// version as the current edition. The shared reader must accept its exact seal.
function existingFrozenAccount() {
  const frozen = frozenKitchen(), projected = frozen.projected;
  const source: NativeCreatorCatalogContentSource = { kind: 'catalog-content', version: 1,
    storageKey: 'flow:catalog-content:v1', draftId: `catalog-content:${SLUG}`, sourceSlug: SLUG,
    versionId: projected.content.versionId, revisionId: projected.document.revision.revisionId,
    contentJson: canonicalJson(projected.content), documentJson: canonicalJson(projected.document) };
  const native = createNativeCreatorDocumentOwner({ id: OLD_DRAFT, source }, NOW);
  assert(native.ok, JSON.stringify(native));
  const workspace = createProgramCreatorWorkspace(NOW);
  const saved = transitionPersonalWorkspacePocCreatorDraftLibrary(workspace.library, { type: 'save', draftId: OLD_DRAFT,
    expectedLibraryRevision: workspace.library.revision, title: projected.document.title,
    rawText: projected.document.rawText, sourceFingerprint: fingerprint(projected.document.rawText), now: NOW });
  assert(saved.changed); workspace.library = saved.library;
  workspace.structureDrafts = { [OLD_DRAFT]: { version: 1, recordRevision: workspace.library.records[OLD_DRAFT].recordRevision,
    contextRevision: 1, savedAt: NOW, nativeDocument: native.owner, nativeSelection: source } };
  captureProgramCreatorSavedRevision(workspace, workspace.library.records[OLD_DRAFT]);
  const account = empty(); account.space.creatorWorkspace = workspace;
  assert(isAccountForOwner(account, OWNER));
  return { account, frozen };
}

const intake = (version: string, draftId = NEW_DRAFT): AlphaCreatorIntent => ({ type: 'catalog-content-import',
  draftId, sourceSlug: SLUG, sourceVersionId: version, now: NOW });

function scenario(seed: AlphaAccount) {
  const server = createAlphaFakeServer([{ account: seed, references }]);
  const port = server.connect(server.issueSession(OWNER));
  let account = structuredClone(seed), sequence = 0;
  async function persist(command: AlphaPrivateCommand) {
    const receipt = await port.execute(command); assert(receipt.ok, JSON.stringify(receipt));
    const read = await port.read(); assert(read.ok, JSON.stringify(read));
    account = JSON.parse(canonicalJson(read.value));
    assert(isAccountForOwner(account, OWNER));
    return receipt;
  }
  return { server, get account() { return account; },
    async creator(intent: AlphaCreatorIntent) {
      const bytes = canonicalJson(account), requestId = `reviewed-creator-${++sequence}`;
      const result = dispatchAlphaCreatorCommand(account, { schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'creator',
        requestId, expectedRevision: account.revision, intent }, references);
      assert(result.ok, JSON.stringify(result)); assert.equal(canonicalJson(account), bytes);
      if (result.changed) await persist({ schema: ALPHA_COMMAND_SCHEMA, kind: 'change-private', requestId,
        expectedRevision: account.revision, changes: result.changes });
      else { assert.deepEqual(result.changes, []); assert.equal(canonicalJson(account), bytes); }
      return result;
    },
    async privateChange(build: (data: ProgramData, requestId: string) => ProgramTransition<string>) {
      const requestId = `reviewed-personal-${++sequence}`;
      return persist(commandFromProgramTransition(account, references, requestId, data => build(data, requestId)));
    },
  };
}

function sourceOf(account: AlphaAccount, draftId: string) {
  const source = account.space.creatorWorkspace!.structureDrafts![draftId].nativeDocument!.source;
  assert(isNativeCreatorCatalogContentSource(source));
  return source;
}

async function saveWorking(f: ReturnType<typeof scenario>, draftId: string) {
  const workspace = f.account.space.creatorWorkspace!, working = workspace.working;
  assert(working?.draftId === draftId); assert(working.baseRecordRevision !== null);
  const saved = await f.creator({ type: 'library-action', now: NOW, action: { type: 'save', draftId,
    title: working.title, rawText: working.rawText, sourceFingerprint: fingerprint(working.rawText),
    expectedLibraryRevision: workspace.library.revision, expectedRecordRevision: working.baseRecordRevision, now: NOW } });
  assert(saved.changed);
}

// The UI offers this explicit personal-use choice without an evidence note.
// It changes the private draft's review state, never the immutable source's gate.
async function choosePersonalUse(f: ReturnType<typeof scenario>, draftId: string) {
  const sourceBytes = canonicalJson(sourceOf(f.account, draftId));
  const working = creatorWorkingFromRecord(f.account.space.creatorWorkspace!, draftId); assert(working?.nativeDocument);
  await f.creator({ type: 'working', working, now: NOW });
  const gates = f.account.space.creatorWorkspace!.working!.nativeDocument!.document.reviewGates ?? [];
  assert.equal(gates.length, 1); const gate = gates[0];
  assert.equal(gate.kind, 'rights'); assert.equal(gate.status, 'required');
  const chosen = await f.creator({ type: 'native-operation', draftId, now: NOW,
    operation: { type: 'record_review_decision', gateId: gate.gateId, status: 'personal_only' } });
  assert(chosen.changed); await saveWorking(f, draftId);
  const saved = f.account.space.creatorWorkspace!.structureDrafts![draftId].nativeDocument!;
  assert.equal(saved.document.reviewGates![0].status, 'personal_only');
  assert.equal(saved.document.reviewGates![0].evidenceNote, undefined);
  assert.equal(canonicalJson(saved.source), sourceBytes);
  const original = readNativeCreatorSourceDocument(saved.source); assert(original);
  assert.equal(original.reviewGates![0].status, 'required');
}

async function handoff(f: ReturnType<typeof scenario>, draftId: string, version: string) {
  const preview = inspectProgramNativeCreatorHandoff(materializeAccount(f.account, references).data,
    { actorId: OWNER, draftId }, NOW);
  assert(preview.ok, JSON.stringify(preview)); assert.equal(preview.preview.sourceVersionId, version);
  const choices = Object.fromEntries(preview.preview.rows.map(row => [row.itemId,
    { source: 'incoming', date: 'incoming', time: 'incoming', children: 'incoming' } as const]));
  await f.creator({ type: 'native-handoff', draftId, choices, now: NOW });
  const owner = f.account.space.creatorWorkspace!.nativeExecutionSources![draftId];
  assert(isNativeCreatorCatalogContentSource(owner.revisions[0].nativeSelection));
  assert.equal(owner.revisions[0].nativeSelection.versionId, version);
  return { owner, preview: preview.preview };
}

test('actual registered reviewed kitchen builds, validates and projects its exact envelope', () => {
  const frozen = frozenKitchen(), edition = getPublishedPublicSourceEdition(SLUG);
  assert(edition); assert.equal(edition.sourceComparison, 'passed');
  assert.equal(publicSourceBundleSha256(edition.bundle), edition.bundleSha256);
  assert.equal(getReviewedPublicSourceVersion(edition.bundle), edition.version);
  assert.deepEqual(getCurrentPublicSourceBundle(frozen.original), edition.bundle);
  const projected = reviewed(), bytes = canonicalJson(projected.content);
  assert.equal(projected.content.versionId, edition.version);
  assert.equal(projected.content.bundle.flow.source_checked_at, '2026-10-10');
  assert.equal(projected.content.bundle.flow.updated_at, frozen.original.flow.updated_at);
  const { status: _status, usage_count: _usage, copy_count: _copies, ...flow } = edition.bundle.flow;
  assert.deepEqual(projected.content.bundle, { ...edition.bundle, flow });
  assert(validateCatalogContent(JSON.parse(bytes)));
  const replay = projectCatalogContent(JSON.parse(bytes)); assert(replay.ok);
  assert.deepEqual(replay, projected); assert.equal(projected.itemMapping.length, 4);
  assert.deepEqual(projected.content.bundle.repeatRules, []);
  assert(projected.document.parseResult.canonical.items.every(item => !item.recurrence && !item.sourceChecked));
  const forged = JSON.parse(bytes); forged.bundle.items[0].title = 'unregistered edit';
  assert.equal(validateCatalogContent(forged), false);
});

test('frozen kitchen-v2 and reviewed kitchen coexist without changing the old draft or personal workspace', async () => {
  const seed = existingFrozenAccount();
  const working = creatorWorkingFromRecord(seed.account.space.creatorWorkspace!, OLD_DRAFT); assert(working);
  seed.account.space.creatorWorkspace!.working = working;
  let text = M.addDocument(seed.account.space.text, { title: '보존할 개인 기록' });
  const documentId = text.documents.at(-1)!.id;
  text = M.addTask(text, { docId: documentId, title: '내 식재료 확인', date: '2026-10-12' });
  const task = M.tasks(text).find(item => item.docId === documentId); assert(task);
  text = M.updateTask(text, task.id, { note: '개인 메모 그대로' });
  seed.account.space.text = M.recordProgress(text, task.id, '2026-10-12', 35);
  assert(isAccountForOwner(seed.account, OWNER));
  const before = structuredClone(seed.account), f = scenario(seed.account), current = reviewed();
  const oldReplay = await f.creator(intake(seed.frozen.projected.content.versionId, 'old-replay-proposed'));
  assert.equal(oldReplay.changed, false); assert.equal(oldReplay.result, OLD_DRAFT);
  const imported = await f.creator(intake(current.content.versionId));
  assert(imported.changed); assert.deepEqual(imported.changes.map(change => change.field), ['creatorWorkspace']);
  const workspace = f.account.space.creatorWorkspace!;
  assert.deepEqual(Object.keys(workspace.library.records).sort(), [OLD_DRAFT, NEW_DRAFT].sort());
  assert.deepEqual(workspace.library.records[OLD_DRAFT], before.space.creatorWorkspace!.library.records[OLD_DRAFT]);
  assert.deepEqual(workspace.structureDrafts![OLD_DRAFT], before.space.creatorWorkspace!.structureDrafts![OLD_DRAFT]);
  assert.deepEqual(workspace.savedHistory!.drafts[OLD_DRAFT], before.space.creatorWorkspace!.savedHistory!.drafts[OLD_DRAFT]);
  assert.deepEqual(workspace.working, before.space.creatorWorkspace!.working);
  for (const field of Object.keys(before.space) as (keyof typeof before.space)[]) {
    if (field !== 'creatorWorkspace') assert.deepEqual(f.account.space[field], before.space[field], field);
  }
  assert.equal(sourceOf(f.account, OLD_DRAFT).versionId, seed.frozen.projected.content.versionId);
  assert.equal(sourceOf(f.account, NEW_DRAFT).versionId, current.content.versionId);
  assert.deepEqual(readNativeCreatorSourceDocument(sourceOf(f.account, OLD_DRAFT)), seed.frozen.projected.document);
  assert.deepEqual(readNativeCreatorSourceDocument(sourceOf(f.account, NEW_DRAFT)), current.document);
});

test('repeated reviewed intake is a no-op and archived exact edition cannot be duplicated or revived', async () => {
  const seed = existingFrozenAccount(), f = scenario(seed.account), current = reviewed();
  await f.creator(intake(current.content.versionId));
  const bytes = canonicalJson(f.account), diagnostics = f.server.diagnostics();
  const again = await f.creator(intake(current.content.versionId, 'reviewed-second-proposed'));
  assert.equal(again.changed, false); assert.equal(again.result, NEW_DRAFT);
  assert.equal(canonicalJson(f.account), bytes); assert.deepEqual(f.server.diagnostics(), diagnostics);
  const workspace = f.account.space.creatorWorkspace!;
  await f.creator({ type: 'library-action', now: NOW, action: { type: 'archive', draftId: NEW_DRAFT,
    expectedLibraryRevision: workspace.library.revision, expectedRecordRevision: workspace.library.records[NEW_DRAFT].recordRevision, now: NOW } });
  const archivedBytes = canonicalJson(f.account), archivedDiagnostics = f.server.diagnostics();
  const denied = dispatchAlphaCreatorCommand(f.account, { schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'creator',
    requestId: 'reviewed-archived-retry', expectedRevision: f.account.revision,
    intent: intake(current.content.versionId, 'reviewed-third-proposed') }, references);
  assert.deepEqual(denied, { ok: false, reason: 'conflict' });
  assert.equal(canonicalJson(f.account), archivedBytes); assert.deepEqual(f.server.diagnostics(), archivedDiagnostics);
  const oldReplay = await f.creator(intake(seed.frozen.projected.content.versionId, 'old-after-reviewed-archive'));
  assert.equal(oldReplay.changed, false); assert.equal(oldReplay.result, OLD_DRAFT);
});

test('reviewed native handoff retains token and personal date/memo/progress through fake reconnect and social read', async () => {
  const seed = existingFrozenAccount(), f = scenario(seed.account), current = reviewed();
  await choosePersonalUse(f, OLD_DRAFT);
  const old = await handoff(f, OLD_DRAFT, seed.frozen.projected.content.versionId);
  const oldTask = M.tasks(f.account.space.text).find(task => task.docId === old.owner.documentId); assert(oldTask);
  assert.equal(programReferenceExecutionAccess(f.account.space, oldTask.id).kind, 'active');
  await f.privateChange((data, requestId) => updateProgramTask(data, { actorId: OWNER, requestId,
    expectedSpace: data.spaces[OWNER], taskId: oldTask.id, patch: { date: '2026-10-11', note: '구 판본 개인 메모' } }));
  await f.privateChange((data, requestId) => recordProgramTaskProgress(data, { actorId: OWNER, requestId,
    expectedSpace: data.spaces[OWNER], taskId: oldTask.id, date: '2026-10-11', percent: 40 }));
  const oldSource = canonicalJson(sourceOf(f.account, OLD_DRAFT));
  const oldDocument = canonicalJson(M.getDocument(f.account.space.text, old.owner.documentId));
  const oldProgress = M.progressHistory(f.account.space.text, oldTask.id);
  await f.creator(intake(current.content.versionId));
  const incomingSource = canonicalJson(sourceOf(f.account, NEW_DRAFT));
  await choosePersonalUse(f, NEW_DRAFT);
  const next = await handoff(f, NEW_DRAFT, current.content.versionId);
  assert(next.preview.rows.every(row => row.sourceDate === null && row.sourceTime === null));
  const newTasks = M.tasks(f.account.space.text).filter(task => task.docId === next.owner.documentId);
  assert.equal(newTasks.length, 4); assert(newTasks.every(task => task.date === null && !task.done));
  assert(next.owner.revisions[0].rows.every(row => row.kind === 'ordinary'));
  const personal = newTasks[0];
  assert.equal(programReferenceExecutionAccess(f.account.space, personal.id).kind, 'active');
  await f.privateChange((data, requestId) => updateProgramTask(data, { actorId: OWNER, requestId,
    expectedSpace: data.spaces[OWNER], taskId: personal.id, patch: { date: '2026-10-13', note: '새 판본 개인 메모' } }));
  await f.privateChange((data, requestId) => recordProgramTaskProgress(data, { actorId: OWNER, requestId,
    expectedSpace: data.spaces[OWNER], taskId: personal.id, date: '2026-10-13', percent: 65 }));
  const newPort = f.server.connect(f.server.issueSession(OWNER)), reopened = await newPort.read(); assert(reopened.ok);
  const loaded = JSON.parse(canonicalJson(reopened.value)); assert(isAccountForOwner(loaded, OWNER));
  const context: AlphaSocialContext = { schema: ALPHA_SOCIAL_CONTEXT_SCHEMA, revision: 0,
    ownActorId: 'member-22222222-2222-4222-8222-222222222222',
    actors: [{ id: 'member-22222222-2222-4222-8222-222222222222', name: 'Local test member' }],
    public: references.public };
  const social = readAlphaSocialResponse(JSON.parse(canonicalJson({ ok: true, value: { account: loaded, context } })), OWNER);
  assert(social); assert.deepEqual(social.account, loaded);
  assert(isAccountForOwner(social.account, OWNER, alphaSocialReferences(social.context, OWNER)));
  const task = M.tasks(social.account.space.text).find(item => item.id === personal.id); assert(task);
  assert.equal(task.date, '2026-10-13'); assert.equal(task.note, '새 판본 개인 메모');
  assert.deepEqual(M.progressHistory(social.account.space.text, personal.id), [{ date: '2026-10-13', percent: 65 }]);
  assert.equal(canonicalJson(sourceOf(social.account, OLD_DRAFT)), oldSource);
  assert.equal(canonicalJson(M.getDocument(social.account.space.text, old.owner.documentId)), oldDocument);
  assert.deepEqual(M.progressHistory(social.account.space.text, oldTask.id), oldProgress);
  assert.equal(canonicalJson(sourceOf(social.account, NEW_DRAFT)), incomingSource);
  const native = social.account.space.creatorWorkspace!.nativeExecutionSources![NEW_DRAFT];
  assert(isNativeCreatorCatalogContentSource(native.revisions[0].nativeSelection));
  assert.equal(native.revisions[0].nativeSelection.versionId, current.content.versionId);
  const reconnectedPreview = inspectProgramNativeCreatorHandoff(materializeAccount(social.account, alphaSocialReferences(context, OWNER)).data,
    { actorId: OWNER, draftId: NEW_DRAFT }, NOW);
  assert(reconnectedPreview.ok); assert.equal(reconnectedPreview.preview.sourceVersionId, current.content.versionId);
  const retry = dispatchAlphaCreatorCommand(social.account, { schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'creator',
    requestId: 'reviewed-social-retry', expectedRevision: social.account.revision,
    intent: intake(current.content.versionId, 'reconnected-proposed') }, alphaSocialReferences(context, OWNER));
  assert(retry.ok); assert.equal(retry.changed, false); assert.equal(retry.result, NEW_DRAFT);
  const forged = structuredClone(social.account);
  sourceOf(forged, NEW_DRAFT).versionId = `${current.content.versionId}:unknown`;
  assert.equal(readAlphaSocialResponse({ ok: true, value: { account: forged, context } }, OWNER), null);
});

test('reviewed inspector date and repeat save, project real occurrences and survive fake reconnect without changing the edition', async () => {
  const f = scenario(empty()), current = reviewed();
  await f.creator(intake(current.content.versionId));
  const source = sourceOf(f.account, NEW_DRAFT), sourceBytes = canonicalJson(source);
  const original = readNativeCreatorSourceDocument(source); assert(original);
  const contentFields = (document: typeof current.document) => document.parseResult.canonical.items.map(item => ({
    itemId: item.itemId, stepId: item.stepId, title: item.title, detail: item.detail,
    completion: item.completion?.doneWhen, order: item.order,
    sourceUrls: item.sources.map(link => link.url), resourceUrls: item.resources.map(link => link.url),
    sourceAttribution: item.sources.map(({ url, label, type }) => ({ url, label, type })),
    resourceAttribution: item.resources.map(({ url, label, type }) => ({ url, label, type })),
  }));
  const originalFields = contentFields(original);
  const working = creatorWorkingFromRecord(f.account.space.creatorWorkspace!, NEW_DRAFT); assert(working?.nativeDocument);
  await f.creator({ type: 'working', working, now: NOW });
  const beforeWorkspace = f.account.space.creatorWorkspace!, beforeOwner = beforeWorkspace.working!.nativeDocument!;
  const savedBeforeEdit = canonicalJson(beforeWorkspace.structureDrafts![NEW_DRAFT]);
  const savedHistoryBeforeEdit = canonicalJson(beforeWorkspace.savedHistory!.drafts[NEW_DRAFT]);
  // Use the real full ItemInspector patch, not a synthetic native owner or raw-editor preparation.
  const item = beforeOwner.document.parseResult.canonical.items[1]; assert(item);
  const patch = { ...nativeInspectorPatch(beforeOwner.document, item), date: '2026-10-13', repeat: '매주 화', repeatEnd: '3회' };
  assert.equal(nativeInspectorUnsafeReason(beforeOwner.document, item, patch), undefined);
  const edited = await f.creator({ type: 'native-operation', draftId: NEW_DRAFT, now: NOW,
    operation: { type: 'sync_item_to_working_text', itemId: item.itemId, patch } });
  assert(edited.changed, 'The ordinary inspector operation must actually synchronize the personal fields.');
  const workspace = f.account.space.creatorWorkspace!, editedWorking = workspace.working!, editedOwner = editedWorking.nativeDocument!;
  assert.equal(editedOwner.revision, beforeOwner.revision + 1);
  const action = editedOwner.actions.at(-1); assert(action?.kind === 'operation');
  assert.equal(action.operation.type, 'sync_item_to_working_text');
  assert.equal(canonicalJson(editedOwner.source), sourceBytes);
  assert.deepEqual(readNativeCreatorSourceDocument(editedOwner.source), original);
  assert.equal(canonicalJson(workspace.structureDrafts![NEW_DRAFT]), savedBeforeEdit);
  assert.equal(canonicalJson(workspace.savedHistory!.drafts[NEW_DRAFT]), savedHistoryBeforeEdit);
  assert.deepEqual(contentFields(editedOwner.document), originalFields);
  assert.equal(editedWorking.rawText, editedOwner.document.rawText);
  assert.match(editedWorking.rawText, /  - 날짜: 2026-10-13\n/u);
  assert.match(editedWorking.rawText, /  - 반복: 매주 화\n/u);
  assert.match(editedWorking.rawText, /  - 반복 종료: 3회\n/u);
  assert(original.parseResult.canonical.items.every(row => !row.schedule && !row.recurrence));
  const personalItem = editedOwner.document.parseResult.canonical.items.find(row => row.itemId === item.itemId); assert(personalItem);
  const facts = programNativeExecutionItemFacts(personalItem);
  assert.equal(facts.kind, 'series'); assert.equal(facts.date, '2026-10-13'); assert.equal(facts.recurrenceInvalid, false);
  assert(facts.rule); assert.equal(facts.rule.frequency, 'weekly'); assert.deepEqual(facts.rule.weekdays, ['TU']);
  assert.deepEqual(facts.rule.end, { mode: 'count', count: 3, raw: '3회' });
  const dates = ['2026-10-13', '2026-10-20', '2026-10-27'];
  const calendar = readNativeCreatorDocument(editedOwner); assert(calendar.ok, JSON.stringify(calendar));
  assert.deepEqual(calendar.projection.artifacts.calendar.rows.filter(row => row.itemId === item.itemId).map(row => row.date), dates);
  const recordRevision = workspace.library.records[NEW_DRAFT].recordRevision;
  assert.equal(editedWorking.baseRecordRevision, recordRevision);
  const saved = await f.creator({ type: 'library-action', now: NOW, action: { type: 'save', draftId: NEW_DRAFT,
    title: editedWorking.title, rawText: editedWorking.rawText, sourceFingerprint: fingerprint(editedWorking.rawText),
    expectedLibraryRevision: workspace.library.revision, expectedRecordRevision: recordRevision, now: NOW } });
  assert(saved.changed);
  const savedWorkspace = f.account.space.creatorWorkspace!;
  assert.equal(savedWorkspace.library.records[NEW_DRAFT].recordRevision, recordRevision + 1);
  assert.equal(canonicalJson(savedWorkspace.structureDrafts![NEW_DRAFT].nativeDocument), canonicalJson(editedOwner));
  assert.equal(canonicalJson(sourceOf(f.account, NEW_DRAFT)), sourceBytes);
  const next = await handoff(f, NEW_DRAFT, current.content.versionId);
  assert.equal(next.owner.revisions[0].rows.filter(row => row.kind === 'series').length, 1);
  assert.equal(next.owner.revisions[0].rows.filter(row => row.kind === 'ordinary').length, 3);
  assert.equal(next.preview.rows.find(row => row.itemId === item.itemId)?.sourceDate, dates[0]);
  assert.deepEqual(contentFields(next.owner.revisions[0].nativeDocument.document), originalFields);
  const occurrenceInput = { actorId: OWNER, flowRef: programNativeExecutionRef(next.owner.id), localToday: '2026-10-10' };
  const occurrences = readProgramExecutionOccurrences(materializeAccount(f.account, references).data, occurrenceInput);
  assert(occurrences.ok, JSON.stringify(occurrences));
  assert.equal(occurrences.series.length, 1); assert.equal(occurrences.series[0].manifest.mode, 'finite');
  assert.deepEqual(occurrences.rows.map(row => row.originalDate), dates);
  assert.deepEqual(occurrences.rows.map(row => row.executionDate), dates);
  assert(occurrences.rows.every(row => row.itemId === item.itemId && row.identity.nativeOwner?.rule.raw === '매주 화'
    && row.identity.sourceRule.recurrenceEnd === '3회' && row.completion === 'unrecorded'));
  // This is a bounded read projection; no rights-review decision or occurrence-completion write is fabricated.
  const newPort = f.server.connect(f.server.issueSession(OWNER)), reopened = await newPort.read(); assert(reopened.ok);
  const loaded = JSON.parse(canonicalJson(reopened.value)); assert(isAccountForOwner(loaded, OWNER));
  const context: AlphaSocialContext = { schema: ALPHA_SOCIAL_CONTEXT_SCHEMA, revision: 0,
    ownActorId: 'member-22222222-2222-4222-8222-222222222222',
    actors: [{ id: 'member-22222222-2222-4222-8222-222222222222', name: 'Local test member' }], public: references.public };
  const social = readAlphaSocialResponse(JSON.parse(canonicalJson({ ok: true, value: { account: loaded, context } })), OWNER);
  assert(social); assert.deepEqual(social.account, loaded);
  const reconnectedWorking = creatorWorkingFromRecord(social.account.space.creatorWorkspace!, NEW_DRAFT); assert(reconnectedWorking?.nativeDocument);
  const reader = readNativeCreatorDocument(reconnectedWorking.nativeDocument); assert(reader.ok, JSON.stringify(reader));
  assert.equal(canonicalJson(reconnectedWorking.nativeDocument.source), sourceBytes);
  assert.deepEqual(readNativeCreatorSourceDocument(reconnectedWorking.nativeDocument.source), original);
  assert.deepEqual(contentFields(reader.document), originalFields);
  const reconnectedItem = reader.document.parseResult.canonical.items.find(row => row.itemId === item.itemId); assert(reconnectedItem);
  assert.deepEqual(programNativeExecutionItemFacts(reconnectedItem), facts);
  assert.deepEqual(reader.projection.artifacts.calendar.rows.filter(row => row.itemId === item.itemId).map(row => row.date), dates);
  const reconnectedOccurrences = readProgramExecutionOccurrences(materializeAccount(social.account, alphaSocialReferences(social.context, OWNER)).data, occurrenceInput);
  assert(reconnectedOccurrences.ok, JSON.stringify(reconnectedOccurrences));
  assert.deepEqual(reconnectedOccurrences, occurrences);
});

test('reviewed inspector keeps known same-URL type, accepts explicit rename and does not carry it to a changed URL', async () => {
  const f = scenario(empty()), current = reviewed();
  await f.creator(intake(current.content.versionId));
  const sourceBytes = canonicalJson(sourceOf(f.account, NEW_DRAFT));
  const working = creatorWorkingFromRecord(f.account.space.creatorWorkspace!, NEW_DRAFT); assert(working?.nativeDocument);
  await f.creator({ type: 'working', working, now: NOW });
  const before = f.account.space.creatorWorkspace!.working!.nativeDocument!;
  const item = before.document.parseResult.canonical.items[1]; assert(item);
  assert.equal(item.sources.length, 1); const known = item.sources[0];
  assert.equal(known.type, 'reference'); assert.equal(known.label, current.content.bundle.flow.source_title);
  const renamedLabel = '개인 작업에서 고친 출처 이름';
  const renamedPatch = { ...nativeInspectorPatch(before.document, item), source: `${renamedLabel} ${known.url}` };
  assert.equal(nativeInspectorUnsafeReason(before.document, item, renamedPatch), undefined);
  const renamed = await f.creator({ type: 'native-operation', draftId: NEW_DRAFT, now: NOW,
    operation: { type: 'sync_item_to_working_text', itemId: item.itemId, patch: renamedPatch } });
  assert(renamed.changed);
  const renamedOwner = f.account.space.creatorWorkspace!.working!.nativeDocument!;
  const renamedItem = renamedOwner.document.parseResult.canonical.items.find(row => row.itemId === item.itemId); assert(renamedItem);
  assert.equal(renamedItem.sources[0].url, known.url);
  assert.equal(renamedItem.sources[0].type, known.type);
  assert.equal(renamedItem.sources[0].label, renamedLabel);
  assert.deepEqual(renamedItem.sources[0].sourceRowIds, known.sourceRowIds);
  for (const unchanged of renamedOwner.document.parseResult.canonical.items.filter(row => row.itemId !== item.itemId)) {
    const original = before.document.parseResult.canonical.items.find(row => row.itemId === unchanged.itemId); assert(original);
    assert.deepEqual(unchanged.sources, original.sources); assert.deepEqual(unchanged.resources, original.resources);
  }
  assert.equal(canonicalJson(renamedOwner.source), sourceBytes);
  const replacementUrl = 'https://example.com/reviewed-personal-replacement';
  const replacementLabel = '다른 개인 출처';
  const replacementPatch = { ...nativeInspectorPatch(renamedOwner.document, renamedItem), source: `${replacementLabel} ${replacementUrl}` };
  assert.equal(nativeInspectorUnsafeReason(renamedOwner.document, renamedItem, replacementPatch), undefined);
  const replacement = await f.creator({ type: 'native-operation', draftId: NEW_DRAFT, now: NOW,
    operation: { type: 'sync_item_to_working_text', itemId: item.itemId, patch: replacementPatch } });
  assert(replacement.changed);
  const replacementOwner = f.account.space.creatorWorkspace!.working!.nativeDocument!;
  const replacedItem = replacementOwner.document.parseResult.canonical.items.find(row => row.itemId === item.itemId); assert(replacedItem);
  // Compare with the existing source parser, not a new claim that this URL was verified as official.
  const freshParse = createTextAuthoringDocument(replacementOwner.document.rawText, { documentId: replacementOwner.document.documentId,
    ownership: 'creator', title: replacementOwner.document.title, now: replacementOwner.document.createdAt });
  const freshItem = freshParse.parseResult.canonical.items[1]; assert(freshItem);
  assert.equal(replacedItem.sources[0].url, replacementUrl); assert.equal(replacedItem.sources[0].label, replacementLabel);
  assert.equal(replacedItem.sources[0].type, freshItem.sources[0].type);
  assert.notEqual(replacedItem.sources[0].type, known.type);
  assert.equal(canonicalJson(replacementOwner.source), sourceBytes);
  await saveWorking(f, NEW_DRAFT);
  const newPort = f.server.connect(f.server.issueSession(OWNER)), reopened = await newPort.read(); assert(reopened.ok);
  const loaded = JSON.parse(canonicalJson(reopened.value)); assert(isAccountForOwner(loaded, OWNER));
  const reconnected = creatorWorkingFromRecord(loaded.space.creatorWorkspace!, NEW_DRAFT); assert(reconnected?.nativeDocument);
  const reader = readNativeCreatorDocument(reconnected.nativeDocument); assert(reader.ok);
  const reconnectedItem = reader.document.parseResult.canonical.items.find(row => row.itemId === item.itemId); assert(reconnectedItem);
  assert.deepEqual(reconnectedItem.sources, replacedItem.sources);
  assert.equal(canonicalJson(reconnected.nativeDocument.source), sourceBytes);
});

test('reviewed raw sync does not carry link attribution across categories or new Item lineage', async () => {
  const f = scenario(empty()), current = reviewed();
  await f.creator(intake(current.content.versionId));
  const working = creatorWorkingFromRecord(f.account.space.creatorWorkspace!, NEW_DRAFT); assert(working?.nativeDocument);
  await f.creator({ type: 'working', working, now: NOW });
  const before = f.account.space.creatorWorkspace!.working!.nativeDocument!, sourceBytes = canonicalJson(before.source);
  const item = before.document.parseResult.canonical.items[1]; assert(item);
  assert.equal(item.sources.length, 1); assert.equal(item.resources.length, 0);
  const known = item.sources[0]; assert.equal(known.type, 'reference');
  const sourceRow = before.document.parseResult.canonical.sourceRows.find(row => known.sourceRowIds.includes(row.sourceRowId));
  assert(sourceRow); assert.match(sourceRow.rawText, /출처:/u);

  // Normal raw-editor checkpoint and guarded command; this URL is private input,
  // not a claim about a newly verified public source.
  const privateUrl = 'https://example.com/reviewed-raw-category';
  const sourceLine = `  - 출처: ${privateUrl}`;
  const changedLines = before.document.rawText.split('\n'), sourceLineIndex = sourceRow.sourceRange.startLine - 1;
  assert.equal(sourceRow.sourceRange.endLine, sourceRow.sourceRange.startLine);
  assert.equal(changedLines[sourceLineIndex], sourceRow.rawText);
  changedLines[sourceLineIndex] = sourceLine;
  const changedRaw = changedLines.join('\n');
  await f.creator({ type: 'working', working: { ...f.account.space.creatorWorkspace!.working!, nativePendingRawText: changedRaw }, now: NOW });
  const changedOperation = buildProgramNativeCreatorRawSyncOperation(before, changedRaw); assert(changedOperation.ok);
  const changed = await f.creator({ type: 'native-operation', draftId: NEW_DRAFT, operation: changedOperation.operation, now: NOW });
  assert(changed.changed);
  const changedOwner = f.account.space.creatorWorkspace!.working!.nativeDocument!;
  const changedItem = changedOwner.document.parseResult.canonical.items.find(row => row.itemId === item.itemId); assert(changedItem);
  const privateSource = changedItem.sources[0]; assert.equal(privateSource.url, privateUrl);
  const freshSource = createTextAuthoringDocument(changedRaw, { documentId: before.document.documentId,
    ownership: 'creator', title: before.document.title, now: before.document.createdAt }).parseResult.canonical.items[1].sources[0];
  assert.equal(privateSource.type, freshSource.type); assert.notEqual(privateSource.type, known.type);

  const resourceLine = `  - 자료: ${privateUrl}`;
  const movedRaw = changedOwner.document.rawText.replace(sourceLine, resourceLine);
  await f.creator({ type: 'working', working: { ...f.account.space.creatorWorkspace!.working!, nativePendingRawText: movedRaw }, now: NOW });
  const movedOperation = buildProgramNativeCreatorRawSyncOperation(changedOwner, movedRaw); assert(movedOperation.ok);
  const moved = await f.creator({ type: 'native-operation', draftId: NEW_DRAFT, operation: movedOperation.operation, now: NOW });
  assert(moved.changed);
  const movedOwner = f.account.space.creatorWorkspace!.working!.nativeDocument!;
  const movedItem = movedOwner.document.parseResult.canonical.items.find(row => row.itemId === item.itemId); assert(movedItem);
  assert.deepEqual(movedItem.sources, []); assert.equal(movedItem.resources.length, 1);
  const resource = movedItem.resources[0]; assert.equal(resource.url, privateSource.url);
  const freshResource = createTextAuthoringDocument(movedRaw, { documentId: before.document.documentId,
    ownership: 'creator', title: before.document.title, now: before.document.createdAt }).parseResult.canonical.items[1].resources[0];
  assert.equal(resource.type, freshResource.type); assert.notEqual(resource.type, privateSource.type);
  assert.notDeepEqual(resource.sourceRowIds, privateSource.sourceRowIds);

  // An explicitly added private working Item is not added to the bound edition.
  const addedTitle = '개인 원문 연결 확인', addedLabel = '원문 재연결';
  const addedRaw = `${movedOwner.document.rawText.trimEnd()}\n- [ ] ${addedTitle}\n  - 출처: ${addedLabel} ${known.url}\n`;
  await f.creator({ type: 'working', working: { ...f.account.space.creatorWorkspace!.working!, nativePendingRawText: addedRaw }, now: NOW });
  const addedOperation = buildProgramNativeCreatorRawSyncOperation(movedOwner, addedRaw); assert(addedOperation.ok);
  const added = await f.creator({ type: 'native-operation', draftId: NEW_DRAFT, operation: addedOperation.operation, now: NOW });
  assert(added.changed);
  const addedOwner = f.account.space.creatorWorkspace!.working!.nativeDocument!;
  const addedItem = addedOwner.document.parseResult.canonical.items.find(row => row.title === addedTitle); assert(addedItem);
  assert.equal(addedOwner.document.parseResult.canonical.items.length, 5);
  assert(!movedOwner.document.parseResult.canonical.items.some(row => row.itemId === addedItem.itemId));
  const addedSource = addedItem.sources[0]; assert.equal(addedSource.url, known.url); assert.equal(addedSource.label, addedLabel);
  assert.notEqual(addedSource.type, known.type);
  assert(addedSource.sourceRowIds.every(rowId => !known.sourceRowIds.includes(rowId)));
  assert.equal(canonicalJson(addedOwner.source), sourceBytes);
  assert.equal(readNativeCreatorSourceDocument(addedOwner.source)!.parseResult.canonical.items.length, 4);
  assert.deepEqual((addedOwner.document.reviewGates ?? []).map(gate => [gate.kind, gate.status]), [['rights', 'required']]);
  assert.equal(f.account.space.creatorWorkspace!.working!.nativePendingRawText, undefined);
});

test('reviewed raw sync snapshots exact attribution for Undo and reader rejects forged current type or label', async () => {
  const f = scenario(empty()), current = reviewed();
  await f.creator(intake(current.content.versionId));
  const working = creatorWorkingFromRecord(f.account.space.creatorWorkspace!, NEW_DRAFT); assert(working?.nativeDocument);
  await f.creator({ type: 'working', working, now: NOW });
  const before = f.account.space.creatorWorkspace!.working!.nativeDocument!, sourceBytes = canonicalJson(before.source);
  const document = before.document, item = document.parseResult.canonical.items[1]; assert(item);
  const rootRow = document.parseResult.canonical.sourceRows.find(row => item.sourceRowIds.includes(row.sourceRowId) && row.rawText.startsWith('- [ ] '));
  assert(rootRow); assert.equal(item.sources[0].type, 'reference');
  // The original operation's JSON snapshot contract omits undefined fields.
  const snapshot = JSON.parse(JSON.stringify({ parseResult: document.parseResult, title: document.title, rawText: document.rawText,
    inputKinds: document.inputKinds, primaryInputKind: document.primaryInputKind, sourceTitle: document.sourceTitle,
    sourceUrl: document.sourceUrl, reviewGates: document.reviewGates ?? [], sourceState: document.sourceState,
    lifecycleStatus: document.lifecycleStatus }));
  const rawText = document.rawText.replace(rootRow.rawText, '- [ ] 개인 원문 점검');
  await f.creator({ type: 'working', working: { ...f.account.space.creatorWorkspace!.working!, nativePendingRawText: rawText }, now: NOW });
  const operation = buildProgramNativeCreatorRawSyncOperation(before, rawText); assert(operation.ok);
  const edited = await f.creator({ type: 'native-operation', draftId: NEW_DRAFT, operation: operation.operation, now: NOW });
  assert(edited.changed);
  const editedOwner = f.account.space.creatorWorkspace!.working!.nativeDocument!;
  assert.deepEqual(editedOwner.document.revision.before, snapshot);
  const editedItem = editedOwner.document.parseResult.canonical.items.find(row => row.itemId === item.itemId); assert(editedItem);
  assert.equal(editedItem.title, '개인 원문 점검'); assert.deepEqual(editedItem.sources, item.sources);
  assert.equal(canonicalJson(editedOwner.source), sourceBytes);
  for (const field of ['type', 'label'] as const) {
    const forged = structuredClone(editedOwner), link = forged.document.parseResult.canonical.items.find(row => row.itemId === item.itemId)!.sources[0];
    if (field === 'type') link.type = 'official';
    else link.label = '조작한 현재 출처 이름';
    assert.deepEqual(forged.actions, editedOwner.actions); assert.deepEqual(forged.source, editedOwner.source);
    assert.deepEqual(readNativeCreatorDocument(forged), { ok: false, reason: 'invalid' }, field);
  }
  const undone = await f.creator({ type: 'native-operation', draftId: NEW_DRAFT, operation: { type: 'undo' }, now: NOW });
  assert(undone.changed);
  const owner = f.account.space.creatorWorkspace!.working!.nativeDocument!, reader = readNativeCreatorDocument(owner); assert(reader.ok);
  assert.equal(owner.revision, editedOwner.revision + 1); assert.equal(owner.actions.length, editedOwner.actions.length + 1);
  assert.equal(owner.document.revision.parentRevisionId, editedOwner.document.revision.revisionId);
  assert.deepEqual(owner.document.revision.operations, [{ type: 'undo' }]);
  assert.deepEqual(owner.document.parseResult.canonical, snapshot.parseResult.canonical);
  assert.equal(owner.document.rawText, snapshot.rawText); assert.equal(owner.document.title, snapshot.title);
  assert.deepEqual(owner.document.inputKinds, snapshot.inputKinds); assert.equal(owner.document.primaryInputKind, snapshot.primaryInputKind);
  assert.equal(owner.document.sourceTitle, snapshot.sourceTitle); assert.equal(owner.document.sourceUrl, snapshot.sourceUrl);
  assert.deepEqual(owner.document.reviewGates, snapshot.reviewGates); assert.deepEqual(owner.document.sourceState, snapshot.sourceState);
  assert.equal(owner.document.lifecycleStatus, snapshot.lifecycleStatus);
  assert.deepEqual(owner.document.revisionHistory.slice(0, -1), editedOwner.document.revisionHistory);
  assert.equal(canonicalJson(owner.source), sourceBytes);
  assert.equal(f.account.space.creatorWorkspace!.working!.rawText, document.rawText);
});

test('every exact qualified edition has a lossless locator and no unreviewed source gains capability', () => {
  assert.equal(publishedSourceEditions.length, 14);
  for (const edition of publishedSourceEditions) {
    const capability = inspectCatalogContentCapability(edition.sourceSlug);
    assert(capability.ready, `${edition.sourceSlug}: ${JSON.stringify(capability)}`);
    const projected = buildCatalogContent(edition.sourceSlug); assert(projected.ok, edition.sourceSlug);
    assert.equal(projected.content.versionId, edition.version);
    assert.equal(projected.content.contractVersion, CATALOG_CONTENT_REVIEWED_VERSION);
    assert(validateCatalogContent(projected.content));
    assert.deepEqual(projectCatalogContent(JSON.parse(canonicalJson(projected.content))), projected);
    assert.equal(projected.document.parseResult.canonical.items.length, edition.bundle.items.length);
    for (const [index, item] of projected.document.parseResult.canonical.items.entries()) {
      const original = edition.bundle.items[index];
      assert.equal(item.title, original.title); assert.equal(item.sourceChecked, false);
      if (original.repeat_rule) {
        assert.equal(original.repeat_rule, '매일');
        const facts = programNativeExecutionItemFacts(item);
        assert.equal(facts.rule?.raw, original.repeat_rule);
        assert.equal(facts.rule?.frequency, 'daily'); assert.equal(facts.rule?.interval, 1);
        assert.equal(facts.rule?.end, undefined);
      } else assert.equal(item.recurrence, undefined);
      if (original.day_offset === undefined) assert.equal(item.schedule, undefined);
    }
    const forged = JSON.parse(canonicalJson(projected.content));
    forged.bundle.items[0].repeat_rule = '매주 일';
    assert.equal(validateCatalogContent(forged), false);
  }
  for (const slug of ['english-study-30day-routine', 'fridge-cleanout-weekly-plan',
    'infant-health-checkup-schedule', 'dog-adoption-first-week', 'unknown']) {
    assert.equal(getPublishedPublicSourceEdition(slug), undefined);
    assert.equal(inspectCatalogContentCapability(slug).ready, false, slug);
    assert.equal(buildCatalogContent(slug).ok, false, slug);
  }
});

test('newly connected qualified editions survive fake CAS reconnect and reuse the same draft', async () => {
  const slugs = ['morning-skincare-routine', 'first-passport-issue', 'lease-contract-report-deadline',
    'real-safe-driving-license-renewal', 'birth-registration-prep', 'customs-traveler-declare',
    'seal-or-signature-certificate', 'real-kdca-travel-health-check', 'morning-routine-30day'];
  for (const slug of slugs) {
    const f = scenario(empty()), projected = buildCatalogContent(slug); assert(projected.ok, slug);
    const draftId = `qualified-${slug}`, intent: AlphaCreatorIntent = { type: 'catalog-content-import',
      draftId, sourceSlug: slug, sourceVersionId: projected.content.versionId, now: NOW };
    const imported = await f.creator(intent); assert(imported.changed);
    const source = sourceOf(f.account, draftId), sourceBytes = canonicalJson(source);
    assert.equal(source.versionId, projected.content.versionId);
    const port = f.server.connect(f.server.issueSession(OWNER)), read = await port.read(); assert(read.ok);
    const account = JSON.parse(canonicalJson(read.value)); assert(isAccountForOwner(account, OWNER));
    const loaded = creatorWorkingFromRecord(account.space.creatorWorkspace!, draftId); assert(loaded?.nativeDocument);
    const reader = readNativeCreatorDocument(loaded.nativeDocument); assert(reader.ok, slug);
    assert.equal(canonicalJson(loaded.nativeDocument.source), sourceBytes);
    assert.deepEqual(reader.document, projected.document);
    assert.equal(Object.keys(account.space.creatorWorkspace!.library.records).length, 1);
    const before = canonicalJson(f.account), diagnostics = f.server.diagnostics();
    const duplicate = await f.creator({ ...intent, draftId: `duplicate-${slug}` });
    assert.equal(duplicate.changed, false); assert.equal(duplicate.result, draftId);
    assert.equal(canonicalJson(f.account), before); assert.deepEqual(f.server.diagnostics(), diagnostics);
  }
});

test('qualified daily source keeps its real repeat while personal date and bounded end survive reconnect', async () => {
  const slug = 'morning-routine-30day', draftId = 'qualified-daily';
  const f = scenario(empty()), projected = buildCatalogContent(slug); assert(projected.ok);
  await f.creator({ type: 'catalog-content-import', draftId, sourceSlug: slug,
    sourceVersionId: projected.content.versionId, now: NOW });
  const sourceBytes = canonicalJson(sourceOf(f.account, draftId));
  const working = creatorWorkingFromRecord(f.account.space.creatorWorkspace!, draftId); assert(working?.nativeDocument);
  await f.creator({ type: 'working', working, now: NOW });
  const original = working.nativeDocument.document, item = original.parseResult.canonical.items[0];
  assert.equal(item.schedule, undefined); assert.equal(programNativeExecutionItemFacts(item).rule?.raw, '매일');
  assert.equal(programNativeExecutionItemFacts(item).date, null);
  assert.equal(programNativeExecutionItemFacts(item).rule?.end, undefined, 'The removed 30-day challenge cannot return as a default.');
  const undated = readNativeCreatorDocument(working.nativeDocument); assert(undated.ok);
  assert.equal(undated.projection.artifacts.calendar.rows.length, 0);
  assert.equal(original.parseResult.issues.filter(issue => issue.messageKey === 'authoring.recurrence_requires_start_date').length, 4);
  const patch = { ...nativeInspectorPatch(original, item), date: '2026-10-13', repeatEnd: '3회' };
  assert.equal(patch.repeat, '매일'); assert.equal(nativeInspectorUnsafeReason(original, item, patch), undefined);
  const changed = await f.creator({ type: 'native-operation', draftId, now: NOW,
    operation: { type: 'sync_item_to_working_text', itemId: item.itemId, patch } }); assert(changed.changed);
  await saveWorking(f, draftId);
  const port = f.server.connect(f.server.issueSession(OWNER)), read = await port.read(); assert(read.ok);
  const account = JSON.parse(canonicalJson(read.value)); assert(isAccountForOwner(account, OWNER));
  const loaded = creatorWorkingFromRecord(account.space.creatorWorkspace!, draftId); assert(loaded?.nativeDocument);
  const reader = readNativeCreatorDocument(loaded.nativeDocument); assert(reader.ok);
  assert.equal(canonicalJson(loaded.nativeDocument.source), sourceBytes);
  assert.deepEqual(readNativeCreatorSourceDocument(loaded.nativeDocument.source), original);
  const reopened = reader.document.parseResult.canonical.items.find(row => row.itemId === item.itemId); assert(reopened);
  const facts = programNativeExecutionItemFacts(reopened);
  assert.equal(facts.date, '2026-10-13'); assert.equal(facts.rule?.raw, '매일');
  assert.deepEqual(facts.rule?.end, { mode: 'count', count: 3, raw: '3회' });
  assert.deepEqual(reader.projection.artifacts.calendar.rows.filter(row => row.itemId === item.itemId).map(row => row.date),
    ['2026-10-13', '2026-10-14', '2026-10-15']);
  // The existing full-block reparse regenerates derived property ids before
  // restoring Item/source-row lineage. Compare every persisted fact and link,
  // including Item and sourceRowIds, not these derived property identifiers.
  const stableItem = (row: typeof item) => ({ ...row,
    properties: row.properties.map(({ propertyId: _derivedId, ...property }) => property) });
  assert.deepEqual(reader.document.parseResult.canonical.items.filter(row => row.itemId !== item.itemId).map(stableItem),
    original.parseResult.canonical.items.filter(row => row.itemId !== item.itemId).map(stableItem));
});
