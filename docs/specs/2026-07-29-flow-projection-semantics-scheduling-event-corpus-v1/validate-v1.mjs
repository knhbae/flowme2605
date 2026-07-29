import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const readJson = (name) =>
  JSON.parse(fs.readFileSync(path.join(here, name), 'utf8'));

const projectionNames = [
  'calendar',
  'checklist',
  'todo',
  'sheet',
  'memo',
];
const validRecommendation = new Set([
  'primary',
  'secondary',
  'optional',
  'not_recommended',
]);
const validAvailability = new Set([
  'available_now',
  'available_after_user_overlay',
  'unavailable',
]);
const validFidelity = new Set([
  'lossless_or_low_loss',
  'bounded_loss',
  'misleading_or_prohibited',
]);

export function validateProjectionCell(cell, resultCell = null) {
  const errors = [];
  if (!validRecommendation.has(cell.recommendation)) {
    errors.push(`invalid recommendation ${cell.recommendation}`);
  }
  if (!validAvailability.has(cell.availability)) {
    errors.push(`invalid availability ${cell.availability}`);
  }
  if (!validFidelity.has(cell.fidelity)) {
    errors.push(`invalid fidelity ${cell.fidelity}`);
  }
  if (!projectionNames.includes(cell.projection)) {
    errors.push(`invalid projection ${cell.projection}`);
  }
  for (const key of [
    'minimumUserInputs',
    'destinationCapabilityNeeded',
    'lossManifest',
  ]) {
    if (!Array.isArray(cell[key])) errors.push(`${key} must be an array`);
  }
  if (
    cell.generated &&
    (cell.availability !== 'available_now' ||
      cell.fidelity === 'misleading_or_prohibited' ||
      cell.recordCount < 1)
  ) {
    errors.push('generated cell violates eligibility state');
  }
  if (
    cell.fidelity === 'misleading_or_prohibited' &&
    cell.generated
  ) {
    errors.push('prohibited cell generated records');
  }
  if (cell.availability === 'unavailable' && !cell.prohibitionReason) {
    errors.push('unavailable cell needs prohibitionReason');
  }
  if (resultCell?.generated && !resultCell.output) {
    errors.push('generated result lacks output');
  }
  if (!resultCell?.generated && resultCell?.output) {
    errors.push('non-generated result leaks output');
  }
  if (resultCell?.output) {
    if (
      cell.projection === 'checklist' &&
      (!Array.isArray(resultCell.output.groups) ||
        'tasks' in resultCell.output)
    ) {
      errors.push('Checklist output must use groups, never tasks');
    }
    if (
      cell.projection === 'todo' &&
      (!Array.isArray(resultCell.output.tasks) ||
        'groups' in resultCell.output)
    ) {
      errors.push('Todo output must use tasks, never groups');
    }
    if (
      cell.projection === 'memo' &&
      resultCell.output.canonicalRawData !== false
    ) {
      errors.push('Memo must declare canonicalRawData=false');
    }
  }
  return errors;
}

export function validatePacingExperiment(experiment) {
  const errors = [];
  const itemIds = experiment.assignments.map((entry) => entry.itemId);
  if (new Set(itemIds).size !== itemIds.length) {
    errors.push('duplicate pacing Item');
  }
  if (itemIds.length !== experiment.targetItemCount) {
    errors.push('pacing target count mismatch');
  }
  if (experiment.checks.missingItemIds.length) {
    errors.push('missing pacing Item');
  }
  if (experiment.checks.dependencyViolations.length) {
    errors.push('dependency order violation');
  }
  if (experiment.checks.sourceOrderViolations) {
    errors.push('source order violation');
  }
  if (!experiment.checks.deterministic) {
    errors.push('pacing is not deterministic');
  }
  for (const assignment of experiment.assignments) {
    if (
      assignment.scheduleOwner !== 'user_overlay' ||
      assignment.derivation !== 'pacing_policy' ||
      assignment.suggestionStatus !== 'confirmed'
    ) {
      errors.push(`invalid pacing provenance ${assignment.assignmentId}`);
    }
  }
  return errors;
}

