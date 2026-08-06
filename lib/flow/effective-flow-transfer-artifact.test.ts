import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEffectiveFlowProjectionManifest } from './effective-flow-contract';
import { buildEffectiveFlowSnapshot } from './effective-flow-snapshot';
import {
  buildEffectiveFlowCalendarTransferArtifact,
  buildEffectiveFlowListTransferArtifact,
} from './effective-flow-transfer-artifact';
import {
  PERSONAL_STRUCTURAL_SHEET_HEADERS,
  type PersonalStructuralListExportRow,
} from './personal-structural-list-export';
import {
  parseEffectiveFlowArtifactResources,
  parseEffectiveFlowLabeledMemo,
  parseEffectiveFlowTsv,
} from './effective-flow-artifact-codec';
import { resolvePublicDateIntent } from './public-date-intent';
import { seedBundles } from './seed-flows';

function fixture() {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'moving-d30-basic');
  assert.ok(bundle);
  const snapshot = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: '내 이사 계획',
    dateIntent: resolvePublicDateIntent({
      anchorType: bundle.flow.anchor_type,
      mode: 'custom',
      customAnchor: '2030-09-01',
      exampleAnchor: '',
    }),
  });
  return { bundle, snapshot };
}

test('list artifacts use only manifest eligible IDs and keep row/count parity', () => {
  const { bundle, snapshot } = fixture();
  const selected = snapshot.committed.rows.slice(0, 2).map((row) => row.id);
  const manifest = buildEffectiveFlowProjectionManifest({
    snapshot,
    consumer: 'export_artifact',
    destination: 'sheet',
    scope: { kind: 'selected', itemIds: selected },
    snapshotKind: 'effective_execution',
  });
  const artifact = buildEffectiveFlowListTransferArtifact({
    result: snapshot.committed,
    manifest,
    flowTitle: snapshot.effectiveTitle,
    sourceLabel: bundle.flow.source_title,
    sourceUrl: bundle.flow.source_url,
  });

  assert.deepEqual(artifact.itemIds, manifest.eligibleItemIds);
  assert.equal(artifact.itemCount, 2);
  assert.equal(artifact.outputCount, 2);
  assert.equal(artifact.text.trim().split(/\r?\n/u).length - 1, 2);
  assert.equal(artifact.extension, 'tsv');
});

test('list artifacts preserve consumer-resolved time, duration, and manifest order for every list format', () => {
  const { bundle, snapshot } = fixture();
  const selected = snapshot.committed.rows.slice(0, 2);
  const listRows = selected.map((row, index) => ({
      itemId: row.id,
      title: row.title,
      date: '2030-09-01',
      scheduleState: index === 0 ? 'timed' : 'all_day',
      ...(index === 0 ? { time: '10:15', durationMinutes: 60 } : {}),
      status: 'pending',
      personalOrderRank: selected.length - index,
    } satisfies PersonalStructuralListExportRow)).reverse();

  for (const destination of ['checklist', 'sheet', 'memo'] as const) {
    const manifest = buildEffectiveFlowProjectionManifest({
      snapshot,
      consumer: 'export_artifact',
      destination,
      scope: { kind: 'selected', itemIds: selected.map((row) => row.id) },
      snapshotKind: 'effective_execution',
    });
    const artifact = buildEffectiveFlowListTransferArtifact({
      result: snapshot.committed,
      manifest,
      flowTitle: snapshot.effectiveTitle,
      sourceLabel: bundle.flow.source_title,
      sourceUrl: bundle.flow.source_url,
      listRows,
    });

    assert.deepEqual(artifact.itemIds, manifest.eligibleItemIds);
    assert.equal(artifact.itemCount, 2);
    assert.equal(artifact.outputCount, 2);
    assert.ok(artifact.text.indexOf(selected[0]!.title) < artifact.text.indexOf(selected[1]!.title));
    if (destination === 'sheet') {
      assert.match(artifact.text, /2030-09-01\t10:15\t1시간/u);
      assert.match(artifact.text, /2030-09-01\t종일\t/u);
    } else {
      assert.match(artifact.text, /일정: 2030-09-01 · 10:15 · 예상 1시간/u);
      assert.match(artifact.text, /일정: 2030-09-01 종일/u);
    }
  }
});

