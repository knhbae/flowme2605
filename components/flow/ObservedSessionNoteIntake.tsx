'use client';

import { useMemo, useState } from 'react';
import { formatLocalDate } from '@/lib/flow/date';
import {
  generateObservedSessionNoteFilename,
  generateObservedSessionNoteMarkdown,
  generateObservedSessionRunSheetFilename,
  generateObservedSessionRunSheetMarkdown,
  observedSessionNoteDecisionOptions,
  type ObservedSessionNoteDecision,
  type ObservedSessionNoteDraft,
  type ObservedSessionRunSheetDraft,
} from '@/lib/flow/observed-session-note-intake';

export type ObservedSessionRouteOption = ObservedSessionRunSheetDraft & {
  slug: string;
  title: string;
};

type ObservedSessionNoteIntakeProps = {
  routes: ObservedSessionRouteOption[];
};

function todayIsoDate(): string {
  return formatLocalDate(new Date());
}

export function ObservedSessionNoteIntake({ routes }: ObservedSessionNoteIntakeProps) {
  const firstRoute = routes[0]?.slug ?? '';
  const [draft, setDraft] = useState<ObservedSessionNoteDraft>({
    date: todayIsoDate(),
    observer: '',
    route: firstRoute,
    device: '',
    participantType: '',
    taskRealism: 'realistic simulation',
    sessionNumber: '1',
    decision: 'no signal',
    artifactNearCta: '',
    stickyFallback: '',
    exportCopy: '',
    friction: '',
    followUp: '',
  });
  const [copyState, setCopyState] = useState('');

  const selectedRoute = routes.find((route) => route.slug === draft.route) ?? routes[0];
  const markdown = useMemo(() => generateObservedSessionNoteMarkdown(draft), [draft]);
  const runSheetMarkdown = useMemo(
    () =>
      selectedRoute
        ? generateObservedSessionRunSheetMarkdown(selectedRoute)
        : generateObservedSessionRunSheetMarkdown({
            slug: draft.route,
            title: draft.route,
            sessionGoal: '',
            moderatorPrompt: '',
            expectedArtifacts: [],
            screenshotTargets: [],
            passSignals: [],
            failureSignals: [],
            handoffNote: '',
          }),
    [draft.route, selectedRoute],
  );
  const filename = generateObservedSessionNoteFilename(draft.date, draft.route, draft.sessionNumber);
  const runSheetFilename = generateObservedSessionRunSheetFilename(draft.route);

  function updateDraft<K extends keyof ObservedSessionNoteDraft>(key: K, value: ObservedSessionNoteDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setCopyState('');
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState('Copied markdown');
    } catch {
      setCopyState('Copy failed; use the preview text');
    }
  }

  function downloadMarkdownFile(text: string, downloadFilename: string) {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div data-testid="observed-session-note-intake" className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-800">Session note intake</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-blue-950">
            Draft a portable markdown note after an observed export-first session. Validated is intentionally not an
            intake decision.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800"
            onClick={copyMarkdown}
          >
            Copy note
          </button>
          <button
            type="button"
            className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => downloadMarkdownFile(markdown, filename)}
          >
            Download note
          </button>
          <button
            type="button"
            className="rounded-md bg-blue-950 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => downloadMarkdownFile(runSheetMarkdown, runSheetFilename)}
          >
            Download run sheet
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm font-semibold text-blue-950">
          Route
          <select
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-gray-900"
            value={draft.route}
            onChange={(event) => updateDraft('route', event.currentTarget.value)}
          >
            {routes.map((route) => (
              <option key={route.slug} value={route.slug}>
                {route.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-blue-950">
          Decision
          <select
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-gray-900"
            value={draft.decision}
            onChange={(event) =>
              updateDraft('decision', event.currentTarget.value as ObservedSessionNoteDecision)
            }
          >
            {observedSessionNoteDecisionOptions.map((decision) => (
              <option key={decision} value={decision}>
                {decision}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-blue-950">
          Date
          <input
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-gray-900"
            type="date"
            value={draft.date}
            onChange={(event) => updateDraft('date', event.currentTarget.value)}
          />
        </label>
        <label className="text-sm font-semibold text-blue-950">
          Session number
          <input
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-gray-900"
            min="1"
            type="number"
            value={draft.sessionNumber}
            onChange={(event) => updateDraft('sessionNumber', event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold text-blue-950">
          Artifact-near CTA
          <input
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-gray-900"
            value={draft.artifactNearCta}
            onChange={(event) => updateDraft('artifactNearCta', event.currentTarget.value)}
          />
        </label>
        <label className="text-sm font-semibold text-blue-950">
          Sticky fallback
          <input
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-gray-900"
            value={draft.stickyFallback}
            onChange={(event) => updateDraft('stickyFallback', event.currentTarget.value)}
          />
        </label>
        <label className="text-sm font-semibold text-blue-950">
          Export/copy
          <input
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-gray-900"
            value={draft.exportCopy}
            onChange={(event) => updateDraft('exportCopy', event.currentTarget.value)}
          />
        </label>
        <label className="text-sm font-semibold text-blue-950">
          Observer
          <input
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-gray-900"
            value={draft.observer}
            onChange={(event) => updateDraft('observer', event.currentTarget.value)}
          />
        </label>
        <label className="text-sm font-semibold text-blue-950">
          Device
          <input
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-gray-900"
            value={draft.device}
            onChange={(event) => updateDraft('device', event.currentTarget.value)}
          />
        </label>
        <label className="text-sm font-semibold text-blue-950">
          Participant type
          <input
            className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-gray-900"
            value={draft.participantType}
            onChange={(event) => updateDraft('participantType', event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold text-blue-950">
          Friction
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal leading-6 text-gray-900"
            value={draft.friction}
            onChange={(event) => updateDraft('friction', event.currentTarget.value)}
          />
        </label>
        <label className="text-sm font-semibold text-blue-950">
          Follow-up
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal leading-6 text-gray-900"
            value={draft.followUp}
            onChange={(event) => updateDraft('followUp', event.currentTarget.value)}
          />
        </label>
      </div>

      {copyState ? <p className="mt-3 text-sm font-semibold text-blue-800">{copyState}</p> : null}
      <pre
        data-testid="observed-session-note-preview"
        className="mt-4 max-h-80 overflow-auto rounded-md bg-white p-3 text-xs leading-5 text-gray-800"
      >
        {markdown}
      </pre>
      <pre
        data-testid="observed-session-run-sheet-preview"
        className="mt-3 max-h-80 overflow-auto rounded-md bg-white p-3 text-xs leading-5 text-gray-800"
      >
        {runSheetMarkdown}
      </pre>
    </div>
  );
}
