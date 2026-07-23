import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  calculateSplitHash,
  ContractValidationError,
  validateBenchmarkDocuments,
  validateManifest,
  validateRunEnvelope,
} from './validate-generalization-v1.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const schema = readJson(path.join(here, 'benchmark-envelope-v1.schema.json'));
const mutationDocument = readJson(path.join(here, 'fixtures', 'invalid', 'mutations-v1.json'));
const clone = (value) => structuredClone(value);
const H = {
  baseline: 'a'.repeat(64),
  revised: 'b'.repeat(64),
  prompt: 'c'.repeat(64),
};

function makeManifest() {
  const cases = Array.from({ length: 18 }, (_, index) => ({
    caseId: `SYN-${String(index + 1).padStart(2, '0')}`,
    split: index < 12 ? 'calibration' : 'final_holdout',
  }));
  return {
    documentType: 'flow_content_generalization_source_manifest_v1',
    cases,
    sealMetadata: {
      algorithm: 'sha256',
      sealedAt: '2026-07-21T00:00:00.000Z',
      splitHash: calculateSplitHash(cases),
      baselineRulesHash: H.baseline,
      revisedRulesHash: H.revised,
      finalHoldoutRulesHash: H.revised,
    },
  };
}

function makeRun(caseEntry, role, splitHash) {
  const rowId = `${caseEntry.caseId}-R01`;
  return {
    schemaVersion: 'flow-content-generalization-run-v1',
    caseId: caseEntry.caseId,
    benchmarkTrace: {
      split: caseEntry.split,
      rulesHash: caseEntry.split === 'final_holdout' ? H.revised : H.baseline,
      promptHash: H.prompt,
      sealedSplitHash: splitHash,
    },
    processor: {
      role,
      modelOrAgent: `synthetic-${role}`,
      actualProviderApiUsed: false,
      measuredInputTokens: null,
      measuredOutputTokens: null,
      elapsedMs: 1,
      retryCount: 0,
      humanInterventionCount: 0,
    },
    sourceAssessment: {
      completeness: 'complete',
      acquiredRowIds: [rowId],
      missingBoundary: [],
      sourceValueSemanticKeys: ['sourceDeadline'],
    },
    feasibility: {
      flowPossible: true,
      executableAllowed: true,
      state: 'ready',
      reason: 'The synthetic source packet contains one complete executable row.',
      blockers: [],
    },
    classification: {
      primaryLifeArea: 'synthetic',
      secondaryLifeAreas: [],
      topicTags: ['fixture'],
      sourceShape: 'procedure',
      primaryExecutionPattern: 'one_shot',
      primaryArtifact: 'todo',
      secondaryArtifacts: [],
    },
    sourceRowAssignments: [{
      sourceRowId: rowId,
      role: 'item',
      reason: 'The row is an observable source-backed action.',
    }],
    canonical: {
      title: 'Synthetic Flow',
      items: [{
        itemId: `${caseEntry.caseId}-I01`,
        intent: 'action',
        title: 'Complete the source-backed action',
        detail: 'Use only the acquired source row.',
        completion: 'The named source-backed action is complete.',
        schedule: null,
        location: null,
        fields: [],
        conditions: [],
        sourceRefs: [rowId],
      }],
      fields: [],
      memos: [],
      references: [],
      conditionalResponses: [],
    },
    minimumInputs: [],
    projections: {
      calendar: { availability: 'not_applicable', payload: null, losses: [] },
      checklist: { availability: 'not_applicable', payload: null, losses: [] },
      todo: { availability: 'primary', payload: { tasks: [{ title: 'Complete the source-backed action' }] }, losses: [] },
      sheet: { availability: 'not_applicable', payload: null, losses: [] },
      memo: { availability: 'not_applicable', payload: null, losses: [] },
      ics: { eventCount: 0, actionVisible: false },
    },
    gates: {
      access: 'open',
      rights: 'link_only',
      freshness: 'passed',
      locale: 'applicable',
      safety: 'not_required',
      privacy: 'not_required',
      publicExportAllowed: false,
      personalPreviewAllowed: true,
    },
    selfReview: {
      uncertainties: [],
      omissions: [],
      potentialInventions: [],
      sourceValueReentryCount: 0,
      unscheduledIcsViolationCount: 0,
    },
  };
}

function makePortfolio() {
  const manifest = makeManifest();
  const gold = {
    documentType: 'flow_content_generalization_gold_source_contract_v1',
    cases: manifest.cases.map((entry) => ({
      caseId: entry.caseId,
      sourceRows: [{ sourceRowId: `${entry.caseId}-R01`, meaning: 'Synthetic source row.' }],
    })),
  };
  const runs = manifest.cases.flatMap((entry) => (
    ['rules', 'low_cost', 'high_capability'].map((role) => makeRun(entry, role, manifest.sealMetadata.splitHash))
  ));
  return { manifest, gold, runs };
}

