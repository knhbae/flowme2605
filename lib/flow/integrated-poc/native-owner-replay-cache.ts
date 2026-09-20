import {isProgramCreatorDraftJson} from './creator-draft-provenance';
// Cache limits do not change accepted owner size. Oversized values replay fully.
// Applied source owners retain both the original and result. Permit a 1 MiB
// entry within the SAME 2 MiB total budget, avoiding repeat replay of ~592 KiB
// genuine owner/result pairs in each retained Undo snapshot.
export const NATIVE_OWNER_CACHE_VERSION=2 as const;
export const NATIVE_OWNER_CACHE_MAX_ENTRIES=8;
export const NATIVE_OWNER_CACHE_MAX_ENTRY_BYTES=1024*1024;
export const NATIVE_OWNER_CACHE_MAX_TOTAL_BYTES=2*1024*1024;
export function createNativeOwnerReplayCache<T>(replay:(value:unknown)=>T|null){
 const entries=new Map<string,{value:T;bytes:number}>();let bytes=0,hits=0,misses=0;
 return {
  read(value:unknown):T|null {
   try{
    // Descriptor safety and in-place mutation are checked even on cache hits.
    if(!isProgramCreatorDraftJson(value))return null;
    const key=JSON.stringify(value),hit=entries.get(key);
    if(hit){hits++;entries.delete(key);entries.set(key,hit);return structuredClone(hit.value);}
    misses++;const result=replay(value);if(result===null)return null;
    const size=(key.length+JSON.stringify(result).length)*2;
    if(size<=NATIVE_OWNER_CACHE_MAX_ENTRY_BYTES){
     while(entries.size>=NATIVE_OWNER_CACHE_MAX_ENTRIES||bytes+size>NATIVE_OWNER_CACHE_MAX_TOTAL_BYTES){const oldest=entries.keys().next().value;if(oldest===undefined)break;bytes-=entries.get(oldest)!.bytes;entries.delete(oldest);}
     entries.set(key,{value:structuredClone(result),bytes:size});bytes+=size;
    }
    return structuredClone(result);
   }catch{return null;}
  },
  stats:()=>({entries:entries.size,bytes,hits,misses}),
 };
}
