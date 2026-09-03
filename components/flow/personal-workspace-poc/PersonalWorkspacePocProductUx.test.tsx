import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file: string) => readFileSync(file, 'utf8');

const authoring = read('components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx');
const workspace = read('components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx');
const editor = read('components/flow/personal-workspace-poc/PersonalWorkspacePocEditorSurface.tsx');
const receipt = read('components/flow/personal-workspace-poc/PersonalWorkspacePocReceiptSurface.tsx');
const result = read('components/flow/personal-workspace-poc/PersonalWorkspacePocResultPresenter.tsx');
const standaloneApp = read('docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js');
const standaloneShell = read('docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/standalone-shell.html');

test('default product surfaces keep internal validation language out of visible copy', () => {
  for (const [name, source, forbidden] of [
    ['authoring', authoring, ['개인공간 기능형 PoC · 운영 데이터 읽기 전용', 'PoC 전용 개인공간에 저장 중', '저장 영수증']],
    ['workspace', workspace, ['개인공간 · PoC', '기능형 PoC · 운영 데이터 읽기 전용', 'PoC 관리', 'PoC 상태 지우기', 'PoC 개인 계획 shadow state', 'QuickItem 개인 shadow state', '저장소 쓰기는 0건', '저장 revision', '이 영수증', '정확한 저장 횟수', '부모 Plan', 'Item 변경']],
    ['editor', editor, ['원본 정보 · 읽기 전용', 'QuickItem 편집', '이 Item', '부모 Plan', '개인 Item 제목']],
    ['receipt', receipt, ['변경 영수증', '대상 쓰기', '보조 쓰기', '영향받은 대상']],
    ['result', result, ['Flow 결과 · 읽기 전용', 'PoC 안에서만 보는 결과입니다.']],
    ['standalone app', standaloneApp, ['통합 흐름 PoC · 로컬 전용', '성공한 변경 ', '원문 · 읽기 전용', '개인 shadow state', '저장 0건', '변경 0건']],
    ['standalone shell', standaloneShell, ['로컬 PoC 준비', '통합 흐름 PoC · 로컬 전용', '성공한 변경 0건', 'PoC를 여는 중입니다', 'PoC만 초기화']],
  ] as const) {
    for (const copy of forbidden) {
      assert.equal(source.includes(copy), false, `${name} still exposes: ${copy}`);
    }
  }
});

test('React and standalone expose the same Plan to Item detail grammar marker', () => {
  assert.match(workspace, /data-product-plan-item-grammar="v1"/u);
  assert.match(standaloneApp, /data-product-plan-item-grammar="v1"/u);
});

test('authoring success replaces the save form with a single open action', () => {
  assert.match(authoring, /const renderAuthoringReceipt = \(\) =>/u);
  assert.match(authoring, /data-product-receipt-only="true"/u);
  assert.match(authoring, /\{receipt \? \([\s\S]*\{renderAuthoringReceipt\(\)\}[\s\S]*\) : \(/u);
  assert.match(authoring, /const showMobileStageNav = !receipt/u);
  assert.match(authoring, /data-product-primary="authoring-open-workspace"/u);
});

test('workspace form launchers are mutually exclusive and yield to the active form primary', () => {
  assert.match(workspace, /setFolderFormOpen\(false\);[\s\S]*setQuickFormOpen\(true\)/u);
  assert.match(workspace, /setQuickFormOpen\(false\);[\s\S]*setFolderFormOpen\(true\)/u);
  assert.match(workspace, /!quickFormOpen && !folderFormOpen/u);
  assert.match(workspace, /data-product-primary="quick-item-create"/u);
  assert.match(workspace, /data-product-primary="folder-create"/u);
});

test('diagnostic receipt counters remain machine-readable without user-facing write counts', () => {
  assert.match(receipt, /data-target-write-count=\{receipt\.targetWriteCount\}/u);
  assert.match(receipt, /data-support-write-count=\{receipt\.supportWriteCount\}/u);
  assert.doesNotMatch(receipt, /<dt>대상 쓰기<\/dt>/u);
  assert.doesNotMatch(receipt, /receipt\.affectedRefs\.map/u);
});

test('one receipt owns matching workspace feedback without hiding later unrelated status', () => {
  assert.match(workspace, /const receiptOwnsTransactionStatus = Boolean\([\s\S]*receipt && status\.receiptStatus === receipt\.status/u);
  assert.match(workspace, /status\.receiptStatus === receipt\.status/u);
  assert.match(workspace, /receiptStatus: 'noop'/u);
  assert.match(workspace, /receiptStatus: 'undone'/u);
  assert.match(workspace, /setStatus\(\{ kind: 'ready', message: '이동할 위치를 선택해 주세요\.' \}\)/u);
  assert.match(workspace, /aria-hidden=\{receiptOwnsTransactionStatus \? true : undefined\}/u);
});
