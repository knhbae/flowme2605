"use client";

import type { Ref } from "react";

import { FLOW_UI_INPUT_CLASS } from "@/components/flow/flow-ui";

import type { AuthoringOwnership } from "./authoring-ui-types";
import { InlineHelp } from "./InlineHelp";

const OWNERSHIP_OPTIONS: Array<{
  value: AuthoringOwnership;
  label: string;
}> = [
  { value: "creator", label: "제작자 초안" },
  { value: "personal", label: "개인 초안" },
  { value: "suggestion", label: "수정 제안" },
];

function ownershipLabel(ownership: AuthoringOwnership): string {
  return (
    OWNERSHIP_OPTIONS.find((option) => option.value === ownership)?.label ??
    "저장 설정"
  );
}

function SyntaxGuideContent() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p data-testid="ta-authoring-syntax-key">
          <code>##</code> 단계 · <code>- [ ]</code> 항목 · 두 칸 들여쓴{" "}
          <code>- 키: 값</code>은 바로 위 항목의 정보
        </p>
        <p className="text-[var(--flowme-text-tertiary)]">
          이 창은 수정 가능한 작업 원문입니다. 처음 붙여 넣은 원문은 별도로
          보존됩니다.
        </p>
      </div>

      <section>
        <h3 className="font-semibold text-[var(--flowme-text)]">기본 구조</h3>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-[var(--flowme-surface)] p-3 font-mono text-[11px] leading-5">
          {
            "## 일정\n- [ ] 첫 번째 항목입니다.\n  - 설명: 이 항목에 포함된 설명입니다.\n  - 완료 기준: 완료로 볼 상태입니다.\n- [ ] 두 번째 항목입니다."
          }
        </pre>
        <p className="mt-2">
          줄 앞 <code>##</code>는 단계, <code>- [ ]</code>는 항목입니다.
          설명·날짜 같은 정보는 항목 바로 아래에 두 칸 들여쓴 목록으로 씁니다.
          항목을 새 묶음으로 나눌 때는 <code>##</code> 단계를 하나 더 만드세요.
        </p>
        <p className="mt-2 text-[var(--flowme-text-tertiary)]">
          직접 작성할 때는 <code>- [ ]</code>를 사용합니다. 표식 없는 문장은
          원문에 남고 자동으로 항목이 되지 않습니다. 붙여 넣은{" "}
          <code># 제목</code>은 위 제목란과 연결됩니다.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-[var(--flowme-text)]">날짜와 시간</h3>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-[var(--flowme-surface)] p-3 font-mono text-[11px] leading-5">
          {
            "- [ ] 예약 시간을 확인합니다.\n  - 날짜: 2026-08-03\n  - 시간: 09:00\n  - 시간대: Asia/Seoul\n  - 소요 시간: 30분"
          }
        </pre>
        <p className="mt-2">
          속성은 같은 항목 아래에 두 칸 들여씁니다. 날짜는{" "}
          <code>YYYY-MM-DD</code> 형식을 사용하세요. <code>8월 3일</code>처럼
          연도가 없는 날짜는 자동으로 추정하지 않습니다.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-[var(--flowme-text)]">상대 날짜</h3>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-[var(--flowme-surface)] p-3 font-mono text-[11px] leading-5">
          {"- 기준일: 2026-08-10\n- [ ] 준비 항목입니다.\n  - 상대 날짜: D-3"}
        </pre>
        <p className="mt-2">
          기준일이 있어야 <code>D-3</code>을 실제 캘린더 날짜로 계산합니다.
          화면에서 기준일을 바꾸면 원문의 기준일 줄도 함께 바뀝니다.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-[var(--flowme-text)]">반복과 조건</h3>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-[var(--flowme-surface)] p-3 font-mono text-[11px] leading-5">
          {
            "- [ ] 정기 점검을 기록합니다.\n  - 날짜: 2026-08-03\n  - 반복: 매주 월, 수, 금\n  - 반복 종료: 12회\n  - 실행 조건: 운영일에만 확인합니다."
          }
        </pre>
        <p className="mt-2 text-[var(--flowme-text-secondary)]">
          날짜가 있는 반복 항목은 캘린더·할 일·표·TXT 결과에 같은 회차로 보여
          줍니다. 종료가 없으면 처음 4주를 보여 주고, 더 볼 수 있습니다.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-[var(--flowme-text)]">
          할 일 안의 체크리스트
        </h3>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-[var(--flowme-surface)] p-3 font-mono text-[11px] leading-5">
          {
            "- [ ] 예약을 완료합니다.\n  - [ ] 시간을 확인합니다.\n  - [ ] 예약 번호를 저장합니다."
          }
        </pre>
        <p className="mt-2 text-[var(--flowme-text-secondary)]">
          두 칸 들여쓴 <code>- [ ]</code>은 바로 위 할 일의 하위
          체크리스트입니다.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-[var(--flowme-text)]">
          장소와 참고 링크
        </h3>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-[var(--flowme-surface)] p-3 font-mono text-[11px] leading-5">
          {
            "- [ ] 장소와 자료를 확인합니다.\n  - 장소: 장소 이름\n  - 자료: [참고 자료](https://example.com)\n  - 안내: 안내 문구\n  - 주의: 주의 문구\n  - 출처: [원문](https://example.com/source)"
          }
        </pre>
        <p className="mt-2">
          자료와 출처는 일반적인 Markdown 링크 <code>[이름](주소)</code> 형식을
          사용합니다.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-[var(--flowme-text)]">
          원문 문장 보존
        </h3>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-[var(--flowme-surface)] p-3 font-mono text-[11px] leading-5">
          {"여행 준비에 대한 배경 설명입니다.\n\n- [ ] 항공권을 확인합니다."}
        </pre>
        <p className="mt-2">
          표식 없는 일반 문장은 원문으로 보존합니다. 항목으로 만들 문장에만{" "}
          <code>- [ ]</code>를 붙이세요. URL만 입력하면 본문을 추측하지 않고
          원문을 가져와야 하는 상태로 남깁니다.
        </p>
      </section>
    </div>
  );
}

