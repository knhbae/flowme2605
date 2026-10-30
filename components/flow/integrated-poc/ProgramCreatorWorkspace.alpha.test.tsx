import test from 'node:test';
import './test-css-modules';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { setProgramCreatorWorking, applyProgramCreatorAction, handoffProgramCreatorDraft } from '../../../lib/flow/integrated-poc/creator-workspace';
import { PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES as templates, fingerprintPersonalWorkspacePocAuthoringSource as fp } from '../../../lib/flow/personal-workspace-poc-authoring';
import type { ProgramCreatorWorkspaceProps } from './ProgramCreatorWorkspace';
import type { ProgramEditorFlush } from '../../../lib/flow/integrated-poc/document-action';
import type { ProgramData } from '../../../lib/flow/integrated-poc/contract';
import type { ProgramCreatorWorking } from '../../../lib/flow/integrated-poc/creator-workspace-contract';
import type { ProgramMutate } from '../../../lib/flow/integrated-poc/ui-contract';
import { isAlphaCreatorIntent, type AlphaCreatorIntent } from '../../../lib/flow/integrated-poc/alpha-creator/contract';
import { importNativeCreatorSavedHistory } from '../../../lib/flow/integrated-poc/creator-history';
import { createTextAuthoringDocument } from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/parser';
type ProgramMutationOptions = NonNullable<Parameters<ProgramMutate>[2]>;

const NOW = '2026-09-21T00:00:00.000Z', DRAFT = 'alpha-creator-ui';
const label = (value: any): string => Array.isArray(value) ? value.map(label).join('') : typeof value === 'string' || typeof value === 'number' ? String(value) : value?.props ? label(value.props.children) : '';

