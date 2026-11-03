import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PRIVACY_NOTICE_CLOSING, PRIVACY_NOTICE_DELETION, PRIVACY_NOTICE_INTRO, PRIVACY_NOTICE_READERS, PRIVACY_NOTICE_STORED, PRIVACY_NOTICE_TITLE, privacyContact, privacyRequestLine } from './privacy-notice';

// R7 저장과 공개 안내 (N8): one sheet from 더보기 › 계정, the development notice and the sign-in screen.
const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
const sheet = read('components/flow/integrated-poc/AlphaPrivacyNotice.tsx');
const wording = read('lib/flow/integrated-poc/privacy-notice.ts');
const workspace = read('components/flow/integrated-poc/AlphaWorkspace.tsx');
const signIn = read('components/flow/integrated-poc/AlphaAuthPanel.tsx');

test('the settled wording, in its three parts and closing line', () => {
  assert.equal(PRIVACY_NOTICE_TITLE, '저장과 공개 안내');
  assert.match(PRIVACY_NOTICE_INTRO, /^FlowMe는 개발 중인 시험판입니다\./);
  assert.deepEqual([PRIVACY_NOTICE_STORED.length, PRIVACY_NOTICE_READERS.length, PRIVACY_NOTICE_DELETION.length], [5, 5, 4]);
  assert(PRIVACY_NOTICE_READERS.some(line => line.includes("'FlowMe 참여자'")));
  assert(PRIVACY_NOTICE_DELETION.some(line => line.includes("'선택해서 공개' › '공개 상태 관리' › '공개 목록에서 내리기'")));
  assert.equal(PRIVACY_NOTICE_CLOSING, '중요한 자료의 유일본은 넣지 마세요. 시험판이라 오류가 날 수 있습니다.');
  for (const heading of ['저장하는 것', '누가 보나', '지워 달라고 할 때']) assert(sheet.includes(`>${heading}</h3>`), heading);
});

test('the contact address comes from the server setting, never from the repository', () => {
  const address = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  assert(!address.test(wording) && !address.test(sheet), 'no address in the wording or the sheet');
  for (const page of ['app/alpha/page.tsx', 'app/auth/callback/page.tsx']) assert(read(page).includes('privacyContact={process.env.FLOWME_ALPHA_PRIVACY_CONTACT}'), page);
  assert.equal(privacyContact(' someone@example.test '), 'someone@example.test');
  for (const value of [undefined, null, '', 'someone', 'a@b', 'a b@example.test', 'a@example.test, b@example.test', 'mailto:a@example.test', '<a@example.test>', '"a"@example.test'])
    assert.equal(privacyContact(value), null, String(value));
});

test('the request line reads whole with or without the address', () => {
  const rest = '"계정 자료를 지워 주세요"라고 보내 주세요. 로그인한 메일 주소를 함께 적어 주세요.';
  const set = privacyRequestLine('someone@example.test');
  assert.equal(`${set.lead}${set.contact}${set.rest}`, `someone@example.test 으로 ${rest}`);
  const unset = privacyRequestLine(null);
  assert.equal(unset.contact, null);
  assert.equal(`${unset.lead}${unset.rest}`, `참가 안내에 적힌 연락 메일로 ${rest}`);
});

test('the sheet reads nothing from the server and stores nothing', () => {
  for (const source of [sheet, wording]) for (const call of ['fetch(', 'supabase', 'localStorage', 'sessionStorage', 'mutate(', 'XMLHttpRequest']) assert(!source.includes(call), call);
});

test('entry points: 더보기 › 계정, the development notice in its three places, the sign-in screen', () => {
  const account = workspace.slice(workspace.indexOf('aria-label="계정"><h3>계정</h3>'), workspace.indexOf('aria-label="문제 해결"'));
  assert(account.includes('onClick={() => setPrivacyOpen(true)}>저장과 공개 안내</button>'), '더보기 › 계정');
  assert.equal(workspace.split('{DEV_NOTICE_TEXT} {privacyMore}').length - 1, 3, 'every place that shows the development notice ends with 자세히');
  assert.equal(workspace.split('{DEV_NOTICE_TEXT}').length - 1, 3);
  assert(workspace.includes('aria-label="저장과 공개 안내 자세히" onClick={() => setPrivacyOpen(true)}>자세히</button>'));
  assert(workspace.includes('{privacyOpen && <AlphaPrivacyNotice contact={privacyContact}'));
  assert(signIn.includes('aria-label="저장과 공개 안내 자세히" onClick={() => setPrivacyOpen(true)}>자세히</button>'));
  assert(signIn.includes('{privacyOpen && <AlphaPrivacyNotice contact={privacyContact}'));
});
