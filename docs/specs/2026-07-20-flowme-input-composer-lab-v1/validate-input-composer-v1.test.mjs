import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateInputComposer } from './validate-input-composer-v1.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const base = JSON.parse(fs.readFileSync(path.join(here, 'input-composer-scenarios-v1.json'), 'utf8'));
const mutationSpec = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/invalid/mutations-v1.json'), 'utf8'));

test('valid 8-case contract passes', () => {
  assert.deepEqual(validateInputComposer(structuredClone(base)), []);
});

const mutations = {
  'required-budget': (doc) => {
    const c = doc.cases[0];
    c.inputJourney.inputs.push({ ...structuredClone(c.inputJourney.inputs[1]), inputId: 'moving-time', semanticKey: 'time_anchor', purpose: 'calendar_time', writePath: '/userOverlay/setup/movingTime' });
    c.inputJourney.requiredPayloadCount = 3;
  },
  'unnecessary-input': (doc) => { doc.cases[0].inputJourney.inputs[0].consumerRefs = []; },
  'source-reentry': (doc) => { doc.cases[1].inputJourney.inputs[0].semanticKey = 'source_rows'; },
  'owner-boundary': (doc) => { doc.cases[0].inputJourney.inputs[1].writePath = '/creatorDraft/movingDate'; },
  'hidden-input': (doc) => { doc.cases[0].inputJourney.progressiveDisclosure = []; },
  'invented-action': (doc) => { doc.cases[0].canonical.items[0].title = 'AI가 더한 행동'; },
  'semantic-loss': (doc) => { doc.cases[1].canonical.items[0].sourceRefs = []; },
  'unscheduled-ics': (doc) => {
    doc.cases[1].projections.ics = { ...doc.cases[0].projections.ics, eventCount: 1, preview: { kind: 'ics_preview', events: [{}] } };
  },
  'blocked-artifact': (doc) => { doc.cases[6].projections.memo.preview = { title: '가짜 결과' }; },
  'route-coverage': (doc) => { for (const c of doc.cases) if (c.inputRoute === 'quick_line') c.inputRoute = 'url_confirm'; },
  'internal-token': (doc) => { doc.__htmlText = '<main><p>primaryArtifact</p></main>'; }
};

for (const spec of mutationSpec.mutations) {
  test(`invalid mutation ${spec.id} is rejected`, () => {
    const doc = structuredClone(base);
    mutations[spec.id](doc);
    const errors = validateInputComposer(doc, spec.id === 'internal-token' ? { htmlText: doc.__htmlText } : {});
    assert.ok(errors.some((error) => error.code === spec.expectedCode), `${spec.id}: ${errors.map((error) => error.code).join(', ')}`);
  });
}