// Real component event handlers and domain transitions. The deterministic native
// port checks transaction requests; actual browser Undo/Redo/IME are separate QA.
function harness(initialRaw = '', initialData?: ProgramData, scope: 'local' | 'account' = 'account') {
  let data = initialData ?? createProgramData();
  if (!initialData) {
    const set = setProgramCreatorWorking(data, { actorId: data.activeActorId, expectedWorking: null,
      working: { draftId: DRAFT, title: '제작 원문', rawText: initialRaw, baseRecordRevision: null } }, NOW);
    assert(set.ok); data = set.data;
  }
  const working = data.spaces[data.activeActorId].creatorWorkspace!.working!;
  let at = 0, writes = 0, nativeEdits = 0, fail = false, mutationFailure: 'conflict'|'throw'|null = null, editorNode: any, port: ProgramEditorFlush | null = null;
  let synchronize: (() => void) | null = null;
  const slots: any[] = [], effects: (() => void)[] = [], requests: any[] = [], intents: AlphaCreatorIntent[] = [], mutations: { label: string; options: ProgramMutationOptions | undefined }[] = [];
  let snapshot = { editorId: 'alpha-creator-source', documentId: working.draftId, rawText: working.nativePendingRawText ?? working.rawText,
    sourceFingerprint: fp(working.nativePendingRawText ?? working.rawText), selectionStart: 0, selectionEnd: 0,
    selectionDirection: 'none' as const, scrollTop: 0, scrollLeft: 0, dispatchCount: 0, composing: false };
  const hooks = { ...React,
    useState: (value: any) => { const i = at++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], (next: any) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef: (value: any) => { const i = at++; return slots[i] ??= { current: value }; },
    useMemo: (fn: () => any, deps: unknown[]) => { const i=at++,prior=slots[i]; if(prior&&deps.every((dep,index)=>Object.is(dep,prior.deps[index])))return prior.value;const value=fn();slots[i]={deps,value};return value; },
    useEffect: (fn: () => void) => { at++; if (fn.toString().includes('onRegisterEditors')) effects.push(fn); if(fn.toString().includes('synchronizeCreatorWorking'))synchronize=fn; },
  };
  const url = new URL('./ProgramCreatorWorkspace.tsx', import.meta.url), require = createRequire(url), root = resolve(dirname(fileURLToPath(url)), '../../..');
  const loaded = { exports: {} as { ProgramCreatorWorkspace: (props: ProgramCreatorWorkspaceProps) => React.ReactNode } };
  const code = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInThisContext(`(function(module,exports,require){${code}\n})`)(loaded, loaded.exports, (id: string) => id === 'react' ? hooks : id.endsWith('.css') ? { __esModule: true, default: {} } : require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id));
  const handle = {
    readSnapshot: () => ({ ...snapshot }),
    focusRange: (start: number, end = start) => { snapshot = { ...snapshot, selectionStart: start, selectionEnd: end }; return true; },
    applyNativeReplacement: async (request: any) => {
      assert.deepEqual(request.expected, snapshot); requests.push(request);
      if (fail) return { ok: false, reason: 'stale-snapshot', snapshot: { ...snapshot } };
      nativeEdits++;
      const rawText = snapshot.rawText.slice(0, request.range.start) + request.replacement + snapshot.rawText.slice(request.range.end);
      snapshot = { ...snapshot, rawText, sourceFingerprint: fp(rawText), dispatchCount: snapshot.dispatchCount + 1 };
      editorNode.props.onNativeInput(snapshot, 'insertText');
      return { ok: true, snapshot: { ...snapshot } };
    },
  };
  function render() {
    at = 0;
    const tree = loaded.exports.ProgramCreatorWorkspace({ data, today: '2026-09-21', storageScope: scope, navigate: () => {},
      onRegisterEditors: next => { port = next; }, mutate: async (name, build, options) => {
        mutations.push({ label: name, options });
        const result = build(data); if (!result.ok) return { ok: false, reason: result.reason };
        const intent = typeof options?.alphaCreator === 'function' ? options.alphaCreator() : options?.alphaCreator;
        assert(isAlphaCreatorIntent(intent), `${name}: serializable creator intent required`);
        intents.push(JSON.parse(JSON.stringify(intent)));
        if(mutationFailure==='throw')throw Error('simulated-save-failure');
        if(mutationFailure==='conflict')return {ok:false,reason:'conflict'};
        if (result.changed) writes++; data = result.data; return { ok: true, result: result.result, changed: result.changed };
      } });
    const nodes: any[] = [];
    function walk(value: any) { if (Array.isArray(value)) value.forEach(walk); else if (value?.props) { nodes.push(value); walk(value.props.children); } }
    walk(tree); editorNode = nodes.find(node => node.props.label === '제작 원문' && node.props.onNativeInput); editorNode.props.ref.current = handle;
    effects.splice(0).forEach(effect => effect());
    return { nodes, buttons: (text: string) => nodes.filter(node => node.type === 'button' && label(node.props.children).startsWith(text)),
      button: (text: string) => nodes.find(node => node.type === 'button' && label(node.props.children).startsWith(text)) };
  }
  const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
  return { render, settle, requests, mutations, intents, get data() { return data; }, get writes() { return writes; }, get nativeEdits() { return nativeEdits; },
    get snapshot() { return snapshot; }, get port() { assert(port); return port; },
    fail(value: boolean) { fail = value; }, compose(value: boolean) { snapshot = { ...snapshot, composing: value }; },
    failMutation(value:'conflict'|'throw'|null){mutationFailure=value;}, synchronize(){assert(synchronize);synchronize();},
    foreign() { data = structuredClone(data); data.spaces[data.activeActorId].creatorWorkspace!.working!.title = '다른 기기 원문'; },
    serverWorking(confirmed:ProgramCreatorWorking){data=structuredClone(data);data.spaces[data.activeActorId].creatorWorkspace!.working=structuredClone(confirmed);},
    input(rawText: string, inputType = 'insertText') { snapshot = { ...snapshot, rawText, sourceFingerprint: fp(rawText), dispatchCount: snapshot.dispatchCount + 1 }; editorNode.props.onNativeInput(snapshot, inputType); },
  };
}

