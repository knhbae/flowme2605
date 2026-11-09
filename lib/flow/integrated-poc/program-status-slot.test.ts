import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { programEditorStatus, programServerStatus, serverStatusWins } from './program-status';

// R6b review: render the editor's real status-slot JSX and bar status for each state, with a tiny
// element factory instead of React, and check what is there: recovery actions, live nodes, the bar.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8');
const source = read('ProgramTextEditor.tsx'), alpha = read('AlphaWorkspace.tsx'), css = read('ProgramTextEditor.module.css');
const tree = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function pick(match: (node: ts.Node) => boolean) {
  const found: string[] = [];
  const visit = (node: ts.Node) => { if (match(node)) found.push(node.getText(tree)); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(found.length, 1);
  return found[0];
}
type El = { type: unknown; props: Record<string, unknown>; children: unknown[] };
const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): El => ({ type, props: props ?? {}, children });
const Fragment = 'fragment';
function run<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', { fileName: 'slot.tsx', compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, jsxFactory: 'h', jsxFragmentFactory: 'Fragment' } }).outputText;
  return new Function('h', 'Fragment', ...Object.keys(scope), code + '\nreturn extracted;')(h, Fragment, ...Object.values(scope)) as T;
}
function all(node: unknown, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach(child => all(child, out));
  else if (node && typeof node === 'object' && 'children' in node) { out.push(node as El); all((node as El).children, out); }
  return out;
}
const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text((node as El).children) : typeof node === 'string' ? node : '';

const styles = new Proxy({}, { get: (_, key) => String(key) });
const slotExpression = pick(node => ts.isJsxExpression(node) && !!node.expression && ts.isConditionalExpression(node.expression)
  && node.expression.condition.getText(tree) === 'serverView' && node.expression.whenTrue.getText(tree).includes('styles.statusSlot')).slice(1, -1);
const barSlot = pick(node => ts.isFunctionDeclaration(node) && node.name?.text === 'barStatusSlot');

type Server = Parameters<typeof programServerStatus>[0]['snapshot'];
function slot(state: { server?: Partial<NonNullable<Server>> | null; storageError?: boolean; error?: boolean; typing?: boolean; serverRecovery?: boolean }) {
  const snapshot = state.server === null ? undefined : { status: 'saved', pending: null, busy: false, draft: null, retryableRejectedDraft: null,
    retryableNativeHandoff: null, retryableRejectedSocialDraft: null, ...state.server } as NonNullable<Server>;
  const server = programServerStatus({ snapshot, storageError: !!state.storageError, external: false, participationRecovery: false });
  const serverRecovery = state.serverRecovery ? h('details', { 'data-test': 'server-recovery' }, h('summary', null, h('span', null, '다시 확인'))) : null;
  const serverBody = state.serverRecovery ? h('section', { 'data-test': 'server-body' }, h('button', null, '다시 확인')) : null;
  const serverView = { ...server, recovery: serverRecovery, recoveryBody: serverBody, extras: null };
  const editorStatus = programEditorStatus({ readOnly: false, error: !!state.error, locked: false, saving: false, checking: false, pending: false });
  const serverWins = serverStatusWins(serverView, editorStatus), statusWarn = (serverWins ? serverView.level : editorStatus.level) <= 4;
  const statusLabel = serverWins ? serverView.label : editorStatus.label, hasRecovery = !!serverView.recovery || !!state.error;
  const quietStatus = !!state.typing && !statusWarn;
  const scope = { serverView, styles, statusWarn, hasRecovery, statusLabel, quietStatus, draft: { error: state.error ? '저장하지 못했습니다' : '' },
    editorRecovery: (announce: boolean, inner?: unknown) => h('details', { 'data-test': 'editor-recovery', announce }, h('summary', null, '다시 저장 · 입력한 원문 받기'), inner ?? null),
    props: { noteStatus: 'host line' }, editorStatus };
  const nodes = all(run(slotExpression, scope));
  const barStatus = quietStatus ? '●' : statusWarn ? `⚠ ${statusLabel}` : statusLabel;
  const bar = run<() => El>(barSlot, { statusWarn, hasRecovery, barStatus, statusLabel, styles, openStatusRecovery: () => {}, ProgramIcon: 'icon' })();
  return {
    live: nodes.filter(node => ['alert', 'status'].includes(String(node.props.role))).map(node => `${node.props.role}:${text(node)}:${node.props.className}`),
    recoveries: nodes.filter(node => node.props['data-test']).map(node => String(node.props['data-test'])),
    editorAnnounces: nodes.some(node => node.props['data-test'] === 'editor-recovery' && node.props.announce),
    bar: `${bar.type}:${text(bar)}`,
    barIcon: bar.children.flat().map(child => child && typeof child === 'object' && (child as El).type === 'icon' ? String((child as El).props.name) : null).find(Boolean) ?? null,
  };
}

