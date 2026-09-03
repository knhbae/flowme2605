import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocOrigin,
  type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import { resolvePersonalWorkspacePocEntry } from './personal-workspace-poc-entry';

const OPERATING_ORIGINS: readonly Exclude<PersonalWorkspacePocOrigin, 'authoring-handoff'>[] = [
  'source-backed-map',
  'personal-draft',
  'canonical-personal-copy',
  'legacy-saved-plan',
];

function flow(
  origin: PersonalWorkspacePocOrigin,
  index: number,
  options: { title?: string; sourceTitle?: string; sourceUrl?: string } = {},
): PersonalWorkspacePocFlow {
  const savedCopyId = `copy:${index}`;
  const flowId = `flow:${index}`;
  const itemId = `item:${index}`;
  const mapGroup = origin === 'source-backed-map'
    ? {
        groupRef: 'flow-group:entry-map',
        ownerId: 'entry-map',
        title: '준비 묶음',
        childOrder: 0,
        childCount: 1,
        executionState: 'executable' as const,
        reviewReasons: [],
      }
    : undefined;
  return {
    ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId),
    savedCopyId,
    flowId,
    sourceSlug: `source-${index}`,
    title: options.title ?? `준비 Flow ${index}`,
    origin,
    presentation: {
      discovery: {
        ...(options.sourceTitle ? { sourceTitle: options.sourceTitle } : {}),
        sourceUrls: options.sourceUrl ? [options.sourceUrl] : [],
      },
      ...(mapGroup ? { mapGroup } : {}),
    },
    items: [{
      ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, itemId),
      savedCopyId,
      flowId,
      itemId,
      title: `준비 항목 ${index}`,
      description: `정확한 실행 메모 ${index}`,
      sourceOrder: 0,
    }],
  };
}

function model(flows: readonly PersonalWorkspacePocFlow[]): PersonalWorkspacePocReadModel {
  return { version: PERSONAL_WORKSPACE_POC_VERSION, flows };
}

test('empty input preserves exact bytes and produces no implicit action', () => {
  const rawInput = ' \r\n\t ';
  assert.deepEqual(resolvePersonalWorkspacePocEntry(rawInput, model([])), {
    ok: true,
    resolution: { kind: 'empty', rawInput, normalizedInput: '', matches: [] },
  });
});

test('query searches each of the four saved origins once without changing raw input', () => {
  const flows = OPERATING_ORIGINS.map((origin, index) => flow(origin, index));
  const rawInput = '  ㅈㅜㄴㅂㅣ  '.normalize('NFKC');
  const result = resolvePersonalWorkspacePocEntry(rawInput, model(flows));
  assert.equal(result.ok, true);
  if (!result.ok || result.resolution.kind !== 'query') return;
  assert.equal(result.resolution.rawInput, rawInput);
  assert.equal(result.resolution.textContinuation.rawText, rawInput);
  assert.equal(result.resolution.textContinuation.requiresExplicitChoice, true);
  assert.equal(result.resolution.matches.length, 4);
  assert.equal(new Set(result.resolution.matches.map((match) => match.flowRef)).size, 4);
  assert.deepEqual(
    new Set(result.resolution.matches.map((match) => match.origin)),
    new Set(OPERATING_ORIGINS),
  );
});

test('query covers effective title, source title, and item text with deterministic order', () => {
  const values = [
    flow('legacy-saved-plan', 2, { title: '가나다 일정' }),
    flow('canonical-personal-copy', 1, { title: '라마바 일정', sourceTitle: '원문 별칭' }),
    flow('personal-draft', 3, { title: '사아자 일정' }),
  ];
  const title = resolvePersonalWorkspacePocEntry('일정', model(values));
  assert.equal(title.ok, true);
  if (title.ok && title.resolution.kind === 'query') {
    assert.deepEqual(title.resolution.matches.map((match) => match.title), [
      '가나다 일정', '라마바 일정', '사아자 일정',
    ]);
  }
  const source = resolvePersonalWorkspacePocEntry('원문 별칭', model(values));
  assert.equal(source.ok && source.resolution.kind === 'query', true);
  if (source.ok && source.resolution.kind === 'query') {
    assert.deepEqual(source.resolution.matches[0].matchedBy, ['source-title']);
  }
  const item = resolvePersonalWorkspacePocEntry('실행 메모 3', model(values));
  assert.equal(item.ok && item.resolution.kind === 'query', true);
  if (item.ok && item.resolution.kind === 'query') {
    assert.deepEqual(item.resolution.matches[0].matchedBy, ['item-text']);
  }
});

