import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isP35CapabilityResultEnabled,
  isP35EditorTransactionEnabled,
  isP35PublicSaveLifecycleEnabled,
  isP35Q3CopyEnabled,
  isP35QuickLocalResultEnabled,
  isP35SavedPlanLibraryEnabled,
  isP35SavedTransferEnabled,
  isP35VisualSubtractionEnabled,
} from './p35-round2-flags';

test('P35 public save lifecycle is on by default and has one independent rollback flag', () => {
  assert.equal(isP35PublicSaveLifecycleEnabled(''), true);
  assert.equal(isP35PublicSaveLifecycleEnabled('?experiment=off'), true);
  assert.equal(isP35PublicSaveLifecycleEnabled('?saveLifecycle=off'), false);
  assert.equal(isP35PublicSaveLifecycleEnabled('?saveLifecycle=OFF'), true);
});

test('P35 editor transaction is on by default and independently rolls back to legacy handlers', () => {
  assert.equal(isP35EditorTransactionEnabled(''), true);
  assert.equal(isP35EditorTransactionEnabled('?experiment=off'), true);
  assert.equal(isP35EditorTransactionEnabled('?editorTransaction=off'), false);
  assert.equal(isP35EditorTransactionEnabled('?editorTransaction=OFF'), true);
  assert.equal(isP35EditorTransactionEnabled('?saveLifecycle=off'), true);
  assert.equal(
    isP35EditorTransactionEnabled('?saveLifecycle=off&editorTransaction=off'),
    false,
  );
  assert.equal(
    isP35PublicSaveLifecycleEnabled('?saveLifecycle=off&editorTransaction=off'),
    false,
  );
});

test('P35 capability result is on by default and has one independent rollback flag', () => {
  assert.equal(isP35CapabilityResultEnabled(''), true);
  assert.equal(isP35CapabilityResultEnabled('?experiment=off'), true);
  assert.equal(isP35CapabilityResultEnabled('?capabilityResult=off'), false);
  assert.equal(isP35CapabilityResultEnabled('capabilityResult=off'), false);
  assert.equal(isP35CapabilityResultEnabled('?capabilityResult=OFF'), true);
  assert.equal(isP35CapabilityResultEnabled('?quickLocalResult=on'), true);
});

test('P35 quick local result is on by default and only an exact rollback disables it', () => {
  assert.equal(isP35QuickLocalResultEnabled(''), true);
  assert.equal(isP35QuickLocalResultEnabled('?experiment=on'), true);
  assert.equal(isP35QuickLocalResultEnabled('?quickLocalResult=on'), true);
  assert.equal(isP35QuickLocalResultEnabled('quickLocalResult=on'), true);
  assert.equal(isP35QuickLocalResultEnabled('?quickLocalResult=ON'), true);
  assert.equal(isP35QuickLocalResultEnabled('?quickLocalResult=off'), false);
  assert.equal(isP35QuickLocalResultEnabled('?quickLocalResult=OFF'), true);
  assert.equal(isP35QuickLocalResultEnabled('?capabilityResult=off'), true);
  assert.equal(
    isP35QuickLocalResultEnabled('?capabilityResult=off&quickLocalResult=on'),
    true,
  );
  assert.equal(
    isP35CapabilityResultEnabled('?capabilityResult=off&quickLocalResult=on'),
    false,
  );
});

test('P35 saved transfer is default-on and independently rolls back to the legacy direct export', () => {
  assert.equal(isP35SavedTransferEnabled(''), true);
  assert.equal(isP35SavedTransferEnabled('?savedTransfer=off'), false);
  assert.equal(isP35SavedTransferEnabled('?savedTransfer=OFF'), true);
  assert.equal(isP35SavedTransferEnabled('?quickLocalResult=off'), true);
  assert.equal(
    isP35SavedTransferEnabled('?savedTransfer=off&quickLocalResult=off'),
    false,
  );
  assert.equal(
    isP35QuickLocalResultEnabled('?savedTransfer=off&quickLocalResult=off'),
    false,
  );
});

