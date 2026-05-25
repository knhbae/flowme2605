import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getMobileSimulationProtocol,
  summarizeMobileSimulationProtocols,
} from './mobile-simulation-protocol';
import { seedBundles } from './seed-flows';

test('mobile simulation protocol covers the three current candidate routes without validation claims', () => {
  const summary = summarizeMobileSimulationProtocols(seedBundles);

  assert.equal(summary.totalCount, 3);
  assert.deepEqual(summary.slugs, [
    'computer-skills-d30-study',
    'diet-habit-2week',
    'new-car-delivery-check',
  ]);
  assert.equal(summary.validatedCount, 0);
  assert.ok(summary.averageScore > 0);
  assert.ok(summary.records.every((record) => record.statusAfterSimulation.includes('not validated')));
});

test('mobile simulation protocol records tasks, evidence, failure signals, and next action', () => {
  const study = getMobileSimulationProtocol('computer-skills-d30-study');
  const diet = getMobileSimulationProtocol('diet-habit-2week');
  const newCar = getMobileSimulationProtocol('new-car-delivery-check');

  assert.ok(study);
  assert.ok(study.taskScript.some((step) => step.includes('export')));
  assert.ok(study.passSignals.some((signal) => signal.includes('calendar')));
  assert.ok(study.failureSignals.some((signal) => signal.includes('prefilled')));
  assert.equal(study.simulationScore, 82);

  assert.ok(diet);
  assert.ok(diet.taskScript.some((step) => step.includes('stop/consult')));
  assert.ok(diet.failureSignals.some((signal) => signal.includes('prescription')));
  assert.ok(diet.nextAction.includes('mobile'));
  assert.equal(diet.simulationScore, 74);

  assert.ok(newCar);
  assert.ok(newCar.taskScript.some((step) => step.includes('dealer confirmation')));
  assert.ok(newCar.passSignals.some((signal) => signal.includes('evidence table')));
  assert.ok(newCar.failureSignals.some((signal) => signal.includes('checklist completion')));
  assert.equal(newCar.simulationScore, 76);
});
