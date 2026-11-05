/** N11a rev1: a synthetic account shaped as the real one is read (counts only, 11/5): every task under a folder line,
 *  `[날짜]` → `- /분류` → `  - [ ] 할 일`, the same tasks written again day after day across documents. 20 days in three
 *  documents, two or three folder lines a day out of four, one word ('정리') in two 분류, a few tasks finished. */
export const CARRYOVER_FOLDERS: Record<string, string[]> = {
  업무: ['보고서 쓰기', '메일 정리'], 운동: ['스트레칭', '러닝 30분'], 집안일: ['빨래', '정리'], 공부: ['영어 단어', '정리'],
};
const pattern = [['업무', '운동', '공부'], ['업무', '집안일'], ['운동', '집안일', '공부']];
export const carryoverFixtureDay = (index: number) => new Date(Date.UTC(2026, 9, 16 + index)).toISOString().slice(0, 10);
function day(index: number): string[] {
  return [`[${carryoverFixtureDay(index)}]`, ...pattern[index % 3].flatMap(folder => [`- /${folder}`, ...CARRYOVER_FOLDERS[folder].flatMap((title, at) => {
    // Some finished on the day; 러닝 30분 finished on its last day (its earlier copies are left over); one line with a
    // check under it and one with a memo, which never go.
    const done = (index + at) % 5 === 0 || title === '러닝 30분' && index === 18;
    return [`  - [${done ? 'x' : ' '}] ${title}`, ...index === 4 && title === '보고서 쓰기' ? ['    - [ ] 표 넣기'] : [],
      ...index === 7 && title === '빨래' ? ['    - 메모: 수건 따로'] : []];
  })]), ''];
}
/** Three documents: 10/16–10/22, 10/23–10/29, 10/30–11/4 (twenty days). */
export const CARRYOVER_DOCUMENTS: { title: string; raw: string }[] = [[0, 7], [7, 14], [14, 20]].map(([from, to], at) =>
  ({ title: ['10월 셋째 주', '10월 넷째 주', '11월 첫 주'][at], raw: Array.from({ length: to - from }, (_, offset) => day(from + offset)).flat().join('\n') }));
