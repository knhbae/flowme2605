import {isProgramCreatorDraftJson} from './creator-draft-provenance';

/** Ephemeral validation cache v2, not persisted Program schema. Bounds cover
 * retained UTF-16 key content; runtime Map/string object overhead is engine-owned.
 * Eight entries cover a short source-review/Undo sequence without replay thrash.
 * No hash collisions, owner references, logs or I/O. Oversized values still take
 * the full validator; neither source/history limits nor payloads are changed. */
export const NATIVE_SOURCE_VALIDATION_CACHE_VERSION=2 as const;
export const NATIVE_SOURCE_VALIDATION_CACHE_MAX_ENTRIES=8;
export const NATIVE_SOURCE_VALIDATION_CACHE_MAX_ENTRY_BYTES=128*1024;
export const NATIVE_SOURCE_VALIDATION_CACHE_MAX_KEY_BYTES=1024*1024;
export function createNativeSourceValidationCache(validate:(value:unknown)=>boolean){
 const positive=new Map<string,number>();let keyBytes=0,hits=0,misses=0;
 return {
  validate(value:unknown):boolean {
   try {
    // Never stringify accessors, exotic objects, sparse arrays or non-JSON data.
    // This check runs on EVERY call, including objects previously validated.
    if(!isProgramCreatorDraftJson(value))return false;
    const key=JSON.stringify(value),bytes=key.length*2;
    if(positive.has(key)){hits++;const size=positive.get(key)!;positive.delete(key);positive.set(key,size);return true;}
    misses++;if(!validate(value))return false;
    if(bytes>NATIVE_SOURCE_VALIDATION_CACHE_MAX_ENTRY_BYTES||bytes>NATIVE_SOURCE_VALIDATION_CACHE_MAX_KEY_BYTES)return true;
    while(positive.size>=NATIVE_SOURCE_VALIDATION_CACHE_MAX_ENTRIES||keyBytes+bytes>NATIVE_SOURCE_VALIDATION_CACHE_MAX_KEY_BYTES){const oldest=positive.keys().next().value;if(oldest===undefined)break;keyBytes-=positive.get(oldest)!;positive.delete(oldest);}
    positive.set(key,bytes);keyBytes+=bytes;return true;
   }catch{return false;}
  },
  /** Counts only; never exposes private content or keys. */
  stats:()=>({entries:positive.size,keyBytes,hits,misses}),
 };
}
