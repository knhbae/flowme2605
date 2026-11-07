import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// UX 3차 묶음 (11/7, spec ux-bundle3-spec 2319): five tabs 쓰기·오늘·분류·Flow·나. The new tabs move by navigate() alone;
// the 더보기 menu's items live on 나, in the Flow tab and in a 복구함 sheet; writing, Korean input and saving are untouched.
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const workspace = read('components/flow/integrated-poc/AlphaWorkspace.tsx');
const css = read('components/flow/integrated-poc/AlphaWorkspace.module.css');
const body = (name: string) => { const at = workspace.indexOf(`async function ${name}(`); return workspace.slice(at, workspace.indexOf('\n  }\n', at)); };

test('Flow and 나 call navigate() and nothing of what it does (input, locks, saves); no pointerdown hold', () => {
  for (const name of ['chooseFlowTab', 'chooseMeTab']) {
    const code = body(name);
    assert(code.includes('await navigate({ view:'), name);
    for (const step of ['captureInput', 'lockInput', 'flushAll', 'mutate(', 'focus(']) assert(!code.includes(step), `${name}: ${step}`);
  }
  // navigate() keeps input, locks every editor, saves them all, checks, then moves (since save wait 11/7 the save is
  // waited on with a notice and a limit; move-save-wait.test.ts).
  // Save wait P3 (11/7): the wait and the move are moveAfterSave(), which navigate() hands them to.
  const move = body('navigate') + body('moveAfterSave');
  for (const step of ["if (!captureInput()) return 'refused';",'allEditors().map(port => port?.lockInput())', 'if (port && !await port.flushAll()) return false;', "if (outcome !== 'saved')"])
    assert(move.includes(step), step);
  const tabs = workspace.slice(workspace.indexOf('data-main-tab="flow"'), workspace.indexOf('</nav>}', workspace.indexOf('data-main-tab="flow"')));
  assert(!tabs.includes('onPointerDown'));
  assert(workspace.indexOf('data-main-tab={tab}') < workspace.indexOf('data-main-tab="flow"') && workspace.indexOf('data-main-tab="flow"') < workspace.indexOf('data-main-tab="me"'), 'Tab order 쓰기·오늘·분류 → Flow → 나');
  // Buttons with aria-current, no tab roles.
  assert(!/role="tab"/.test(tabs));
});

test('the tabs are five: 74px-wide cells on phones, five rows in the side bar; the badge is the warning token', () => {
  assert(css.includes('.page[data-alpha-frame="b"] .globalNavigation { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; padding-inline: 8px; }'));
  assert(css.includes('.page[data-alpha-frame="b"] .globalNavigation button{min-height:52px;'), 'at least 44px tall on phones (write polish F: 52px in a 60px bar)');
  assert(css.includes('.page[data-alpha-frame="b"] .globalNavigation button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:100%;min-height:72px;'), 'full-width 72px rows in the side bar');
  assert(css.includes('background: var(--flowme-b-warning-bg); color: var(--flowme-b-warning-ink);') && !css.includes('#f4c7a3'));
  assert(!css.includes('.page[data-alpha-frame="b"] .management > summary { display: none; }'), 'the menu left for an account that cannot open shows its button');
});

test('나 is the 내 활동 screen named 나, with the account under it and its sections after it', () => {
  assert(workspace.includes("destination.view === 'activity' ? '나' :"));
  assert(read('components/flow/integrated-poc/ProgramCommunity.tsx').includes("<h1>{view === 'activity' ? '나' : '이야기'}</h1>"));
  assert(workspace.includes('activityTabs={meHead}') && workspace.includes("{destination.view === 'creator' && activityTabs}"));
  // 실험 re-keys the 쓰기 space and says what it did there, so it goes to 쓰기 first.
  assert(workspace.includes("onClick={() => void (async () => { if (destinationRef.current.view !== 'space') await navigate({ view: 'space' }); if (destinationRef.current.view === 'space') await switchCollectionsMode(); })()}"));
  // The sheet styles: a bottom sheet on phones, every control at least 44px.
  assert(css.includes('.recoverySheet::backdrop { background: var(--flowme-b-scrim); }'));
  assert(css.includes('.recoverySheetHead button { min-width: 48px; min-height: 48px;') && css.includes('.meFold > summary { display: flex; align-items: center; min-height: 48px;'));
});
