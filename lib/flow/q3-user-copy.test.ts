import assert from 'node:assert/strict';
import test from 'node:test';

import {
  Q3_FORBIDDEN_LEGACY_COPY_FRAGMENTS,
  Q3_LEGACY_USER_COPY_PROFILE,
  Q3_USER_COPY_PROFILE,
  assertQ3UserCopyAllowed,
  findQ3ForbiddenUserCopy,
  getQ3AllowedUserCopy,
  getQ3UserCopyProfile,
  isQ3AllowedUserCopyLabel,
  isQ3UserCopyAllowed,
  scanQ3UserCopy,
  type Q3CopyGuardEntry,
} from './q3-user-copy';

function flattenStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap(flattenStrings);
}

test('Q3-B profile exposes semantic labels per owned user surface', () => {
  assert.deepEqual(Q3_USER_COPY_PROFILE.navigation, {
    findPlans: '계획 찾기',
    myPlans: '내 계획',
    createPlan: '계획 만들기',
  });
  assert.deepEqual(Q3_USER_COPY_PROFILE.publicPreview, {
    eyebrow: '계획 미리보기',
    editPlan: '계획 수정',
    editItem: '수정',
    saveToMyPlans: '내 계획에 저장',
    applyChanges: '변경 반영',
  });
  assert.deepEqual(Q3_USER_COPY_PROFILE.savedLibrary, {
    pageTitle: '내 계획',
    sectionTitle: '저장한 계획',
    listTitle: '계획 목록',
    searchPlaceholder: '계획 검색',
    searchAccessibleName: '저장한 계획 검색',
    emptyTitle: '저장한 계획이 없습니다',
  });
  assert.deepEqual(Q3_USER_COPY_PROFILE.savedDetail, {
    eyebrow: '저장한 계획',
    editPlan: '계획 수정',
    editItem: '수정',
    saveChanges: '저장',
    wholePlanScope: '계획 전체',
  });
  assert.deepEqual(Q3_USER_COPY_PROFILE.receipt, {
    savedTitle: '내 계획에 저장됨',
    continueInMyPlans: '내 계획에서 이어하기',
    returnToDiscovery: '계획 찾기로',
    close: '닫기',
  });
  assert.deepEqual(Q3_USER_COPY_PROFILE.map, {
    selectPlans: '계획 선택하기',
    editPlan: '계획 수정',
    applyChanges: '변경 반영',
    saveToMyPlans: '내 계획에 저장',
    transferToOwnTool: '내 도구로 옮기기',
  });
  assert.deepEqual(Q3_USER_COPY_PROFILE.transfer, {
    title: '내 도구로 옮기기',
    quickTitle: '바로 결과 만들기',
    createResult: '결과 만들기',
    saveAndContinue: '내 계획에 저장하고 이어가기',
    wholePlanScope: '계획 전체',
  });
});

