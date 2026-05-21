'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { serializeTextFlow } from '@/lib/flow/parser';
import { getFlowSurfaceModel, type FlowSurfaceType } from '@/lib/flow/surface';
import type { FlowBundle, FlowItem, FlowStatus } from '@/lib/flow/types';
import { ToolSurfacePreview } from '@/components/flow/ToolSurfacePreview';

type ToolSurfaceEditorProps = {
  bundle: FlowBundle;
  onSave: (bundle: FlowBundle) => void;
  renderHeader: (actions: { onSave: () => void; onPublish: () => void }) => ReactNode;
};

const weekdays = ['월', '화', '수', '목', '금', '토', '일'];

export function ToolSurfaceEditor({ bundle, onSave, renderHeader }: ToolSurfaceEditorProps) {
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedWeekdays, setSelectedWeekdays] = useState(['월', '수', '금']);
  const [items, setItems] = useState<FlowItem[]>(bundle.items);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const model = useMemo(
    () => getFlowSurfaceModel({ ...bundle, items }, { anchorDate, weekdays: selectedWeekdays }),
    [anchorDate, bundle, items, selectedWeekdays],
  );

  const save = (status: FlowStatus = bundle.flow.status) => {
    onSave({
      ...bundle,
      items,
      flow: {
        ...bundle.flow,
        status,
        raw_text: bundle.flow.raw_text ?? serializeTextFlow(bundle.sections, items, bundle.itemDetails ?? [], bundle.warnings ?? []),
        updated_at: new Date().toISOString(),
      },
    });
    setSaveMessage(status === 'published' ? '발행됨' : '초안 저장됨');
    window.setTimeout(() => setSaveMessage(''), 1600);
  };

  const updateItemTitle = (id: string, title: string) => {
    setItems((value) => value.map((item) => (item.id === id ? { ...item, title } : item)));
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      {renderHeader({ onSave: () => save(), onPublish: () => save('published') })}
      {saveMessage ? <p className="mt-3 text-sm font-semibold text-blue-700">{saveMessage}</p> : null}

      <section className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-sm font-semibold text-blue-700">복사 완료</p>
        <h1 className="mt-1 text-3xl font-semibold text-gray-950">내 Flow로 가져왔습니다</h1>
        <p className="mt-2 text-gray-700">{getEditorIntro(model.type)}</p>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-gray-950">내 일정 설정</h2>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-gray-700">{model.type === 'dday_timeline' ? '목표일' : '시작일'}</span>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              type="date"
              value={anchorDate}
              onChange={(event) => setAnchorDate(event.target.value)}
            />
          </label>
          {model.type === 'calendar_routine' || model.type === 'daily_check' ? (
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-gray-700">{model.type === 'daily_check' ? '적용 요일' : '반복 요일'}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekdays.map((day) => (
                  <label key={day} className="rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <input
                      className="mr-1"
                      type="checkbox"
                      checked={selectedWeekdays.includes(day)}
                      onChange={(event) => {
                        setSelectedWeekdays((value) =>
                          event.target.checked ? [...value, day] : value.filter((item) => item !== day),
                        );
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <label key={item.id} className="block">
                <span className="text-sm font-semibold text-gray-700">실행 내용</span>
                <input
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  value={item.title}
                  onChange={(event) => updateItemTitle(item.id, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="sr-only">내 도구 미리보기</h2>
          <ToolSurfacePreview model={model} onExport={() => save()} onCopyToEditableDraft={() => save()} />
        </section>
      </div>

      <details
        className="mt-6 rounded-xl border border-gray-200 bg-white p-5"
        open={showAdvanced}
        onToggle={(event) => setShowAdvanced(event.currentTarget.open)}
      >
        <summary className="cursor-pointer">
          <h2 className="inline text-xl font-semibold text-gray-950">원문 고급 편집</h2>
        </summary>
        <textarea
          className="mt-4 min-h-72 w-full rounded-md border border-gray-300 p-3 font-mono text-sm"
          defaultValue={bundle.flow.raw_text ?? serializeTextFlow(bundle.sections, items, bundle.itemDetails ?? [], bundle.warnings ?? [])}
        />
      </details>
    </main>
  );
}

function getEditorIntro(type: FlowSurfaceType): string {
  if (type === 'calendar_routine') return '이 Flow는 캘린더에 들어가는 반복 루틴입니다. 시작일과 요일만 바꾸면 됩니다.';
  if (type === 'daily_check') return '이 Flow는 매일 적용하는 체크표입니다. 시작일과 적용 요일만 바꾸면 됩니다.';
  if (type === 'dday_timeline') return '이 Flow는 D-Day 표로 관리하는 일정입니다. 목표일을 바꾸면 됩니다.';
  if (type === 'sheet_tracker') return '이 Flow는 엑셀 실행표로 관리하는 기록입니다. 시작일과 항목명을 바꾸면 됩니다.';
  return '이 Flow는 한 번 실행할 메모와 체크 항목입니다. 실행일과 완료 기록만 바꾸면 됩니다.';
}
