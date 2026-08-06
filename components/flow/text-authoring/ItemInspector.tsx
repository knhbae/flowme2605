'use client';

import { useEffect, useId, useRef, useState } from 'react';

import {
  FLOW_UI_DISCLOSURE_CLASS,
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from '@/components/flow/flow-ui';

import type {
  AuthoringItemPatch,
  AuthoringItemView,
} from './authoring-ui-types';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const INITIAL_PATCH: AuthoringItemPatch = {
  title: '',
  detail: '',
  completion: '',
  date: '',
  relativeDate: '',
  time: '',
  timezone: '',
  place: '',
  duration: '',
  repeat: '',
  condition: '',
  resource: '',
};

function patchFromItem(item: AuthoringItemView): AuthoringItemPatch {
  return {
    title: item.title,
    detail: item.detail,
    completion: item.completion,
    date: item.date,
    relativeDate: item.relativeDate,
    time: item.time,
    timezone: item.timezone,
    place: item.place,
    duration: item.duration,
    repeat: item.repeat,
    condition: item.condition,
    resource: item.resource,
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function ItemInspector({
  item,
  open,
  onApply,
  onRestore,
  onClose,
}: {
  item: AuthoringItemView | null;
  open: boolean;
  onApply: (patch: AuthoringItemPatch) => void;
  onRestore: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [advanced, setAdvanced] = useState(false);
  const [patch, setPatch] = useState<AuthoringItemPatch>(INITIAL_PATCH);

  useEffect(() => {
    if (!open || !item) return;
    setPatch(patchFromItem(item));
    setAdvanced(false);
    window.requestAnimationFrame(() => titleInputRef.current?.focus());
  }, [item, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      const panel = panelRef.current;
      if (event.key !== 'Tab' || !panel) return;
      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((control) => control.offsetParent !== null);
      if (controls.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open || !item) return null;

  const update = <Key extends keyof AuthoringItemPatch>(
    key: Key,
    value: AuthoringItemPatch[Key],
  ) => {
    setPatch((current) => ({ ...current, [key]: value }));
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/35 md:flex md:justify-end"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="ta-authoring-inspector"
        data-layout="mobile-full-height tablet-drawer"
        tabIndex={-1}
        className="ta-inspector flex h-[100dvh] w-full flex-col bg-[var(--flowme-surface)] md:max-w-md md:border-l md:border-[var(--flowme-border)]"
      >
        <header className="flex items-start gap-3 border-b border-[var(--flowme-border)] px-4 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold">
              항목 수정
            </h2>
            <p className="mt-1 text-xs text-[var(--flowme-text-secondary)]">
              {item.sourceLineLabel}에서 만든 항목
            </p>
          </div>
          <button
            type="button"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onClose}
          >
            닫기
          </button>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onApply(patch);
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <Field label="제목">
              <input
                ref={titleInputRef}
                className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                value={patch.title}
                maxLength={180}
                onChange={(event) => update('title', event.target.value)}
              />
            </Field>
            <Field label="설명">
              <textarea
                className={`${FLOW_UI_INPUT_CLASS} mt-1 min-h-24 w-full resize-y font-normal leading-6`}
                value={patch.detail}
                onChange={(event) => update('detail', event.target.value)}
              />
            </Field>
            <Field label="완료 기준">
              <textarea
                className={`${FLOW_UI_INPUT_CLASS} mt-1 min-h-20 w-full resize-y font-normal leading-6`}
                value={patch.completion}
                placeholder="무엇을 남기면 이 항목이 끝났는지 적습니다."
                onChange={(event) => update('completion', event.target.value)}
              />
            </Field>

            <button
              type="button"
              className={FLOW_UI_DISCLOSURE_CLASS}
              aria-expanded={advanced}
              onClick={() => setAdvanced((current) => !current)}
            >
              일정과 속성
              <span aria-hidden="true">{advanced ? '−' : '+'}</span>
            </button>

            {advanced ? (
              <div className="space-y-4 border-t border-[var(--flowme-border)] pt-4">
                <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">
                  원문에서 읽은 값은 그대로 두고, 지금 입력한 값은 현재 초안의 수정
                  기록에 따로 남깁니다.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="절대 날짜">
                    <input
                      type="date"
                      data-testid="ta-authoring-inspector-date"
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={patch.date}
                      onChange={(event) => update('date', event.target.value)}
                    />
                  </Field>
                  <Field label="상대 날짜">
                    <input
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={patch.relativeDate}
                      placeholder="예: D-3"
                      onChange={(event) => update('relativeDate', event.target.value)}
                    />
                  </Field>
                  <Field label="시간">
                    <input
                      type="time"
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={patch.time}
                      onChange={(event) => update('time', event.target.value)}
                    />
                  </Field>
                  <Field label="시간대">
                    <input
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={patch.timezone}
                      placeholder="Asia/Seoul"
                      onChange={(event) => update('timezone', event.target.value)}
                    />
                  </Field>
                  <Field label="장소">
                    <input
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={patch.place}
                      placeholder="예: 김포공항"
                      onChange={(event) => update('place', event.target.value)}
                    />
                  </Field>
                  <Field label="소요 시간">
                    <input
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={patch.duration}
                      placeholder="예: 20분"
                      onChange={(event) => update('duration', event.target.value)}
                    />
                  </Field>
                </div>
                <Field label="반복">
                  <input
                    className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                    value={patch.repeat}
                    placeholder="예: 매주 월요일"
                    onChange={(event) => update('repeat', event.target.value)}
                  />
                  <span className="mt-1 block text-[11px] text-[var(--flowme-text-tertiary)]">
                    저작 화면은 반복 정의만 편집합니다. 회차별 완료는 실행 화면에
                    남습니다.
                  </span>
                </Field>
                <Field label="조건">
                  <input
                    className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                    value={patch.condition}
                    placeholder="예: 비가 오지 않을 때"
                    onChange={(event) => update('condition', event.target.value)}
                  />
                </Field>
                <Field label="자료 URL 또는 이름">
                  <input
                    className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                    value={patch.resource}
                    placeholder="https:// 또는 자료 이름"
                    onChange={(event) => update('resource', event.target.value)}
                  />
                </Field>

                <section className="border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3">
                  <h3 className="text-xs font-semibold">원문과 출처</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-5">
                    {item.rawText || item.title}
                  </p>
                  <p className="mt-2 break-all text-[11px] leading-5 text-[var(--flowme-text-secondary)]">
                    {item.source || '별도 source URL 없음'}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-[var(--flowme-text-tertiary)]">
                    원문은 이 편집기에서 직접 바꾸지 않습니다.
                  </p>
                </section>
              </div>
            ) : null}
          </div>

          <footer className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              className={FLOW_UI_SECONDARY_ACTION_CLASS}
              onClick={onRestore}
            >
              원래 해석으로 복구
            </button>
            <button type="submit" className={FLOW_UI_PRIMARY_ACTION_CLASS}>
              변경 적용
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