test('Q3 profile keeps FLOW as the brand without carrying route, type, variable, or storage identities', () => {
  assert.equal(Q3_USER_COPY_PROFILE.brand, 'FLOW');

  const labels = flattenStrings(Q3_USER_COPY_PROFILE);
  assert.equal(labels.some((label) => /(?:^|\/)flows?(?:\/|$)/u.test(label)), false);
  assert.equal(labels.some((label) => /flow:/u.test(label)), false);
  assert.equal(labels.some((label) => /https?:\/\//u.test(label)), false);
  assert.equal(labels.some((label) => /(?:flowSlug|itemType|storageKey)/u.test(label)), false);
});

test('profile selection is default-on and rollback returns only the legacy user copy', () => {
  assert.equal(getQ3UserCopyProfile(), Q3_USER_COPY_PROFILE);
  assert.equal(getQ3UserCopyProfile(true), Q3_USER_COPY_PROFILE);
  assert.equal(getQ3UserCopyProfile(false), Q3_LEGACY_USER_COPY_PROFILE);
  assert.equal(getQ3UserCopyProfile(false).brand, 'FLOW');
  assert.equal(getQ3UserCopyProfile(false).navigation.findPlans, 'Flow 찾기');
  assert.equal(getQ3UserCopyProfile(false).savedDetail.saveChanges, '저장');
  assert.equal(getQ3UserCopyProfile(false).itemExecution.complete, '완료');
});

test('allowed-label helpers expose exact contracts rather than a global Flow replacement', () => {
  assert.equal(isQ3AllowedUserCopyLabel('navigation', '계획 찾기'), true);
  assert.equal(isQ3AllowedUserCopyLabel('navigation', '내 계획'), true);
  assert.equal(isQ3AllowedUserCopyLabel('navigation', 'Flow 찾기'), false);
  assert.equal(isQ3AllowedUserCopyLabel('saved-detail', '저장'), true);
  assert.equal(isQ3AllowedUserCopyLabel('public-preview', '변경 반영'), true);
  assert.equal(isQ3AllowedUserCopyLabel('item-execution', '완료'), true);
  assert.equal(isQ3AllowedUserCopyLabel('completion-criterion', '완료 기준'), true);
  assert.deepEqual(getQ3AllowedUserCopy('receipt'), [
    '내 계획에 저장됨',
    '내 계획에서 이어하기',
    '계획 찾기로',
    '닫기',
  ]);
});

test('forbidden-copy helper detects legacy shell and CTA phrases but preserves FLOW brand', () => {
  assert.equal(Q3_FORBIDDEN_LEGACY_COPY_FRAGMENTS.includes('Flow 찾기'), true);
  for (const phrase of [
    'Flow 이름',
    '이미 만들어진 Flow',
    '바로 시작할 Flow',
    '새 실행 Flow',
    'Flow 기준',
    'Flow에서 제외',
    'Flow에서 뺐어요',
    '이번 Flow는',
    'Flow별 옮기기',
    '반복 Flow',
    '일정 Flow',
    '현재 Flow 도구',
    '영향 Flow',
    'Flow 정리',
    'Flow를 찾을 수 없습니다',
    '저장할 Flow',
    '저장 가능한 기존 Flow',
    'Flow화되지 않은',
  ] as const) {
    assert.equal(
      Q3_FORBIDDEN_LEGACY_COPY_FRAGMENTS.includes(phrase),
      true,
      `${phrase} must stay in the owned-copy guard`,
    );
    assert.equal(
      isQ3UserCopyAllowed({
        surface: `owned copy: ${phrase}`,
        context: 'saved-detail',
        text: phrase,
      }),
      false,
    );
  }
  assert.equal(
    isQ3UserCopyAllowed({ surface: 'header', context: 'brand', text: 'FLOW' }),
    true,
  );
  assert.equal(
    isQ3UserCopyAllowed({ surface: 'navigation', context: 'navigation', text: 'Flow 찾기' }),
    false,
  );
  assert.deepEqual(
    findQ3ForbiddenUserCopy({
      surface: 'public-save',
      context: 'public-preview',
      text: '내 Flow에 저장',
    }).map(({ code, term }) => [code, term]),
    [
      ['legacy-flow-phrase', '내 Flow에 저장'],
      ['legacy-flow-phrase', '내 Flow'],
    ],
  );
});

test('완료 is allowed only for Item execution and completion criterion copy', () => {
  const completionEntries: Q3CopyGuardEntry[] = [
    { surface: 'item-checkbox', context: 'item-execution', text: '완료' },
    { surface: 'criterion-heading', context: 'completion-criterion', text: '완료 기준' },
  ];
  assert.deepEqual(scanQ3UserCopy(completionEntries), []);

  for (const context of [
    'navigation',
    'public-preview',
    'saved-library',
    'saved-detail',
    'receipt',
    'map',
    'transfer',
  ] as const) {
    const violations = findQ3ForbiddenUserCopy({
      surface: context,
      context,
      text: '저장 완료',
    });
    assert.equal(violations.some(({ code }) => code === 'completion-outside-item'), true);
  }
});

test('route guard scans owned accessible copy while exempting source content and internal identity', () => {
  const entries: Q3CopyGuardEntry[] = [
    { surface: '/flows nav', context: 'navigation', text: '계획 찾기' },
    { surface: '/flows heading', context: 'public-preview', text: '계획 미리보기' },
    { surface: '/my source title', context: 'source-content', text: 'Flow 완료 기록 원문' },
    { surface: 'storage diagnostic', context: 'internal-identity', text: 'flow:saved:demo' },
  ];
  assert.deepEqual(scanQ3UserCopy(entries), []);
  assert.doesNotThrow(() => assertQ3UserCopyAllowed(entries));

  assert.throws(
    () =>
      assertQ3UserCopyAllowed([
        ...entries,
        { surface: '/my receipt', context: 'receipt', text: '저장 완료' },
      ]),
    /\/my receipt: completion-outside-item \(완료\)/u,
  );
});

test('approved profile labels contain no forbidden legacy phrases or misplaced completion copy', () => {
  const entries: Q3CopyGuardEntry[] = [
    ...getQ3AllowedUserCopy('navigation').map((text) => ({
      surface: 'navigation',
      context: 'navigation' as const,
      text,
    })),
    ...getQ3AllowedUserCopy('public-preview').map((text) => ({
      surface: 'public-preview',
      context: 'public-preview' as const,
      text,
    })),
    ...getQ3AllowedUserCopy('saved-library').map((text) => ({
      surface: 'saved-library',
      context: 'saved-library' as const,
      text,
    })),
    ...getQ3AllowedUserCopy('saved-detail').map((text) => ({
      surface: 'saved-detail',
      context: 'saved-detail' as const,
      text,
    })),
    ...getQ3AllowedUserCopy('receipt').map((text) => ({
      surface: 'receipt',
      context: 'receipt' as const,
      text,
    })),
    ...getQ3AllowedUserCopy('map').map((text) => ({
      surface: 'map',
      context: 'map' as const,
      text,
    })),
    ...getQ3AllowedUserCopy('transfer').map((text) => ({
      surface: 'transfer',
      context: 'transfer' as const,
      text,
    })),
    ...getQ3AllowedUserCopy('item-execution').map((text) => ({
      surface: 'item-execution',
      context: 'item-execution' as const,
      text,
    })),
    ...getQ3AllowedUserCopy('completion-criterion').map((text) => ({
      surface: 'completion-criterion',
      context: 'completion-criterion' as const,
      text,
    })),
  ];

  assert.deepEqual(scanQ3UserCopy(entries), []);
});
