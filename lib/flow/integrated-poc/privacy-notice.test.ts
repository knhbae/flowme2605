import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PRIVACY_NOTICE_CLOSING, PRIVACY_NOTICE_DELETION, PRIVACY_NOTICE_INTRO, PRIVACY_NOTICE_READERS, PRIVACY_NOTICE_REQUEST, PRIVACY_NOTICE_STORED, PRIVACY_NOTICE_TITLE, readPrivacyContact } from './privacy-notice';
import { PROGRAM_TRIED_NOTE } from './flow-loop';

// R7 저장과 공개 안내 (N8): one sheet from 더보기 › 계정, the development notice and the sign-in screen, shown only
// once the server names the contact address.
const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
const sheet = read('components/flow/integrated-poc/AlphaPrivacyNotice.tsx');
const wording = read('lib/flow/integrated-poc/privacy-notice.ts');
const workspace = read('components/flow/integrated-poc/AlphaWorkspace.tsx');
const signIn = read('components/flow/integrated-poc/AlphaAuthPanel.tsx');

test('the settled wording, in its three parts and closing line', () => {
  assert.equal(PRIVACY_NOTICE_TITLE, '저장과 공개 안내');
  assert.match(PRIVACY_NOTICE_INTRO, /^FlowMe는 개발 중인 시험판입니다\./);
  assert.deepEqual([PRIVACY_NOTICE_STORED.length, PRIVACY_NOTICE_READERS.length, PRIVACY_NOTICE_DELETION.length], [5, 6, 5]);
  assert(PRIVACY_NOTICE_READERS.some(line => line.includes("'FlowMe 참여자'")));
  // P3c (11/6): a review left with '해 봤어요' is said to be public, in the words the review composer uses.
  assert.equal(PRIVACY_NOTICE_READERS[2], "'해 봤어요'로 남긴 후기도 공개한 글이라 로그인한 다른 사용자가 봅니다.");
  assert(PRIVACY_NOTICE_READERS[1].includes('로그인한 다른 사용자가 봅니다') && PROGRAM_TRIED_NOTE.startsWith('로그인한 다른 사용자에게 공개되는 글입니다.'));
  assert(PRIVACY_NOTICE_DELETION.some(line => line.includes("'나' › '내 공개 Flow' › 공개한 Flow의 '공개 내리기'")));
  assert.equal(`someone@example.com${PRIVACY_NOTICE_REQUEST}`, 'someone@example.com 으로 "계정 자료를 지워 주세요"라고 보내 주세요. 로그인한 메일 주소를 함께 적어 주세요.');
  assert.equal(PRIVACY_NOTICE_CLOSING, '중요한 자료의 유일본은 넣지 마세요. 시험판이라 오류가 날 수 있습니다.');
  for (const heading of ['저장하는 것', '누가 보나', '지워 달라고 할 때']) assert(sheet.includes(`>${heading}</h3>`), heading);
  assert(sheet.includes('<li data-privacy-request><a href={`mailto:${contact}`}>{contact}</a>{PRIVACY_NOTICE_REQUEST}</li>'));
});

test('the contact address comes from the server setting, never from the repository', () => {
  const address = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  assert(!address.test(wording) && !address.test(sheet), 'no address in the wording or the sheet');
  for (const page of ['app/alpha/page.tsx', 'app/auth/callback/page.tsx']) assert(read(page).includes('privacyContact={process.env.FLOWME_ALPHA_PRIVACY_CONTACT}'), page);
  assert.equal(readPrivacyContact(' someone@example.com '), 'someone@example.com');
  assert.equal(readPrivacyContact('first.last+r7@mail.example.com'), 'first.last+r7@mail.example.com');
  // Anything that is not one plain address keeps the sheet hidden, including what would change the mail link.
  for (const value of [undefined, null, '', 'someone', 'a@b', 'a b@example.com', 'a@example.com, b@example.com', 'mailto:a@example.com',
    '<a@example.com>', '"a"@example.com', 'a@example.com?subject=x', 'a@example.com#x', 'a%40b@example.com', 'a&b@example.com', 'a@example.com/x'])
    assert.equal(readPrivacyContact(value), null, String(value));
});

test('the sheet reads nothing from the server and stores nothing', () => {
  for (const source of [sheet, wording]) for (const call of ['fetch(', 'supabase', 'localStorage', 'sessionStorage', 'mutate(', 'XMLHttpRequest']) assert(!source.includes(call), call);
});

test('entry points: 더보기 › 계정, the development notice in its three places, the sign-in screen; none without the address', () => {
  assert(workspace.includes('const privacyAddress = readPrivacyContact(privacyContact);'));
  const account = workspace.slice(workspace.indexOf('aria-label="계정"><h3>계정</h3>'), workspace.indexOf('aria-label="문제 해결"'));
  assert(account.includes('{privacyAddress && <button type="button" onClick={() => setPrivacyOpen(true)}>저장과 공개 안내</button>}'), '더보기 › 계정');
  // UX B1 (11/6): the header's 개발계 label is gone; the first-run line and 더보기 › 저장과 공개 안내 show the notice.
  assert.equal(workspace.split('{DEV_NOTICE_TEXT}{privacyMore}').length - 1, 2, 'every place that shows the development notice ends with 자세히');
  // UX B3 (11/7): 나 › 계정 shows the notice folded when there is no address (no 자세히 then).
  assert.equal(workspace.split('{DEV_NOTICE_TEXT}').length - 1, 3);
  assert(workspace.includes('{!privacyAddress && <details className={styles.menuNote}><summary>저장과 공개 안내</summary><p>{DEV_NOTICE_TEXT}</p></details>}'));
  assert(workspace.includes('const privacyMore = privacyAddress && <> <button type="button" className={styles.privacyMore} aria-label="저장과 공개 안내 자세히" onClick={() => setPrivacyOpen(true)}>자세히</button></>;'));
  assert(workspace.includes('{privacyOpen && privacyAddress && <AlphaPrivacyNotice contact={privacyAddress}'));
  assert(signIn.includes('privacyAddress = readPrivacyContact(privacyContact);'));
  assert(signIn.includes('{privacyAddress && <p className={styles.privacy}><ProgramIcon name="info" size={16} /><span>저장과 공개 안내</span><button type="button" className={styles.privacyMore} aria-label="저장과 공개 안내 자세히" onClick={() => setPrivacyOpen(true)}>자세히</button></p>}'));
  assert(signIn.includes('{privacyOpen && privacyAddress && <AlphaPrivacyNotice contact={privacyAddress}'));
});

test('자세히 and the mail link have 44px press areas without changing their lines', () => {
  const workspaceCss = read('components/flow/integrated-poc/AlphaWorkspace.module.css'), sheetCss = read('components/flow/integrated-poc/AlphaPrivacyNotice.module.css');
  assert(workspaceCss.includes('.page .privacyMore { display: inline-flex; align-items: center; justify-content: center; vertical-align: baseline; min-width: 44px; min-height: 44px; margin: -12px 0 -12px 2px;'));
  assert(sheetCss.includes('.body a { display: inline-flex; align-items: center; min-height: 44px; margin-block: -10px;'));
  assert(sheetCss.includes('.body { flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 4px 20px 20px; font-size: 15px; line-height: 1.6; }'), 'the 24px line the margins keep');
  // The sign-in screen's 자세히 was already 44px high.
  assert(read('components/flow/integrated-poc/AlphaAuthPanel.module.css').includes('.panel .privacyMore { width: auto; min-height: 44px;'));
});
