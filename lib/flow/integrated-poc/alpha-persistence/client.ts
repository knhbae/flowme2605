import {createWritingAckIssuer,freezeWritingView,noteWritingPhase,type WritingAckInput} from '../writing-ack';
import type { AlphaAccount, AlphaCommand, AlphaError, AlphaReadProbe, AlphaReadTokens, AlphaReceipt, AlphaRecovery, AlphaRecoveryPort, AlphaRepository, AlphaReferenceContext, AlphaSpace } from './contract';
import {ALPHA_LIMITS} from './contract';
import type {WritingCompute,WritingIdentity,WritingReply,PreparedWriting} from '../writing-compute';
import type {ProgramPrivateSpace} from '../contract';
import { canonicalJson, detached } from './json';
import { validateAlphaCommand } from './fake-server';
import { isAlphaWireCommand, isAlphaWireReceipt } from '../alpha-sync/wire';
import { createAlphaMemoryRecovery, validateAlphaRecovery } from './local-recovery';
import { programShape } from '../program-data';
import { isAlphaSocialIntent, type AlphaSocialIntent } from '../alpha-social/contract';

const nativeHandoff = (command: AlphaCommand | null | undefined) => command?.kind === 'creator' && command.intent.type === 'native-handoff';
const retryBody = (command: AlphaCommand) => {
  const { requestId: _requestId, ...body } = command;
  return canonicalJson(body);
};
type NativeHandoffRejection = { requestId: string; body: string; confirmed: string; references: string };
type ParticipationSaveIntent = Extract<AlphaSocialIntent, { type: 'participation-save' }>;
type ParticipationSaveCommand = Extract<AlphaCommand, { kind: 'social' }> & { intent: ParticipationSaveIntent };
type SocialDraftRejection = NativeHandoffRejection & { target: string; reason: 'invalid' | 'limit' | 'rate-limited' };
const participationSave = (command: AlphaCommand | null | undefined): command is ParticipationSaveCommand => command?.kind === 'social' && command.intent.type === 'participation-save';
const socialDraftTarget = (intent: ParticipationSaveIntent) => {
  // These are the existing editor's mutable input fields. Its content requestId
  // changes on typing; the enclosing wire requestId remains a separate fresh key.
  const { title: _title, body: _body, topic: _topic, media: _media, evidencePostIds: _evidence, cursor: _cursor, requestId: _contentRequestId, ...target } = intent.draft;
  return canonicalJson({ type: intent.type, expected: intent.expected, target });
};
const writeRejectionReasons: AlphaError[] = ['invalid', 'unauthenticated', 'not-found', 'revision-conflict', 'idempotency-conflict', 'undo-conflict', 'unavailable', 'no-change', 'rate-limited', 'limit'];
function knownWriteResponse(value: unknown): boolean {
  try {
    canonicalJson(value);
    return programShape(value, ['ok', 'reason']) && value.ok === false && writeRejectionReasons.includes(value.reason as AlphaError)
      || programShape(value, ['ok', 'value']) && value.ok === true && isAlphaWireReceipt(value.value);
  } catch { return false; }
}

