/**
 * Korean particles after a number written in digits, read the Sino-Korean way: 2 (이) takes 가, 3 (삼) takes 이.
 * A last digit 1·3·6·7·8 (일·삼·육·칠·팔) ends in a consonant, 2·4·5·9 (이·사·오·구) does not; a number ending in 0 reads
 * 영·십·백·천·만, which all do. 1·7·8 end in ㄹ, which takes 로 rather than 으로.
 */
function lastReading(value: number): { final: boolean; rieul: boolean } {
  const digits = String(Math.abs(Math.trunc(value)));
  const last = digits[digits.length - 1];
  if (last === '0') return { final: true, rieul: false };
  return { final: '13678'.includes(last), rieul: '178'.includes(last) };
}
export const numberIga = (value: number) => lastReading(value).final ? '이' : '가';
export const numberEul = (value: number) => lastReading(value).final ? '을' : '를';
export const numberGwa = (value: number) => lastReading(value).final ? '과' : '와';
export const numberRo = (value: number) => { const read = lastReading(value); return read.final && !read.rieul ? '으로' : '로'; };
/** 'HH:MM' read as 시·분: on the hour it ends in 시 (로), otherwise in the minutes. */
export const timeRo = (time: string) => { const minutes = Number(time.slice(-2)); return minutes === 0 ? '로' : numberRo(minutes); };
