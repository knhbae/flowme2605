import assert from 'node:assert/strict';
import test from 'node:test';
import {
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocFlow,
} from './personal-workspace-poc-contract';
import {
  buildPersonalWorkspacePocCopyDisambiguation,
  getPersonalWorkspacePocFlowDisplayTitle,
} from './personal-workspace-poc-copy-disambiguation';

function flow(options: {
  savedCopyId: string;
  flowId?: string;
  sourceSlug?: string;
  title?: string;
}): PersonalWorkspacePocFlow {
  const flowId = options.flowId ?? 'source-flow';
  const itemId = 'first-item';
  return {
    ref: toPersonalWorkspacePocFlowRef(options.savedCopyId, flowId),
    savedCopyId: options.savedCopyId,
    flowId,
    sourceSlug: options.sourceSlug ?? 'source-flow',
    title: options.title ?? '이사 D-30 준비',
    origin: 'canonical-personal-copy',
    items: [{
      ref: toPersonalWorkspacePocFlowItemRef(options.savedCopyId, flowId, itemId),
      savedCopyId: options.savedCopyId,
      flowId,
      itemId,
      title: '첫 할 일',
      sourceOrder: 0,
    }],
  };
}

test('단일 활성 사본은 번호를 숨기고 원본 제목을 그대로 표시한다', () => {
  const only = flow({ savedCopyId: 'copy:only' });
  const displays = buildPersonalWorkspacePocCopyDisambiguation([only]);

  assert.deepEqual(displays.get(only.ref), {
    flowRef: only.ref,
    sourceFlowId: only.flowId,
    title: '이사 D-30 준비',
    copyCount: 1,
    displayTitle: '이사 D-30 준비',
  });
  assert.equal(getPersonalWorkspacePocFlowDisplayTitle(only, displays), '이사 D-30 준비');
});

test('동일 원본의 복수 사본은 입력 순서와 무관하게 stable identity 순으로 구분한다', () => {
  const later = flow({ savedCopyId: 'copy:beta' });
  const earlier = flow({ savedCopyId: 'copy:alpha' });
  const displays = buildPersonalWorkspacePocCopyDisambiguation([later, earlier]);

  assert.deepEqual(displays.get(earlier.ref), {
    flowRef: earlier.ref,
    sourceFlowId: 'source-flow',
    title: '이사 D-30 준비',
    copyOrdinal: 1,
    copyCount: 2,
    copyLabel: '사본 1',
    displayTitle: '사본 1 · 이사 D-30 준비',
  });
  assert.equal(displays.get(later.ref)?.displayTitle, '사본 2 · 이사 D-30 준비');

  const reversed = buildPersonalWorkspacePocCopyDisambiguation([earlier, later]);
  assert.deepEqual([...reversed], [...displays]);
});

test('휴지통과 영구 삭제 항목은 활성 사본 번호와 표시 맵에 참여하지 않는다', () => {
  const active = flow({ savedCopyId: 'copy:beta' });
  const inactive = flow({ savedCopyId: 'copy:alpha' });
  const displays = buildPersonalWorkspacePocCopyDisambiguation(
    [active, inactive],
    { inactiveFlowRefs: new Set([inactive.ref]) },
  );

  assert.equal(displays.has(inactive.ref), false);
  assert.equal(displays.get(active.ref)?.copyOrdinal, undefined);
  assert.equal(displays.get(active.ref)?.displayTitle, '이사 D-30 준비');
  assert.equal(getPersonalWorkspacePocFlowDisplayTitle(inactive, displays), inactive.title);
});

test('제목이 같아도 source flow identity가 다르면 사본 번호를 붙이지 않는다', () => {
  const moving = flow({ savedCopyId: 'copy:moving', flowId: 'moving-source' });
  const reading = flow({ savedCopyId: 'copy:reading', flowId: 'reading-source' });
  const displays = buildPersonalWorkspacePocCopyDisambiguation([moving, reading]);

  assert.equal(displays.get(moving.ref)?.displayTitle, '이사 D-30 준비');
  assert.equal(displays.get(reading.ref)?.displayTitle, '이사 D-30 준비');
  assert.equal(displays.get(moving.ref)?.copyCount, 1);
  assert.equal(displays.get(reading.ref)?.copyCount, 1);

  const reversed = buildPersonalWorkspacePocCopyDisambiguation([reading, moving]);
  assert.deepEqual([...reversed.keys()], [...displays.keys()]);
});

test('개인 제목이 달라도 같은 source flow identity면 각 제목 앞에 사본 번호만 붙인다', () => {
  const first = flow({ savedCopyId: 'copy:a', title: '집 이사' });
  const second = flow({ savedCopyId: 'copy:b', title: '사무실 이사' });
  const displays = buildPersonalWorkspacePocCopyDisambiguation([first, second]);

  assert.equal(displays.get(first.ref)?.displayTitle, '사본 1 · 집 이사');
  assert.equal(displays.get(second.ref)?.displayTitle, '사본 2 · 사무실 이사');
});

test('표시 계산은 제목·identity·Item 참조를 변경하지 않는다', () => {
  const first = flow({ savedCopyId: 'copy:a' });
  const second = flow({ savedCopyId: 'copy:b' });
  const sourceBytes = JSON.stringify([first, second]);
  const firstItemRef = first.items[0].ref;

  const displays = buildPersonalWorkspacePocCopyDisambiguation([first, second]);

  assert.equal(JSON.stringify([first, second]), sourceBytes);
  assert.equal(first.savedCopyId, 'copy:a');
  assert.equal(first.ref, toPersonalWorkspacePocFlowRef('copy:a', 'source-flow'));
  assert.equal(first.items[0].ref, firstItemRef);
  assert.equal(displays.get(first.ref)?.title, first.title);
});
