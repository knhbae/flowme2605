import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogCreditLine } from './catalog-credit';

// Catalog Flows written up from a channel's or an agency's material named that channel as the author
// (CATALOG-EXPOSURE 6). They now read "FlowMe 정리 · 원문: {채널}"; FlowMe's own curator credits are unchanged.
test('a channel credit reads as FlowMe curation of that original; other credits read as before', () => {
  const channel = (creator_name: string, creator_role: string, owner_user_id: string) => ({ creator_name, creator_role, owner_user_id });
  assert.equal(catalogCreditLine(channel('ThankyouBUBU', '홈트 루틴 채널', 'channel-thankyou-bubu'), '작성자'), 'FlowMe 정리 · 원문: ThankyouBUBU');
  assert.equal(catalogCreditLine(channel('정부24', '생활 행정 공식 채널', 'channel-gov24'), '원래 작성자'), 'FlowMe 정리 · 원문: 정부24');
  // The pack's one FlowMe credit under a channel owner stays FlowMe's own.
  assert.equal(catalogCreditLine(channel('FLOW 큐레이션팀', '공식자료 큐레이터', 'channel-travelholic'), '작성자'), '작성자: FLOW 큐레이션팀');
  assert.equal(catalogCreditLine(channel('생활 루틴 코치', '운동·습관 크리에이터', 'user-life-routine-coach'), '원래 작성자'), '원래 작성자: 생활 루틴 코치');
  assert.equal(catalogCreditLine({}, '작성자'), '작성자: 표시 없음');
  assert.equal(catalogCreditLine({ owner_user_id: 'channel-gov24', creator_role: '생활 행정 공식 채널' }, '작성자'), '작성자: 표시 없음');
});

test('the library detail, the copy preview and the kept original all use it', () => {
  for (const [file, label] of [['AlphaCatalogLibrary.tsx', "catalogCreditLine(bundle.flow, '작성자')"],
    ['AlphaCatalogContentImport.tsx', "catalogCreditLine(preview.content.bundle.flow, '원래 작성자')"],
    ['CatalogContentOriginal.tsx', "catalogCreditLine(flow, '원래 작성자')"]] as const) {
    const source = readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8');
    assert(source.includes(label), file);
    assert(!/작성자: \{[^}]*creator_name/.test(source), file);
  }
});
