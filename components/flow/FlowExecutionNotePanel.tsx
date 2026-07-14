'use client';

import type { MyFlowExecutionNoteKind } from '@/lib/flow/execution-notes';

type FlowExecutionNotePanelProps = {
  title: string;
  mode: MyFlowExecutionNoteKind;
  privateNote: string;
  correctionNote: string;
  hasSavedNote: boolean;
  allowCorrection: boolean;
  status: string;
  onModeChange: (mode: MyFlowExecutionNoteKind) => void;
  onPrivateNoteChange: (note: string) => void;
  onCorrectionNoteChange: (note: string) => void;
  onSave: () => void;
  onRemove: () => void;
  onClose: () => void;
};

export function FlowExecutionNotePanel({
  title,
  mode,
  privateNote,
  correctionNote,
  hasSavedNote,
  allowCorrection,
  status,
  onModeChange,
  onPrivateNoteChange,
  onCorrectionNoteChange,
  onSave,
  onRemove,
  onClose,
}: FlowExecutionNotePanelProps) {
  const isPrivate = mode === 'private' || !allowCorrection;
  const currentNote = isPrivate ? privateNote : correctionNote;
  const setCurrentNote = isPrivate ? onPrivateNoteChange : onCorrectionNoteChange;

  return (
    <section
      data-testid="my-flow-inline-note-panel"
      className="rounded-md border border-slate-200 bg-slate-50 p-3"
      aria-label={`${title} 실행 메모`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">실행 메모</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{title}</p>
        </div>
        <button
          type="button"
          className="min-h-8 shrink-0 rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-white"
          aria-label={`${title} 실행 메모 닫기`}
          onClick={onClose}
        >
          닫기
        </button>
      </div>

      {allowCorrection ? (
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-slate-200/70 p-1" role="group" aria-label="메모 종류">
          <button
            type="button"
            data-testid="my-flow-inline-note-private-mode"
            aria-pressed={isPrivate}
            className={`min-h-9 rounded px-2 py-1.5 text-xs font-semibold ${
              isPrivate ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
            }`}
            onClick={() => onModeChange('private')}
          >
            내 메모
          </button>
          <button
            type="button"
            data-testid="my-flow-inline-note-correction-mode"
            aria-pressed={!isPrivate}
            className={`min-h-9 rounded px-2 py-1.5 text-xs font-semibold ${
              !isPrivate ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
            }`}
            onClick={() => onModeChange('source_correction')}
          >
            원본에 알릴 점
          </button>
        </div>
      ) : null}

      <label className="mt-3 block text-xs font-semibold text-slate-700">
        {isPrivate ? '해보며 알게 된 점' : '고치거나 보완할 내용'}
        <textarea
          data-testid={isPrivate ? 'my-flow-inline-note-private-input' : 'my-flow-inline-note-correction-input'}
          className="mt-1 min-h-20 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal leading-6 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={currentNote}
          maxLength={1000}
          placeholder={isPrivate ? '다음에 기억할 점을 남겨보세요.' : '빠진 내용이나 달라진 점을 적어보세요.'}
          onChange={(event) => setCurrentNote(event.target.value)}
        />
      </label>
      {!isPrivate ? (
        <p className="mt-1 text-xs leading-5 text-amber-700">이 메모는 아직 원본 작성자에게 전송되지 않아요.</p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          data-testid="my-flow-inline-note-save"
          disabled={!currentNote.trim()}
          className="min-h-9 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          onClick={onSave}
        >
          저장
        </button>
        {hasSavedNote ? (
          <button
            type="button"
            data-testid="my-flow-inline-note-remove"
            className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-rose-200 hover:text-rose-700"
            onClick={onRemove}
          >
            지우기
          </button>
        ) : null}
        {status ? (
          <p data-testid="my-flow-inline-note-status" className="text-xs font-semibold text-emerald-700" role="status">
            {status}
          </p>
        ) : null}
      </div>
    </section>
  );
}
