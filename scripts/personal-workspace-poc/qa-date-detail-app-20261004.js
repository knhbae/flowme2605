async (page, options = {}) => {
  // CLI callback author only: repository state is read through the synthetic
  // fixture report. All application changes below use the rendered controls.
  const phase = options.phase ?? 'core', checks = [], screenshots = [], viewports = [];
  const output = options.outputDirectory ?? 'D:/flowme2605/flow-date-detail-ux-20261004/output/playwright/date-detail';
  const check = (name, value) => { checks.push({ name, pass: Boolean(value) }); if (!value) throw Error(name); };
  const read = () => page.evaluate(() => window.__memoDateFixtureReport());
  const wait = async (predicate, label) => {
    for (let i = 0; i < 240; i++) { const state = await read(); if (await predicate(state)) return state; await page.waitForTimeout(50); }
    throw Error(`Timed out: ${label}`);
  };
  const dialog = page.locator('dialog[data-task-detail]');
  const editor = page.getByRole('region', { name: '개인 문서 편집', exact: true });
  const area = editor.getByRole('textbox', { name: '문서 내용', exact: true });
  const nav = page.getByRole('navigation', { name: '개인공간 보기', exact: true });
  const scheduleDate = () => dialog.getByLabel('실행 날짜', { exact: true });
  const scheduleTime = () => dialog.locator('input[type="time"]');
  const recordDate = () => dialog.getByLabel('기록 날짜', { exact: true });
  const percent = () => dialog.getByLabel('누적 진행 (%)', { exact: true });
  const origin = () => dialog.getByRole('button', { name: '원문 열기', exact: true });
  const group = kind => dialog.locator(`[data-detail-section="${kind}"]`);
  const groupOpen = kind => group(kind).evaluate(node => node.open);
  const toggle = async kind => {
    const before = await groupOpen(kind), summary = group(kind).locator(':scope > summary');
    await summary.focus(); await summary.press('Enter');
    await wait(async () => await groupOpen(kind) !== before, `${kind} keyboard toggle`);
  };
  const close = async () => { await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); };
  const openTask = async id => {
    await nav.getByRole('button', { name: '전체 할 일', exact: true }).click();
    await page.locator(`[data-task-id="${id}"]`).getByRole('button', { name: / 작업$/ }).click();
    await dialog.waitFor();
  };
  const saveSchedule = async () => dialog.getByRole('button', { name: '날짜·시간 적용', exact: true }).click();
  const saveProgress = async () => group('progress').getByRole('button', { name: '진행 기록', exact: true }).click();
  const records = state => state.account.space.text.progressRecords;
  const item = (state, id) => state.items.find(value => value.id === id);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  // Inserting a property before a peer legitimately shifts its current source
  // index; the canonical peer row and its parsed meaning must remain exact.
  const meaning = value => { const { sourceIndex, ...rest } = value; return rest; };
  const shot = async name => {
    const path = `${output}/${phase}-${name}.png`; await page.screenshot({ path, fullPage: false }); screenshots.push(path);
  };
  const hit = async control => {
    await control.scrollIntoViewIfNeeded();
    return control.evaluate(node => {
      const r = node.getBoundingClientRect(), at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { width: r.width, height: r.height, visible: r.x >= -1 && r.y >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        hit: !!at && (at === node || node.contains(at)), minimum44: r.width >= 44 && r.height >= 44,
        x: r.x, y: r.y, bottom: r.bottom, dialogScrollTop: node.closest('dialog')?.scrollTop,
        coveringElement: at?.tagName, coveringText: at?.textContent?.slice(0, 100),
        activeElement: document.activeElement?.textContent?.slice(0, 100) };
    });
  };
  const guardText = '날짜·시간 또는 진행 입력을 적용하거나, 닫아 취소한 뒤 원문을 열어 주세요.';
  const initialGeometry = async () => dialog.evaluate(node => {
    const header = node.querySelector('[id="program-detail-title"]')?.parentElement;
    const schedule = node.querySelector('[id="program-detail-schedule"]');
    const h = header?.getBoundingClientRect(), s = schedule?.getBoundingClientRect();
    return { scrollTop: node.scrollTop, headerBottom: h?.bottom, scheduleTop: s?.top,
      scheduleBottom: s?.bottom, visible: !!s && s.top >= 0 && s.bottom <= innerHeight,
      belowHeader: !!h && !!s && s.top >= h.bottom - 1 };
  });
  let initial, current, primary, twin, firstOpenGeometry = null, failure = null;
  try {
    initial = await read();
    const twins = initial.items.filter(value => value.title === (options.taskTitle ?? '구획 날짜 작업'));
    check('D00 duplicate-title fixture has distinct canonical Item ids', twins.length === 2 && twins[0].id !== twins[1].id);
    [primary, twin] = twins;
    if (phase === 'core') {
      await area.waitFor(); await openTask(primary.id);
      firstOpenGeometry = await initialGeometry();
      check('D01A newly opened task starts at top with schedule heading below the header', firstOpenGeometry.scrollTop === 0
        && firstOpenGeometry.belowHeader && firstOpenGeometry.visible);
      await shot('initial-open');
      check('D01 date/time visible outside exactly two initially closed native groups',
        await scheduleDate().isVisible() && await scheduleTime().isVisible()
        && await dialog.locator('[data-detail-section]').count() === 2
        && !(await groupOpen('progress')) && !(await groupOpen('connections'))
        && await scheduleDate().evaluate(node => node.closest('details') === null)
        && await recordDate().count() === 1 && await percent().count() === 1
        && await group('connections').getByLabel(/^다른 문서에 연결/).count() === 1);
      check('D02 named task dialog opens with a clean origin guard', await dialog.getAttribute('aria-labelledby') === 'program-detail-title'
        && await dialog.getByRole('heading', { name: primary.title, exact: true }).count() === 1 && await origin().isEnabled());
      const openProgressDate = await recordDate().inputValue(), openPercent = await percent().inputValue();
      const beforeNoop = (await read()).commandCount;
      await saveSchedule();
      check('D03 unchanged schedule applies zero server commands', (await read()).commandCount === beforeNoop);
      await toggle('progress');
      await recordDate().fill('2026-10-03'); await percent().fill('17');
      await group('progress').locator(':scope > summary').press('Space');
      await wait(async () => !(await groupOpen('progress')), 'progress keyboard collapse');
      check('D04 collapsed progress controls remain mounted and retain input', await recordDate().count() === 1
        && await recordDate().inputValue() === '2026-10-03' && await percent().inputValue() === '17'
        && !(await recordDate().isVisible()) && await scheduleDate().isVisible());
      await toggle('connections');
      await group('connections').locator(':scope > summary').press('Space');
      await wait(async () => !(await groupOpen('connections')), 'connections keyboard collapse');
      check('D05 both native summaries toggle by keyboard without saving', (await read()).commandCount === beforeNoop);
      await scheduleDate().fill('2026-10-08'); await scheduleTime().fill('10:00');
      check('D06 unapplied date and progress block origin and explain cancellation', await origin().isDisabled()
        && await dialog.getByText(guardText, { exact: true }).isVisible() && (await read()).commandCount === beforeNoop);
      await close();
      check('D07 Escape cancels drafts with zero commands and exact account bytes', (await read()).commandCount === beforeNoop
        && same((await read()).account, initial.account));
      await openTask(primary.id);
      check('D08 new dialog resets disclosure state and restores stored/default inputs', !(await groupOpen('progress')) && !(await groupOpen('connections'))
        && await scheduleDate().inputValue() === primary.date && await scheduleTime().inputValue() === (primary.time ?? '')
        && await recordDate().inputValue() === openProgressDate && await percent().inputValue() === openPercent && await origin().isEnabled());
      await scheduleTime().fill('10:00');
      check('D09 inherited time-only edit reuses existing individual-date hint', (await dialog.innerText()).includes('시간을 바꾸면 실행 날짜도 2026-10-04으로 개별 지정됩니다')
        && await origin().isDisabled());
      await scheduleDate().fill('2026-10-08'); await saveSchedule();
      current = await wait(state => item(state, primary.id)?.date === '2026-10-08' && item(state, primary.id)?.time === '10:00', 'schedule save');
      await wait(async () => await origin().isEnabled(), 'schedule origin guard cleared');
      check('D10 successful date/time retains same Item, memo, source section, peer and progress', item(current, primary.id).id === primary.id
        && item(current, primary.id).note === primary.note && item(current, primary.id).groupDate === primary.groupDate
        && item(current, primary.id).explicitDate && same(meaning(item(current, twin.id)), meaning(twin)) && same(records(current), records(initial)));
      await toggle('progress'); await recordDate().fill('2026-10-03'); await percent().fill('30');
      check('D11 progress draft alone blocks origin without a command', await origin().isDisabled()
        && (await read()).commandCount === current.commandCount);
      await saveProgress();
      current = await wait(state => records(state).some(value => value.taskId === primary.id && value.date === '2026-10-03' && value.percent === 30), 'first progress save');
      await wait(async () => await origin().isEnabled(), 'first progress origin guard cleared');
      await recordDate().fill('2026-10-04'); await percent().fill('40'); await saveProgress();
      current = await wait(state => records(state).some(value => value.taskId === primary.id && value.date === '2026-10-04' && value.percent === 40), 'consecutive progress save');
      await wait(async () => await origin().isEnabled(), 'consecutive progress origin guard cleared');
      check('D12 consecutive saves clear origin guard and retain per-date cumulative records', records(current).some(value => value.taskId === primary.id && value.date === '2026-10-03' && value.percent === 30)
        && await recordDate().inputValue() === '2026-10-04' && await percent().inputValue() === '40');
      await group('progress').getByRole('button', { name: '2026-10-03 · 30%', exact: true }).click();
      check('D13 selecting a past record blocks origin until deliberate reapply', await origin().isDisabled());
      const beforePastNoop = (await read()).commandCount;
      await saveProgress();
      await wait(async () => await origin().isEnabled(), 'past-record no-op origin guard cleared');
      check('D14 same past record no-op rebases guard with zero commands', (await read()).commandCount === beforePastNoop);
      await close();
      const beforeUndo = await read(), savedProgress = beforeUndo.account;
      const sync = page.getByRole('region', { name: '서버 저장 상태', exact: true });
      await sync.getByRole('button', { name: '되돌리기', exact: true }).click();
      current = await wait(state => !records(state).some(value => value.taskId === primary.id && value.date === '2026-10-04' && value.percent === 40), 'progress Undo');
      check('D15 existing Undo removes only last successful progress save', records(current).some(value => value.taskId === primary.id && value.date === '2026-10-03' && value.percent === 30)
        && item(current, primary.id).date === '2026-10-08' && item(current, primary.id).note === primary.note);
      const management = sync.locator('details[aria-label="계정 및 자료 관리"]');
      if (!(await management.evaluate(node => node.open))) { await management.locator(':scope > summary').focus(); await management.locator(':scope > summary').press('Enter'); }
      await sync.getByRole('button', { name: '다시 실행', exact: true }).click();
      current = await wait(state => same(records(state), savedProgress.space.text.progressRecords), 'progress Redo');
      check('D16 existing Redo restores cumulative progress and source bytes', current.raw === beforeUndo.raw
        && same(records(current), savedProgress.space.text.progressRecords)
        && same(current.items.map(value => value.id), beforeUndo.items.map(value => value.id)));
      // Open the second same-title Item: matching text alone cannot prove source identity.
      await openTask(twin.id); const beforeOrigin = (await read()).commandCount;
      await origin().click(); await area.waitFor(); current = await read();
      const sourceRow = current.rows.find(row => row.id === twin.id);
      const expectedOffset = current.raw.split('\n').slice(0, sourceRow.index).reduce((sum, line) => sum + line.length + 1, 0);
      await wait(async () => area.evaluate((node, at) => document.activeElement === node && node.selectionStart === at && node.selectionEnd === at, expectedOffset), 'exact origin focus');
      const selected = await area.evaluate(node => ({ start: node.selectionStart, end: node.selectionEnd, raw: node.value, focused: document.activeElement === node }));
      check('D17 origin navigation selects exact second same-title Item source line with no save', selected.focused && selected.start === expectedOffset
        && selected.end === expectedOffset && selected.raw === current.raw && current.commandCount === beforeOrigin);
      await nav.getByRole('button', { name: '주간', exact: true }).click();
      await page.getByLabel('조회 날짜', { exact: true }).fill('2026-10-08');
      await page.locator(`[data-task-id="${primary.id}"]`).getByRole('button', { name: / 작업$/ }).click(); await dialog.waitFor();
      await scheduleDate().fill('2026-10-19'); await saveSchedule();
      current = await wait(state => item(state, primary.id)?.date === '2026-10-19', 'move beyond visible week');
      await wait(async () => await page.locator(`[data-task-id="${primary.id}"]`).count() === 0, 'detached opener');
      const beforeDetachedClose = current.commandCount; await close();
      check('D18 detached row opener restores focus to visible active period and saves nothing on close',
        await page.evaluate(() => document.activeElement?.getAttribute('data-program-period') === 'week')
        && (await read()).commandCount === beforeDetachedClose);
      for (const [width, height] of [[390, 844], [375, 812], [844, 390], [600, 800], [1024, 768], [1440, 900]]) {
        await page.setViewportSize({ width, height }); await openTask(primary.id);
        const initial = await initialGeometry();
        const viewportEvidence = { width, height, initial, collapsed: {}, expanded: {} };
        viewports.push(viewportEvidence);
        check(`V${width}x${height} initial heading does not overlap header`, initial.scrollTop === 0 && initial.belowHeader && initial.visible);
        await shot(`initial-${width}x${height}`);
        const collapsed = {}, expanded = {};
        for (const [name, control] of [['apply', dialog.getByRole('button', { name: '날짜·시간 적용', exact: true })],
          ['progressSummary', group('progress').locator(':scope > summary')], ['connectionsSummary', group('connections').locator(':scope > summary')],
          ['origin', origin()], ['close', dialog.getByRole('button', { name: '닫기', exact: true })]]) collapsed[name] = await hit(control);
        const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
        const collapsedOverflow = await dialog.evaluate(node => node.scrollWidth - node.clientWidth);
        Object.assign(viewportEvidence, { overflow, collapsedOverflow, collapsed });
        check(`V${width}x${height} collapsed groups, visible schedule and control access`, !(await groupOpen('progress')) && !(await groupOpen('connections'))
          && overflow <= 1 && collapsedOverflow <= 1 && Object.values(collapsed).every(value => value.visible && value.hit && value.minimum44));
        await shot(`collapsed-${width}x${height}`);
        await toggle('progress'); await toggle('connections');
        for (const [name, control] of [['apply', dialog.getByRole('button', { name: '날짜·시간 적용', exact: true })],
          ['progressSave', group('progress').getByRole('button', { name: '진행 기록', exact: true })],
          ['origin', origin()], ['close', dialog.getByRole('button', { name: '닫기', exact: true })]]) expanded[name] = await hit(control);
        const expandedOverflow = await dialog.evaluate(node => node.scrollWidth - node.clientWidth);
        Object.assign(viewportEvidence, { expandedOverflow, expanded });
        check(`V${width}x${height} expanded groups and control access`, await groupOpen('progress') && await groupOpen('connections')
          && expandedOverflow <= 1 && Object.values(expanded).every(value => value.visible && value.hit && value.minimum44));
        await shot(`expanded-${width}x${height}`); await close();
      }
      current = await read(); const savedRaw = current.raw, savedRecords = records(current), savedIds = current.items.map(value => value.id);
      await page.reload(); await area.waitFor(); current = await read();
      check('D19 reload restores same Item dates, memo, progress, and canonical IDs', current.raw === savedRaw && same(records(current), savedRecords)
        && same(current.items.map(value => value.id), savedIds) && item(current, primary.id).date === '2026-10-19'
        && item(current, primary.id).note === primary.note && same(meaning(item(current, twin.id)), meaning(twin)));
    } else if (phase === 'long-title') {
      const measureFocus = () => page.evaluate(() => {
        const node = document.activeElement, r = node?.getBoundingClientRect();
        const at = r && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { tag: node?.tagName, name: node?.getAttribute('aria-label') ?? node?.textContent?.trim()?.slice(0, 100),
          id: node?.id, type: node?.getAttribute('type'), inDialog: !!node?.closest('dialog[data-task-detail]'),
          documentFocused: document.hasFocus(),
          visible: !!r && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
          hit: !!at && (at === node || node?.contains(at)), y: r?.y, bottom: r?.bottom };
      });
      for (const [width, height] of [[375, 812], [844, 390], [1440, 900]]) {
        await page.setViewportSize({ width, height }); await openTask(primary.id);
        const title = await dialog.getByRole('heading', { name: primary.title, exact: true }).evaluate(node => ({
          text: node.textContent, height: node.clientHeight, scrollHeight: node.scrollHeight,
          maxHeight: parseFloat(getComputedStyle(node).maxHeight), fontSize: parseFloat(getComputedStyle(node).fontSize),
        }));
        const evidence = { width, height, title, controls: {}, focus: [] };
        viewports.push(evidence);
        check(`L${width}x${height} long title is bounded and exact`, title.text === primary.title
          && title.height <= title.maxHeight + 1 && title.scrollHeight > title.fontSize * 1.5);
        await toggle('progress'); await toggle('connections');
        const controls = evidence.controls;
        for (const [name, control] of [['apply', dialog.getByRole('button', { name: '날짜·시간 적용', exact: true })],
          ['progressSave', group('progress').getByRole('button', { name: '진행 기록', exact: true })],
          ['origin', origin()], ['close', dialog.getByRole('button', { name: '닫기', exact: true })]]) controls[name] = await hit(control);
        const focus = evidence.focus;
        await dialog.getByRole('button', { name: '닫기', exact: true }).focus();
        for (const key of ['Tab', 'Shift+Tab']) {
          for (let step = 0; step < 36; step++) {
            await page.keyboard.press(key);
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const sample = { key, ...await measureFocus() };
            focus.push(sample);
            if (sample.tag === 'BODY' && !sample.documentFocused) {
              sample.documentOutsideTransition = true;
              sample.returnedWithinTwo = false;
              // Native sequential navigation can visit the browser's own UI.
              // Do not call it a product control or accept permanent focus loss.
              for (let recoveryStep = 1; recoveryStep <= 2; recoveryStep++) {
                await page.keyboard.press(key);
                await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                const returned = { key, recoveryStep, ...await measureFocus() };
                focus.push(returned);
                if (returned.documentFocused && returned.inDialog) {
                  sample.returnedWithinTwo = true;
                  break;
                }
              }
            }
          }
        }
        const overflow = await dialog.evaluate(node => node.scrollWidth - node.clientWidth);
        Object.assign(evidence, { controls, focus, overflow });
        check(`L${width}x${height} expanded long-title controls remain unoccluded`, overflow <= 1
          && Object.values(controls).every(value => value.visible && value.hit && value.minimum44));
        check(`L${width}x${height} actual Tab and Shift+Tab keep focused controls visible`,
          focus.every(value => (value.inDialog && value.visible && value.hit)
            || (value.tag === 'BODY' && !value.documentFocused && value.returnedWithinTwo))
          && focus.some(value => value.name === '날짜·시간 적용') && focus.some(value => value.name === '진행 기록')
          && focus.some(value => value.name === '원문 열기'));
        await shot(`${width}x${height}`); await close();
      }
      current = await read();
      check('long-title keyboard and disclosure inspection sends zero commands', current.commandCount === initial.commandCount
        && same(current.account, initial.account));
    } else if (phase === 'faults') {
      await openTask(primary.id);
      const baseline = await read(), lateDate = '2026-10-20', newerDate = '2026-10-21';
      await scheduleDate().fill(lateDate);
      await page.evaluate(() => window.__memoDateFixtureHoldNext()); await saveSchedule();
      await wait(state => state.requestHeld, 'schedule request held');
      await scheduleDate().fill(newerDate); await scheduleTime().fill('11:15');
      check('F01 newer schedule input is accepted while synthetic result is held', await scheduleDate().inputValue() === newerDate
        && await scheduleTime().inputValue() === '11:15' && await origin().isDisabled() && (await read()).commandCount === baseline.commandCount);
      await page.evaluate(() => window.__memoDateFixtureRelease());
      current = await wait(state => item(state, primary.id)?.date === lateDate, 'held schedule success');
      await wait(async () => (await dialog.locator('[aria-label="날짜 출처"]').innerText()).includes(lateDate), 'late schedule rendered');
      check('F02 late schedule success retains newer input and pending origin guard', await scheduleTime().inputValue() === '11:15'
        && await origin().isDisabled() && item(current, primary.id).note === primary.note);
      await saveSchedule();
      current = await wait(state => item(state, primary.id)?.date === newerDate && item(state, primary.id)?.time === '11:15', 'newer schedule explicit save');
      await wait(async () => await origin().isEnabled(), 'newer schedule guard cleared');
      await toggle('progress'); await recordDate().fill('2026-10-05'); await percent().fill('55');
      await page.evaluate(() => window.__memoDateFixtureHoldNext()); await saveProgress();
      await wait(state => state.requestHeld, 'progress request held');
      await recordDate().fill('2026-10-06'); await percent().fill('66');
      await page.evaluate(() => window.__memoDateFixtureRelease());
      current = await wait(state => records(state).some(value => value.taskId === primary.id && value.date === '2026-10-05' && value.percent === 55), 'held progress success');
      await wait(async () => await group('progress').getByRole('button', { name: '2026-10-05 · 55%', exact: true }).count() === 1, 'late progress rendered');
      check('F03 late progress success saves submitted values and retains newer pending input', await recordDate().inputValue() === '2026-10-06'
        && await percent().inputValue() === '66' && await origin().isDisabled()
        && !records(current).some(value => value.taskId === primary.id && value.date === '2026-10-06' && value.percent === 66));
      await shot('late-progress-newer-input');
      await saveProgress();
      current = await wait(state => records(state).some(value => value.taskId === primary.id && value.date === '2026-10-06' && value.percent === 66), 'newer progress explicit save');
      await wait(async () => await origin().isEnabled(), 'newer progress guard cleared');
      await toggle('progress'); await scheduleDate().fill('2026-10-22');
      const beforeReject = await read(); await page.evaluate(() => window.__memoDateFixtureRejectNext()); await saveSchedule();
      current = await wait(state => state.rejectedCommands.length > beforeReject.rejectedCommands.length, 'synthetic rejection');
      await wait(async () => await dialog.getByRole('alert').filter({ hasText: '보관 한도를 넘어 이번 변경을 적용하지 않았습니다.' }).count() === 1, 'limit rejection feedback');
      check('F04 rejected date command preserves draft, guard, same Item, and account bytes', current.commandCount === beforeReject.commandCount
        && same(current.account, beforeReject.account) && await scheduleDate().inputValue() === '2026-10-22'
        && await origin().isDisabled() && await dialog.getByText(guardText, { exact: true }).isVisible()
        && await percent().count() === 1 && await percent().inputValue() === '66');
      await shot('rejected-date-input');
      await page.waitForTimeout(250); current = await read();
      check('F05 rejection never triggers an automatic retry or draft write', current.commandCount === beforeReject.commandCount
        && current.rejectedCommands.length === beforeReject.rejectedCommands.length + 1);
      await saveSchedule();
      current = await wait(state => item(state, primary.id)?.date === '2026-10-22', 'explicit retry success');
      await wait(async () => await origin().isEnabled() && await dialog.getByRole('alert').count() === 0, 'old rejection cleared');
      check('F06 direct retry saves retained input, clears rejection and unblocks origin', current.commandCount === beforeReject.commandCount + 1
        && await scheduleDate().inputValue() === '2026-10-22' && await origin().isEnabled()
        && item(current, primary.id).note === primary.note && await percent().inputValue() === '66');
      await scheduleDate().fill('2026-10-23');
      const beforeCancelledReject = await read(); await page.evaluate(() => window.__memoDateFixtureRejectNext()); await saveSchedule();
      await wait(state => state.rejectedCommands.length === beforeCancelledReject.rejectedCommands.length + 1, 'second rejection');
      await wait(async () => await dialog.getByRole('alert').filter({ hasText: '보관 한도를 넘어 이번 변경을 적용하지 않았습니다.' }).count() === 1, 'second rejection feedback');
      await close();
      check('F07 closing rejected drafts cancels without a mutation', same((await read()).account, beforeCancelledReject.account)
        && (await read()).commandCount === beforeCancelledReject.commandCount);
    } else throw Error(`Unknown phase: ${phase}`);
    current = await read();
    check(`${phase} protected storage bytes and public source remain unchanged`, current.sentinelsExact && current.publicUnchanged
      && current.forbiddenStorageCalls.length === 0 && current.forwardedAuth === 0 && current.forwardedApi === 0
      && current.prohibitedRequests.length === 0 && current.deniedWebSockets.length === 0
      && current.pageErrors.length === 0 && current.consoleErrors.length === 0 && current.bootstrapErrors.length === 0 && current.workerAttempts.length === 0);
  } catch (error) { failure = String(error?.message ?? error); current = await read().catch(() => null); }
  return { schema: 'flowme-date-detail-app-browser/1', phase, checks, passed: checks.filter(value => value.pass).length,
    failed: checks.filter(value => !value.pass).length + (failure && checks.every(value => value.pass) ? 1 : 0), failure,
    screenshots, firstOpenGeometry, viewports, commandCount: current?.commandCount, syntheticRevision: current?.account?.revision,
    selectedItemIds: primary && twin ? { primary: primary.id, sameTitleTwin: twin.id } : null,
    expectedBuildId: current?.expectedBuildId, documentLoads: current?.documentLoads,
    authIntercepted: current?.authIntercepted, apiIntercepted: current?.apiIntercepted,
    forwardedAuth: current?.forwardedAuth, forwardedApi: current?.forwardedApi,
    sentinelsExact: current?.sentinelsExact, publicUnchanged: current?.publicUnchanged,
    forbiddenStorageCalls: current?.forbiddenStorageCalls, storageCallCount: current?.storageCalls?.length,
    prohibitedRequests: current?.prohibitedRequests, deniedWebSockets: current?.deniedWebSockets,
    pageErrors: current?.pageErrors, consoleErrors: current?.consoleErrors, bootstrapErrors: current?.bootstrapErrors,
    workerAttempts: current?.workerAttempts, rejectedCommands: current?.rejectedCommands?.length,
    heldCommands: current?.heldCommands?.length, requestHeld: current?.requestHeld,
    synthetic: true, nativeDatePicker: false, device: false, observedUsers: 0 };
}
