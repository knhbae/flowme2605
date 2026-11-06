import {freezeWritingView,registerWritingView,noteWritingPhase,type WritingAckInput,type OwnedWritingAck} from '../writing-ack';
import type { ProgramEnvelope } from '../contract';
import type {WritingCompute,WritingIdentity,WritingReply} from '../writing-compute';
import type { ProgramMutate, ProgramMutationResult, ProgramPrivateMutationObservation } from '../ui-contract';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { createAlphaClient, type AlphaClientStatus } from '../alpha-persistence/client';
import { ALPHA_COMMAND_SCHEMA, type AlphaAccount, type AlphaCommand, type AlphaReceipt, type AlphaRecoveryPort, type AlphaRepository, type AlphaReferenceContext } from '../alpha-persistence/contract';
import { commandFromProgramTransition, materializeAccount, privateChanges } from '../alpha-persistence/program-adapter';
import { detached, canonicalJson } from '../alpha-persistence/json';
import { isM3Command } from './contract';
import { isAlphaWireCommand } from './wire';
import { emptyAlphaReferences } from '../alpha-social/projection';
import { isAlphaSocialIntent } from '../alpha-social/contract';
import { alphaSocialAllowedFields } from '../alpha-social/dispatch';
import { isAlphaCreatorIntent } from '../alpha-creator/contract';

export type AlphaSyncSnapshot = { ownerId: string | null; account: AlphaAccount | null; envelope: ProgramEnvelope | null;
  status: AlphaClientStatus; busy: boolean; draft: AlphaCommand | null; pending: AlphaCommand | null; canUndo: boolean; canRedo: boolean; retryableRejectedDraft?: boolean; retryableNativeHandoff?: boolean; retryableRejectedSocialDraft?: boolean; ownWritingAck?:OwnedWritingAck|null; lastReceipt?: AlphaReceipt | null; publicRevision?: number; references?: AlphaReferenceContext };
