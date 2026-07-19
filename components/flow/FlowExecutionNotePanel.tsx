'use client';

import type { MyFlowExecutionNoteKind } from '@/lib/flow/execution-notes';
import {
  FLOW_UI_COMPACT_ACTION_CLASS,
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_INSET_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
  FLOW_UI_SEGMENTED_CLASS,
  FLOW_UI_SEGMENT_ACTIVE_CLASS,
  FLOW_UI_SEGMENT_IDLE_CLASS,
} from './flow-ui';

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
      className={`p-3 ${FLOW_UI_INSET_CLASS}`}
      aria-label={`${title} 실행 메모`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1B1A17]">실행 메모</p>
          <p className="mt-0.5 truncate text-xs text-[#6E6B64]">{title}</p>
        </div>
        <button
          type="button"
          className={FLOW_UI_COMPACT_ACTION_CLASS}
          aria-label={`${title} 실행 메모 닫기`}
          onClick={onClose}
        >
          닫기
        </button>
      </div>

      {allowCorrection ? (
        <div className={`mt-3 grid-cols-2 ${FLOW_UI_SEGMENTED_CLASS}`} role="group" aria-label="메모 종류">
          <button
            type="button"
            data-testid="my-flow-inline-note-private-mode"
            aria-pressed={isPrivate}
            className={`min-h-10 rounded-md px-2 py-1.5 text-xs font-semibold ${
              isPrivate ? FLOW_UI_SEGMENT_ACTIVE_CLASS : FLOW_UI_SEGMENT_IDLE_CLASS
            }`}
            onClick={() => onModeChange('private')}
          >
            내 메모
          </button>
          <button
            type="button"
            data-testid="my-flow-inline-note-correction-mode"
            aria-pressed={!isPrivate}
            className={`min-h-10 rounded-md px-2 py-1.5 text-xs font-semibold ${
              !isPrivate ? FLOW_UI_SEGMENT_ACTIVE_CLASS : FLOW_UI_SEGMENT_IDLE_CLASS
            }`}
            onClick={() => onModeChange('source_correction')}
          >
            원본에 알릴 점
          </button>
        </div>
      ) : null}

      <label className="mt-3 block text-xs font-semibold text-[#5C5952]">
        {isPrivate ? '해보며 알게 된 점' : '고치거나 보완할 내용'}
        <textarea
          data-testid={isPrivate ? 'my-flow-inline-note-private-input' : 'my-flow-inline-note-correction-input'}
          className={`mt-1 min-h-20 w-full resize-y font-normal leading-6 ${FLOW_UI_INPUT_CLASS}`}
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
          className={FLOW_UI_PRIMARY_ACTION_CLASS}
          onClick={onSave}
        >
          저장
        </button>
        {hasSavedNote ? (
          <button
            type="button"
            data-testid="my-flow-inline-note-remove"
            className={`${FLOW_UI_SECONDARY_ACTION_CLASS} hover:border-rose-200 hover:text-rose-700`}
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
