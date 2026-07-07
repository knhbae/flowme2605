'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AJD_MOVING_SOURCE_URL,
  buildUrlFirstMemoDraft,
  lookupUrlFirstP0Input,
  type UrlFirstExportMode,
  type UrlFirstLookupResult,
  type UrlFirstLookupStatus,
} from '@/lib/flow/url-first-lookup';

type LabMode = 'url' | 'memo';
type PreviewTab = 'calendar' | 'markdown' | 'checklist' | 'myFlow';

const vehicleNeedsReviewUrl = 'https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share';
const unknownUrl = 'https://example.com/how-to-plan-a-local-move?utm_source=blog';
const memoSample = '8월 말 이사 예정. 이번 주에는 집 하자 점검, 이사업체 견적, 관리사무소 연락. 다음 주에는 전입신고 준비랑 주소 변경.';

const statusLabels: Record<UrlFirstLookupStatus, string> = {
  hit: 'hit',
  needs_review: 'needs_review',
  miss: 'miss',
  memo_draft: 'memo_draft',
};

const statusStyles: Record<UrlFirstLookupStatus, string> = {
  hit: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  needs_review: 'border-amber-200 bg-amber-50 text-amber-900',
  miss: 'border-slate-200 bg-slate-50 text-slate-700',
  memo_draft: 'border-sky-200 bg-sky-50 text-sky-900',
};

const exportLabels: Record<UrlFirstExportMode, string> = {
  calendar: '.ics',
  markdown: 'Markdown',
  checklist: 'checklist',
};

const previewTabs: Array<{ id: PreviewTab; label: string }> = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'myFlow', label: 'My Flow' },
];

function SampleButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-blue-500 hover:text-blue-700"
    >
      {children}
    </button>
  );
}

