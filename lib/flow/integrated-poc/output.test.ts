import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProgramOutput, classifyProgramUrl, type ProgramOutput, type ProgramOutputFormat } from './output';
import type { ProgramPublicVersion } from './contract';

const now = '2026-09-12T01:23:45.123Z';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function version(): ProgramPublicVersion {
  return { id: 'version-1', flowId: 'flow-1', number: 1, parentVersionId: null, title: '이사 준비', summary: '범위: 입주 전 준비',
    createdBy: 'creator', createdAt: now, source: { kind: 'user-text', label: '사용자 원문', url: 'https://example.com/source', checkedAt: null }, items: [
      { id: 'relative', title: '상대 일정', description: '첫 줄\n둘째 줄, 쉼표; 구분\\경로', completionCriteria: '확인 기준', sourceUrl: 'https://example.com/item', schedule: { kind: 'relative', days: -1 }, subchecks: [{ id: 'sub', title: '하위 확인' }] },
      { id: 'fixed', title: '고정 일정', description: '설명', completionCriteria: '고정 완료', sourceUrl: null, schedule: { kind: 'fixed', date: '2026-09-20' }, subchecks: [] },
      { id: 'undated', title: '날짜 없는 메모', description: '보존할 내용', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] },
    ] };
}
function output(format: ProgramOutputFormat, source = version(), ids = source.items.map(item => item.id), anchor: string | null = '2026-09-13', clock: string | Date = now): Extract<ProgramOutput, { ok: true }> {
  const result = makeProgramOutput(source, { format, selectedItemIds: ids, anchor }, clock);
  if (!result.ok) assert.fail(JSON.stringify(result));
  return result;
}
function unfold(payload: string): string { return payload.replace(/\r\n[ \t]/g, ''); }
function events(payload: string): string[] { return unfold(payload).split('BEGIN:VEVENT\r\n').slice(1).map(part => part.split('END:VEVENT')[0]); }
function unescapeText(text: string): string { return text.replace(/\\([\\,;nN])/g, (_, code: string) => /n/i.test(code) ? '\n' : code); }
function csvRows(payload: string): string[][] {
  const text = payload.replace(/^\uFEFF/, ''); const result: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && char === ',') { row.push(cell); cell = ''; }
    else if (!quoted && char === '\r' && text[i + 1] === '\n') { row.push(cell); result.push(row); row = []; cell = ''; i++; }
    else cell += char;
  }
  assert.equal(quoted, false); assert.equal(cell, ''); return result;
}

test('TXT preserves all selected source content and source order without requiring a saved copy', () => {
  const source = version(); const before = JSON.stringify(source);
  const text = output('txt', source, ['undated', 'relative']);
  assert.deepEqual(text.itemIds, ['relative', 'undated']); assert.deepEqual(text.undatedItemIds, ['undated']);
  assert.ok(text.payload.indexOf('1. 상대 일정') < text.payload.indexOf('2. 날짜 없는 메모'));
  for (const retained of [source.summary, source.source.label, source.source.url!, source.items[0].description, source.items[0].completionCriteria,
    source.items[0].sourceUrl!, source.items[0].subchecks[0].title, source.items[2].description, '2026-09-12', '날짜: 미정']) assert.ok(text.payload.includes(retained), retained);
  assert.equal(text.payload.includes('고정 일정'), false); assert.equal(JSON.stringify(source), before);
  assert.equal(text.mime, 'text/plain;charset=utf-8'); assert.ok(text.payload.endsWith('\n'));
});

test('CSV parses complete fields, quotes, commas, multiline descriptions and both sources', () => {
  const source = version(); source.items[0].title = '일정, "검토"';
  const csv = output('csv', source, ['undated', 'relative']); const parsed = csvRows(csv.payload);
  assert.deepEqual(csv.itemIds, ['relative', 'undated']); assert.equal(parsed.length, 3); assert.ok(parsed.every(row => row.length === 13));
  assert.equal(parsed[1][4], source.items[0].title); assert.equal(parsed[1][6], source.items[0].description);
  assert.equal(parsed[1][7], source.items[0].completionCriteria); assert.equal(parsed[1][8], source.items[0].subchecks[0].title);
  assert.equal(parsed[1][10], source.source.url); assert.equal(parsed[1][11], source.items[0].sourceUrl); assert.equal(parsed[1][12], source.summary);
  assert.equal(parsed[2][5], ''); assert.ok(csv.payload.startsWith('\uFEFF')); assert.equal(csv.mime, 'text/csv;charset=utf-8');
});

