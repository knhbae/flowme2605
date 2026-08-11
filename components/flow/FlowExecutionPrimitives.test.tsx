import assert from 'node:assert/strict';
import test from 'node:test';

import { isTopmostVisibleFlowBottomSheet } from './FlowExecutionPrimitives';

function createSheet(): {
  sheet: HTMLElement;
  descendants: Set<HTMLElement>;
} {
  const descendants = new Set<HTMLElement>();
  const sheet = {
    contains: (candidate: Node | null) => candidate instanceof Object
      && descendants.has(candidate as HTMLElement),
  } as unknown as HTMLElement;
  return { sheet, descendants };
}

test('a later child bottom sheet wins an equal-z Escape tie while focus is still in its parent', () => {
  const parent = createSheet();
  const child = createSheet();
  const parentSheet = parent.sheet;
  const childSheet = child.sheet;
  parent.descendants.add(childSheet);
  const parentFocusedElement = {
    closest: () => parentSheet,
  } as unknown as HTMLElement;

  assert.equal(parentFocusedElement.closest('[data-flow-ui="bottom-sheet"]'), parentSheet);
  assert.equal(
    isTopmostVisibleFlowBottomSheet(parentSheet, [parentSheet, childSheet], () => 80),
    false,
  );
  assert.equal(
    isTopmostVisibleFlowBottomSheet(childSheet, [parentSheet, childSheet], () => 80),
    true,
  );
});

test('a nested z80 child remains above its z100 parent', () => {
  const parent = createSheet();
  const child = createSheet();
  parent.descendants.add(child.sheet);
  const layerZIndex = new Map<HTMLElement, number>([
    [parent.sheet, 100],
    [child.sheet, 80],
  ]);
  const getLayerZIndex = (sheet: HTMLElement) => layerZIndex.get(sheet) ?? 0;

  assert.equal(
    isTopmostVisibleFlowBottomSheet(parent.sheet, [parent.sheet, child.sheet], getLayerZIndex),
    false,
  );
  assert.equal(
    isTopmostVisibleFlowBottomSheet(child.sheet, [parent.sheet, child.sheet], getLayerZIndex),
    true,
  );
});

test('an earlier z100 editor handles Escape ahead of a later z80 detail sheet', () => {
  const editorSheet = createSheet().sheet;
  const detailSheet = createSheet().sheet;
  const layerZIndex = new Map<HTMLElement, number>([
    [editorSheet, 100],
    [detailSheet, 80],
  ]);
  const getLayerZIndex = (sheet: HTMLElement) => layerZIndex.get(sheet) ?? 0;

  assert.equal(
    isTopmostVisibleFlowBottomSheet(editorSheet, [editorSheet, detailSheet], getLayerZIndex),
    true,
  );
  assert.equal(
    isTopmostVisibleFlowBottomSheet(detailSheet, [editorSheet, detailSheet], getLayerZIndex),
    false,
  );
});

test('a nested help sheet keeps its parent stacking context above a later detail sheet', () => {
  const editor = createSheet();
  const help = createSheet();
  const detail = createSheet();
  editor.descendants.add(help.sheet);
  const visibleSheets = [editor.sheet, help.sheet, detail.sheet];
  const layerZIndex = new Map<HTMLElement, number>([
    [editor.sheet, 100],
    [help.sheet, 80],
    [detail.sheet, 80],
  ]);
  const getLayerZIndex = (sheet: HTMLElement) => layerZIndex.get(sheet) ?? 0;

  assert.equal(
    isTopmostVisibleFlowBottomSheet(help.sheet, visibleSheets, getLayerZIndex),
    true,
  );
  assert.equal(
    isTopmostVisibleFlowBottomSheet(detail.sheet, visibleSheets, getLayerZIndex),
    false,
  );
});

test('a later equal-z root sheet paints above an earlier root and its nested child', () => {
  const earlierRoot = createSheet();
  const nestedChild = createSheet();
  const laterRoot = createSheet();
  earlierRoot.descendants.add(nestedChild.sheet);
  const visibleSheets = [earlierRoot.sheet, nestedChild.sheet, laterRoot.sheet];
  const getLayerZIndex = () => 80;

  assert.equal(
    isTopmostVisibleFlowBottomSheet(nestedChild.sheet, visibleSheets, getLayerZIndex),
    false,
  );
  assert.equal(
    isTopmostVisibleFlowBottomSheet(laterRoot.sheet, visibleSheets, getLayerZIndex),
    true,
  );
});

test('a single visible bottom sheet remains eligible to handle Escape', () => {
  const sheet = createSheet().sheet;
  const getLayerZIndex = () => 80;

  assert.equal(isTopmostVisibleFlowBottomSheet(sheet, [sheet], getLayerZIndex), true);
  assert.equal(isTopmostVisibleFlowBottomSheet(sheet, [], getLayerZIndex), false);
  assert.equal(isTopmostVisibleFlowBottomSheet(null, [sheet], getLayerZIndex), false);
});
