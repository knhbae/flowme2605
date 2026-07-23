import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(here, 'gold-source-contract-v1.json');
const document = JSON.parse(fs.readFileSync(target, 'utf8'));

const overrides = {
  'GB-01': {
    state: 'needs_confirmation',
    naturalArtifact: 'calendar',
    secondaryArtifacts: ['checklist', 'memo'],
    minimumInputs: [
      { semanticKey: 'birth_date', requiredBeforeFirstPreview: true },
      { semanticKey: 'reporter_context', requiredBeforeFirstPreview: false },
    ],
  },
  'GB-03': {
    state: 'needs_confirmation',
    minimumInputs: [
      { semanticKey: 'maintenance_start_date', requiredBeforeFirstPreview: true },
      { semanticKey: 'product_model_match', requiredBeforeFirstPreview: true },
    ],
  },
  'GB-04': {
    state: 'needs_confirmation',
    minimumInputs: [
      { semanticKey: 'product_model_match', requiredBeforeFirstPreview: true },
    ],
  },
  'GB-06': {
    state: 'needs_confirmation',
    naturalArtifact: 'sheet',
    secondaryArtifacts: ['todo'],
    minimumInputs: [
      { semanticKey: 'reading_language_access', requiredBeforeFirstPreview: false },
    ],
  },
  'GB-07': {
    state: 'needs_confirmation',
    naturalArtifact: 'memo',
    secondaryArtifacts: ['sheet'],
    minimumInputs: [
      { semanticKey: 'backup_priority', requiredBeforeFirstPreview: false },
    ],
  },
  'GB-08': {
    state: 'needs_confirmation',
    naturalArtifact: 'calendar',
    secondaryArtifacts: ['checklist', 'memo'],
    minimumInputs: [
      { semanticKey: 'visit_date', requiredBeforeFirstPreview: true },
      { semanticKey: 'visit_time_slot', requiredBeforeFirstPreview: true },
    ],
  },
  'GB-13': {
    state: 'needs_confirmation',
    naturalArtifact: 'todo',
    secondaryArtifacts: ['checklist', 'memo'],
    minimumInputs: [
      { semanticKey: 'application_route', requiredBeforeFirstPreview: true },
      { semanticKey: 'ic_card_choice', requiredBeforeFirstPreview: false },
    ],
  },
  'GB-14': {
    state: 'needs_confirmation',
  },
  'GB-15': {
    state: 'needs_confirmation',
    secondaryArtifacts: ['calendar', 'memo'],
    minimumInputs: [
      { semanticKey: 'participation_confirmed', requiredBeforeFirstPreview: false },
    ],
  },
  'GB-16': {
    state: 'needs_confirmation',
    secondaryArtifacts: ['calendar'],
    minimumInputs: [
      { semanticKey: 'plan_start_date', requiredBeforeFirstPreview: true },
      { semanticKey: 'brand_context', requiredBeforeFirstPreview: true },
    ],
  },
};

for (const entry of document.cases) {
  if (overrides[entry.caseId]) Object.assign(entry.gold, overrides[entry.caseId]);
}

document.goldReview = {
  reviewedAt: new Date().toISOString(),
  reviewerRole: 'parent source-contract adjudicator',
  rule: 'The gold contract may use only the frozen source packet and baseline product rules.',
  changedCaseIds: Object.keys(overrides),
  rationale: 'Corrected source-owned versus user-owned values and chose the retained artifact that best supports resuming the job.',
  independenceRisk: 'This correction was recorded after the low-cost calibration file existed; it was based on pre-existing product rules, but temporal contamination cannot be ruled out.',
  mitigation: 'Obtain an independent source-only gold review before opening final-holdout results and preserve disagreements.',
};

fs.writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`refined ${Object.keys(overrides).length} gold cases before run adjudication`);