test('CSV mitigates leading formula, whitespace, full-width and control injection in every user field', () => {
  for (const malicious of ['=HYPERLINK("https://evil.example")', '+SUM(1,1)', '-1+2', '@SUM(1)', '  =1', '\t=1', '\n@x', '＝1', '＋1', '－1', '＠SUM', '\uFEFF=1']) {
    const source = version(); source.title = malicious; source.summary = malicious; source.source.label = malicious;
    source.items[0].title = malicious; source.items[0].description = malicious; source.items[0].completionCriteria = malicious;
    source.items[0].subchecks[0].title = malicious;
    const parsed = csvRows(output('csv', source, ['relative']).payload)[1];
    for (const index of [0, 4, 6, 7, 8, 9, 12]) assert.equal(parsed[index], `\t${malicious}`, `${index}: ${malicious}`);
    assert.ok(output('txt', source, ['relative']).payload.includes(malicious));
  }
  const source = version(); source.items[0].title = '",=RUN()';
  const rows = csvRows(output('csv', source, ['relative']).payload); assert.equal(rows[1].length, 13); assert.equal(rows[1][4], '",=RUN()');
});

test('ICS exports only dated items with stable source order and undated omission list', () => {
  const file = output('ics'); const blocks = events(file.payload);
  assert.deepEqual(file.itemIds, ['relative', 'fixed']); assert.deepEqual(file.undatedItemIds, ['undated']); assert.equal(blocks.length, 2);
  assert.ok(blocks[0].includes('DTSTART;VALUE=DATE:20260912\r\n')); assert.ok(blocks[0].includes('DTEND;VALUE=DATE:20260913\r\n'));
  assert.ok(blocks[1].includes('DTSTART;VALUE=DATE:20260920\r\n')); assert.ok(blocks[1].includes('DTEND;VALUE=DATE:20260921\r\n'));
  assert.ok(blocks.every(block => block.includes('DTSTAMP:20260912T012345Z\r\n')));
  assert.ok(file.payload.startsWith('BEGIN:VCALENDAR\r\n')); assert.ok(file.payload.endsWith('END:VCALENDAR\r\n'));
  assert.equal(file.mime, 'text/calendar;charset=utf-8');
});

test('ICS source fixed date survives anchor changes; relative dates move without changing UID', () => {
  const source = version(); const first = events(output('ics', source).payload);
  const second = events(output('ics', source, ['fixed', 'relative'], '2026-10-02', '2026-09-13T00:00:00Z').payload);
  const uid = (block: string) => block.match(/^UID:(.+)$/m)![1].trim();
  assert.equal(uid(first[0]), uid(second[0])); assert.equal(uid(first[1]), uid(second[1])); assert.notEqual(uid(first[0]), uid(first[1]));
  assert.ok(second[0].includes('DTSTART;VALUE=DATE:20261001')); assert.ok(second[1].includes('DTSTART;VALUE=DATE:20260920'));
  const nextVersion = { ...source, id: 'version-2', number: 2, parentVersionId: source.id };
  assert.notEqual(uid(first[0]), uid(events(output('ics', nextVersion).payload)[0]));
});

test('ICS all-day DTEND is exclusive over month, leap-day and year boundaries', () => {
  for (const [date, end] of [['2024-02-28', '20240229'], ['2024-02-29', '20240301'], ['2026-12-31', '20270101']]) {
    const source = version(); source.items[1].schedule = { kind: 'fixed', date };
    assert.ok(output('ics', source, ['fixed'], null).payload.includes(`DTEND;VALUE=DATE:${end}`));
  }
});

