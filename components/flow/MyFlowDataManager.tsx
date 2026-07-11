'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  buildFlowMeLocalBackup,
  FlowMeLocalBackupError,
  getFlowMeLocalBackupFilename,
  parseFlowMeLocalBackup,
  restoreFlowMeLocalBackup,
  serializeFlowMeLocalBackup,
  type FlowMeLocalBackup,
} from '@/lib/flow/local-data-backup';

const RESTORED_SESSION_KEY = 'flowme:local-backup:restored';

function downloadBackupFile(backup: FlowMeLocalBackup): void {
  const blob = new Blob([serializeFlowMeLocalBackup(backup)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = getFlowMeLocalBackupFilename(backup.exportedAt);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getBackupErrorMessage(error: unknown): string {
  if (!(error instanceof FlowMeLocalBackupError)) return '백업 파일을 확인하지 못했습니다.';
  switch (error.code) {
    case 'too_large':
      return '백업 파일이 너무 큽니다. 8MB 이하 파일을 선택하세요.';
    case 'unsupported_version':
      return '이 버전의 백업 파일은 아직 불러올 수 없습니다.';
    case 'restore_failed':
      return '기록을 불러오지 못했습니다. 기존 기록은 가능한 범위에서 되돌렸습니다.';
    default:
      return 'FlowMe에서 만든 백업 파일인지 확인하세요.';
  }
}

function formatBackupDate(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function MyFlowDataManager() {
  const [open, setOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<FlowMeLocalBackup | null>(null);
  const [feedback, setFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (window.sessionStorage.getItem(RESTORED_SESSION_KEY) !== 'true') return;
    window.sessionStorage.removeItem(RESTORED_SESSION_KEY);
    setFeedback('백업 기록을 불러왔습니다.');
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function closeDialog(): void {
    setOpen(false);
    setImportPreview(null);
  }

  function downloadBackup(): void {
    const backup = buildFlowMeLocalBackup(window.localStorage);
    downloadBackupFile(backup);
    setFeedback('백업 파일을 만들었습니다.');
  }

  async function inspectBackupFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFeedback('');
    try {
      const backup = parseFlowMeLocalBackup(await file.text());
      setImportPreview(backup);
    } catch (error) {
      setImportPreview(null);
      setFeedback(getBackupErrorMessage(error));
    }
  }

  function restoreBackup(): void {
    if (!importPreview) return;
    try {
      restoreFlowMeLocalBackup(window.localStorage, importPreview);
      window.sessionStorage.setItem(RESTORED_SESSION_KEY, 'true');
      window.location.reload();
    } catch (error) {
      setFeedback(getBackupErrorMessage(error));
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {feedback && !open ? (
        <span data-testid="my-flow-data-manager-feedback" className="text-xs font-semibold text-emerald-700" aria-live="polite">
          {feedback}
        </span>
      ) : null}
      <button
        type="button"
        className="min-h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:border-blue-300 hover:text-blue-700"
        data-testid="my-flow-data-manager-open"
        onClick={() => {
          setFeedback('');
          setOpen(true);
        }}
      >
        데이터 관리
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/40 px-3 py-4 sm:grid sm:place-items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="my-flow-data-manager-title"
          data-testid="my-flow-data-manager-dialog"
        >
          <button className="absolute inset-0 h-full w-full cursor-default" type="button" aria-label="데이터 관리 닫기" onClick={closeDialog} />
          <section className="absolute inset-x-3 bottom-3 max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-lg bg-white p-4 shadow-2xl sm:relative sm:inset-auto sm:w-full sm:max-w-lg sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-blue-700">이 브라우저의 기록</p>
                <h2 id="my-flow-data-manager-title" className="mt-1 text-xl font-semibold text-slate-950">데이터 관리</h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                onClick={closeDialog}
              >
                닫기
              </button>
            </div>

            <p className="mt-4 break-keep text-sm leading-6 text-slate-700">
              저장한 Flow, 완료 기록, 개인 수정은 현재 브라우저에만 보관됩니다. 기기를 바꾸거나 브라우저 데이터를 지우기 전에 백업 파일을 받아두세요.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">기기 사이에서 자동으로 맞춰지지는 않습니다.</p>

            <div className="mt-5 grid gap-3 border-y border-slate-200 py-4 sm:grid-cols-2">
              <button
                type="button"
                className="min-h-11 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                data-testid="my-flow-backup-download"
                onClick={downloadBackup}
              >
                백업 파일 받기
              </button>
              <button
                type="button"
                className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700"
                data-testid="my-flow-backup-file-choose"
                onClick={() => fileInputRef.current?.click()}
              >
                백업 파일 불러오기
              </button>
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="application/json,.json"
                data-testid="my-flow-backup-file-input"
                onChange={inspectBackupFile}
              />
            </div>

            {importPreview ? (
              <section className="mt-4" data-testid="my-flow-backup-import-preview">
                <p className="text-sm font-semibold text-slate-950">불러올 백업 확인</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">백업 날짜</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{formatBackupDate(importPreview.exportedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">저장 기록</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{importPreview.summary.savedFlowRecordCount}개</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">완료 실행</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{importPreview.summary.completedRunCount}개</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">요청 기록</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{importPreview.summary.requestRecordCount}개</dd>
                  </div>
                </dl>
                <p className="mt-4 break-keep text-xs leading-5 text-amber-800">
                  불러오면 현재 브라우저의 FlowMe 기록을 이 백업 시점으로 바꿉니다. 현재 기록이 필요하면 먼저 백업하세요.
                </p>
                <button
                  type="button"
                  className="mt-3 min-h-11 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  data-testid="my-flow-backup-restore"
                  onClick={restoreBackup}
                >
                  이 백업으로 바꾸기
                </button>
              </section>
            ) : null}

            <p className="mt-4 break-keep text-xs leading-5 text-slate-500">
              백업 파일에는 개인 메모와 원문 링크가 포함될 수 있습니다. 다른 사람에게 공개하지 말고 개인적으로 보관하세요.
            </p>
            {feedback && open ? (
              <p className="mt-3 text-sm font-semibold text-rose-700" data-testid="my-flow-data-manager-dialog-feedback" aria-live="polite">
                {feedback}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