test('M6 imported candidates expose originals, keep older recovery read-only, and protect current input before opening',async()=>{
 const h=harness('# Current unsaved'),workspace=h.data.spaces[h.data.activeActorId].creatorWorkspace!,key='flow:poc:personal-workspace:v1:authoring-draft';
 workspace.importedWorkingCandidates={version:1,sources:{[key]:' exact original bytes '},candidates:{
  selected:{sourceKey:key,kind:'authoring',readOnly:false,working:{draftId:'imported-pending',title:'Imported pending',rawText:'  imported\r\n',baseRecordRevision:null}},
  old:{sourceKey:key,kind:'recovery',readOnly:true,working:{draftId:'old-pending',title:'Older recovery',rawText:' older ',baseRecordRevision:null}}
 }};
 const original=JSON.stringify(workspace.importedWorkingCandidates);const view=h.render();assert.equal(view.buttons('이 원문 이어 쓰기').length,1);
 assert(view.nodes.some(node=>node.type==='pre'&&label(node.props.children)===' exact original bytes '));
 view.button('이 원문 이어 쓰기').props.onClick();assert(h.render().button('계속 편집'));assert.equal(h.writes,0);
 h.render().button('계속 편집').props.onClick();assert.equal(h.writes,0);assert.equal(workspace.working!.rawText,'# Current unsaved');
 h.render().button('이 원문 이어 쓰기').props.onClick();await h.render().button('입력 버리고 열기').props.onClick();await h.settle();
 assert.equal(h.writes,1);assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText,'  imported\r\n');
 assert.equal(JSON.stringify(h.data.spaces[h.data.activeActorId].creatorWorkspace!.importedWorkingCandidates),original);
 assert.equal(h.intents.at(-1)?.type,'working');
});

test('M4 UI scaffold selection inserts each approved empty skeleton once and restores first title caret', async () => {
  for (const [index, template] of templates.entries()) {
    const h = harness(), view = h.render();
    assert.equal(h.writes, 0); assert.equal(h.nativeEdits, 0);
    const select = view.buttons('빈 틀 넣기')[index].props.onClick;
    await Promise.all([select(), select()]); await h.settle();
    assert.equal(h.nativeEdits, 1); assert.equal(h.snapshot.rawText, template.scaffold);
    assert.equal(h.snapshot.selectionStart, 2); assert.equal(h.snapshot.selectionEnd, 2);
    assert.deepEqual(h.requests[0].range, { start: 0, end: 0 });
    assert.equal(h.writes, 0); assert(!h.render().button('확인한 내용으로 원문 바꾸기'));
    await h.port.flushAll();
    assert.equal(h.writes, 1); assert.equal(Object.keys(h.data.spaces[h.data.activeActorId].creatorWorkspace!.library.records).length, 0);
    h.render(); h.input('', 'historyUndo'); await h.port.flushAll();
    assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText, '');
    h.render(); h.input(template.scaffold, 'historyRedo'); await h.port.flushAll();
    assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText, template.scaffold);
    assert.equal(h.nativeEdits, 1);
  }
});

test('M4 UI scaffold refuses nonempty, whitespace, IME, changed account state and stale native transaction', async () => {
  for (const condition of ['nonempty', 'whitespace', 'ime', 'foreign', 'native-stale'] as const) {
    const h = harness(condition === 'nonempty' ? '# 개인 원문' : condition === 'whitespace' ? ' ' : '');
    const view = h.render(), before = h.snapshot.rawText;
    if (condition === 'ime') h.compose(true);
    if (condition === 'foreign') { h.foreign(); h.render(); }
    if (condition === 'native-stale') h.fail(true);
    await view.buttons('빈 틀 넣기')[0].props.onClick(); await h.settle();
    assert.equal(h.nativeEdits, 0, condition); assert.equal(h.writes, 0, condition); assert.equal(h.snapshot.rawText, before, condition);
  }
});

test('M4 UI complete example remains a separate preview and cancel does not insert or save', () => {
  const h = harness(); h.render().buttons('예시 확인')[0].props.onClick();
  assert(h.render().button('확인한 구조 예시로 시작')); assert.equal(h.nativeEdits, 0); assert.equal(h.writes, 0);
  h.render().button('취소').props.onClick(); assert(!h.render().button('확인한 구조 예시로 시작'));
});

test('M4 UI recovery port captures a detached creator working context without making a saved revision', () => {
  const h = harness('# 원문'); h.render(); h.input('# 원문\n아직 보관하지 않은 한글'); h.render();
  const captured = h.port.captureCreatorWorking?.(); assert(captured);
  assert.equal(captured.rawText, '# 원문\n아직 보관하지 않은 한글'); assert.equal(captured.baseRecordRevision, null);
  captured.title = '외부 변경'; assert.notEqual(h.port.captureCreatorWorking?.()?.title, captured.title);
  assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText, '# 원문'); assert.equal(h.writes, 0);
});

