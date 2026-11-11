import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { programClone, type ProgramData } from './contract';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { programDayNumber, programDocumentThread, programThreadLayout, programThreadPoints } from './flow-thread';
import { programFlowCardThread } from './program-discovery-display';

// F6-B2 (11/9, 방향 B): the Flow 실, the 하루 view's navy head, round checks, 나's 하고 있는 Flow, the folder card.
const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const component = (name: string) => read(`components/flow/integrated-poc/${name}`);

test('실: distinct days spread 0..1 by their gaps; one day sits at 0; none, no dots', () => {
  assert.deepEqual(programThreadPoints([-14, -7, -7, -1]), [0, 0.538, 1]);
  assert.deepEqual(programThreadPoints([3]), [0]);
  assert.deepEqual(programThreadPoints([]), []);
  assert.equal(programDayNumber('2026-11-10') - programDayNumber('2026-11-09'), 1);
});

test('실 of a card: its 기준일 days, else fixed dates, a repeat-only Flow three even dots; all drawn done', () => {
  const item = (schedule: unknown) => ({ id: 'i', title: 't', description: '', completionCriteria: '', sourceUrl: null, schedule, subchecks: [] }) as never;
  assert.deepEqual(programFlowCardThread({ items: [item({ kind: 'relative', days: -14 }), item({ kind: 'relative', days: 0 }), item({ kind: 'fixed', date: '2026-11-30' }), item({ kind: 'undated' })] }), { points: [0, 1], done: 2 });
  assert.deepEqual(programFlowCardThread({ items: [item({ kind: 'fixed', date: '2026-11-01' }), item({ kind: 'fixed', date: '2026-11-11' }), item({ kind: 'fixed', date: '2026-11-03' })] }), { points: [0, 0.2, 1], done: 3 });
  assert.deepEqual(programFlowCardThread({ items: [item({ kind: 'undated' })] }), { points: [], done: 0 });
});

test('실 of a Flow document of mine: its tasks\' days, the leading all-done days filled, done of all its tasks', () => {
  let data: ProgramData = createProgramData();
  const created = createProgramDocument(data, { actorId: data.activeActorId, requestId: 'f6b2-doc', expectedSpace: data.spaces[data.activeActorId], title: '이사 준비' });
  assert(created.ok); data = programClone(created.data);
  const typed = M.editTextResult(data.spaces[data.activeActorId].text, created.result, ['[2026-11-02]', '- [x] 짐 목록', '[2026-11-09]', '- [x] 전입 예약', '- [ ] 인터넷 이전', '[2026-11-15]', '- [ ] 냉장고', '- [ ] 주소 알리기'].join('\n'), { folderText: true });
  assert.equal(typed.reason, null);
  const thread = programDocumentThread(typed.state, created.result);
  assert.deepEqual(thread.points, [0, 0.538, 1]);
  assert.equal(thread.done, 1, 'only 11/2 is wholly done');
  assert.deepEqual([thread.doneTasks, thread.total], [2, 5]);
});

test('UX FIX (11/10): dots at least 10px apart (the line up to 72, then closer); repeats, ‹ ›, 할 일 추가 and 나 as the mockup', async () => {
  // 이사 준비 2주 as taken: 11/2, 11/9, 11/14, 11/15, 11/30 → 0, .25, .43, .46, 1 of 48px: pushed apart, 48 still fits.
  const days = programThreadPoints(['2026-11-02', '2026-11-09', '2026-11-14', '2026-11-15', '2026-11-30'].map(programDayNumber));
  const laid = programThreadLayout(days, 48, 72);
  assert(laid.xs.every((x, i) => !i || x - laid.xs[i - 1] >= 10 - 1e-9), JSON.stringify(laid));
  assert(laid.width >= 48 && laid.width <= 72);
  const crowded = programThreadLayout([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1], 48, 72);
  assert.equal(crowded.width, 72); assert(crowded.xs.at(-1)! <= 72);
  const space = component('ProgramSpace.tsx'), css = component('ProgramSpace.module.css');
  assert(space.includes('<ProgramFlowThread points={thread.points} done={thread.done} width={48} maxWidth={72} />'));
  assert(space.includes("programRepeatText(`↻ ${line.marker.label}`, 13)") && component('ProgramDiscovery.tsx').includes('{programRepeatText(lines.brief)}'));
  assert(css.includes('.space .executionView .dateNav > button:not(.dateChip) { display: inline-flex;') && css.includes('border: 0; border-radius: 22px; background: transparent;'));
  assert(css.includes('.space .executionView[data-note-today="true"] .tasks { border-top: 0; }'));
  assert(css.includes('.space .quickDisclosure > summary::before { content: ""; flex: none; width: 16px; height: 16px; background: currentColor;'));
  assert(component('ProgramFolderScreen.module.css').includes('.folderIcon[data-muted] { stroke: var(--flowme-b-control); }'));
  assert(component('AlphaWorkspace.tsx').includes("data-me-layout={destination.view === 'activity' ? '' : undefined}"));
  assert(component('AlphaWorkspace.module.css').includes('.page[data-alpha-frame="b"][data-me-layout] .workPane { width: 100%; margin: 0; padding: 0 12px; border: 0; border-radius: 0; }'));
});

