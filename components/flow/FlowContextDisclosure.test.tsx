import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  FlowContextDisclosure,
  isFlowContextDisclosureEscape,
  isFlowContextDisclosureOutside,
  resolveFlowContextDisclosurePresentation,
  restoreFlowContextDisclosureFocus,
} from './FlowContextDisclosure';

function renderAtWidth(desktop: boolean, node: React.ReactNode): string {
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      matchMedia: () => ({ matches: desktop }),
    },
  });
  try {
    return renderToStaticMarkup(node);
  } finally {
    if (previousWindow === undefined) {
      delete (globalThis as { window?: Window }).window;
    } else {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: previousWindow,
      });
    }
  }
}

test('closed disclosure exposes a named 48px trigger without rendering help eagerly', () => {
  const markup = renderAtWidth(false,
    <FlowContextDisclosure
      kind="help"
      label="선택 범위 도움말"
      title="선택 범위란?"
    >
      선택한 항목만 내 계획에 저장합니다.
    </FlowContextDisclosure>,
  );

  assert.match(markup, /data-flow-context-kind="help"/);
  assert.match(markup, /data-flow-context-semantics="optional-help"/);
  assert.match(markup, /class="[^"]*h-12[^"]*w-12[^"]*min-h-12[^"]*min-w-12/);
  assert.match(markup, /aria-label="선택 범위 도움말"/);
  assert.match(markup, /aria-haspopup="dialog"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /aria-controls="flow-context-[^"]+-dialog"/);
  assert.match(markup, /<span aria-hidden="true">\?<\/span>/);
  assert.doesNotMatch(markup, /role="dialog"/);
  assert.doesNotMatch(markup, /선택한 항목만 내 계획에 저장합니다/);
});

test('mobile help opens as a modal sheet with Escape backdrop close and focus-return contracts', () => {
  const markup = renderAtWidth(false,
    <FlowContextDisclosure
      kind="help"
      label="계획 선택 도움말"
      title="사용할 계획을 고르세요"
      testId="choice-help"
      defaultOpen
    >
      아직 내 계획에 저장되지 않습니다.
    </FlowContextDisclosure>,
  );

  const controls = markup.match(/aria-controls="([^"]+)"/)?.[1];
  assert.ok(controls);
  assert.match(markup, new RegExp(`id="${controls}"`));
  assert.match(markup, /data-flow-ui="bottom-sheet"/);
  assert.match(markup, /data-flow-context-presentation="mobile-sheet"/);
  assert.match(markup, /data-flow-context-dismiss="escape backdrop close"/);
  assert.match(markup, /data-flow-context-return-focus="flow-context-[^"]+-trigger"/);
  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-describedby="flow-context-[^"]+-detail"/);
  assert.match(markup, /data-testid="choice-help-sheet-close"/);
});

test('desktop short help opens next to its trigger as a non-modal anchored popover', () => {
  const markup = renderAtWidth(true,
    <FlowContextDisclosure
      kind="help"
      label="옮기기 형식 도움말"
      eyebrow="선택 도움"
      title="옮길 형식을 고르세요"
      testId="transfer-help"
      defaultOpen
    >
      TXT, 할 일, Calendar, Excel 중 하나를 고릅니다.
    </FlowContextDisclosure>,
  );

  assert.match(markup, /data-flow-ui="anchored-popover"/);
  assert.match(markup, /data-flow-context-presentation="desktop-popover"/);
  assert.match(markup, /data-flow-context-anchor="flow-context-[^"]+-trigger"/);
  assert.match(markup, /data-flow-context-dismiss="escape outside close"/);
  assert.match(markup, /data-flow-context-return-focus="flow-context-[^"]+-trigger"/);
  assert.match(markup, /role="dialog"/);
  assert.doesNotMatch(markup, /aria-modal="true"/);
  assert.doesNotMatch(markup, /data-flow-ui="bottom-sheet"/);
  assert.match(markup, /data-testid="transfer-help-desktop-close"/);
});

test('desktop caution opens as a modal warning dialog with a backdrop and no toast surface', () => {
  const markup = renderAtWidth(true,
    <FlowContextDisclosure
      kind="caution"
      label="일방향 결과 상세 보기"
      eyebrow="주의"
      title="외부 도구와 자동으로 연결되지 않아요"
      testId="one-way-warning"
      defaultOpen
    >
      다시 옮길 때는 기존 결과와 중복될 수 있습니다.
    </FlowContextDisclosure>,
  );

  assert.match(markup, /data-flow-context-semantics="warning"/);
  assert.match(markup, /<span aria-hidden="true">!<\/span>/);
  assert.match(markup, /data-flow-ui="modal-dialog-layer"/);
  assert.match(markup, /data-flow-ui="modal-dialog"/);
  assert.match(markup, /data-flow-context-presentation="desktop-dialog"/);
  assert.match(markup, /data-flow-context-dismiss="escape backdrop close"/);
  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /data-testid="one-way-warning-desktop-backdrop"/);
  assert.doesNotMatch(markup, /toast/i);
  assert.doesNotMatch(markup, /anchored-popover/);
});

test('presentation policy keeps help and irreversible warnings separate', () => {
  assert.equal(resolveFlowContextDisclosurePresentation('help', false), 'mobile-sheet');
  assert.equal(resolveFlowContextDisclosurePresentation('caution', false), 'mobile-sheet');
  assert.equal(resolveFlowContextDisclosurePresentation('help', true), 'desktop-popover');
  assert.equal(resolveFlowContextDisclosurePresentation('caution', true), 'desktop-dialog');
});

test('Escape outside and focus-return helpers drive the desktop dismissal contract', () => {
  assert.equal(isFlowContextDisclosureEscape('Escape'), true);
  assert.equal(isFlowContextDisclosureEscape('Enter'), false);

  const insideTarget = {} as Node;
  const outsideTarget = {} as Node;
  const container = { contains: (target: Node) => target === insideTarget };
  assert.equal(isFlowContextDisclosureOutside(container, insideTarget), false);
  assert.equal(isFlowContextDisclosureOutside(container, outsideTarget), true);
  assert.equal(isFlowContextDisclosureOutside(null, outsideTarget), false);

  const focusCalls: Array<FocusOptions | undefined> = [];
  restoreFlowContextDisclosureFocus({
    focus: (options) => focusCalls.push(options),
  });
  assert.deepEqual(focusCalls, [{ preventScroll: true }]);
});

test('controlled state remains caller-owned and reports no transition during render', () => {
  const requested: boolean[] = [];
  const markup = renderAtWidth(false,
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