function nativeHistoryData() {
  const before = createTextAuthoringDocument('# 이전 원문\r\n- [ ] 한글 준비', { documentId: 'original-history-document', ownership: 'creator', now: NOW });
  const after = createTextAuthoringDocument('# 현재 원문\n- [ ] 다음 준비', { documentId: before.documentId, ownership: 'creator', now: NOW });
  const raw = JSON.stringify({ schemaVersion: 1, drafts: { original: { draftId: 'original', title: '원래 제작 자료', ownership: 'creator', status: 'draft',
    document: after, revisionId: after.revision.revisionId, history: [
      { versionId: 'original-save-1', kind: 'saved', savedAt: NOW, revisionId: before.revision.revisionId, document: before },
      { versionId: 'original-save-2', kind: 'saved', savedAt: NOW, revisionId: after.revision.revisionId, document: after },
    ] } }, recoveries: {} });
  const data = createProgramData(), actorId = data.activeActorId;
  const imported = importNativeCreatorSavedHistory(data, { actorId, requestId: 'history-fixture', draftId: 'original', expectedSpace: data.spaces[actorId], expectedRaw: raw }, raw, NOW);
  assert(imported.ok); return { data: imported.data, before };
}

test('M4 account history preview and full native restore never read the original device storage', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window'); let reads = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { get localStorage() { reads++; throw Error('other-device-storage-unavailable'); } } });
  try {
    const fixture = nativeHistoryData(), h = harness('', fixture.data);
    h.render().button('기존 저장 original-save-1').props.onClick();
    assert(h.render().button('이 저장본의 원문·제작 설정으로 복구')); assert.equal(h.writes, 0); assert.equal(reads, 0);
    h.render().button('저장본 비교 닫기').props.onClick(); assert.equal(h.writes, 0);
    h.render().button('기존 저장 original-save-1').props.onClick();
    await h.render().button('이 저장본의 원문·제작 설정으로 복구').props.onClick(); await h.settle();
    const working = h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!;
    assert.equal(h.writes, 1); assert.equal(reads, 0); assert.equal(working.rawText, fixture.before.rawText);
    assert.deepEqual(working.nativeDocument!.document, fixture.before);
    assert.equal(working.nativeSelection && 'versionId' in working.nativeSelection && working.nativeSelection.versionId, 'original-save-1');
    assert.equal(h.intents[0].type, 'history-restore');
  } finally { if (descriptor) Object.defineProperty(globalThis, 'window', descriptor); else Reflect.deleteProperty(globalThis, 'window'); }
});

test('M4 library intent captures the actual post-flush source and leaves working autosave distinct from explicit save', async () => {
  const h = harness('# 초기\n- [ ] 초기 항목'); h.render(); h.input('# 변경\n- [ ] 새 한글 항목');
  await h.render().button('제작 초안 저장').props.onClick(); await h.settle();
  assert.deepEqual(h.intents.map(intent => intent.type), ['working', 'library-action']);
  const intent = h.intents[1]; assert(intent.type === 'library-action' && intent.action.type === 'save');
  assert.equal(intent.action.rawText, '# 변경\n- [ ] 새 한글 항목');
  assert.equal(h.mutations[0].options?.history, false); assert.notEqual(h.mutations[1].options?.history, false);
  assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.library.records[DRAFT].rawText, intent.action.rawText);
});

