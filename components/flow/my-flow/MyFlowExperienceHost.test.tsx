import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { P0_CONTRACT_FLOW_BUNDLE } from '@/lib/flow/effective-flow-contract.fixtures';
import { buildEffectiveFlowSnapshot } from '@/lib/flow/effective-flow-snapshot';
import {
  MY_FLOW_CLASSIC_EXPERIENCE,
  MY_FLOW_R3A_LAB_EXPERIENCE,
} from '@/lib/flow/my-flow-experience-variant';
import { buildMyFlowWorkspaceSnapshot } from '@/lib/flow/my-flow-workspace-snapshot';
import { resolvePublicDateIntent } from '@/lib/flow/public-date-intent';

import { MyFlowExperienceHost } from './MyFlowExperienceHost';
import type { MyFlowExperienceNavigationPort } from './MyFlowExperienceContract';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function buildWorkspace(selectedFlowSlug = 'all') {
  const effectiveSnapshot = buildEffectiveFlowSnapshot({
    bundle: P0_CONTRACT_FLOW_BUNDLE,
    effectiveTitle: P0_CONTRACT_FLOW_BUNDLE.flow.title,
    dateIntent: resolvePublicDateIntent({
      anchorType: P0_CONTRACT_FLOW_BUNDLE.flow.anchor_type,
      mode: 'undated',
      customAnchor: '',
      exampleAnchor: '',
    }),
    personalLayerState: 'persisted',
  });
  return buildMyFlowWorkspaceSnapshot({
    flows: [{
      savedFlowSlug: 'personal-copy:r3a',
      effectiveSnapshot,
      done: 1,
      total: effectiveSnapshot.committed.counts.total,
      archived: false,
    }],
    library: {
      query: '',
      filter: 'all',
      selectedFlowSlug,
      viewport: 'wide',
      controls: { search: false, filters: false, mode: 'compact' },
      eligibleFlowSlugs: ['personal-copy:r3a'],
      filteredFlowSlugs: ['personal-copy:r3a'],
      mobileFlowSlugs: ['personal-copy:r3a'],
      hiddenMobileCount: 0,
      mobileInventoryExpanded: false,
    },
  });
}

const intents: MyFlowExperienceNavigationPort = {
  openFlow: () => undefined,
  returnToLibrary: () => undefined,
  replaceLibraryControls: () => undefined,
  showArchived: () => undefined,
  expandMobileInventory: () => undefined,
};

test('classic returns the established surface node without an added wrapper', () => {
  const classic = <div data-testid="classic-surface"><span>classic</span></div>;
  const classicMarkup = renderToStaticMarkup(classic);
  const hostMarkup = renderToStaticMarkup(
    <MyFlowExperienceHost
      variant={MY_FLOW_CLASSIC_EXPERIENCE}
      candidateEligible
      snapshot={buildWorkspace()}
      intents={intents}
      classic={classic}
      renderSelectedFlow={() => null}
    />,
  );

  assert.equal(hostMarkup, classicMarkup);
  assert.doesNotMatch(hostMarkup, /my-flow-r3a-lab-surface/u);
});

test('only an eligible exact R3A request renders the snapshot-driven library', () => {
  const markup = renderToStaticMarkup(
    <MyFlowExperienceHost
      variant={MY_FLOW_R3A_LAB_EXPERIENCE}
      candidateEligible
      snapshot={buildWorkspace()}
      intents={intents}
      classic={<div data-testid="classic-surface" />}
      renderSelectedFlow={() => null}
    />,
  );

  assert.match(markup, /data-testid="my-flow-r3a-lab-surface"/u);
  assert.match(markup, /data-my-flow-experience="r3a-lab"/u);
  assert.match(markup, /data-my-flow-snapshot-version="1"/u);
  assert.match(markup, /data-testid="my-flow-r3a-lab-row"/u);
  assert.match(markup, /data-flow-slug="personal-copy:r3a"/u);
  assert.doesNotMatch(markup, /data-testid="classic-surface"/u);
});

test('the candidate resolves a selected saved identity through the compatibility renderer port', () => {
  const renderedSlugs: string[] = [];
  const markup = renderToStaticMarkup(
    <MyFlowExperienceHost
      variant={MY_FLOW_R3A_LAB_EXPERIENCE}
      candidateEligible
      snapshot={buildWorkspace('personal-copy:r3a')}
      intents={intents}
      classic={<div data-testid="classic-surface" />}
      renderSelectedFlow={(savedFlowSlug) => {
        renderedSlugs.push(savedFlowSlug);
        return <article data-testid="existing-execution-surface" />;
      }}
    />,
  );

  assert.deepEqual(renderedSlugs, ['personal-copy:r3a']);
  assert.match(markup, /data-my-flow-selection="flow"/u);
  assert.match(markup, /data-testid="existing-execution-surface"/u);
  assert.doesNotMatch(markup, /data-testid="my-flow-r3a-lab-library"/u);
});

test('unsafe or degraded candidate states fail closed to classic', () => {
  const classic = <div data-testid="classic-surface" />;
  const degraded = buildMyFlowWorkspaceSnapshot({
    ...buildWorkspace(),
    flows: [],
    library: {
      ...buildWorkspace().library,
      eligibleFlowSlugs: ['missing'],
      filteredFlowSlugs: ['missing'],
      mobileFlowSlugs: ['missing'],
    },
  });
  assert.equal(degraded.integrity.status, 'degraded');

  for (const input of [
    { candidateEligible: false, snapshot: buildWorkspace() },
    { candidateEligible: true, snapshot: degraded },
    { candidateEligible: true, snapshot: null },
  ]) {
    const markup = renderToStaticMarkup(
      <MyFlowExperienceHost
        variant={MY_FLOW_R3A_LAB_EXPERIENCE}
        candidateEligible={input.candidateEligible}
        snapshot={input.snapshot}
        intents={intents}
        classic={classic}
        renderSelectedFlow={() => null}
      />,
    );
    assert.match(markup, /data-testid="classic-surface"/u);
    assert.doesNotMatch(markup, /my-flow-r3a-lab-surface/u);
  }
});
