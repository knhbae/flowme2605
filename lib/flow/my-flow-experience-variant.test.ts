import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  MY_FLOW_CLASSIC_EXPERIENCE,
  MY_FLOW_R3A_LAB_EXPERIENCE,
  resolveMyFlowExperienceVariant,
} from './my-flow-experience-variant';

test('My Flow experience defaults to classic for missing, unrelated, and invalid selectors', () => {
  for (const search of [
    '',
    '?view=flows',
    '?myFlowExperience=',
    '?myFlowExperience=classic',
    '?myFlowExperience=R3A-LAB',
    '?myFlowExperience=r3a-lab ',
    '?myflowexperience=r3a-lab',
    '?experience=r3a-lab',
    '?myFlowExperience=unknown',
  ]) {
    assert.equal(
      resolveMyFlowExperienceVariant(search),
      MY_FLOW_CLASSIC_EXPERIENCE,
      `${search || '(empty search)'} must resolve to classic`,
    );
  }
});

test('only the exact r3a-lab selector activates the R3A lab experience', () => {
  assert.equal(
    resolveMyFlowExperienceVariant('?myFlowExperience=r3a-lab'),
    MY_FLOW_R3A_LAB_EXPERIENCE,
  );
  assert.equal(
    resolveMyFlowExperienceVariant('myFlowExperience=r3a-lab'),
    MY_FLOW_R3A_LAB_EXPERIENCE,
  );
  assert.equal(
    resolveMyFlowExperienceVariant('?view=flows&myFlowExperience=r3a-lab&flow=moving-d30-basic'),
    MY_FLOW_R3A_LAB_EXPERIENCE,
  );
});

test('My Flow experience selection is a pure query parser with no persistence or DOM dependency', () => {
  const source = readFileSync(
    new URL('./my-flow-experience-variant.ts', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /^\s*import\s/mu);
  for (const forbidden of [
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bStorage\b/u,
    /\bwindow\b/u,
    /\bdocument\b/u,
    /\bReact\b/u,
    /AppClient/u,
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
});
