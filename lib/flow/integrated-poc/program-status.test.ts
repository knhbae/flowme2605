import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { programEditorStatus, programServerStatus, serverStatusWins } from './program-status';

type Snapshot = NonNullable<Parameters<typeof programServerStatus>[0]['snapshot']>;
const snapshot = (patch: Partial<Snapshot> = {}) => ({ status: 'saved', pending: null, busy: false, draft: null,
  retryableRejectedDraft: null, retryableNativeHandoff: null, retryableRejectedSocialDraft: null, ...patch }) as unknown as Snapshot;
const server = (patch: Partial<Snapshot> = {}, extra: Partial<Parameters<typeof programServerStatus>[0]> = {}) =>
  programServerStatus({ snapshot: snapshot(patch), storageError: false, external: false, participationRecovery: false, ...extra });
const editor = (patch: Partial<Parameters<typeof programEditorStatus>[0]> = {}) =>
  programEditorStatus({ readOnly: false, error: false, locked: false, saving: false, checking: false, pending: false, ...patch });

test('server levels follow the save-status table, with R6a\'s pendingResultUnknown deciding "unknown"', () => {
  assert.deepEqual(server({}, { storageError: true }), { level: 1, label: '입력 보관 실패' });
  assert.deepEqual(server({ status: 'session-expired' }), { level: 1, label: '로그인이 만료되었습니다' });
  assert.deepEqual(server({}, { external: true }), { level: 2, label: '다른 변경이 먼저 저장됨' });
  assert.deepEqual(server({ status: 'conflict' }), { level: 2, label: '다른 변경이 먼저 저장됨' });
  assert.deepEqual(server({ draft: {} as Snapshot['draft'] }), { level: 2, label: '입력 보호 · 확인' });
  assert.deepEqual(server({ retryableRejectedDraft: {} as Snapshot['retryableRejectedDraft'] }), { level: 3, label: '저장 안 됨 · 입력 보존' });
  // A non-text request reports pending before its status turns to 'saving': still in flight, not unknown.
  assert.deepEqual(server({ pending: {} as Snapshot['pending'], busy: true, status: 'saved' }), { level: 6, label: '저장 중…' });
  assert.deepEqual(server({ pending: {} as Snapshot['pending'], busy: false, status: 'saved' }), { level: 4, label: '저장 여부 확인 못 함' });
  assert.deepEqual(server({ pending: {} as Snapshot['pending'], busy: true, status: 'checking-result' }), { level: 4, label: '저장 여부 확인 못 함' });
  assert.deepEqual(server({ status: 'saving' }), { level: 6, label: '저장 중…' });
  assert.deepEqual(server({ status: 'ready' }), { level: 8, label: '저장됨' });
  assert.deepEqual(server({ status: 'same-location' }), { level: 8, label: '변경 없음' });
  assert.deepEqual(server({ status: 'conflict' }, { participationRecovery: true }), { level: 8, label: '저장됨' });
  assert.deepEqual(programServerStatus({ snapshot: null, storageError: false, external: false, participationRecovery: false }).level, 6);
});

test('editor levels: its save error, then saving or locked, then unsaved input, then saved', () => {
  assert.deepEqual(editor({ error: true, saving: true }), { level: 3, label: '저장 확인 필요' });
  assert.deepEqual(editor({ locked: true }), { level: 6, label: '저장 중 · 입력 잠시 멈춤' });
  assert.deepEqual(editor({ saving: true }), { level: 6, label: '저장 중…' });
  assert.deepEqual(editor({ checking: true }), { level: 6, label: '저장 중…' });
  assert.deepEqual(editor({ pending: true }), { level: 7, label: '편집 중' });
  assert.deepEqual(editor(), { level: 8, label: '저장됨' });
  assert.deepEqual(editor({ readOnly: true, readOnlyLabel: '보관한 문서입니다.' }), { level: 8, label: '보관한 문서입니다.' });
});

