export type WritingInsertion={offset:number;text:string;caretOffset:number};
export type WritingSlash={lineId:string;raw:string};
/** Plan one native replacement. Preparing or refusing never changes the source. */
export function planWritingInsertion(raw:string,insertion:WritingInsertion,slash?:{start:number;end:number;raw:string}|null){
  const {offset,text,caretOffset}=insertion;
  if(!Number.isInteger(offset)||offset<0||offset>raw.length||typeof text!=='string'
    ||!Number.isInteger(caretOffset)||caretOffset<offset||caretOffset>offset+text.length)return null;
  let base=raw,at=offset,caret=caretOffset;
  if(slash){
    if(slash.raw!==raw||!Number.isInteger(slash.start)||slash.end!==slash.start+1||raw.slice(slash.start,slash.end)!=='/')return null;
    const a=raw.lastIndexOf('\n',slash.start)+1,b=raw.indexOf('\n',slash.end);
    if(raw.slice(a,b<0?raw.length:b).trim()!=='/')return null;
    base=raw.slice(0,slash.start)+raw.slice(slash.end);
    if(at>slash.start){at--;caret--;}
  }
  const nextRaw=base.slice(0,at)+text+base.slice(at);
  let start=0,end=raw.length,nextEnd=nextRaw.length;
  while(start<end&&start<nextEnd&&raw[start]===nextRaw[start])start++;
  while(end>start&&nextEnd>start&&raw[end-1]===nextRaw[nextEnd-1]){end--;nextEnd--;}
  return {start,end,text:nextRaw.slice(start,nextEnd),nextRaw,selectionAfter:{start:caret,end:caret}};
}