test('Sheet and Memo transfer artifacts carry the declared rich row fields', () => {
  const { bundle, snapshot } = fixture();
  const itemId = snapshot.committed.rows[0]!.id;
  const row: PersonalStructuralListExportRow = {
    itemId,
    title: '실제 전송 필드 확인',
    date: '2030-09-01',
    scheduleState: 'timed',
    time: '09:30',
    durationMinutes: 45,
    timeZone: 'Asia/Seoul',
    repeatLabel: '매주 · 월·수 · 5회',
    description: '원문 설명',
    completionCriteria: '결과를 확인했다.',
    memo: '개인 메모',
    executionMemo: '실행 메모',
    itemWarning: '항목 주의',
    flowWarning: '계획 주의',
    resources: [{ label: '공식 자료', url: 'https://example.com/tool?a=1&b=2#start' }],
    sourceRef: '항목 원문',
    status: 'pending',
    personalOrderRank: 0,
  };

  for (const destination of ['sheet', 'memo'] as const) {
    const manifest = buildEffectiveFlowProjectionManifest({
      snapshot,
      consumer: 'export_artifact',
      destination,
      scope: { kind: 'item', itemId },
      snapshotKind: 'effective_execution',
    });
    const artifact = buildEffectiveFlowListTransferArtifact({
      result: snapshot.committed,
      manifest,
      flowTitle: snapshot.effectiveTitle,
      sourceLabel: bundle.flow.source_title,
      sourceUrl: bundle.flow.source_url,
      listRows: [row],
    });

    if (destination === 'sheet') {
      const parsed = parseEffectiveFlowTsv(artifact.text);
      assert.deepEqual(parsed[0], [...PERSONAL_STRUCTURAL_SHEET_HEADERS]);
      const values = Object.fromEntries(
        parsed[0]!.map((header, index) => [header, parsed[1]![index]]),
      );
      assert.equal(values['설명'], row.description);
      assert.equal(values['시간대'], row.timeZone);
      assert.equal(values['반복'], row.repeatLabel);
      assert.equal(values['완료 기준'], row.completionCriteria);
      assert.equal(values['메모'], row.memo);
      assert.equal(values['실행 메모'], row.executionMemo);
      assert.equal(values['항목 주의'], row.itemWarning);
      assert.equal(values['계획 주의'], row.flowWarning);
      assert.equal(values['원문'], row.sourceRef);
      assert.deepEqual(parseEffectiveFlowArtifactResources(values['자료']!), row.resources);
    } else {
      const parsed = parseEffectiveFlowLabeledMemo(artifact.text);
      const values = Object.fromEntries(
        parsed.records[0]!.fields.map((field) => [field.label, field.value]),
      );
      assert.equal(values['설명'], row.description);
      assert.equal(values['시간대'], row.timeZone);
      assert.equal(values['반복'], row.repeatLabel);
      assert.equal(values['완료 기준'], row.completionCriteria);
      assert.equal(values['개인 메모'], row.memo);
      assert.equal(values['실행 메모'], row.executionMemo);
      assert.equal(values['주의'], row.itemWarning);
      assert.equal(values['계획 주의'], row.flowWarning);
      assert.equal(values['원문'], row.sourceRef);
      assert.equal(values['자료 1 이름'], row.resources![0]!.label);
      assert.equal(values['자료 1 URL'], row.resources![0]!.url);
    }
  }
});

test('consumer-resolved list rows fail closed when their Item IDs drift from the manifest', () => {
  const { snapshot } = fixture();
  const selected = snapshot.committed.rows.slice(0, 1);
  const manifest = buildEffectiveFlowProjectionManifest({
    snapshot,
    consumer: 'export_artifact',
    destination: 'memo',
    scope: { kind: 'selected', itemIds: selected.map((row) => row.id) },
    snapshotKind: 'effective_execution',
  });

  assert.throws(() => buildEffectiveFlowListTransferArtifact({
    result: snapshot.committed,
    manifest,
    flowTitle: snapshot.effectiveTitle,
    listRows: [{
      itemId: 'different-item',
      title: '다른 항목',
      scheduleState: 'unscheduled',
      status: 'pending',
      personalOrderRank: 0,
    }],
  }), /must match the manifest eligible Item IDs/u);

  assert.throws(() => buildEffectiveFlowListTransferArtifact({
    result: snapshot.committed,
    manifest,
    flowTitle: snapshot.effectiveTitle,
    listRows: [0, 1].map((personalOrderRank) => ({
      itemId: selected[0]!.id,
      title: '중복 항목',
      scheduleState: 'unscheduled' as const,
      status: 'pending' as const,
      personalOrderRank,
    })),
  }), /Duplicate projected list row/u);
});

test('Calendar keeps item count and VEVENT output count as separate invariants', () => {
  const { snapshot } = fixture();
  const manifest = buildEffectiveFlowProjectionManifest({
    snapshot,
    consumer: 'export_artifact',
    destination: 'calendar',
    scope: { kind: 'selected', itemIds: [snapshot.committed.rows[0]!.id] },
    snapshotKind: 'effective_execution',
  });
  const artifact = buildEffectiveFlowCalendarTransferArtifact({
    manifest,
    ics: 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n',
  });

  assert.equal(artifact.itemCount, 1);
  assert.equal(artifact.outputCount, 2);
  assert.deepEqual(artifact.itemIds, manifest.eligibleItemIds);
  assert.equal(artifact.extension, 'ics');
});