test('one slot shows one status: the more severe wins, warnings tie to the server, saved shows once', () => {
  const wins = (s: number, e: number) => serverStatusWins({ level: s as 1, label: 's' }, { level: e as 1, label: 'e' });
  assert.equal(wins(8, 8), false);            // both "저장됨": the editor's one
  assert.equal(wins(6, 8), true);             // a task completion saving while the text is saved
  assert.equal(wins(8, 7), false);            // typing beats a quiet server
  assert.equal(wins(6, 6), false);
  assert.equal(wins(4, 3), false);            // the editor's save error is more severe than "unknown"
  assert.equal(wins(3, 3), true);             // equal warnings: the server's node with its recovery box
  assert.equal(wins(2, 8), true);
  assert.equal(serverStatusWins(null, { level: 8, label: '저장됨' }), false);
});

test('wiring: Alpha gives the note editor its status by context; the editor draws one slot and drops the extra row', () => {
  const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8');
  const editorSource = read('ProgramTextEditor.tsx'), alpha = read('AlphaWorkspace.tsx'), css = read('ProgramTextEditor.module.css');
  // Only the open document's editor (the one given noteStatus) takes the host's status; no host, no change.
  assert(editorSource.includes('serverView = props.noteStatus ? hostStatus : null'));
  // With a host the slot is the editor's own; without one, the host line and the editor status stay as before.
  assert(/\{serverView \? <div className=\{styles\.statusSlot\} data-warn=\{statusWarn \|\| undefined\}>/.test(editorSource));
  assert(editorSource.includes('{props.noteStatus && <div className={styles.noteStatus}>{props.noteStatus}</div>}'));
  assert(editorSource.includes('{serverView?.extras && <div className={styles.serverExtras}>{serverView.extras}</div>}'));
  assert(editorSource.includes("{barButtons('bar')}{barStatusSlot()}</div>;"));
  // The host still builds the same composite node for today, 분류 and the no-document screen.
  assert(alpha.includes('const serverStatus = <div className={styles.statusRow}>') && alpha.includes('{serverStatusMain}{serverStatusExtras}'));
  assert(alpha.includes('noteStatus={usesNoteChrome ? serverStatus : undefined}'));
  // FC-DETAIL-HEAD: the slot is computed once; the note editor spreads it and 둘러보기 reads its level.
  assert(/const serverSlot = programServerStatus\(/.test(alpha) && /const serverStatusView: ProgramServerStatusView \| null = usesNoteChrome \? \{\s*\.\.\.serverSlot,/.test(alpha));
  assert(alpha.includes('<ProgramServerStatusContext.Provider value={serverStatusView}>') && alpha.includes('</ProgramServerStatusContext.Provider>'));
  // While the bar shows, the slot steps aside (its live node stays) unless a recovery box in it is open.
  assert(css.includes('.toolbar > .statusSlot:not(:has(details[open])) {'));
});

test('typing keeps the slot quiet for one second after the last input', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let text = '';
  const visit = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === 'markTyping') text = node.getText(tree); ts.forEachChild(node, visit); };
  visit(tree);
  const states: boolean[] = [], timers = new Map<number, { at: number; run: () => void }>();
  let clock = 0, id = 0;
  const scope = { setTyping: (value: boolean) => states.push(value), typingTimer: { current: null as number | null },
    setTimeout: (run: () => void, ms: number) => { timers.set(++id, { at: clock + ms, run }); return id; }, clearTimeout: (key: number) => { timers.delete(key); } };
  const code = ts.transpileModule('const extracted = (' + text + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const markTyping = new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as () => void;
  const advance = (ms: number) => { clock += ms; for (const [key, timer] of [...timers]) if (timer.at <= clock) { timers.delete(key); timer.run(); } };
  markTyping(); advance(600); markTyping(); advance(600);
  assert.deepEqual(states, [true, true]);
  advance(400);
  assert.deepEqual(states, [true, true, false]);
});
