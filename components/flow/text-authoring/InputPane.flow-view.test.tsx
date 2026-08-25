import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { buildAuthoringFlowViewModel } from "@/lib/flow/text-authoring/flow-view-model";
import { createTextAuthoringDocument } from "@/lib/flow/text-authoring/parser";

import { InputPane } from "./InputPane";
import type { TextAuthoringFlowViewMode } from "./flow-view-ui-state";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const RAW_SOURCE =
  "# 여행 준비\n\n## 예약\n- [ ] 항공권 확인\n  - 날짜: 2026-08-30";
const DOCUMENT = createTextAuthoringDocument(RAW_SOURCE, {
  ownership: "personal",
  longDocumentTable: { enabled: true },
});
const FLOW_VIEW_MODEL = buildAuthoringFlowViewModel({
  documentId: DOCUMENT.documentId,
  rawText: RAW_SOURCE,
  parseResult: DOCUMENT.parseResult,
});

function renderInputPane({
  enabled,
  mode = "text",
  withSourceError = false,
}: {
  enabled: boolean;
  mode?: TextAuthoringFlowViewMode;
  withSourceError?: boolean;
}): string {
  return renderToStaticMarkup(
    <InputPane
      title="여행 준비"
      source="개인 메모"
      rawText={RAW_SOURCE}
      ownership="personal"
      ownershipLocked={false}
      parsePending={false}
      liveUpdateBlocked={false}
      parseStatusLabel={null}
      liveAppliedItemCount={1}
      sourceError={
        withSourceError
          ? { id: "text-authoring-source-error", message: "원문 오류" }
          : null
      }
      scrollContainerRef={null}
      sourceTextAreaRef={null}
      flowViewPocEnabled={enabled}
      flowViewMode={mode}
      flowViewModel={FLOW_VIEW_MODEL}
      productMode
      onTitleChange={() => undefined}
      onSourceChange={() => undefined}
      onRawTextChange={() => undefined}
      onOwnershipChange={() => undefined}
      onFlowViewModeChange={() => undefined}
    />,
  );
}

test("the isolated hybrid editor control is absent when the PoC prop is off", () => {
  const markup = renderInputPane({ enabled: false, withSourceError: true });
  assert.doesNotMatch(markup, /편집 방식|순수 텍스트|Flow 편집/u);
  assert.doesNotMatch(markup, /ta-authoring-flow-editor/u);
  assert.match(markup, /data-testid="ta-authoring-source"/u);
  assert.match(
    markup,
    /<label for="text-authoring-source">작업 원문<\/label>/u,
  );
  assert.match(
    markup,
    /<span id="text-authoring-source-error" class="sr-only">원문 오류<\/span>/u,
  );
  assert.doesNotMatch(markup, /role="alert"/u);
  assert.doesNotMatch(markup, /id="text-authoring-view-panel-text"/u);
});

test("the PoC exposes two 44px modes around one persistent editor surface", () => {
  const textMarkup = renderInputPane({ enabled: true, mode: "text" });
  assert.match(textMarkup, /role="group" aria-label="편집 방식"/u);
  assert.match(textMarkup, />순수 텍스트<\/button>/u);
  assert.match(textMarkup, />Flow 편집<\/button>/u);
  assert.match(
    textMarkup,
    /data-testid="ta-authoring-view-text"[^>]*aria-pressed="true"/u,
  );
  assert.match(
    textMarkup,
    /data-testid="ta-authoring-view-flow"[^>]*aria-pressed="false"/u,
  );
  assert.equal((textMarkup.match(/min-h-11/gu) ?? []).length >= 2, true);
  assert.match(
    textMarkup,
    /id="text-authoring-view-panel-text"[^>]*>[\s\S]*data-testid="ta-authoring-title"/u,
  );
  assert.match(textMarkup, /id="text-authoring-live-editor-panel"/u);
  assert.match(textMarkup, /data-testid="ta-authoring-flow-editor-loading"/u);
  assert.doesNotMatch(textMarkup, /data-testid="ta-authoring-source"/u);

  const flowMarkup = renderInputPane({ enabled: true, mode: "flow" });
  assert.match(
    flowMarkup,
    /data-testid="ta-authoring-view-flow"[^>]*aria-pressed="true"/u,
  );
  assert.match(
    flowMarkup,
    /id="text-authoring-view-panel-text"[^>]*hidden[^>]*class="hidden"/u,
  );
  assert.match(flowMarkup, /id="text-authoring-live-editor-panel"/u);
  assert.match(flowMarkup, /data-testid="ta-authoring-flow-editor-loading"/u);
  assert.match(flowMarkup, /텍스트 편집기를 여는 중입니다/u);
  assert.doesNotMatch(flowMarkup, /미리보기|document-preview/u);
  assert.equal(
    (flowMarkup.match(/data-testid="ta-authoring-flow-editor-loading"/gu) ?? [])
      .length,
    1,
  );
});
