import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_SCHEMA } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { canonicalJson } from './alpha-persistence/json';
import { isAccountForOwner } from './alpha-auth/account-access';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { buildCatalogContentV3Candidate, CATALOG_CONTENT_V3_CANDIDATE_SLUGS } from './catalog-content-source';
import type { NativeCreatorCatalogContentSource, NativeCreatorDocumentOwner } from './native-creator-document-contract';
import { createProgramCreatorWorkspace } from './creator-workspace';
import { transitionPersonalWorkspacePocCreatorDraftLibrary } from '../personal-workspace-poc-creator-drafts';
import { fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from '../personal-workspace-poc-authoring';
import { ALPHA_CREATOR_COMMAND_SCHEMA, type AlphaCreatorIntent } from './alpha-creator/contract';
import { dispatchAlphaCreatorCommand } from './alpha-creator/dispatch-source';
import { programNativeExecutionItemFacts } from './creator-native-execution-facts';
import { emptyAlphaReferences } from './alpha-social/projection';
import { createAccountBackup, validateAccountBackup } from './alpha-preservation/backup';
import { createCreatorInverse, applyCreatorInverse } from './alpha-creator/compact-inverse';
import { creatorWorkingFromRecord } from './creator-workspace';
import { inspectProgramNativeCreatorHandoff } from './creator-native-execution-adapter';
import { textWorkspaceModel as M } from './text-workspace';
import { prepareLocalImport } from './alpha-preservation/import';
import { applyAuthoringOperation } from './native-creator-vendor/text-authoring/operations';
import { buildAuthoringArtifactProjection } from './native-creator-vendor/text-authoring/artifact-projection';

const OWNER = '11111111-1111-4111-8111-111111111111';
const NOW = '2026-09-24T03:00:00.000Z';
const DRAFT = 'v3-candidate-fixture';
function empty(): AlphaAccount {
  return { schema: ALPHA_SCHEMA, ownerId: OWNER, revision: 0,
    source: { schema: PROGRAM_SCHEMA, actorId: OWNER, revision: 0 }, space: createProgramPrivateSpace(), legacyReceipts: [], legacyUndo: [] };
}

// A normal serialized owner is accepted only with the exact pinned v3 source.
function candidateAccount(slug: string) {
  const projected = buildCatalogContentV3Candidate(slug); assert(projected.ok);
  const source: NativeCreatorCatalogContentSource = { kind: 'catalog-content', version: 1,
    storageKey: 'flow:catalog-content:v1', draftId: `catalog-content:${slug}`, sourceSlug: slug,
    versionId: projected.content.versionId, revisionId: projected.document.revision.revisionId,
    contentJson: canonicalJson(projected.content), documentJson: canonicalJson(projected.document) };
  const owner: NativeCreatorDocumentOwner = { version: 1, id: DRAFT, revision: 1, createdAt: NOW, updatedAt: NOW,
    source, initialRecordUi: {}, document: projected.document, recordUi: {}, actions: [] };
  const workspace = createProgramCreatorWorkspace(NOW);
  const saved = transitionPersonalWorkspacePocCreatorDraftLibrary(workspace.library, { type: 'save', draftId: DRAFT,
    expectedLibraryRevision: workspace.library.revision, title: projected.document.title,
    rawText: projected.document.rawText, sourceFingerprint: fingerprint(projected.document.rawText), now: NOW });
  assert(saved.changed); workspace.library = saved.library;
  workspace.structureDrafts = { [DRAFT]: { version: 1, recordRevision: workspace.library.records[DRAFT].recordRevision,
    contextRevision: 1, savedAt: NOW, nativeDocument: owner, nativeSelection: source } };
  const account = empty(); account.space.creatorWorkspace = workspace;
  return { account, projected };
}

for (const slug of CATALOG_CONTENT_V3_CANDIDATE_SLUGS) {
  test(`active v3 accepts exact account/file/backup and rejects tampered sources: ${slug}`, async () => {
    const candidate = candidateAccount(slug), target = empty(), references = emptyAlphaReferences(OWNER);
    const before = canonicalJson(target), sourceBefore = canonicalJson(candidate.account);
    assert.equal(isAccountForOwner(candidate.account, OWNER), true);
    const command = { schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'creator' as const,
      requestId: 'v3-inactive', expectedRevision: 0, intent: { type: 'catalog-content-import' as const,
        draftId: DRAFT, sourceSlug: slug, sourceVersionId: candidate.projected.content.versionId, now: NOW } };
    assert.equal(dispatchAlphaCreatorCommand(target, command).ok, true);
    const imported = await prepareLocalImport(canonicalJson(materializeAccount(candidate.account, references)), OWNER, target, references);
    assert(imported.ok); assert.deepEqual(imported.account.space, candidate.account.space);
    const backup = await createAccountBackup({ account: candidate.account, references, operations: [], importArchives: [], createdAt: NOW },
      async () => { throw Error('no media expected'); });
    assert((await validateAccountBackup(canonicalJson(backup), OWNER)).ok);
    for (const field of ['contentJson', 'documentJson', 'sourceSlug', 'versionId'] as const) {
      const forged = structuredClone(candidate.account);
      const source = forged.space.creatorWorkspace!.structureDrafts![DRAFT].nativeDocument!.source as NativeCreatorCatalogContentSource;
      source[field] = 'forged';
      assert.equal(isAccountForOwner(forged, OWNER), false);
      const invalid = await prepareLocalImport(canonicalJson(materializeAccount(forged, references)), OWNER, target, references);
      assert(!invalid.ok); assert.equal(invalid.reason, 'invalid-source');
      await assert.rejects(createAccountBackup({ account: forged, references, operations: [], importArchives: [], createdAt: NOW },
        async () => { throw Error('no media expected'); }));
    }
    assert.equal(canonicalJson(target), before); assert.equal(canonicalJson(candidate.account), sourceBefore);
  });
}

for (const slug of CATALOG_CONTENT_V3_CANDIDATE_SLUGS) {
  test(`v3 dispatcher import/edit/save/dated handoff/inverse/backup/reimport: ${slug}`, async () => {
    let account = empty(); const references = emptyAlphaReferences(OWNER);
    const original = buildCatalogContentV3Candidate(slug); assert(original.ok);
    const intent: AlphaCreatorIntent = { type: 'catalog-content-import', draftId: DRAFT, sourceSlug: slug,
      sourceVersionId: original.content.versionId, now: NOW };
    function commit(intent: AlphaCreatorIntent) {
      const before = structuredClone(account), bytes = canonicalJson(account);
      const result = dispatchAlphaCreatorCommand(account, { schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'creator',
        requestId: `v3-life-${account.revision}`, expectedRevision: account.revision, intent });
      assert(result.ok, JSON.stringify(result)); assert.equal(canonicalJson(account), bytes);
      const next = structuredClone(account);
      for (const change of result.changes) {
        if (change.present) Object.assign(next.space, { [change.field]: change.value }); else delete next.space[change.field];
      }
      if (result.changed) next.revision++;
      assert(isAccountForOwner(next, OWNER));
      if (result.changed) {
        const inverse = result.changes.map(change => createCreatorInverse(before.space, next.space, change.field));
        assert.equal(canonicalJson(applyCreatorInverse(next.space, JSON.parse(canonicalJson(inverse)))), canonicalJson(before.space));
      }
      account = next; return result;
    }
    assert(commit(intent).changed);
    assert.equal(commit({ ...intent, draftId: 'duplicate' }).changed, false);
    commit({ type: 'working', working: creatorWorkingFromRecord(account.space.creatorWorkspace!, DRAFT), now: NOW });
    const sourceBytes = canonicalJson(account.space.creatorWorkspace!.working!.nativeDocument!.source);
    const first = account.space.creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items[0];
    commit({ type: 'native-operation', draftId: DRAFT, operation: { type: 'rename', itemId: first.itemId, title: '내 오픽 연습' }, now: NOW });
    commit({ type: 'native-operation', draftId: DRAFT, operation: { type: 'undo' }, now: NOW });
    assert.deepEqual(account.space.creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical, original.document.parseResult.canonical);
    commit({ type: 'native-operation', draftId: DRAFT, operation: { type: 'rename', itemId: first.itemId, title: '내 오픽 연습' }, now: NOW });
    const workspace = account.space.creatorWorkspace!, working = workspace.working!;
    commit({ type: 'library-action', now: NOW, action: { type: 'save', draftId: DRAFT, title: working.title,
      rawText: working.rawText, sourceFingerprint: fingerprint(working.rawText), expectedLibraryRevision: workspace.library.revision,
      expectedRecordRevision: working.baseRecordRevision!, now: NOW } });
    const review = inspectProgramNativeCreatorHandoff(materializeAccount(account, references).data,
      { actorId: OWNER, draftId: DRAFT, anchor: '2028-02-25' }, NOW); assert(review.ok);
    const choices = Object.fromEntries(review.preview.rows.map(row => [row.itemId, { source: 'incoming', date: 'incoming', time: 'incoming', children: 'incoming' } as const]));
    commit({ type: 'native-handoff', draftId: DRAFT, anchor: '2028-02-25', choices, now: NOW });
    const tasks = M.tasks(account.space.text); assert.equal(tasks.length, original.itemMapping.length);
    for (const row of review.preview.rows) assert.equal(tasks.find(task => task.title === row.title)?.date, row.sourceDate);
    assert.equal(canonicalJson(account.space.creatorWorkspace!.structureDrafts![DRAFT].nativeDocument!.source), sourceBytes);
    account = JSON.parse(canonicalJson(account)); assert(isAccountForOwner(account, OWNER));
    assert.equal(commit(intent).changed, false);
    const backup = await createAccountBackup({ account, references, operations: [], importArchives: [], createdAt: NOW }, async () => { throw Error('no media'); });
    const checked = await validateAccountBackup(canonicalJson(backup), OWNER); assert(checked.ok);
    assert.equal(canonicalJson(checked.value.account), canonicalJson(account));
    // Ordinary local-file intake consumes the Program envelope, not the M6
    // account backup (which has its own explicit restore path).
    const localFile = canonicalJson(materializeAccount(checked.value.account, checked.value.references));
    const imported = await prepareLocalImport(localFile, OWNER, empty(), references); assert(imported.ok);
    assert.deepEqual(imported.account.space, account.space);
    const repeated = await prepareLocalImport(localFile, OWNER, imported.account, references); assert(repeated.ok);
    assert.deepEqual(repeated.warnings, ['already-applied']);
    assert.deepEqual(repeated.account, imported.account);
  });
}

test('pure candidate dates stay unresolved without an anchor and cross month/year/leap day without invented times', () => {
  for (const slug of CATALOG_CONTENT_V3_CANDIDATE_SLUGS) {
    const projected = buildCatalogContentV3Candidate(slug); assert(projected.ok);
    for (const [index, item] of projected.document.parseResult.canonical.items.entries()) {
      assert.equal(programNativeExecutionItemFacts(item).date, null);
      for (const anchor of ['2026-12-25', '2027-02-25', '2028-02-25']) {
        const expected = new Date(`${anchor}T00:00:00Z`); expected.setUTCDate(expected.getUTCDate() + projected.content.bundle.items[index].day_offset!);
        const facts = programNativeExecutionItemFacts(item, anchor);
        assert.equal(facts.date, expected.toISOString().slice(0, 10)); assert.equal(facts.time, null);
        assert.equal(facts.timeZone, null); assert.equal(facts.rule, null); assert.equal(facts.recurrenceIntent, false);
      }
    }
  }
});

test('pure candidate editing preserves identity and immutable content; pinned vendor remains unchanged', () => {
  for (const slug of CATALOG_CONTENT_V3_CANDIDATE_SLUGS) {
    const projected = buildCatalogContentV3Candidate(slug); assert(projected.ok);
    const before = canonicalJson(projected), first = projected.document.parseResult.canonical.items[0];
    const edited = applyAuthoringOperation(projected.document, { type: 'rename', itemId: first.itemId, title: '개인 사본 편집 후보' }, { now: NOW });
    assert.notEqual(edited, projected.document);
    assert.equal(edited.parseResult.canonical.items[0].itemId, first.itemId);
    assert.equal(edited.parseResult.canonical.items[0].title, '개인 사본 편집 후보');
    assert.deepEqual(edited.parseResult.canonical.items[0].schedule, first.schedule);
    const undone = applyAuthoringOperation(edited, { type: 'undo' }, { now: NOW });
    assert.deepEqual(undone.parseResult.canonical, projected.document.parseResult.canonical);
    assert.equal(canonicalJson(projected), before);
    // The original D2 projector remains byte-identical. Explicit-anchor support
    // is tested separately in native-creator-projection.test.ts, not backported.
    const calendar = buildAuthoringArtifactProjection(edited, { anchor: '2028-02-25' }).artifacts.calendar;
    assert.equal(calendar.rows.length, 0);
    assert.equal(calendar.losses.filter(loss => loss.reason === 'relative_anchor_required').length, projected.itemMapping.length);
  }
});
