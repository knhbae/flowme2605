import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { programShiftDate } from './execution';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { extendProgramRecent, extendProgramRecentRaw, programRecentHidden, programRecentHold, restrictProgramRecent } from './recent-writing';

// 11/5 총괄 조건 2 (쓰기 '최근만 쓰기'): when a check of the put-back fails nothing is saved, not even in part, and what
// was typed stays for the 복구함 as the whole document. Run on ProgramSpace's own callbacks (the editor's onCommit and
// its draft reader), taken from the source as the other source-run tests do.
const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function editorProp(name: string) {
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node) && node.name.getText(tree) === name) {
      const tag = node.parent.parent;
      if ((ts.isJsxSelfClosingElement(tag) || ts.isJsxOpeningElement(tag)) && tag.tagName.getText(tree) === 'TextEditor' && node.initializer && ts.isJsxExpression(node.initializer))
        found.push(node.initializer.expression!.getText(tree));
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.equal(found.length, 1, name);
  return found[0];
}
function evaluate<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule(`const extracted = (${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.Preserve } }).outputText;
  return new Function(...Object.keys(scope), `${code}\nreturn extracted;`)(...Object.values(scope)) as T;
}
const owner = '77777777-7777-4777-8777-777777777777', today = '2026-11-05';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `refuse-${++request}`, expectedSpace: data.spaces[owner] });
function long() {
  const days = Array.from({ length: 40 }, (_, index) => [`[${programShiftDate(today, index - 39)}]`, '- /회사 일', `  - [ ] 일 ${index}`, `  - [x] 끝 ${index}`, '']).flat();
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = ok(createProgramDocument(initial, { ...base(initial), title: '할 일', raw: ['[미정]', '- [ ] 미정의 일', '', ...days].join('\n') }));
  return { data: made.data, text: made.data.spaces[owner].text, docId: made.result };
}

test('조건 2: a put-back a check refuses saves nothing (no commit call at all) and says why; one that passes commits the whole', async () => {
  const onCommit = editorProp('onCommit'), { text, docId } = long();
  const hold = programRecentHold(text, docId, today)!, hidden = programRecentHidden(text, hold);
  const recent = { hold, hidden, workspace: restrictProgramRecent(text, docId, hidden) };
  const commits: unknown[][] = [], messages: string[] = [];
  const scope = (wide: (id: string, view: unknown, next: TextWorkspaceState, check?: boolean) => unknown) => ({ recent, id: docId, recentWide: wide,
    recentNarrow: (_: string, __: unknown, state: TextWorkspaceState) => state, setMessage: (text: string) => { messages.push(text); },
    editorCommit: async (...args: unknown[]) => { commits.push(args); return true; } });
  // Refused (as for a folded day's lines that would read differently): no commit, false, the message.
  const refused = evaluate<(next: TextWorkspaceState, label: string, options?: object) => Promise<boolean>>(onCommit,
    scope(() => ({ ok: false, reason: 'hidden-context' })));
  assert.equal(await refused(recent.workspace, '문서 편집'), false);
  assert.equal(commits.length, 0);
  assert.match(messages[0], /최근만 보기에서 저장하지 않았습니다\. 입력은 남아 있습니다/);
  // An expected workspace that cannot be put back refuses the save too.
  const expectedRefused = evaluate<(next: TextWorkspaceState, label: string, options?: object) => Promise<boolean>>(onCommit,
    scope((_, __, next, check) => check === false ? { ok: false, reason: 'invalid' } : { ok: true, state: next }));
  assert.equal(await expectedRefused(recent.workspace, '문서 편집', { expectedWorkspace: recent.workspace }), false);
  assert.equal(commits.length, 0);
  // Passed: one commit, of the whole document (the real put-back).
  const passed = evaluate<(next: TextWorkspaceState, label: string, options?: object) => Promise<boolean>>(onCommit,
    scope((_, __, next, check) => extendProgramRecent(text, next, docId, hidden, check)));
  assert.equal(await passed(recent.workspace, '문서 편집'), true);
  assert.equal(commits.length, 1);
  assert.equal(M.raw(M.getDocument(commits[0][1] as TextWorkspaceState, docId)), M.raw(M.getDocument(text, docId)));
});

test('조건 2: what was typed, saved or not, reaches the 복구함 as the whole document (the draft reader puts the folded days around it)', () => {
  const register = editorProp('onRegisterDraft'), { data, text, docId } = long();
  const hold = programRecentHold(text, docId, today)!, hidden = programRecentHidden(text, hold);
  const restricted = restrictProgramRecent(text, docId, hidden), view = { hold, hidden, workspace: restricted };
  const draftReaders = { current: {} as Record<string, (() => string) | null> };
  evaluate<(read: (() => string) | null) => void>(register, { draftReaders, recentViewRef: { current: () => view }, dataRef: { current: data }, actorId: owner,
    space: data.spaces[owner], extendProgramRecentRaw, programRecentHidden, id: docId })(() => M.raw(M.getDocument(restricted, docId)).replace(`[${today}]`, `[${today}]\n- [ ] 저장 못 한 입력`));
  const captured = draftReaders.current[docId]!();
  assert.equal(captured, M.raw(M.getDocument(text, docId)).replace(`[${today}]`, `[${today}]\n- [ ] 저장 못 한 입력`));
  // Every folded line is in it (the tab's recovery, and its copy outside the tab, keep this raw).
  for (const line of M.getDocument(text, docId)!.lines.filter(entry => hidden.has(entry.id))) assert(captured.includes(line.text));
});
