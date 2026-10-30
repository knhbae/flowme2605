import { test, expect, type Page } from '@playwright/test';
import { login, mockAlpha, session, sessionKey, users, emptyAccount, accountWithDocument, invalidAccountMarker, pairedSocialAccount, isSocialReadOrInit } from './alpha-auth.fixture';

const workspaceHeading = (page: Page) => page.getByRole('heading', { name: '개인공간', exact: true });
const workspaceStatus = (page: Page) => page.getByRole('region', { name: '서버 저장 상태', exact: true }).getByRole('status');
async function expectWorkspaceReady(page: Page) {
  await expect(workspaceHeading(page)).toBeVisible();
  await expect(workspaceStatus(page)).toContainText('서버와 연결됨');
  await expect(page.getByRole('region', { name: '내 공간', exact: true })).toBeVisible();
}

// Real Chromium + real Supabase SDK; all Auth/REST responses are synthetic HTTP fixtures.
// This is not a real Supabase account, email-delivery, Google OAuth, or real-device test.
test('email login, empty account creation, reload and account switch preserve operating storage', async ({ page }) => {
  const mock = await mockAlpha(page);
  await page.goto('/alpha'); await login(page);
  await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  await page.getByRole('button', { name: '빈 개인공간 만들기' }).click();
  await expectWorkspaceReady(page);
  await mock.assertBoundary();
  await page.reload();
  await expectWorkspaceReady(page);
  await expect(page.getByText(users.a.email, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '로그아웃 · 계정 바꾸기' }).click();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  await login(page, 'b');
  await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  await expect(page.getByText(users.a.email, { exact: true })).toHaveCount(0);
  expect(mock.accounts.size).toBe(1);
  await mock.assertBoundary();
});

test('successful logout revokes once and SDK cleanup still broadcasts signed out', async ({ page }) => {
  const mock = await mockAlpha(page); await page.goto('/alpha'); await login(page);
  await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  await page.evaluate(key => {
    Object.assign(window, { __m2SignedOutCount: 0 });
    const channel = new BroadcastChannel(key);
    channel.onmessage = event => {
      if (event.data?.event === 'SIGNED_OUT') (window as unknown as { __m2SignedOutCount: number }).__m2SignedOutCount++;
    };
  }, sessionKey);
  await page.getByRole('button', { name: '로그아웃 · 계정 바꾸기' }).click();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  expect(mock.requests.filter(request => request.includes('/auth/v1/logout'))).toHaveLength(1);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __m2SignedOutCount: number }).__m2SignedOutCount)).toBeGreaterThan(0);
  expect(await page.evaluate(key => localStorage.getItem(key), sessionKey)).toBeNull();
  await login(page, 'b');
  await expect(page.getByText(users.b.email, { exact: true })).toBeVisible();
  await mock.assertBoundary();
});

test('incorrect password stays signed out and never queries database', async ({ page }) => {
  const mock = await mockAlpha(page); await page.goto('/alpha');
  await page.getByLabel('이메일', { exact: true }).fill(users.a.email);
  await page.getByLabel('비밀번호', { exact: true }).fill('incorrect');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('이메일과 비밀번호를 확인해 주세요.');
  expect(mock.requests.filter(request => request.includes('/rest/'))).toEqual([]);
  await mock.assertBoundary(true);
});

