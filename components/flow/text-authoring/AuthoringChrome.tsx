"use client";

import { FLOW_UI_SECONDARY_ACTION_CLASS } from "@/components/flow/flow-ui";

import type { AuthoringStage } from "./authoring-ui-types";
import {
  TEXT_AUTHORING_EXAMPLE_GROUPS,
  type TextAuthoringExample,
} from "./examples";

const STAGES: Array<{
  key: AuthoringStage;
  number: string;
  label: string;
}> = [
  {
    key: "input",
    number: "1",
    label: "입력",
  },
  {
    key: "result",
    number: "2",
    label: "결과",
  },
];

export function AuthoringWorkspaceHeader({
  libraryOpen,
  libraryToggleTestId = "ta-authoring-library-toggle",
  productMode = false,
  onToggleLibrary,
  onReset,
}: {
  libraryOpen: boolean;
  libraryToggleTestId?: string | null;
  productMode?: boolean;
  onToggleLibrary: () => void;
  onReset: () => void;
}) {
  return (
    <header className="ta-workspace-header border-b border-[var(--flowme-border)] bg-[var(--flowme-surface)]">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-3 py-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="shrink-0 text-sm font-black tracking-[-0.04em] text-[var(--flowme-text)]">
            FLOW
          </span>
          <span
            className="h-4 w-px shrink-0 bg-[var(--flowme-border-strong)]"
            aria-hidden="true"
          />
          <p className="min-w-0 truncate text-base font-semibold tracking-[-0.025em] text-[var(--flowme-text)] sm:text-lg">
            {productMode
              ? libraryOpen
                ? "내 콘텐츠"
                : "콘텐츠 제작"
              : libraryOpen
                ? "저장한 Flow"
                : "Flow 만들기"}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            data-testid={libraryToggleTestId ?? undefined}
            aria-pressed={libraryOpen}
            aria-label={
              productMode
                ? libraryOpen
                  ? "콘텐츠 제작으로 돌아가기"
                  : "내 콘텐츠 보기"
                : libraryOpen
                  ? "Flow 만들기로 돌아가기"
                  : "저장한 Flow 보기"
            }
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onToggleLibrary}
          >
            {productMode
              ? libraryOpen
                ? "콘텐츠 만들기"
                : "내 콘텐츠"
              : libraryOpen
                ? "Flow 만들기"
                : "저장한 Flow"}
          </button>
          {!libraryOpen ? (
            <button
              type="button"
              className={FLOW_UI_SECONDARY_ACTION_CLASS}
              aria-label={productMode ? "새 콘텐츠 시작" : "새 Flow 시작"}
              title={productMode ? "새 콘텐츠 시작" : "새 Flow 시작"}
              onClick={onReset}
            >
              {productMode ? "새 콘텐츠" : "새 Flow"}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function AuthoringStageNavigation({
  stage,
  canOpenResult,
  onStageChange,
}: {
  stage: AuthoringStage;
  canOpenResult: boolean;
  onStageChange: (stage: AuthoringStage) => void;
}) {
  return (
    <nav
      className="ta-stage-navigation border-b border-[var(--flowme-border)] bg-[var(--flowme-surface)] min-[900px]:hidden"
      aria-label="Flow 제작 단계"
    >
      <ol className="mx-auto grid max-w-[1440px] grid-cols-2 px-3 sm:px-5">
        {STAGES.map((item) => {
          const active = item.key === stage;
          const disabled = item.key === "result" && !canOpenResult;
          return (
            <li key={item.key} className="min-w-0">
              <button
                type="button"
                data-testid={`ta-authoring-stage-${item.key}`}
                aria-current={active ? "step" : undefined}
                aria-label={`0${item.number} ${item.label}`}
                disabled={disabled}
                className={`min-h-12 w-full border-x-0 border-t-0 border-b-[3px] px-1 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)] ${
                  active
                    ? "border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)] text-[var(--flowme-positive-strong)]"
                    : "border-transparent bg-[var(--flowme-surface)] text-[var(--flowme-text-secondary)] hover:border-[var(--flowme-border-strong)] hover:text-[var(--flowme-text)]"
                } disabled:cursor-not-allowed disabled:text-[var(--flowme-text-tertiary)]`}
                onClick={() => onStageChange(item.key)}
              >
                <span className="block text-[11px] font-bold tracking-[0.02em] sm:text-sm">
                  <span className="mr-1 text-[var(--flowme-positive-strong)]">
                    0{item.number}
                  </span>{" "}
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function AuthoringExampleSwitcher({
  examples,
  validatedExamples,
  activeExampleId,
  activeScenarioId,
  onSelect,
  showQaCatalog = false,
  productMode = false,
  productExampleLimit = 5,
}: {
  examples: TextAuthoringExample[];
  validatedExamples: TextAuthoringExample[];
  activeExampleId: TextAuthoringExample["id"] | null;
  activeScenarioId: string | null;
  onSelect: (example: TextAuthoringExample) => void;
  showQaCatalog?: boolean;
  productMode?: boolean;
  productExampleLimit?: number;
}) {
  const productExamples = examples.slice(0, Math.max(1, productExampleLimit));
  const visibleProductExamples = showQaCatalog
    ? productExamples.filter((example) => example.id === "simple")
    : productExamples;
  const selectedProductExampleIndex = visibleProductExamples.findIndex(
    (example) => example.id === activeExampleId,
  );
  const selectedValue = showQaCatalog
    ? activeExampleId === "simple"
      ? "product:simple"
      : activeScenarioId
        ? `qa:${activeScenarioId}`
        : ""
    : productMode && selectedProductExampleIndex >= 0
      ? `example:${selectedProductExampleIndex}`
      : activeExampleId
        ? `product:${activeExampleId}`
        : "";
  const visibleExampleCount =
    visibleProductExamples.length +
    (showQaCatalog ? validatedExamples.length : 0);

  return (
    <nav
      data-testid="ta-authoring-example-switcher"
      className="border-b border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)]"
      aria-label="콘텐츠 예시"
    >
      <div className="flex min-w-0 items-center gap-2 px-3 py-2 sm:px-5">
        <span className="shrink-0 text-xs font-semibold text-[var(--flowme-text-secondary)]">
          예시
        </span>
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">문법 적용 예시 선택</span>
          <select
            data-testid="ta-authoring-example-select"
            aria-describedby="ta-authoring-example-select-help"
            className="min-h-11 w-full appearance-auto rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] px-2.5 pr-7 text-base font-semibold text-[var(--flowme-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] sm:text-xs"
            value={selectedValue}
            onChange={(event) => {
              const [mode, id] = event.target.value.split(":", 2);
              const selectedExample =
                mode === "example" && productMode
                  ? visibleProductExamples[Number(id)]
                  : mode === "product"
                    ? visibleProductExamples.find(
                        (example) => example.id === id,
                      )
                    : mode === "qa" && showQaCatalog
                      ? validatedExamples.find(
                          (example) => example.scenarioId === id,
                        )
                      : undefined;
              if (selectedExample) onSelect(selectedExample);
            }}
          >
            <option value="">
              {showQaCatalog
                ? "전체 검토 예시 선택"
                : productMode
                  ? "예시를 선택하세요"
                  : "대표 예시 선택"}
            </option>
            <optgroup
              label={
                showQaCatalog
                  ? `작성 문법 · ${visibleProductExamples.length}개`
                  : productMode
                    ? "예시"
                    : `대표 예시 · ${visibleProductExamples.length}개`
              }
            >
              {visibleProductExamples.map((example, index) => (
                <option
                  key={example.id}
                  value={
                    showQaCatalog || !productMode
                      ? `product:${example.id}`
                      : `example:${index}`
                  }
                  data-example-id={
                    showQaCatalog || !productMode ? example.id : undefined
                  }
                >
                  {showQaCatalog || !productMode
                    ? `${example.label} · ${example.resultLabel}`
                    : example.label}
                </option>
              ))}
            </optgroup>
            {showQaCatalog
              ? TEXT_AUTHORING_EXAMPLE_GROUPS.filter((group) =>
                  validatedExamples.some(
                    (example) => example.group === group.id,
                  ),
                ).map((group) => (
                  <optgroup
                    key={group.id}
                    data-testid={`ta-authoring-example-category-${group.id}`}
                    label={`${group.label} · ${validatedExamples.filter((example) => example.group === group.id).length}개`}
                  >
                    {validatedExamples
                      .filter((example) => example.group === group.id)
                      .map((example) => (
                        <option
                          key={example.scenarioId ?? example.id}
                          value={`qa:${example.scenarioId ?? example.id}`}
                          data-example-scenario-id={example.scenarioId}
                        >
                          {example.label} ·{" "}
                          {example.expectedResultLabel ?? example.resultLabel}
                        </option>
                      ))}
                  </optgroup>
                ))
              : null}
          </select>
          <span id="ta-authoring-example-select-help" className="sr-only">
            선택하면 입력과 결과가 함께 바뀝니다.
          </span>
          {!productMode || showQaCatalog ? (
            <span data-testid="ta-authoring-example-count" className="sr-only">
              {showQaCatalog
                ? `전체 예시 ${visibleExampleCount}개`
                : `대표 ${visibleProductExamples.length}개`}
            </span>
          ) : null}
        </label>
        {showQaCatalog ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden text-[10px] font-bold text-[var(--flowme-text-tertiary)] sm:inline">
              전체 {visibleExampleCount}개
            </span>
            <a
              href="?authoringQa=0"
              className="flex min-h-11 items-center rounded border border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-2 py-1 text-[10px] font-bold text-[var(--flowme-text-secondary)] underline-offset-2 hover:underline"
            >
              대표 5개 비교
            </a>
          </div>
        ) : !productMode ? (
          <a
            href="?authoringQa=1"
            className="shrink-0 rounded border border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-2 py-1 text-[10px] font-bold text-[var(--flowme-text-secondary)] underline-offset-2 hover:underline"
          >
            전체 예시 보기
          </a>
        ) : null}
      </div>
    </nav>
  );
}

export function RecoveryBanner({
  title,
  description,
  onRecover,
  onDismiss,
  onDiscard,
}: {
  title: string;
  description?: string;
  onRecover: () => void;
  onDismiss: () => void;
  onDiscard: () => void;
}) {
  return (
    <section
      className="border-b border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-4 py-3"
      aria-labelledby="text-authoring-recovery-title"
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2
            id="text-authoring-recovery-title"
            className="text-sm font-semibold text-[var(--flowme-warning-strong)]"
          >
            작성 중이던 초안이 있습니다
          </h2>
          <p className="mt-0.5 truncate text-xs text-[var(--flowme-text-secondary)]">
            {description ?? `${title} · 아직 저장하지 않았습니다.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onDiscard}
          >
            복구본 버리기
          </button>
          <button
            type="button"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onDismiss}
          >
            나중에
          </button>
          <button
            type="button"
            className="inline-flex min-h-[var(--flowme-control-height)] items-center justify-center rounded-[var(--flowme-radius-control)] bg-[var(--flowme-warning-strong)] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
            onClick={onRecover}
          >
            이어서 편집
          </button>
        </div>
      </div>
    </section>
  );
}
