'use client';

import type { FlowSurfaceModel, SurfaceExportKind } from '@/lib/flow/surface';
import { getSurfaceExportLabel } from '@/lib/flow/surface';

type ToolSurfacePreviewProps = {
  model: FlowSurfaceModel;
  onExport: (kind: SurfaceExportKind) => void;
  onCopyToEditableDraft: () => void;
  showActions?: boolean;
  copyState?: string;
  downloadState?: string;
  calendarState?: string;
};

export function ToolSurfacePreview({
  model,
  onExport,
  onCopyToEditableDraft,
  showActions = true,
  copyState,
  downloadState,
  calendarState,
}: ToolSurfacePreviewProps) {
  return (
    <section className="my-6 rounded-xl border border-blue-100 bg-white p-5 shadow-sm" data-testid="tool-surface-preview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-blue-700">내 도구에 들어간 모습</h2>
          <h3 className="mt-1 text-2xl font-semibold text-gray-950">{getSurfaceTitle(model)}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">{getSurfaceDescription(model)}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">도구: {model.primaryToolLabel}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">리듬: {model.rhythmLabel}</span>
          </div>
        </div>
        {showActions ? (
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={onCopyToEditableDraft}>
            내 Flow로 가져오기
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <SurfaceBody model={model} />
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-950">내 상황에 맞게 바꾸기</h3>
          <dl className="mt-3 grid gap-2 text-sm">
            {model.settings.map((setting) => (
              <div key={setting.id} className="rounded-md bg-gray-50 p-3">
                <dt className="font-semibold text-gray-950">{setting.label}</dt>
                <dd className="mt-1 text-gray-600">{setting.value}</dd>
              </div>
            ))}
          </dl>
          {showActions ? (
            <>
              <h3 className="mt-4 text-sm font-semibold text-gray-950">가져가기</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {[model.primaryExport, ...model.secondaryExports].map((kind, index) => (
                  <button
                    key={kind}
                    className={
                      index === 0
                        ? 'rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white'
                        : 'rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold'
                    }
                    onClick={() => onExport(kind)}
                  >
                    {getSurfaceExportLabel(kind)}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {calendarState ? <span className="text-blue-700">{calendarState}</span> : null}
                {downloadState ? <span className="text-blue-700">{downloadState}</span> : null}
                {copyState ? <span className="text-green-700">{copyState}</span> : null}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function SurfaceBody({ model }: { model: FlowSurfaceModel }) {
  if (model.type === 'calendar_routine') return <CalendarSurface model={model} />;
  if (model.type === 'daily_check') return <DailyCheckSurface model={model} />;
  if (model.type === 'dday_timeline') return <TimelineSurface model={model} />;
  if (model.type === 'sheet_tracker') return <SheetSurface model={model} />;
  return <SingleActionSurface model={model} />;
}

function CalendarSurface({ model }: { model: FlowSurfaceModel }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
      <h3 className="text-lg font-semibold text-gray-950">월간 캘린더 미리보기</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {model.previewEntries.map((entry) => (
          <article key={entry.id} className="rounded-md border border-blue-100 bg-white p-3">
            <p className="text-sm font-semibold text-blue-700">{entry.day}요일</p>
            <p className="mt-1 text-lg font-semibold text-gray-950">{entry.date}</p>
            <p className="mt-2 text-sm text-gray-600">{entry.label}</p>
            <p className="mt-1 text-sm font-medium text-gray-950">{entry.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DailyCheckSurface({ model }: { model: FlowSurfaceModel }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
      <h3 className="text-lg font-semibold text-gray-950">7일 체크표 미리보기</h3>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {model.previewEntries.map((entry) => (
          <article key={entry.id} className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-sm font-semibold text-gray-950">{entry.day}요일</p>
            <p className="mt-1 text-sm text-gray-500">{entry.date}</p>
            <p className="mt-2 text-xs font-medium text-blue-700">{entry.label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TimelineSurface({ model }: { model: FlowSurfaceModel }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
      <h3 className="text-lg font-semibold text-gray-950">D-Day 단계표 미리보기</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {model.previewEntries.map((entry) => (
          <article key={entry.id} className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-sm font-semibold text-blue-700">{entry.phase}</p>
            <p className="mt-1 text-sm font-medium text-gray-950">{entry.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SingleActionSurface({ model }: { model: FlowSurfaceModel }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
      <h3 className="text-lg font-semibold text-gray-950">오늘 할 일 미리보기</h3>
      <div className="mt-4 space-y-2">
        {model.previewEntries.map((entry) => (
          <article key={entry.id} className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-sm font-semibold text-blue-700">{entry.label}</p>
            <p className="mt-1 text-sm font-medium text-gray-950">{entry.title}</p>
            {entry.note ? <p className="mt-1 text-sm text-gray-600">{entry.note}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function SheetSurface({ model }: { model: FlowSurfaceModel }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
      <h3 className="text-lg font-semibold text-gray-950">시트 실행표 미리보기</h3>
      <div className="mt-4 overflow-hidden rounded-md border border-gray-200 bg-white">
        {model.previewEntries.map((entry) => (
          <div key={entry.id} className="grid grid-cols-[120px_1fr_90px] border-b border-gray-100 p-3 text-sm last:border-b-0">
            <span className="text-gray-500">{entry.date ?? '-'}</span>
            <span className="font-medium text-gray-950">{entry.title}</span>
            <span className="text-blue-700">{entry.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function getSurfaceTitle(model: FlowSurfaceModel): string {
  if (model.type === 'calendar_routine') return '캘린더에 들어간 반복 일정';
  if (model.type === 'daily_check') return '체크표에 들어간 일별 적용';
  if (model.type === 'dday_timeline') return '날짜별로 정리된 D-Day 단계';
  if (model.type === 'sheet_tracker') return '엑셀에 들어갈 실행표';
  return '오늘 실행할 메모와 체크';
}

function getSurfaceDescription(model: FlowSurfaceModel): string {
  if (model.type === 'calendar_routine') return '콘텐츠가 반복 일정으로 먼저 들어갑니다. 시작일과 요일만 바꾸면 됩니다.';
  if (model.type === 'daily_check') return '콘텐츠의 원칙이 7일 체크표로 들어갑니다. 적용 요일과 문구만 바꾸면 됩니다.';
  if (model.type === 'dday_timeline') return '목표일까지 해야 할 일을 단계별 표로 먼저 보여줍니다.';
  if (model.type === 'sheet_tracker') return '반복 기록과 상태 관리를 엑셀형 실행표로 먼저 보여줍니다.';
  return '한 번 실행할 일을 메모와 체크 항목으로 먼저 보여줍니다.';
}
