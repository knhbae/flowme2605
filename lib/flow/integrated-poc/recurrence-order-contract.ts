import { readProgramPublicCopyExecutionTarget } from './public-copy-execution-target';

export type ProgramExecutionTimelineOrders = Record<string, string[]>;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
export function isProgramExecutionTargetKey(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 10000) return false;
  try { const tuple: unknown = JSON.parse(value);
    if (Array.isArray(tuple) && tuple[0] === 'occurrence' && ['public-copy-occurrence/1', 'public-copy-return/1'].includes(tuple[1]))
      return readProgramPublicCopyExecutionTarget(value) !== null;
    if(Array.isArray(tuple)&&tuple[0]==='occurrence'&&tuple[1]==='native-creator')return tuple.length===7&&JSON.stringify(tuple)===value&&tuple.every(part=>typeof part==='string'&&part.length>0&&part.length<=1200&&!/[\u0000-\u001f\u007f]/.test(part)&&!['__proto__','constructor','prototype'].includes(part))&&/^\d{4}-\d{2}-\d{2}$/.test(tuple[6])&&Number.isFinite(Date.parse(tuple[6]))&&new Date(tuple[6]).toISOString().slice(0,10)===tuple[6];
    if(Array.isArray(tuple)&&tuple[0]==='occurrence'&&tuple[1]==='program-personal-occurrence/1'){
      if(tuple.length!==7||JSON.stringify(tuple)!==value||!tuple.every(part=>typeof part==='string'&&part.length>0&&part.length<=1200)||!/^\w[\w-]{0,119}$/.test(tuple[2])||!/^\w[\w-]{0,119}$/.test(tuple[3]))return false;
      const prefix=`personal-recurrence:${encodeURIComponent(`program-recurrence-plan:v1:${tuple[2]}:${tuple[3]}`)}:`;
      if(!tuple[4].startsWith(prefix))return false;const item=tuple[4].slice(prefix.length);if(!item||encodeURIComponent(decodeURIComponent(item))!==item)return false;
      const revision=tuple[5].slice(tuple[4].length),occurrence=tuple[6].slice(tuple[5].length);
      const r=/^:revision:([1-9]\d*):(\d{4}-\d\d-\d\d)$/.exec(revision),o=/^:occurrence:(\d{4}-\d\d-\d\d)T(all-day|(?:[01]\d|2[0-3]):[0-5]\d)$/.exec(occurrence);
      const date=(v:string)=>Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
      return tuple[5].startsWith(tuple[4])&&tuple[6].startsWith(tuple[5])&&!!r&&Number.isSafeInteger(Number(r[1]))&&date(r[2])&&!!o&&date(o[1]);
    }
    if (Array.isArray(tuple) && tuple[0] === 'occurrence' && tuple[1] === 'creator') {
      return tuple.length === 6 && JSON.stringify(tuple) === value
        && tuple.every(part => typeof part === 'string' && part.trim().length > 0 && part.length <= 1200 && !/[\u0000-\u001f\u007f]/.test(part) && !['__proto__', 'constructor', 'prototype'].includes(part))
        && tuple[5].startsWith(`${tuple[4]}:occurrence:`)
        && /^\d{4}-\d{2}-\d{2}$/.test(tuple[5].slice(tuple[4].length + 12))
        && Number.isFinite(Date.parse(tuple[5].slice(tuple[4].length + 12)))
        && new Date(tuple[5].slice(tuple[4].length + 12)).toISOString().slice(0, 10) === tuple[5].slice(tuple[4].length + 12);
    }
    return Array.isArray(tuple) && JSON.stringify(tuple) === value && ((tuple[0] === 'text-task' && tuple.length === 3) || (tuple[0] === 'occurrence' && tuple.length === 7))
    && tuple.every(part => typeof part === 'string' && part.trim().length > 0 && part.length <= 1200 && !['__proto__', 'constructor', 'prototype'].includes(part)); } catch { return false; }
}
export function isProgramExecutionTimelineOrders(value: unknown): value is ProgramExecutionTimelineOrders {
  if (!record(value) || Object.keys(value).length > 5000) return false;
  return Object.entries(value).every(([date, ids]) => (date === 'undated' || /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date)
    && Array.isArray(ids) && ids.length <= 20000 && ids.every(key => isProgramExecutionTargetKey(key)
      && readProgramPublicCopyExecutionTarget(key)?.kind !== 'return') && new Set(ids).size === ids.length);
}
