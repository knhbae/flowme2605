import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const hostSource = readFileSync(new URL('./ProgramTextEditor.tsx', import.meta.url), 'utf8');
const shipped = hostSource.match(/export function programEditorVisibleHeight[\s\S]+?\n\}/)![0]
  .replace('export ', '').replace('top: number, bottom: number', 'top, bottom');
const programEditorVisibleHeight = vm.runInNewContext(`${shipped}; programEditorVisibleHeight`) as (top: number, bottom: number) => number | null;

test('visible height follows the actual notice top and bottom tabs rather than a fixed360px deduction', () => {
  assert.equal(programEditorVisibleHeight(295, 779), 462);
  assert.equal(programEditorVisibleHeight(401, 779), 358);
  assert.equal(programEditorVisibleHeight(401, 900), 462);
  for (const [top, bottom] of [[295, 779], [401, 779], [401, 900]]) {
    const height = programEditorVisibleHeight(top, bottom)!;
    assert(height >= 64); assert(top + height <= bottom - 12);
    assert.equal((height - 20) % 26, 0);
  }
  assert.equal(programEditorVisibleHeight(NaN, 779), null);
  assert.equal(programEditorVisibleHeight(295, Infinity), null);
});

test('the sizing observer changes a host style and notifies guarded viewport layout, not input ownership', () => {
  const source = readFileSync(new URL('./ProgramTextEditor.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('    const host = hostRef.current, shell');
  const end = source.indexOf('  }, []);', start);
  const sizing = source.slice(start, end);
  assert.match(sizing, /attributeFilter: \['hidden', 'open'\]/);
  assert.match(sizing, /getClientRects\(\).length/);
  assert.match(sizing, /position === 'fixed'/);
  assert.match(sizing, /setProperty\('--program-editor-visible-height',[\s\S]*editorRef\.current\?\.refreshViewport\(\)/);
  assert.doesNotMatch(sizing, /setValue|setSelectionRange|\.focus\(|\.value\s*=|scrollTop\s*=/);
});

test('layout observation starts after the existing native install and synchronization effects', () => {
  const sizingStart = hostSource.indexOf('    const host = hostRef.current, shell');
  const nativeInstall = hostSource.indexOf('    const instance = nativeEditor.create(host, {');
  const synchronization = hostSource.indexOf('draftRef.current?.synchronize(props.workspace)');
  const panelEffect = hostSource.indexOf('if (panel && dialogRef.current && !dialogRef.current.open)');
  assert(nativeInstall > 0 && nativeInstall < sizingStart);
  assert(synchronization > nativeInstall && synchronization < sizingStart);
  assert(panelEffect > synchronization && panelEffect < sizingStart);
});

test('compact input hides overlapping row hits but preserves reading touch rows and movement44 ruler', () => {
  const vendor = readFileSync(new URL('../../../lib/flow/integrated-poc/vendor/text-editor.css', import.meta.url), 'utf8');
  const host = readFileSync(new URL('./ProgramTextEditor.module.css', import.meta.url), 'utf8');
  assert.match(vendor, /tle-reading-view, \.tle-folded-view\) :is\(\.tle-line-task, \.tle-line-scope\) \{ min-height: 44px/);
  assert.match(vendor, /tle-folded-view \.tle-line \{ min-height: 44px/);
  assert.match(vendor, /not\(\.tle-reading-view\):not\(\.tle-folded-view\):not\(\.tle-has-move-selection\):not\(\[data-move-phase="selected"\]\)/);
  assert.doesNotMatch(host, /\[data-move-phase\]\) \{ --tle-line: 44px/);
  assert.match(host, /tle-has-move-selection/); assert.match(host, /\{ --tle-line: 44px; \}/);
});