function rawUpdateData() {
  const source='# 준비\n## 구간\n- [ ] 한글 준비\n  - 날짜: 2026-09-24\n  - 설명: 이전 설명';
  function save(data:ProgramData,rawText:string){
    const actorId=data.activeActorId,workspace=data.spaces[actorId].creatorWorkspace,revision=workspace?.library.records[DRAFT]?.recordRevision;
    const opened=setProgramCreatorWorking(data,{actorId,expectedWorking:workspace?.working??null,working:{draftId:DRAFT,title:'개인 업데이트',rawText,baseRecordRevision:revision??null}},NOW);assert(opened.ok);
    const saved=applyProgramCreatorAction(opened.data,{actorId,requestId:`fixture-save-${revision??0}`,action:{type:'save',draftId:DRAFT,title:'개인 업데이트',rawText,sourceFingerprint:fp(rawText),expectedLibraryRevision:opened.data.spaces[actorId].creatorWorkspace!.library.revision,...(revision?{expectedRecordRevision:revision}:{}),now:NOW}},NOW);assert(saved.ok);return saved.data;
  }
  const first=save(createProgramData(),source);
  const handed=handoffProgramCreatorDraft(first,{actorId:first.activeActorId,requestId:'fixture-handoff',draftId:DRAFT,expectedRecordRevision:1,today:'2026-09-21'},NOW);assert(handed.ok);
  return save(handed.data,source.replace('이전 설명','새 설명').replace('2026-09-24','2026-09-25'));
}
function formControl(view:ReturnType<ReturnType<typeof harness>['render']>,text:string,type:'input'|'select'){
  const parent=view.nodes.find(node=>node.type==='label'&&label(node.props.children).startsWith(text));assert(parent,`label ${text}`);
  const control=React.Children.toArray(parent.props.children).find((node:any)=>node.type===type) as any;assert(control,`${text} ${type}`);return control;
}
function rawComparison(port:ProgramEditorFlush){
  const draft=port.captureDrafts?.().find(row=>row.title.includes('개인 업데이트 비교 선택'));assert(draft);return JSON.parse(draft.raw);
}

test('M4 stable port immediately captures raw update choices and blocks transitions until explicit cancellation',async()=>{
  const h=harness('',rawUpdateData());h.render();const stablePort=h.port;
  assert.equal(stablePort.hasPendingInput?.(),false);
  h.render().button('개인 수정과 새 제작 내용 비교').props.onClick();
  assert.equal(stablePort.hasPendingInput?.(),true);const rowId=rawComparison(stablePort).preview.rows[0].id;
  const incoming=h.render().nodes.filter(node=>node.type==='input'&&node.props.name===`creator-source-${rowId}`)[1];incoming.props.onChange();
  assert.equal(rawComparison(stablePort).choices[rowId].source,'incoming');
  formControl(h.render(),'실행 날짜','select').props.onChange({target:{value:'incoming'}});
  assert.deepEqual(rawComparison(stablePort).choices[rowId],{source:'incoming',date:'incoming',time:'keep',children:'keep'});
  assert.equal(h.port,stablePort);assert.equal(await stablePort.flushAll(),false);
  h.render().button('제작 초안 저장').props.onClick();h.render().button('빈 제작 원문 만들기').props.onClick();
  h.render().button('Program 저장 1').props.onClick();h.render().button('제작 초안').props.onClick();await h.settle();
  assert.equal(h.writes,0);assert.equal(h.mutations.length,0);assert(!h.render().button('이 저장본의 원문으로 복구'));
  assert.equal(h.render().button('원문').props['aria-current'],'page');
  h.foreign();h.render();h.synchronize();assert.equal(stablePort.captureCreatorWorking?.()?.title,'개인 업데이트');
  assert.equal(rawComparison(stablePort).choices[rowId].date,'incoming');
  h.render().button('모두 유지하고 비교 닫기').props.onClick();h.render();
  assert.equal(stablePort.hasPendingInput?.(),false);assert.equal(stablePort.captureDrafts?.().some(row=>row.title.includes('개인 업데이트 비교 선택')),false);
  assert.equal(stablePort.captureCreatorWorking?.()?.title,'다른 기기 원문');assert.equal(h.writes,0);
});

