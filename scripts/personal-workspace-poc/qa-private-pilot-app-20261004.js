async (page, options) => {
  // Synthetic CLI callback only. Rendered product controls own every write.
  // Source content, expectations and generated IDs are never embedded here.
  const { approved, handoff, provenance, expectedBuildId, outputDirectory } = options;
  const requestId = 'FLOWME-FINISH-PRIVATE-PILOT-20261004-1400-DEV3';
  const checks = [], screenshots = [], viewports = [], phases = [], periodExpectations = [];
  const acceptance = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`A${String(i + 1).padStart(2, '0')}`, 'NOT_RUN']));
  if (handoff?.requestId !== requestId || handoff.title !== approved.title || handoff.raw !== approved.raw
    || typeof handoff.notice !== 'string' || !handoff.notice.trim() || !approved.raw.includes(handoff.notice)
    || !Array.isArray(handoff.expected?.taskTitles) || !handoff.expected.taskTitles.length
    || !Array.isArray(handoff.expected.items) || handoff.expected.items.length !== handoff.expected.taskTitles.length
    || !Array.isArray(handoff.items) || handoff.items.length !== handoff.expected.items.length
    || !handoff.personalMemo?.addAfterHandoff || typeof handoff.personalMemo.beforePaste !== 'string'
    || typeof handoff.personalMemo.afterPaste !== 'string' || !handoff.personalMemo.beforePaste.trim()
    || !handoff.personalMemo.afterPaste.trim() || handoff.personalMemo.beforePaste === handoff.personalMemo.afterPaste
    || /[\r\n]/.test(handoff.personalMemo.beforePaste + handoff.personalMemo.afterPaste))
    throw Error('B-exact-inspected-packet-and-personal-memo-required');
  const targetReview = handoff.items.find(value => value.title === handoff.expected.primaryTitle);
  if (!targetReview || !/^\d{4}-\d{2}-\d{2}$/.test(targetReview.expectedPrivateDateAfterChange)
    || targetReview.initialPersonalDate === targetReview.expectedPrivateDateAfterChange)
    throw Error('B-inspected-private-date-change-required');
  const changedDate = targetReview.expectedPrivateDateAfterChange;
  const oldMemo = handoff.personalMemo.beforePaste, newMemo = handoff.personalMemo.afterPaste;
  let memoPrefix = 0, memoSuffix = 0;
  while (memoPrefix < oldMemo.length && memoPrefix < newMemo.length && oldMemo[memoPrefix] === newMemo[memoPrefix]) memoPrefix++;
  while (memoSuffix < oldMemo.length - memoPrefix && memoSuffix < newMemo.length - memoPrefix
    && oldMemo[oldMemo.length - memoSuffix - 1] === newMemo[newMemo.length - memoSuffix - 1]) memoSuffix++;
  const memoReplacement = newMemo.slice(memoPrefix, newMemo.length - memoSuffix);
  const check = (name, value) => { checks.push({ name, pass: !!value }); if (!value) throw Error(name); };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b), copy = value => JSON.parse(JSON.stringify(value));
  const read = () => page.evaluate(() => window.__privatePilotFixtureReport());
  const wait = async (predicate, label) => {
    for (let i = 0; i < 240; i++) { const state = await read(); if (await predicate(state)) return state; await page.waitForTimeout(50); }
    throw Error(`Timed out: ${label}`);
  };
  const button = name => page.getByRole('button', { name, exact: true });
  const creatorNav = page.getByRole('navigation', { name: '제작 단계', exact: true });
  const nav = page.getByRole('navigation', { name: '개인공간 보기', exact: true });
  const detail = page.locator('dialog[data-task-detail]');
  const editor = page.getByRole('region', { name: '개인 문서 편집', exact: true });
  const area = editor.getByRole('textbox', { name: '문서 내용', exact: true });
  const shot = async label => {
    const path = `${outputDirectory}/${label}.png`;
    await page.screenshot({ path, fullPage: false, mask: [page.getByText('private-pilot@example.invalid', { exact: true })] }); screenshots.push(path);
  };
  let current, initial, sourceOwner, primary, primaryId, documentId, draftId, protectedBefore, activeAcceptance, failure = null;
  const identityMap = {};
  const task = state => state.items.find(value => value.id === primaryId);
  const document = state => state.documents.find(value => value.id === documentId);
  const owner = state => state.account.space.creatorWorkspace;
  const taskFacts = value => ({ id: value.id, docId: value.docId, title: value.title, date: value.date,
    time: value.time, note: value.note, done: value.done, subchecks: value.subchecks, scopeId: value.scopeId });
  // Derived indices shift when a target memo is inserted. Peer IDs/fields,
  // outside-target line IDs+bytes and peer progress must remain exact.
  const protectedFacts = state => {
    const doc = document(state), row = doc?.rows.find(value => value.id === primaryId);
    const lines = state.account.space.text.documents.find(value => value.id === documentId)?.lines;
    if (!doc || !row || !lines) return null;
    return { peers: state.items.filter(value => value.id !== primaryId).map(taskFacts),
      outside: lines.filter((_, index) => index < row.index || index >= row.subtreeEndIndex),
      otherDocuments: state.account.space.text.documents.filter(value => value.id !== documentId),
      flows: state.account.space.text.flows, folders: state.account.space.text.folders,
      bindings: state.account.space.text.bindings, taskScopes: state.account.space.text.taskScopes,
      itemScopes: state.account.space.text.itemScopes,
      peerProgress: state.account.space.text.progressRecords.filter(value => value.taskId !== primaryId) };
  };
  const sourceExact = state => state.creatorRecords[draftId]?.rawText === approved.raw
    && state.creatorRecords[draftId]?.title === approved.title && same(owner(state), sourceOwner);
  const protect = (state, label) => check(`${label} source/peer exact protection`, sourceExact(state)
    && same(protectedFacts(state), protectedBefore) && state.publicUnchanged && state.sourceUnchanged);
  const recordPhase = async name => {
    const state = await read(); phases.push({ name, revision: state.account.revision, commands: state.commandCount,
      documentIds: state.documents.map(value => value.id), itemIds: state.items.map(value => value.id), creatorIds: Object.keys(state.creatorRecords) }); return state;
  };
  const runAcceptance = async (id, work) => { activeAcceptance = id; await work(); acceptance[id] = 'PASS'; activeAcceptance = null; };
  const openCreator = async () => { await button('내 활동').click(); await button('Flow 만들기').click(); await creatorNav.waitFor(); };
  const showAll = async () => { await nav.getByRole('button', { name: '전체 할 일', exact: true }).click(); };
  const openTask = async () => {
    await showAll(); await page.locator(`[data-task-id="${primaryId}"]:visible`).getByRole('button', { name: / 작업$/ }).click(); await detail.waitFor();
  };
  const closeTask = async () => { await page.keyboard.press('Escape'); await detail.waitFor({ state: 'hidden' }); };
  const openSource = async () => { await openTask(); await detail.getByRole('button', { name: '원문 열기', exact: true }).click(); await editor.waitFor(); };
  const memoSaved = async value => {
    current = await wait(state => task(state)?.note === value, 'private memo saved');
    await wait(async () => await editor.getAttribute('data-dirty') === 'false', 'native editor save acknowledged'); current = await read();
  };
  const paste = async value => page.evaluate(text => navigator.clipboard.writeText(text), value);
  const selectMemo = async (state, value) => {
    const doc = document(state), rows = doc.rows.filter(row => row.kind === 'property' && row.taskId === primaryId && /^ *-\s+메모:/.test(row.text));
    check('identified exact single-line private memo owner', rows.length === 1 && task(state).note === value);
    const row = rows[0], prefix = /^ *-\s+메모:\s*/.exec(row.text)?.[0];
    const memoStart = doc.raw.split('\n').slice(0, row.index).reduce((total, line) => total + line.length + 1, 0) + prefix.length;
    const start = memoStart + memoPrefix, end = memoStart + value.length - memoSuffix;
    check('memo owner has exact expected text', doc.raw.slice(memoStart, memoStart + value.length) === value && row.text.slice(prefix.length) === value);
    check('partial memo selection preserves prefix/suffix and adjacent syntax', (memoPrefix > 0 || memoSuffix > 0)
      && end > start && doc.raw.slice(start, end) === value.slice(memoPrefix, value.length - memoSuffix));
    await area.focus();
    // Selection only: never set a DOM value or invoke a product mutation.
    await area.evaluate((node, range) => node.setSelectionRange(range.start, range.end), { start, end });
    return { start, end, raw: doc.raw };
  };
  const savedHistory = async (kind, expectedSpace) => {
    const before = await read();
    if (kind === 'redo') {
      const management = page.locator('details[aria-label="계정 및 자료 관리"]');
      if (!await management.evaluate(node => node.open)) await management.locator('summary').first().click();
      await management.getByRole('button', { name: '다시 실행', exact: true }).click();
      await management.locator('summary').first().click();
    } else await button('되돌리기').click();
    current = await wait(state => state.commandCount > before.commandCount, `saved ${kind}`);
    check(`A08 saved ${kind} restores exact private snapshot`, same(current.account.space, expectedSpace)); protect(current, `A08 ${kind}`);
  };
  const localToday = () => page.evaluate(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; });
  // Identify the locale-dependent native date day segment using arrow keys and
  // read-only value checks. No fill(), picker or JS value mutation is used.
  const keyboardDate = async (input, target) => {
    const original = await input.inputValue();
    if (original.slice(0, 8) !== target.slice(0, 8)) throw Error('B-native-keyboard-same-month-input-required');
    const delta = Number(target.slice(-2)) - Number(original.slice(-2)); await input.focus();
    let daySegment = false;
    for (let i = 0; i < 4; i++) {
      await input.press('ArrowUp'); const probe = await input.inputValue(); await input.press('ArrowDown');
      check('native keyboard date probe restored draft', await input.inputValue() === original);
      if (probe.slice(0, 8) === original.slice(0, 8) && Number(probe.slice(-2)) === Number(original.slice(-2)) + 1) { daySegment = true; break; }
      await input.press('ArrowRight');
    }
    if (!daySegment) throw Error('B-native-date-day-segment-not-supported');
    for (let i = 0; i < Math.abs(delta); i++) await input.press(delta > 0 ? 'ArrowUp' : 'ArrowDown');
    check('native keyboard date equals inspected expected date', await input.inputValue() === target);
  };
  const shift = (date, days) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };
  const visibleTaskIds = () => page.locator('[data-task-id]:visible').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-task-id')));
  const inspectPeriod = async (name, key, date) => {
    const before = await read(); await nav.getByRole('button', { name, exact: true }).click();
    await page.locator(`[data-program-period="${key}"][aria-current="page"]`).waitFor();
    let queryDate = null;
    if (['today', 'week', 'month'].includes(key)) { const query = page.getByLabel('조회 날짜', { exact: true }); if (date) await query.fill(date); queryDate = await query.inputValue(); }
    const weekday = queryDate ? new Date(`${queryDate}T12:00:00Z`).getUTCDay() : 0;
    const from = key === 'week' ? shift(queryDate, -(weekday + 6) % 7) : key === 'month' ? `${queryDate.slice(0, 7)}-01` : null;
    const to = key === 'week' ? shift(from, 6) : key === 'month' ? new Date(Date.UTC(Number(queryDate.slice(0, 4)), Number(queryDate.slice(5, 7)), 0, 12)).toISOString().slice(0, 10) : null;
    const expectedIds = before.items.filter(value => key === 'all' || key === 'undated' ? key === 'all' || value.date === null
      : key === 'today' ? !!value.date && (value.date === queryDate || value.date < queryDate && !value.done)
      : !!value.date && value.date >= from && value.date <= to).map(value => value.id).sort();
    await wait(async () => same((await visibleTaskIds()).sort(), expectedIds), `${name} actual inclusion/exclusion`);
    current = await read(); check(`A03 ${name} ${queryDate ?? key} actual membership`, same((await visibleTaskIds()).sort(), expectedIds));
    check('A03 period navigation has zero domain changes', current.commandCount === before.commandCount && same(current.account, before.account)); protect(current, 'A03');
    periodExpectations.push({ name, period: key, queryDate, expectedIds, visibleIds: await visibleTaskIds() });
  };
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://alpha.wikiplans.com' });
    await runAcceptance('A01', async () => {
      initial = await wait(state => state.authIntercepted > 0, 'fresh synthetic UI');
      check('A01 empty isolated account before creator input', initial.documents.length === 0 && initial.items.length === 0
        && Object.keys(initial.creatorRecords).length === 0 && Object.values(initial.context.public).every(rows => rows.length === 0));
      check('A01 exact candidate with no Auth/API forwarding', initial.expectedBuildId === expectedBuildId && initial.documentLoads === 1 && initial.forwardedAuth === 0 && initial.forwardedApi === 0);
      await openCreator(); await creatorNav.getByRole('button', { name: '제작 초안', exact: true }).click(); await button('빈 제작 원문 만들기').click();
      const title = page.getByLabel('제작 초안 제목', { exact: true }), raw = page.getByRole('textbox', { name: '제작 원문', exact: true });
      await title.fill(approved.title); await paste(approved.raw); await raw.focus(); await raw.press('Control+V'); await button('제작 초안 저장').click();
      current = await wait(state => Object.values(state.creatorRecords).some(record => record.title === approved.title && record.rawText === approved.raw), 'explicit creator save');
      draftId = Object.keys(current.creatorRecords).find(id => current.creatorRecords[id].title === approved.title);
      const record = current.creatorRecords[draftId], save = current.commands.find(command => command.kind === 'creator' && command.intent.type === 'library-action' && command.intent.action.type === 'save');
      check('A01 exact creator bytes and acknowledged semantic save', record.rawText === approved.raw && record.recordRevision === 1
        && save?.intent.action.sourceFingerprint === record.sourceFingerprint && current.documents.length === 0 && current.items.length === 0);
      await shot('01-creator-saved'); await recordPhase('creator-saved'); await page.reload({ waitUntil: 'domcontentloaded' }); await openCreator();
      await creatorNav.getByRole('button', { name: '원문', exact: true }).click(); await raw.waitFor();
      check('A01 reload exact title/raw and stable creator record', await title.inputValue() === approved.title && await raw.inputValue() === approved.raw
        && (await read()).creatorRecords[draftId].rawText === approved.raw && (await read()).documents.length === 0);
    });
    await runAcceptance('A02', async () => {
      const before = await read(); await creatorNav.getByRole('button', { name: '결과', exact: true }).click(); await shot('02-source-result');
      check('A02 preview is read-only', (await read()).commandCount === before.commandCount && (await read()).documents.length === 0);
      await button('확인한 제작물을 개인 문서로 인계').click(); current = await wait(state => state.documents.length === 1 && owner(state)?.handoffs[draftId], 'explicit raw handoff');
      documentId = owner(current).handoffs[draftId].documentId; sourceOwner = copy(owner(current));
      check('A02 exact initial private items including empty notes/null times', current.documents[0].id === documentId
        && same(current.items.map(value => value.title), handoff.expected.taskTitles) && current.items.every(value => !value.done)
        && same(current.items.map(value => ({ title: value.title, date: value.date, time: value.time, note: value.note,
          subchecks: value.subchecks.map(child => ({ title: child.title, done: child.done })) })), handoff.expected.items));
      const candidates = current.items.filter(value => value.title === handoff.expected.primaryTitle); primary = candidates[0]; primaryId = primary?.id;
      const sourceRow = owner(current).executionSources[draftId].revisions.at(-1).rows.find(value => value.documentLineId === primaryId);
      check('B07 ordinary target with inspected empty initial memo', candidates.length === 1 && primary.note === '' && primary.time === null
        && primary.date === targetReview.initialPersonalDate && sourceRow?.kind === 'ordinary');
      for (const item of handoff.items) { const matches = current.items.filter(value => value.title === item.title); check('A02 unique reviewed Item identity', matches.length === 1); identityMap[item.reviewAlias] = { documentId, taskId: matches[0].id }; }
      check('A02 separate creator/personal ownership and no publication', draftId !== documentId && new Set(current.items.map(value => value.id)).size === current.items.length
        && current.account.space.publications.length === 0 && current.creatorRecords[draftId].rawText === approved.raw);
      protectedBefore = copy(protectedFacts(current)); protect(current, 'A02'); await recordPhase('personal-handoff');
    });
    await runAcceptance('A03', async () => {
      await nav.waitFor(); for (const [name, key] of [['오늘','today'],['주간','week'],['월간','month'],['날짜 미정','undated'],['전체 할 일','all']]) await inspectPeriod(name, key);
      await inspectPeriod('오늘', 'today', targetReview.initialPersonalDate); await inspectPeriod('주간', 'week', targetReview.initialPersonalDate);
      const longDate = handoff.items.map(value => value.initialPersonalDate).filter(Boolean).sort().at(-1); await inspectPeriod('월간', 'month', longDate);
      const beforeReturn = await read(); await openSource(); current = await read();
      check('A03 source return keeps identity and has zero mutation', current.commandCount === beforeReturn.commandCount && same(current.account, beforeReturn.account)); protect(current, 'A03 source-return'); await shot('03-period-and-source');
    });
    await runAcceptance('A04', async () => {
      await openTask(); const before = await read(); await keyboardDate(detail.getByLabel('실행 날짜', { exact: true }), changedDate);
      check('A04 keyboard draft has no saved mutation or added time', (await read()).commandCount === before.commandCount && await detail.locator('input[type="time"]').inputValue() === '');
      await detail.getByRole('button', { name: '날짜·시간 적용', exact: true }).click(); current = await wait(state => task(state)?.date === changedDate, 'packet private date saved');
      check('A04 only requested date changed; no time added', task(current).date === changedDate && task(current).time === null && task(current).note === ''); protect(current, 'A04');
      await closeTask(); await openTask(); check('A04 target reopened with saved date', await detail.getByLabel('실행 날짜', { exact: true }).inputValue() === changedDate); await closeTask();
      const saved = await read(); await page.reload({ waitUntil: 'domcontentloaded' }); await nav.waitFor(); current = await read();
      check('A04 reload restores exact successful private state', same(current.account.space, saved.account.space)); protect(current, 'A04 reload'); await shot('04-date-saved-reloaded');
    });
    await runAcceptance('A05', async () => {
      await openSource(); const before = await read(), doc = document(before), row = doc.rows.find(value => value.id === primaryId);
      const lines = doc.raw.split('\n'); lines.splice(row.index + 1, 0, `${'  '.repeat(row.depth + 1)}- 메모: ${handoff.personalMemo.beforePaste}`);
      await area.fill(lines.join('\n')); await memoSaved(handoff.personalMemo.beforePaste); protect(current, 'A05 memo added');
      const baseline = await read(); await paste(memoReplacement); const selected = await selectMemo(baseline, handoff.personalMemo.beforePaste);
      // Stay before shipped 450ms autosave. A racing save is a real failure,
      // never hidden by timer overrides or server-snapshot Undo.
      await area.press('Control+V'); const pasted = await area.inputValue(); await area.press('Control+Z'); const restored = await area.inputValue();
      const after = await read();
      check('A05 actual partial clipboard paste preserves adjacent bytes', pasted === selected.raw.slice(0, selected.start) + memoReplacement + selected.raw.slice(selected.end));
      check('A05 native dirty Undo before save; zero server operations', restored === selected.raw && after.commandCount === baseline.commandCount && same(after.account, baseline.account));
      await wait(async () => await editor.getAttribute('data-dirty') === 'false', 'native Undo restored clean draft'); current = await read(); protect(current, 'A05 native Undo'); await shot('05-native-paste-undo');
    });
    await runAcceptance('A06', async () => {
      await openTask(); const beforeCancel = await read(); await keyboardDate(detail.getByLabel('실행 날짜', { exact: true }), targetReview.initialPersonalDate);
      check('A06 unapplied date prevents origin navigation', await detail.getByRole('button', { name: '원문 열기', exact: true }).isDisabled()); await closeTask();
      current = await read(); check('A06 Escape cancels draft without successful domain change', current.commandCount === beforeCancel.commandCount && same(current.account, beforeCancel.account)); protect(current, 'A06 cancel');
      await openTask(); const beforeIdentical = await read(); await detail.getByRole('button', { name: '날짜·시간 적용', exact: true }).click(); await closeTask();
      current = await read(); check('A06 identical date/time creates zero successful domain changes', current.commandCount === beforeIdentical.commandCount && same(current.account, beforeIdentical.account)); protect(current, 'A06 identical');
    });
    // Run saved Undo/Redo before reload discards transient controller history.
    // This is independent of native dirty Undo in A05.
    await runAcceptance('A08', async () => {
      await openSource(); const before = await read(); await paste(memoReplacement); await selectMemo(before, handoff.personalMemo.beforePaste);
      await area.press('Control+V'); await memoSaved(handoff.personalMemo.afterPaste); const after = await read(); protect(after, 'A08 memo saved');
      await savedHistory('undo', before.account.space); await savedHistory('redo', after.account.space); await shot('06-saved-undo-redo'); await recordPhase('memo-saved-redone');
    });
    await runAcceptance('A07', async () => {
      await showAll(); const completionDate = await localToday(); await page.locator(`[data-task-id="${primaryId}"]:visible`).getByRole('button', { name: `${primary.title} 완료`, exact: true }).click();
      current = await wait(state => task(state)?.done, 'explicit completion saved');
      check('A07 completion uses existing dated progress record', task(current).date === changedDate && task(current).time === null && task(current).note === handoff.personalMemo.afterPaste
        && current.account.space.text.progressRecords.some(value => value.taskId === primaryId && value.date === completionDate && value.percent === 100)); protect(current, 'A07 completion');
      const saved = await read(); await page.reload({ waitUntil: 'domcontentloaded' }); await nav.waitFor(); current = await read();
      check('A07 reload preserves date/memo/completion and exact snapshot', same(current.account.space, saved.account.space)); protect(current, 'A07 reload'); await shot('07-completed-reloaded');
    });
    await runAcceptance('A09', async () => {
      const before = await read(); await openCreator(); await creatorNav.getByRole('button', { name: '결과', exact: true }).click();
      await page.getByText('제작 초안 관리·출처', { exact: true }).click(); await page.getByText('개인 실행으로 인계한 원문 판본', { exact: true }).click();
      await button('같은 개인 문서·이전 회차 기록 확인').click(); await editor.waitFor(); current = await read();
      check('A09 same-plan reopen is read-only; no new run/clone/reset', current.commandCount === before.commandCount && same(current.account, before.account)
        && current.documents.length === 1 && task(current).done && task(current).note === handoff.personalMemo.afterPaste); protect(current, 'A09'); await shot('08-same-plan-reopened');
    });
    await runAcceptance('A10', async () => {
      await showAll(); const before = await read(), date = await localToday(); await page.locator(`[data-task-id="${primaryId}"]:visible`).getByRole('button', { name: `${primary.title} 다시 열기`, exact: true }).click();
      current = await wait(state => task(state)?.done === false, 'explicit completed Item reopen');
      const expectedRecords = copy(before.account.space.text.progressRecords), index = expectedRecords.findIndex(value => value.taskId === primaryId && value.date === date);
      check('A10 existing same-day progress record available', index >= 0);
      // Preserve the wire record's existing key order; only percent changes.
      expectedRecords[index] = { ...expectedRecords[index], percent: 0 };
      check('A10 explicit reopen follows dated-record replacement, not event-history invention', same(current.account.space.text.progressRecords, expectedRecords)
        && task(current).id === primaryId && task(current).date === changedDate && task(current).time === null && task(current).note === handoff.personalMemo.afterPaste); protect(current, 'A10');
      await recordPhase('same-item-explicitly-reopened'); await shot('09-item-reopened');
    });
    for (const [width, height] of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]) {
      await page.setViewportSize({ width, height }); await openTask();
      const geometry = await detail.evaluate(node => ({ viewport: { width: innerWidth, height: innerHeight }, overflow: document.documentElement.scrollWidth > innerWidth + 1, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
      check(`B viewport ${width}x${height} no horizontal overflow`, !geometry.overflow && geometry.scrollWidth <= geometry.clientWidth + 1);
      viewports.push(geometry); await shot(`10-detail-${width}x${height}`); await closeTask();
    }
    current = await recordPhase('final'); protect(current, 'final');
    check('B final synthetic boundaries and protected storage', current.sentinelsExact && current.publicUnchanged && current.sourceUnchanged
      && current.forbiddenStorageCalls.length === 0 && current.forwardedAuth === 0 && current.forwardedApi === 0 && current.liveBackendWrites === 0
      && current.prohibitedRequests.length === 0 && current.deniedWebSockets.length === 0 && current.pageErrors.length === 0 && current.consoleErrors.length === 0
      && current.bootstrapErrors.length === 0 && current.workerAttempts.length === 0 && current.localAuthKeyPrefixValid);
  } catch (error) { failure = String(error?.message ?? error); if (activeAcceptance) acceptance[activeAcceptance] = 'FAIL'; current = await read().catch(() => null); }
  return { schema: 'flowme-private-pilot-app-browser/1', requestId, sourceVersion: handoff.sourceVersion, packetStatus: handoff.status,
    acceptance, checks, passed: checks.filter(value => value.pass).length,
    failed: checks.filter(value => !value.pass).length + (failure && checks.every(value => value.pass) ? 1 : 0), failure,
    screenshots, viewports, phases, periodExpectations, provenance, expectedBuildId, draftId, documentId, primaryId, identityMap,
    creatorRecordRevision: current?.creatorRecords[draftId]?.recordRevision, sourceFingerprint: current?.creatorRecords[draftId]?.sourceFingerprint,
    commandCount: current?.commandCount, syntheticRevision: current?.account?.revision, documentLoads: current?.documentLoads,
    forwardedAuth: current?.forwardedAuth, forwardedApi: current?.forwardedApi, forbiddenStorageCalls: current?.forbiddenStorageCalls,
    sentinelsExact: current?.sentinelsExact, publicUnchanged: current?.publicUnchanged, sourceUnchanged: current?.sourceUnchanged,
    prohibitedRequests: current?.prohibitedRequests, pageErrors: current?.pageErrors, consoleErrors: current?.consoleErrors,
    notRun: { nativeDatePicker: 'NOT_RUN; keyboard only', memoModalCancel: 'No separate memo-cancel control; date Escape in A06 and native Undo in A05 remain distinct', device: 'NOT_RUN', observedUsers: 0 },
    synthetic: true, realLogin: false, realBackendWrites: 0, nativeDateKeyboard: acceptance.A04 === 'PASS', nativeDatePicker: false, device: false, observedUsers: 0 };
}
