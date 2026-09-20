import type { ProgramData } from './contract';
import type { ProgramDestination } from './ui-contract';
import { programLocation, readProgramNavigationCheckpoint, type ProgramNavigationCheckpoint } from './navigation';

/** Explicit source-row navigation uses the existing history presentation
 * contract so the App's final restoration owns focus. No raw text or product
 * mutation is stored, and a foreign/stale checkpoint is never inherited. */
export function programCheckpointForWritingTarget(data: ProgramData, destination: ProgramDestination, lineId: string, checkpoint: ProgramNavigationCheckpoint | null): ProgramNavigationCheckpoint | null {
  if (destination.view !== 'space' || !destination.id || destination.executionKey || destination.action) return null;
  const space = data.spaces[data.activeActorId]; if (!space) return null;
  const docs = [...space.text.documents, ...space.text.flows], matches = docs.filter(doc => doc.id === destination.id);
  if (matches.length !== 1 || docs.flatMap(doc => doc.lines).filter(line => line.id === lineId).length !== 1) return null;
  const doc = matches[0], index = doc.lines.findIndex(line => line.id === lineId); if (index < 0) return null;
  const location = programLocation(destination), actorId = data.activeActorId;
  const prior = readProgramNavigationCheckpoint(checkpoint, actorId, location);
  const start = doc.lines.slice(0, index).reduce((sum, line) => sum + line.text.length + 1, 0);
  const next: ProgramNavigationCheckpoint = {
    ...(prior ?? { schema: 'flowme-navigation/1', actorId, location }), scroll: 0,
    focus: `program-text-${encodeURIComponent(doc.id)}`,
    ...(prior?.space ? { space: { ...prior.space, selected: doc.id, period: 'documents' } } : {}),
    writing: { ...prior?.writing, [doc.id]: { start, end: start, scrollTop: 0 } },
  };
  return readProgramNavigationCheckpoint(next, actorId, location);
}
