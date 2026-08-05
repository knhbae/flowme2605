import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { FlowContextDisclosure } from './FlowContextDisclosure';

test('help disclosure exposes a 44px named dialog trigger while closed', () => {
  const markup = renderToStaticMarkup(
    <FlowContextDisclosure
      kind="help"
      label="선택 범위 도움말"
      title="선택 범위란?"
    >
      선택한 항목만 내 계획에 저장합니다.
    </FlowContextDisclosure>,
  );

  assert.match(markup, /data-flow-context-kind="help"/);
  assert.match(markup, /class="[^"]*h-11[^"]*w-11[^"]*min-h-11[^"]*min-w-11/);
  assert.match(markup, /aria-label="선택 범위 도움말"/);
  assert.match(markup, /aria-haspopup="dialog"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /aria-controls="flow-context-[^"]+-dialog"/);
  assert.match(markup, /<span aria-hidden="true">\?<\/span>/);
  assert.doesNotMatch(markup, /role="dialog"/);
});

test('caution disclosure opens supplemental detail in the shared accessible sheet', () => {
  const markup = renderToStaticMarkup(
    <FlowContextDisclosure
      kind="caution"
      label="내보내기 주의사항"
      eyebrow="주의사항"
      title="내보내기 전에 확인하세요"
      testId="export-caution"
      defaultOpen
    >
      <p>지원하지 않는 필드는 미리보기에서 확인할 수 있습니다.</p>
    </FlowContextDisclosure>,
  );

  const controls = markup.match(/aria-controls="([^"]+)"/)?.[1];
  assert.ok(controls);
  assert.match(markup, /data-flow-context-kind="caution"/);
  assert.match(markup, /aria-expanded="true"/);
  assert.match(markup, /<span aria-hidden="true">!<\/span>/);
  assert.match(markup, new RegExp(`id="${controls}"`));
  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-labelledby="flow-context-[^"]+-heading"/);
  assert.match(markup, /aria-describedby="flow-context-[^"]+-detail"/);
  assert.match(markup, /data-flow-ui="bottom-sheet"/);
  assert.match(markup, /data-flow-context-detail="optional"/);
  assert.match(markup, /data-flow-context-return-focus="flow-context-[^"]+-trigger"/);
  assert.match(markup, /data-testid="export-caution-sheet-close"/);
  assert.match(markup, /지원하지 않는 필드는 미리보기에서 확인할 수 있습니다/);
});

test('controlled state remains caller-owned and reports the requested transition', () => {
  const requested: boolean[] = [];
  const markup = renderToStaticMarkup(
    <FlowContextDisclosure
      kind="help"
      label="도움말"
      title="도움말"
      open={false}
      defaultOpen
      onOpenChange={(nextOpen) => requested.push(nextOpen)}
    >
      추가 설명
    </FlowContextDisclosure>,
  );

  assert.match(markup, /aria-expanded="false"/);
  assert.doesNotMatch(markup, /role="dialog"/);
  assert.deepEqual(requested, []);
});
