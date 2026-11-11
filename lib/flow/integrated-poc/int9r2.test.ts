import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// int9 r2 (기타 int9 QA, 총괄 11/11 17:4x). The band's Flow rows are in f8s1-continue.test.ts; the rest is wiring here.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
const alpha = read('../../../components/flow/integrated-poc/AlphaWorkspace.tsx');

test('W-NLDATE-07: in a document without date heads the F7 chip only adds the date; elsewhere the ⋮ date path', () => {
  const accept = editor.slice(editor.indexOf('async function acceptDateSuggestion('), editor.indexOf('function freshNoticeHolds('));
  assert(accept.includes("const headless = !M.rowMeta(before.working, p.docId).some(item => item.kind === 'date');"));
  assert(accept.includes("const done = headless && target && !accessFor(candidate.lineId)?.reason ? applyDateOnly(target, candidate.date, task.time ?? '')\n      : applyDateChip(candidate.lineId, candidate.date), after = controller.getState();"));
});

test('QA-int8 2-3: a repeat round finished from the band says so on the writing notice line with [되돌리기]; the same box undoes too', () => {
  assert(space.includes("if (outcome === 'saved' && check && bandDocumentId) setBandRepeatNotice({ actorId, documentId: bandDocumentId, taskId: id, text: repeatNextText(live.title, check), check });"));
  assert(space.includes('if (kept?.repeatCheck) { void undoBandRepeat(id, kept.repeatCheck); return; }'), 'never the next round by a second press');
  assert(space.includes("? { text: bandRepeatNotice.text, close: () => setBandRepeatNotice(null), repeat: true,"));
  assert(space.includes("if (check && check !== 'refused' && check.applied) onCheck?.(check);"));
  assert(editor.includes('action: props.hostNotice.action ?? null } : null);'), 'the host notice carries its action');
});

test('W-VER-04: the line\'s words open [자세히]; a newer build under it ends the words (or a dot); off 쓰기, a dot on 쓰기', () => {
  assert(editor.includes("data-alert-text className={alertMore ? styles.alertTextMore : undefined} onClick={alertMore ? () => setAlertDetail(open => !open) : undefined}>"));
  assert(editor.includes('{alertLine.newVersion && !versionCompact && <span data-alert-new-version="words"> · 새 버전</span>}</p>'));
  assert(editor.includes('{alertLine.newVersion && versionCompact && <span className={styles.alertVersionDot} data-alert-new-version="dot">'));
  assert(editor.includes('note: serverView.alert?.note,\n    newVersion: serverView.alert?.newVersion } : null;'), 'the editor\'s own save line keeps it too');
  assert(alpha.includes('const versionDot = !!newBuild && !writingTab;'));
  assert(alpha.includes("{tab === 'documents' && versionDot && <span className={styles.navDot} data-version-dot aria-hidden=\"true\" />}"));
  const css = read('../../../components/flow/integrated-poc/AlphaWorkspace.module.css');
  assert(/\.navDot \{ position: absolute;/.test(css), 'no height: absolute');
});
