import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { buildProgramCatalog } from '../../../lib/flow/integrated-poc/catalog';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { makeProgramOutput } from '../../../lib/flow/integrated-poc/output';
import { createTransientOutputDraft, confirmTransientOutput } from '../../../lib/flow/integrated-poc/transient-output';
import { readProgramNavigationCheckpoint } from '../../../lib/flow/integrated-poc/navigation';
import type * as Discovery from './ProgramDiscovery';
import { programRecurringScheduleFromDraft } from '../../../lib/flow/integrated-poc/public-recurrence-contract';
import { defaultProgramOutputRecurrenceWindow } from '../../../lib/flow/integrated-poc/public-output-recurrence';

const componentUrl = new URL('./ProgramDiscovery.tsx', import.meta.url); const require = createRequire(componentUrl);
const root = resolve(dirname(fileURLToPath(componentUrl)), '../../..');
const source = readFileSync(componentUrl, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
const loaded = { exports: {} as typeof Discovery };
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`, { filename: 'ProgramDiscovery.compiled.cjs' })(loaded, loaded.exports, (id: string) => {
  if (id.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) };
  return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
});
const { ProgramDiscovery, createProgramDiscoveryNavigationState, captureProgramDiscoveryPresentation, restoreProgramDiscoveryPresentation, transferProgramOutput, TransientOutputEditor, programDiscoveryHasUnstoredInput } = loaded.exports;

test('recurring detail shows the original rule/time and explicit output scope instead of undated fallback', () => {
  const input = props(), version = input.data.public.versions[0], item = version.items[0];
  item.schedule = programRecurringScheduleFromDraft({ version: 1, raw: '매주 화, 목', end: '8회', startKind: 'fixed', startValue: '2026-12-02', time: '07:00', timeZone: 'Asia/Seoul' })!;
  const state = createProgramDiscoveryNavigationState(); state.details[version.id] = { selectedItemIds: [item.id], anchor: '', format: 'ics', recurrenceWindow: { ...defaultProgramOutputRecurrenceWindow(), limit: 2 } };
  const before = JSON.stringify(input.data), html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} navigationState={state} />);
  for (const expected of ['매주 화, 목', '8회', '07:00', 'Asia/Seoul', '반복 출력 범위', '첫 회차', '회차 수', '실제 2회차', 'ICS 파일 받기', 'RDATE']) assert.ok(html.includes(expected), expected);
  assert.equal(JSON.stringify(input.data), before);
});
test('public-undated recurrence starts are optional for copying but required for calendar; choices survive history', () => {
  const input = props(), version = input.data.public.versions[0], item = version.items[0];
  item.schedule = programRecurringScheduleFromDraft({ version: 1, raw: '매일', end: '3회', startKind: 'undated', startValue: '', time: '09:00', timeZone: '' })!;
  const state = createProgramDiscoveryNavigationState(); state.details[version.id] = { selectedItemIds: [item.id], anchor: '', format: 'ics' };
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} navigationState={state} />);
  assert.ok(html.includes('시작일 ·')); assert.ok(html.includes('시작일을 정하면')); assert.ok(!html.includes('ICS 파일 받기'));
  assert.ok(!html.includes('disabled="">내 문서에 가져오기'));
  state.details[version.id].recurrenceStarts = { [item.id]: '2026-12-02' };
  state.details[version.id].recurrenceWindow = { ...defaultProgramOutputRecurrenceWindow(), limit: 0 };
  const captured = captureProgramDiscoveryPresentation(state); assert.ok(captured);
  assert.deepEqual(captured.details[version.id], state.details[version.id]);
  state.details[version.id].recurrenceWindow!.limit = 2;
  const after = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} navigationState={state} />);
  assert.ok(after.includes('ICS 파일 받기')); assert.ok(after.includes('20261202T090000')); assert.equal(captured.details[version.id].recurrenceWindow!.limit, 0);
});
test('relative recurrence exposes anchor and invalid output window does not block independent copy creation', () => {
  const input = props(), version = input.data.public.versions[0], item = version.items[0];
  item.schedule = programRecurringScheduleFromDraft({ version: 1, raw: '매일', end: '3회', startKind: 'relative', startValue: '-2', time: '', timeZone: '' })!;
  const state = createProgramDiscoveryNavigationState(); state.details[version.id] = { selectedItemIds: [item.id], anchor: '2026-12-03', format: 'ics', recurrenceWindow: { ...defaultProgramOutputRecurrenceWindow(), limit: 0 } };
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} navigationState={state} />);
  assert.ok(html.includes('type="date" value="2026-12-03"')); assert.ok(html.includes('입력값을 자동으로 줄이지 않았습니다'));
  assert.ok(!html.includes('ICS 파일 받기')); assert.ok(!html.includes('disabled="">내 문서에 가져오기'));
});

test('unload warning covers raw and output drafts but not public search presentation', () => {
  const state = createProgramDiscoveryNavigationState();
  state.query = '공개 검색'; state.category = '생활'; state.lastFlowId = 'public-flow';
  assert.equal(programDiscoveryHasUnstoredInput(state), false);
  for (const change of [{ url: 'https://example.com/a' }, { pastedText: ' ' }, { pastedTitle: '출력할 제목' }])
    assert.equal(programDiscoveryHasUnstoredInput({ ...state, ...change }), true);
  const made = createTransientOutputDraft('메모', { id: 'draft-warning', title: '제목', sourceUrl: '' }, '2026-09-12T00:00:00.000Z'); assert(made.ok);
  assert.equal(programDiscoveryHasUnstoredInput({ ...state, transient: made.draft }), true);
  assert.equal(programDiscoveryHasUnstoredInput(state), false);
});
function fixture() {
  const data = createProgramData(); const catalog = buildProgramCatalog(data.activeActorId); data.public.flows = catalog.flows; data.public.versions = catalog.versions;
  return { data, catalog };
}
function props(): Discovery.ProgramDiscoveryProps {
  return { data: fixture().data, mutate: async () => { assert.fail('render must not mutate'); }, navigate: () => { assert.fail('render must not navigate'); },
    today: '2026-09-12', onUseVersion: async () => { assert.fail('render must not save copy'); }, onStartText: async () => { assert.fail('render must not create document'); } };
}

test('empty initial source stays compact, but title-only, raw-only and output draft retain input access', () => {
  const input = props(), render = (state: Discovery.ProgramDiscoveryNavigationState) => renderToStaticMarkup(<ProgramDiscovery {...input} navigationState={state} />);
  const empty = createProgramDiscoveryNavigationState();
  assert(!render(empty).includes('확인할 원문'));
  const made = createTransientOutputDraft('출력 원문', { id: 'retained-output', title: '출력', sourceUrl: '' }, '2026-09-14T00:00:00.000Z'); assert(made.ok);
  for (const patch of [{ pastedTitle: '남은 제목' }, { pastedText: '남은 원문\n ' }, { transient: made.draft }]) {
    const state = { ...empty, ...patch }, before = JSON.stringify(state), html = render(state);
    assert(html.includes('확인할 원문')); assert(html.includes('문서 제목'));
    assert(programDiscoveryHasUnstoredInput(state)); assert.equal(JSON.stringify(state), before);
  }
});

test('retained input coexists with a newly checked known source without claiming it was extracted', () => {
  const input = props(), version = input.data.public.versions.find(v => v.source.url)!;
  assert(version);
  const state = { ...createProgramDiscoveryNavigationState(), url: version.source.url!, checkedUrl: version.source.url!, pastedTitle: '다른 원문의 제목', pastedText: '개인 원문 그대로' };
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} navigationState={state} />);
  assert(html.includes('이 출처로 정리된 자료가 있습니다'));
  assert(html.includes('확인할 원문')); assert(html.includes('개인 원문 그대로')); assert(html.includes('다른 원문의 제목'));
});

test('actual source input handlers preserve other draft fields across URL changes and clear protection only when all input is empty', () => {
  const ast = ts.createSourceFile('ProgramDiscovery.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const find = (predicate: (node: ts.Node) => boolean) => { let found: ts.Node | undefined; const visit = (node: ts.Node) => { if (predicate(node)) { found = node; return; } if (!found) ts.forEachChild(node, visit); }; visit(ast); assert(found); return found; };
  const updateNode = find(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === 'update') as ts.VariableDeclaration;
  const ref = { current: { ...createProgramDiscoveryNavigationState(), url: 'https://example.com/old', checkedUrl: 'https://example.com/old', pastedTitle: '제목', pastedText: '원문\n ' } };
  const notifications: Discovery.ProgramDiscoveryNavigationState[] = [];
  const updateCode = ts.transpileModule(`const update=${updateNode.initializer!.getText(ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const update = new Function('stateRef', 'setLocal', 'onNavigationStateChange', `${updateCode};return update;`)(ref, () => {}, (state: Discovery.ProgramDiscoveryNavigationState) => notifications.push(state));
  const change = (field: string, value: string) => {
    const attr = find(node => ts.isJsxAttribute(node) && node.name.getText(ast) === 'onChange' && node.initializer?.getText(ast).includes(`${field}: event.target.value`) === true) as ts.JsxAttribute;
    const expression = (attr.initializer as ts.JsxExpression).expression!.getText(ast);
    const code = ts.transpileModule(`const handler=${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('update', `${code};return handler;`)(update)({ target: { value } });
  };
  const input = props();
  for (const nextUrl of ['https://example.com/new', '']) {
    change('url', nextUrl);
    assert.equal(ref.current.checkedUrl, null); assert.equal(ref.current.pastedTitle, '제목'); assert.equal(ref.current.pastedText, '원문\n ');
    const html = renderToStaticMarkup(<ProgramDiscovery {...input} navigationState={ref.current} />);
    assert(html.includes('확인할 원문')); assert(!html.includes('이 출처로 정리된 자료가 있습니다'));
    if (nextUrl) assert(!html.includes('URL을 사용하지 않고 원문을 직접 넣을 수 있습니다'));
  }
  change('pastedText', ''); assert(programDiscoveryHasUnstoredInput(ref.current));
  change('pastedTitle', ''); assert(!programDiscoveryHasUnstoredInput(ref.current));
  assert(!renderToStaticMarkup(<ProgramDiscovery {...input} navigationState={ref.current} />).includes('확인할 원문'));
  assert.equal(notifications.length, 4);
});

test('catalog renders real source-backed choices, review status and separate saved search without invented usage counters', () => {
  const html = renderToStaticMarkup(<ProgramDiscovery {...props()} />);
  assert.ok(html.includes('이사 D-30 준비 Flow')); assert.ok(html.includes('치앙마이 혼자 여행')); assert.ok(html.includes('24개 항목'));
  assert.ok(html.includes('출처 재검토 필요')); assert.ok(html.includes('기존 내 Flow')); assert.ok(html.includes('공개 URL에서 시작'));
  assert.equal(html.includes('1460'), false); assert.equal(html.includes('480명이'), false);
});

test('controlled navigation state restores query/category/situation and preserves empty results', () => {
  const state = createProgramDiscoveryNavigationState(); state.query = '혼자'; state.category = '여행/장기체류'; state.situation = '치앙마이';
  const filtered = renderToStaticMarkup(<ProgramDiscovery {...props()} navigationState={state} />);
  assert.ok(filtered.includes('value="혼자"')); assert.ok(filtered.includes('치앙마이 혼자 여행 준비물 체크 Flow')); assert.equal(filtered.includes('>이사 D-30 준비 Flow<'), false);
  state.query = '없을문자열'; const empty = renderToStaticMarkup(<ProgramDiscovery {...props()} navigationState={state} />);
  assert.ok(empty.includes('맞는 자료가 없습니다')); assert.ok(empty.includes('검색 조건 지우기'));
});

test('detail retains version/source/selection and shows file bytes with standalone output before personal copy', () => {
  const input = props(); const version = input.data.public.versions[0]; const state = createProgramDiscoveryNavigationState();
  state.details[version.id] = { selectedItemIds: version.items.slice(0, 2).map(row => row.id), anchor: '2026-10-15', format: 'ics' };
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={version.flowId} navigationState={state} />);
  assert.ok(html.includes('원문 열기')); assert.ok(html.includes('저장소에 보관된 원문')); assert.ok(html.includes('이사일'));
  assert.ok(html.includes('value="2026-10-15"')); assert.ok(html.includes('ICS 파일 받기')); assert.ok(html.includes('실제 출력 내용'));
  assert.ok(html.includes('바이트')); assert.ok(html.includes('BEGIN:VCALENDAR')); assert.ok(html.includes('내 문서에 가져오기'));
  assert.equal((html.match(/type="checkbox" checked=""/g) ?? []).length, 2);
});

test('unsupported URL keeps pasted raw/title visible and never claims extraction or automatic Flow success', () => {
  const state = createProgramDiscoveryNavigationState(); state.url = state.checkedUrl = 'https://example.com/unsupported'; state.urlOpen = true;
  state.pastedTitle = '보관할 원문'; state.pastedText = '메모 그대로\n두 번째 줄';
  const html = renderToStaticMarkup(<ProgramDiscovery {...props()} navigationState={state} />);
  assert.ok(html.includes('내용을 가져오는 기능은 지원하지 않습니다')); assert.ok(html.includes('메모 그대로\n두 번째 줄'));
  assert.ok(html.includes('원문 확인 후 문서로 열기')); assert.ok(html.includes('자동 Flow 변환이나 출처 검증을 뜻하지 않습니다'));
});

test('missing public flow renders recovery instead of substituting unrelated source', () => {
  const html = renderToStaticMarkup(<ProgramDiscovery {...props()} selectedFlowId="deleted" />);
  assert.ok(html.includes('이 Flow를 찾을 수 없습니다')); assert.ok(html.includes('둘러보기로 돌아가기')); assert.equal(html.includes('ICS 파일 받기'), false);
});

test('archived fixed-version deep link is readable with exact item and tombstone but cannot export or import', () => {
  const input = props(), version = input.data.public.versions[0], flow = input.data.public.flows.find(row => row.id === version.flowId)!;
  const prior = { ...version, id: 'old-archived-version', title: '보관된 첫 판본', items: [{ ...version.items[0], title: '첫 판본의 정확한 항목' }] };
  input.data.public.versions.push(prior); flow.archived = true;
  const state = createProgramDiscoveryNavigationState(); state.versionByFlow[flow.id] = version.id;
  state.details[prior.id] = { selectedItemIds: [prior.items[0].id], anchor: '2026-10-15', format: 'ics' };
  const before = JSON.stringify(input.data);
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={flow.id} selectedVersionId={prior.id} selectedItemId={prior.items[0].id} navigationState={state} />);
  assert(html.includes('보관된 첫 판본')); assert(html.includes('첫 판본의 정확한 항목')); assert(html.includes('공개 목록에서 내려 보관된 Flow'));
  assert.match(html, /aria-current="location"/); assert(html.includes('읽기 전용 판본'));
  assert.doesNotMatch(html, /파일 받기|내용 복사|내 문서에 가져오기|type="checkbox"|BEGIN:VCALENDAR/);
  assert.equal(JSON.stringify(input.data), before);
  const catalog = renderToStaticMarkup(<ProgramDiscovery {...input} />);
  assert(!catalog.includes(version.title)); assert(!catalog.includes(prior.title));
});

test('archived flow without fixed version or with missing version never substitutes latest; missing item remains explicit', () => {
  const input = props(), version = input.data.public.versions[0], flow = input.data.public.flows.find(row => row.id === version.flowId)!;
  flow.archived = true;
  for (const selectedVersionId of [undefined, 'unknown-version', input.data.public.versions.find(row => row.flowId !== flow.id)!.id]) {
    const html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={flow.id} selectedVersionId={selectedVersionId} />);
    assert(html.includes('이 Flow를 찾을 수 없습니다')); assert(!html.includes('data-testid="program-flow-detail"'));
  }
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} selectedFlowId={flow.id} selectedVersionId={version.id} selectedItemId="missing-item" />);
  assert(html.includes('이 판본에서 연결된 항목을 찾을 수 없습니다')); assert(!html.includes('aria-current="location"'));
});

test('history capture excludes raw/URL/transient while reload and back restore detached public selection presentation', () => {
  const state = createProgramDiscoveryNavigationState();
  Object.assign(state, { query: '첫 이사', category: '생활', situation: '이사', lastFlowId: 'f', scrollTop: 123,
    versionByFlow: { f: 'v-old' }, details: { 'v-old': { selectedItemIds: ['item-b'], anchor: '2026-10-15', format: 'ics' } },
    url: 'https://private.example/path', checkedUrl: 'https://private.example/path', pastedTitle: '비공개 제목', pastedText: '비공개 원문' });
  const made = createTransientOutputDraft(state.pastedText, { id: 'transient', title: state.pastedTitle, sourceUrl: state.url }, '2026-09-12T00:00:00.000Z'); assert(made.ok);
  state.transient = made.draft; state.transientSource = { text: state.pastedText, title: state.pastedTitle, url: state.url };
  const captured = captureProgramDiscoveryPresentation(state); assert(captured);
  assert.doesNotMatch(JSON.stringify(captured), /비공개|private\.example|transient|pasted|checkedUrl|urlOpen/);
  const checkpoint = readProgramNavigationCheckpoint(JSON.parse(JSON.stringify({ schema: 'flowme-navigation/1', actorId: 'local-user',
    location: '#flowme/discover', scroll: 0, focus: null, discovery: captured })), 'local-user', '#flowme/discover'); assert(checkpoint);
  const reload = restoreProgramDiscoveryPresentation(createProgramDiscoveryNavigationState(), checkpoint, 'local-user'); assert(reload);
  assert.deepEqual(captureProgramDiscoveryPresentation(reload), captured); assert.equal(reload.pastedText, ''); assert.equal(reload.transient, null);
  const back = restoreProgramDiscoveryPresentation(state, checkpoint, 'local-user'); assert(back);
  assert.equal(back.transient, state.transient); assert.equal(back.pastedText, state.pastedText);
  assert.equal(restoreProgramDiscoveryPresentation(state, checkpoint, 'participant-jihun'), null);
  back.details['v-old'].selectedItemIds.push('private-change'); assert.deepEqual(checkpoint.discovery?.details['v-old'].selectedItemIds, ['item-b']);
});

test('calendar output limitations do not block copying undated content into a personal document', () => {
  const input = props(); const version = input.data.public.versions[0];
  version.items = [{ ...version.items[0], schedule: { kind: 'undated' } }];
  const state = createProgramDiscoveryNavigationState(); state.details[version.id] = { selectedItemIds: [version.items[0].id], anchor: '', format: 'ics' };
  const html = renderToStaticMarkup(<ProgramDiscovery {...input} navigationState={state} selectedFlowId={version.flowId} />);
  assert.ok(html.includes('선택한 항목에 날짜가 없습니다'));
  assert.match(html, /<button type="button" class="useCopy">내 문서에 가져오기<\/button>/);
});

test('download/copy port receives exact generated bytes and result reports request rather than account import', async () => {
  const { catalog } = fixture(); const version = catalog.versions[0];
  const output = makeProgramOutput(version, { selectedItemIds: version.items.map(row => row.id), anchor: '2026-10-15', format: 'csv' }, '2026-09-12T00:00:00Z');
  assert(output.ok); let file: { filename: string; mime: string; payload: string } | undefined; let text = '';
  const port = { copyText: async (value: string) => { text = value; }, download: async (value: { filename: string; mime: string; payload: string }) => { file = value; } };
  const received = await transferProgramOutput(output, 'download', port);
  assert.deepEqual(file, { filename: output.filename, mime: output.mime, payload: output.payload });
  assert.deepEqual(received, { ok: true, bytes: new TextEncoder().encode(output.payload).byteLength, count: 24, undatedCount: 0, action: 'download-requested' });
  const copied = await transferProgramOutput(output, 'copy', port); assert.equal(text, output.payload); assert(copied.ok); assert.equal(copied.action, 'copied');
});

test('invalid output and failed transfer never report success or invoke an unrelated port', async () => {
  let calls = 0; const port = { copyText: async () => { calls++; throw new Error('clipboard'); }, download: async () => { calls++; throw new Error('download'); } };
  assert.deepEqual(await transferProgramOutput({ ok: false, reason: 'no-items' }, 'download', port), { ok: false, reason: 'no-items' }); assert.equal(calls, 0);
  const { catalog } = fixture(); const version = catalog.versions[0]; const output = makeProgramOutput(version, { selectedItemIds: [version.items[0].id], anchor: '2026-10-15', format: 'txt' }, '2026-09-12T00:00:00Z');
  assert.deepEqual(await transferProgramOutput(output, 'copy', port), { ok: false, reason: 'copy-failed' });
  assert.deepEqual(await transferProgramOutput(output, 'download', port), { ok: false, reason: 'download-failed' }); assert.equal(calls, 2);
});

test('unsupported original has a standalone output path with optional personal save, and render invokes zero writers', () => {
  const state = createProgramDiscoveryNavigationState(); state.url = state.checkedUrl = 'https://example.com/unsupported'; state.urlOpen = true; state.pastedText = '보존할 원문\n다음 문장'; state.pastedTitle = '출력 제목';
  const made = createTransientOutputDraft(state.pastedText, { id: 'transient-ui', title: state.pastedTitle, sourceUrl: state.url }, '2026-09-12T00:00:00.000Z'); assert(made.ok);
  state.transient = made.draft; state.transientSource = { text: state.pastedText, title: state.pastedTitle, url: state.url };
  const html = renderToStaticMarkup(<ProgramDiscovery {...props()} navigationState={state} />);
  assert(html.includes('이 출력 내용 확정')); assert(html.includes('실제 출력 미리보기')); assert(html.includes('개인 문서로도 보관하기 · 선택')); assert(html.includes('새로고침하거나 창을 닫으면 사라집니다'));
  assert(html.includes('보존할 원문')); assert(!html.includes('TXT 파일 받기')); assert(html.includes('원문으로 출력 초안 다시 만들기'));
});

test('confirmed transient output can download, but stale source or edited content hides the download controls', () => {
  const made = createTransientOutputDraft('내용', { id: 'transient-ui', title: '제목', sourceUrl: '' }, '2026-09-12T00:00:00.000Z'); assert(made.ok);
  const confirmed = confirmTransientOutput(made.draft, '2026-09-12T00:00:00.000Z'); assert(confirmed.ok);
  const props = { draft: confirmed.draft, stale: false, onChange: () => assert.fail('SSR writer'), onDiscard: () => assert.fail('SSR discard') };
  assert(renderToStaticMarkup(<TransientOutputEditor {...props} />).includes('TXT 파일 받기'));
  const stale = renderToStaticMarkup(<TransientOutputEditor {...props} stale />); assert(!stale.includes('TXT 파일 받기')); assert(stale.includes('이전 결과는 받을 수 없습니다'));
  const edited = renderToStaticMarkup(<TransientOutputEditor {...props} draft={{ ...confirmed.draft, title: '수정한 제목' }} />); assert(!edited.includes('TXT 파일 받기')); assert(edited.includes('이 출력 내용 확정'));
});
