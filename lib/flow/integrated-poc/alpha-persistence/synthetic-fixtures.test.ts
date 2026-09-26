import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlphaSyntheticFixtures } from './synthetic-fixtures';
import { validateProgramEnvelope } from '../program-data';
import { textWorkspaceModel as M } from '../text-workspace';

const fixtures = createAlphaSyntheticFixtures();
function fixture(name: string) { const result = fixtures.find(f => f.name === name); assert(result, name); return result; }
function space(name: string) { const f = fixture(name); return f.envelope.data.spaces[f.actorId]; }

test('all synthetic envelopes survive exact JSON data roundtrip and preserve independent actor isolation', () => {
  for (const f of fixtures) {
    const wire = JSON.stringify(f.envelope), reloaded = JSON.parse(wire);
    assert(validateProgramEnvelope(reloaded), f.name);
    assert.deepEqual(reloaded, f.envelope, f.name);
    assert.equal(JSON.stringify(reloaded), wire);
    assert.equal(reloaded.data.spaces['participant-jihun'].text.documents.length, 0);
  }
});

test('ordinary progress keeps chronological values and reference binds one canonical item with undo', () => {
  const f = fixture('independent-documents-reference-progress-undo'), s = f.envelope.data.spaces[f.actorId];
  const task = M.tasks(s.text).find(t => t.title === 'Synthetic ordinary task'); assert(task);
  assert.deepEqual(M.progressHistory(s.text, task.id).map(row => row.percent), [15, 45, 100]);
  assert.equal(s.text.bindings.filter(binding => binding.kind === 'task').length, 1);
  assert.equal(M.tasks(s.text).filter(t => t.id === task.id).length, 1);
  assert.match(M.raw(s.text.documents[0]), /개인 메모\n한글 보존/);
  const numeric = s.text.documents.find(doc => doc.title === 'Synthetic numeric source tokens'); assert(numeric);
  assert.equal(M.raw(numeric), '- [1] Integer spelling\n- [1.0] Ratio spelling');
  const integer = M.tasks(s.text).find(row => row.title === 'Integer spelling'), ratio = M.tasks(s.text).find(row => row.title === 'Ratio spelling'); assert(integer && ratio);
  assert.equal(integer.inputToken, '1'); assert.equal(ratio.inputToken, '1.0');
  assert.equal(M.latestProgress(s.text, integer.id)?.percent, 1); assert.equal(M.latestProgress(s.text, ratio.id)?.percent, 100);
  assert.equal(M.tasks(f.envelope.undo[f.actorId][0].workspace.text).length, 0);
});

test('four origins preserve colliding source IDs as distinct saved copies and quick completion', () => {
  const s = space('four-saved-origins-and-quick-item');
  const payload = JSON.parse(s.legacySnapshot!.raw);
  assert.deepEqual(new Set(payload.model.flows.map((f: { origin: string }) => f.origin)), new Set(['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan']));
  assert.equal(new Set(s.savedBindings.map(binding => binding.flowId)).size, 1);
  assert.equal(new Set(s.savedBindings.flatMap(binding => Object.values(binding.itemLines))).size, 4);
  const quickId = Object.values(s.legacyQuickItemLines)[0], quick = M.tasks(s.text).find(t => t.id === quickId); assert(quick);
  assert.equal(quick.done, true); assert.equal(quick.date, '2026-09-22'); assert.equal(quick.note, '개인 메모');
  const map = space('actual-structured-map-factory'); const source = JSON.parse(map.legacySnapshot!.raw);
  assert(source.model.flows.some((flow: { presentation?: { mapGroup?: unknown } }) => flow.presentation?.mapGroup));
  assert(map.savedBindings.length > 0);
});

test('recurring completion and scheduling preserve original occurrence identity separately', () => {
  const s = space('recurring-occurrence-records'), rows = Object.values(s.recurrenceExecution!.entries);
  const done = rows.find(row => row.completion.status === 'completed'); assert(done);
  assert.equal(done.originalDate, '2026-09-21'); assert.equal(done.schedule.date, '2026-10-01');
  const held = rows.find(row => row.participation === 'held'); assert(held);
  assert.equal(held.originalDate, '2026-09-22'); assert.equal(held.schedule.mode, 'unscheduled');
  assert.notEqual(done.occurrenceId, held.occurrenceId);
});

test('native saved context, pending input, coherent recovery and source session retain distinct owners', () => {
  const saved = space('native-saved-history-and-execution').creatorWorkspace!;
  assert(saved.working!.nativeDocument); assert(Object.keys(saved.savedHistory!.drafts).length);
  assert(saved.nativeExecutionSources); assert(Object.keys(saved.library.records).length);
  const pending = space('native-pending-input').creatorWorkspace!;
  assert.equal(pending.working!.nativePendingRawText, '\r\n아직 동기화하지 않은 원문  ');
  assert.equal(pending.working!.nativeDocument!.document.rawText, saved.working!.nativeDocument!.document.rawText);
  const recovery = space('native-coherent-recovery').creatorWorkspace!;
  assert.equal(recovery.working!.nativePendingRawText, '  미저장 복구\r\n원문  ');
  assert('recoveryId' in recovery.working!.nativeDocument!.source);
  assert.equal(Object.keys(recovery.library.records).length, 0);
  const sessions = space('native-source-update-session').creatorWorkspace!.sourceUpdateSessions!;
  const session = Object.values(sessions)[0].session; assert(session); assert.equal(session.actorId, 'local-user');
});

test('public current version and copied baseline differ while community preserves historical item and image bytes', () => {
  const f = fixture('public-versions-copy-community-photo'), data = f.envelope.data;
  assert.equal(data.public.flows[0].currentVersionId, 'alpha-v2');
  assert.equal(data.spaces[f.actorId].copies[0].baseVersionId, 'alpha-v1');
  assert.equal(data.public.versions[1].parentVersionId, data.public.versions[0].id);
  const post = data.public.posts[0]; assert.equal(post.versionId, 'alpha-v1'); assert.equal(post.itemId, 'alpha-public-item');
  assert.equal(post.media[0].synthetic, true); assert.match(post.media[0].dataUrl, /^data:image\/png;base64,iVBOR/);
  assert.equal(data.public.replies[0].postId, post.id); assert.equal(data.public.reactions[0].targetId, post.id);
});
