import test from 'node:test';
import assert from 'node:assert/strict';
import { listPersonalWorkspacePocStructureTemplatePreviews } from '../personal-workspace-poc-structure-template/preview-adapter';
import { prepareProgramCreatorStructure } from './creator-structure-sidecar';
import { programRawTemplateResultPolicy, programTemplateResultPolicy, programCreatorResultNavigation, programCreatorResultScope, programTemplateResultViews } from './creator-template-result';
import { createTextAuthoringDocument } from './native-creator-vendor/text-authoring/parser';
import { buildAuthoringArtifactProjection } from './native-creator-vendor/text-authoring/artifact-projection';
import type { ProgramCreatorWorking } from './creator-workspace-contract';
const now = '2026-09-14T06:00:00.000Z';
const entries = listPersonalWorkspacePocStructureTemplatePreviews();
function working(index: number): ProgramCreatorWorking {
  const entry = entries[index], draftId = `template-result-${index}`;
  const before = { catalogVersion: entry.catalogVersion, draft: { ...entry.inputDraft, draftId } };
  const prepared = prepareProgramCreatorStructure(before, { draftId, rawText: '', now });
  assert(prepared.ok);
  assert.equal(prepared.value.command.nextRawText, entry.expectedRawText);
  return { draftId, title: entry.label, rawText: prepared.value.command.nextRawText, baseRecordRevision: null, structure: prepared.value.after };
}
const expected = ['calendar', 'calendar', 'todo', 'todo', 'todo', 'calendar'];
entries.forEach((entry, index) => {
  test(`TR raw ${entry.templateId} obeys actual dates and offered contract without mutations`, () => {
    const w = working(index), before = JSON.stringify(w), policy = programRawTemplateResultPolicy(w, now);
    assert(policy); assert.equal(policy.primary, expected[index]);
    assert.deepEqual(policy.artifacts.filter(kind => kind !== 'sheet'), ['calendar', 'todo', 'memo']);
    if (index > 1) assert(!policy.artifacts.includes('sheet'));
    assert.equal(programCreatorResultNavigation(policy).resultView, expected[index]);
    assert(programTemplateResultViews(policy).includes('text'));
    assert.equal(JSON.stringify(w), before);
  });
  test(`TR native ${entry.templateId} reads the same canonical policy without reconstructing source`, () => {
    const w = working(index), document = createTextAuthoringDocument(w.rawText, { documentId: w.draftId, now, ownership: 'creator' });
    const projection = buildAuthoringArtifactProjection(document), before = JSON.stringify({ document, projection, w });
    const policy = programTemplateResultPolicy(w.structure, w.draftId, document, projection);
    assert.deepEqual(policy, programRawTemplateResultPolicy(w, now));
    assert.equal(JSON.stringify({ document, projection, w }), before);
  });
});
test('TR actual edits override fixture expectation and calendar opens the real first date', () => {
  const w = working(5); w.rawText = '# 내 시험\n- [ ] 시험 응시\n  - 날짜: 2026-12-22';
  const scheduled = programRawTemplateResultPolicy(w, now); assert(scheduled);
  assert.equal(scheduled.primary, 'calendar'); assert.equal(scheduled.firstDate, '2026-12-22');
  assert.equal(programCreatorResultNavigation(scheduled).baseDate, '2026-12-22');
  w.rawText += '\n- [ ] 날짜를 아직 정하지 않은 공부';
  assert.equal(programRawTemplateResultPolicy(w, now)?.primary, 'todo');
});
test('TR exercise sheet is optional only when the existing engine reports eligibility', () => {
  const w = working(0); w.rawText = '# 운동\n- [ ] 걷기';
  assert(!programRawTemplateResultPolicy(w, now)?.artifacts.includes('sheet'));
  w.rawText = '# 내 운동 표\n| 항목 | 날짜 | 횟수 |\n| --- | --- | --- |\n| 걷기 | 2026-12-22 | 3 |\n| 스트레칭 | 2026-12-23 | 4 |';
  const document = createTextAuthoringDocument(w.rawText, { now }), projection = buildAuthoringArtifactProjection(document);
  assert(projection.artifacts.sheet.eligible);
  assert(programTemplateResultPolicy(w.structure, w.draftId, document, projection)?.artifacts.includes('sheet'));
  const exam = working(5);
  assert(!programTemplateResultPolicy(exam.structure, exam.draftId, document, projection)?.artifacts.includes('sheet'));
});
test('TR native excluded undated items and role changes use saved canonical decisions, not raw', () => {
  const w = working(5), document = createTextAuthoringDocument('# 내 시험\n- [ ] 시험\n  - 날짜: 2026-12-22\n- [ ] 별도 공부', { documentId: w.draftId, now });
  const raw = document.rawText;
  assert.equal(programTemplateResultPolicy(w.structure, w.draftId, document, buildAuthoringArtifactProjection(document))?.primary, 'todo');
  document.parseResult.canonical.items[1].included = false;
  assert.equal(programTemplateResultPolicy(w.structure, w.draftId, document, buildAuthoringArtifactProjection(document))?.primary, 'calendar');
  document.parseResult.canonical.items[1].included = true; document.parseResult.canonical.items[1].role = 'guide';
  assert.equal(programTemplateResultPolicy(w.structure, w.draftId, document, buildAuthoringArtifactProjection(document))?.primary, 'calendar');
  assert.equal(document.rawText, raw);
});
test('TR unmaterialized, detached, unknown and foreign bindings do not manufacture a template result', () => {
  const w = working(2), blank = { catalogVersion: entries[2].catalogVersion, draft: { ...entries[2].inputDraft, draftId: w.draftId } };
  for (const structure of [undefined, blank, { ...w.structure, catalogVersion: 'future' }, { ...w.structure, draft: { ...w.structure!.draft, draftId: 'foreign' } }]) {
    assert.equal(programRawTemplateResultPolicy({ ...w, structure } as ProgramCreatorWorking, now), null);
  }
  assert.deepEqual(programCreatorResultNavigation(null), { resultView: 'text' });
});
test('TR view choices and calendar selection are display-only and scoped to actor/draft/materialization', () => {
  const w = working(2), policy = programRawTemplateResultPolicy(w, now); assert(policy);
  const choice = { resultView: 'calendar' as const, baseDate: '2027-02-01', selectedDate: '2027-02-08' }, before = JSON.stringify(choice);
  assert.deepEqual(programCreatorResultNavigation(policy, choice), choice);
  assert.equal(programCreatorResultNavigation(policy, { resultView: 'sheet' }).resultView, 'todo');
  assert.notEqual(programCreatorResultScope('a', w), programCreatorResultScope('b', w));
  assert.notEqual(programCreatorResultScope('a', w), programCreatorResultScope('a', { ...w, draftId: 'other' }));
  assert.notEqual(programCreatorResultScope('a', w), programCreatorResultScope('a', { ...w, structure: undefined }));
  assert.equal(JSON.stringify(choice), before);
});
