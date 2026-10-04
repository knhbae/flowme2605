async (page) => {
  const checks = [], errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (new URL(request.url()).origin !== 'http://127.0.0.1:3114') external.push(request.url()); });
  await page.addInitScript(() => {
    window.__memoDateStorageCalls = [];
    for (const method of ['setItem', 'removeItem', 'clear']) Storage.prototype[method] = function(...args) {
      window.__memoDateStorageCalls.push({ method, key: args[0] ?? null });
      throw new Error('Review artifact may not write storage');
    };
  });
  const check = (name, condition) => { checks.push({ name, pass: Boolean(condition) }); if (!condition) throw new Error(name); };
  const read = () => page.evaluate(() => ({ state: JSON.stringify(MemoDateLab.lab.state), item: MemoDateLab.lab.item(),
    tasks: MemoDateLab.lab.tasks(), source: MemoDateLab.lab.dateSource(), count: MemoDateLab.lab.count(), pending: Boolean(MemoDateLab.lab.pending) }));
  const reset = async () => { await page.getByRole('button', { name: '처음 예시', exact: true }).click(); };
  const apply = async () => { await page.getByRole('button', { name: '원문 적용', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '시안에 적용', exact: true }).click(); };
  const field = page.getByRole('textbox', { name: '원문을 직접 편집하세요', exact: true });
  await page.reload(); await field.waitFor();
  const initial = await read(), raw = await field.inputValue();
  check('H01 initial example, memo and history visible', initial.tasks.length === 3 && initial.item.note.includes('\n') && initial.item.time === '09:00');
  await field.focus();
  const end = raw.indexOf('  - 메모: 빠진 근거 표시하기') + '  - 메모: 빠진 근거 표시하기'.length;
  await field.evaluate((node, at) => node.setSelectionRange(at, at), end);
  await page.keyboard.press('Enter'); await page.keyboard.insertText('추가한 문장'); await apply();
  let current = await read();
  check('H02 memo Enter applies to same Item and retains time/history', current.item.id === initial.item.id && current.item.note.endsWith('\n추가한 문장')
    && current.tasks.length === 3 && current.item.time === initial.item.time
    && JSON.parse(current.state).progressRecords.length === 2);
  await page.getByRole('button', { name: '되돌리기', exact: true }).click();
  check('H03 whole snapshot Undo', (await read()).state === initial.state);
  await field.fill(raw + '\n\n별도 문서 메모'); await apply(); current = await read();
  check('H04 ordinary prose is not auto-promoted or attached', current.tasks.length === 3 && current.item.note === initial.item.note && current.count.notes === 2);
  await reset();
  await page.getByRole('button', { name: '원문 위치 이동', exact: true }).click();
  const move = page.getByRole('combobox', { name: '옮길 원문 위치', exact: true });
  await move.selectOption({ label: '2026-10-06 구획 · 최상위 · 문의할 내용 정리 앞' });
  check('H05 move preview has no committed mutation', (await read()).state === initial.state);
  await page.getByRole('dialog').getByRole('button', { name: '시안에 적용', exact: true }).click(); current = await read();
  check('H06 structural move retains execution date and identity', current.item.id === initial.item.id && current.item.date === '2026-10-04'
    && current.item.groupDate === '2026-10-06' && current.item.note === initial.item.note && current.item.time === initial.item.time);
  await page.getByRole('button', { name: '되돌리기', exact: true }).click();
  check('H07 structural Undo restores entire JSON', (await read()).state === initial.state);
  await page.getByRole('button', { name: '실행 날짜 변경', exact: true }).click();
  // Native date inputs are not exposed as textbox consistently; use the observed label.
  await page.getByLabel('새 실행 날짜 · 비우면 미정', { exact: true }).fill('2026-10-10');
  check('H08 date preview has no committed mutation', (await read()).state === initial.state);
  await page.getByRole('dialog').getByRole('button', { name: '취소', exact: true }).click();
  check('H09 cancel preserves JSON and returns focus', (await read()).state === initial.state
    && await page.getByRole('button', { name: '실행 날짜 변경', exact: true }).evaluate(node => node === document.activeElement));
  await page.getByRole('button', { name: '실행 날짜 변경', exact: true }).focus(); await page.keyboard.press('Enter');
  check('H10 same-date disabled apply and zero mutation', await page.getByRole('dialog').getByRole('button', { name: '시안에 적용', exact: true }).isDisabled()
    && (await read()).state === initial.state);
  await page.getByRole('button', { name: '비교 취소하고 닫기', exact: true }).focus(); await page.keyboard.press('Shift+Tab');
  check('H23 dialog keyboard reverse loop excludes disabled apply', await page.getByRole('dialog').getByRole('button', { name: '취소', exact: true }).evaluate(node=>node===document.activeElement));
  await page.keyboard.press('Tab');
  check('H24 dialog forward loop returns to close', await page.getByRole('button', { name: '비교 취소하고 닫기', exact: true }).evaluate(node=>node===document.activeElement));
  await page.keyboard.press('Escape');
  check('H11 Escape closes preview without mutation', await page.getByRole('dialog').count() === 0 && (await read()).state === initial.state);
  await page.getByRole('button', { name: '실행 날짜 변경', exact: true }).click();
  await page.getByLabel('새 실행 날짜 · 비우면 미정', { exact: true }).fill('2026-10-10');
  await page.getByRole('dialog').getByRole('button', { name: '시안에 적용', exact: true }).click(); current = await read();
  check('H12 date-only change preserves source placement and other fields', current.item.id === initial.item.id && current.item.date === '2026-10-10'
    && current.item.sourceIndex === initial.item.sourceIndex && current.item.groupDate === initial.item.groupDate && current.item.note === initial.item.note);
  await page.getByRole('button', { name: '기간', exact: true }).click();
  const row = page.locator('.period-row').filter({ has: page.getByRole('heading', { name: '초안 다듬기', exact: true }) });
  check('H13 period reflects same dated Item', (await row.innerText()).includes('2026-10-10'));
  await row.getByRole('button', { name: '원문 보기', exact: true }).click();
  check('H14 period returns to same source Item', (await read()).item.id === initial.item.id && await field.evaluate(node => node === document.activeElement));
  await reset(); const rejectedRaw = '[2026-10-04]\n- [ ] 전혀 다른 첫 제목\n- [ ] 전혀 다른 둘째 제목\n[2026-10-06]\n일반 문장';
  await field.fill(rejectedRaw); await page.getByRole('button', { name: '원문 적용', exact: true }).click();
  check('H15 rejected interpretation preserves typed raw and committed snapshot', await field.inputValue() === rejectedRaw
    && (await read()).state === initial.state && (await page.locator('#input-status').innerText()).includes('입력한 원문은 남겨'));
  await page.getByRole('button', { name: '기간', exact: true }).click();
  check('H16 dirty input blocks view switch', await field.isVisible() && await field.inputValue() === rejectedRaw);
  await page.getByRole('combobox', { name: '결과를 확인할 할 일', exact: true }).selectOption({ label: '자료 확인하기' });
  await page.locator('summary').filter({ hasText:'다섯 가지 조작 예시' }).click();
  for (const id of ['case-move','case-exception','case-undated']) await page.locator(`#${id}`).click();
  check('H21 dirty input preserves selected owner and displayed selection', (await read()).item.id===initial.item.id
    && await page.getByRole('combobox', { name: '결과를 확인할 할 일', exact: true }).inputValue()===initial.item.id
    && (await read()).state===initial.state && await field.inputValue()===rejectedRaw && await page.getByRole('dialog').count()===0);
  await reset(); await page.getByRole('combobox', { name: '결과를 확인할 할 일', exact: true }).selectOption({ label: '자료 확인하기' });
  await page.getByRole('button', { name: '비교안 · 미결', exact: true }).click();
  await page.getByRole('button', { name: '구획 날짜 따르기 · 비교', exact: true }).click();
  check('H17 proposed follow is explicitly marked undecided', (await page.getByRole('dialog').innerText()).includes('제품 정책을 확정한 것은 아닙니다'));
  await page.getByRole('dialog').getByRole('button', { name: '시안에 적용', exact: true }).click(); current = await read();
  check('H18 proposed follow uses same Item only in fixture', current.item.id === 'md-task-b' && current.item.date === '2026-10-04' && !current.item.explicitDate);
  await page.getByRole('button', { name:'현재 방식',exact:true }).click();
  check('H22 proposed result provenance survives mode switch and Undo restores it', (await page.locator('#mode-note').innerText()).includes('앞서 적용한 비교안 결과'));
  await page.getByRole('button', { name:'되돌리기',exact:true }).click();
  check('H25 proposed result Undo restores state and clears experiment provenance', (await read()).state===initial.state
    && !(await page.locator('#mode-note').innerText()).includes('앞서 적용한 비교안 결과'));
  await page.reload(); await field.waitFor();
  check('H19 reload resets fixture rather than implying account persistence', (await read()).state === initial.state
    && await page.getByRole('button', { name: '현재 방식', exact: true }).getAttribute('aria-pressed') === 'true');
  const viewports = [];
  for (const [width, height] of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]) {
    await page.setViewportSize({ width, height }); await page.getByRole('button', { name: '처음 예시', exact: true }).click();
    await page.screenshot({ path: `output/playwright/memo-date/html-${width}x${height}.png`, fullPage: true });
    const mainOverflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)-innerWidth);
    await page.getByRole('button', { name: '실행 날짜 변경', exact: true }).click();
    const controls = page.getByRole('dialog').getByRole('button', { name: '취소', exact: true });
    await controls.scrollIntoViewIfNeeded();
    const visible = await controls.evaluate(node => { const r=node.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&!!hit&&(hit===node||node.contains(hit)); });
    const dialogOverflow = await page.getByRole('dialog').evaluate(node => node.scrollWidth-node.clientWidth);
    await page.screenshot({ path: `output/playwright/memo-date/dialog-${width}x${height}.png`, fullPage: false });
    await page.keyboard.press('Escape');
    const focusVisible = await page.getByRole('button', { name: '실행 날짜 변경', exact: true }).evaluate(node => node.matches(':focus-visible'));
    check(`V${width}x${height} overflow, reachable controls and focus`, mainOverflow<=1&&dialogOverflow<=1&&visible&&focusVisible);
    const report=page.locator('#verification-report');
    await report.locator('summary').click();
    check(`R${width}x${height} result report readable without overflow`,(await report.innerText()).includes('3,029건 통과')
      &&await report.evaluate(node=>node.scrollWidth-node.clientWidth)<=1
      &&await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth)<=1);
    await page.screenshot({path:`output/playwright/memo-date/report-${width}x${height}.png`,fullPage:true});
    await report.locator('summary').click();
    viewports.push({ width,height,mainOverflow,dialogOverflow,controlVisible:visible,keyboardFocusVisible:focusVisible });
  }
  const writes = await page.evaluate(() => window.__memoDateStorageCalls);
  check('H20 storage, external requests, console and page errors zero', writes.length===0&&external.length===0&&errors.length===0);
  return { schema:'flowme-memo-date-html-browser/1', checks, passed:checks.filter(c=>c.pass).length, failed:checks.filter(c=>!c.pass).length,
    viewports, storageWrites:writes, externalRequests:external, errors, device:false, observedUsers:0 };
}
