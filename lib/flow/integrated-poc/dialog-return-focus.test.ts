import test from 'node:test';
import assert from 'node:assert/strict';
import { programDialogReturnTarget, restoreProgramDialogFocus } from './dialog-return-focus';

function element(tagName = 'BUTTON', parentElement: any = null): any {
  const ownerDocument = parentElement?.ownerDocument ?? { activeElement: null };
  const node: any = { tagName, parentElement, ownerDocument, isConnected: true, open: true, invisible: false, blocked: false, disabled: false,
    hasAttribute: () => node.open, querySelector: () => node.summary ?? null, closest: () => node.blocked ? node : null,
    matches: () => node.disabled, getClientRects: () => node.invisible ? [] : [{}], focus: () => { ownerDocument.activeElement = node; } };
  return node;
}
test('visible opener receives focus without changing the menu', () => {
  const opener = element(); assert.equal(programDialogReturnTarget(opener), opener); assert(restoreProgramDialogFocus(opener));
});
test('collapsed document menu returns to its summary instead of a hidden action', () => {
  const menu = element('DETAILS'); menu.open = false; menu.summary = element('SUMMARY', menu);
  const opener = element('BUTTON', menu); opener.invisible = true;
  assert.equal(programDialogReturnTarget(opener), menu.summary); assert(restoreProgramDialogFocus(opener)); assert.equal(menu.open, false);
});
test('nested closed menus choose the visible outer summary', () => {
  const outer = element('DETAILS'); outer.open = false; outer.summary = element('SUMMARY', outer);
  const inner = element('DETAILS', outer); inner.open = false; inner.summary = element('SUMMARY', inner); inner.summary.invisible = true;
  assert.equal(programDialogReturnTarget(element('BUTTON', inner)), outer.summary);
});
test('detached, inert, hidden or disabled targets never steal focus', () => {
  assert.equal(programDialogReturnTarget(null), null);
  for (const patch of [{ isConnected: false }, { blocked: true }, { invisible: true }, { disabled: true }]) {
    const opener = Object.assign(element(), patch); assert.equal(programDialogReturnTarget(opener), null); assert.equal(restoreProgramDialogFocus(opener), false);
  }
});
