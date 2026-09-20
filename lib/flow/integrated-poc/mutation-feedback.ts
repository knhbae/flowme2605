import { programErrorMessage, type ProgramMutationResult } from './ui-contract';

export type ProgramMutationFeedback = { status: string; failed: boolean; completion?: { actorId: string; location: string; resultId: string } };

/** Only successful mutation notices expire on a committed destination change.
 * Warnings and presentation recovery are deliberately not completion notices. */
export function programMutationFeedbackAfterNavigation(previous: ProgramMutationFeedback, actorId: string, location: string, resultIds: (string | undefined)[] = []): ProgramMutationFeedback {
  const completion = previous.completion;
  if (!completion || previous.failed) return previous;
  if (completion.actorId === actorId && completion.location === location) return previous;
  // A newly created post/reply/document can carry its success to the exact result.
  if (completion.actorId === actorId && resultIds.includes(completion.resultId)) return { ...previous, completion: { ...completion, location } };
  return { status: '', failed: false };
}

/** Quiet draft saves should not announce every keystroke. A successful retry
 * must nevertheless replace a failure, including a confirmed no-op retry. */
export function nextProgramMutationFeedback(previous: ProgramMutationFeedback, label: string, result: ProgramMutationResult, quiet = false, context?: { actorId: string; location: string }): ProgramMutationFeedback {
  if (!result.ok) return { failed: true, status: programErrorMessage(result.reason) };
  if (result.presentationPending) return { failed: false, status: '저장됨 · 화면 갱신 필요' };
  if (quiet && !previous.failed) return previous;
  return { failed: false, status: result.changed ? `${label} · 저장됨` : '이미 같은 상태입니다.',
    ...(context ? { completion: { ...context, resultId: result.result } } : {}) };
}