export type AlphaClientStatus = 'signed-out' | 'ready' | 'saving' | 'saved' | 'same-location' | 'cancelled' | 'conflict' | 'session-expired' | 'checking-result' | 'recovery-required';
export const ALPHA_STATUS_COPY: Record<AlphaClientStatus, string> = {
  'signed-out': '로그인이 필요합니다', ready: '저장 준비', saving: '서버 저장 대기', saved: '저장 확인',
  'same-location': '같은 위치입니다', cancelled: '취소했습니다', conflict: '다른 기기 변경',
  'session-expired': '로그인 만료', 'checking-result': '결과 확인 중', 'recovery-required': '복구 필요',
};
export function createAlphaClient<Space extends AlphaSpace = ProgramPrivateSpace>(validate: (value: unknown, ownerId: string, references?: AlphaReferenceContext) => value is AlphaAccount<Space>,
  recovery: AlphaRecoveryPort<Space> = createAlphaMemoryRecovery<Space>(),writingCompute?:WritingCompute) {
  let generation = 0, ownerId: string | null = null, repository: AlphaRepository<Space> | null = null;
  let state: AlphaRecovery<Space> | null = null, status: AlphaClientStatus = 'signed-out', busy = false, blocked = false;
  let lastReceipt: AlphaReceipt | null = null;
  let writingIdentity:WritingIdentity|undefined;
  let confirmedFrame:object=Object.freeze({});
  // Egress probe: the read tokens of the snapshot that is confirmed now, bound to that exact confirmed and
  // references object. Any other path that replaces them leaves this stale, and the next read is full.
  let confirmedRead:{tokens:AlphaReadTokens;confirmed:object;references:object|null;port:object}|null=null;
  const ackIssuer=createWritingAckIssuer();
  let activeAck:{identity:WritingIdentity;input:WritingAckInput;before:object}|null=null;
  let viewFrame:object|null=null,viewConfirmed:AlphaAccount<Space>|null=null,viewReferences:AlphaReferenceContext|undefined;
  const viewSlots=new Map<string,{source:unknown;copy:unknown}>();
  function viewCopy<T>(key:string,value:T):T{const hit=viewSlots.get(key);if(hit&&hit.source===value)return hit.copy as T;const copy=freezeWritingView(privateCopy(value));viewSlots.set(key,{source:value,copy});return copy;}
  function presentation(){
    const started=performance.now();
    try{if(viewFrame!==confirmedFrame){viewConfirmed=freezeWritingView(privateCopy(state?.confirmed??null));viewReferences=state?.references?freezeWritingView(privateCopy(state.references)):undefined;viewFrame=confirmedFrame;}
      return {ownerId,status:accountHidden?'session-expired' as const:status,confirmedFrame,
        state:state?{...state,confirmed:viewConfirmed,references:viewReferences,pending:viewCopy('pending',state.pending),draft:viewCopy('draft',state.draft)}:null,
        lastReceipt:viewCopy('receipt',lastReceipt),lastError,retryableRejectedDraft:retryableRejectedDraft(),retryableNativeHandoff:retryableNativeHandoff(),retryableRejectedSocialDraft:retryableRejectedSocialDraft()};
    }finally{noteWritingPhase('ack-confirmed-snapshot',started,writingIdentity);}
  }
  const verifiedBytes=new WeakMap<object,string>();
  const writeProofs=new WeakSet<()=>boolean>();
  // Closed private graph: external accounts/commands/recovery enter only through
  // canonical framing and existing validators. No caller gets borrowed state.
  function privateCopy<T>(value:T):T{
    if(!writingCompute)return detached(value);
    const depth=(v:unknown,n:number):void=>{if(n>ALPHA_LIMITS.depth)throw Error('alpha-json-depth');if(v&&typeof v==='object')for(const part of Object.values(v))depth(part,n+1);};depth(value,0);
    const raw=JSON.stringify(value);if(new TextEncoder().encode(raw).length>ALPHA_LIMITS.bytes)throw Error('alpha-too-large');return JSON.parse(raw) as T;
  }
  const stamp=(requestId:string):WritingIdentity=>({...writingIdentity,ownerId:ownerId!,docId:writingIdentity?.docId??'@account',workingGeneration:writingIdentity?.workingGeneration??generation,baseRevision:state?.confirmed?.revision??0,requestId});
  // Progress is not renewed authentication. Keep the existing expired-session
  // presentation until this owner's current generation validates a fresh read.
  // Recovery preimages and pending requests remain intact behind this view.
  let accountHidden = false;
  // Transient diagnostic only: never stored in recovery or used to settle a pending request.
  let lastError: AlphaError | null = null;
  // Only this session's definitive execute rejection permits replacing its draft.
  // A read error or a reloaded draft is not evidence that an earlier write failed.
  let rejectedDraftRequestId: string | null = null;
  // Not a general creator retry: exact native selection after a definitive limit,
  // bound to this session and pre-rejection bytes. Never persisted or recovered.
  let rejectedNativeHandoff: NativeHandoffRejection | null = null;
  // Only a live, definitive participation-save rejection can replace that
  // editor's draft. Never recovered, and never permission to publish or retarget.
  let rejectedSocialDraft: SocialDraftRejection | null = null;
  const retryableRejectedDraft = () => !!repository && !busy && !blocked && !state?.pending
    && state?.draft?.kind === 'change-private' && !!state.confirmed
    && state.draft.expectedRevision === state.confirmed.revision
    && state.draft.requestId === rejectedDraftRequestId
    && (lastError === 'invalid' || lastError === 'limit');
  const matchesNativeRejection = (proof: NativeHandoffRejection) => {
    try {
      return !!repository && !blocked && !state?.pending && nativeHandoff(state?.draft) && !!state?.confirmed
        && state.draft!.requestId === proof.requestId && state.draft!.expectedRevision === state.confirmed.revision
        && retryBody(state.draft!) === proof.body && canonicalJson(state.confirmed) === proof.confirmed
        && canonicalJson(state.references ?? null) === proof.references
        && (!repository.references || canonicalJson(repository.references()) === proof.references);
    } catch { return false; }
  };
  const retryableNativeHandoff = () => {
    if (!rejectedNativeHandoff || busy) return false;
    if (lastError !== 'limit' || !matchesNativeRejection(rejectedNativeHandoff)) {
      rejectedNativeHandoff = null; return false;
    }
    return true;
  };
  const canRetryNativeHandoff = (command: AlphaCommand) => {
    try {
      return retryableNativeHandoff() && nativeHandoff(command) && isAlphaWireCommand(command)
        && command.requestId !== rejectedNativeHandoff!.requestId && retryBody(command) === rejectedNativeHandoff!.body;
    } catch { return false; }
  };
  const matchesSocialRejection = (proof: SocialDraftRejection) => {
    try {
      return !!repository && !blocked && !state?.pending && participationSave(state?.draft) && !!state.confirmed
        && state.draft.requestId === proof.requestId && state.draft.expectedRevision === state.confirmed.revision
        && state.draft.expectedPublicRevision === state.references?.social?.revision
        && retryBody(state.draft) === proof.body && canonicalJson(state.confirmed) === proof.confirmed
        && canonicalJson(state.references ?? null) === proof.references
        && !!repository.references && canonicalJson(repository.references()) === proof.references;
    } catch { return false; }
  };
  const retryableRejectedSocialDraft = () => {
    if (!rejectedSocialDraft || busy) return false;
    if (lastError !== rejectedSocialDraft.reason || !matchesSocialRejection(rejectedSocialDraft)) {
      rejectedSocialDraft = null; return false;
    }
    return true;
  };
  const matchesRejectedSocialDraft = (intent: AlphaSocialIntent) => {
    try {
      return retryableRejectedSocialDraft() && isAlphaSocialIntent(intent) && intent.type === 'participation-save'
        && socialDraftTarget(intent) === rejectedSocialDraft!.target;
    } catch { return false; }
  };
  const canRetryRejectedSocialDraft = (command: AlphaCommand) => {
    try {
      return participationSave(command) && isAlphaWireCommand(command) && matchesRejectedSocialDraft(command.intent)
        && command.requestId !== rejectedSocialDraft!.requestId && command.expectedRevision === state!.draft!.expectedRevision
        && command.expectedPublicRevision === (state!.draft as ParticipationSaveCommand).expectedPublicRevision;
    } catch { return false; }
  };
  const current = (epoch: number) => generation === epoch && !!repository && !!state;
  const persist = () => {
    const epoch = generation, previous = state;
    try { if (previous && recovery.save(privateCopy(previous))) return current(epoch) && state === previous; } catch { /* Preserve the last durable copy. */ }
    if (current(epoch) && state === previous) { status = 'recovery-required'; blocked = true; }
    return false;
  };
  async function persistAsync(){
    if(!recovery.prepare)return persist();
    const epoch=generation,previous=state;
    try{if(previous){const prepared=await recovery.prepare(privateCopy(previous),writingIdentity);
      if(!current(epoch)||state!==previous)return false;
      const saved=prepared?.()??false;if(!current(epoch)||state!==previous)return false;if(saved)return true;}}
    catch{/* Keep the prior durable copy and the live obligation. */}
    if(current(epoch)&&state===previous){status='recovery-required';blocked=true;}return false;
  }
  const fail = (reason: AlphaError) => {
    if (reason === 'unauthenticated') accountHidden = true;
    lastError = reason;
    status = reason === 'unauthenticated' ? 'session-expired' : reason === 'revision-conflict' || reason === 'undo-conflict' ? 'conflict'
      : reason === 'no-change' ? 'same-location' : 'recovery-required';
  };
  type ReadCandidate = { account: AlphaAccount<Space>; references?: AlphaReferenceContext; tokens?: AlphaReadTokens | null };
  async function readCandidate(epoch: number, port: AlphaRepository<Space>, minimum = 0): Promise<ReadCandidate | null> {
    try {
      const result = await port.read();
      const tokens = result.ok ? port.readTokens?.() ?? null : null;
      const decodeStart=performance.now();
      if (!current(epoch)) return null;
      if (!result.ok) { fail(result.reason); return null; }
      let references = port.references?.() ?? undefined;
      let account=result.value;
      let accountBytes:string|undefined;
      if(writingCompute){
        // Strict framing rejects getters/symbols/non-JSON before structured clone.
        accountBytes=canonicalJson(account);const referencesJson=canonicalJson(references??{actorIds:[ownerId!],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}});
        noteWritingPhase('ack-account-frame',decodeStart,writingIdentity);
        const reply=await writingCompute.run(stamp(crypto.randomUUID()),{kind:'account',accountJson:accountBytes,referencesJson});
        if(!current(epoch)||repository!==port)return null;
        if(!reply.ok||!reply.account){status=state!.pending?'checking-result':'recovery-required';return null;}
        if(references&&canonicalJson(port.references?.())!==referencesJson){status=state!.pending?'checking-result':'recovery-required';return null;}
        references=references?reply.references:undefined;
        account=reply.account as AlphaAccount<Space>;verifiedBytes.set(account,accountBytes);
      }
      if ((!writingCompute&&!validate(account, ownerId!, references)) || account.revision < Math.max(minimum, state!.confirmed?.revision ?? 0)
        || (account.revision === state!.confirmed?.revision && (accountBytes??canonicalJson(account)) !== (state!.confirmed&&verifiedBytes.get(state!.confirmed)||canonicalJson(state!.confirmed)))
        || (state!.references?.social && (!references?.social || references.social.revision < state!.references.social.revision
          || references.social.revision === state!.references.social.revision && canonicalJson(references.public) !== canonicalJson(state!.references.public)))) {
        if (current(epoch)) status = state!.pending ? 'checking-result' : 'recovery-required'; return null;
      }
      if (!current(epoch) || repository !== port) return null;
      if(!writingCompute)noteWritingPhase('ack-account-frame',decodeStart,writingIdentity);
      return { account: writingCompute?account:detached(account), ...(references ? { references: detached(references) } : {}), tokens };
    } catch { if (current(epoch)) status = state!.pending ? 'checking-result' : 'recovery-required'; return null; }
  }
  async function commitCandidate(candidate: ReadCandidate, epoch: number, port: AlphaRepository<Space>, previous: AlphaRecovery<Space>, clearPending = false): Promise<boolean> {
    if (!current(epoch) || repository !== port || state !== previous) return false;
    const next = { ...privateCopy(previous), confirmed: candidate.account };
    if (candidate.references) next.references = candidate.references; else delete next.references;
    if (clearPending) { next.pending = null; next.draft = null; }
    let saved = false;
    try {
      if(recovery.prepare){const started=performance.now();const prepared=await recovery.prepare(privateCopy(next),writingIdentity);noteWritingPhase('ack-recovery-prepare-await',started,writingIdentity);if(!current(epoch)||repository!==port||state!==previous)return false;const commitStart=performance.now();try{saved=prepared?.()??false;}finally{noteWritingPhase('ack-recovery-commit',commitStart,writingIdentity);}}
      else saved = recovery.save(privateCopy(next));
    } catch { /* Retain the original obligation. */ }
    // A synchronous recovery port may re-enter bindSession. Never overwrite its
    // new owner/state or publish an old success, including on persistence failure.
    if (!current(epoch) || repository !== port || state !== previous) return false;
    if (!saved) { status = 'recovery-required'; blocked = true; return false; }
    state = next; confirmedFrame=Object.freeze({}); accountHidden = false;
    // Tokens count only once their snapshot is validated and saved for recovery.
    confirmedRead = candidate.tokens && next.confirmed ? { tokens: candidate.tokens, confirmed: next.confirmed, references: next.references ?? null, port } : null;
    return true;
  }
  async function readCurrent(epoch: number, port: AlphaRepository<Space>, minimum = 0): Promise<boolean> {
    const previous = state!;
    const candidate = await readCandidate(epoch, port, minimum);
    return !!candidate && await commitCandidate(candidate, epoch, port, previous);
  }
  async function acceptReceipt(receipt: AlphaReceipt, command: AlphaCommand, epoch: number, port: AlphaRepository<Space>): Promise<boolean> {
    if (!current(epoch)) return false;
    const previous = state!, original = detached(command), before = privateCopy(previous.confirmed);
    const confirmedIdentity=previous.confirmed,referencesIdentity=previous.references,pendingIdentity=previous.pending,draftIdentity=previous.draft;
    const commandBytes = canonicalJson(original), referencesBytes = canonicalJson(previous.references ?? null);
    if (!previous.pending || canonicalJson(previous.pending) !== commandBytes
      || previous.draft && canonicalJson(previous.draft) !== commandBytes
      || original.kind === 'change-private' && (!before || before.revision !== original.expectedRevision)) {
      status = 'checking-result'; return false;
    }
    if (receipt.requestId !== command.requestId || receipt.kind !== command.kind || !Number.isSafeInteger(receipt.revision)
      || receipt.revision !== command.expectedRevision + (receipt.changed ? 1 : 0) || typeof receipt.changed !== 'boolean'
      || ((command.kind === 'social' || command.kind === 'undo-social') && (!Number.isSafeInteger(receipt.publicRevision)
        || receipt.publicRevision! < command.expectedPublicRevision || receipt.publicRevision! > command.expectedPublicRevision + 1))) {
      status = 'recovery-required'; return false;
    }
    const ownAck=activeAck;
    const candidate = await readCandidate(epoch, port, receipt.revision);
    if (!candidate || !current(epoch) || state !== previous || repository !== port) return false;
    if (writingCompute ? previous.pending!==pendingIdentity||previous.draft!==draftIdentity||previous.confirmed!==confirmedIdentity||previous.references!==referencesIdentity
      : canonicalJson(previous.pending) !== commandBytes || canonicalJson(previous.confirmed) !== canonicalJson(before)
      || canonicalJson(previous.references ?? null) !== referencesBytes) { status = 'checking-result'; return false; }
    if (receipt.publicRevision !== undefined && (candidate.references?.social?.revision ?? -1) < receipt.publicRevision) { status = 'recovery-required'; return false; }
    if(original.kind==='change-private'&&writingCompute){
      const reply=await writingCompute.run(stamp(crypto.randomUUID()),{kind:'receipt',before:before as unknown as AlphaAccount,command:original,candidate:candidate.account as unknown as AlphaAccount,receipt});
      if(!current(epoch)||state!==previous||repository!==port)return false;
      if(!reply.ok||previous.pending!==pendingIdentity||previous.draft!==draftIdentity||previous.confirmed!==confirmedIdentity||previous.references!==referencesIdentity){status='checking-result';return false;}
    }else if (original.kind === 'change-private') {
      // The submitted preimage is authoritative. A later valid shape or a newer
      // revision cannot prove this request's full private result.
      const expected = detached(before!);
      for (const change of original.changes) {
        if (change.present) Reflect.set(expected.space, change.field, detached(change.value));
        else Reflect.deleteProperty(expected.space, change.field);
      }
      const changed = canonicalJson(expected.space) !== canonicalJson(before!.space);
      expected.revision = before!.revision + (changed ? 1 : 0);
      if (receipt.changed !== changed || receipt.revision !== expected.revision
        || canonicalJson(candidate.account) !== canonicalJson(expected)) { status = 'checking-result'; return false; }
    }
    const unchangedReferences=!!ownAck&&referencesBytes===canonicalJson(candidate.references??null);
    if (!await commitCandidate(candidate, epoch, port, previous, true)) return false;
    lastReceipt = detached(receipt);
    lastError = null;
    status = receipt.changed ? 'saved' : 'same-location';
    if(ownAck&&activeAck===ownAck&&unchangedReferences&&receipt.changed){
      const settled=state;ackIssuer.issue(ownAck.identity,ownAck.input,ownAck.before,confirmedFrame,()=>current(epoch)&&repository===port&&state===settled&&!blocked&&!accountHidden&&status==='saved'&&!state?.pending&&!state?.draft);
    }
    return true;
  }
  async function send(command: AlphaCommand, epoch: number, port: AlphaRepository<Space>, replay = false): Promise<boolean> {
    try {
      const nativeBaseline = !replay && nativeHandoff(command) && state!.confirmed
        && command.expectedRevision === state!.confirmed.revision ? { requestId: command.requestId, body: retryBody(command),
          confirmed: canonicalJson(state!.confirmed), references: canonicalJson(state!.references ?? null) } : null;
      const socialBaseline = !replay && participationSave(command) && state!.confirmed
        && command.expectedRevision === state!.confirmed.revision && command.expectedPublicRevision === state!.references?.social?.revision
        ? { requestId: command.requestId, body: retryBody(command), target: socialDraftTarget(command.intent),
          confirmed: canonicalJson(state!.confirmed), references: canonicalJson(state!.references ?? null) } : null;
      const result = await port.execute(detached(command));
      if (!current(epoch)) return false;
      if ((nativeHandoff(command) || command.kind === 'social' || command.kind === 'undo-social') && !knownWriteResponse(result)) { status = 'checking-result'; return false; }
      if (!result.ok) {
        if (result.reason === 'unauthenticated') accountHidden = true;
        // A retry rejection cannot settle a previous ambiguous attempt. Auth or
        // availability failure also cannot establish the original commit outcome.
        if (!replay && result.reason !== 'unauthenticated' && result.reason !== 'unavailable') state!.pending = null;
        if (!persist()) return false;
        fail(result.reason);
        if (!replay && command.kind === 'change-private' && (result.reason === 'invalid' || result.reason === 'limit')) rejectedDraftRequestId = command.requestId;
        if (nativeBaseline && result.reason === 'limit' && matchesNativeRejection(nativeBaseline)) rejectedNativeHandoff = nativeBaseline;
        if (socialBaseline && (result.reason === 'invalid' || result.reason === 'limit' || result.reason === 'rate-limited')) {
          const proof: SocialDraftRejection = { ...socialBaseline, reason: result.reason };
          if (matchesSocialRejection(proof)) rejectedSocialDraft = proof;
        }
        return false;
      }
      return await acceptReceipt(result.value, command, epoch, port);
    } catch { if (current(epoch)) status = 'checking-result'; return false; }
  }
  return {
    bindSession(nextOwner: string | null, port: AlphaRepository<Space> | null) {
      // A same-owner token refresh alone does not validate cached account bytes.
      accountHidden = accountHidden && nextOwner !== null && port !== null && nextOwner === ownerId;
      ackIssuer.clear();activeAck=null;confirmedFrame=Object.freeze({});viewFrame=null;viewSlots.clear();confirmedRead=null;
      generation++; ownerId = nextOwner; repository = port; state = null; busy = false; blocked = false; lastReceipt = null;writingIdentity=undefined;
      lastError = null; rejectedDraftRequestId = null; rejectedNativeHandoff = null; rejectedSocialDraft = null;
      status = 'signed-out';
      if (nextOwner === null || port === null) { repository = null; ownerId = null; return; }
      try {
        const loaded = recovery.load(nextOwner);
        if (!loaded.ok || loaded.value !== null && !validateAlphaRecovery(loaded.value, nextOwner, validate)) {
          status = 'recovery-required'; blocked = true; return;
        }
        state = detached(loaded.value ?? { schema: 'flowme-alpha-recovery/1', ownerId: nextOwner, confirmed: null, pending: null, draft: null });
        status = state.pending ? 'checking-result' : state.draft ? 'recovery-required' : 'ready';
      } catch { status = 'recovery-required'; blocked = true; }
    },
    snapshot: () => ({ ownerId, status: accountHidden ? 'session-expired' as const : status, state: privateCopy(state), lastReceipt: privateCopy(lastReceipt), lastError,
      retryableRejectedDraft: retryableRejectedDraft(), retryableNativeHandoff: retryableNativeHandoff(), retryableRejectedSocialDraft: retryableRejectedSocialDraft() }),
    presentation,
    ownWritingAck:()=>ackIssuer.read(),
    writeCheckpoint(){const epoch=generation,own=state,confirmed=own?.confirmed,refs=own?.references,draft=own?.draft,port=repository,storageCheck=ownerId?recovery.checkpoint?.(ownerId):undefined;
      const proof=()=>current(epoch)&&repository===port&&state===own&&state?.confirmed===confirmed&&state?.references===refs&&state?.draft===draft&&!state?.pending&&!busy&&!blocked&&!accountHidden&&(storageCheck?.()??true);writeProofs.add(proof);return proof;},
    matchesRejectedSocialDraft,
    async refresh() {
      ackIssuer.clear();activeAck=null;
      if (!repository || !state || busy || blocked) return false;
      // Keep confirmed + references as the original pending request's preimage.
      // Only resolvePending's exact receipt/readback path can release it.
      if (state.pending) { status = 'checking-result'; return false; }
      const rejected = retryableRejectedDraft() ? { requestId: rejectedDraftRequestId, error: lastError,
        confirmed: canonicalJson(state.confirmed), references: canonicalJson(state.references ?? null) } : null;
      const nativeRejected = retryableNativeHandoff() ? rejectedNativeHandoff : null;
      const socialRejected = retryableRejectedSocialDraft() ? rejectedSocialDraft : null;
      lastError = null; rejectedDraftRequestId = null; rejectedNativeHandoff = null; rejectedSocialDraft = null;
      const epoch = generation, port = repository; busy = true;
      try {
        const ok = await readCurrent(epoch, port);
        if (ok && current(epoch)) {
          // Polling may confirm the exact pre-rejection baseline. Preserve only
          // the live rejection proof, never infer it from a recovered draft.
          if (rejected && !state!.pending && state!.draft?.kind === 'change-private'
            && state!.draft.requestId === rejected.requestId && state!.draft.expectedRevision === state!.confirmed?.revision
            && canonicalJson(state!.confirmed) === rejected.confirmed
            && canonicalJson(state!.references ?? null) === rejected.references) {
            lastError = rejected.error; rejectedDraftRequestId = rejected.requestId; status = 'recovery-required';
          } else if (nativeRejected && matchesNativeRejection(nativeRejected)) {
            lastError = 'limit'; rejectedNativeHandoff = nativeRejected; status = 'recovery-required';
          } else if (socialRejected && matchesSocialRejection(socialRejected)) {
            lastError = socialRejected.reason; rejectedSocialDraft = socialRejected; status = 'recovery-required';
          } else status = state!.pending ? 'checking-result' : state!.draft ? 'conflict' : 'ready';
        }
        return ok;
      } finally { if (current(epoch)) busy = false; }
    },
    /** Automatic refresh only (egress). Ask for the two read tokens first and keep the confirmed snapshot
     *  when both equal the tokens it was read with. No tokens yet, a pending/draft/held state, changed
     *  tokens or a missing probe RPC is the ordinary full refresh. An expired session stops here and never
     *  falls back to a full read; an unavailable probe waits for the next tick instead of a second request. */
    async refreshIfChanged(): Promise<boolean> {
      const read = confirmedRead, port = repository, own = state;
      if (!port || !own || busy || blocked || own.pending || own.draft || !port.probe || !read || read.port !== port
        || read.confirmed !== own.confirmed || read.references !== (own.references ?? null)
        || retryableRejectedDraft() || retryableNativeHandoff() || retryableRejectedSocialDraft()) return this.refresh();
      ackIssuer.clear();activeAck=null;
      const epoch = generation; busy = true;
      let probe: AlphaReadProbe | null = null;
      try { probe = await port.probe(); } catch { probe = null; } finally { if (current(epoch)) busy = false; }
      if (!current(epoch) || repository !== port || state !== own || confirmedRead !== read) return false;
      if (probe?.kind === 'tokens' && probe.tokens.privateToken === read.tokens.privateToken && probe.tokens.publicToken === read.tokens.publicToken) return true;
      if (probe?.kind === 'failed' && probe.reason === 'unauthenticated') { fail('unauthenticated'); return false; }
      if (!probe || probe.kind === 'failed' && probe.reason === 'unavailable') return false;
      return this.refresh();
    },
    async execute(command: AlphaCommand, options: { cancelled?: boolean; retryRejectedDraft?: boolean; retryNativeHandoff?: boolean; retryRejectedSocialDraft?: boolean;writingIdentity?:WritingIdentity;preparedReply?:WritingReply;writeCheckpoint?:()=>boolean;writingAckInput?:WritingAckInput } = {}) {
      if (!repository || !state || busy || blocked || state.pending) return false;
      if (options.retryRejectedSocialDraft && (options.retryRejectedDraft || options.retryNativeHandoff || !canRetryRejectedSocialDraft(command))) return false;
      if (options.retryNativeHandoff && (options.retryRejectedDraft || options.retryRejectedSocialDraft || !canRetryNativeHandoff(command))) return false;
      if (nativeHandoff(state.draft) && !options.retryNativeHandoff) return false;
      if (state.draft?.kind === 'social' && !options.retryRejectedSocialDraft) return false;
      if (options.retryRejectedDraft && (!retryableRejectedDraft() || command.kind !== 'change-private'
        || command.expectedRevision !== state.confirmed?.revision || command.requestId === state.draft?.requestId)) return false;
      lastError = null; rejectedDraftRequestId = null; rejectedNativeHandoff = null; rejectedSocialDraft = null;
      if (options.cancelled) { status = 'cancelled'; return false; }
      if (!validateAlphaCommand(command) && !isAlphaWireCommand(command)) { status = 'recovery-required'; return false; }
      let prepared:PreparedWriting|null=null;
      if(writingCompute&&recovery.savePrepared&&options.preparedReply&&options.writingIdentity&&options.writeCheckpoint&&writeProofs.has(options.writeCheckpoint)
        &&options.writeCheckpoint()&&state.references&&options.preparedReply.command===command){
        prepared=writingCompute.consumeSave(options.preparedReply,options.writingIdentity);writeProofs.delete(options.writeCheckpoint);
      }
      if(options.preparedReply&&!prepared){status='recovery-required';return false;}
      if (command.kind === 'change-private' && (command.changes.length === 0 || !prepared&&state.confirmed && command.expectedRevision === state.confirmed.revision
        && command.changes.every(change => Object.hasOwn(state!.confirmed!.space, change.field) === change.present
          && (!change.present || canonicalJson(state!.confirmed!.space[change.field]) === canonicalJson(change.value))))) {
        if (options.retryRejectedDraft) {
          const epoch = generation, previous = state; state = { ...state, draft: null };
          if (!persist()) { if (current(epoch)) state = previous; return false; }
        }
        status = 'same-location'; return false;
      }
      const epoch = generation, port = repository; busy = true;
      ackIssuer.clear();activeAck=null;
      writingIdentity=options.writingIdentity;
      if(prepared?.ackEligible&&options.writingAckInput&&writingIdentity)activeAck={identity:{...writingIdentity},input:options.writingAckInput,before:confirmedFrame};
      try {
        const previous = options.retryRejectedDraft || options.retryNativeHandoff || options.retryRejectedSocialDraft ? detached(state) : null;
        if(prepared){
          state={...prepared.recoveryValue} as AlphaRecovery<Space>;
          const saved=recovery.savePrepared!(prepared);
          if(!current(epoch)||repository!==port)return false;
          if(!saved){status='recovery-required';blocked=true;if(previous)state=previous;return false;}
        }else{
          state.pending = detached(command); state.draft = detached(command);
          if (!await persistAsync()) { if (previous && current(epoch)) state = previous; return false; }
        }
        status = 'saving'; return await send(command, epoch, port);
      } finally { if (current(epoch)) {busy = false;activeAck=null;} }
    },
    async resolvePending(retrySameRequest = false) {
      ackIssuer.clear();activeAck=null;
      if (!repository || !state?.pending || busy || blocked) return false;
      lastError = null; rejectedDraftRequestId = null; rejectedNativeHandoff = null; rejectedSocialDraft = null;
      const epoch = generation, port = repository, command = detached(state.pending); busy = true;
      try {
        status = 'checking-result';
        const result = await port.lookup(command.requestId);
        if (!current(epoch)) return false;
        if (!result.ok) { fail(result.reason); return false; }
        if (result.value !== null) return await acceptReceipt(result.value, command, epoch, port);
        // Absence may mean an earlier request is still in flight. Only retry the identical ID/body.
        return retrySameRequest ? await send(command, epoch, port, true) : false;
      } catch { if (current(epoch)) status = 'checking-result'; return false; }
      finally { if (current(epoch)) busy = false; }
    },
  };
}