test('signup mismatch makes no request, matching signup requests email without opening account', async ({ page }) => {
  const mock = await mockAlpha(page); await page.goto('/alpha');
  await page.getByRole('button', { name: '이메일로 가입' }).click();
  await page.getByLabel('이메일', { exact: true }).fill(users.a.email);
  await page.getByLabel('비밀번호', { exact: true }).fill('Fixture-password-123!');
  await page.getByLabel('비밀번호 확인', { exact: true }).fill('Different-password-123!');
  await page.getByRole('button', { name: '이메일로 가입', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('두 비밀번호가 일치하지 않습니다.');
  expect(mock.requests.filter(request => request.includes('/signup'))).toHaveLength(0);
  await page.getByLabel('비밀번호 확인', { exact: true }).fill('Fixture-password-123!');
  await page.getByRole('button', { name: '이메일로 가입', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('확인 링크가 도착합니다');
  expect(mock.requests.filter(request => request.includes('/signup'))).toHaveLength(1);
  expect(mock.requests.filter(request => request.includes('/rest/'))).toHaveLength(0);
  await mock.assertBoundary();
});

for (const failure of ['expired', 'network', 'invalid'] as const) {
  test(`${failure} account response rejects untrusted data without private writes`, async ({ page }) => {
    const mock = await mockAlpha(page);
    const confirmedRaw = '- [ ] 마지막으로 확인한 A의 일정';
    mock.accounts.set('a', accountWithDocument('a', '확인된 A 문서', confirmedRaw));
    const before = JSON.stringify(mock.accounts.get('a'));
    await page.goto('/alpha'); await login(page);
    await expectWorkspaceReady(page);
    const editor = page.getByRole('region', { name: '개인 문서 편집', exact: true }).locator('textarea').first();
    await expect(editor).toHaveValue(confirmedRaw);
    if (failure === 'expired') mock.state.userFailure = true;
    else mock.state.database = failure;
    await page.getByRole('button', { name: '서버에서 다시 확인' }).click();
    await expect(workspaceStatus(page)).toContainText(failure === 'expired' ? '로그인이 만료되었습니다' : '저장 상태를 확인해 주세요');
    await expect(workspaceStatus(page)).not.toContainText('서버와 연결됨');
    if (failure === 'expired') {
      await expect(page.getByRole('region', { name: '내 공간', exact: true })).toHaveCount(0);
      await expect(editor).toHaveCount(0);
      await expect(page.getByText('확인된 A 문서', { exact: true })).toHaveCount(0);
    } else {
      await expect(page.getByRole('region', { name: '내 공간', exact: true })).toBeVisible();
      await expect(editor).toHaveValue(confirmedRaw);
    }
    await expect(page.getByText(invalidAccountMarker, { exact: true })).toHaveCount(0);
    expect(await page.locator('textarea').evaluateAll((elements, marker) => elements.some(element => (element as HTMLTextAreaElement).value.includes(marker)), invalidAccountMarker)).toBe(false);
    expect(await page.evaluate(marker => [localStorage, sessionStorage].some(storage => Object.values(storage).some(value => String(value).includes(marker))), invalidAccountMarker)).toBe(false);
    await expect(page.getByRole('button', { name: '빈 개인공간 만들기' })).toHaveCount(0);
    expect(mock.requests.filter(request => request.includes('/rpc/') && !isSocialReadOrInit(request)), 'No command RPCs; only owner alias initialization and paired reads').toEqual([]);
    expect(mock.workspaceRequests).toEqual([]);
    expect(JSON.stringify(mock.accounts.get('a'))).toBe(before);
    await mock.assertBoundary(true);
  });
}

test('real SDK PKCE recovery exchange, same-owner simulated refresh, password update and reload', async ({ page }) => {
  const mock = await mockAlpha(page);
  mock.accounts.set('a', emptyAccount('a'));
  await page.goto('/alpha');
  await page.getByRole('button', { name: '비밀번호 찾기' }).click();
  await page.getByLabel('이메일', { exact: true }).fill(users.a.email);
  await page.getByRole('button', { name: '복구 이메일 요청' }).click();
  await expect(page.getByRole('status')).toContainText('확인 링크가 도착합니다');
  const verifier = await page.evaluate(key => JSON.parse(localStorage.getItem(`${key}-code-verifier`) ?? 'null'), sessionKey);
  expect(typeof verifier).toBe('string'); expect(verifier).toContain('/recovery');
  await mock.assertBoundary();
  await page.goto('/auth/callback?code=fixture-recovery-code-123');
  await expect(page.getByRole('heading', { name: '새 비밀번호 설정' })).toBeVisible();
  expect(mock.state.pkceRequests).toEqual([{ auth_code: 'fixture-recovery-code-123', code_verifier: verifier.split('/')[0] }]);
  await expect(page).toHaveURL('http://localhost:3104/alpha');
  await mock.assertBoundary(); await page.reload();
  await expect(page.getByRole('heading', { name: '새 비밀번호 설정' })).toBeVisible();
  await page.getByLabel('새 비밀번호', { exact: true }).fill('Recovery-password-123!');
  await page.getByLabel('비밀번호 확인', { exact: true }).fill('Recovery-password-123!');
  // Explicit synthetic cross-tab SDK event; no claim that refresh token was issued by a real server.
  const refreshed = session('a'); refreshed.access_token = `${refreshed.access_token.split('.').slice(0, 2).join('.')}.same-owner-recovery-refresh-fixture`;
  const previousToken = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).access_token, sessionKey);
  expect(refreshed.access_token).not.toBe(previousToken);
  await page.evaluate(({ key, value }) => { const channel = new BroadcastChannel(key); channel.postMessage({ event: 'TOKEN_REFRESHED', session: value }); channel.close(); }, { key: sessionKey, value: refreshed });
  await expect.poll(() => page.evaluate(token => window.__alphaStorageAudit.receivedRefreshTokens.includes(token), refreshed.access_token)).toBe(true);
  await expect(page.getByLabel('새 비밀번호', { exact: true })).toHaveValue('Recovery-password-123!');
  await expect(page.getByLabel('비밀번호 확인', { exact: true })).toHaveValue('Recovery-password-123!');
  await page.getByRole('button', { name: '새 비밀번호 설정', exact: true }).click();
  await expectWorkspaceReady(page);
  expect(mock.state.updatedOwners).toEqual(['a']);
  expect(mock.state.passwordUpdateAuthorizations).toEqual([`Bearer ${refreshed.access_token}`]);
  await expect(page.getByLabel('새 비밀번호', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(`${key}-recovery-owner`), sessionKey)).toBeNull();
  await mock.assertBoundary(); await page.reload();
  await expectWorkspaceReady(page);
  await expect(workspaceStatus(page)).not.toContainText('로그인 링크를 확인하지 못했습니다');
  await mock.assertBoundary();
});

test('invalid callback never exchanges a token or follows redirect', async ({ page }) => {
  const mock = await mockAlpha(page);
  await page.goto('/auth/callback?code=fixture-code&next=https://example.invalid');
  await expect(page.getByRole('status')).toContainText('로그인 링크를 확인하지 못했습니다');
  await expect(page).toHaveURL('http://localhost:3104/auth/callback');
  expect(mock.state.pkceRequests).toEqual([]); await mock.assertBoundary();
});

for (const recoveringB of [false, true]) {
  test(`missing-verifier callback isolates existing B session (recovery marker: ${recoveringB})`, async ({ page }) => {
    const mock = await mockAlpha(page); mock.accounts.set('b', emptyAccount('b'));
    await page.goto('/alpha'); await login(page, 'b');
    await expectWorkspaceReady(page);
    if (recoveringB) await page.evaluate(({ key, owner }) => localStorage.setItem(`${key}-recovery-owner`, owner), { key: sessionKey, owner: users.b.id });
    const before = await page.evaluate(key => localStorage.getItem(key), sessionKey);
    const requestStart = mock.requests.length;
    await page.goto('/auth/callback?code=fixture-from-another-browser');
    await expect(page.getByRole('heading', { name: '이메일 링크 확인 실패' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('같은 프로필에서 최신 링크');
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.getByText(users.b.email, { exact: true })).toHaveCount(0);
    await expect(workspaceHeading(page)).toHaveCount(0);
    expect(mock.requests.slice(requestStart).filter(request => /\/rest\/|\/user|\/logout|\/recover/.test(request))).toEqual([]);
    expect(mock.state.pkceRequests).toEqual([]); expect(mock.state.updatedOwners).toEqual([]);
    expect(await page.evaluate(key => localStorage.getItem(key), sessionKey)).toBe(before);
    expect(await page.evaluate(key => localStorage.getItem(`${key}-recovery-owner`), sessionKey)).toBe(recoveringB ? users.b.id : null);
    // Later SDK events must not reopen a failed callback either.
    await page.evaluate(({ key, value }) => { const channel = new BroadcastChannel(key); channel.postMessage({ event: 'TOKEN_REFRESHED', session: value }); channel.close(); }, { key: sessionKey, value: session('b') });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '이메일 링크 확인 실패' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '내 계정', exact: true })).toHaveCount(0);
    await expect(workspaceHeading(page)).toHaveCount(0);
    await expect(page.getByText(users.b.email, { exact: true })).toHaveCount(0);
    expect(mock.requests.slice(requestStart).filter(request => /\/rest\/|\/user|\/logout|\/recover/.test(request))).toEqual([]);
    await mock.assertBoundary(); await page.reload();
    await expect(page.getByRole('heading', { name: '이메일 링크 확인 실패' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '내 계정', exact: true })).toHaveCount(0);
    await expect(workspaceHeading(page)).toHaveCount(0);
    await expect(page.getByText(users.b.email, { exact: true })).toHaveCount(0);
    expect(mock.requests.slice(requestStart).filter(request => /\/rest\/|\/user|\/logout|\/recover/.test(request))).toEqual([]);
    await expect(page.locator('form')).toHaveCount(0); await mock.assertBoundary();
    await page.getByRole('link', { name: 'FlowMe로 돌아가기' }).focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL('http://localhost:3104/alpha');
    if (recoveringB) await expect(page.getByRole('heading', { name: '새 비밀번호 설정', exact: true })).toBeVisible();
    else await expectWorkspaceReady(page);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).user.id, sessionKey)).toBe(users.b.id);
    expect(mock.state.updatedOwners).toEqual([]); await mock.assertBoundary();
  });
}

