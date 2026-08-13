"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  FLOW_UI_DISCLOSURE_CLASS,
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from "@/components/flow/flow-ui";

import type {
  AuthoringItemPatch,
  AuthoringItemView,
} from "./authoring-ui-types";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const INITIAL_PATCH: AuthoringItemPatch = {
  title: "",
  detail: "",
  completion: "",
  date: "",
  relativeDate: "",
  time: "",
  timezone: "",
  place: "",
  duration: "",
  repeat: "",
  repeatEnd: "",
  condition: "",
  resource: "",
  source: "",
  guide: "",
  caution: "",
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
    repeatEnd: item.repeatEnd,
    condition: item.condition,
    resource: item.resource,
    source: item.source,
    guide: item.guide,
    caution: item.caution,
  };
}

function isStrictIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const INSPECTOR_PROPERTY_LABELS: Record<
  Exclude<keyof AuthoringItemPatch, "title">,
  string[]
> = {
  detail: ["설명"],
  completion: ["완료 기준"],
  date: ["날짜"],
  relativeDate: ["상대 날짜"],
  time: ["시간"],
  timezone: ["시간대"],
  place: ["장소"],
  duration: ["소요 시간", "소요시간"],
  repeat: ["반복"],
  repeatEnd: ["반복 종료"],
  condition: ["실행 조건", "조건"],
  resource: ["자료"],
  source: ["출처"],
  guide: ["안내"],
  caution: ["주의"],
};

function changedPatchKeys(
  item: AuthoringItemView,
  patch: AuthoringItemPatch,
): Array<keyof AuthoringItemPatch> {
  const original = patchFromItem(item);
  return (Object.keys(original) as Array<keyof AuthoringItemPatch>).filter(
    (key) => original[key] !== patch[key],
  );
}

function propertyLineCount(rawText: string, labels: string[]): number {
  return rawText
    .split(/\r?\n/u)
    .filter((line) => labels.some((label) => line.startsWith(`  - ${label}:`)))
    .length;
}