export function InputPane({
  title,
  source,
  rawText,
  ownership,
  ownershipLocked,
  parsePending,
  liveUpdateBlocked,
  parseStatusLabel,
  liveAppliedItemCount,
  sourceError,
  scrollContainerRef,
  sourceTextAreaRef,
  showDocumentNavigator = false,
  sourceLocationReturnLabel,
  onTitleChange,
  onSourceChange,
  onRawTextChange,
  onOwnershipChange,
  onOpenDocumentNavigator,
  onReturnToSourceLocation,
  productMode = false,
}: {
  title: string;
  source: string;
  rawText: string;
  ownership: AuthoringOwnership;
  ownershipLocked: boolean;
  parsePending: boolean;
  liveUpdateBlocked: boolean;
  parseStatusLabel: string | null;
  liveAppliedItemCount: number | null;
  sourceError?: { id: string; message: string } | null;
  scrollContainerRef: Ref<HTMLDivElement>;
  sourceTextAreaRef: Ref<HTMLTextAreaElement>;
  showDocumentNavigator?: boolean;
  sourceLocationReturnLabel?: string;
  onTitleChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onRawTextChange: (value: string) => void;
  onOwnershipChange: (value: AuthoringOwnership) => void;
  onOpenDocumentNavigator?: () => void;
  onReturnToSourceLocation?: () => void;
  productMode?: boolean;
}) {
  return (
    <section
      className="ta-pane ta-input-pane flex h-full min-h-0 flex-col bg-[var(--flowme-surface)]"
      aria-labelledby="text-authoring-input-heading"
    >
      <header className="ta-pane-header border-b border-[var(--flowme-border)] px-4 py-4">
        <h2
          id="text-authoring-input-heading"
          className="text-lg font-semibold tracking-[-0.02em]"
        >
          {productMode ? "작업 원문" : "무엇을 Flow로 만들까요?"}
        </h2>
        {productMode ? (
          <p className="mt-1 text-xs text-[var(--flowme-text-secondary)]">
            일반 문장을 그대로 붙여 넣어도 됩니다.
          </p>
        ) : null}
      </header>

      <div
        ref={scrollContainerRef}
        data-authoring-pane-scroll
        data-testid="ta-authoring-input-scroll"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        <label className="block">
          <span className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
            {productMode ? "제목" : "Flow 제목"}
          </span>
          <input
            data-testid="ta-authoring-title"
            className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
            value={title}
            maxLength={120}
            placeholder="예: 제주 여행 준비"
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </label>

        <div className="block">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--flowme-text-secondary)]">
            <label htmlFor="text-authoring-source">작업 원문</label>
            <InlineHelp
              label="작성 문법 설명"
              testId="ta-authoring-syntax-guide"
              panelTestId="ta-authoring-syntax-help-panel"
            >
              <SyntaxGuideContent />
            </InlineHelp>
            {showDocumentNavigator && onOpenDocumentNavigator ? (
              <button
                type="button"
                data-testid="ta-authoring-document-navigator-open"
                className="inline-flex min-h-11 items-center rounded-[var(--flowme-radius-control)] px-2.5 py-1.5 text-xs font-semibold text-[var(--flowme-action)] transition hover:bg-[var(--flowme-action-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                onClick={onOpenDocumentNavigator}
              >
                문서 찾기
              </button>
            ) : null}
            {parsePending || liveAppliedItemCount !== null ? (
              <span
                aria-live="polite"
                aria-atomic="true"
                className="ml-auto flex items-center gap-2 font-normal text-[var(--flowme-text-tertiary)]"
              >
                {parsePending ? (
                  <span className="rounded bg-[var(--flowme-warning-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--flowme-warning-strong)]">
                    {parseStatusLabel}
                  </span>
                ) : liveAppliedItemCount !== null ? (
                  <span
                    data-testid="ta-authoring-live-status"
                    className="text-[10px] font-semibold text-[var(--flowme-positive-strong)]"
                  >
                    {productMode
                      ? "결과 반영 완료"
                      : `${liveAppliedItemCount}개 항목 반영됨`}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
          <textarea
            id="text-authoring-source"
            autoFocus={productMode}
            ref={sourceTextAreaRef}
            data-testid="ta-authoring-source"
            aria-label="작업 원문"
            aria-describedby="text-authoring-source-hint"
            aria-invalid={sourceError ? true : undefined}
            aria-errormessage={sourceError?.id}
            className={`${FLOW_UI_INPUT_CLASS} mt-1 min-h-[300px] w-full resize-y font-mono text-[13px] font-normal leading-6 md:min-h-[420px]`}
            value={rawText}
            spellCheck={false}
            placeholder={
              productMode
                ? "제목입니다.\n설명입니다.\n\n- [ ] 첫 번째 항목입니다.\n  - 날짜: 2026-08-03"
                : "일반 메모 또는 항목 목록을 붙여 넣으세요.\n\n## 예약\n- [ ] 항공권 확인\n  - 날짜: 2026-08-03\n  - 완료 기준: 예약번호를 남김"
            }
            onChange={(event) => onRawTextChange(event.target.value)}
          />
          <span id="text-authoring-source-hint" className="sr-only">
            작성 문법은 작업 원문 옆 물음표 버튼에서 확인할 수 있습니다.
          </span>
          {sourceError ? (
            <span id={sourceError.id} className="sr-only">
              {sourceError.message}
            </span>
          ) : null}
          {parsePending && liveUpdateBlocked ? (
            <span className="mt-1 block text-[11px] leading-4 text-[var(--flowme-warning-strong)]">
              저장했거나 직접 고친 결과는 자동으로 덮어쓰지 않습니다. 아래
              버튼에서 원문 변경을 확인해 주세요.
            </span>
          ) : null}
          {sourceLocationReturnLabel && onReturnToSourceLocation ? (
            <button
              type="button"
              data-testid="ta-authoring-source-location-return"
              className="mt-2 inline-flex min-h-11 items-center rounded-[var(--flowme-radius-control)] px-2.5 py-1.5 text-xs font-semibold text-[var(--flowme-action)] transition hover:bg-[var(--flowme-action-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
              onClick={onReturnToSourceLocation}
            >
              {sourceLocationReturnLabel}
            </button>
          ) : null}
        </div>

        <details
          data-testid="ta-authoring-source-settings"
          className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)]"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-[var(--flowme-text)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)] [&::-webkit-details-marker]:hidden">
            <span>{productMode ? "원문 정보" : "출처·저장 설정"}</span>
            <span className="text-xs font-normal text-[var(--flowme-text-tertiary)]">
              {productMode ? "+" : ownershipLabel(ownership)}
            </span>
          </summary>

          <div className="space-y-4 border-t border-[var(--flowme-border)] px-3 py-3">
            <div>
              <label
                htmlFor="text-authoring-source-meta"
                className="text-xs font-semibold text-[var(--flowme-text-secondary)]"
              >
                출처 또는 원문 이름
              </label>
              <input
                id="text-authoring-source-meta"
                data-testid="ta-authoring-source-meta"
                className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full`}
                value={source}
                maxLength={300}
                placeholder="예: 개인 메모 또는 원문 URL"
                onChange={(event) => onSourceChange(event.target.value)}
              />
              <p
                data-testid="ta-authoring-source-boundary"
                className="mt-1.5 text-[11px] leading-5 text-[var(--flowme-text-tertiary)]"
              >
                URL 본문은 가져오지 않고, 직접 붙여 넣은 내용만 해석합니다.
              </p>
            </div>
            {!productMode ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                  저장 성격
                </p>
                <fieldset
                  data-testid="ta-authoring-ownership"
                  disabled={ownershipLocked}
                >
                  <legend className="sr-only">저장 성격</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {OWNERSHIP_OPTIONS.map((option) => {
                      const selected = option.value === ownership;
                      return (
                        <label
                          key={option.value}
                          className={`flex min-h-11 items-center justify-center rounded-[var(--flowme-radius-control)] border px-2 py-2 text-center transition focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--flowme-focus)] ${
                            ownershipLocked
                              ? "cursor-not-allowed opacity-65"
                              : "cursor-pointer"
                          } ${
                            selected
                              ? "border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)]"
                              : "border-[var(--flowme-border)] bg-[var(--flowme-surface)] hover:border-[var(--flowme-border-strong)]"
                          }`}
                        >
                          <input
                            className="sr-only"
                            type="radio"
                            name="text-authoring-ownership"
                            value={option.value}
                            checked={selected}
                            onChange={() => onOwnershipChange(option.value)}
                          />
                          <span className="text-xs font-semibold sm:text-sm">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <p className="text-[11px] leading-5 text-[var(--flowme-text-tertiary)]">
                  {ownershipLocked
                    ? "항목을 만든 뒤에는 저장 성격을 바꾸지 않습니다. 다른 성격은 새 Flow에서 선택하세요."
                    : "제작자 초안과 수정 제안은 파일로 가져가기 전에 권리·안전을 확인합니다."}
                </p>
              </div>
            ) : null}
          </div>
        </details>
      </div>
    </section>
  );
}