test('pending exchange hides old account and recovery controls; rejected exchange stays closed', async ({ page }) => {
  const mock = await mockAlpha(page); mock.accounts.set('b', emptyAccount('b'));
  await page.goto('/alpha'); await login(page, 'b');
  await expectWorkspaceReady(page);
  await page.evaluate(({ key, owner }) => {
    localStorage.setItem(`${key}-code-verifier`, JSON.stringify('fixture-verifier/recovery'));
    localStorage.setItem(`${key}-recovery-owner`, owner);
  }, { key: sessionKey, owner: users.b.id });
  const before = await page.evaluate(key => localStorage.getItem(key), sessionKey);
  const requestStart = mock.requests.length; mock.state.holdPkce = true;
  await page.goto('/auth/callback?code=fixture-expired-code');
  await expect.poll(() => mock.state.heldPkce !== null).toBe(true);
  await expect(page.getByRole('heading', { name: '이메일 링크 확인 중…' })).toBeVisible();
  await expect(page.locator('form, main button')).toHaveCount(0);
  await expect(page.getByText(users.b.email, { exact: true })).toHaveCount(0);
  expect(mock.requests.slice(requestStart).filter(request => /\/rest\/|\/user/.test(request))).toEqual([]);
  await mock.state.heldPkce!.fulfill({ status: 400, contentType: 'application/json', headers: { 'X-Supabase-Api-Version': '2024-01-01' }, body: JSON.stringify({ code: 'bad_code_verifier', msg: 'Synthetic rejected exchange' }) });
  await expect(page.getByRole('heading', { name: '이메일 링크 확인 실패' })).toBeVisible();
  await expect(page.locator('form, main button')).toHaveCount(0);
  expect(mock.state.pkceRequests).toHaveLength(1); expect(mock.state.updatedOwners).toEqual([]);
  expect(mock.requests.slice(requestStart).filter(request => /\/rest\/|\/user|\/logout|\/recover/.test(request))).toEqual([]);
  expect(await page.evaluate(key => localStorage.getItem(key), sessionKey)).toBe(before);
  await mock.assertBoundary(true);
});

