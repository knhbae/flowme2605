import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { programImportItemView } from './public-repeat-import';

// B2 QA P3-B2-1 (11/10): the import sheet and the publisher draw the set's repeat icon, not the letter ↻.
const component = (name: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const icon = '<ProgramIcon name="repeat" size={16} className="flowme-repeat-icon" />';

test('P3-B2-1: 가져오기 sheet (이렇게 놓입니다, the repeat choices) and the publisher (chip, the taker preview) show the repeat icon', () => {
  const discovery = component('ProgramDiscovery.tsx'), publisher = component('ProgramPublisher.tsx');
  assert(discovery.includes(`<b>{row.label}</b><span>${icon}{row.title} · {row.first ?`));
  assert(discovery.includes(`<p className={styles.repeatTitle}>${icon}{repeat.title}`));
  assert(publisher.includes('data-schedule-chip={chip.kind}>{programRepeatText(chip.text, 13)}</span>'));
  assert(publisher.includes(`<b>{row.label}</b><span>${icon}{row.title}{row.first ?`));
  // No letter ↻ left as text in either screen's markup (the chip's words keep it for programRepeatText to draw).
  for (const [name, source] of [['ProgramDiscovery', discovery], ['ProgramPublisher', publisher]] as const) assert(!/>\s*↻|'↻ '|"↻ "/.test(source), name);
});

test('P3e: ③ reads a published repeat (undated, its marker in the title) as ② does, not 날짜 미정; ② rows end in the icon set\'s ›', () => {
  const item = (title: string, subchecks: unknown[] = []) => ({ id: 'i', title, description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks }) as never;
  assert.deepEqual(programImportItemView(item('짐 정리 30분 @매주 토')), { title: '짐 정리 30분', label: '↻ 매주 토' });
  assert.deepEqual(programImportItemView(item('물 주기 @?개월마다')), { title: '물 주기', label: '가져올 때 주기 고름' });
  assert.equal(programImportItemView(item('날짜 없는 일')), null);
  const publisher = component('ProgramPublisher.tsx');
  assert(publisher.includes("const repeat = item.schedule.kind === 'undated' ? programImportItemView(item) : null;\n    if (repeat) return { text: repeat.label, kind: 'repeat' };"));
  assert(publisher.includes('{(chip => <span className={styles.scheduleChip} data-schedule-chip={chip.kind}>{programRepeatText(chip.text, 13)}</span>)(previewChip(item))}'));
  assert(publisher.includes("if (row.scheduleKind === 'undated' && PROGRAM_PICK_MONTHS.test(row.title.trim())) return { text: '가져올 때 주기 고름', kind: 'repeat' };"));
  assert(publisher.includes('{scheduleLabel && <small>{scheduleLabel}</small>}</span><ProgramIcon name="right" size={16} /></button>') && !publisher.includes('<span aria-hidden="true">›</span>'));
});
