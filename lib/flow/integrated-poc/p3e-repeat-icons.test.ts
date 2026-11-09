import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

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
