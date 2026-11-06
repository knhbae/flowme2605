import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { numberEul, numberGwa, numberIga, numberRo, timeRo } from './number-particle';

// UX 2차 QA P3 (11/7): '버전 2이 있습니다' → '버전 2가 있습니다'. Particles after digits follow how the number is read.
test('이/가, 을/를, 과/와 after the last digit as read (영·일·이·삼·사·오·육·칠·팔·구, 십·백·천)', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(numberIga), ['이', '이', '가', '이', '가', '가', '이', '이', '이', '가']);
  assert.deepEqual([10, 12, 20, 100, 1000, 10000].map(numberEul), ['을', '를', '을', '을', '을', '을']);
  assert.equal(`버전 2${numberIga(2)} 있습니다`, '버전 2가 있습니다');
  assert.equal(`버전 3${numberGwa(3)} 비교`, '버전 3과 비교');
  assert.equal(`버전 2${numberGwa(2)} 비교`, '버전 2와 비교');
});
test('(으)로: ㄹ (일·칠·팔) and no final take 로; 삼·육·영·십 take 으로; on the hour, 시로', () => {
  assert.deepEqual([1, 2, 3, 6, 7, 8, 10, 30].map(numberRo), ['로', '로', '으로', '으로', '로', '로', '으로', '으로']);
  assert.deepEqual(['09:00', '09:30', '18:15', '07:41', '12:03'].map(timeRo), ['로', '으로', '로', '로', '으로']);
});
test('the Alpha screens use them where a number comes before a particle', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
  const discovery = read('components/flow/integrated-poc/ProgramDiscovery.tsx'), publisher = read('components/flow/integrated-poc/ProgramPublisher.tsx');
  assert(discovery.includes('원본에 버전 {version.number}{numberIga(version.number)} 있습니다.'));
  assert(discovery.includes('버전 {version.number}{numberEul(version.number)} 보고 있습니다'));
  assert(publisher.includes('버전 {comparison.latestNumber}{numberGwa(comparison.latestNumber)} 비교'));
  assert(read('components/flow/integrated-poc/ProgramSpace.tsx').includes("${changed.time ? ` ${changed.time}${timeRo(changed.time)}` : '로'} 저장했습니다."));
  assert(read('components/flow/integrated-poc/ProgramCreatorWorkspace.tsx').includes('마지막 인계 기준일(${lastNativeAnchor})로'));
  for (const [name, text] of [['discovery', discovery], ['publisher', publisher]] as const) assert(!/\{[^{}]*[Nn]umber\}(이|가|을|를|과|와) /.test(text), name);
});
