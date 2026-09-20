import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  filterPersonalWorkspacePocCreatorDraftLibraryItems,
  type PersonalWorkspacePocCreatorDraftLibraryItem,
} from './PersonalWorkspacePocCreatorDraftLibrary';

const source = readFileSync(
  new URL('./PersonalWorkspacePocCreatorDraftLibrary.tsx', import.meta.url),
  'utf8',
);

const drafts: readonly PersonalWorkspacePocCreatorDraftLibraryItem[] = [
  {
    draftId: 'draft-b',
    title: '캠핑 준비',
    sourceLabel: '메모 원문',
    itemCount: 2,
    unresolvedIssueCount: 0,
    status: 'active',
    revision: 2,
    updatedAt: '2026-09-03T10:00:00.000Z',
  },
  {
    draftId: 'draft-a',
    title: 'ＣＡＭＰ 사전 점검',
    sourceLabel: 'HTTPS://EXAMPLE.COM',
    itemCount: 1,
    unresolvedIssueCount: 1,
    status: 'active',
    revision: 1,
    updatedAt: '2026-09-03T10:00:00.000Z',
  },
  {
    draftId: 'draft-c',
    title: '지난 초안',
    sourceLabel: 'archive',
    itemCount: 3,
    unresolvedIssueCount: 0,
    status: 'archived',
    revision: 4,
    updatedAt: '2026-09-02T09:00:00.000Z',
  },
];

test('library search normalizes NFKC, case and whitespace without mutating its input', () => {
  const before = JSON.stringify(drafts);
  assert.deepEqual(
    filterPersonalWorkspacePocCreatorDraftLibraryItems(drafts, 'active', '  camp ')
      .map((draft) => draft.draftId),
    ['draft-a'],
  );
  assert.deepEqual(
    filterPersonalWorkspacePocCreatorDraftLibraryItems(drafts, 'active', 'example.com')
      .map((draft) => draft.draftId),
    ['draft-a'],
  );
  assert.equal(JSON.stringify(drafts), before);
});

test('library filtering excludes archived drafts by default and sorts deterministically', () => {
  assert.deepEqual(
    filterPersonalWorkspacePocCreatorDraftLibraryItems(drafts, 'active', '')
      .map((draft) => draft.draftId),
    ['draft-a', 'draft-b'],
  );
  assert.deepEqual(
    filterPersonalWorkspacePocCreatorDraftLibraryItems(drafts, 'archived', '')
      .map((draft) => draft.draftId),
    ['draft-c'],
  );
});

test('library exposes the complete keyboard-operable D2-057 management surface', () => {
  for (const selector of [
    'creator-draft-library',
    'creator-draft-search',
    'creator-draft-row',
    'creator-draft-open',
    'creator-draft-menu',
    'creator-draft-rename-input',
    'creator-draft-clone',
    'creator-draft-archive',
    'creator-draft-restore',
    'creator-draft-undo',
  ]) {
    assert.equal(source.includes(selector), true, `missing selector: ${selector}`);
  }
  assert.match(source, /data-testid=\{`creator-draft-filter-\$\{nextFilter\}`\}/u);
  assert.match(source, /aria-expanded=\{actionsOpen\}/u);
  assert.match(source, /aria-controls=\{controlsId\}/u);
  assert.match(source, /event\.key !== 'Escape'/u);
  assert.match(source, /actionOpeners\.current\.get\(draftId\)\?\.focus/u);
  assert.match(source, /원문 제목은 바뀌지 않습니다/u);
  assert.match(source, /개인공간이나 공개 화면에는 추가되지 않습니다/u);
  assert.doesNotMatch(source, /localStorage|flow:map:|published|공개하기/u);
});

test('same-title and blank rename close without invoking the mutation callback', () => {
  const handler = source.match(
    /const submitRename = \(event:[\s\S]*?\n  \};/u,
  )?.[0] ?? '';
  assert.match(handler, /if \(!nextTitle \|\| nextTitle === draft\.title\)/u);
  assert.match(handler, /closeActions\(draft\.draftId\);[\s\S]*return;/u);
  const noOpBranch = handler.match(
    /if \(!nextTitle \|\| nextTitle === draft\.title\) \{([\s\S]*?)\n    \}/u,
  )?.[1] ?? '';
  assert.doesNotMatch(noOpBranch, /onRename/u);
});
