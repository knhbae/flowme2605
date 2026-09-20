import assert from 'node:assert/strict';
import test from 'node:test';

import { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
import {
  createPersonalWorkspacePocCreatorDraftLibrary,
  derivePersonalWorkspacePocCreatorDraftSourceLabel,
  derivePersonalWorkspacePocCreatorDraftTitle,
  isPersonalWorkspacePocCreatorDraftLibrary,
  listPersonalWorkspacePocCreatorDrafts,
  transitionPersonalWorkspacePocCreatorDraftLibrary,
  type PersonalWorkspacePocCreatorDraftLibrary,
} from './personal-workspace-poc-creator-drafts';

const T0 = '2026-09-03T00:00:00.000Z';
const T1 = '2026-09-03T00:01:00.000Z';
const T2 = '2026-09-03T00:02:00.000Z';
const T3 = '2026-09-03T00:03:00.000Z';
const RAW = '# 이사 준비\n- [ ] 주소 변경';

function save(
  library: PersonalWorkspacePocCreatorDraftLibrary,
  input: Readonly<{
    draftId?: string;
    rawText?: string;
    title?: string;
    now?: string;
    expectedRecordRevision?: number;
  }> = {},
) {
  const rawText = input.rawText ?? RAW;
  return transitionPersonalWorkspacePocCreatorDraftLibrary(library, {
    type: 'save',
    expectedLibraryRevision: library.revision,
    expectedRecordRevision: input.expectedRecordRevision,
    draftId: input.draftId ?? 'creator-draft-1',
    title: input.title,
    rawText,
    sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(rawText),
    now: input.now ?? T1,
  });
}

test('creates a versioned creator-owned record and derives a stable title', () => {
  const initial = createPersonalWorkspacePocCreatorDraftLibrary(T0);
  const result = save(initial);

  assert.equal(result.changed, true);
  assert.equal(result.code, 'saved');
  assert.equal(result.library.revision, 1);
  assert.deepEqual(result.library.records['creator-draft-1'], {
    draftId: 'creator-draft-1',
    owner: 'creator',
    title: '이사 준비',
    rawText: RAW,
    sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(RAW),
    status: 'active',
    recordRevision: 1,
    createdAt: T1,
    updatedAt: T1,
  });
  assert.deepEqual(result.library.undo?.snapshot, {
    revision: initial.revision,
    records: initial.records,
    updatedAt: initial.updatedAt,
  });
  assert.equal(isPersonalWorkspacePocCreatorDraftLibrary(result.library), true);
  assert.equal(derivePersonalWorkspacePocCreatorDraftTitle('\n- [ ] 짐 싸기'), '짐 싸기');
  assert.equal(derivePersonalWorkspacePocCreatorDraftTitle('  '), '제목 없는 Flow');
});

test('updates a record, increments both revisions, and treats identical content as no-op', () => {
  const created = save(createPersonalWorkspacePocCreatorDraftLibrary(T0)).library;
  const noOp = save(created, { expectedRecordRevision: 1, now: T2 });
  assert.equal(noOp.changed, false);
  assert.equal(noOp.code, 'no-op');
  assert.equal(noOp.library, created);

  const changedRaw = `${RAW}\n- [ ] 전기 이전`;
  const updated = save(created, {
    rawText: changedRaw,
    expectedRecordRevision: 1,
    now: T2,
  });
  assert.equal(updated.changed, true);
  assert.equal(updated.library.revision, 2);
  assert.equal(updated.library.records['creator-draft-1']?.recordRevision, 2);
  assert.equal(updated.library.records['creator-draft-1']?.rawText, changedRaw);
});

test('blank, invalid fingerprint, stale library, and stale record all mutate nothing', async (t) => {
  const initial = createPersonalWorkspacePocCreatorDraftLibrary(T0);
  const created = save(initial).library;
  const cases = [
    ['blank', transitionPersonalWorkspacePocCreatorDraftLibrary(initial, {
      type: 'save',
      expectedLibraryRevision: 0,
      draftId: 'draft-blank',
      rawText: '   ',
      sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource('   '),
      now: T1,
    }), 'blank-source'],
    ['fingerprint', transitionPersonalWorkspacePocCreatorDraftLibrary(initial, {
      type: 'save',
      expectedLibraryRevision: 0,
      draftId: 'draft-fingerprint',
      rawText: RAW,
      sourceFingerprint: 'raw-v1:forged',
      now: T1,
    }), 'invalid-action'],
    ['library revision', transitionPersonalWorkspacePocCreatorDraftLibrary(created, {
      type: 'rename',
      expectedLibraryRevision: 0,
      expectedRecordRevision: 1,
      draftId: 'creator-draft-1',
      title: '새 이름',
      now: T2,
    }), 'stale-library'],
    ['record revision', transitionPersonalWorkspacePocCreatorDraftLibrary(created, {
      type: 'rename',
      expectedLibraryRevision: 1,
      expectedRecordRevision: 9,
      draftId: 'creator-draft-1',
      title: '새 이름',
      now: T2,
    }), 'stale-record'],
  ] as const;

  for (const [name, result, code] of cases) {
    await t.test(name, () => {
      assert.equal(result.changed, false);
      assert.equal(result.code, code);
      assert.equal(result.library, name === 'blank' || name === 'fingerprint' ? initial : created);
    });
  }
});

test('renames active records with optimistic record revision and no-ops on same title', () => {
  const created = save(createPersonalWorkspacePocCreatorDraftLibrary(T0)).library;
  const renamed = transitionPersonalWorkspacePocCreatorDraftLibrary(created, {
    type: 'rename',
    expectedLibraryRevision: 1,
    expectedRecordRevision: 1,
    draftId: 'creator-draft-1',
    title: '  우리 집 이사  ',
    now: T2,
  });
  assert.equal(renamed.code, 'renamed');
  assert.equal(renamed.library.records['creator-draft-1']?.title, '우리 집 이사');
  assert.equal(renamed.library.records['creator-draft-1']?.recordRevision, 2);

  const noOp = transitionPersonalWorkspacePocCreatorDraftLibrary(renamed.library, {
    type: 'rename',
    expectedLibraryRevision: 2,
    expectedRecordRevision: 2,
    draftId: 'creator-draft-1',
    title: '우리 집 이사',
    now: T3,
  });
  assert.equal(noOp.changed, false);
  assert.equal(noOp.code, 'no-op');
});

test('duplicates without changing the source and assigns deterministic copy names', () => {
  const source = save(createPersonalWorkspacePocCreatorDraftLibrary(T0), {
    title: '이사 준비',
  }).library;
  const first = transitionPersonalWorkspacePocCreatorDraftLibrary(source, {
    type: 'duplicate',
    expectedLibraryRevision: 1,
    expectedSourceRecordRevision: 1,
    sourceDraftId: 'creator-draft-1',
    newDraftId: 'creator-draft-copy-1',
    now: T2,
  });
  const second = transitionPersonalWorkspacePocCreatorDraftLibrary(first.library, {
    type: 'duplicate',
    expectedLibraryRevision: 2,
    expectedSourceRecordRevision: 1,
    sourceDraftId: 'creator-draft-1',
    newDraftId: 'creator-draft-copy-2',
    now: T3,
  });

  assert.equal(first.library.records['creator-draft-copy-1']?.title, '사본 1 · 이사 준비');
  assert.equal(second.library.records['creator-draft-copy-2']?.title, '사본 2 · 이사 준비');
  assert.equal(second.library.records['creator-draft-copy-2']?.recordRevision, 1);
  assert.deepEqual(second.library.records['creator-draft-copy-2']?.clonedFrom, {
    draftId: 'creator-draft-1',
    recordRevision: 1,
  });
  assert.equal(second.library.records['creator-draft-1'], source.records['creator-draft-1']);
});

test('keeps deterministic duplicate titles inside the versioned title limit', () => {
  const initial = createPersonalWorkspacePocCreatorDraftLibrary(T0);
  const source = save(initial, { title: '가'.repeat(200) }).library;
  const duplicated = transitionPersonalWorkspacePocCreatorDraftLibrary(source, {
    type: 'duplicate',
    expectedLibraryRevision: 1,
    expectedSourceRecordRevision: 1,
    sourceDraftId: 'creator-draft-1',
    newDraftId: 'creator-draft-copy-long',
    now: T2,
  });
  assert.equal(duplicated.library.records['creator-draft-copy-long']?.title.length, 200);
  assert.equal(isPersonalWorkspacePocCreatorDraftLibrary(duplicated.library), true);
});

test('archives without deleting bytes, filters lists, restores, and undoes monotonically', () => {
  const created = save(createPersonalWorkspacePocCreatorDraftLibrary(T0)).library;
  const archived = transitionPersonalWorkspacePocCreatorDraftLibrary(created, {
    type: 'archive',
    expectedLibraryRevision: 1,
    expectedRecordRevision: 1,
    draftId: 'creator-draft-1',
    now: T2,
  });
  const archivedRecord = archived.library.records['creator-draft-1'];
  assert.equal(archivedRecord?.rawText, RAW);
  assert.equal(archivedRecord?.status, 'archived');
  assert.equal(listPersonalWorkspacePocCreatorDrafts(archived.library).length, 0);
  assert.equal(listPersonalWorkspacePocCreatorDrafts(archived.library, { status: 'archived' }).length, 1);

  const restored = transitionPersonalWorkspacePocCreatorDraftLibrary(archived.library, {
    type: 'restore',
    expectedLibraryRevision: 2,
    expectedRecordRevision: 2,
    draftId: 'creator-draft-1',
    now: T3,
  });
  assert.equal(restored.library.records['creator-draft-1']?.status, 'active');
  assert.equal(restored.library.records['creator-draft-1']?.archivedAt, undefined);

  const undone = transitionPersonalWorkspacePocCreatorDraftLibrary(restored.library, {
    type: 'undo',
    expectedLibraryRevision: 3,
    now: '2026-09-03T00:04:00.000Z',
  });
  assert.equal(undone.code, 'undone');
  assert.equal(undone.library.revision, 4);
  assert.equal(undone.library.records['creator-draft-1']?.status, 'archived');
  assert.equal(undone.library.undo, undefined);
});

test('search uses Korean NFKC, case folding, whitespace collapse, and deterministic sorting', () => {
  let library = save(createPersonalWorkspacePocCreatorDraftLibrary(T0), {
    draftId: 'draft-b',
    title: 'MOVE 서울',
    rawText: '# 서울 이사',
    now: T1,
  }).library;
  library = save(library, {
    draftId: 'draft-a',
    title: '회사 이전',
    rawText: '# 준비   목록',
    now: T1,
  }).library;

  assert.deepEqual(
    listPersonalWorkspacePocCreatorDrafts(library).map((record) => record.draftId),
    ['draft-a', 'draft-b'],
  );
  assert.deepEqual(
    listPersonalWorkspacePocCreatorDrafts(library, { query: 'move  서울' })
      .map((record) => record.draftId),
    ['draft-b'],
  );
  assert.deepEqual(
    listPersonalWorkspacePocCreatorDrafts(library, { query: '준비 목록' })
      .map((record) => record.draftId),
    ['draft-a'],
  );
});

test('derives the first exact http(s) source label without adding source ownership to records', () => {
  const rawText = [
    '# 참고 자료',
    '[첫 자료](https://example.com/guide?q=이사)',
    '후속 자료: http://second.example/path',
  ].join('\n');
  assert.equal(
    derivePersonalWorkspacePocCreatorDraftSourceLabel(rawText),
    'https://example.com/guide?q=이사',
  );
  assert.equal(
    derivePersonalWorkspacePocCreatorDraftSourceLabel('# 직접 쓴 내용'),
    '직접 작성한 원문',
  );

  const library = save(createPersonalWorkspacePocCreatorDraftLibrary(T0), {
    rawText,
    now: T1,
  }).library;
  assert.deepEqual(
    listPersonalWorkspacePocCreatorDrafts(library, { query: 'example.com/guide' })
      .map((record) => record.draftId),
    ['creator-draft-1'],
  );
  assert.equal('sourceLabel' in library.records['creator-draft-1']!, false);
});

test('strict validation rejects unsupported fields, mismatched ids, and invalid undo snapshots', () => {
  const valid = save(createPersonalWorkspacePocCreatorDraftLibrary(T0)).library;
  assert.equal(isPersonalWorkspacePocCreatorDraftLibrary({ ...valid, future: true }), false);
  assert.equal(isPersonalWorkspacePocCreatorDraftLibrary({
    ...valid,
    records: { wrong: valid.records['creator-draft-1'] },
  }), false);
  assert.equal(isPersonalWorkspacePocCreatorDraftLibrary({
    ...valid,
    undo: {
      label: '잘못된 미래 snapshot',
      snapshot: { ...valid, revision: valid.revision + 1 },
    },
  }), false);
});

test('cancel and missing undo preserve object identity and mutate nothing', () => {
  const initial = createPersonalWorkspacePocCreatorDraftLibrary(T0);
  const cancelled = transitionPersonalWorkspacePocCreatorDraftLibrary(initial, { type: 'cancel' });
  assert.equal(cancelled.changed, false);
  assert.equal(cancelled.code, 'cancelled');
  assert.equal(cancelled.library, initial);

  const undo = transitionPersonalWorkspacePocCreatorDraftLibrary(initial, {
    type: 'undo',
    expectedLibraryRevision: 0,
    now: T1,
  });
  assert.equal(undo.changed, false);
  assert.equal(undo.code, 'nothing-to-undo');
  assert.equal(undo.library, initial);
});
