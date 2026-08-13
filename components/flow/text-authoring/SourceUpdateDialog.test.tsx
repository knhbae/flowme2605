import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AuthoringSourceState } from "@/lib/flow/text-authoring/types";

import {
  SourceUpdateDialog,
  type SourceUpdateDialogView,
} from "./SourceUpdateDialog";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const noop = () => undefined;

function render(view: SourceUpdateDialogView): string {
  return renderToStaticMarkup(
    <SourceUpdateDialog
      open
      view={view}
      onSelectChange={noop}
      onResolve={noop}
      onApply={noop}
      onReject={noop}
      onLater={noop}
    />,
  );
}

function baseView(
  overrides: Partial<SourceUpdateDialogView> = {},
): SourceUpdateDialogView {
  return {
    status: "comparing",
    creatorCanApply: true,
    userCorrectionCount: 1,
    selectedChangeId: "change-title",
    changes: [
      {
        changeId: "change-title",
        label: "제목이 달라졌습니다",
        baseValue: "기존 제목",
        workingValue: "내가 고친 제목",
        incomingValue: "새 원문 제목",
      },
    ],
    ...overrides,
  };
}

test("P1-E comparison names Base, working, and incoming content without internal jargon", () => {
  const html = render(baseView());

  assert.match(html, /기준 원문/);
  assert.match(html, /내 작업/);
  assert.match(html, /새 원문/);
  assert.match(html, /내 작업 유지/);
  assert.match(html, /새 원문 선택/);
  assert.match(html, /나중에 결정/);
  assert.doesNotMatch(html, /canonical|parser|hash|receipt|revision/iu);
});

test("P1-E keeps apply disabled until every change has an explicit final decision", () => {
  const unresolvedHtml = render(baseView());
  const resolvedHtml = render(
    baseView({
      changes: [
        {
          ...baseView().changes[0],
          decision: "keep_working",
        },
      ],
    }),
  );

  assert.match(
    unresolvedHtml,
    /data-testid="ta-authoring-source-candidate-apply"[^>]*\sdisabled(?:="")?(?=[ >])/,
  );
  assert.doesNotMatch(
    resolvedHtml,
    /data-testid="ta-authoring-source-candidate-apply"[^>]*\sdisabled(?:="")?(?=[ >])/,
  );
});

test("P1-E permission and stale states explain why apply remains unavailable", () => {
  const deniedHtml = render(baseView({ creatorCanApply: false }));
  const staleHtml = render(
    baseView({
      status: "stale-candidate",
      changes: [
        {
          ...baseView().changes[0],
          decision: "use_incoming",
        },
      ],
    }),
  );

  assert.match(deniedHtml, /수정할 권한이 없어/);
  assert.match(staleHtml, /현재 작업 기준으로 새 원문을 다시 받아/);
  assert.match(
    staleHtml,
    /data-testid="ta-authoring-source-candidate-apply"[^>]*\sdisabled(?:="")?(?=[ >])/,
  );
});

test("gate-off legacy source comparison keeps P0 selectors and exposes no P1-E candidate UI", () => {
  const state = {
    status: "source_updated",
    active: {},
    incoming: {},
    stagedAt: "2026-08-13T00:00:00.000Z",
    changes: [
      {
        changeId: "legacy-title",
        kind: "changed",
        activeItemId: "item-1",
        incomingItemId: "item-1",
        field: "title",
        oldSourceValue: "이전 제목",
        incomingSourceValue: "새 제목",
        state: "open",
      },
    ],
  } as unknown as Extract<
    AuthoringSourceState,
    { status: "source_updated" | "conflict_source_vs_user" }
  >;
  const html = renderToStaticMarkup(
    <SourceUpdateDialog
      open
      state={state}
      userCorrectionCount={0}
      onResolve={noop}
      onApply={noop}
      onReject={noop}
      onLater={noop}
    />,
  );

  assert.match(html, /ta-authoring-source-compare-dialog/);
  assert.match(html, /ta-authoring-source-update-apply/);
  assert.doesNotMatch(html, /ta-authoring-source-candidate-/);
});