test('P35 saved-plan library is default-on and independent from the prior Todo experiment', () => {
  assert.equal(isP35SavedPlanLibraryEnabled(''), true);
  assert.equal(isP35SavedPlanLibraryEnabled('?experiment=off'), true);
  assert.equal(isP35SavedPlanLibraryEnabled('?experiment=todo'), true);
  assert.equal(isP35SavedPlanLibraryEnabled('?savedPlanLibrary=off'), false);
  assert.equal(isP35SavedPlanLibraryEnabled('savedPlanLibrary=off'), false);
  assert.equal(isP35SavedPlanLibraryEnabled('?savedPlanLibrary=OFF'), true);
  assert.equal(isP35SavedPlanLibraryEnabled('?capabilityResult=off'), true);
  assert.equal(
    isP35SavedPlanLibraryEnabled('?savedPlanLibrary=off&capabilityResult=off'),
    false,
  );
  assert.equal(
    isP35CapabilityResultEnabled('?savedPlanLibrary=off&capabilityResult=off'),
    false,
  );
});

test('P1 visual subtraction is default-on and has an exact independent rollback', () => {
  assert.equal(isP35VisualSubtractionEnabled(''), true);
  assert.equal(isP35VisualSubtractionEnabled('?visualSubtraction=off'), false);
  assert.equal(isP35VisualSubtractionEnabled('visualSubtraction=off'), false);
  assert.equal(isP35VisualSubtractionEnabled('?visualSubtraction=OFF'), true);
  assert.equal(isP35VisualSubtractionEnabled('?savedPlanLibrary=off'), true);
  assert.equal(isP35SavedPlanLibraryEnabled('?visualSubtraction=off'), true);
});

test('P1 Q3 user copy is default-on and only exact lowercase q3Copy=off rolls it back', () => {
  assert.equal(isP35Q3CopyEnabled(''), true);
  assert.equal(isP35Q3CopyEnabled('?experiment=off'), true);
  assert.equal(isP35Q3CopyEnabled('?q3Copy=on'), true);
  assert.equal(isP35Q3CopyEnabled('q3Copy=off'), false);
  assert.equal(isP35Q3CopyEnabled('?q3Copy=off'), false);
  assert.equal(isP35Q3CopyEnabled('?q3Copy=OFF'), true);
  assert.equal(isP35Q3CopyEnabled('?Q3Copy=off'), true);
  assert.equal(isP35Q3CopyEnabled('?visualSubtraction=off'), true);
  for (const readPriorFlag of [
    isP35PublicSaveLifecycleEnabled,
    isP35EditorTransactionEnabled,
    isP35CapabilityResultEnabled,
    isP35QuickLocalResultEnabled,
    isP35SavedTransferEnabled,
    isP35SavedPlanLibraryEnabled,
    isP35VisualSubtractionEnabled,
  ]) {
    assert.equal(readPriorFlag('?q3Copy=off'), true);
  }
  assert.equal(
    isP35Q3CopyEnabled(
      '?saveLifecycle=off&editorTransaction=off&capabilityResult=off&quickLocalResult=off&savedTransfer=off&savedPlanLibrary=off&visualSubtraction=off',
    ),
    true,
  );
  assert.equal(
    isP35Q3CopyEnabled('?visualSubtraction=off&q3Copy=off'),
    false,
  );
  assert.equal(
    isP35VisualSubtractionEnabled('?visualSubtraction=off&q3Copy=off'),
    false,
  );
});

test('Q1 result paths and Q2 saved-plan library keep an exact independent rollback matrix', () => {
  const flags = [
    {
      key: 'quickLocalResult',
      read: isP35QuickLocalResultEnabled,
    },
    {
      key: 'savedTransfer',
      read: isP35SavedTransferEnabled,
    },
    {
      key: 'savedPlanLibrary',
      read: isP35SavedPlanLibraryEnabled,
    },
  ] as const;

  for (const owner of flags) {
    const exactOff = `?${owner.key}=off`;
    const uppercaseOff = `?${owner.key}=OFF`;

    for (const candidate of flags) {
      assert.equal(
        candidate.read(exactOff),
        candidate.key !== owner.key,
        `${owner.key}=off must only disable ${owner.key}`,
      );
      assert.equal(
        candidate.read(uppercaseOff),
        true,
        `${owner.key}=OFF must not disable any bounded slice`,
      );
    }
  }

  assert.deepEqual(
    flags.map(({ read }) =>
      read('?quickLocalResult=off&savedTransfer=off&savedPlanLibrary=off'),
    ),
    [false, false, false],
  );
});
