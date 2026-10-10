import {isProgramCreatorDraftJson} from './creator-draft-provenance';
// Cache limits do not change accepted owner size. Oversized values replay fully.
// Versioned, replaceable in-memory accounting budget, not a document/storage
// quota or an exact heap measurement. Public 30-edit owner/result pairs exceed
// 1 MiB; retaining them avoids replay on every unchanged validation. New owners
// still replay fully. Descriptor checks, exact keys, cloning and LRU stay intact.
export const NATIVE_OWNER_CACHE_VERSION=3 as const;
export const NATIVE_OWNER_CACHE_MAX_ENTRIES=8;
export const NATIVE_OWNER_CACHE_MAX_ENTRY_BYTES=16*1024*1024;
export const NATIVE_OWNER_CACHE_MAX_TOTAL_BYTES=32*1024*1024;
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
