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
  sessionNumber: string;
  decision: ObservedSessionNoteDecision;
  artifactNearCta: string;
  stickyFallback: string;
  exportCopy: string;
  friction: string;
  followUp: string;
};

export type ObservedSessionRunSheetDraft = {
  slug: string;
  title: string;
  sessionGoal: string;
  moderatorPrompt: string;
  expectedArtifacts: string[];
  screenshotTargets: string[];
  passSignals: string[];
  failureSignals: string[];
  handoffNote: string;
};

function valueOrDash(value: string): string {
  return value.trim() || '-';
}

function normalizeSessionNumber(value: string): string {
  const numericValue = Number.parseInt(value, 10);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return '01';
  return String(numericValue).padStart(2, '0');
}

function listItems(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- -';
}

export function generateObservedSessionNoteFilename(date: string, route: string, sessionNumber: string): string {
  return `${valueOrDash(date)}-${valueOrDash(route)}-session-${normalizeSessionNumber(sessionNumber)}.md`;
}

export function generateObservedSessionRunSheetFilename(route: string): string {
  return `${valueOrDash(route)}-observed-session-run-sheet.md`;
}

export function generateObservedSessionNoteMarkdown(draft: ObservedSessionNoteDraft): string {
  return `# Observed Session Note: ${valueOrDash(draft.route)}

Date: ${valueOrDash(draft.date)}
Observer: ${valueOrDash(draft.observer)}
Route: \`${valueOrDash(draft.route)}\`
Device: ${valueOrDash(draft.device)}
Participant type: ${valueOrDash(draft.participantType)}
Task realism: ${valueOrDash(draft.taskRealism)}
Session: ${normalizeSessionNumber(draft.sessionNumber)}

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

export function generateObservedSessionRunSheetMarkdown(draft: ObservedSessionRunSheetDraft): string {
  return `# Observed Session Run Sheet: ${valueOrDash(draft.slug)}

Title: ${valueOrDash(draft.title)}
Goal: ${valueOrDash(draft.sessionGoal)}

## Moderator prompt

${valueOrDash(draft.moderatorPrompt)}

## Expected artifacts

${listItems(draft.expectedArtifacts)}

## Screenshot targets

${listItems(draft.screenshotTargets)}

## Pass signals

${listItems(draft.passSignals)}

## Failure signals

${listItems(draft.failureSignals)}

## Handoff note

${valueOrDash(draft.handoffNote)}

## Decision boundary

Decision options: \`no signal\`, \`friction\`, \`candidate signal\`

This run sheet is for observation only. Do not use validated language until repeated target-user behavior shows the full export-first loop.
`;
}
