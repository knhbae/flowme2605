import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { AuthoringDraftView } from "./authoring-ui-types";
import { DraftLibrary } from "./DraftLibrary";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const drafts: AuthoringDraftView[] = [
  {
    draftId: "draft-open",
    title: "이사 준비",
    source: "내 메모",
    ownership: "creator",
    primaryArtifact: "calendar",
    stepCount: 3,
    itemCount: 8,
    issueCount: 2,
    revisionLabel: "internal-revision-id",
    updatedAtLabel: "2026. 8. 11. 오후 3:00",
    lastSavedAtLabel: "2026. 8. 11. 오후 2:55",
    archived: false,
    status: "작성 중",
  },
  {
    draftId: "draft-archived",
    title: "보관한 공부 계획",
    source: "다른 메모",
    ownership: "creator",
    primaryArtifact: "todo",
    stepCount: 1,
    itemCount: 2,
    issueCount: 0,
    revisionLabel: "another-internal-revision-id",
    updatedAtLabel: "2026. 8. 10. 오후 2:00",
    lastSavedAtLabel: "2026. 8. 9. 오후 8:00",
    archived: true,
    status: "보관됨",
  },
];

const noop = () => undefined;

function renderProductLibrary(
  filter: "all" | "archived",
  libraryDrafts = drafts,
): string {
  return renderToStaticMarkup(
    <DraftLibrary
      productMode
      drafts={libraryDrafts}
      query=""
      filter={filter}
      onQueryChange={noop}
      onFilterChange={noop}
      onCreate={noop}
      onOpen={noop}
      onRename={noop}
      onDuplicate={noop}
      onArchive={noop}
      onRestore={noop}
      onHistory={noop}
    />,
  );
}

test("empty product library exposes one unambiguous creation action", () => {
  const markup = renderProductLibrary("all", []);

  assert.equal(markup.match(/>새 콘텐츠<\/button>/gu)?.length, 1);
  assert.match(markup, />아직 저장한 콘텐츠가 없습니다.<\/h2>/u);
});

test("product library keeps only the approved active-draft fields and actions", () => {
  const markup = renderProductLibrary("all");

  assert.match(markup, />콘텐츠<\/h1>/u);
  assert.match(markup, />이사 준비<\/h2>/u);
  assert.match(markup, />열기<\/button>/u);
  assert.match(markup, />이름 변경<\/button>/u);
  assert.match(markup, />복제<\/button>/u);
  assert.match(markup, />보관<\/button>/u);
  assert.match(markup, /마지막으로 명시 저장한 시각/u);
  assert.match(markup, /오후 2:55/u);
  assert.doesNotMatch(markup, /오후 3:00/u);
  assert.doesNotMatch(markup, /보관한 공부 계획/u);
  assert.doesNotMatch(markup, /제목 또는 출처 검색|작성 중 필터|저장 기록/u);
  assert.doesNotMatch(markup, /3단계|8개 항목|확인 2개/u);
  assert.doesNotMatch(markup, /internal-revision-id/u);
});

test("product archive view shows restoration without active draft actions", () => {
  const markup = renderProductLibrary("archived");

  assert.match(markup, />보관한 콘텐츠<\/h1>/u);
  assert.match(markup, />보관한 공부 계획<\/h2>/u);
  assert.match(markup, />복구<\/button>/u);
  assert.doesNotMatch(markup, />이사 준비<\/h2>/u);
  assert.doesNotMatch(
    markup,
    />열기<\/button>|>복제<\/button>|>보관<\/button>/u,
  );
});
