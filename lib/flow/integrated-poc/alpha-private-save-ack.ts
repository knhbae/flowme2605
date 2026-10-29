import type { ProgramData } from './contract';
import type { AlphaCommand, AlphaAccount, AlphaPrivateCommand, AlphaReceipt, AlphaSpace } from './alpha-persistence/contract';
import type { AlphaSyncSnapshot } from './alpha-sync/controller';
import { privateChanges } from './alpha-persistence/program-adapter';
import { canonicalJson } from './alpha-persistence/json';

/** Common full-private-diff proof. Account/profile and live owner checks stay with the caller. */
export function exactAlphaPrivateChange<Space extends AlphaSpace>(ownerId:string,before:Space,command:AlphaPrivateCommand,account:AlphaAccount<Space>,receipt:AlphaReceipt){
  try{return command.kind==='change-private'&&account.ownerId===ownerId&&account.source.actorId===ownerId
    &&receipt.requestId===command.requestId&&receipt.kind===command.kind&&receipt.changed===true
    &&receipt.revision===command.expectedRevision+1&&account.revision===receipt.revision
    &&canonicalJson(privateChanges(before,account.space))===canonicalJson(command.changes);
  }catch{return false;}
}

/** Proof for a resolved private text save, not a general equal-text refresh. */
export function confirmedAlphaPrivateTextSave(ownerId: string, before: ProgramData | null,
  revision: number | null, publicRevision: number | null, pending: AlphaCommand | null | undefined,
  next: AlphaSyncSnapshot) {
  const account = next.account, data = next.envelope?.data, receipt = next.lastReceipt;
  if (!before || before.activeActorId !== ownerId || !before.spaces[ownerId]
    || pending?.kind !== 'change-private' || pending.expectedRevision !== revision
    || !pending.changes.some(change => change.field === 'text' && change.present)
    || next.ownerId !== ownerId || account?.ownerId !== ownerId || account.source.actorId !== ownerId
    || data?.activeActorId !== ownerId || !receipt || receipt.requestId !== pending.requestId
    || receipt.kind !== pending.kind || !receipt.changed || receipt.revision !== pending.expectedRevision + 1
    || account.revision !== receipt.revision || next.status !== 'saved' || next.busy || next.pending || next.draft
    || (next.publicRevision ?? null) !== publicRevision) return null;
  try {
    if (canonicalJson(before.public) !== canonicalJson(data.public)
      || !exactAlphaPrivateChange(ownerId,before.spaces[ownerId],pending,account,receipt)) return null;
    return { before: before.spaces[ownerId].text, next: account.space.text };
  } catch { return null; }
}
