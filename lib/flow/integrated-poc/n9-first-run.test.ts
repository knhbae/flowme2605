import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { alphaRouteDecision } from './alpha-route-guard';
import { programLineDateChips } from './task-date-move';
import { textEditorRows, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// N9 (11/4): first-run polish U46~U52 (U49 stays), a subcheck's tap completes it, date chips in the line menu,
// the 복구함's way to 보관함, and home screen icons. The saved format does not change.
const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
const host = read('../../../components/flow/integrated-poc/AlphaWorkspace.tsx');
const worker = read('./writing-compute.worker.ts');
const TODAY = '2026-11-04';

const DOC = 'doc-n9';
function written(raw: string): TextWorkspaceState {
  const empty = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [{ id: DOC, title: 'N9 문서', folder: '합성', folderId: 'f', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  const result = M.editTextResult(empty, DOC, raw, { folderText: true }); assert.equal(result.reason, null); return result.state;
}

test('subchecks: eight boxes are eight taps, each one a record the C2 rule and the validator accept', () => {
  const names = ['여권', '충전기', '양말', '세면도구', '우산', '약', '이어폰', '책'];
  let state = written(['- [ ] 여행 짐', ...names.map(name => `  - [ ] ${name}`)].join('\n'));
  const subchecks = textEditorRows(state, DOC).filter(row => row.kind === 'subcheck');
  assert.equal(subchecks.length, 8);
  for (const row of subchecks) {
    // The editor's tap: 0% becomes 100% today on the subcheck's own record (programDirectCheckboxChange / the worker).
    assert.equal(M.currentProgress(state, row.progressTargetId!), 0);
    const next = M.recordProgress(state, row.progressTargetId!, TODAY, 100);
    assert.notEqual(next, state); assert(M.validate(next)); state = next;
  }
  assert.equal(M.raw(M.getDocument(state, DOC)), ['- [ ] 여행 짐', ...names.map(name => `  - [x] ${name}`)].join('\n'), 'the parent stays as it was');
  // The latest record is 100 exactly where the box shows [x] (C2), so the server's validation passes too.
  for (const row of subchecks) assert.deepEqual(M.latestProgress(state, row.progressTargetId!), { date: TODAY, percent: 100 });
  // A second tap (or 되돌리기) puts 0% back on the same day's record and clears the box.
  const undone = M.recordProgress(state, subchecks[2].progressTargetId!, TODAY, 0);
  assert(M.validate(undone));
  assert.equal(M.raw(M.getDocument(undone, DOC)).split('\n')[3], '  - [ ] 양말');
});

test('subchecks: the editor and the worker toggle them; partial or future progress still opens the form', () => {
  const action = editor.slice(editor.indexOf('export function programCheckboxAction('), editor.indexOf('export function programDirectCheckboxChange('));
  assert(!action.includes("meta.kind === 'subcheck' && !meta.isCanonical"), 'a plain subcheck no longer opens the progress form');
  assert(action.includes("['task', 'reference', 'subcheck'].includes(meta.kind) ? 'toggle'"));
  assert(action.includes("(meta.progressDate ?? '') > date") && action.includes('meta.progressPercent !== 0 && meta.progressPercent !== 100'));
  const direct = editor.slice(editor.indexOf('export function programDirectCheckboxChange('), editor.indexOf('/** A checkbox line'));
  assert(!direct.includes("reason: 'subcheck'"));
  assert(!worker.includes("panel:'subcheck'"));
  assert(worker.includes("if(row?.kind!=='task'&&row?.kind!=='subcheck'||!target)value={ok:false,reason:'blocked'};"));
});

test('date chips: 오늘, 내일 and 이번 주말 from the date sheet defaults; 날짜 고르기 is the date form', () => {
  const labels = (today: string) => programLineDateChips(today).map(chip => `${chip.label} ${chip.date}`);
  assert.deepEqual(labels(TODAY), ['오늘 2026-11-04', '내일 2026-11-05', '이번 주말 2026-11-07']);
  assert.deepEqual(labels('2026-11-07').at(-1), '이번 주말 2026-11-07', 'a Saturday is its own weekend');
  assert.deepEqual(labels('2026-11-08').at(-1), '이번 주말 2026-11-08', 'so is a Sunday');
  assert.deepEqual(labels('2026-11-09').at(-1), '이번 주말 2026-11-14');
  const menu = editor.slice(editor.indexOf('data-task-location-menu'), editor.indexOf('aria-label="이 위치에 추가"'));
  assert(menu.indexOf('programLineDateChips(today())') < menu.indexOf('>진행 기록</button>'), 'the chips come first');
  assert(menu.includes('>고르기<small>날짜·시간</small>') && menu.includes("openProgress(panel.lineId,'date')"));
  assert(menu.includes('폴더로 옮기기') && menu.includes('aria-label="옮길 날"'));
  // Canonical tasks relocate; protected exceptions retain date-only semantics with the same time.
  const chip = editor.slice(editor.indexOf('  async function applyDateChip('), editor.indexOf('  function downloadDraft('));
  assert(chip.includes("policy.kind==='move'") && chip.includes('performTaskLocation('));
  assert(chip.includes("applyDateOnly(target,value,task.time??'')"));
  const state = written('- [ ] 서류 내기\n  - 시간: 09:30');
  const id = M.tasks(state)[0].id, next = M.updateTask(state, id, { date: '2026-11-07', time: '09:30' });
  assert.equal(M.raw(M.getDocument(next, DOC)), '- [ ] 서류 내기\n  - 날짜: 2026-11-07\n  - 시간: 09:30');
});

test('first run: no 저장됨 before anything is written, the title is 쓰기, and the empty lists say what to do', () => {
  assert(host.includes('quietFresh = usesNoteChrome && serverSlot.level === 8 && snapshot?.account?.revision === 0'), 'U46: only a saved, never-written account');
  assert(host.includes("{!localParticipationRecovery && !quietFresh && <p role="));
  assert(space.includes("const noDocuments = !docs.length && !selectedDoc && !selected;") && space.includes(": noDocuments ? '쓰기' :"), 'U47');
  assert(space.includes('<h1>{props.hostMainTabs && !noDocuments'), 'U47: no ▾ list button with no document');
  assert(space.includes("'아직 글이 없습니다. ＋ 새 글로 시작하세요.'") && !space.includes('빠른 할 일을 적어보세요'), 'U48');
  assert(space.includes("'아직 할 일이 없습니다.'") && space.includes('onClick={openQuickAddFromEmpty}>할 일 추가</button>'), 'U50');
  assert(space.includes("const hasFolders = space.text.folders.some(item => item.id !== 'folder-unfiled');"), 'U51');
  assert(space.includes("(hasFolders || folderId) && <label className={styles.field}>글 안의 폴더 범위") && space.includes('{(hasFolders || folderId) && <details className={styles.folderTools}><summary>폴더 정리</summary>'));
  assert(editor.includes("const EMPTY_DOCUMENT_HINT = '여기에 적으세요.\\n할 일은 ☐ 또는 - [ ], 메뉴는 /';"), 'U52');
});

test('복구함: empty, it points to the archived documents', () => {
  assert(host.includes('보관한 문서 {archivedCount}개 → 보관함에서 보기'));
  assert(host.includes('!archiveSpace.documentTrash?.[id]'), 'the count leaves 휴지통 out, as the 보관함 list does');
  assert(space.includes("if (!await chooseMainTab('documents')) return false;\n    setShowArchived(true); openFindPanel(); return true;"));
});

test('home screen: a manifest and icons under /alpha/, no service worker', () => {
  const manifest = JSON.parse(read('../../../public/alpha/manifest.webmanifest'));
  assert.equal(manifest.start_url, '/alpha'); assert.equal(manifest.display, 'standalone');
  const size = (file: string) => { const png = readFileSync(new URL(`../../../public/alpha/${file}`, import.meta.url)); return [png.readUInt32BE(16), png.readUInt32BE(20)]; };
  for (const icon of manifest.icons) {
    assert.equal(alphaRouteDecision(icon.src), 'allow');
    assert.deepEqual(size(icon.src.slice('/alpha/'.length)), icon.sizes.split('x').map(Number));
  }
  assert(manifest.icons.some((icon: { purpose: string; sizes: string }) => icon.purpose === 'maskable' && icon.sizes === '512x512'));
  assert.equal(alphaRouteDecision('/alpha/manifest.webmanifest'), 'allow');
  assert(read('../../../app/alpha/page.tsx').includes("manifest: '/alpha/manifest.webmanifest'"));
  assert(!/serviceWorker|service-worker/.test(read('../../../app/alpha/page.tsx')));
});
