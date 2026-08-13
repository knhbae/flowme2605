import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { AuthoringSourceLocatorView } from "./authoring-ui-types";
import { LongDocumentNavigator } from "./LongDocumentNavigator";

const ENTRIES: AuthoringSourceLocatorView[] = [
  {
    locatorId: "heading-1",
    kind: "heading",
    label: "준비 순서",
    detail: "",
    status: "safe",
    startOffset: 0,
    endOffset: 7,
    startLine: 1,
    endLine: 1,
  },
  {
    locatorId: "code-1",
    kind: "code",
    label: "코드 원문",
    detail: "내용은 바꾸지 않고 보존했습니다.",
    status: "preserved",
    startOffset: 20,
    endOffset: 72,
    startLine: 8,
    endLine: 12,
  },
];

test("long document navigator exposes searchable source ranges without internal names", () => {
  const markup = renderToStaticMarkup(
    <LongDocumentNavigator entries={ENTRIES} onLocate={() => undefined} />,
  );

  assert.match(markup, /ta-authoring-document-navigator/u);
  assert.match(markup, /ta-authoring-document-search/u);
  assert.match(markup, /data-block-kind="code"/u);
  assert.match(markup, /원문 8~12행/u);
  assert.match(markup, /원문 위치에서 보기/u);
  assert.doesNotMatch(markup, /RawPreservedBlock|locatorId|rawHash|parser/iu);
});

test("long document navigator keeps exactly one local primary action", () => {
  const markup = renderToStaticMarkup(
    <LongDocumentNavigator entries={ENTRIES} onLocate={() => undefined} />,
  );
  assert.equal((markup.match(/<button/gu) ?? []).length, 1);
  assert.equal((markup.match(/type="radio"/gu) ?? []).length, ENTRIES.length);
});

test("long document navigator restores the saved source location selection", () => {
  const markup = renderToStaticMarkup(
    <LongDocumentNavigator
      entries={ENTRIES}
      initialLocatorId="code-1"
      onLocate={() => undefined}
    />,
  );
  assert.match(
    markup,
    /data-locator-id="code-1"[^>]*class="[^"]*bg-\[var\(--flowme-positive-soft\)\]/u,
  );
  assert.match(markup, /checked="" value="code-1"/u);
});