test('ICS escapes TEXT injection and unfolds 75-octet UTF-8 lines without splitting characters', () => {
  for (const title of ['한글🙂'.repeat(50), 'A'.repeat(67) + ' '.repeat(200) + '🙂 끝', '쉼표, 세미; 역슬래시\\\nBEGIN:VEVENT\rEND:VCALENDAR']) {
    const source = version(); source.items[0].title = title; source.items[0].description += '\r새 줄';
    const payload = output('ics', source, ['relative']).payload;
    assert.equal(payload.replaceAll('\r\n', '').includes('\n'), false); assert.equal(payload.replaceAll('\r\n', '').includes('\r'), false);
    for (const physical of payload.split('\r\n')) {
      const bytes = new TextEncoder().encode(physical); assert.ok(bytes.length <= 75, `line has ${bytes.length} octets`);
      assert.equal(new TextDecoder('utf-8', { fatal: true }).decode(bytes), physical);
    }
    const unfolded = unfold(payload); const summary = unfolded.match(/^SUMMARY:(.*)\r$/m)![1];
    assert.equal(unescapeText(summary), title.replace(/\r\n|\r/g, '\n'));
    assert.equal(events(payload).length, 1); assert.equal(unfolded.split('\r\n').filter(line => line === 'END:VCALENDAR').length, 1);
    const description = unescapeText(unfolded.match(/^DESCRIPTION:(.*)\r$/m)![1]);
    for (const text of ['확인 기준', '하위 확인', '사용자 원문', 'https://example.com/source', 'https://example.com/item', source.summary, '새 줄']) assert.ok(description.includes(text));
  }
});

test('fails exactly on invalid selection, missing anchor, invalid dates and no dated items', () => {
  const source = version();
  const cases = [
    { selectedItemIds: [], reason: 'no-items' }, { selectedItemIds: ['relative', 'relative'], reason: 'duplicate-item' },
    { selectedItemIds: ['foreign'], reason: 'unknown-item' }, { selectedItemIds: [3], reason: 'invalid-selection' },
  ];
  for (const row of cases) assert.deepEqual(makeProgramOutput(source, { format: 'txt', anchor: '2026-09-13', selectedItemIds: row.selectedItemIds as string[] }, now), { ok: false, reason: row.reason });
  assert.deepEqual(makeProgramOutput(source, { format: 'txt', selectedItemIds: ['relative'] }, now), { ok: false, reason: 'missing-anchor' });
  for (const anchor of ['2026-02-30', '2026-13-01', 'today', '2026-9-1']) assert.deepEqual(makeProgramOutput(source, { format: 'txt', selectedItemIds: ['fixed'], anchor }, now), { ok: false, reason: 'invalid-date' });
  assert.deepEqual(makeProgramOutput(source, { format: 'ics', selectedItemIds: ['undated'] }, now), { ok: false, reason: 'no-dated-items' });
  assert.equal(output('txt', source, ['undated'], null).ok, true); assert.equal(output('csv', source, ['fixed'], null).ok, true);
});

test('rejects malformed version/schedule, invalid now and date overflow instead of fabricating dates', () => {
  const source = version();
  for (const clock of ['2026-02-30T01:00:00Z', '2026-09-12T25:00:00Z', '2026-09-12', new Date('bad')]) {
    assert.deepEqual(makeProgramOutput(source, { format: 'ics', selectedItemIds: ['fixed'] }, clock), { ok: false, reason: 'invalid-now' });
  }
  const duplicate = clone(source); duplicate.items.push(duplicate.items[0]);
  assert.deepEqual(makeProgramOutput(duplicate, { format: 'txt', selectedItemIds: ['fixed'] }, now), { ok: false, reason: 'invalid-version' });
  const invalid = clone(source); invalid.items[1].schedule = { kind: 'fixed', date: '2026-02-30' };
  assert.deepEqual(makeProgramOutput(invalid, { format: 'txt', selectedItemIds: ['fixed'] }, now), { ok: false, reason: 'invalid-version' });
  const overflow = clone(source); overflow.items[1].schedule = { kind: 'fixed', date: '9999-12-31' };
  assert.deepEqual(makeProgramOutput(overflow, { format: 'ics', selectedItemIds: ['fixed'] }, now), { ok: false, reason: 'invalid-date' });
  assert.deepEqual(makeProgramOutput(source, { format: 'xml' as 'txt', selectedItemIds: ['fixed'] }, now), { ok: false, reason: 'invalid-format' });
  for (const text of ['bad\u0000text', 'bad\ud800text']) {
    const invalidText = clone(source); invalidText.items[1].description = text;
    assert.deepEqual(makeProgramOutput(invalidText, { format: 'ics', selectedItemIds: ['fixed'] }, now), { ok: false, reason: 'invalid-version' });
  }
});

