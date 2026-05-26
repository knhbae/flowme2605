export const observedSessionNoteDecisionOptions = [
  'no signal',
  'friction',
  'candidate signal',
] as const;

export type ObservedSessionNoteDecision = (typeof observedSessionNoteDecisionOptions)[number];

export type ObservedSessionNoteDraft = {
  date: string;
  observer: string;
  route: string;
  device: string;
  participantType: string;
  taskRealism: string;
  decision: ObservedSessionNoteDecision;
  artifactNearCta: string;
  stickyFallback: string;
  exportCopy: string;
  friction: string;
  followUp: string;
};

function valueOrDash(value: string): string {
  return value.trim() || '-';
}

export function generateObservedSessionNoteFilename(date: string, route: string): string {
  return `${valueOrDash(date)}-${valueOrDash(route)}-session-draft.md`;
}

export function generateObservedSessionNoteMarkdown(draft: ObservedSessionNoteDraft): string {
  return `# Observed Session Note: ${valueOrDash(draft.route)}

Date: ${valueOrDash(draft.date)}
Observer: ${valueOrDash(draft.observer)}
Route: \`${valueOrDash(draft.route)}\`
Device: ${valueOrDash(draft.device)}
Participant type: ${valueOrDash(draft.participantType)}
Task realism: ${valueOrDash(draft.taskRealism)}

## Export-First Evidence

- Artifact-near CTA: ${valueOrDash(draft.artifactNearCta)}
- Sticky fallback: ${valueOrDash(draft.stickyFallback)}
- Export/copy: ${valueOrDash(draft.exportCopy)}

## Friction

${valueOrDash(draft.friction)}

## Decision

Decision: \`${draft.decision}\`

This note is not validation. Do not call this route validated until repeated target-user behavior shows the full export-first loop.

## Follow-Up

${valueOrDash(draft.followUp)}
`;
}