test('M4 failed raw update apply retains the exact preview and choices; success and Escape clear both',async()=>{
  const h=harness('',rawUpdateData());h.render().button('개인 수정과 새 제작 내용 비교').props.onClick();
  const rowId=rawComparison(h.port).preview.rows[0].id;
  h.render().nodes.filter(node=>node.type==='input'&&node.props.name===`creator-source-${rowId}`)[1].props.onChange();
  const captured=rawComparison(h.port),before=JSON.stringify(h.data.spaces[h.data.activeActorId]);
  for(const failure of ['conflict','throw'] as const){
    h.failMutation(failure);h.render().button('선택한 변경만 한 번 적용').props.onClick();await h.settle();h.render();
    assert.equal(h.writes,0);assert.equal(JSON.stringify(h.data.spaces[h.data.activeActorId]),before);
    assert.equal(h.port.hasPendingInput?.(),true);assert.deepEqual(rawComparison(h.port),captured);
  }
  h.failMutation(null);h.render().button('선택한 변경만 한 번 적용').props.onClick();await h.settle();h.render();
  assert.equal(h.writes,1);assert.equal(h.port.hasPendingInput?.(),false);
  assert.equal(h.port.captureDrafts?.().some(row=>row.title.includes('개인 업데이트 비교 선택')),false);
  const second=harness('',rawUpdateData());second.render().button('개인 수정과 새 제작 내용 비교').props.onClick();
  let prevented=false;second.render().nodes.find(node=>node.props['aria-label']==='제작 업데이트 선택 비교').props.onKeyDown({key:'Escape',preventDefault(){prevented=true;}});
  assert(prevented);assert.equal(second.port.hasPendingInput?.(),false);assert.equal(second.writes,0);
});

test('M4 unapplied property values are captured immediately and never auto-applied by save, leave or failed native apply',async()=>{
  const h=harness('# 원문\n- [ ] 준비');h.render();const stablePort=h.port;
  formControl(h.render(),'대상 항목','select').props.onChange({target:{value:'2'}});
  formControl(h.render(),'속성','select').props.onChange({target:{value:'place'}});
  formControl(h.render(),'값','input').props.onChange({target:{value:'아직 적용하지 않은 도서관'}});
  const captured=stablePort.captureDrafts?.().find(row=>row.title.includes('미반영 속성 입력'));assert(captured);
  assert.deepEqual(JSON.parse(captured.raw).property,{line:'2',key:'place',value:'아직 적용하지 않은 도서관'});
  assert.equal(stablePort.hasPendingInput?.(),true);assert.equal(await stablePort.flushAll(),false);
  h.render().button('제작 초안 저장').props.onClick();h.render().button('빈 제작 원문 만들기').props.onClick();h.render().button('결과').props.onClick();await h.settle();
  assert.equal(h.writes,0);assert.equal(h.nativeEdits,0);assert.equal(h.render().button('원문').props['aria-current'],'page');
  h.fail(true);h.render().button('원문 속성에 적용').props.onClick();await h.settle();h.render();
  assert.equal(h.nativeEdits,0);assert.equal(stablePort.hasPendingInput?.(),true);
  assert.equal(stablePort.captureDrafts?.().find(row=>row.title.includes('미반영 속성 입력'))?.raw,captured.raw);
  h.foreign();h.render();h.synchronize();assert.equal(stablePort.captureCreatorWorking?.()?.title,'제작 원문');
  h.render().button('속성 입력 취소').props.onClick();h.render();
  assert.equal(stablePort.hasPendingInput?.(),false);assert.equal(formControl(h.render(),'값','input').props.value,'');assert.equal(h.writes,0);
});

test('M4 property application only clears its auxiliary after a successful native replacement',async()=>{
  const h=harness('# 원문\n- [ ] 준비');h.render();
  formControl(h.render(),'대상 항목','select').props.onChange({target:{value:'2'}});
  formControl(h.render(),'속성','select').props.onChange({target:{value:'place'}});
  formControl(h.render(),'값','input').props.onChange({target:{value:'도서관'}});
  h.render().button('원문 속성에 적용').props.onClick();await h.settle();h.render();
  assert.equal(h.nativeEdits,1);assert.match(h.snapshot.rawText,/장소: 도서관/u);
  assert.equal(h.port.captureDrafts?.().some(row=>row.title.includes('미반영 속성 입력')),false);
  assert.equal(formControl(h.render(),'값','input').props.value,'');assert.equal(await h.port.flushAll(),true);assert.equal(h.writes,1);
});

