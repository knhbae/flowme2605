import assert from 'node:assert/strict';
import test from 'node:test';

import { isPersonalWorkspacePocQuery } from './personal-workspace-poc-gate';

test('accepts only the scalar exact PoC query', () => {
  assert.equal(isPersonalWorkspacePocQuery({ personalWorkspacePoc: 'v1' }), true);
  assert.equal(isPersonalWorkspacePocQuery({}), false);
  assert.equal(isPersonalWorkspacePocQuery({ personalWorkspacePoc: 'V1' }), false);
  assert.equal(isPersonalWorkspacePocQuery({ personalWorkspacePoc: ['v1', 'v1'] }), false);
  assert.equal(isPersonalWorkspacePocQuery({ personalWorkspacePoc: 'v1', view: 'today' }), false);
  assert.equal(isPersonalWorkspacePocQuery({ personalWorkspacePoc: undefined }), false);
});