type Success = { command: AlphaCommand; before: AlphaAccount; after: AlphaAccount };
/** Waits before each quiet lookup of a social write whose answer was lost (see lostSocialAnswer). */
export const ALPHA_LOST_ANSWER_CHECKS_MS: readonly number[] = Object.freeze([1500, 3000]);
export function createAlphaSyncController(options: { recovery: AlphaRecoveryPort; onChange?: (snapshot: AlphaSyncSnapshot) => void; requestId?: () => string;writingCompute?:WritingCompute }) {
  const client = createAlphaClient(isAccountForOwner, options.recovery,options.writingCompute);
  let generation = 0, busy = false, repository: AlphaRepository | null = null, undo: Success | null = null;
  let redo: { expectedRevision: number; target: AlphaAccount; creatorUndoId?: string; socialUndoId?: string } | null = null;
  const references = (owner: string) => readClient().state?.references ?? emptyAlphaReferences(owner);
  const undoable = (command: AlphaCommand) => command.kind !== 'social' || !alphaSocialAllowedFields(command.intent).public.length;
  // These frozen values came only from our closed presentation or sealed worker reply.
  const copyOwned=<T,>(value:T):T=>options.writingCompute?(Object.isFrozen(value)?value:structuredClone(value)):detached(value);
  const readClient=()=>options.writingCompute?client.presentation():client.snapshot();
  let materialized:{frame:object;envelope:ProgramEnvelope}|null=null;
  const id = options.requestId ?? (() => crypto.randomUUID());
  function snapshot(): AlphaSyncSnapshot {
    const current = readClient(), state = current.state;
    const frame='confirmedFrame' in current?current.confirmedFrame as object:null;
    const account = current.status === 'session-expired' ? null : state?.confirmed ?? null;
    const reference=state?.references??(account?emptyAlphaReferences(account.ownerId):null);
    const editable = !!account && !busy && !state?.pending && !state?.draft && ['ready', 'saved', 'same-location', 'cancelled'].includes(current.status);
    // The writing presentation owns an immutable copy per confirmed frame.
    // Generic snapshots keep their detached account/envelope/reference copies.
    let envelope:ProgramEnvelope|null=null;
    if(account){
      const started=performance.now();
      if(frame&&materialized?.frame===frame)envelope=materialized.envelope;
      else {envelope=materializeAccount(account,reference!);if(frame){freezeWritingView(envelope);registerWritingView(envelope.data,{frame,ownerId:account.ownerId,revision:account.revision,publicRevision:state?.references?.social?.revision??null});materialized={frame,envelope};}}
      noteWritingPhase('ack-materialize',started);
    }
    return { ownerId: current.ownerId, account: options.writingCompute?account:structuredClone(account), envelope, ownWritingAck:client.ownWritingAck(),
      status: quietCheck && busy ? 'saving' : current.status, busy, draft: state?.draft ?? null, pending: state?.pending ?? null,
      retryableRejectedDraft: !busy && current.retryableRejectedDraft,
      retryableNativeHandoff: !busy && current.retryableNativeHandoff,
      retryableRejectedSocialDraft: !busy && current.retryableRejectedSocialDraft,
      lastReceipt: current.lastReceipt,
      ...(state?.references?.social ? { publicRevision: state.references.social.revision } : {}),
      ...(account ? { references: options.writingCompute?reference!:structuredClone(reference!) } : {}),
      canUndo: editable && undo?.after.revision === account?.revision, canRedo: editable && redo?.expectedRevision === account?.revision };
  }
  const emit = () => { try { options.onChange?.(snapshot()); } catch { /* Presentation cannot undo a server commit. */ } };
  const rejected = (reason: string): ProgramMutationResult => ({ ok: false, reason });
  // 11/7: a social write whose answer was lost on the way back (a tunnel's 502 page reads as 'unavailable', an unreadable
  // answer as 'checking-result') was often saved. Before it is called unknown it is looked up by its request id, as a
  // reload does: a lookup only, never sent again. While that runs the write still shows as saving.
  let quietCheck = false;
  const lostSocialAnswer = (command: AlphaCommand, next: ReturnType<typeof readClient>) =>
    (command.kind === 'social' || command.kind === 'undo-social') && next.state?.pending?.requestId === command.requestId
    && (next.lastError === 'unavailable' || next.status === 'checking-result');
  async function execute(command: AlphaCommand, result: string, before: AlphaAccount, mode: 'edit' | 'undo' | 'redo', recordHistory = true, retryRejectedDraft = false, retryNativeHandoff = false, retryRejectedSocialDraft = false,writingIdentity?:WritingIdentity,preparedReply?:WritingReply,writeCheckpoint?:()=>boolean,writingAckInput?:WritingAckInput): Promise<ProgramMutationResult> {
    if (!isAlphaWireCommand(command)) return rejected('forbidden');
    const epoch = generation; busy = true;
    try {
      const operation = client.execute(command, { retryRejectedDraft, retryNativeHandoff, retryRejectedSocialDraft,writingIdentity,preparedReply,writeCheckpoint,writingAckInput }); emit();
      let ok = await operation;
      if (epoch !== generation) return rejected('session-expired');
      let next = readClient();
      if (!ok && lostSocialAnswer(command, next)) {
        quietCheck = true; emit();
        for (const wait of ALPHA_LOST_ANSWER_CHECKS_MS) {
          await new Promise(done => setTimeout(done, wait));
          if (epoch !== generation) return rejected('session-expired');
          ok = await client.resolvePending(false);
          if (epoch !== generation) return rejected('session-expired');
          next = readClient();
          if (ok || !lostSocialAnswer(command, next)) break;
        }
        quietCheck = false;
      }
      const account = next.state?.confirmed;
      if (!ok) return next.status === 'same-location' ? { ok: true, result, changed: false }
        : rejected(next.lastError === 'limit' ? next.state?.pending ? 'checking-result' : 'limit' : next.status);
      if (next.status === 'saved' && account?.revision === before.revision + 1) {
        if (!recordHistory || !undoable(command)) { undo = null; redo = null; }
        else if (mode === 'undo') { redo = { expectedRevision: account.revision, target: copyOwned(before), ...(command.kind === 'undo-creator' ? { creatorUndoId: command.requestId } : {}), ...(command.kind === 'undo-social' ? { socialUndoId: command.requestId } : {}) }; undo = null; }
        else { undo = { command: copyOwned(command), before: copyOwned(before), after: copyOwned(account) }; redo = null; }
      } else if (next.status === 'saved') { undo = null; redo = null; }
      const resultId = next.lastReceipt?.requestId === command.requestId ? next.lastReceipt.resultId ?? result : result;
      const flowId = next.state?.references?.public.versions.find(version => version.id === resultId)?.flowId;
      return { ok: true, result: resultId, ...(flowId ? { flowId } : {}), changed: next.status === 'saved' };
    } finally { quietCheck = false; if (epoch === generation) { busy = false; emit(); } }
  }
  const mutate: ProgramMutate = async (_label, build, mutationOptions) => {
    const started=performance.now();
    const current = snapshot();
    const retryNative = !!current.retryableNativeHandoff;
    const retrySocial = !!current.retryableRejectedSocialDraft;
    if (busy) return rejected('busy');
    if (current.pending || current.draft && !current.retryableRejectedDraft && !retryNative && !retrySocial) return rejected('unresolved');
    if (current.retryableRejectedDraft && (mutationOptions?.alphaCreator || mutationOptions?.alphaSocial)) return rejected('unresolved');
    if (retryNative && (!mutationOptions?.alphaCreator || mutationOptions.alphaSocial)) return rejected('unresolved');
    if (retrySocial && (!mutationOptions?.alphaSocial || mutationOptions.alphaCreator)) return rejected('unresolved');
    if (!current.account || !current.retryableRejectedDraft && !retryNative && !retrySocial && !['ready', 'saved', 'same-location', 'cancelled'].includes(current.status)) return rejected(current.status);
    const writing=mutationOptions?.alphaWriting,compute=options.writingCompute;
    if(writing&&compute){
      if(mutationOptions.alphaCreator||mutationOptions.alphaSocial||retryNative||retrySocial||!current.references)return rejected('forbidden');
      const epoch=generation,account=current.account,reference=current.references,requestId=id();
      const identity={ownerId:account.ownerId,docId:writing.documentId,workingGeneration:writing.workingGeneration,baseRevision:account.revision,requestId};
      const checkpoint=client.writeCheckpoint();
      // Reserve this serialized writer before yielding. Calculation never owns
      // persistence, permission, CAS, confirmation, or a later input generation.
      busy=true;emit();compute.note('preflight',performance.now()-started);
      try{
        const reply=await compute.run(identity,{kind:'save',account,references:reference,expected:writing.expected,next:writing.next,position:writing.position});
        if(epoch!==generation)return rejected('session-expired');
        const handoff=performance.now();
        if(!reply.ok||!reply.command||reply.command.requestId!==requestId||reply.command.expectedRevision!==account.revision
          ||!isM3Command(reply.command)||writing.canSubmit?.()===false||!checkpoint())return rejected('conflict');
        const observe=(event:ProgramPrivateMutationObservation)=>{try{mutationOptions.onPrivateMutation?.(detached(event));}catch{}};
        compute.note('handoff',performance.now()-handoff);const dispatch=performance.now();
        const operation=execute(reply.command,reply.result??writing.documentId,account,'edit',mutationOptions.history!==false,current.retryableRejectedDraft,false,false,identity,options.recovery.savePrepared?reply:undefined,checkpoint,{documentId:writing.documentId,generation:writing.workingGeneration,expected:writing.expected,next:writing.next});
        compute.note('dispatch',performance.now()-dispatch);
        if(mutationOptions.onPrivateMutation)observe({phase:'prepared',generation:epoch,before:account,command:reply.command,snapshot:snapshot()});
        const outcome=await operation;
        if(mutationOptions.onPrivateMutation)observe({phase:'settled',generation,before:account,command:reply.command,snapshot:snapshot(),result:outcome});
        return outcome;
      }catch{return rejected('worker-error');}
      finally{if(epoch===generation&&busy){busy=false;emit();}}
    }
    let result = '', failure: string | null = null;
    try {
      const catalogIntent = typeof mutationOptions?.alphaCreator === 'function' ? undefined : mutationOptions?.alphaCreator;
      if (retryNative && catalogIntent && (catalogIntent.type !== 'native-handoff' || current.draft?.kind !== 'creator'
        || canonicalJson(catalogIntent) !== canonicalJson(current.draft.intent))) return rejected('unresolved');
      if (catalogIntent && (catalogIntent.type === 'catalog-library-import' || catalogIntent.type === 'catalog-content-import')) {
        if (!isAlphaCreatorIntent(catalogIntent)) return rejected('invalid');
        // The exact source is compiled and checked on the authenticated server.
        // Never rebuild private catalog bytes in a public browser bundle.
        return execute({ schema: 'flowme-alpha-creator-command/1', kind: 'creator', requestId: id(),
          expectedRevision: current.account.revision, intent: detached(catalogIntent) },
        catalogIntent.type === 'catalog-library-import' ? catalogIntent.catalogVersion : catalogIntent.sourceVersionId,
        current.account, 'edit', mutationOptions?.history !== false);
      }
      if (mutationOptions?.alphaSocial) {
        if (current.publicRevision === undefined || !current.envelope) return rejected('forbidden');
        if (retrySocial && typeof mutationOptions.alphaSocial !== 'function' && !client.matchesRejectedSocialDraft(mutationOptions.alphaSocial)) return rejected('unresolved');
        // Run the existing preview against the exact displayed snapshot before
        // resolving lazy intent; preview builders populate selected payloads.
        const preview = build(detached(current.envelope.data));
        if (!preview.ok) return rejected(preview.reason);
        const intent = typeof mutationOptions.alphaSocial === 'function' ? mutationOptions.alphaSocial() : mutationOptions.alphaSocial;
        if (!isAlphaSocialIntent(intent)) return rejected('invalid');
        if (retrySocial && !client.matchesRejectedSocialDraft(intent)) return rejected('unresolved');
        if (!preview.changed || canonicalJson(preview.data) === canonicalJson(current.envelope.data)) return retrySocial ? rejected('unresolved') : { ok: true, result: preview.result, changed: false };
        return execute({ schema: 'flowme-alpha-social-command/1', kind: 'social', requestId: id(), expectedRevision: current.account.revision,
          expectedPublicRevision: current.publicRevision, intent: detached(intent) }, preview.result, current.account, 'edit', mutationOptions.history !== false, false, false, retrySocial);
      }
      const command = commandFromProgramTransition(current.account, references(current.account.ownerId), id(), data => {
        const transition = build(data);
        if (transition.ok) result = transition.result; else failure = transition.reason;
        return transition;
      });
      const intent = typeof mutationOptions?.alphaCreator === 'function' ? mutationOptions.alphaCreator() : mutationOptions?.alphaCreator;
      if (retryNative && (!intent || !isAlphaCreatorIntent(intent) || intent.type !== 'native-handoff' || current.draft?.kind !== 'creator'
        || canonicalJson(intent) !== canonicalJson(current.draft.intent) || command.kind !== 'change-private' || !command.changes.length)) return rejected('unresolved');
      if (intent && command.kind === 'change-private' && command.changes.length) {
        return execute({ schema: 'flowme-alpha-creator-command/1', kind: 'creator', requestId: command.requestId,
          expectedRevision: command.expectedRevision, intent }, result, current.account, 'edit', mutationOptions?.history !== false, false, retryNative);
      }
      if (!isM3Command(command)) return rejected('forbidden');
      if (command.kind !== 'change-private') return execute(command, result, current.account, 'edit', mutationOptions?.history !== false, current.retryableRejectedDraft);
      const observer = mutationOptions?.onPrivateMutation, epoch = generation;
      const observe = (event: ProgramPrivateMutationObservation) => { try { observer?.(detached(event)); } catch { /* Observation cannot undo a commit. */ } };
      // execute enters busy synchronously; do not let a prepared observer start another writer.
      const operation = execute(command, result, current.account, 'edit', mutationOptions?.history !== false, current.retryableRejectedDraft);
      observe({ phase: 'prepared', generation: epoch, before: current.account, command, snapshot: snapshot() });
      const outcome = await operation;
      observe({ phase: 'settled', generation, before: current.account, command, snapshot: snapshot(), result: outcome });
      // N10 (QA F2): a builder whose whole intent is re-read from the account (a repeat check) is built once more on
      // the newer revision that refused it. Only this request's own rejected draft is let go, and the new command
      // carries the new revision, so the server's compare-and-set still decides.
      if (!outcome.ok && outcome.reason === 'conflict' && mutationOptions?.rebuildOnConflict && !current.retryableRejectedDraft
        && epoch === generation && readClient().state?.draft?.requestId === command.requestId && !readClient().state?.pending
        && await discardConflict() && epoch === generation)
        return mutate(_label, build, { ...mutationOptions, rebuildOnConflict: false });
      return outcome;
    } catch { return rejected(failure ?? 'invalid'); }
  };
  async function discardConflict() {
    const current = readClient();
    if (busy || !current.ownerId || !repository || !current.state?.draft || current.state.pending) return false;
    const cleared = detached(current.state); cleared.draft = null;
    try { if (!options.recovery.save(cleared)) return false; } catch { return false; }
    client.bindSession(current.ownerId, repository); undo = null; redo = null; emit();
    return settle('refresh');
  }
  async function settle(kind: 'refresh' | 'refresh-if-changed' | 'resolve', retry = false) {
    if (busy) return false;
    const previous = readClient().state;
    const epoch = generation; busy = true;
    try {
      const operation = kind === 'refresh' ? client.refresh() : kind === 'refresh-if-changed' ? client.refreshIfChanged() : client.resolvePending(retry); emit();
      const result = await operation;
      if (epoch !== generation) return false;
      const confirmed = readClient().state?.confirmed, revision = confirmed?.revision;
      if (undo && undo.after.revision !== revision) undo = null;
      if (redo && redo.expectedRevision !== revision) redo = null;
      // A resolved lost response is also a confirmed success, but only when the
      // retained preimage and current server revision prove it is still latest.
      if (kind === 'resolve' && result && previous?.pending && previous.confirmed && confirmed
        && previous.confirmed.revision === previous.pending.expectedRevision
        && confirmed.revision === previous.pending.expectedRevision + 1) {
        if (!undoable(previous.pending) || previous.pending.kind === 'social' && ['publication-save', 'participation-save', 'review-save'].includes(previous.pending.intent.type)
          || previous.pending.kind === 'creator' && previous.pending.intent.type === 'working') { undo = null; redo = null; }
        else if (previous.pending.kind === 'change-private' || previous.pending.kind === 'creator' || previous.pending.kind === 'social') {
          undo = { command: detached(previous.pending), before: detached(previous.confirmed), after: detached(confirmed) }; redo = null;
        } else { redo = { expectedRevision: confirmed.revision, target: detached(previous.confirmed), ...(previous.pending.kind === 'undo-creator' ? { creatorUndoId: previous.pending.requestId } : {}), ...(previous.pending.kind === 'undo-social' ? { socialUndoId: previous.pending.requestId } : {}) }; undo = null; }
      }
      return result;
    } finally { if (epoch === generation) { busy = false; emit(); } }
  }
  return {
    snapshot, mutate,
    bindSession(ownerId: string | null, next: AlphaRepository | null) {
      const changedOwner = readClient().ownerId !== ownerId;
      options.writingCompute?.cancel();generation++; busy = false; repository = next;
      if (changedOwner) { undo = null; redo = null; }
      client.bindSession(ownerId, next); emit();
    },
    dispose() { options.writingCompute?.cancel();generation++; busy = false; repository = null; undo = null; redo = null; client.bindSession(null, null); emit(); },
    refresh: () => settle('refresh'), resolvePending: (retrySameRequest = false) => settle('resolve', retrySameRequest),
    /** The host's own periodic/return reads only; every other read stays a full refresh. */
    refreshIfChanged: () => settle('refresh-if-changed'),
    discardConflict,
    async undo(): Promise<ProgramMutationResult> {
      const current = snapshot();
      if (!current.canUndo || !undo || !current.account) return rejected('undo-conflict');
      if (undo.command.kind === 'social' || undo.command.kind === 'undo-social') return execute({ schema: 'flowme-alpha-social-command/1', kind: 'undo-social', requestId: id(),
        expectedRevision: current.account.revision, expectedPublicRevision: current.publicRevision ?? -1, operationId: undo.command.requestId }, 'undo', current.account, 'undo');
      const creator = undo.command.kind === 'creator' || undo.command.kind === 'undo-creator';
      return execute(creator ? { schema: 'flowme-alpha-creator-command/1', kind: 'undo-creator', requestId: id(), expectedRevision: current.account.revision, operationId: undo.command.requestId }
        : { schema: ALPHA_COMMAND_SCHEMA, kind: 'undo-private', requestId: id(), expectedRevision: current.account.revision, operationId: undo.command.requestId }, 'undo', current.account, 'undo');
    },
    async redo(): Promise<ProgramMutationResult> {
      const current = snapshot();
      if (!current.canRedo || !redo || !current.account) return rejected('undo-conflict');
      if (redo.socialUndoId) return execute({ schema: 'flowme-alpha-social-command/1', kind: 'undo-social', requestId: id(), expectedRevision: current.account.revision,
        expectedPublicRevision: current.publicRevision ?? -1, operationId: redo.socialUndoId }, 'redo', current.account, 'redo');
      if (redo.creatorUndoId) return execute({ schema: 'flowme-alpha-creator-command/1', kind: 'undo-creator', requestId: id(), expectedRevision: current.account.revision, operationId: redo.creatorUndoId }, 'redo', current.account, 'redo');
      return execute({ schema: ALPHA_COMMAND_SCHEMA, kind: 'change-private', requestId: id(), expectedRevision: current.account.revision,
        changes: privateChanges(current.account.space, redo.target.space) }, 'redo', current.account, 'redo');
    },
  };
}