test('F1: the server\'s 다시 확인 stays when the editor\'s save error wins, and the editor\'s box stays when the server wins', () => {
  // Unsaved locally (3) while the server cannot tell whether the last request landed (4).
  const unknown = slot({ server: { pending: {} as never, busy: false }, serverRecovery: true, error: true });
  // W2: one box, with the server's 다시 확인 inside the editor's.
  assert.deepEqual(unknown.recoveries, ['editor-recovery', 'server-body']);
  assert.deepEqual(unknown.live, ['alert:저장 확인 필요:srOnly']);
  // The other way round: a recovery-required server (1) wins the words; the editor's actions remain.
  const required = slot({ server: { status: 'recovery-required' }, error: true });
  assert.deepEqual(required.recoveries, ['editor-recovery']);
  assert.deepEqual(required.live, ['alert:저장 상태를 확인해 주세요:srOnly']);
  assert.equal(unknown.editorAnnounces || required.editorAnnounces, false);
});

test('F2: the bar offers 복구 열기 only when a recovery box exists; otherwise it shows the words', () => {
  const required = slot({ server: { status: 'recovery-required' } });
  assert.deepEqual(required.recoveries, []);
  assert.deepEqual(required.live, ['alert:저장 상태를 확인해 주세요:status']);     // visible words, no box to open
  assert.equal(required.bar, 'span:⚠ 저장 상태를 확인해 주세요');
  assert.equal(slot({ server: { pending: {} as never, busy: false }, serverRecovery: true }).bar, 'button:⚠ 저장 여부 확인 못 함');
  assert.equal(slot({ error: true }).bar, 'button:⚠ 저장 확인 필요');
});

test('F3: one live node at a time, and the bar\'s copy is never announced', () => {
  for (const state of [{}, { typing: true }, { error: true }, { server: { status: 'saving' } }, { server: { pending: {} as never, busy: false }, serverRecovery: true }] as const) {
    const result = slot(state as Parameters<typeof slot>[0]);
    assert.equal(result.live.length, 1, JSON.stringify(state));
  }
  // The host's recovery box comes without its own alert inside the editor; elsewhere it keeps it.
  assert(alpha.includes("<summary>{announce ? <span role=\"alert\">{inputRecoveryLabel}</span> : <span>{inputRecoveryLabel}</span>}</summary>"));
  assert(alpha.includes('recovery: destination.view === \'space\' && needsInputProtection ? <div className={styles.statusSlot}>{inputRecoveryBox(false)}</div> : null,'));
  assert(alpha.includes('{inputRecoveryBox(true)}'));
  // The box's body follows the same switch, so no alert or status is left inside it either.
  assert(alpha.includes('<div className={styles.inputRecoveryBody}>{inputProtectionFor(announce)}</div>'));
  assert(alpha.includes("role={announce ? 'alert' : undefined}") && alpha.includes("role={announce ? 'status' : undefined}"));
  const protection = alpha.slice(alpha.indexOf('const inputProtectionFor'), alpha.indexOf('</>;', alpha.indexOf('const inputProtectionFor')));
  assert(protection.length > 0 && !protection.includes('role="alert"') && !protection.includes('role="status"'));
  assert(!/\bmain:/.test(alpha.slice(alpha.indexOf('const serverStatusView'), alpha.indexOf('const serverStatusView') + 600)));
  // While the bar shows, the slot steps aside unless a box in it is open (the bar button opens one).
  assert(css.includes('.toolbar > .statusSlot:not(:has(details[open])) {'));
  assert(!css.includes('.serverSlot'));
});

test('quiet while typing: a fast save shows the dot, not "저장됨", until a second after the last input; warnings never wait', () => {
  assert.deepEqual(slot({ typing: true }).live, ['status:●:status']);
  assert.deepEqual(slot({}).live, ['status:저장됨:status']);
  // F6-B1 (목업 B): the bar's copy of 저장됨 is the icon set's check; the dot, the warnings and other words stay words.
  assert.equal(slot({}).bar, 'span:'); assert.equal(slot({}).barIcon, 'check');
  assert.equal(slot({ typing: true }).bar, 'span:●'); assert.equal(slot({ typing: true }).barIcon, null);
  assert.deepEqual(slot({ typing: true, server: { status: 'saving' } }).live, ['status:●:status']);
  assert.deepEqual(slot({ typing: true, error: true }).live, ['alert:저장 확인 필요:srOnly']);
  assert.match(source, /const quietStatus = !!serverView && typing && !statusWarn && !inputLocked;/);
});
