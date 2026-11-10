import type {AlphaAccount,AlphaSpace,AlphaPrivateCommand,AlphaReceipt} from './contract';
import {canonicalJson,detached} from './json';

const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** A receipt proves this command committed; readback must still contain its result.
 * A newer revision may contain edits to OTHER documents or the reading position.
 * Document IDs, order, source, all shared metadata and every other private field
 * remain exact. Typed editors and unrecognised shapes retain full-account proof. */
export function privateReceiptMatches<Space extends AlphaSpace>(before:AlphaAccount<Space>,command:Extract<AlphaPrivateCommand,{kind:'change-private'}>,candidate:AlphaAccount<Space>,receipt:AlphaReceipt):boolean{
  try{
  const expected=detached(before);
  for(const change of command.changes){if(change.present)Reflect.set(expected.space,change.field,detached(change.value));else Reflect.deleteProperty(expected.space,change.field);}
  const changed=!same(expected.space,before.space);expected.revision=before.revision+(changed?1:0);
  if(receipt.requestId!==command.requestId||receipt.kind!==command.kind||receipt.changed!==changed||receipt.revision!==expected.revision
    ||command.expectedRevision!==before.revision||candidate.ownerId!==before.ownerId||!Number.isSafeInteger(candidate.revision)||candidate.revision<receipt.revision)return false;
  if(same(candidate,expected))return true;
  if(candidate.revision===receipt.revision||!changed||!command.changes.some(c=>c.field==='text'))return false;
  const {revision:_er,space:_es,...expectedHeader}=expected,{revision:_cr,space:_cs,...candidateHeader}=candidate;
  if(!same(expectedHeader,candidateHeader))return false;
  const a=before.space.text,b=expected.space.text,c=candidate.space.text;
  if(!record(a)||!record(b)||!record(c)||a.version!==11||b.version!==11||c.version!==11)return false;
  const oldDocuments=a.documents,wantedDocuments=b.documents;
  if(!Array.isArray(oldDocuments)||!Array.isArray(wantedDocuments)||!wantedDocuments.some(doc=>record(doc)&&!same(oldDocuments.find(old=>record(old)&&old.id===doc.id)??null,doc)))return false;
  const keys=new Set([...Object.keys(expected.space),...Object.keys(candidate.space)]);
  for(const key of keys){if(key==='text'||key==='position')continue;
    if(Object.hasOwn(expected.space,key)!==Object.hasOwn(candidate.space,key)||!same(Reflect.get(expected.space,key),Reflect.get(candidate.space,key)))return false;}
  for(const key of new Set([...Object.keys(b),...Object.keys(c)])){
    if(key!=='documents'){if(!same(b[key],c[key]))return false;continue;}
    const old=a[key],want=b[key],got=c[key];
    if(!Array.isArray(old)||!Array.isArray(want)||!Array.isArray(got)
      ||![...old,...want,...got].every(v=>record(v)&&typeof v.id==='string'))return false;
    // No guessing after document insertion/deletion/reordering by another writer.
    if(!same(want.map(v=>v.id),got.map(v=>v.id)))return false;
    for(let i=0;i<want.length;i++){
      const prior=old.find(v=>v.id===want[i].id);
      if(!prior||!same(prior,want[i])){if(!same(want[i],got[i]))return false;}
    }
  }
  return true;
  }catch{return false;}
}