test('verified A recovery replaces old B only after exchange and updates A alone', async ({ page }) => {
  const mock = await mockAlpha(page); mock.accounts.set('b', emptyAccount('b'));
  mock.accounts.set('a', emptyAccount('a'));
  await page.goto('/alpha'); await login(page, 'b');
  await expectWorkspaceReady(page);
  await page.evaluate(key => localStorage.setItem(`${key}-code-verifier`, JSON.stringify('fixture-A-verifier/recovery')), sessionKey);
  await page.goto('/auth/callback?code=fixture-A-recovery-code');
  await expect(page.getByRole('heading', { name: '새 비밀번호 설정' })).toBeVisible();
  await expect(page).toHaveURL('http://localhost:3104/alpha');
  expect(mock.state.pkceRequests).toHaveLength(1);
  expect(await page.evaluate(key => localStorage.getItem(`${key}-recovery-owner`), sessionKey)).toBe(users.a.id);
  await expect(page.getByText(users.b.email, { exact: true })).toHaveCount(0);
  await mock.assertBoundary(); await page.reload();
  await expect(page.getByRole('heading', { name: '새 비밀번호 설정' })).toBeVisible();
  // Synthetic password only; no real user credential or server is touched.
  await page.getByLabel('새 비밀번호', { exact: true }).fill('Fixture-A-new-password!');
  await page.getByLabel('비밀번호 확인', { exact: true }).fill('Fixture-A-new-password!');
  await page.getByRole('button', { name: '새 비밀번호 설정', exact: true }).click();
  await expectWorkspaceReady(page);
  await expect(page.getByLabel('새 비밀번호', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(`${key}-recovery-owner`), sessionKey)).toBeNull();
  expect(mock.state.updatedOwners).toEqual(['a']);
  await expect(page.getByText(users.a.email, { exact: true })).toBeVisible();
  await expect(page.getByText(users.b.email, { exact: true })).toHaveCount(0); await mock.assertBoundary();
});

