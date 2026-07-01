'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type TabId = 'home' | 'find' | 'calendar' | 'my';
type FlowId = 'moving' | 'math' | 'jeonse';

type IaStep = {
  id: string;
  flowId: FlowId;
  title: string;
  date?: string;
  timing?: string;
  items: string[];
};

type IaFlow = {
  id: FlowId;
  title: string;
  type: 'map' | 'single';
  summary: string;
  source: string;
  inputLabel: string;
  output: string;
  steps: IaStep[];
};

const flows: IaFlow[] = [
  {
    id: 'moving',
    title: '원룸 이사 D-30',
    type: 'map',
    summary: '이사일을 넣으면 원문 체크리스트가 날짜별 할 일로 저장됩니다.',
    source: 'AJD 이사 준비 체크리스트',
    inputLabel: '이사일',
    output: 'D-30 일정',
    steps: [
      {
        id: 'moving-quote',
        flowId: 'moving',
        title: '이사 방식과 견적 후보 정하기',
        date: '2026-06-22',
        timing: 'D-30',
        items: ['이사 방식 1개 선택', '견적 후보 2-3곳 연락처 메모', '포함 범위와 예상 비용 메모'],
      },
      {
        id: 'moving-cleaning',
        flowId: 'moving',
        title: '입주청소와 대형폐기물 일정 확인',
        date: '2026-07-08',
        timing: 'D-14',
        items: ['입주청소 예약 가능일 확인', '대형폐기물 수거일 확인', '예약처와 신고 번호 메모'],
      },
      {
        id: 'moving-photo',
        flowId: 'moving',
        title: '계량기와 집 상태 사진 남기기',
        date: '2026-07-21',
        timing: 'D-1',
        items: ['전기·가스·수도 계량기 촬영', '현관·욕실·창문 상태 촬영', '사진 저장 위치 메모'],
      },
    ],
  },
  {
    id: 'math',
    title: '중1 수학 목차 진도',
    type: 'map',
    summary: '원문 목차를 단원별 진도표로 저장하고, 필요한 단원만 이어서 봅니다.',
    source: 'Mathbang 중1 수학 목차',
    inputLabel: '입력 없음',
    output: '8개 단원 진도표',
    steps: [
      {
        id: 'math-prime',
        flowId: 'math',
        title: '1. 소인수분해',
        timing: '진도 1/8',
        items: ['개념 글 열기', '예제 풀이 완료 표시', '틀린 유형만 메모'],
      },
      {
        id: 'math-integer',
        flowId: 'math',
        title: '2. 정수와 유리수',
        timing: '진도 2/8',
        items: ['정수·유리수 개념 확인', '계산 문제 풀이 완료 표시', '부호 실수 메모'],
      },
      {
        id: 'math-graph',
        flowId: 'math',
        title: '3. 좌표평면과 그래프',
        timing: '진도 3/8',
        items: ['좌표평면 개념 확인', '그래프 해석 문제 풀이', '다시 볼 문제 메모'],
      },
    ],
  },
  {
    id: 'jeonse',
    title: '전세계약 전 서류 체크',
    type: 'single',
    summary: '계약일 기준으로 D-3, D-Day, D+1 확인 항목을 남깁니다.',
    source: '전세계약 전 확인 가이드',
    inputLabel: '계약 예정일',
    output: '캘린더 + 체크',
    steps: [
      {
        id: 'jeonse-registry',
        flowId: 'jeonse',
        title: '시세와 등기부등본 권리관계 확인하기',
        date: '2026-06-29',
        timing: 'D-3',
        items: ['시세 범위 확인', '등기부등본 권리관계 확인', '걸리는 항목은 보류 메모'],
      },
      {
        id: 'jeonse-contract',
        flowId: 'jeonse',
        title: '중개사와 표준계약서 확인하기',
        date: '2026-07-02',
        timing: 'D-Day',
        items: ['특약과 금액 확인', '계약서 정보 일치 여부 확인', '원문 개인정보는 저장하지 않음'],
      },
    ],
  },
];

