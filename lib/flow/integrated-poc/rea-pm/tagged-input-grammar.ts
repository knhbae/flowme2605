// Selective reuse of the approved PoC grammar. Observation never confirms input.
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d]=value.split('-').map(Number),date=new Date(0);
  date.setUTCFullYear(y,m-1,d); date.setUTCHours(0,0,0,0);
  return y>=1&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}
export type Candidate={status:'CANDIDATE';kind:'task'|'schedule';text:string;title:string;prefixLength:number;percent?:number;plannedDate?:string}|{status:'NOT_A_COMPLETE_CANDIDATE'|'EMPTY_TITLE'|'INVALID_DATE'};
export function candidate(text:string,kind:'task'|'schedule'):Candidate {
  const first=text.split('\n',1)[0];
  const parts=kind==='task'?/^(- \[( |x|\d{1,3}%)\] )(.*)$/.exec(first):/^(@(\d{4}-\d{2}-\d{2}) )(.*)$/.exec(first);
  if(!parts)return{status:'NOT_A_COMPLETE_CANDIDATE'};
  if(kind==='schedule'&&!validDate(parts[2]))return{status:'INVALID_DATE'};
  const title=parts[3].trim();if(!title)return{status:'EMPTY_TITLE'};
  const percent=kind==='task'?parts[2]==='x'?100:parts[2]===' '?0:Number(parts[2].slice(0,-1)):undefined;
  if(percent!==undefined&&percent>100)return{status:'NOT_A_COMPLETE_CANDIDATE'};
  return{status:'CANDIDATE',kind,text:text.slice(parts[1].length),title,prefixLength:parts[1].length,...(kind==='task'?{percent}:{plannedDate:parts[2]})};
}