test('ordinary verified PKCE callback does not become password recovery', async ({ page }) => {
  const mock = await mockAlpha(page);
  await page.goto('/alpha');
  await page.evaluate(key => localStorage.setItem(`${key}-code-verifier`, JSON.stringify('fixture-signin-verifier')), sessionKey);
  await page.goto('/auth/callback?code=fixture-signin-code');
  await expect(page.getByRole('heading', { name: '내 계정', exact: true })).toBeVisible();
  await expect(page).toHaveURL('http://localhost:3104/alpha');
  await expect(page.getByLabel('새 비밀번호', { exact: true })).toHaveCount(0);
  expect(mock.state.pkceRequests).toHaveLength(1); expect(mock.state.updatedOwners).toEqual([]);
  expect(await page.evaluate(key => localStorage.getItem(`${key}-recovery-owner`), sessionKey)).toBeNull();
  await mock.assertBoundary();
});

test('A recovery cannot change B password when shared storage switches before the broadcast arrives', async ({ page }) => {
  const mock = await mockAlpha(page);
  await page.goto('/alpha');
  await page.evaluate(key => localStorage.setItem(`${key}-code-verifier`, JSON.stringify('fixture-A-verifier/recovery')), sessionKey);
  await page.goto('/auth/callback?code=fixture-A-recovery-code');
  await expect(page.getByRole('heading', { name: '새 비밀번호 설정' })).toBeVisible();
  await page.getByLabel('새 비밀번호', { exact: true }).fill('Fixture-A-intended-password!');
  await page.getByLabel('비밀번호 확인', { exact: true }).fill('Fixture-A-intended-password!');
  // Reproduce another tab's committed B session before its async broadcast is delivered.
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: sessionKey, value: session('b') });
  await page.getByRole('button', { name: '새 비밀번호 설정', exact: true }).click();
  await expect(page.getByRole('heading', { name: '로그인 상태가 바뀌었습니다' }).or(page.getByRole('heading', { name: '내 계정', exact: true }))).toBeVisible();
  expect(mock.state.updatedOwners, 'No password request may borrow another account session').toEqual([]);
  await expect(page.getByRole('heading', { name: '로그인 상태가 바뀌었습니다' })).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).user.id, sessionKey)).toBe(users.b.id);
  await page.getByRole('link', { name: '현재 계정 확인' }).click();
  await expect(page.getByText(users.b.email, { exact: true })).toBeVisible();
  await expect(page.getByText(users.a.email, { exact: true })).toHaveCount(0);
  await mock.assertBoundary();
});

test('late A password response cannot restore A session over a newer B session', async ({ page }) => {
  const mock = await mockAlpha(page);
  await page.goto('/alpha');
  await page.evaluate(key => localStorage.setItem(`${key}-code-verifier`, JSON.stringify('fixture-A-verifier/recovery')), sessionKey);
  await page.goto('/auth/callback?code=fixture-A-recovery-code');
  await expect(page.getByRole('heading', { name: '새 비밀번호 설정' })).toBeVisible();
  mock.state.holdPasswordUpdate = true;
  await page.getByLabel('새 비밀번호', { exact: true }).fill('Fixture-A-intended-password!');
  await page.getByLabel('비밀번호 확인', { exact: true }).fill('Fixture-A-intended-password!');
  await page.getByRole('button', { name: '새 비밀번호 설정', exact: true }).click();
  await expect.poll(() => mock.state.heldPasswordUpdate !== null).toBe(true);
  expect(mock.state.updatedOwners).toEqual(['a']);
  await page.evaluate(({ key, value, owner }) => {
    localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem(`${key}-recovery-owner`, owner);
  }, { key: sessionKey, value: session('b'), owner: users.b.id });
  await mock.state.heldPasswordUpdate!.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(users.a) });
  await expect(page.getByRole('heading', { name: '로그인 상태가 바뀌었습니다' })).toBeVisible();
  await expect(page.getByRole('status')).not.toContainText('비밀번호를 변경했습니다');
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  expect(mock.state.updatedOwners).toEqual(['a']);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).user.id, sessionKey)).toBe(users.b.id);
  expect(await page.evaluate(key => localStorage.getItem(`${key}-recovery-owner`), sessionKey)).toBe(users.b.id);
  await mock.assertBoundary();
});