test('the 하루 view head (navy, the day big, its counts) replaces the title only there; week and month keep theirs', () => {
  const space = component('ProgramSpace.tsx'), css = component('ProgramSpace.module.css');
  assert(space.includes('compactNoteToday ? <div className={styles.notePeriodTitle} data-day-hero>{dayHero}<div className={styles.notePeriodActions}>'));
  assert(space.includes('</div>{heroStats}</div> : period === \'month\' ? monthTitleRow : periodTitle}'));
  assert(space.includes("const heroRelative = date === today ? '오늘' : date === programShiftDate(today, -1) ? '어제' : date === programShiftDate(today, 1) ? '내일' : '';"));
  assert(css.includes('.space[data-note-layout="true"] .notePeriodTitle[data-day-hero] { position: relative; flex-wrap: wrap;') && css.includes('background: var(--flowme-b-navy); color: #fff; }'));
  assert(css.includes('.heroDay { color: #fff; font-size: 56px; line-height: 1; font-weight: 800; letter-spacing: -1px; font-variant-numeric: tabular-nums; }'));
});

test('round checks 22 with the press motion (120 ms primary, 320 ms done), a Flow\'s task ringed teal; the band likewise', () => {
  const css = component('ProgramSpace.module.css'), band = component('ProgramFlowTodayBand.module.css'), space = component('ProgramSpace.tsx');
  assert(css.includes('.space .check > .checkMark:not([data-check="partial"]) { width: 22px; height: 22px; border-width: 2px; border-style: solid; border-radius: 50%;'));
  assert(css.includes('transition: background-color 320ms ease, border-color 320ms ease; }') && css.includes('background: var(--flowme-b-primary); transition-duration: 0ms; }') && css.includes('transition: background-color 320ms ease 120ms, border-color 320ms ease 120ms; }'));
  assert(css.includes('.space .task[data-flow-row] .check > .checkMark[data-check="open"] { border-color: var(--flowme-b-flow); }'));
  assert(space.includes("data-flow-row={rowFlowTitle(task) ? '' : undefined}"));
  // F8 1단계: the band holds more than Flows; a Flow's row keeps the teal ring.
  assert(band.includes('width: 22px; height: 22px; border: 2px solid var(--flowme-b-control); border-radius: 50%;') && band.includes('.rows > li[data-kind="flow"] .check > span[data-check="open"] { border-color: var(--flowme-b-flow); }'));
});

test('the 실 sits where a Flow shows: 오늘 rows (name · 실 · n/m), the band, Flow 찾기 and the publish preview card, 나', () => {
  assert(component('ProgramSpace.tsx').includes('<span className={styles.rowFlow} data-row-flow>{flow}</span>{(thread => thread && <span className={styles.rowThread}><ProgramFlowThread points={thread.points} done={thread.done} width={48} maxWidth={72} />{thread.doneTasks}/{thread.total}</span>)(flowThreads.get(task.docId))}'));
  assert(component('ProgramFlowTodayBand.tsx').includes('{props.thread && <ProgramFlowThread points={props.thread.points} done={props.thread.done} width={56} />}'));
  assert(component('ProgramDiscovery.tsx').includes('<span className={styles.cardMeta}><ProgramFlowThread {...programFlowCardThread(current)} width={64} />{programRepeatText(lines.brief)}</span>'));
  assert(component('ProgramPublicationSteps.tsx').includes('<span className={discoveryStyles.cardMeta}><ProgramFlowThread {...programFlowCardThread(version)} width={64} />{programRepeatText(lines.brief)}</span>'));
  const community = component('ProgramCommunity.tsx');
  assert(community.includes('<span className={styles.doingName}>{flow.title}</span><ProgramFlowThread points={flow.points} done={flow.done} width={72} /><small>{flow.doneTasks}/{flow.total}</small>'));
  assert(component('ProgramDiscovery.module.css').includes('.cardBadge[data-badge="공식"]{background:var(--flowme-b-flow-soft);color:var(--flowme-b-flow);font-weight:700}'));
});

test('나 and 공개 관리: icons on 내 활동, the icon set\'s ‹ › (no white box), titles 26/800; the folder list a white card with the 오늘 icon', () => {
  const community = component('ProgramCommunity.tsx'), management = component('ProgramPublicationManagement.tsx');
  for (const [icon, label] of [['flow', '내 공개 Flow'], ['link', '받은 후기·반응'], ['mail', '보낸 제안'], ['write', '내가 쓴 글']]) assert(community.includes(`<summary><ProgramIcon name="${icon}" size={20} />${label}<small>`), label);
  assert(management.includes('onClick={() => leave(onBack)}><ProgramIcon name="back" size={24} /></button>') && !/>›<\/span>|>‹<\/button>/.test(management));
  assert(component('ProgramPublicationManagement.module.css').includes('.management .header > button { display: inline-flex; align-items: center; justify-content: center; border: 0; padding: 0; width: 44px; background: transparent;'));
  assert(read('app/globals.css').includes('--flowme-icon-right: url("data:image/svg+xml,'));
  assert(!/content: ["']›["']/.test(component('ProgramCommunity.module.css') + component('AlphaWorkspace.module.css') + component('ProgramPublicationManagement.module.css')));
  const folders = component('ProgramFolderList.tsx');
  assert(folders.includes('<ProgramIcon name="today" size={20} className={styles.allIcon} /><span className={styles.folderName} data-all>모든 할 일</span>') && !folders.includes('<ProgramFolderIcon dashed />'));
  assert(component('ProgramFolderScreen.module.css').includes('.list ul { margin: 0; padding: 0; list-style: none; overflow: hidden; border: 1px solid var(--flowme-b-hair); border-radius: 18px; background: var(--flowme-b-surface); }'));
  assert(component('ProgramCommunity.module.css').includes('.community .header h1 { font-size: 26px; line-height: 34px; font-weight: 800; letter-spacing: -0.3px; }'));
});
