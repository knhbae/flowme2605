import type { ProgramEnvelope } from '../contract';
import type { ProgramMutate, ProgramMutationResult } from '../ui-contract';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { createAlphaClient, type AlphaClientStatus } from '../alpha-persistence/client';
import { ALPHA_COMMAND_SCHEMA, type AlphaAccount, type AlphaCommand, type AlphaRecoveryPort, type AlphaRepository, type AlphaReferenceContext } from '../alpha-persistence/contract';
import { commandFromProgramTransition, materializeAccount, privateChanges } from '../alpha-persistence/program-adapter';
import { detached, canonicalJson } from '../alpha-persistence/json';
import { isM3Command } from './contract';
import { isAlphaWireCommand } from './wire';
import { emptyAlphaReferences } from '../alpha-social/projection';
import { isAlphaSocialIntent } from '../alpha-social/contract';
import { alphaSocialAllowedFields } from '../alpha-social/dispatch';
import { isAlphaCreatorIntent } from '../alpha-creator/contract';

export type AlphaSyncSnapshot = { ownerId: string | null; account: AlphaAccount | null; envelope: ProgramEnvelope | null;
  status: AlphaClientStatus; busy: boolean; draft: AlphaCommand | null; pending: AlphaCommand | null; canUndo: boolean; canRedo: boolean; publicRevision?: number; references?: AlphaReferenceContext };