test('valid HTTP(S) URL takes precedence and matches only exact canonical source URLs', () => {
  const values = [
    flow('canonical-personal-copy', 1, {
      sourceUrl: 'https://www.example.com/plan/?utm_source=test&b=2&a=1#part',
    }),
    flow('legacy-saved-plan', 2, { sourceUrl: 'https://example.com/plan/other' }),
  ];
  const rawInput = ' http://www.example.com/plan?a=1&b=2&utm_medium=ignored ';
  const result = resolvePersonalWorkspacePocEntry(rawInput, model(values));
  assert.equal(result.ok, true);
  if (!result.ok || result.resolution.kind !== 'url') return;
  assert.equal(result.resolution.rawInput, rawInput);
  assert.equal(result.resolution.canonicalUrl, 'https://www.example.com/plan?a=1&b=2');
  assert.equal(result.resolution.lookupStatus, 'hit');
  assert.deepEqual(result.resolution.matches.map((match) => match.flowId), ['flow:1']);
  assert.deepEqual(result.resolution.matches[0].matchedBy, ['source-url']);
});

test('URL miss, invalid URL-like text, and plain memo remain separate explicit fallbacks', () => {
  const missRaw = 'https://example.com/not-prepared';
  const miss = resolvePersonalWorkspacePocEntry(missRaw, model([]));
  assert.equal(miss.ok && miss.resolution.kind === 'url', true);
  if (miss.ok && miss.resolution.kind === 'url') {
    assert.equal(miss.resolution.lookupStatus, 'miss');
    assert.equal(miss.resolution.textContinuation.rawText, missRaw);
  }
  for (const invalidRaw of ['https//example.com/a', 'ftp://example.com/a', 'www.example.com/a']) {
    const invalid = resolvePersonalWorkspacePocEntry(invalidRaw, model([]));
    assert.equal(invalid.ok && invalid.resolution.kind === 'invalid-url', true, invalidRaw);
    if (invalid.ok && invalid.resolution.kind === 'invalid-url') {
      assert.equal(invalid.resolution.textContinuation.rawText, invalidRaw);
    }
  }
  const memoRaw = '주말에 창고를 정리하고 기부할 물건을 나누기';
  const memo = resolvePersonalWorkspacePocEntry(memoRaw, model([]));
  assert.equal(memo.ok && memo.resolution.kind === 'memo', true);
  if (memo.ok && memo.resolution.kind === 'memo') {
    assert.equal(memo.resolution.textContinuation.rawText, memoRaw);
  }
});

test('known authoring handoff and review-held Map children are not eligible search rows', () => {
  const authored = flow('authoring-handoff', 1, { title: '숨긴 준비 원문' });
  const held = {
    ...flow('source-backed-map', 2, { title: '검토 준비 Flow' }),
    presentation: {
      discovery: { sourceUrls: [] },
      mapGroup: {
        groupRef: 'flow-group:held',
        ownerId: 'held',
        title: '검토 중',
        childOrder: 0,
        childCount: 1,
        executionState: 'review-hold' as const,
        reviewReasons: ['검토 필요'],
      },
    },
  };
  const result = resolvePersonalWorkspacePocEntry('준비', model([authored, held]));
  assert.equal(result.ok && result.resolution.kind === 'memo', true);
});

test('identity collisions, unsupported origins, and malformed source data fail closed', () => {
  const original = flow('legacy-saved-plan', 1);
  assert.deepEqual(resolvePersonalWorkspacePocEntry('준비', model([original, original])), {
    ok: false,
    rawInput: '준비',
    reason: 'duplicate-flow-identity',
  });

  const duplicateItemInOneFlow = {
    ...original,
    items: [original.items[0], original.items[0]],
  };
  assert.deepEqual(resolvePersonalWorkspacePocEntry('준비', model([duplicateItemInOneFlow])), {
    ok: false,
    rawInput: '준비',
    reason: 'duplicate-item-identity',
  });

  const secondFlow = flow('canonical-personal-copy', 2);
  const duplicateItem = {
    ...secondFlow,
    items: [original.items[0]],
  } as PersonalWorkspacePocFlow;
  assert.deepEqual(resolvePersonalWorkspacePocEntry('준비', model([original, duplicateItem])), {
    ok: false,
    rawInput: '준비',
    reason: 'malformed-item-identity',
  });

  const unsupported = { ...original, origin: 'future-origin' } as unknown as PersonalWorkspacePocFlow;
  assert.deepEqual(resolvePersonalWorkspacePocEntry('준비', model([unsupported])), {
    ok: false,
    rawInput: '준비',
    reason: 'unsupported-origin',
  });

  const malformedSource = {
    ...original,
    presentation: { discovery: { sourceUrls: ['javascript:alert(1)'] } },
  };
  assert.deepEqual(resolvePersonalWorkspacePocEntry('https://example.com', model([malformedSource])), {
    ok: false,
    rawInput: 'https://example.com',
    reason: 'malformed-source-url',
  });
});

test('resolution is read-only and never calls fetch', () => {
  const value = flow('canonical-personal-copy', 1, { sourceUrl: 'https://example.com/plan' });
  const frozen = Object.freeze(model([Object.freeze(value)]));
  let fetchCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    fetchCalls += 1;
    throw new Error('entry must not fetch');
  }) as typeof fetch;
  try {
    const before = JSON.stringify(frozen);
    const result = resolvePersonalWorkspacePocEntry('https://example.com/plan', frozen);
    assert.equal(result.ok, true);
    assert.equal(JSON.stringify(frozen), before);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