export function inspectorUnsafeChangeReason(
  item: AuthoringItemView,
  patch: AuthoringItemPatch,
): string | undefined {
  if (item.role !== "item") {
    return "root 할 일이 아닌 행은 우측에서 수정하지 않습니다.";
  }
  if (/^\s*\|.*\|\s*$/mu.test(item.rawText) || item.rawText.includes("\t")) {
    return "표와 탭으로 나눈 원문은 셀 일부만 수정하지 않습니다.";
  }

  const changedKeys = changedPatchKeys(item, patch);
  if (changedKeys.length === 0) return undefined;
  if (changedKeys.includes("title")) {
    if (!patch.title.trim()) return "제목은 비워 둘 수 없습니다.";
    const rootTitleCount = item.rawText
      .split(/\r?\n/u)
      .filter((line) => /^- \[[ xX]\] /u.test(line)).length;
    if (rootTitleCount !== 1) {
      return "원문에서 유일한 root 할 일 제목을 찾을 수 없습니다.";
    }
  }

  for (const key of changedKeys) {
    if (key === "title") continue;
    const lineCount = propertyLineCount(
      item.rawText,
      INSPECTOR_PROPERTY_LABELS[key],
    );
    if (lineCount !== 1) {
      return `‘${INSPECTOR_PROPERTY_LABELS[key][0]}’은 원문에 한 번 선언된 경우에만 우측에서 수정할 수 있습니다.`;
    }
  }

  for (const key of ["resource", "source"] as const) {
    if (!changedKeys.includes(key)) continue;
    const urls = patch[key].match(/https?:\/\/[^\s)]+/gu) ?? [];
    if (urls.length !== 1) {
      return `${key === "resource" ? "자료" : "출처"}는 원문 한 줄의 HTTP(S) 링크 한 개만 우측에서 수정할 수 있습니다.`;
    }
  }
  return undefined;
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
  onEditSource,
  onClose,
  productMode = false,
}: {
  item: AuthoringItemView | null;
  open: boolean;
  onApply: (patch: AuthoringItemPatch) => boolean;
  onEditSource: () => void;
  onClose: () => void;
  productMode?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [advanced, setAdvanced] = useState(false);
  const [patch, setPatch] = useState<AuthoringItemPatch>(INITIAL_PATCH);
  const [applyError, setApplyError] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setPatch(patchFromItem(item));
    setAdvanced(false);
    setApplyError("");
    window.requestAnimationFrame(() => titleInputRef.current?.focus());
  }, [item, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      const panel = panelRef.current;
      if (event.key !== "Tab" || !panel) return;
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || !item) return null;

  const invalidDateInput =
    patch.date.trim() && !isStrictIsoDate(patch.date.trim())
      ? patch.date.trim()
      : "";
  const unsafeChangeReason = productMode
    ? inspectorUnsafeChangeReason(item, patch)
    : undefined;

  const update = <Key extends keyof AuthoringItemPatch>(
    key: Key,
    value: AuthoringItemPatch[Key],
  ) => {
    setApplyError("");
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
            if (unsafeChangeReason) {
              setApplyError(unsafeChangeReason);
              return;
            }
            if (!onApply(patch)) {
              setApplyError(
                productMode
                  ? "최신 원문에서 이 항목의 유일한 수정 위치를 확인할 수 없습니다."
                  : "표·중복 속성처럼 원문 위치가 모호한 항목은 일부만 바꾸지 않습니다.",
              );
            }
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <Field label="제목">
              <input
                ref={titleInputRef}
                className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                value={patch.title}
                maxLength={180}
                onChange={(event) => update("title", event.target.value)}
              />
            </Field>
            <Field label="설명">
              <textarea
                className={`${FLOW_UI_INPUT_CLASS} mt-1 min-h-24 w-full resize-y font-normal leading-6`}
                value={patch.detail}
                onChange={(event) => update("detail", event.target.value)}
              />
            </Field>
            <Field label="완료 기준">
              <textarea
                className={`${FLOW_UI_INPUT_CLASS} mt-1 min-h-20 w-full resize-y font-normal leading-6`}
                value={patch.completion}
                placeholder="무엇을 남기면 이 항목이 끝났는지 적습니다."
                onChange={(event) => update("completion", event.target.value)}
              />
            </Field>

            <button
              type="button"
              className={FLOW_UI_DISCLOSURE_CLASS}
              aria-expanded={advanced}
              onClick={() => setAdvanced((current) => !current)}
            >
              일정과 속성
              <span aria-hidden="true">{advanced ? "−" : "+"}</span>
            </button>

            {advanced ? (
              <div className="space-y-4 border-t border-[var(--flowme-border)] pt-4">
                <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">
                  적용하면 이 항목의 표준 문법 줄과 우측 결과가 함께 바뀝니다.
                  처음 붙여 넣은 원문은 별도로 보존됩니다.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="절대 날짜">
                    <input
                      type="date"
                      data-testid="ta-authoring-inspector-date"
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={invalidDateInput ? "" : patch.date}
                      onChange={(event) => {
                        update("date", event.target.value);
                        if (event.target.value) update("relativeDate", "");
                      }}
                    />
                    {invalidDateInput ? (
                      <span
                        data-testid="ta-authoring-inspector-invalid-date"
                        className="mt-1 block text-[11px] leading-4 text-[var(--flowme-warning-strong)]"
                      >
                        현재 입력: {invalidDateInput} · 형식: YYYY-MM-DD
                      </span>
                    ) : null}
                  </Field>
                  <Field label="상대 날짜">
                    <input
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={patch.relativeDate}
                      placeholder="예: D-3"
                      onChange={(event) => {
                        update("relativeDate", event.target.value);
                        if (event.target.value) update("date", "");
                      }}
                    />
                  </Field>
                  <Field label="시간">
                    <input
                      type="time"
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={patch.time}
                      onChange={(event) => update("time", event.target.value)}
                    />
                  </Field>
                  <Field label="시간대">
                    <input
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={patch.timezone}
                      placeholder="Asia/Seoul"
                      onChange={(event) =>
                        update("timezone", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="장소">
                    <input
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={patch.place}
                      placeholder="예: 김포공항"
                      onChange={(event) => update("place", event.target.value)}
                    />
                  </Field>
                  <Field label="소요 시간">
                    <input
                      className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                      value={patch.duration}
                      placeholder="예: 20분"
                      onChange={(event) =>
                        update("duration", event.target.value)
                      }
                    />
                  </Field>
                </div>
                <Field label="반복">
                  <input
                    className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                    value={patch.repeat}
                    placeholder="예: 매주 월요일"
                    onChange={(event) => update("repeat", event.target.value)}
                  />
                  <span className="mt-1 block text-[11px] text-[var(--flowme-text-tertiary)]">
                    매일·N일마다, 매주·N주마다, 매월·N개월마다를 지원합니다.
                    결과에서 계산된 회차를 미리 볼 수 있습니다.
                  </span>
                </Field>
                <Field label="반복 종료">
                  <input
                    className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                    value={patch.repeatEnd}
                    placeholder="12회 또는 2026-12-31"
                    onChange={(event) =>
                      update("repeatEnd", event.target.value)
                    }
                  />
                </Field>
                <Field label="실행 조건">
                  <input
                    className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                    value={patch.condition}
                    placeholder="예: 비가 오지 않을 때"
                    onChange={(event) =>
                      update("condition", event.target.value)
                    }
                  />
                </Field>
                <Field label="자료 URL">
                  <input
                    className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                    value={patch.resource}
                    placeholder="[이름](https://…) 또는 https://…"
                    onChange={(event) => update("resource", event.target.value)}
                  />
                </Field>
                <Field label="출처 URL">
                  <input
                    className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                    value={patch.source}
                    placeholder="[출처 이름](https://…) 또는 https://…"
                    onChange={(event) => update("source", event.target.value)}
                  />
                </Field>
                <Field label="안내">
                  <textarea
                    className={`${FLOW_UI_INPUT_CLASS} mt-1 min-h-20 w-full resize-y font-normal leading-6`}
                    value={patch.guide}
                    onChange={(event) => update("guide", event.target.value)}
                  />
                </Field>
                <Field label="주의">
                  <textarea
                    className={`${FLOW_UI_INPUT_CLASS} mt-1 min-h-20 w-full resize-y font-normal leading-6`}
                    value={patch.caution}
                    onChange={(event) => update("caution", event.target.value)}
                  />
                </Field>

                <section className="border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3">
                  <h3 className="text-xs font-semibold">원문과 출처</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-5">
                    {item.rawText || item.title}
                  </p>
                  <p className="mt-2 break-all text-[11px] leading-5 text-[var(--flowme-text-secondary)]">
                    {item.source || "별도 출처 URL 없음"}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-[var(--flowme-text-tertiary)]">
                    적용 뒤 좌측 작업 원문에서도 같은 문법 줄을 확인할 수
                    있습니다.
                  </p>
                </section>
              </div>
            ) : null}
          </div>

          {applyError ? (
            <div
              role="alert"
              data-testid="ta-authoring-inspector-sync-error"
              className="border-t border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-4 py-3 text-xs leading-5 text-[var(--flowme-warning-strong)]"
            >
              <p>
                {productMode
                  ? `${applyError} ${item.sourceLineLabel}을 직접 수정하세요. 결과는 바뀌지 않았습니다.`
                  : applyError}
              </p>
              <button
                type="button"
                data-testid="ta-authoring-inspector-edit-source"
                className={`${FLOW_UI_SECONDARY_ACTION_CLASS} mt-2`}
                onClick={onEditSource}
              >
                {productMode
                  ? `${item.sourceLineLabel} 원문에서 수정`
                  : "왼쪽 작업 원문에서 수정"}
              </button>
            </div>
          ) : null}

          <footer className="border-t border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            {productMode && applyError ? (
              <button
                type="button"
                className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
                onClick={onEditSource}
              >
                원문에서 수정
              </button>
            ) : (
              <button
                type="submit"
                className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
              >
                원문과 결과에 적용
              </button>
            )}
          </footer>
        </form>
      </section>
    </div>
  );
}