type Success = { command: AlphaCommand; before: AlphaAccount; after: AlphaAccount };
export function createAlphaSyncController(options: { recovery: AlphaRecoveryPort; onChange?: (snapshot: AlphaSyncSnapshot) => void; requestId?: () => string }) {
  const client = createAlphaClient(isAccountForOwner, options.recovery);
  let generation = 0, busy = false, repository: AlphaRepository | null = null, undo: Success | null = null;
  let redo: { expectedRevision: number; target: AlphaAccount; creatorUndoId?: string; socialUndoId?: string } | null = null;
  const references = (owner: string) => client.snapshot().state?.references ?? emptyAlphaReferences(owner);
  const undoable = (command: AlphaCommand) => command.kind !== 'social' || !alphaSocialAllowedFields(command.intent).public.length;
  const id = options.requestId ?? (() => crypto.randomUUID());
  function snapshot(): AlphaSyncSnapshot {
    const current = client.snapshot(), state = current.state;
    const account = current.status === 'session-expired' ? null : state?.confirmed ?? null;
    const editable = !!account && !busy && !state?.pending && !state?.draft && ['ready', 'saved', 'same-location', 'cancelled'].includes(current.status);
    return { ownerId: current.ownerId, account: detached(account), envelope: account ? materializeAccount(account, references(account.ownerId)) : null,
      status: current.status, busy, draft: detached(state?.draft ?? null), pending: detached(state?.pending ?? null),
      ...(state?.references?.social ? { publicRevision: state.references.social.revision } : {}),
      ...(account ? { references: detached(references(account.ownerId)) } : {}),
      canUndo: editable && undo?.after.revision === account?.revision, canRedo: editable && redo?.expectedRevision === account?.revision };
  }
  const emit = () => { try { options.onChange?.(snapshot()); } catch { /* Presentation cannot undo a server commit. */ } };
  const rejected = (reason: string): ProgramMutationResult => ({ ok: false, reason });
  async function execute(command: AlphaCommand, result: string, before: AlphaAccount, mode: 'edit' | 'undo' | 'redo', recordHistory = true): Promise<ProgramMutationResult> {
    if (!isAlphaWireCommand(command)) return rejected('forbidden');
    const epoch = generation; busy = true;
    try {
      const operation = client.execute(command); emit();
      const ok = await operation;
      if (epoch !== generation) return rejected('session-expired');
      const next = client.snapshot(), account = next.state?.confirmed;
      if (!ok) return next.status === 'same-location' ? { ok: true, result, changed: false }
        : rejected(next.lastError === 'limit' ? next.state?.pending ? 'checking-result' : 'limit' : next.status);
      if (next.status === 'saved' && account?.revision === before.revision + 1) {
        if (!recordHistory || !undoable(command)) { undo = null; redo = null; }
        else if (mode === 'undo') { redo = { expectedRevision: account.revision, target: detached(before), ...(command.kind === 'undo-creator' ? { creatorUndoId: command.requestId } : {}), ...(command.kind === 'undo-social' ? { socialUndoId: command.requestId } : {}) }; undo = null; }
        else { undo = { command: detached(command), before: detached(before), after: detached(account) }; redo = null; }
      } else if (next.status === 'saved') { undo = null; redo = null; }
      const resultId = next.lastReceipt?.requestId === command.requestId ? next.lastReceipt.resultId ?? result : result;
      const flowId = next.state?.references?.public.versions.find(version => version.id === resultId)?.flowId;
      return { ok: true, result: resultId, ...(flowId ? { flowId } : {}), changed: next.status === 'saved' };
    } finally { if (epoch === generation) { busy = false; emit(); } }
  }
  const mutate: ProgramMutate = async (_label, build, mutationOptions) => {
    const current = snapshot();
    if (busy) return rejected('busy');
    if (current.pending || current.draft) return rejected('unresolved');
    if (!current.account || !['ready', 'saved', 'same-location', 'cancelled'].includes(current.status)) return rejected(current.status);
    let result = '', failure: string | null = null;
    try {
      const catalogIntent = typeof mutationOptions?.alphaCreator === 'function' ? undefined : mutationOptions?.alphaCreator;
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
        // Run the existing preview against the exact displayed snapshot before
        // resolving lazy intent; preview builders populate selected payloads.
        const preview = build(detached(current.envelope.data));
        if (!preview.ok) return rejected(preview.reason);
        const intent = typeof mutationOptions.alphaSocial === 'function' ? mutationOptions.alphaSocial() : mutationOptions.alphaSocial;
        if (!isAlphaSocialIntent(intent)) return rejected('invalid');
        if (!preview.changed || canonicalJson(preview.data) === canonicalJson(current.envelope.data)) return { ok: true, result: preview.result, changed: false };
        return execute({ schema: 'flowme-alpha-social-command/1', kind: 'social', requestId: id(), expectedRevision: current.account.revision,
          expectedPublicRevision: current.publicRevision, intent: detached(intent) }, preview.result, current.account, 'edit', mutationOptions.history !== false);
      }
      const command = commandFromProgramTransition(current.account, references(current.account.ownerId), id(), data => {
        const transition = build(data);
        if (transition.ok) result = transition.result; else failure = transition.reason;
        return transition;
      });
      const intent = typeof mutationOptions?.alphaCreator === 'function' ? mutationOptions.alphaCreator() : mutationOptions?.alphaCreator;
      if (intent && command.kind === 'change-private' && command.changes.length) {
        return execute({ schema: 'flowme-alpha-creator-command/1', kind: 'creator', requestId: command.requestId,
          expectedRevision: command.expectedRevision, intent }, result, current.account, 'edit', mutationOptions?.history !== false);
      }
      if (!isM3Command(command)) return rejected('forbidden');
      return execute(command, result, current.account, 'edit', mutationOptions?.history !== false);
    } catch { return rejected(failure ?? 'invalid'); }
  };
  async function settle(kind: 'refresh' | 'resolve', retry = false) {
    if (busy) return false;
    const previous = client.snapshot().state;
    const epoch = generation; busy = true;
    try {
      const operation = kind === 'refresh' ? client.refresh() : client.resolvePending(retry); emit();
      const result = await operation;
      if (epoch !== generation) return false;
      const confirmed = client.snapshot().state?.confirmed, revision = confirmed?.revision;
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
      const changedOwner = client.snapshot().ownerId !== ownerId;
      generation++; busy = false; repository = next;
      if (changedOwner) { undo = null; redo = null; }
      client.bindSession(ownerId, next); emit();
    },
    dispose() { generation++; busy = false; repository = null; undo = null; redo = null; client.bindSession(null, null); emit(); },
    refresh: () => settle('refresh'), resolvePending: (retrySameRequest = false) => settle('resolve', retrySameRequest),
    async discardConflict() {
      const current = client.snapshot();
      if (busy || !current.ownerId || !repository || !current.state?.draft || current.state.pending) return false;
      const cleared = detached(current.state); cleared.draft = null;
      try { if (!options.recovery.save(cleared)) return false; } catch { return false; }
      client.bindSession(current.ownerId, repository); undo = null; redo = null; emit();
      return settle('refresh');
    },
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