test('file names remove paths, reserved characters and controls while retaining Korean', () => {
  const source = version(); source.title = '../CON\\..\\여행:<자료>?*|\r\n"파일"';
  for (const format of ['txt', 'csv', 'ics'] as const) {
    const filename = output(format, source).filename;
    assert.ok(filename.startsWith('flowme-')); assert.ok(filename.endsWith(`.${format}`)); assert.ok(filename.includes('여행'));
    assert.equal(/[\u0000-\u001f<>:"/\\|?*]/.test(filename), false);
  }
});

test('known source comparison uses existing canonical source rules without fetching', () => {
  const source = version(); const known = [{ url: 'https://www.example.com/source?b=2&a=1', version: source }];
  const result = classifyProgramUrl('http://www.example.com/source/?utm_source=ignored&a=1&b=2#section', known);
  assert.deepEqual(result, { kind: 'known-source', url: 'https://www.example.com/source?a=1&b=2', version: source });
  assert.deepEqual(classifyProgramUrl('https://example.com/unknown', known), { kind: 'unsupported', url: 'https://example.com/unknown' });
  assert.deepEqual(classifyProgramUrl('https://example.com/source?b=2&a=2', known), { kind: 'unsupported', url: 'https://example.com/source?a=2&b=2' });
});

test('URL intake blocks auth, private/local/obfuscated hosts, ports, unsafe schemes and sensitive parameters', () => {
  for (const url of ['http://localhost/a', 'http://a.localhost/a', 'http://127.1/a', 'http://2130706433/a', 'http://0x7f000001/a',
    'http://10.1.1.1/a', 'http://172.16.1.1/a', 'http://192.168.1.1/a', 'http://169.254.169.254/a', 'http://100.64.1.1/a',
    'http://[::1]/a', 'http://[::ffff:127.0.0.1]/a', 'http://[fc00::1]/a', 'http://server.internal/a', 'http://localhost./a',
    'https://user:pass@example.com/a', 'file:///etc/passwd', 'javascript:alert(1)', 'data:text/plain,hi', 'https://example.com:8443/a',
    'https://example.com/a?token=secret', 'https://example.com/a?api%5fkey=secret', 'https://example.com/a?X-Amz-Signature=secret',
    'https://example.com/a#access_token=secret', 'https://example.com/a?password=secret', 'https://example.com/a?code=oauth', 'not a URL']) {
    assert.equal(classifyProgramUrl(url, []).kind, 'invalid', url);
  }
  assert.equal(classifyProgramUrl('https://example.com/path?q=travel', []).kind, 'unsupported');
});

test('unknown URL and output paths never access storage, network, clipboard or downloads', () => {
  const source = version(); const saved = new Map<string, PropertyDescriptor | undefined>(); let calls = 0;
  for (const name of ['fetch', 'localStorage', 'navigator', 'document']) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, get() { calls++; throw new Error(`forbidden ${name}`); } });
  }
  try {
    for (const format of ['txt', 'csv', 'ics'] as const) output(format, source);
    assert.equal(classifyProgramUrl('https://example.com/new', []).kind, 'unsupported');
    assert.equal(classifyProgramUrl('https://example.com/source', [{ url: 'https://example.com/source', version: source }]).kind, 'known-source');
    assert.equal(calls, 0);
  } finally {
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
});