function ResultSummary({ result }: { result: UrlFirstLookupResult }) {
  return (
    <section className={`rounded-lg border p-5 ${statusStyles[result.status]}`} data-testid="url-first-result-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-current px-2.5 py-1 text-xs font-black uppercase tracking-normal">
          상태 {statusLabels[result.status]}
        </span>
        <span className="text-xs font-bold">AI 생성 disabled</span>
        <span className="text-xs font-bold">저장 {result.canSaveToMyFlow ? '가능' : '미리보기만'}</span>
      </div>
      <h2 className="mt-4 text-2xl font-black tracking-normal text-slate-950">{result.title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{result.summary}</p>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md bg-white/80 p-3">
          <dt className="text-xs font-black text-slate-500">Canonical</dt>
          <dd className="mt-1 break-words font-semibold text-slate-900">{result.displayUrl || '메모 입력'}</dd>
        </div>
        <div className="rounded-md bg-white/80 p-3">
          <dt className="text-xs font-black text-slate-500">출처 상태</dt>
          <dd className="mt-1 font-semibold text-slate-900">{result.sourceStatus}</dd>
        </div>
        <div className="rounded-md bg-white/80 p-3">
          <dt className="text-xs font-black text-slate-500">연결 route</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {result.routeHref ? <a className="underline" href={result.routeHref}>{result.routeHref}</a> : '없음'}
          </dd>
        </div>
        <div className="rounded-md bg-white/80 p-3">
          <dt className="text-xs font-black text-slate-500">검토일</dt>
          <dd className="mt-1 font-semibold text-slate-900">{result.sourceCheckedAt || '대기'}</dd>
        </div>
      </dl>
    </section>
  );
}

function ExportPreview({ result, activeTab, onTabChange }: { result: UrlFirstLookupResult; activeTab: PreviewTab; onTabChange: (tab: PreviewTab) => void }) {
  const previewRows = result.preview[activeTab];
  const selectedFilename = activeTab === 'calendar' ? result.preview.calendarFilename : activeTab === 'markdown' ? result.preview.markdownFilename : undefined;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid="url-first-export-preview">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-blue-700">export preview</p>
          <h2 className="mt-1 text-xl font-black tracking-normal text-slate-950">파일과 복사 결과 미리보기</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {result.exportModes.length > 0 ? (
            result.exportModes.map((mode) => (
              <span key={mode} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                {exportLabels[mode]}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">export gate</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {previewTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`rounded-md border px-3 py-2 text-sm font-black ${
              activeTab === tab.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {selectedFilename ? <p className="mt-4 text-sm font-black text-slate-900">{selectedFilename}</p> : null}
      <ul className="mt-3 space-y-2 rounded-md bg-slate-950 p-4 text-sm text-white">
        {previewRows.length > 0 ? (
          previewRows.map((row) => <li key={row}>{row}</li>)
        ) : (
          <li>원문 확인 전에는 캘린더 파일을 만들지 않습니다.</li>
        )}
      </ul>
      <p className="mt-3 text-xs font-semibold text-slate-500">이 화면은 localStorage, My Flow, Calendar를 변경하지 않습니다. 실제 저장 없음.</p>
    </section>
  );
}

function GateNotice({ result }: { result: UrlFirstLookupResult }) {
  if (!result.gate) return null;
  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-5" data-testid="url-first-gate">
      <p className="text-xs font-black uppercase tracking-normal text-amber-700">save/export gate</p>
      <h2 className="mt-1 text-xl font-black tracking-normal text-amber-950">{result.gate.title}</h2>
      <p className="mt-2 text-sm font-bold text-amber-900">{result.gate.reason}</p>
      <p className="mt-2 text-sm text-amber-900">{result.gate.requiredAction}</p>
    </section>
  );
}

function Recommendation({ result }: { result: UrlFirstLookupResult }) {
  if (!result.recommendation) return null;
  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50 p-5" data-testid="url-first-recommendation">
      <p className="text-xs font-black uppercase tracking-normal text-sky-700">existing Flow recommendation</p>
      <h2 className="mt-1 text-xl font-black tracking-normal text-slate-950">{result.recommendation.title}</h2>
      <p className="mt-2 text-sm text-slate-700">{result.recommendation.reason}</p>
      <a className="mt-3 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white" href={result.recommendation.href}>
        기존 Flow 열기
      </a>
    </section>
  );
}

export function UrlFirstP0Lab() {
  const [mode, setMode] = useState<LabMode>('url');
  const [input, setInput] = useState(AJD_MOVING_SOURCE_URL);
  const [activeTab, setActiveTab] = useState<PreviewTab>('calendar');

  const result = useMemo(() => (mode === 'memo' ? buildUrlFirstMemoDraft(input) : lookupUrlFirstP0Input(input)), [input, mode]);

  function loadSample(nextMode: LabMode, nextInput: string) {
    setMode(nextMode);
    setInput(nextInput);
    setActiveTab('calendar');
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8" data-testid="url-first-p0-lab">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <p
            className="text-sm font-black text-blue-700"
            data-testid="url-first-p0-lab-internal-console-context"
          >
            내부 실험 콘솔 · 정상 사용자 메뉴에 연결하지 않는 검증 화면
          </p>
          <h1 className="max-w-4xl text-4xl font-black tracking-normal text-slate-950">URL-first P0 실험</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            원문 URL을 먼저 canonical lookup으로 찾고, 중복이면 기존 Flow를 재사용합니다. P0에서는 AI 생성과 실제 저장을 켜지 않고 상태 판정과 결과 예측만 확인합니다.
          </p>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <SampleButton onClick={() => loadSample('url', AJD_MOVING_SOURCE_URL)}>AJD 이사 URL</SampleButton>
            <SampleButton onClick={() => loadSample('url', vehicleNeedsReviewUrl)}>자동차검사 needs_review</SampleButton>
            <SampleButton onClick={() => loadSample('url', unknownUrl)}>알 수 없는 URL</SampleButton>
            <SampleButton onClick={() => loadSample('memo', memoSample)}>메모 초안</SampleButton>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[160px_1fr]">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {(['url', 'memo'] as const).map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  onClick={() => setMode(nextMode)}
                  className={`rounded-md border px-4 py-3 text-sm font-black ${
                    mode === nextMode ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {nextMode === 'url' ? 'URL' : 'Memo'}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="text-xs font-black text-slate-500">{mode === 'url' ? 'URL 입력' : '계획 메모 입력'}</span>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="mt-2 min-h-28 w-full resize-y rounded-md border border-slate-300 bg-slate-50 p-3 text-sm font-medium text-slate-950 outline-none transition focus:border-blue-600 focus:bg-white"
              />
            </label>
          </div>
        </section>

        <ResultSummary result={result} />
        <GateNotice result={result} />
        <Recommendation result={result} />
        <ExportPreview result={result} activeTab={activeTab} onTabChange={setActiveTab} />

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-testid="url-first-my-flow-calendar-preview">
          <p className="text-xs font-black uppercase tracking-normal text-blue-700">My Flow / Calendar preview only</p>
          <h2 className="mt-1 text-xl font-black tracking-normal text-slate-950">저장 후 예상 화면</h2>
          <p className="mt-2 text-sm text-slate-600">실제 저장 없음. My Flow와 Calendar에는 쓰지 않고 예상 row만 보여줍니다.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-4">
              <h3 className="text-sm font-black text-slate-900">My Flow 예상</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {result.preview.myFlow.map((row) => <li key={row}>{row}</li>)}
              </ul>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <h3 className="text-sm font-black text-slate-900">Calendar 예상</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {(result.preview.calendar.length > 0 ? result.preview.calendar : ['캘린더에 쓰지 않습니다.']).map((row) => <li key={row}>{row}</li>)}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
