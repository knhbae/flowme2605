import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonalWorkspacePocSurface.tsx', import.meta.url), 'utf8');

test('B0-T Surface constructs the source index before personal overlay and shares it with both task reads and Result', () => {
  assert.match(source, /buildPersonalWorkspacePocSourceReadIndex\(\{\s*baseModel: initialModel,\s*authoredFlows: state\.authoredFlows \?\? \[\],\s*sourceCandidateStore,/u);
  assert.match(source, /buildPersonalWorkspacePocTasks\(model, state, sourceRead\.index\)/u);
  assert.match(source, /buildPersonalWorkspacePocTasks\(model, next, sourceRead\.index\)/u);
  assert.match(source, /buildPersonalWorkspacePocResultProjection\(\{\s*model: resultBaseModel,\s*sourceIndex: sourceRead\.ok \? sourceRead\.index : undefined,/u);
  assert.equal((source.match(/buildPersonalWorkspacePocTasks\(/gu) ?? []).length, 2);
});

test('B0-T Surface checks the whole composed identity join and returns fail-closed without an interactive empty workspace', () => {
  assert.match(source, /sourceRead\.ok && composedModel\.ok\s*&& composedModel\.model\.flows\.every/u);
  assert.match(source, /readPersonalWorkspacePocTaskSourceContext\(sourceRead\.index, flow\)\.ok/u);
  assert.match(source, /if \(!sourceReadValid\) window\.location\.replace\('\/my'\)/u);
  const start = source.indexOf('if (!sourceReadValid) {');
  const end = source.indexOf('return (\n    <PersonalWorkspacePocProductShell', start);
  assert.ok(start > 0 && end > start);
  const closed = source.slice(start, end);
  assert.match(closed, /personal-workspace-source-read-fail-closed/u);
  assert.doesNotMatch(closed, /<button|setItem|removeItem|\.clear\(|savePersonal/u);
});
