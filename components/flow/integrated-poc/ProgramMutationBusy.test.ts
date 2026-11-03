import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { programErrorMessage, PROGRAM_BUSY_NOTICE } from '../../../lib/flow/integrated-poc/ui-contract';

// Execute the real component handlers; no React, storage, credentials or network.
function handler(file: string, name: string, context: Record<string, unknown>): Function {
  const ast = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found.push(node.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.equal(found.length, 1);
  const compiled = ts.transpileModule(found[0], { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(context), `${compiled}; return ${name};`)(...Object.values(context));
}

test('busy result describes a rejected request, not the lifetime or success of another request', () => {
  const result = programErrorMessage('busy');
  assert.match(result, /이번 요청은 실행하지 않았습니다/);
  assert.match(result, /필요한 변경이 남아 있으면 다시 시도/);
  assert(!result.includes('확인하고 있습니다'));
  assert.notEqual(result, PROGRAM_BUSY_NOTICE);
  assert.match(PROGRAM_BUSY_NOTICE, /확인하고 있습니다/);
  assert.notEqual(result, programErrorMessage('conflict'));
  assert.notEqual(result, programErrorMessage('checking-result'));
});

for (const reason of ['busy', 'conflict', 'checking-result']) {
  test(`community ${reason} keeps draft/baseline until an explicit successful retry`, async () => {
    const before = { id: 'draft', title: 'saved', body: 'saved' };
    const wanted = { ...before, body: 'unsaved\r\ninput' };
    const savedDraftRef = { current: before }, queue = { current: Promise.resolve(true) }, saveFlights = { current: 0 };
    let error = '', saveState = '', conflict = false, attempts = 0, commits = 0, reject = true;
    const save = handler('./ProgramCommunity.tsx', 'save', {
      actorId: 'owner', storageScope: 'account', savedDraftRef, queue, saveFlights, mounted: { current: true }, programErrorMessage,
      programClone: structuredClone, setSaveState: (value: string) => { saveState = value; },
      setError: (value: string) => { error = value; }, setDraftConflict: (value: boolean) => { conflict = value; },
      saveProgramParticipationDraft: (_current: unknown, _actor: string, draft: unknown, options: any) => {
        assert.deepEqual(draft, wanted); assert.equal(options.expected, before); commits++; return { ok: true };
      },
      mutate: async (_label: string, build: Function) => { attempts++; return reject ? { ok: false, reason } : build({}); },
    });
    assert.equal(await save(wanted), false);
    assert.equal(savedDraftRef.current, before); assert.equal(commits, 0); assert.equal(attempts, 1); assert.equal(saveFlights.current, 0);
    assert.equal(saveState, '저장하지 못했어요'); assert.equal(error, programErrorMessage(reason)); assert.equal(conflict, reason === 'conflict');
    assert.equal(wanted.body, 'unsaved\r\ninput');
    reject = false; assert.equal(await save(wanted), true);
    assert.equal(attempts, 2); assert.equal(commits, 1); assert.deepEqual(savedDraftRef.current, wanted);
    assert.equal(error, ''); assert.equal(conflict, false); assert.equal(saveState, '계정에 초안 저장됨');
  });

  test(`creator ${reason} returns false and preserves the editor baseline until retry`, async () => {
    const before = { draftId: 'draft', rawText: 'saved' }, wanted = { ...before, rawText: 'unsaved\r\ninput' };
    const baseline = { current: before }, saving = { current: null as Promise<boolean> | null };
    let report: [boolean, string] | undefined, attempts = 0, commits = 0, reject = true;
    const flush = handler('./ProgramCreatorWorkspace.tsx', 'flushDraft', {
      actorId: 'owner', saving, baseline, composing: { current: false }, editor: { current: null }, programErrorMessage,
      programSame: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b), nativeBuffer: () => wanted,
      report: (ok: boolean, text: string) => { report = [ok, text]; },
      setProgramCreatorWorking: (_current: unknown, input: any) => {
        assert.equal(input.expectedWorking, before); assert.equal(input.working, wanted); commits++; return { ok: true };
      },
      mutate: async (_label: string, build: Function) => { attempts++; return reject ? { ok: false, reason } : build({}); },
    });
    assert.equal(await flush(), false); assert.equal(baseline.current, before); assert.equal(saving.current, null);
    assert.deepEqual(report, [false, programErrorMessage(reason)]); assert.equal(attempts, 1); assert.equal(commits, 0);
    assert.equal(wanted.rawText, 'unsaved\r\ninput');
    reject = false; assert.equal(await flush(), true); assert.equal(baseline.current, wanted); assert.equal(saving.current, null);
    assert.equal(attempts, 2); assert.equal(commits, 1); assert.equal(report?.[0], true);
  });

  test(`copy inspector ${reason} keeps comparison selection and enables explicit retry`, async () => {
    const selection = { preview: { id: 'review' }, choices: { date: 'incoming' } }, scheduleRef = { current: selection };
    const busyRef = { current: false }; let error = '', message = '', busy = false, attempts = 0, commits = 0, reject = true;
    const save = handler('./ProgramCopyInspector.tsx', 'save', {
      busyRef, locks: { current: 0 }, proposalPendingRef: { current: false }, scheduleRef, programErrorMessage,
      setBusy: (value: boolean) => { busy = value; }, setFeedbackTarget: () => {},
      setError: (value: string) => { error = value; }, setMessage: (value: string) => { message = value; },
      props: { mutate: async (_label: string, build: Function) => { attempts++; return reject ? { ok: false, reason } : build({}); } },
    });
    const build = () => { commits++; return { ok: true }; };
    assert.equal(await save('apply', build, 'saved', {}, 'schedule-resolution'), false);
    assert.equal(scheduleRef.current, selection); assert.equal(selection.choices.date, 'incoming'); assert.equal(busyRef.current, false); assert.equal(busy, false);
    assert.equal(error, programErrorMessage(reason)); assert.equal(message, ''); assert.equal(commits, 0); assert.equal(attempts, 1);
    reject = false; assert.equal(await save('apply', build, 'saved', {}, 'schedule-resolution'), true);
    assert.equal(error, ''); assert.equal(message, 'saved'); assert.equal(attempts, 2); assert.equal(commits, 1);
  });
}
