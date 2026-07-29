import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runValidation,
  validateNoFalseYearlyRrule,
  validatePacingExperiment,
  validateProjectionCell,
} from './validate-v1.mjs';

test('complete lab artifacts pass validation', () => {
  const result = runValidation({ writeResults: false });
  assert.equal(result.pass, true);
});

test('unknown recommendation is rejected', () => {
  const errors = validateProjectionCell({
    projection: 'todo',
    recommendation: 'sometimes',
    availability: 'available_now',
    fidelity: 'bounded_loss',
    generated: false,
    recordCount: 0,
    minimumUserInputs: [],
    destinationCapabilityNeeded: [],
    lossManifest: [],
    prohibitionReason: null,
  });
  assert.ok(errors.some((error) => error.includes('recommendation')));
});

test('prohibited projection cannot emit records', () => {
  const errors = validateProjectionCell({
    projection: 'calendar',
    recommendation: 'not_recommended',
    availability: 'unavailable',
    fidelity: 'misleading_or_prohibited',
    generated: true,
    recordCount: 1,
    minimumUserInputs: [],
    destinationCapabilityNeeded: ['VEVENT'],
    lossManifest: [],
    prohibitionReason: 'undated',
  });
  assert.ok(errors.some((error) => error.includes('prohibited')));
});

test('Checklist cannot reuse Todo tasks schema', () => {
  const cell = {
    projection: 'checklist',
    recommendation: 'primary',
    availability: 'available_now',
    fidelity: 'lossless_or_low_loss',
    generated: true,
    recordCount: 1,
    minimumUserInputs: [],
    destinationCapabilityNeeded: [],
    lossManifest: [],
    prohibitionReason: null,
  };
  const errors = validateProjectionCell(cell, {
    generated: true,
    output: { tasks: [] },
  });
  assert.ok(errors.some((error) => error.includes('Checklist')));
});

test('duplicate pacing assignment is rejected', () => {
  const errors = validatePacingExperiment({
    targetItemCount: 2,
    assignments: [
      {
        assignmentId: 'a',
        itemId: 'same',
        scheduleOwner: 'user_overlay',
        derivation: 'pacing_policy',
        suggestionStatus: 'confirmed',
      },
      {
        assignmentId: 'b',
        itemId: 'same',
        scheduleOwner: 'user_overlay',
        derivation: 'pacing_policy',
        suggestionStatus: 'confirmed',
      },
    ],
    checks: {
      missingItemIds: [],
      dependencyViolations: [],
      sourceOrderViolations: 0,
      deterministic: true,
    },
  });
  assert.ok(errors.some((error) => error.includes('duplicate')));
});

test('annual edition cannot carry false yearly recurrence', () => {
  const errors = validateNoFalseYearlyRrule({
    fixtures: [
      {
        fixtureId: 'bad',
        eventModel: {
          recurrencePolicy: 'edition_occurrences_not_yearly_rrule',
          recurrenceRule: 'FREQ=YEARLY',
        },
      },
    ],
  });
  assert.equal(errors.length, 1);
});