test('two real app tabs close A and follow B while ignoring a late A database result', async ({ page }) => {
  const first = await mockAlpha(page); first.accounts.set('a', emptyAccount('a'));
  await page.goto('/alpha'); await login(page, 'a');
  await expectWorkspaceReady(page);
  const secondPage = await page.context().newPage(); const second = await mockAlpha(secondPage);
  second.accounts.set('a', emptyAccount('a'));
  await secondPage.goto('/alpha');
  await expect(secondPage.getByText(users.a.email, { exact: true })).toBeVisible();
  await expectWorkspaceReady(secondPage);
  second.state.holdA = true;
  await secondPage.getByRole('button', { name: '서버에서 다시 확인' }).click();
  await expect.poll(() => second.state.held !== null).toBe(true);
  await page.getByRole('button', { name: '로그아웃 · 계정 바꾸기' }).click();
  for (const tab of [page, secondPage]) await expect(tab.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  await login(page, 'b');
  await expect(secondPage.getByText(users.b.email, { exact: true })).toBeVisible();
  await second.state.held!.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(second.state.held!.request().url().includes('social_read_v1') ? pairedSocialAccount('a',emptyAccount('a')) : [{ account: emptyAccount('a') }]) });
  for (const tab of [page, secondPage]) {
    await expect(tab.getByText(users.a.email, { exact: true })).toHaveCount(0);
    await expect(tab.getByText(users.b.email, { exact: true })).toBeVisible();
    await expect(tab.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  }
  await first.assertBoundary(); await second.assertBoundary(); await secondPage.close();
});

test('late A REST result is ignored after logout and B login', async ({ page }) => {
  const mock = await mockAlpha(page); mock.state.holdA = true;
  await page.goto('/alpha'); await login(page);
  await expect.poll(() => mock.state.held !== null).toBe(true);
  await page.getByRole('button', { name: '로그아웃 · 계정 바꾸기' }).click();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  await login(page, 'b');
  await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  await mock.state.held!.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.state.held!.request().url().includes('social_read_v1') ? pairedSocialAccount('a',emptyAccount('a')) : [{ account: emptyAccount('a') }]) });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.getByText(users.b.email, { exact: true })).toBeVisible();
  await expect(page.getByText(users.a.email, { exact: true })).toHaveCount(0);
  await expect(workspaceHeading(page)).toHaveCount(0);
  await mock.assertBoundary();
});

test('logout storage removal failure preserves durable closed marker until retry succeeds', async ({ page }) => {
  const mock = await mockAlpha(page); await page.goto('/alpha'); await login(page);
  await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  await page.evaluate(() => { window.__alphaStorageAudit.failRemove = true; });
  await page.getByRole('button', { name: '로그아웃 · 계정 바꾸기' }).click();
  await expect(page.getByRole('heading', { name: '로그아웃 확인이 필요합니다' })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(`${key}-logout-pending`), sessionKey)).toBe('1');
  expect(mock.requests.some(request => request.includes('/auth/v1/logout'))).toBe(true);
  await mock.assertBoundary(); mock.state.logoutRevoked = true; await page.reload();
  await expect(page.getByRole('heading', { name: '로그아웃 확인이 필요합니다' })).toBeVisible();
  await expect(page.getByText(users.a.email, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '로그아웃 다시 시도' }).click();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  await mock.assertBoundary(true);
});

test('already revoked logout retries on the same page after storage recovers, then B can sign in', async ({ page }) => {
  const mock = await mockAlpha(page); await page.goto('/alpha'); await login(page);
  await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  await page.evaluate(() => { window.__alphaStorageAudit.failRemove = true; });
  await page.getByRole('button', { name: '로그아웃 · 계정 바꾸기' }).click();
  await expect(page.getByRole('status')).toContainText('로그아웃을 완료하지 못했습니다');
  mock.state.logoutRevoked = true;
  await page.evaluate(() => { window.__alphaStorageAudit.failRemove = false; });
  await page.getByRole('button', { name: '로그아웃 다시 시도' }).click();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  expect(mock.requests.filter(request => request.includes('/auth/v1/logout'))).toHaveLength(2);
  expect(await page.evaluate(key => localStorage.getItem(`${key}-logout-pending`), sessionKey)).toBeNull();
  await login(page, 'b');
  await expect(page.getByText(users.a.email, { exact: true })).toHaveCount(0);
  await mock.assertBoundary(true);
});

