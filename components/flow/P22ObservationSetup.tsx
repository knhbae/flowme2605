'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  buildSourceBackedFlowMapPersistenceRecordUpdate,
  buildSourceBackedFlowMapSavedSnapshot,
  getSourceBackedFlowMapPersistenceStorageKey,
  getSourceBackedFlowMapSnapshotStorageKey,
  type SourceBackedFlowMapPersonalCopy,
} from '@/lib/flow/source-backed-my-flow';
import {
  clearFlowLocalProgress,
  completeActiveFlowRun,
  ensureLegacyActiveFlowRun,
  recordFlowCompletionState,
  saveChecks,
  saveFlowRecord,
  saveItemStates,
  saveStoredAnchor,
} from '@/lib/flow/storage';
import { withFlowUserDataWriteLock } from '@/lib/flow/storage-write-lock';

const MAP_ID = 'middle-school-math-1';
const FLOW_SLUG = 'source-backed-middle-school-math-1';
const INCLUDED_STEP_ID = 'math-prime-factorization';
const ADDED_STEP_ID = 'math-integers-rationals';
const OLD_SOURCE_VERSION = '2026-01-01.observation';
const OBSERVATION_ANCHOR = '2026-07-15';
const OBSERVATION_COMPLETED_AT = '2026-07-31T09:00:00.000Z';

function clearObservationState() {
  clearFlowLocalProgress(FLOW_SLUG);
  window.localStorage.removeItem(getSourceBackedFlowMapSnapshotStorageKey(MAP_ID));
  window.localStorage.removeItem(getSourceBackedFlowMapPersistenceStorageKey(MAP_ID));
  window.localStorage.removeItem('flow:map:update:dismissed');
}

function buildObservationFixture() {
  const currentSnapshot = buildSourceBackedFlowMapSavedSnapshot(MAP_ID, {
    savedAt: OBSERVATION_COMPLETED_AT,
    anchor: OBSERVATION_ANCHOR,
  });
  if (!currentSnapshot) return undefined;

  const currentRecord = buildSourceBackedFlowMapPersistenceRecordUpdate(currentSnapshot, {
    savedAt: OBSERVATION_COMPLETED_AT,
    anchor: OBSERVATION_ANCHOR,
  });
  const currentFlow = currentRecord?.childFlows.find((flow) => flow.slug === FLOW_SLUG);
  if (!currentRecord || !currentFlow) return undefined;

  const allStepIds = currentFlow.steps.map((step) => step.stepId);
  const personalCopy: SourceBackedFlowMapPersonalCopy = {
    source: 'url_first_custom_start',
    originalTitle: currentSnapshot.title,
    includedStepIdsByFlow: { [FLOW_SLUG]: [INCLUDED_STEP_ID] },
    excludedStepIdsByFlow: {
      [FLOW_SLUG]: allStepIds.filter((stepId) => stepId !== INCLUDED_STEP_ID && stepId !== ADDED_STEP_ID),
    },
    stepOverridesByFlow: {
      [FLOW_SLUG]: {
        [INCLUDED_STEP_ID]: {
          title: '내 시험용 소인수분해',
          userMemo: '내 풀이 순서를 유지',
          schedule: { mode: 'fixed_date', date: '2026-07-18' },
        },
      },
    },
  };
  const oldSnapshot = {
    ...currentSnapshot,
    title: '단원별 개념 진도',
    version: OLD_SOURCE_VERSION,
    stepCountsByFlow: { ...currentSnapshot.stepCountsByFlow, [FLOW_SLUG]: 1 },
    personalCopy,
  };
  const projectedRecord = buildSourceBackedFlowMapPersistenceRecordUpdate(oldSnapshot, {
    savedAt: OBSERVATION_COMPLETED_AT,
    anchor: OBSERVATION_ANCHOR,
    baselineRecord: currentRecord,
  });
  const projectedFlow = projectedRecord?.childFlows.find((flow) => flow.slug === FLOW_SLUG);
  const firstStep = projectedFlow?.steps.find((step) => step.stepId === INCLUDED_STEP_ID);
  if (!projectedRecord || !firstStep) return undefined;

  return {
    snapshot: oldSnapshot,
    persistenceRecord: {
      ...projectedRecord,
      map: { ...projectedRecord.map, version: OLD_SOURCE_VERSION },
      childFlows: projectedRecord.childFlows.map((flow) => flow.slug === FLOW_SLUG
        ? {
            ...flow,
            steps: flow.steps.map((step) => step.stepId === INCLUDED_STEP_ID
              ? {
                  ...step,
                  title: '이전 소인수분해',
                  textFallback: { ...step.textFallback, description: '이전에 저장한 설명' },
                }
              : step),
          }
        : flow),
    },
  };
}