const navTabs: { id: TabId; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'find', label: 'Flow 찾기' },
  { id: 'calendar', label: '캘린더' },
  { id: 'my', label: '내 Flow' },
];

function getFlow(id: FlowId) {
  return flows.find((flow) => flow.id === id) ?? flows[0];
}

function FlowBadge({ flow }: { flow: IaFlow }) {
  return (
    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
      {flow.type === 'map' ? '큰 구조' : '바로 실행'}
    </span>
  );
}

function StepDetail({ step }: { step: IaStep }) {
  const flow = getFlow(step.flowId);
  return (
    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3" data-testid="ia-step-detail">
      <p className="text-xs font-semibold text-blue-700">{flow.title}</p>
      <h4 className="mt-1 text-base font-semibold text-slate-950">{step.title}</h4>
      <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-slate-700">
        {step.items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <textarea
        aria-label={`${step.title} 메모`}
        className="mt-3 min-h-20 w-full rounded-md border border-blue-100 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
        placeholder="필요한 연락처, 링크, 다시 볼 내용만 짧게 남기기"
      />
    </div>
  );
}

function StepRow({
  step,
  active,
  onToggle,
}: {
  step: IaStep;
  active: boolean;
  onToggle: () => void;
}) {
  const flow = getFlow(step.flowId);
  return (
    <div>
      <button
        type="button"
        className={`w-full rounded-lg border px-3 py-3 text-left ${active ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}
        aria-expanded={active}
        onClick={onToggle}
        data-testid="ia-step-row"
      >
        <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
          {step.date ? <span>{step.date}</span> : null}
          {step.timing ? <span>{step.timing}</span> : null}
          <span>{flow.title}</span>
        </span>
        <span className="mt-1 block text-sm font-semibold text-slate-950">{step.title}</span>
      </button>
      {active ? <StepDetail step={step} /> : null}
    </div>
  );
}

export function FourTabIaPoc() {
  const [tab, setTab] = useState<TabId>('home');
  const [selectedFlow, setSelectedFlow] = useState<FlowId>('moving');
  const [savedFlowIds, setSavedFlowIds] = useState<FlowId[]>([]);
  const [activeStepId, setActiveStepId] = useState('moving-quote');

  const savedFlows = useMemo(
    () => flows.filter((flow) => savedFlowIds.includes(flow.id)),
    [savedFlowIds],
  );
  const savedSteps = savedFlows.flatMap((flow) => flow.steps);
  const datedSteps = savedSteps.filter((step) => step.date);
  const saveFlow = (id: FlowId) => {
    setSavedFlowIds((current) => (current.includes(id) ? current : [...current, id]));
    const firstStep = getFlow(id).steps[0];
    setActiveStepId(firstStep.id);
    setTab('calendar');
  };

  const renderHeader = () => (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <button type="button" className="text-lg font-bold tracking-tight text-slate-950" onClick={() => setTab('home')}>
          FLOW
        </button>
        <div className="hidden rounded-md bg-slate-100 p-1 sm:grid sm:grid-cols-4">
          {navTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-semibold ${tab === item.id ? 'bg-slate-950 text-white' : 'text-slate-700'}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );

  const renderMobileTabs = () => (
    <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur sm:hidden" aria-label="B안 주요 화면">
      {navTabs.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`min-h-12 rounded-md px-1 text-xs font-semibold ${tab === item.id ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
          onClick={() => setTab(item.id)}
          data-testid={`ia-tab-${item.id}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );

  const renderHome = () => (
    <section className="grid gap-5 md:grid-cols-[1fr_0.9fr] md:items-center">
      <div>
        <p className="text-sm font-semibold text-blue-700">Flow</p>
        <h1 className="mt-2 break-keep text-3xl font-semibold leading-tight tracking-tight text-slate-950 md:text-5xl">
          따라 할 콘텐츠를 내 일정으로
        </h1>
        <p className="mt-4 max-w-xl break-keep text-base leading-7 text-slate-600">
          저장하면 날짜가 있는 항목은 캘린더에, 전체 구조는 내 Flow에 남습니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setTab('find')}>
            Flow 찾기
          </button>
          <button type="button" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800" onClick={() => setTab(savedFlows.length ? 'calendar' : 'my')}>
            {savedFlows.length ? '캘린더 보기' : '내 Flow 보기'}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-left shadow-sm"
        onClick={() => {
          setSelectedFlow('moving');
          setTab('find');
        }}
      >
        <p className="text-sm font-semibold text-blue-700">추천 시작점</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">원룸 이사 D-30</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">이사일 하나로 날짜별 할 일을 캘린더에 배치합니다.</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold">
          <span className="rounded-md bg-white px-2 py-2 text-slate-700">입력<br />이사일</span>
          <span className="rounded-md bg-white px-2 py-2 text-slate-700">저장<br />D-30 일정</span>
          <span className="rounded-md bg-white px-2 py-2 text-slate-700">실행<br />캘린더</span>
        </div>
      </button>
    </section>
  );

  const renderFind = () => {
    const flow = getFlow(selectedFlow);
    return (
      <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-semibold text-blue-700">Flow 찾기</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">저장할 Flow 고르기</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">카드는 저장 결과만 보여주고, 자세한 항목은 오른쪽에서 확인합니다.</p>
          <div className="mt-4 grid gap-3">
            {flows.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded-xl border p-4 text-left ${selectedFlow === item.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}
                onClick={() => setSelectedFlow(item.id)}
                data-testid="ia-flow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <FlowBadge flow={item} />
                  <span className="text-xs font-semibold text-slate-500">{item.output}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.summary}</p>
              </button>
            ))}
          </div>
        </div>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">{flow.source}</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">{flow.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{flow.summary}</p>
            </div>
            <FlowBadge flow={flow} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold sm:grid-cols-3">
            <span className="rounded-md bg-slate-50 px-3 py-2 text-slate-700">입력: {flow.inputLabel}</span>
            <span className="rounded-md bg-slate-50 px-3 py-2 text-slate-700">결과: {flow.output}</span>
            <span className="rounded-md bg-slate-50 px-3 py-2 text-slate-700">항목: {flow.steps.length}개</span>
          </div>
          <div className="mt-4 grid gap-2">
            {flow.steps.map((step) => (
              <div key={step.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold text-slate-950">{step.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{[step.date, step.timing, `${step.items.length}개 메모 항목`].filter(Boolean).join(' · ')}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => saveFlow(flow.id)}
              data-testid="ia-save-flow"
            >
              저장하고 캘린더 보기
            </button>
            <button type="button" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
              원문 열기
            </button>
          </div>
        </article>
      </section>
    );
  };

  const renderCalendar = () => (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-700">실행 캘린더</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">오늘과 날짜별 항목</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">날짜가 있는 항목은 여기에서 바로 열고 체크합니다.</p>
        </div>
        <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800" onClick={() => setTab('find')}>
          Flow 더 찾기
        </button>
      </div>
      {savedFlows.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-lg font-semibold text-slate-950">아직 캘린더에 들어온 항목이 없습니다</p>
          <button type="button" className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setTab('find')}>
            Flow 찾기
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">2026년 6월</h2>
              <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{datedSteps.length}개 일정</span>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}
              {Array.from({ length: 30 }, (_, index) => {
                const day = index + 1;
                const dayText = String(day).padStart(2, '0');
                const hasStep = datedSteps.some((step) => step.date?.endsWith(`-${dayText}`));
                return (
                  <button
                    key={day}
                    type="button"
                    className={`min-h-10 rounded-md text-xs font-semibold ${hasStep ? 'bg-blue-700 text-white' : 'bg-slate-50 text-slate-700'}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3">
            <h2 className="text-lg font-semibold text-slate-950">이번에 실행할 항목</h2>
            {(datedSteps.length ? datedSteps : savedSteps).map((step) => (
              <StepRow
                key={step.id}
                step={step}
                active={activeStepId === step.id}
                onToggle={() => setActiveStepId(activeStepId === step.id ? '' : step.id)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );

  const renderMyFlow = () => (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-700">저장한 Flow 관리</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">내 Flow</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">실행은 캘린더에서 하고, 전체 구조와 원문은 여기서 정리합니다.</p>
        </div>
        <button type="button" className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => setTab('calendar')}>
          캘린더에서 실행
        </button>
      </div>
      {savedFlows.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-lg font-semibold text-slate-950">저장한 Flow가 없습니다</p>
          <p className="mt-2 text-sm text-slate-600">Flow를 저장하면 캘린더에는 실행 항목이, 내 Flow에는 전체 구조가 남습니다.</p>
          <button type="button" className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setTab('find')}>
            Flow 찾기
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {savedFlows.map((flow) => (
            <article key={flow.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <FlowBadge flow={flow} />
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{flow.steps.length}개 항목</span>
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{flow.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{flow.source}</p>
                </div>
                <button type="button" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800" onClick={() => setTab('calendar')}>
                  실행 보기
                </button>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/6 bg-blue-700" />
              </div>
              <div className="mt-3 grid gap-2">
                {flow.steps.slice(0, 2).map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    className="rounded-md bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800"
                    onClick={() => {
                      setActiveStepId(step.id);
                      setTab('calendar');
                    }}
                  >
                    {step.title}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {renderHeader()}
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-5 md:py-8">
        {tab === 'home' ? renderHome() : null}
        {tab === 'find' ? renderFind() : null}
        {tab === 'calendar' ? renderCalendar() : null}
        {tab === 'my' ? renderMyFlow() : null}
      </div>
      {renderMobileTabs()}
    </main>
  );
}

export function IaComparisonReport() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 pb-20">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-blue-700">IA 비교 설계</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">3탭 A안과 4탭 B안 비교</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          목적은 캘린더를 글로벌 실행 탭으로 승격했을 때 저장 직후와 다중 Flow 관리가 더 자연스러워지는지 확인하는 것입니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" href="/ia-compare/b">
            B안 사용자 PoC 열기
          </Link>
          <Link className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800" href="/my?demo=source-backed">
            A안 현재 구조 보기
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-500">A안</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">홈 / Flow 찾기 / 내 Flow</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
            <li>캘린더는 내 Flow 내부 탭입니다.</li>
            <li>전역 탭 수가 적고 현재 구현과 가깝습니다.</li>
            <li>단점은 실행 화면과 보관/관리 화면이 내 Flow 안에 섞입니다.</li>
          </ul>
        </article>
        <article className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-semibold text-blue-700">B안 실험</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">홈 / Flow 찾기 / 캘린더 / 내 Flow</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
            <li>캘린더가 저장 후 실행 목적지가 됩니다.</li>
            <li>내 Flow는 저장한 Flow와 Flow Map 관리 공간으로 줄어듭니다.</li>
            <li>검증할 위험은 4탭이 모바일에서 과해 보이는지입니다.</li>
          </ul>
        </article>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-950">판단 기준</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            '저장 직후 첫 행동이 캘린더에서 더 명확한가',
            'Flow가 여러 개일 때 오늘 실행과 전체 관리가 분리되는가',
            'Flow Map / Flow / Step / Item 용어가 과하게 노출되지 않는가',
            '홈과 Flow 찾기가 덜 중복처럼 보이는가',
            '캘린더가 글로벌 탭으로 있어도 모바일 복잡도가 허용되는가',
          ].map((item) => (
            <p key={item} className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
              {item}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
