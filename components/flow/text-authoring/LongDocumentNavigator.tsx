"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";

import {
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
} from "@/components/flow/flow-ui";

import type { AuthoringSourceLocatorView } from "./authoring-ui-types";

const KIND_LABEL: Record<AuthoringSourceLocatorView["kind"], string> = {
  heading: "제목",
  prose: "문장",
  blockquote: "인용문",
  code: "코드",
  html: "HTML",
  comment: "주석",
  table: "표",
  issue: "확인할 내용",
};

const STATUS_LABEL: Record<AuthoringSourceLocatorView["status"], string> = {
  safe: "읽기 완료",
  preserved: "원문 보존",
  "possible-loss": "일부 확인 필요",
  blocked: "결과 제한",
};

export function LongDocumentNavigator({
  entries,
  initialLocatorId,
  onLocate,
}: {
  entries: AuthoringSourceLocatorView[];
  initialLocatorId?: string;
  onLocate: (entry: AuthoringSourceLocatorView) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedLocatorId, setSelectedLocatorId] = useState(() =>
    entries.some((entry) => entry.locatorId === initialLocatorId)
      ? (initialLocatorId ?? "")
      : (entries[0]?.locatorId ?? ""),
  );
  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    if (!normalized) return entries;
    return entries.filter((entry) =>
      `${entry.label} ${entry.detail} ${KIND_LABEL[entry.kind]}`
        .toLocaleLowerCase("ko-KR")
        .includes(normalized),
    );
  }, [entries, query]);

  useEffect(() => {
    if (
      initialLocatorId &&
      entries.some((entry) => entry.locatorId === initialLocatorId)
    ) {
      setSelectedLocatorId(initialLocatorId);
    }
  }, [entries, initialLocatorId]);

  useEffect(() => {
    if (filteredEntries.some((entry) => entry.locatorId === selectedLocatorId))
      return;
    setSelectedLocatorId(filteredEntries[0]?.locatorId ?? "");
  }, [filteredEntries, selectedLocatorId]);

  const selected = filteredEntries.find(
    (entry) => entry.locatorId === selectedLocatorId,
  );

  return (
    <div data-testid="ta-authoring-document-navigator" className="space-y-4">
      <label className="block">
        <span className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
          제목이나 원문 내용 찾기
        </span>
        <input
          data-testid="ta-authoring-document-search"
          className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
          type="search"
          value={query}
          placeholder="예: 준비물, 코드, 표"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {filteredEntries.length > 0 ? (
        <fieldset>
          <legend className="sr-only">이동할 원문 위치</legend>
          <div className="divide-y divide-[var(--flowme-border)] rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)]">
            {filteredEntries.map((entry) => {
              const selectedEntry = entry.locatorId === selectedLocatorId;
              return (
                <label
                  key={entry.locatorId}
                  data-testid="ta-authoring-document-entry"
                  data-locator-id={entry.locatorId}
                  data-block-kind={entry.kind}
                  data-source-start-line={entry.startLine}
                  data-source-end-line={entry.endLine}
                  className={`flex min-h-14 cursor-pointer items-start gap-3 px-3 py-3 transition focus-within:ring-2 focus-within:ring-inset focus-within:ring-[var(--flowme-focus)] ${
                    selectedEntry
                      ? "bg-[var(--flowme-positive-soft)]"
                      : "hover:bg-[var(--flowme-surface-subtle)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="text-authoring-document-location"
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--flowme-positive)]"
                    value={entry.locatorId}
                    checked={selectedEntry}
                    onChange={() => setSelectedLocatorId(entry.locatorId)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm font-semibold text-[var(--flowme-text)]">
                      <span>{entry.label}</span>
                      <span className="text-[11px] font-normal text-[var(--flowme-text-tertiary)]">
                        {entry.startLine === entry.endLine
                          ? `원문 ${entry.startLine}행`
                          : `원문 ${entry.startLine}~${entry.endLine}행`}
                      </span>
                    </span>
                    <span className="mt-1 block break-words text-xs leading-5 text-[var(--flowme-text-secondary)]">
                      {KIND_LABEL[entry.kind]} · {STATUS_LABEL[entry.status]}
                      {entry.detail ? ` · ${entry.detail}` : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <p
          role="status"
          className="rounded-[var(--flowme-radius-control)] bg-[var(--flowme-surface-subtle)] px-3 py-5 text-center text-sm text-[var(--flowme-text-secondary)]"
        >
          찾는 내용이 없습니다.
        </p>
      )}

      <button
        type="button"
        data-testid="ta-authoring-document-locate"
        className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
        disabled={!selected}
        onClick={() => selected && onLocate(selected)}
      >
        원문 위치에서 보기
      </button>
    </div>
  );
}