export function P22ObservationSetup() {
  const [status, setStatus] = useState('');
  const [writing, setWriting] = useState(false);

  const prepareRepeatUseScenario = async () => {
    const fixture = buildObservationFixture();
    if (!fixture) {
      setStatus('관찰 상태를 만들지 못했습니다. 현재 seed와 fixture 연결을 확인해 주세요.');
      return;
    }

    setWriting(true);
    const result = await withFlowUserDataWriteLock(() => {
      clearObservationState();
      window.localStorage.setItem(
        getSourceBackedFlowMapSnapshotStorageKey(MAP_ID),
        JSON.stringify(fixture.snapshot),
      );
      window.localStorage.setItem(
        getSourceBackedFlowMapPersistenceStorageKey(MAP_ID),
        JSON.stringify(fixture.persistenceRecord),
      );
      saveFlowRecord(FLOW_SLUG, { selectedArtifactMode: 'calendar', anchor: OBSERVATION_ANCHOR });
      saveStoredAnchor(FLOW_SLUG, { mode: 'custom', anchor: OBSERVATION_ANCHOR });
      saveChecks(FLOW_SLUG, { [INCLUDED_STEP_ID]: true });
      saveItemStates(FLOW_SLUG, Object.fromEntries(
        fixture.snapshot.personalCopy?.excludedStepIdsByFlow[FLOW_SLUG].map((stepId) => [
          stepId,
          { personalExcluded: true },
        ]) ?? [],
      ));
      ensureLegacyActiveFlowRun(FLOW_SLUG, {
        runId: 'p22-observation-completed-run',
        startedAt: '2026-07-01T09:00:00.000Z',
        mapSnapshot: fixture.snapshot,
      });
      recordFlowCompletionState(FLOW_SLUG, true, OBSERVATION_COMPLETED_AT);
      return completeActiveFlowRun(FLOW_SLUG, {
        completedAt: OBSERVATION_COMPLETED_AT,
        mapSnapshot: fixture.snapshot,
      });
    });
    setWriting(false);
    if (!result.ok || !result.value) {
      setStatus('완료 실행을 보관하지 못했습니다. 상태를 지운 뒤 다시 준비해 주세요.');
      return;
    }
    window.location.assign('/my');
  };

  const resetScenario = async () => {
    if (writing) return;
    setWriting(true);
    const result = await withFlowUserDataWriteLock(clearObservationState);
    setWriting(false);
    if (!result.ok) {
      setStatus('P22 반복 사용 관찰 상태를 지우지 못했습니다. 다시 시도해 주세요.');
      return;
    }
    setStatus('P22 반복 사용 관찰 상태를 지웠습니다.');
  };

  return (
    <main data-testid="p22-observation-setup" className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-amber-700">내부 관찰 준비 도구</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">P22 반복 사용 관찰 상태 준비</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          진행자가 참가자에게 화면을 넘기기 전에 사용합니다. 정상 사용자 메뉴에는 연결하지 않으며,
          상태를 준비한 뒤 참가자는 평소 내 Flow 화면만 보게 됩니다.
        </p>
      </header>

      <section className="py-6">
        <h2 className="text-xl font-semibold text-slate-950">완료 Flow와 새 원문 비교</h2>
        <ol className="mt-3 space-y-2 pl-5 text-sm leading-6 text-slate-700">
          <li className="list-decimal">한 항목만 사용하고 완료한 개인 사본을 준비합니다.</li>
          <li className="list-decimal">저장 뒤 원문에서 내용 변경과 새 항목이 생긴 상태를 만듭니다.</li>
          <li className="list-decimal">내 Flow로 이동해 참가자가 업데이트 알림과 다시 쓰기를 직접 해석하게 합니다.</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="p22-observation-prepare-version-review"
            disabled={writing}
            onClick={() => void prepareRepeatUseScenario()}
            className="min-h-11 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            반복 사용 상태 준비
          </button>
          <button
            type="button"
            data-testid="p22-observation-reset"
            disabled={writing}
            onClick={() => void resetScenario()}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            준비 상태 지우기
          </button>
        </div>
        {status ? <p role="status" className="mt-3 text-sm font-medium text-slate-700">{status}</p> : null}
      </section>

      <section className="border-t border-slate-200 py-6">
        <h2 className="text-xl font-semibold text-slate-950">다른 회차</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
          <Link className="text-blue-700 underline underline-offset-4" href="/">첫 진입 관찰</Link>
          <Link className="text-blue-700 underline underline-offset-4" href="/flows">URL·메모 관찰</Link>
          <Link className="text-blue-700 underline underline-offset-4" href="/calendar">Calendar 관찰</Link>
          <Link className="text-blue-700 underline underline-offset-4" href="/flow-lab">내부 Flow Lab</Link>
        </div>
      </section>
    </main>
  );
}