export function validateNoFalseYearlyRrule(eventCorpus) {
  return eventCorpus.fixtures.flatMap((fixture) => {
    if (
      fixture.eventModel?.recurrencePolicy ===
        'edition_occurrences_not_yearly_rrule' &&
      fixture.eventModel.recurrenceRule?.includes('FREQ=YEARLY')
    ) {
      return [`${fixture.fixtureId} has a false yearly RRULE`];
    }
    return [];
  });
}

export function runValidation({ writeResults = true } = {}) {
  const baseline = JSON.parse(
    fs.readFileSync(
      path.resolve(
        here,
        '../2026-07-28-flow-canonical-structure-corpus-expansion-v1/canonical-corpus-v1.json',
      ),
      'utf8',
    ),
  );
  const matrix = readJson('projection-eligibility-matrix-v1.json');
  const results = readJson('all-format-projection-results-v1.json');
  const eventCorpus = readJson('event-schedule-corpus-v1.json');
  const pacing = readJson('user-pacing-schedule-contract-v1.json');
  const grouping = readJson('calendar-grouping-results-v1.json');
  const dtos = readJson('representative-projection-backend-dto-v1.json');
  const mapping = readJson('icalendar-component-mapping-v2.json');
  const classification = readJson('classification-comparison-v1.json');
  const lineage = readJson('input-lineage-v1.json');
  const semantics = readJson('artifact-semantics-v2.json');
  const runtimeGaps = readJson('runtime-gap-crosswalk-v2.json');
  const browserQa = readJson('browser-qa-v1.json');
  const checks = [];

  const check = (id, pass, evidence) => {
    checks.push({ id, pass: Boolean(pass), evidence });
  };

  check(
    'baseline-counts-frozen',
    baseline.counts.completeFixtures === 42 &&
      baseline.counts.items === 406 &&
      baseline.counts.sourceRows === 484,
    baseline.counts,
  );
  check(
    'baseline-lineage-frozen',
    lineage.baseline.frozen === true &&
      lineage.baseline.counts.completeFixtures === 42 &&
      lineage.baseline.hash.startsWith('sha256:'),
    lineage.baseline,
  );
  const baselineSourceRowIds = new Set(
    baseline.fixtures.flatMap((fixture) =>
      fixture.canonicalContent.sourceRows.map((row) => row.sourceRowId),
    ),
  );
  const baselineReferencedRowIds = new Set(
    baseline.fixtures.flatMap((fixture) =>
      fixture.canonicalContent.sourceRefs.flatMap(
        (sourceRef) => sourceRef.sourceRowIds ?? [],
      ),
    ),
  );
  const baselineUnreferencedRows = [...baselineSourceRowIds].filter(
    (sourceRowId) => !baselineReferencedRowIds.has(sourceRowId),
  );
  check(
    'baseline-source-row-reference-integrity',
    baselineSourceRowIds.size === 484 &&
      baselineUnreferencedRows.length === 0,
    {
      sourceRows: baselineSourceRowIds.size,
      referencedRows: baselineReferencedRowIds.size,
      unreferenced: baselineUnreferencedRows,
    },
  );

  const baselineUrls = new Set(
    baseline.fixtures.map(
      (fixture) => fixture.source.canonicalUrl ?? fixture.source.url,
    ),
  );
  const newUrls = eventCorpus.fixtures.map((fixture) => fixture.canonicalUrl);
  check(
    'new-fixture-count',
    eventCorpus.counts.totalNewFixtures >= 18,
    eventCorpus.counts,
  );
  check(
    'event-native-count',
    eventCorpus.counts.eventNative >= 12,
    eventCorpus.counts,
  );
  check(
    'new-url-count-and-uniqueness',
    new Set(newUrls).size >= 12 &&
      new Set(newUrls).size === newUrls.length &&
      newUrls.every((url) => !baselineUrls.has(url)),
    {
      unique: new Set(newUrls).size,
      baselineDuplicates: newUrls.filter((url) => baselineUrls.has(url)),
    },
  );
  check(
    'direct-source-evidence',
    eventCorpus.fixtures.every(
      (fixture) =>
        fixture.evidenceMethod === 'direct_page_inspection' &&
        fixture.accessStatus === 'public_html_open' &&
        fixture.observedAt === '2026-07-29' &&
        fixture.sourceRows.length > 0,
    ),
    {
      directCount: eventCorpus.fixtures.filter(
        (fixture) =>
          fixture.evidenceMethod === 'direct_page_inspection' &&
          fixture.sourceRows.length,
      ).length,
    },
  );
  const newFixtureReferenceErrors = eventCorpus.fixtures.flatMap((fixture) => {
    const knownRows = new Set(
      fixture.sourceRows.map((row) => row.sourceRowId),
    );
    return fixture.items.flatMap((item) =>
      item.sourceRowIds
        .filter((sourceRowId) => !knownRows.has(sourceRowId))
        .map(
          (sourceRowId) =>
            `${fixture.fixtureId}:${item.itemId}:${sourceRowId}`,
        ),
    );
  });
  check(
    'new-fixture-source-row-reference-integrity',
    newFixtureReferenceErrors.length === 0,
    newFixtureReferenceErrors,
  );

  const baselineCells = matrix.cells.filter(
    (cell) => cell.fixtureGroup === 'frozen_baseline_42',
  );
  check(
    'baseline-42x5-matrix',
    baselineCells.length === 210 &&
      new Set(baselineCells.map((cell) => cell.fixtureId)).size === 42 &&
      [...new Set(baselineCells.map((cell) => cell.fixtureId))].every(
        (fixtureId) =>
          projectionNames.every(
            (projection) =>
              baselineCells.filter(
                (cell) =>
                  cell.fixtureId === fixtureId &&
                  cell.projection === projection,
              ).length === 1,
          ),
      ),
    { cells: baselineCells.length },
  );
  check(
    'all-projection-cell-count',
    matrix.cells.length ===
      matrix.counts.totalFixtures * projectionNames.length,
    matrix.counts,
  );

  const resultByCellId = new Map(
    results.results.map((entry) => [entry.cellId, entry]),
  );
  const cellErrors = matrix.cells.flatMap((cell) =>
    validateProjectionCell(cell, resultByCellId.get(cell.cellId)).map(
      (error) => `${cell.cellId}: ${error}`,
    ),
  );
  check('projection-cell-schema-and-state', cellErrors.length === 0, cellErrors);

  const checklistOutputs = results.results.filter(
    (entry) => entry.generated && entry.projection === 'checklist',
  );
  const todoOutputs = results.results.filter(
    (entry) => entry.generated && entry.projection === 'todo',
  );
  const distinctOutputSchemas =
    checklistOutputs.every(
      (entry) =>
        Array.isArray(entry.output.groups) &&
        !('tasks' in entry.output) &&
        entry.output.groups.every(
          (group) =>
            Array.isArray(group.orderedEntries) &&
            typeof group.bounded === 'boolean' &&
            typeof group.orderLocked === 'boolean',
        ),
    ) &&
    todoOutputs.every(
      (entry) =>
        Array.isArray(entry.output.tasks) &&
        !('groups' in entry.output) &&
        entry.output.tasks.every(
          (task) =>
            'queuePosition' in task &&
            'canReorder' in task &&
            'canDefer' in task,
        ),
    );
  check('checklist-todo-distinct-schema', distinctOutputSchemas, {
    checklistOutputs: checklistOutputs.length,
    todoOutputs: todoOutputs.length,
  });

  const baselineItemById = new Map(
    baseline.fixtures.flatMap((fixture) =>
      fixture.canonicalContent.items.map((item) => [
        item.itemId,
        {
          ...item,
          fixtureId: fixture.fixtureId,
          sourceShape: fixture.taxonomy.sourceShape,
        },
      ]),
    ),
  );
  const sourceVeventsFromUndatedItems = results.results
    .filter((entry) => entry.generated && entry.projection === 'calendar')
    .flatMap((entry) => entry.output.events)
    .filter((event) => {
      const item = baselineItemById.get(event.canonicalItemId);
      return (
        item &&
        (!item.schedule || item.schedule.mode === 'none') &&
        event.scheduleOwner === 'source'
      );
    });
  check(
    'no-source-vevent-for-undated-item',
    sourceVeventsFromUndatedItems.length === 0,
    sourceVeventsFromUndatedItems,
  );

  const dueItemIds = new Set(
    baseline.fixtures.flatMap((fixture) =>
      fixture.taxonomy.sourceShape === 'date_window'
        ? fixture.canonicalContent.items
            .filter((item) => item.schedule?.mode === 'absolute')
            .map((item) => item.itemId)
        : [],
    ),
  );
  const dueAsVevent = results.results
    .filter((entry) => entry.generated && entry.projection === 'calendar')
    .flatMap((entry) => entry.output.events)
    .filter((event) => dueItemIds.has(event.canonicalItemId));
  check('no-due-only-auto-timeblock', dueAsVevent.length === 0, dueAsVevent);

  const generatedCalendarEvents = results.results
    .filter((entry) => entry.generated && entry.projection === 'calendar')
    .flatMap((entry) => entry.output.events);
  const missingScheduleProvenance = generatedCalendarEvents.filter(
    (event) =>
      !['source', 'user_overlay'].includes(event.scheduleOwner) ||
      !['direct', 'anchor_resolution', 'pacing_policy', 'manual'].includes(
        event.derivation,
      ) ||
      !event.suggestionStatus,
  );
  check(
    'calendar-schedule-provenance-100-percent',
    missingScheduleProvenance.length === 0,
    {
      events: generatedCalendarEvents.length,
      missing: missingScheduleProvenance,
    },
  );

  const generatedRecordProvenanceErrors = results.results.flatMap((entry) => {
    if (!entry.generated || !entry.output) return [];
    if (entry.projection === 'calendar') {
      return entry.output.events
        .filter(
          (event) =>
            !Array.isArray(event.sourceRowIds) || !event.sourceRowIds.length,
        )
        .map((event) => `${entry.cellId}:${event.uid}`);
    }
    if (entry.projection === 'checklist') {
      return entry.output.groups.flatMap((group) =>
        group.orderedEntries
          .filter((row) => !row.sourceRowIds.length)
          .map((row) => `${entry.cellId}:${row.entryId}`),
      );
    }
    if (entry.projection === 'todo') {
      return entry.output.tasks
        .filter(
          (task) =>
            task.canonicalItemId &&
            (!task.sourceRowIds || !task.sourceRowIds.length),
        )
        .map((task) => `${entry.cellId}:${task.taskId}`);
    }
    return [];
  });
  check(
    'generated-item-provenance',
    generatedRecordProvenanceErrors.length === 0,
    generatedRecordProvenanceErrors,
  );

  const falseRruleErrors = validateNoFalseYearlyRrule(eventCorpus);
  const sourceOccurrenceById = new Map(
    eventCorpus.fixtures.flatMap((fixture) =>
      (fixture.eventModel?.occurrences ?? []).map((occurrence) => [
        occurrence.occurrenceId,
        occurrence,
      ]),
    ),
  );
  const sourceDateWithoutMatch = generatedCalendarEvents.filter((event) => {
    if (event.scheduleOwner !== 'source') return false;
    if (event.sourceOccurrenceId) {
      const occurrence = sourceOccurrenceById.get(event.sourceOccurrenceId);
      return (
        !occurrence ||
        event.start !== (occurrence.start ?? occurrence.startDate)
      );
    }
    const item = baselineItemById.get(event.canonicalItemId);
    if (!item) return true;
    return (
      event.start !==
      (item.schedule?.at ??
        item.schedule?.start ??
        item.schedule?.date ??
        item.schedule?.startDate)
    );
  });
  const completionClaimsWithoutProvenance = results.results.flatMap((entry) => {
    if (!entry.generated || !entry.output) return [];
    const serialized = JSON.stringify(entry.output);
    return serialized.includes('"doneWhen"')
      ? [`${entry.cellId}: exported source completion assertion`]
      : [];
  });
  const inventionAudit = {
    schemaVersion: 'flowme-semantic-invention-audit-v1',
    generatedAt: new Date().toISOString(),
    counts: {
      actionWithoutSourceProvenance:
        generatedRecordProvenanceErrors.length,
      sourceDateWithoutDirectMatch: sourceDateWithoutMatch.length,
      falseSourceRecurrence: falseRruleErrors.length,
      completionCriteriaWithoutProvenance:
        completionClaimsWithoutProvenance.length,
    },
    details: {
      actionWithoutSourceProvenance: generatedRecordProvenanceErrors,
      sourceDateWithoutDirectMatch: sourceDateWithoutMatch,
      falseSourceRecurrence: falseRruleErrors,
      completionCriteriaWithoutProvenance:
        completionClaimsWithoutProvenance,
    },
    pass:
      generatedRecordProvenanceErrors.length === 0 &&
      sourceDateWithoutMatch.length === 0 &&
      completionClaimsWithoutProvenance.length === 0 &&
      falseRruleErrors.length === 0,
  };
  check(
    'no-action-date-recurrence-completion-invention',
    inventionAudit.pass,
    inventionAudit,
  );

  const pacingErrors = pacing.experiments.flatMap((experiment) =>
    validatePacingExperiment(experiment).map(
      (error) => `${experiment.experimentId}: ${error}`,
    ),
  );
  check('pacing-invariants', pacingErrors.length === 0, pacingErrors);
  check(
    'pacing-future-only-revision',
    pacing.revisionEvidence.completedPastUnchanged === true,
    pacing.revisionEvidence,
  );

  const nestedComponents = generatedCalendarEvents.filter(
    (event) =>
      event.component !== 'VEVENT' ||
      event.components?.some((component) =>
        ['VEVENT', 'VTODO'].includes(component.component),
      ),
  );
  check('no-vevent-vtodo-nesting', nestedComponents.length === 0, {
    nested: nestedComponents,
    declaredNestedCount: results.results
      .filter((entry) => entry.generated && entry.projection === 'calendar')
      .reduce(
        (sum, entry) => sum + (entry.output.nestedVtodoCount ?? 0),
        0,
      ),
  });
  const representativeVtodos = dtos.dtos.flatMap(
    (dto) => dto.iCalendarExportPlan.siblingComponents?.vtodo ?? [],
  );
  const invalidVtodos = representativeVtodos.filter(
    (component) =>
      component.component !== 'VTODO' ||
      !component.canonicalItemId ||
      (component.nestedComponents?.length ?? 0) > 0,
  );
  check(
    'vtodo-item-granularity-and-sibling-plan',
    representativeVtodos.length > 0 &&
      invalidVtodos.length === 0 &&
      dtos.dtos.every(
        (dto) => dto.iCalendarExportPlan.nestedVeventVtodo === false,
      ),
    {
      vtodoComponents: representativeVtodos.length,
      invalid: invalidVtodos,
    },
  );

  check(
    'vtodo-fallback-covered',
    mapping.components.VTODO.destinationSupport === 'not assumed' &&
      mapping.components.VTODO.fallback.length >= 1 &&
      matrix.cells
        .filter((cell) => cell.projection === 'todo')
        .every((cell) => cell.fallback),
    {
      mappingFallback: mapping.components.VTODO.fallback,
    },
  );
  check('no-false-yearly-rrule', falseRruleErrors.length === 0, falseRruleErrors);

  const bundleEvents = grouping.experiments.flatMap((experiment) =>
    experiment.sessionBundle.events.filter(
      (event) => event.childItemIds?.length > 1,
    ),
  );
  const groupingErrors = bundleEvents.filter(
    (event) =>
      !event.childItemIds.length ||
      event.individualCompletionOutsideCalendar !== true,
  );
  check(
    'calendar-bundle-child-ids-and-loss',
    bundleEvents.length > 0 && groupingErrors.length === 0,
    {
      bundleEvents: bundleEvents.length,
      errors: groupingErrors,
      movingPerItem:
        grouping.experiments[0].perItem.events.length,
      movingBundled:
        grouping.experiments[0].sessionBundle.events.length,
      web1PerItem:
        grouping.experiments[1].perItem.events.length,
      web1Bundled:
        grouping.experiments[1].sessionBundle.events.length,
    },
  );

  const memoOutputs = results.results.filter(
    (entry) => entry.generated && entry.projection === 'memo',
  );
  check(
    'memo-not-canonical-raw',
    semantics.projections.memo.canonicalRaw === false &&
      memoOutputs.every(
        (entry) => entry.output.canonicalRawData === false,
      ),
    { memoOutputs: memoOutputs.length },
  );
  check(
    'five-representative-all-format-dtos',
    dtos.dtos.length >= 5 &&
      dtos.dtos.every((dto) =>
        projectionNames.every(
          (projection) => projection in dto.output,
        ),
      ),
    { dtoCount: dtos.dtos.length },
  );

  check(
    'independent-checklist-todo-agreement',
    classification.metrics.checklistTodo.pass &&
      classification.metrics.checklistTodo.agreementPercent >= 90,
    classification.metrics.checklistTodo,
  );
  check(
    'independent-primary-projection-agreement',
    classification.metrics.primaryProjection.pass &&
      classification.metrics.primaryProjection.agreementPercent >= 90,
    classification.metrics.primaryProjection,
  );
  check(
    'disagreement-adjudication',
    classification.disagreements.every(
      (entry) =>
        entry.cause &&
        entry.tieBreaker &&
        entry.finalAdjudication,
    ),
    { disagreements: classification.disagreements.length },
  );

  check(
    'external-validation-boundary',
    mapping.externalRoundTrip.googleCalendar === 'NOT_RUN' &&
      mapping.externalRoundTrip.outlookCalendar === 'NOT_RUN' &&
      mapping.externalRoundTrip.appleCalendar === 'NOT_RUN' &&
      mapping.externalRoundTrip.vtodoClients === 'NOT_RUN' &&
      eventCorpus.claimBoundary.observedUserValidation === false,
    {
      externalRoundTrip: mapping.externalRoundTrip,
      observedUserValidation:
        eventCorpus.claimBoundary.observedUserValidation,
    },
  );
  check(
    'runtime-read-only',
    runtimeGaps.gaps.every((gap) => gap.runtimeChanged === false),
    runtimeGaps.gaps.map((gap) => ({
      contract: gap.contract,
      runtimeChanged: gap.runtimeChanged,
    })),
  );
  check(
    'desktop-mobile-browser-qa',
    browserQa.pass === true &&
      browserQa.viewports.length === 2 &&
      browserQa.viewports.every(
        (viewport) =>
          viewport.horizontalOverflowPx === 0 &&
          viewport.brokenImages === 0 &&
          viewport.consoleErrors === 0 &&
          viewport.pass === true,
      ) &&
      browserQa.interaction.pass === true,
    browserQa,
  );

  const failed = checks.filter((entry) => !entry.pass);
  const validation = {
    schemaVersion: 'flowme-projection-lab-validation-results-v1',
    generatedAt: new Date().toISOString(),
    pass: failed.length === 0,
    counts: {
      checks: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks,
  };
  if (writeResults) {
    fs.writeFileSync(
      path.join(here, 'validation-results-v1.json'),
      `${JSON.stringify(validation, null, 2)}\n`,
      'utf8',
    );
    fs.writeFileSync(
      path.join(here, 'semantic-invention-audit-v1.json'),
      `${JSON.stringify(inventionAudit, null, 2)}\n`,
      'utf8',
    );
  }
  return validation;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const validation = runValidation();
  console.log(JSON.stringify(validation.counts, null, 2));
  if (!validation.pass) {
    for (const failed of validation.checks.filter((entry) => !entry.pass)) {
      console.error(`FAIL ${failed.id}`);
      console.error(JSON.stringify(failed.evidence, null, 2));
    }
    process.exitCode = 1;
  }
}
