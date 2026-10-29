import {personalAuthoringCapability} from '../personal-authoring-boundary';
import { PROGRAM_SCHEMA, type ProgramEnvelope, type ProgramPrivateSpace, type ProgramTransition } from '../contract';
import { createProgramPrivateSpace, programIdentifier, programShape, validateProgramEnvelope,inspectStoredProgramEnvelope } from '../program-data';
import {freezeStored,type DeepReadonly,type ReaStoredSpace,type StoredTextRead} from '../rea-stored-text';
import { ALPHA_SCHEMA, ALPHA_COMMAND_SCHEMA, type AlphaAccount, type AlphaReferenceContext, type AlphaPrivateCommand as AlphaCommand, type AlphaChange, type AlphaSpace } from './contract';
import { canonicalJson, detached } from './json';
import {inspectOrderedStoredProgramEnvelope} from '../program-data';
import {type ReaOrderedStoredSpace,type OrderedTextRead} from '../rea-stored-text';

export function materializeAccount(account: AlphaAccount, references: AlphaReferenceContext): ProgramEnvelope {
  const actorId = account.source.actorId;
  return { schema: PROGRAM_SCHEMA, revision: account.source.revision,
    data: { ...(references.social ? { projection: 'alpha-social-v1' as const } : {}), actors: references.actorIds.map(id => ({ id, name: references.social?.actorNames[id] ?? 'M1 reference', simulated: true })), activeActorId: actorId,
      spaces: Object.fromEntries(references.actorIds.map(id => [id, id === actorId ? account.space : createProgramPrivateSpace()])),
      public: references.public, receipts: account.legacyReceipts },
    undo: Object.fromEntries(references.actorIds.map(id => [id, id === actorId ? account.legacyUndo : []])) };
}
type AlphaStoredFrame=Omit<AlphaAccount,'space'|'legacyUndo'>&{space:unknown;legacyUndo:unknown};
function storedAccountFrame(value: unknown, references: AlphaReferenceContext, ownerId?: string):AlphaStoredFrame|null {
  try {
    const copy = detached(value);
    if (!programShape(copy, ['schema', 'ownerId', 'revision', 'source', 'space', 'legacyUndo', 'legacyReceipts'])
      || copy.schema !== ALPHA_SCHEMA || !programIdentifier(copy.ownerId) || (ownerId !== undefined && copy.ownerId !== ownerId)
      || !Number.isSafeInteger(copy.revision) || (copy.revision as number) < 0
      || !programShape(copy.source, ['schema', 'actorId', 'revision']) || copy.source.schema !== PROGRAM_SCHEMA
      || !programIdentifier(copy.source.actorId) || !Number.isSafeInteger(copy.source.revision) || (copy.source.revision as number) < 0
      || !programShape(references, ['actorIds', 'public', ...(Object.hasOwn(references, 'social') ? ['social'] : [])]) || !Array.isArray(references.actorIds)
      || !references.actorIds.every(programIdentifier) || !references.actorIds.includes(copy.source.actorId)
      || !Array.isArray(copy.legacyReceipts)) return null;
    if (references.social && (!programShape(references.social, ['schema', 'revision', 'ownActorId', 'actorNames'])
      || references.social.schema !== 'flowme-alpha-social-projection/1' || !Number.isSafeInteger(references.social.revision) || references.social.revision < 0
      || !/^member-[0-9a-f-]{36}$/.test(references.social.ownActorId) || !programShape(references.social.actorNames, references.actorIds)
      || Object.values(references.social.actorNames).some(name => typeof name !== 'string' || !name.trim() || name.length > 80))) return null;
    const actorId = copy.source.actorId;
    if (copy.legacyReceipts.some(row => !row || row.actorId !== actorId)) return null;
    return copy as unknown as AlphaStoredFrame;
  } catch { return null; }
}
export function validateAlphaAccount(value:unknown,references:AlphaReferenceContext,ownerId?:string):value is AlphaAccount{
 try{const frame=storedAccountFrame(value,references,ownerId);
 return !!frame&&validateProgramEnvelope(materializeStoredFrame(frame,detached(references)),{allowAlphaProjection:!!references.social});}catch{return false;}
}
/** Same outer materialization for both validators; the text stays untouched. */
function materializeStoredFrame(account:AlphaStoredFrame,references:AlphaReferenceContext):unknown{
 const actorId=account.source.actorId;
 return{schema:PROGRAM_SCHEMA,revision:account.source.revision,data:{...(references.social?{projection:'alpha-social-v1'}:{}),actors:references.actorIds.map(id=>({id,name:references.social?.actorNames[id]??'M1 reference',simulated:true})),activeActorId:actorId,
  spaces:Object.fromEntries(references.actorIds.map(id=>[id,id===actorId?account.space:createProgramPrivateSpace()])),public:references.public,receipts:account.legacyReceipts},undo:Object.fromEntries(references.actorIds.map(id=>[id,id===actorId?account.legacyUndo:[]]))};
}
export type StoredAlphaAccountRead=
 |{kind:'v11-readonly';snapshot:DeepReadonly<AlphaAccount>;writeAllowed:false;writeBlockedReason:'USE_EXISTING_V11_PORTS'}
 |{kind:'rea-readonly';snapshot:DeepReadonly<Omit<AlphaAccount,'space'>&{space:ReaStoredSpace}>;text:Extract<StoredTextRead,{kind:'rea-readonly'}>;writeAllowed:false;writeBlockedReason:'REA_READERS_NOT_CONNECTED'}
 |{kind:'blocked';reason:string;preservedInput:unknown;writeAllowed:false};
