import assert from 'node:assert/strict';
import test from 'node:test';

import { captureFlowEditorReturnPoint } from './useFlowEditorController';

class FakeHTMLElement {
  readonly dataset: DOMStringMap = {};
  isConnected = true;
  tabIndex: number;
  readonly kind: 'body' | 'html' | 'button' | 'div';

  constructor(kind: FakeHTMLElement['kind'], tabIndex = -1) {
    this.kind = kind;
    this.tabIndex = tabIndex;
  }

  closest(selector: string): FakeHTMLElement | null {
    return selector === '[inert]' ? null : null;
  }

  matches(selector: string): boolean {
    if (selector === ':disabled, [hidden], [aria-hidden="true"]') return false;
    return selector.includes('button') && this.kind === 'button';
  }
}

function installFakeDocument() {
  const body = new FakeHTMLElement('body');
  const documentElement = new FakeHTMLElement('html');
  const fakeDocument = {
    activeElement: body as unknown as HTMLElement,
    body: body as unknown as HTMLElement,
    documentElement: documentElement as unknown as HTMLElement,
    querySelector: () => null,
  };
  const descriptors = {
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
    HTMLElement: Object.getOwnPropertyDescriptor(globalThis, 'HTMLElement'),
  };
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: FakeHTMLElement,
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: fakeDocument,
  });
  return {
    body,
    document: fakeDocument,
    restore() {
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test('return-point captures with the same logical key receive exact unique opener tokens', () => {
  const environment = installFakeDocument();
  try {
    const firstOpener = new FakeHTMLElement('button', 0);
    const latestOpener = new FakeHTMLElement('button', 0);
    environment.document.activeElement = firstOpener as unknown as HTMLElement;
    const first = captureFlowEditorReturnPoint({
      targetKey: 'saved-plan-opener:moving-d30',
      fallbackSelector: '[data-testid="saved-plan-opener"]',
    });

    environment.document.activeElement = latestOpener as unknown as HTMLElement;
    const latest = captureFlowEditorReturnPoint({
      targetKey: 'saved-plan-opener:moving-d30',
      fallbackSelector: '[data-testid="saved-plan-opener"]',
    });

    assert.notEqual(first.focus.targetKey, latest.focus.targetKey);
    assert.equal(firstOpener.dataset.flowEditorReturnKey, first.focus.targetKey);
    assert.equal(latestOpener.dataset.flowEditorReturnKey, latest.focus.targetKey);
    assert.notEqual(firstOpener.dataset.flowEditorReturnKey, latestOpener.dataset.flowEditorReturnKey);
  } finally {
    environment.restore();
  }
});

test('return-point capture does not tag body, non-focusable elements, or opted-out active elements', () => {
  const environment = installFakeDocument();
  try {
    captureFlowEditorReturnPoint({ targetKey: 'body-opener' });
    assert.equal(environment.body.dataset.flowEditorReturnKey, undefined);

    const nonFocusable = new FakeHTMLElement('div', -1);
    environment.document.activeElement = nonFocusable as unknown as HTMLElement;
    captureFlowEditorReturnPoint({ targetKey: 'non-focusable-opener' });
    assert.equal(nonFocusable.dataset.flowEditorReturnKey, undefined);

    const optedOut = new FakeHTMLElement('button', 0);
    environment.document.activeElement = optedOut as unknown as HTMLElement;
    captureFlowEditorReturnPoint({
      targetKey: 'nested-item-opener',
      captureActiveElement: false,
    });
    assert.equal(optedOut.dataset.flowEditorReturnKey, undefined);
  } finally {
    environment.restore();
  }
});