test('M4 exact creator receipt retry acknowledges baseline without a native remount or write and permits the next edit',async()=>{
  const h=harness('# 이전 원문');h.render();const stablePort=h.port;
  h.input('# 서버에 저장됐지만 응답이 끊긴 원문');h.render();const confirmed=stablePort.captureCreatorWorking?.();assert(confirmed);
  h.failMutation('conflict');assert.equal(await stablePort.flushAll(),false);assert.equal(stablePort.hasPendingInput?.(),true);
  // The server committed, but the editor did not receive the first receipt.
  h.serverWorking(confirmed);h.failMutation(null);const before=h.render(),editor=before.nodes.find(node=>node.props.label==='제작 원문'),snapshot={...h.snapshot};
  assert.equal(stablePort.acceptConfirmedCreatorWorking?.(structuredClone(confirmed)),true);
  assert.equal(stablePort.hasPendingInput?.(),false);assert.equal(h.writes,0);assert.equal(h.nativeEdits,0);assert.deepEqual(h.snapshot,snapshot);
  assert.equal(h.render().nodes.find(node=>node.props.label==='제작 원문').key,editor.key);assert.equal(h.port,stablePort);
  assert.equal(stablePort.acceptConfirmedCreatorWorking?.(structuredClone(confirmed)),true);assert.equal(h.writes,0);
  h.input('# 확인 뒤 계속 쓴 원문');h.render();assert.equal(await stablePort.flushAll(),true);
  assert.equal(h.writes,1);assert.equal(h.data.spaces[h.data.activeActorId].creatorWorkspace!.working!.rawText,'# 확인 뒤 계속 쓴 원문');
});

test('M4 receipt acknowledgment never accepts an older input or raw-only metadata match',async()=>{
  const h=harness('# 이전 원문');h.render();h.input('# 첫 요청 원문');h.render();const confirmed=h.port.captureCreatorWorking?.();assert(confirmed);
  assert.equal(h.port.acceptConfirmedCreatorWorking?.({...confirmed,title:'서버의 다른 제목'}),false);
  assert.equal(h.port.acceptConfirmedCreatorWorking?.({...confirmed,baseRecordRevision:5}),false);
  assert.equal(h.port.acceptConfirmedCreatorWorking?.(null),false);assert.equal(h.port.hasPendingInput?.(),true);
  h.input('# 응답 전에 더 쓴 원문');h.render();assert.equal(h.port.acceptConfirmedCreatorWorking?.(confirmed),false);
  assert.equal(h.port.captureCreatorWorking?.()?.rawText,'# 응답 전에 더 쓴 원문');assert.equal(h.writes,0);assert.equal(h.nativeEdits,0);
  const native=harness('',nativeHistoryData().data);native.render().button('기존 저장 original-save-1').props.onClick();
  native.render().button('이 저장본의 원문·제작 설정으로 복구').props.onClick();await native.settle();native.render();
  const nativeConfirmed=native.port.captureCreatorWorking?.(),writes=native.writes;assert(nativeConfirmed?.nativeDocument);
  const altered=structuredClone(nativeConfirmed);altered.nativeDocument!.id='different-canonical-owner';
  assert.equal(native.port.acceptConfirmedCreatorWorking?.(altered),false);assert.equal(native.writes,writes);
});

test('M4 receipt acknowledgment preserves composition, locks, raw comparison choices and unapplied property input',()=>{
  const h=harness('# 원문\n- [ ] 준비');h.render();h.input('# 원문\n- [ ] 새 준비');h.render();const confirmed=h.port.captureCreatorWorking?.();assert(confirmed);
  h.compose(true);assert.equal(h.port.acceptConfirmedCreatorWorking?.(confirmed),false);h.compose(false);
  const release=h.port.lockInput();assert.equal(h.port.acceptConfirmedCreatorWorking?.(confirmed),false);release();
  formControl(h.render(),'값','input').props.onChange({target:{value:'아직 적용하지 않은 값'}});
  const captured=h.port.captureDrafts?.();assert.equal(h.port.acceptConfirmedCreatorWorking?.(confirmed),false);assert.deepEqual(h.port.captureDrafts?.(),captured);
  h.render().button('속성 입력 취소').props.onClick();h.render();assert.equal(h.port.acceptConfirmedCreatorWorking?.(confirmed),true);assert.equal(h.writes,0);
  const comparison=harness('',rawUpdateData());comparison.render().button('개인 수정과 새 제작 내용 비교').props.onClick();
  const context=comparison.port.captureCreatorWorking?.();assert(context);const choices=rawComparison(comparison.port);
  assert.equal(comparison.port.acceptConfirmedCreatorWorking?.(context),false);assert.deepEqual(rawComparison(comparison.port),choices);assert.equal(comparison.port.hasPendingInput?.(),true);
});