/** Local opt-in stored reader, not the controller's ready/account type guard. */
export function inspectStoredAlphaAccount(input:unknown,references:AlphaReferenceContext,ownerId?:string):StoredAlphaAccountRead{
 try{
 const frame=storedAccountFrame(input,references,ownerId);
 if(!frame)return{kind:'blocked',reason:'INVALID_ALPHA_ACCOUNT_FRAME',preservedInput:input,writeAllowed:false};
 const envelope=inspectStoredProgramEnvelope(materializeStoredFrame(frame,detached(references)),{allowAlphaProjection:!!references.social});
 if(envelope.kind==='blocked')return{kind:'blocked',reason:envelope.reason,preservedInput:input,writeAllowed:false};
 if(envelope.kind==='v11-readonly')return{kind:'v11-readonly',snapshot:freezeStored(frame as AlphaAccount),writeAllowed:false,writeBlockedReason:'USE_EXISTING_V11_PORTS'};
 return{kind:'rea-readonly',snapshot:freezeStored(frame as Omit<AlphaAccount,'space'>&{space:ReaStoredSpace}),text:envelope.text,writeAllowed:false,writeBlockedReason:'REA_READERS_NOT_CONNECTED'};
 }catch{return{kind:'blocked',reason:'INVALID_ALPHA_ACCOUNT_FRAME',preservedInput:input,writeAllowed:false};}
}
export type OrderedAlphaAccountRead=StoredAlphaAccountRead|{
 kind:'rea-ordered-readonly';snapshot:DeepReadonly<AlphaAccount<ReaOrderedStoredSpace>>;text:OrderedTextRead;
 writeAllowed:false;writeBlockedReason:'ORDERED_PROFILE_REQUIRES_EXPLICIT_WRITER';positionSupport:'PRESERVE_ONLY_NO_PM_RESTORE';
};
/** Explicit v2 reader. The existing reader remains unable to admit version 2. */
export function inspectOrderedStoredAlphaAccount(input:unknown,references:AlphaReferenceContext,ownerId?:string):OrderedAlphaAccountRead{
 try{
  const frame=storedAccountFrame(input,references,ownerId);
  if(!frame)return{kind:'blocked',reason:'INVALID_ALPHA_ACCOUNT_FRAME',preservedInput:input,writeAllowed:false};
  if((frame.space as any)?.text?.schema!=='flowme-rea-text/2')return inspectStoredAlphaAccount(input,references,ownerId);
  if(frame.source.actorId!==frame.ownerId||references.social||references.actorIds.length!==1||references.actorIds[0]!==frame.ownerId)
   return{kind:'blocked',reason:'UNSUPPORTED_ORDERED_OWNER_CONTEXT',preservedInput:input,writeAllowed:false};
  const envelope=inspectOrderedStoredProgramEnvelope(materializeStoredFrame(frame,detached(references)));
  if(envelope.kind!=='rea-ordered-readonly')return{kind:'blocked',reason:envelope.kind==='blocked'?envelope.reason:'ORDERED_PROFILE_REQUIRED',preservedInput:input,writeAllowed:false};
  return{kind:'rea-ordered-readonly',snapshot:freezeStored(frame as AlphaAccount<ReaOrderedStoredSpace>),text:envelope.text,
   writeAllowed:false,writeBlockedReason:'ORDERED_PROFILE_REQUIRES_EXPLICIT_WRITER',positionSupport:'PRESERVE_ONLY_NO_PM_RESTORE'};
 }catch{return{kind:'blocked',reason:'INVALID_ORDERED_ALPHA_ACCOUNT',preservedInput:input,writeAllowed:false};}
}
/** Explicit local conversion preview: reads no browser keys and performs no writes. */
export function captureAlphaAccount(envelope: ProgramEnvelope, actorId: string, ownerId: string): { account: AlphaAccount; references: AlphaReferenceContext } {
  const source = detached(envelope);
  if (!validateProgramEnvelope(source) || !programIdentifier(ownerId) || !Object.hasOwn(source.data.spaces, actorId)) throw Error('alpha-invalid-source');
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId, revision: 0,
    source: { schema: source.schema, actorId, revision: source.revision }, space: source.data.spaces[actorId],
    legacyUndo: source.undo[actorId], legacyReceipts: source.data.receipts.filter(receipt => receipt.actorId === actorId) };
  const references = { actorIds: source.data.actors.map(actor => actor.id), public: source.data.public };
  if (!validateAlphaAccount(account, references, ownerId)) throw Error('alpha-invalid-account');
  return { account, references };
}