test('unknown forbidden logout stays closed with retry credentials instead of pretending success', async ({ page }) => {
  const mock = await mockAlpha(page); await page.goto('/alpha'); await login(page);
  mock.state.logoutForbidden = true;
  await page.getByRole('button', { name: '로그아웃 · 계정 바꾸기' }).click();
  await expect(page.getByRole('status')).toContainText('로그아웃을 서버에서 확인하지 못했습니다');
  await expect(page.getByRole('heading', { name: '로그아웃 확인이 필요합니다' })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), sessionKey)).not.toBeNull();
  await expect(page.getByText(users.a.email, { exact: true })).toHaveCount(0);
  mock.state.logoutForbidden = false;
  await page.getByRole('button', { name: '로그아웃 다시 시도' }).click();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  await mock.assertBoundary(true);
});

test('failed logout marker write still revokes server session and clears local credentials', async ({ page }) => {
  const mock = await mockAlpha(page); await page.goto('/alpha'); await login(page);
  await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  await page.evaluate(() => { window.__alphaStorageAudit.failMarker = true; });
  await page.getByRole('button', { name: '로그아웃 · 계정 바꾸기' }).click();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  expect(mock.requests.some(request => request.includes('/auth/v1/logout'))).toBe(true);
  expect(await page.evaluate(key => localStorage.getItem(key), sessionKey)).toBeNull();
  await mock.assertBoundary();
});

