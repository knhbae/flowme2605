import type { AlphaCommand, AlphaCreatorUndoCommand, AlphaSocialUndoCommand, AlphaReceipt } from '../alpha-persistence/contract';
import { isAlphaSocialCommand } from '../alpha-social/contract';
import { validateAlphaCreatorCommand } from '../alpha-creator/contract';
import { programIdentifier, programShape } from '../program-data';
import { canonicalJson } from '../alpha-persistence/json';
import { isM3Command } from './contract';

export function isAlphaCreatorUndo(value: unknown): value is AlphaCreatorUndoCommand {
  try {
    canonicalJson(value);
    return programShape(value, ['schema', 'kind', 'requestId', 'expectedRevision', 'operationId'])
      && value.schema === 'flowme-alpha-creator-command/1' && value.kind === 'undo-creator'
      && programIdentifier(value.requestId) && value.requestId.length <= 160 && programIdentifier(value.operationId)
      && value.operationId !== value.requestId && value.operationId.length <= 160
      && Number.isSafeInteger(value.expectedRevision) && (value.expectedRevision as number) >= 0;
  } catch { return false; }
}
/** The M3 writer stays closed to creator aggregate patches. */
export function isAlphaWireCommand(value: unknown): value is AlphaCommand {
  return isM3Command(value) || validateAlphaCreatorCommand(value) || isAlphaCreatorUndo(value) || isAlphaSocialCommand(value) || isAlphaSocialUndo(value);
}
export function isAlphaSocialUndo(value: unknown): value is AlphaSocialUndoCommand {
  try {
    canonicalJson(value);
    return programShape(value, ['schema', 'kind', 'requestId', 'expectedRevision', 'expectedPublicRevision', 'operationId'])
      && value.schema === 'flowme-alpha-social-command/1' && value.kind === 'undo-social'
      && programIdentifier(value.requestId) && value.requestId.length <= 160 && programIdentifier(value.operationId)
      && value.operationId !== value.requestId && value.operationId.length <= 160
      && Number.isSafeInteger(value.expectedRevision) && (value.expectedRevision as number) >= 0
      && Number.isSafeInteger(value.expectedPublicRevision) && (value.expectedPublicRevision as number) >= 0;
  } catch { return false; }
}
export function isAlphaWireReceipt(value: unknown): value is AlphaReceipt {
  return programShape(value, ['requestId', 'revision', 'changed', 'kind', ...(value && typeof value === 'object' && Object.hasOwn(value, 'resultId') ? ['resultId'] : []), ...(value && typeof value === 'object' && Object.hasOwn(value, 'publicRevision') ? ['publicRevision'] : [])])
    && programIdentifier(value.requestId) && Number.isSafeInteger(value.revision) && (value.revision as number) >= 0
    && typeof value.changed === 'boolean' && ['change-private', 'undo-private', 'creator', 'undo-creator', 'social', 'undo-social'].includes(value.kind as string)
    && (!Object.hasOwn(value, 'resultId') || ['creator', 'undo-creator', 'social'].includes(value.kind as string) && programIdentifier(value.resultId))
    && (['social', 'undo-social'].includes(value.kind as string)
      ? Number.isSafeInteger(value.publicRevision) && (value.publicRevision as number) >= 0
      : !Object.hasOwn(value, 'publicRevision'));
}