export function privateChanges(before: AlphaSpace, after: AlphaSpace): AlphaChange[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap(key => {
    const field = key as keyof ProgramPrivateSpace, present = Object.hasOwn(after, field);
    if (Object.hasOwn(before, field) === present && (!present || canonicalJson(before[field]) === canonicalJson(after[field]))) return [];
    return [present ? { field, present: true as const, value: detached(after[field]) } : { field, present: false as const }];
  });
}
/** Reuses current pure transitions, rejecting publication, actor switching or foreign-space changes. */
export function commandFromProgramTransition(account: AlphaAccount, references: AlphaReferenceContext, requestId: string,
  build: (current: ProgramEnvelope['data']) => ProgramTransition<string>): AlphaCommand {
  if (!validateAlphaAccount(account, references)) throw Error('alpha-invalid-account');
  const baseline = materializeAccount(detached(account), detached(references));
  const transition = build(detached(baseline.data));
  if (!transition.ok) throw Error(`alpha-domain-${transition.reason}`);
  const next = detached(transition.data);
  const actorId = account.source.actorId;
  const guarded = detached(next); guarded.spaces[actorId] = baseline.data.spaces[actorId];
  // Existing private transitions append local idempotency receipts. The server's
  // owner+requestId ledger replaces only these newly appended compatibility receipts.
  if (canonicalJson(next.receipts.slice(0, baseline.data.receipts.length)) !== canonicalJson(baseline.data.receipts)
    || next.receipts.slice(baseline.data.receipts.length).some(receipt => receipt.actorId !== actorId)) throw Error('alpha-foreign-receipt');
  guarded.receipts = baseline.data.receipts;
  if (canonicalJson(guarded) !== canonicalJson(baseline.data)
      || !validateProgramEnvelope({ ...baseline, data: next }, { allowAlphaProjection: !!references.social })) throw Error('alpha-non-private-transition');
  return { schema: ALPHA_COMMAND_SCHEMA, requestId, expectedRevision: account.revision,
    kind: 'change-private', ...personalAuthoringCapability(account.space,next.spaces[actorId]), changes: privateChanges(account.space, next.spaces[actorId]) };
}