function errorCodes(operation) {
  try {
    operation();
    assert.fail('Expected validation to fail.');
  } catch (error) {
    assert.equal(error instanceof ContractValidationError, true, error.stack);
    return (error.errors || []).map((entry) => entry.code).filter(Boolean);
  }
}

function addInput(run, index, semanticKey = `userValue${index}`) {
  run.minimumInputs.push({
    inputId: `input-${index}`,
    owner: 'user',
    semanticKey,
    requiredBeforeFirstPreview: true,
    reason: 'Synthetic consumer-owned personalization.',
    consumerRefs: [run.canonical.items[0].itemId],
  });
}

function mutateRun(run, mutationId) {
  switch (mutationId) {
    case 'partial-with-items':
      run.sourceAssessment.completeness = 'partial';
      run.feasibility = {
        flowPossible: false,
        executableAllowed: false,
        state: 'source_import_required',
        reason: 'Rows are incomplete.',
        blockers: ['source_import_required'],
      };
      run.classification.primaryArtifact = null;
      run.projections.todo = { availability: 'blocked', payload: null, losses: [] };
      run.gates.personalPreviewAllowed = false;
      break;
    case 'duplicate-row-assignment':
      run.sourceRowAssignments.push(clone(run.sourceRowAssignments[0]));
      break;
    case 'missing-item-provenance':
      run.canonical.items[0].sourceRefs = [];
      break;
    case 'primary-secondary-duplicate':
      run.classification.secondaryArtifacts = ['todo'];
      break;
    case 'hybrid-primary':
      run.classification.primaryArtifact = 'hybrid';
      break;
    case 'blocked-projection-payload':
      run.projections.memo = { availability: 'blocked', payload: { text: 'must not exist' }, losses: [] };
      break;
    case 'unscheduled-ics':
      run.projections.ics = { eventCount: 1, actionVisible: true };
      run.selfReview.unscheduledIcsViolationCount = 1;
      break;
    case 'user-input-over-budget':
      addInput(run, 1);
      addInput(run, 2);
      addInput(run, 3);
      break;
    case 'source-value-reentry':
      addInput(run, 1, 'sourceDeadline');
      run.selfReview.sourceValueReentryCount = 1;
      break;
    case 'missing-privacy-gate':
      delete run.gates.privacy;
      break;
    default:
      throw new Error(`Unsupported run mutation: ${mutationId}`);
  }
}

test('synthetic complete run passes schema and source-neutral invariants', () => {
  const portfolio = makePortfolio();
  const run = portfolio.runs[0];
  const result = validateRunEnvelope(run, {
    schema,
    manifestCase: portfolio.manifest.cases[0],
    sealMetadata: portfolio.manifest.sealMetadata,
    goldCase: portfolio.gold.cases[0],
  });
  assert.deepEqual(result, {
    caseId: 'SYN-01',
    role: 'rules',
    acquiredRowCount: 1,
    assignmentCount: 1,
    itemCount: 1,
    requiredUserInputCount: 0,
  });
});

test('synthetic 18-case, 12+6, three-role portfolio passes split and holdout seals', () => {
  const result = validateBenchmarkDocuments({ ...makePortfolio(), schema });
  assert.equal(result.caseCount, 18);
  assert.equal(result.runCount, 54);
  assert.equal(result.calibrationCount, 12);
  assert.equal(result.finalHoldoutCount, 6);
});

for (const mutation of mutationDocument.mutations) {
  test(`rejects ${mutation.mutationId}`, () => {
    const portfolio = makePortfolio();
    let codes;
    if (mutation.scope === 'run') {
      const run = clone(portfolio.runs[0]);
      mutateRun(run, mutation.mutationId);
      codes = errorCodes(() => validateRunEnvelope(run, { schema }));
    } else if (mutation.mutationId === 'portfolio-case-count') {
      portfolio.manifest.cases.pop();
      codes = errorCodes(() => validateManifest(portfolio.manifest));
    } else if (mutation.mutationId === 'portfolio-split-count') {
      portfolio.manifest.cases[12].split = 'calibration';
      codes = errorCodes(() => validateManifest(portfolio.manifest));
    } else if (mutation.mutationId === 'split-seal-drift') {
      portfolio.manifest.cases[0].caseId = 'SYN-DRIFT';
      codes = errorCodes(() => validateManifest(portfolio.manifest));
    } else if (mutation.mutationId === 'holdout-rules-drift') {
      const holdoutRun = portfolio.runs.find((run) => run.benchmarkTrace.split === 'final_holdout');
      holdoutRun.benchmarkTrace.rulesHash = H.baseline;
      codes = errorCodes(() => validateBenchmarkDocuments({ ...portfolio, schema }));
    } else {
      assert.fail(`Unhandled mutation ${mutation.mutationId}`);
    }
    assert.equal(codes.includes(mutation.expectedCode), true, `Expected ${mutation.expectedCode}; received ${codes.join(', ')}`);
  });
}