test('server logout failure closes private view and permits an explicit retry', async ({ page }) => {
  const mock = await mockAlpha(page); await page.goto('/alpha'); await login(page);
  await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  mock.state.logoutFailure = true;
  await page.getByRole('button', { name: '로그아웃 · 계정 바꾸기' }).click();
  await expect(page.getByRole('heading', { name: '로그아웃 확인이 필요합니다' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('개인 자료는 숨겼습니다');
  await expect(page.getByText(users.a.email, { exact: true })).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(`${key}-logout-pending`), sessionKey)).toBe('1');
  expect(await page.evaluate(key => localStorage.getItem(key), sessionKey)).not.toBeNull();
  const attempts = mock.requests.filter(request => request.includes('/auth/v1/logout')).length;
  await mock.assertBoundary(true); await page.reload();
  await expect(page.getByRole('heading', { name: '로그아웃 확인이 필요합니다' })).toBeVisible();
  await expect(page.getByText(users.a.email, { exact: true })).toHaveCount(0);
  mock.state.logoutFailure = false;
  await page.getByRole('button', { name: '로그아웃 다시 시도' }).click();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  expect(mock.requests.filter(request => request.includes('/auth/v1/logout')).length).toBeGreaterThan(attempts);
  expect(await page.evaluate(key => localStorage.getItem(key), sessionKey)).toBeNull();
  await mock.assertBoundary(true);
});

test('combined marker and server failure keeps UI closed and retries revoke with in-memory token', async ({ page }) => {
  const mock = await mockAlpha(page); await page.goto('/alpha'); await login(page);
  await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  mock.state.logoutFailure = true;
  await page.evaluate(() => { window.__alphaStorageAudit.failMarker = true; });
  await page.getByRole('button', { name: '로그아웃 · 계정 바꾸기' }).click();
  await expect(page.getByRole('heading', { name: '로그아웃 확인이 필요합니다' })).toBeVisible();
  await expect(page.getByText(users.a.email, { exact: true })).toHaveCount(0);
  // The closed heading is immediate; credential cleanup happens after the HTTP
  // failure. Wait for that attempt to finish before inspecting persisted state.
  await expect(page.getByRole('status')).toContainText('로그아웃을 서버에서 확인하지 못했습니다');
  await expect(page.getByRole('button', { name: '로그아웃 다시 시도' })).toBeEnabled();
  expect(await page.evaluate(key => localStorage.getItem(key), sessionKey)).toBeNull();
  const attempts = mock.requests.filter(request => request.includes('/auth/v1/logout')).length;
  mock.state.logoutFailure = false;
  await page.evaluate(() => { window.__alphaStorageAudit.failMarker = false; });
  await page.getByRole('button', { name: '로그아웃 다시 시도' }).click();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  expect(mock.requests.filter(request => request.includes('/auth/v1/logout')).length).toBeGreaterThan(attempts);
  await mock.assertBoundary(true);
});

test('actual SDK timer refreshes B after logout failure, retry and same-page account switch', async ({ page }) => {
  await page.clock.install({ time: new Date() });
  const mock = await mockAlpha(page); await page.goto('/alpha'); await login(page);
  await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  mock.state.logoutFailure = true;
  await page.getByRole('button', { name: '로그아웃 · 계정 바꾸기' }).click();
  await expect(page.getByRole('heading', { name: '로그아웃 확인이 필요합니다' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('개인 자료는 숨겼습니다');
  mock.state.logoutFailure = false;
  await page.getByRole('button', { name: '로그아웃 다시 시도' }).click();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  await login(page, 'b');
  await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible();
  expect(mock.state.refreshRequests).toEqual([]);
  // Advance the real SDK's interval into its refresh window, not a synthetic auth event.
  await page.clock.fastForward(3_540_000);
  await expect.poll(() => mock.state.refreshRequests.length).toBeGreaterThan(0);
  expect(mock.state.refreshRequests.every(token => token === 'fixture-refresh-b')).toBe(true);
  await expect(page.getByText(users.b.email, { exact: true })).toBeVisible();
  await expect(page.getByText(users.a.email, { exact: true })).toHaveCount(0);
  await mock.assertBoundary(true);
});

async function inspectScreen(page: Page, label: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${label}: horizontal overflow`).toBe(true);
  for (const target of await page.locator('main button, main input, main a').all()) {
    if (!await target.isVisible()) continue;
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox(); expect(box, label).not.toBeNull();
    expect(box!.height, `${label}: action height`).toBeGreaterThanOrEqual(48);
    expect(box!.width, `${label}: action width`).toBeGreaterThanOrEqual(48);
    expect(await target.evaluate(element => { const rect = element.getBoundingClientRect(); const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2); return top === element || element.contains(top); }), `${label}: obscured action`).toBe(true);
  }
  await page.screenshot({ path: `output/playwright/alpha-m2/${label}.png`, fullPage: true });
}
for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 812 }, { width: 844, height: 390 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`responsive keyboard screens ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); const mock = await mockAlpha(page); const label = `${viewport.width}x${viewport.height}`;
    await page.goto('/alpha'); await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeEnabled();
    await inspectScreen(page, `${label}-login`);
    await page.getByRole('button', { name: '이메일로 가입' }).focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: '이메일로 가입' })).toBeVisible(); await inspectScreen(page, `${label}-signup`);
    await page.getByRole('button', { name: '로그인으로 돌아가기' }).click();
    await page.getByRole('button', { name: '비밀번호 찾기' }).focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: '비밀번호 찾기' })).toBeVisible(); await inspectScreen(page, `${label}-reset`);
    await page.getByRole('button', { name: '로그인으로 돌아가기' }).click();
    await page.getByLabel('이메일', { exact: true }).fill(users.a.email); await page.keyboard.press('Tab');
    await expect(page.getByLabel('비밀번호', { exact: true })).toBeFocused();
    await page.keyboard.type('Fixture-password-123!'); await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: '아직 개인공간이 없습니다' })).toBeVisible(); await inspectScreen(page, `${label}-empty`);
    await page.getByRole('button', { name: '빈 개인공간 만들기' }).focus(); await page.keyboard.press('Enter');
    await expectWorkspaceReady(page); await inspectScreen(page, `${label}-ready`);
    await mock.assertBoundary();
    await page.goto('/auth/callback?code=fixture-missing-verifier');
    await expect(page.getByRole('heading', { name: '이메일 링크 확인 실패' })).toBeVisible();
    await expect(page.locator('form, main button')).toHaveCount(0);
    await inspectScreen(page, `${label}-callback-failed`);
    await page.getByRole('link', { name: 'FlowMe로 돌아가기' }).focus(); await page.keyboard.press('Enter');
    await expectWorkspaceReady(page);
    await mock.assertBoundary();
    await page.evaluate(key => localStorage.setItem(`${key}-code-verifier`, JSON.stringify('fixture-A-verifier/recovery')), sessionKey);
    await page.goto('/auth/callback?code=fixture-A-recovery-code');
    await expect(page.getByRole('heading', { name: '새 비밀번호 설정' })).toBeVisible();
    await page.getByLabel('새 비밀번호', { exact: true }).fill('Fixture-A-intended-password!');
    await page.getByLabel('비밀번호 확인', { exact: true }).fill('Fixture-A-intended-password!');
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: sessionKey, value: session('b') });
    await page.getByRole('button', { name: '새 비밀번호 설정', exact: true }).click();
    await expect(page.getByRole('heading', { name: '로그인 상태가 바뀌었습니다' })).toBeVisible();
    await inspectScreen(page, `${label}-recovery-owner-changed`);
    expect(mock.state.updatedOwners).toEqual([]);
    await page.getByRole('link', { name: '현재 계정 확인' }).focus(); await page.keyboard.press('Enter');
    await expect(page.getByText(users.b.email, { exact: true })).toBeVisible();
    await mock.assertBoundary();
  });
}
