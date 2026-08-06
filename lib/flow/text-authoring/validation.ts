import type {
  AuthoringSourceRange,
  AuthoringValidationIssue,
  AuthoringValidationResult,
  CanonicalAuthoringItem,
  TextAuthoringDocument,
} from './types';
import { isAuthoringIssueOutstanding } from './issue-state';
import { createAuthoringSourceSnapshotRef } from './source-update';

type EntityType = 'flow' | 'step' | 'item' | 'field' | 'memo';

const STRUCTURAL_ISSUE_TYPES = new Set([
  'unsupported_syntax',
  'ambiguous_role',
  'missing_parent',
]);

function validIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ));
  return (
    date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3])
  );
}

function rangeIsValid(
  range: AuthoringSourceRange,
  rawText: string,
): boolean {
  return (
    Number.isInteger(range.startOffset)
    && Number.isInteger(range.endOffset)
    && Number.isInteger(range.startLine)
    && Number.isInteger(range.endLine)
    && range.startOffset >= 0
    && range.endOffset >= range.startOffset
    && range.endOffset <= rawText.length
    && range.startLine >= 1
    && range.endLine >= range.startLine
  );
}

function sourceSupportsSchedule(
  document: TextAuthoringDocument,
  item: CanonicalAuthoringItem,
): boolean {
  const schedule = item.schedule;
  if (!schedule) return true;
  const sourceRowById = new Map(
    document.parseResult.canonical.sourceRows.map((row) => [
      row.sourceRowId,
      row,
    ]),
  );
  const sourceText = item.sourceRowIds
    .map((sourceRowId) => sourceRowById.get(sourceRowId)?.rawText ?? '')
    .join('\n');
  const ownedValues = item.properties
    .filter((property) => property.owner !== 'source')
    .map((property) => property.value)
    .join('\n');
  const evidence = `${sourceText}\n${ownedValues}`;
  if (schedule.kind === 'absolute') {
    return validIsoDate(schedule.date) && (
      evidence.includes(schedule.date)
      || ownedValues.includes(schedule.raw)
    );
  }
  if (!Number.isInteger(schedule.dayOffset)) return false;
  const normalizedRaw = schedule.raw.replace(/\s+/gu, '').toLocaleUpperCase();
  const normalizedEvidence = evidence.replace(/\s+/gu, '').toLocaleUpperCase();
  return (
    /^D(?:(?:-|\+)\d+|-?DAY)$/u.test(normalizedRaw)
    && normalizedEvidence.includes(normalizedRaw)
  );
}

export function validateTextAuthoringDocument(
  document: TextAuthoringDocument,
): AuthoringValidationResult {
  const issues: AuthoringValidationIssue[] = [];
  const issueKeys = new Set<string>();
  const add = (
    code: AuthoringValidationIssue['code'],
    path: string,
    message: string,
  ): void => {
    const identity = `${code}|${path}|${message}`;
    if (issueKeys.has(identity)) return;
    issueKeys.add(identity);
    issues.push({ code, path, message });
  };
  const parseResult = document.parseResult;
  const canonical = parseResult.canonical;
  const ids = new Map<string, string>();
  const register = (id: string, path: string): void => {
    const previous = ids.get(id);
    if (previous) {
      add(
        'duplicate_id',
        path,
        `ID ${id} is already used at ${previous}.`,
      );
    } else {
      ids.set(id, path);
    }
  };

  register(document.documentId, 'document.documentId');
  register(parseResult.parseResultId, 'parseResult.parseResultId');
  register(canonical.flow.flowId, 'canonical.flow.flowId');
  canonical.steps.forEach((step, index) => (
    register(step.stepId, `canonical.steps[${index}].stepId`)
  ));
  canonical.items.forEach((item, index) => (
    register(item.itemId, `canonical.items[${index}].itemId`)
  ));
  canonical.items.forEach((item, itemIndex) => {
    item.properties.forEach((property, propertyIndex) => (
      register(
        property.propertyId,
        `canonical.items[${itemIndex}].properties[${propertyIndex}].propertyId`,
      )
    ));
  });
  canonical.fields.forEach((field, index) => (
    register(field.fieldId, `canonical.fields[${index}].fieldId`)
  ));
  canonical.memos.forEach((memo, index) => (
    register(memo.memoId, `canonical.memos[${index}].memoId`)
  ));
  canonical.sourceRows.forEach((row, index) => (
    register(row.sourceRowId, `canonical.sourceRows[${index}].sourceRowId`)
  ));
  canonical.sourceRefs.forEach((sourceRef, index) => (
    register(sourceRef.sourceRefId, `canonical.sourceRefs[${index}].sourceRefId`)
  ));
  parseResult.blocks.forEach((block, index) => (
    register(block.blockId, `parseResult.blocks[${index}].blockId`)
  ));
  parseResult.mappings.forEach((mapping, index) => (
    register(mapping.mappingId, `parseResult.mappings[${index}].mappingId`)
  ));
  parseResult.issues.forEach((issue, index) => (
    register(issue.issueId, `parseResult.issues[${index}].issueId`)
  ));
  document.revisionHistory.forEach((revision, index) => (
    register(revision.revisionId, `revisionHistory[${index}].revisionId`)
  ));
  (document.reviewGates ?? []).forEach((gate, index) => (
    register(gate.gateId, `reviewGates[${index}].gateId`)
  ));
  if (document.sourceState?.status !== 'current') {
    document.sourceState?.changes.forEach((change, index) => (
      register(change.changeId, `sourceState.changes[${index}].changeId`)
    ));
  }

  const sourceRowIds = new Set(
    canonical.sourceRows.map((row) => row.sourceRowId),
  );
  const blockIds = new Set(parseResult.blocks.map((block) => block.blockId));
  const issueIds = new Set(parseResult.issues.map((issue) => issue.issueId));
  const flowIds = new Set([canonical.flow.flowId]);
  const stepIds = new Set(canonical.steps.map((step) => step.stepId));
  const itemIds = new Set(canonical.items.map((item) => item.itemId));
  const fieldIds = new Set(canonical.fields.map((field) => field.fieldId));
  const memoIds = new Set(canonical.memos.map((memo) => memo.memoId));
  const allTargetIds = new Set([
    ...flowIds,
    ...stepIds,
    ...itemIds,
    ...fieldIds,
    ...memoIds,
    ...issueIds,
  ]);
  const entityIds: Record<EntityType, Set<string>> = {
    flow: flowIds,
    step: stepIds,
    item: itemIds,
    field: fieldIds,
    memo: memoIds,
  };

  canonical.sourceRows.forEach((row, index) => {
    const path = `canonical.sourceRows[${index}]`;
    if (row.documentId !== document.documentId) {
      add('broken_reference', `${path}.documentId`, 'Source row points to another document.');
    }
    if (row.state === 'tombstone') {
      if (!row.sourceSnapshotId) {
        add(
          'invalid_source_state',
          `${path}.sourceSnapshotId`,
          'A tombstone source row must identify its previous snapshot.',
        );
      }
      return;
    }
    if (!rangeIsValid(row.sourceRange, document.rawText)) {
      add('missing_lineage', `${path}.sourceRange`, 'Source range is outside the captured raw text.');
    } else if (
      document.rawText.slice(
        row.sourceRange.startOffset,
        row.sourceRange.endOffset,
      ) !== row.rawText
    ) {
      add(
        'missing_lineage',
        `${path}.rawText`,
        'Captured source text does not match its immutable range.',
      );
    }
  });

  parseResult.blocks.forEach((block, index) => {
    const path = `parseResult.blocks[${index}]`;
    if (block.documentId !== document.documentId) {
      add('broken_reference', `${path}.documentId`, 'Block points to another document.');
    }
    if (block.parentBlockId && !blockIds.has(block.parentBlockId)) {
      add('broken_reference', `${path}.parentBlockId`, 'Parent block does not exist.');
    }
    if (block.state === 'tombstone') return;
    if (!rangeIsValid(block.sourceRange, document.rawText)) {
      add('missing_lineage', `${path}.sourceRange`, 'Block range is outside the captured raw text.');
    } else if (
      document.rawText.slice(
        block.sourceRange.startOffset,
        block.sourceRange.endOffset,
      ) !== block.rawText
    ) {
      add(
        'missing_lineage',
        `${path}.rawText`,
        'Block text does not match its immutable source range.',
      );
    }
  });

  const mappedSourceRows = new Set<string>();
  parseResult.mappings.forEach((mapping, index) => {
    const path = `parseResult.mappings[${index}]`;
    if (mapping.blockIds.length === 0 || mapping.sourceLineage.length === 0) {
      add('missing_lineage', path, 'Mapping must retain block and source lineage.');
    }
    mapping.blockIds.forEach((blockId) => {
      if (!blockIds.has(blockId)) {
        add('broken_reference', `${path}.blockIds`, `Block ${blockId} does not exist.`);
      }
    });
    mapping.sourceLineage.forEach((sourceRowId) => {
      if (!sourceRowIds.has(sourceRowId)) {
        add(
          'broken_reference',
          `${path}.sourceLineage`,
          `Source row ${sourceRowId} does not exist.`,
        );
      } else {
        mappedSourceRows.add(sourceRowId);
      }
    });
    if (!allTargetIds.has(mapping.targetDraftId)) {
      add(
        'broken_reference',
        `${path}.targetDraftId`,
        `Mapping target ${mapping.targetDraftId} does not exist.`,
      );
    }
  });
  parseResult.issues.forEach((issue, index) => {
    const path = `parseResult.issues[${index}]`;
    issue.sourceRowIds.forEach((sourceRowId) => {
      if (!sourceRowIds.has(sourceRowId)) {
        add(
          'broken_reference',
          `${path}.sourceRowIds`,
          `Source row ${sourceRowId} does not exist.`,
        );
      }
    });
    const decision = issue.decision;
    if (!decision) return;

    if (decision.outcome === 'convert_to_item') {
      const target = canonical.items.find(
        (item) => item.itemId === decision.targetDraftId,
      );
      if (!target) {
        add(
          'broken_reference',
          `${path}.decision.targetDraftId`,
          `Resolved Item ${decision.targetDraftId} does not exist.`,
        );
        return;
      }
      if (
        !issue.sourceRowIds.every((sourceRowId) =>
          target.sourceRowIds.includes(sourceRowId),
        )
      ) {
        add(
          'missing_lineage',
          `${path}.decision.targetDraftId`,
          'Resolved Item does not retain every issue source row.',
        );
      }
      const effectiveMappings = parseResult.mappings.filter((mapping) => (
        mapping.targetKind === 'item'
        && mapping.targetDraftId === target.itemId
        && issue.sourceRowIds.every((sourceRowId) =>
          mapping.sourceLineage.includes(sourceRowId),
        )
      ));
      if (
        effectiveMappings.length !== 1
        || !effectiveMappings[0].userCorrected
      ) {
        add(
          'missing_lineage',
          `${path}.decision`,
          'Resolved Item must have one corrected mapping for the issue lineage.',
        );
      }
      const sourceRef = canonical.sourceRefs.find((candidate) => (
        candidate.entityType === 'item'
        && candidate.entityId === target.itemId
        && issue.sourceRowIds.every((sourceRowId) =>
          candidate.sourceRowIds.includes(sourceRowId),
        )
      ));
      if (!sourceRef) {
        add(
          'missing_lineage',
          `${path}.decision`,
          'Resolved Item must retain a direct source reference.',
        );
      }
      return;
    }

    if (STRUCTURAL_ISSUE_TYPES.has(issue.type)) {
      const retainedMappings = parseResult.mappings.filter((mapping) => (
        mapping.targetKind === 'unresolved'
        && mapping.targetDraftId === issue.issueId
        && issue.sourceRowIds.every((sourceRowId) =>
          mapping.sourceLineage.includes(sourceRowId),
        )
      ));
      if (
        retainedMappings.length !== 1
        || !retainedMappings[0].userCorrected
      ) {
        add(
          'missing_lineage',
          `${path}.decision`,
          'Held or source-only decisions must retain one corrected issue mapping.',
        );
      }
    }
  });
  canonical.sourceRows.forEach((row, index) => {
    if (row.state === 'tombstone') return;
    const inIssue = parseResult.issues.some((issue) => (
      issue.sourceRowIds.includes(row.sourceRowId)
    ));
    if (!mappedSourceRows.has(row.sourceRowId) && !inIssue) {
      add(
        'unaccounted_source_row',
        `canonical.sourceRows[${index}]`,
        'Source row is neither mapped nor retained by an unresolved issue.',
      );
    }
  });

  canonical.flow.stepIds.forEach((stepId) => {
    if (!stepIds.has(stepId)) {
      add('broken_reference', 'canonical.flow.stepIds', `Step ${stepId} does not exist.`);
    }
  });
  if (canonical.flow.secondaryArtifacts.length > 2) {
    add(
      'too_many_secondary_artifacts',
      'canonical.flow.secondaryArtifacts',
      'A Flow may expose at most two secondary artifacts.',
    );
  }

  canonical.steps.forEach((step, index) => {
    const path = `canonical.steps[${index}]`;
    if (!flowIds.has(step.flowId)) {
      add('broken_reference', `${path}.flowId`, `Flow ${step.flowId} does not exist.`);
    }
    if (!step.generated && step.sourceRowIds.length === 0) {
      add('missing_lineage', `${path}.sourceRowIds`, 'Source-derived Step has no lineage.');
    }
    step.sourceRowIds.forEach((sourceRowId) => {
      if (!sourceRowIds.has(sourceRowId)) {
        add('broken_reference', `${path}.sourceRowIds`, `Source row ${sourceRowId} does not exist.`);
      }
    });
    step.itemIds.forEach((itemId) => {
      const item = canonical.items.find((candidate) => candidate.itemId === itemId);
      if (!item) {
        add('broken_reference', `${path}.itemIds`, `Item ${itemId} does not exist.`);
      } else if (item.stepId !== step.stepId) {
        add(
          'broken_reference',
          `${path}.itemIds`,
          `Item ${itemId} belongs to another Step.`,
        );
      }
    });
  });

  canonical.items.forEach((item, index) => {
    const path = `canonical.items[${index}]`;
    if (!stepIds.has(item.stepId)) {
      add('broken_reference', `${path}.stepId`, `Step ${item.stepId} does not exist.`);
    }
    if (!item.sourceTitle.trim()) {
      add('missing_lineage', `${path}.sourceTitle`, 'Item must preserve its source title.');
    }
    if (item.sourceRowIds.length === 0) {
      add('missing_lineage', `${path}.sourceRowIds`, 'Item has no source lineage.');
    }
    if (item.sourceDisposition === 'previous_source' && item.included) {
      add(
        'invalid_source_state',
        `${path}.included`,
        'A previous-source Item must remain excluded from active projections.',
      );
    }
    item.sourceRowIds.forEach((sourceRowId) => {
      if (!sourceRowIds.has(sourceRowId)) {
        add('broken_reference', `${path}.sourceRowIds`, `Source row ${sourceRowId} does not exist.`);
      }
    });
    item.properties.forEach((property, propertyIndex) => {
      property.sourceRowIds.forEach((sourceRowId) => {
        if (!sourceRowIds.has(sourceRowId)) {
          add(
            'broken_reference',
            `${path}.properties[${propertyIndex}].sourceRowIds`,
            `Source row ${sourceRowId} does not exist.`,
          );
        }
      });
    });
    [...item.resources, ...item.sources].forEach((link, linkIndex) => {
      link.sourceRowIds.forEach((sourceRowId) => {
        if (!sourceRowIds.has(sourceRowId)) {
          add(
            'broken_reference',
            `${path}.links[${linkIndex}].sourceRowIds`,
            `Source row ${sourceRowId} does not exist.`,
          );
        }
      });
    });
    if (item.completion) {
      item.completion.sourceRowIds.forEach((sourceRowId) => {
        if (!sourceRowIds.has(sourceRowId)) {
          add(
            'broken_reference',
            `${path}.completion.sourceRowIds`,
            `Source row ${sourceRowId} does not exist.`,
          );
        }
      });
    }
    if (!sourceSupportsSchedule(document, item)) {
      add(
        'invented_schedule',
        `${path}.schedule`,
        'Schedule is invalid or has no explicit source or owned-lane value.',
      );
    }
  });

  canonical.fields.forEach((field, index) => {
    const path = `canonical.fields[${index}]`;
    const owners = field.owner.type === 'flow' ? flowIds : itemIds;
    if (!owners.has(field.owner.id)) {
      add('broken_reference', `${path}.owner`, `Owner ${field.owner.id} does not exist.`);
    }
    field.sourceRowIds.forEach((sourceRowId) => {
      if (!sourceRowIds.has(sourceRowId)) {
        add('broken_reference', `${path}.sourceRowIds`, `Source row ${sourceRowId} does not exist.`);
      }
    });
  });
  canonical.memos.forEach((memo, index) => {
    const path = `canonical.memos[${index}]`;
    if (!entityIds[memo.scope.type].has(memo.scope.id)) {
      add('broken_reference', `${path}.scope`, `Scope ${memo.scope.id} does not exist.`);
    }
    memo.sourceRowIds.forEach((sourceRowId) => {
      if (!sourceRowIds.has(sourceRowId)) {
        add('broken_reference', `${path}.sourceRowIds`, `Source row ${sourceRowId} does not exist.`);
      }
    });
  });
  canonical.sourceRefs.forEach((sourceRef, index) => {
    const path = `canonical.sourceRefs[${index}]`;
    if (!entityIds[sourceRef.entityType].has(sourceRef.entityId)) {
      add('broken_reference', `${path}.entityId`, `Entity ${sourceRef.entityId} does not exist.`);
    }
    sourceRef.sourceRowIds.forEach((sourceRowId) => {
      if (!sourceRowIds.has(sourceRowId)) {
        add('broken_reference', `${path}.sourceRowIds`, `Source row ${sourceRowId} does not exist.`);
      }
    });
  });

  const activeSnapshot = document.sourceState?.active;
  if ((document.reviewGates?.length ?? 0) > 0 && !activeSnapshot) {
    add(
      'invalid_review_gate',
      'reviewGates',
      'Review gates require an active source snapshot.',
    );
  }
  (document.reviewGates ?? []).forEach((gate, index) => {
    const path = `reviewGates[${index}]`;
    if (activeSnapshot && gate.sourceSnapshotId !== activeSnapshot.snapshotId) {
      add(
        'invalid_review_gate',
        `${path}.sourceSnapshotId`,
        'Review gate evidence must refer to the active source snapshot.',
      );
    }
    if (!gate.reasonKey.trim()) {
      add(
        'invalid_review_gate',
        `${path}.reasonKey`,
        'Review gate must retain an explicit reason key.',
      );
    }
    gate.sourceRowIds.forEach((sourceRowId) => {
      if (!sourceRowIds.has(sourceRowId)) {
        add(
          'invalid_review_gate',
          `${path}.sourceRowIds`,
          `Review gate source row ${sourceRowId} does not exist.`,
        );
      }
    });
    if (
      gate.status === 'evidence_recorded'
      && !gate.evidenceNote?.trim()
    ) {
      add(
        'invalid_review_gate',
        `${path}.evidenceNote`,
        'Recorded review evidence requires a non-empty note.',
      );
    }
    if (
      gate.status !== 'required'
      && (!gate.actorLane || !gate.decidedAt)
    ) {
      add(
        'invalid_review_gate',
        path,
        'A review decision must retain its actor lane and timestamp.',
      );
    }
  });

  const sourceState = document.sourceState;
  if (sourceState) {
    const expectedActive = createAuthoringSourceSnapshotRef({
      documentId: document.documentId,
      rawText: sourceState.active.rawText ?? document.rawText,
      sourceTitle: sourceState.active.sourceTitle,
      sourceUrl: sourceState.active.sourceUrl,
      parseResult: document.parseResult,
    }, {
      capturedAt: sourceState.active.capturedAt,
      externalVersion: sourceState.active.externalVersion,
    });
    if (
      expectedActive.contentFingerprint
      !== sourceState.active.contentFingerprint
    ) {
      add(
        'invalid_source_state',
        'sourceState.active.contentFingerprint',
        'Active source fingerprint does not match the captured source.',
      );
    }
    if (sourceState.status !== 'current') {
      const incoming = sourceState.incoming;
      const expectedIncoming = createAuthoringSourceSnapshotRef({
        documentId: document.documentId,
        rawText: incoming.rawText,
        sourceTitle: incoming.snapshot.sourceTitle,
        sourceUrl: incoming.snapshot.sourceUrl,
        parseResult: incoming.parseResult,
      }, {
        capturedAt: incoming.snapshot.capturedAt,
        externalVersion: incoming.snapshot.externalVersion,
      });
      if (
        expectedIncoming.contentFingerprint
        !== incoming.snapshot.contentFingerprint
      ) {
        add(
          'invalid_source_state',
          'sourceState.incoming.snapshot.contentFingerprint',
          'Incoming source fingerprint does not match the staged source.',
        );
      }
      const activeItemIds = new Set(canonical.items.map((item) => item.itemId));
      const incomingItemIds = new Set(
        incoming.parseResult.canonical.items.map((item) => item.itemId),
      );
      const matchedActive = new Set<string>();
      const matchedIncoming = new Set<string>();
      incoming.matches.forEach((match, index) => {
        const path = `sourceState.incoming.matches[${index}]`;
        if (
          !activeItemIds.has(match.activeItemId)
          || !incomingItemIds.has(match.incomingItemId)
        ) {
          add(
            'invalid_source_state',
            path,
            'Source update match references an unknown Item.',
          );
        }
        if (
          match.basis === 'stable_entity_id'
          && match.activeItemId !== match.incomingItemId
        ) {
          add(
            'invalid_source_state',
            `${path}.basis`,
            'Stable entity matches require identical Item IDs.',
          );
        }
        if (
          matchedActive.has(match.activeItemId)
          || matchedIncoming.has(match.incomingItemId)
        ) {
          add(
            'invalid_source_state',
            path,
            'A source update Item may be matched only once.',
          );
        }
        matchedActive.add(match.activeItemId);
        matchedIncoming.add(match.incomingItemId);
      });

      sourceState.changes.forEach((change, index) => {
        const path = `sourceState.changes[${index}]`;
        if (change.kind === 'changed') {
          if (
            !activeItemIds.has(change.activeItemId)
            || !incomingItemIds.has(change.incomingItemId)
          ) {
            add(
              'invalid_source_state',
              path,
              'Changed source value references an unknown Item.',
            );
          }
          if (
            change.resolution === 'keep_user'
            && change.userValue === undefined
          ) {
            add(
              'invalid_source_state',
              `${path}.resolution`,
              'keep_user requires a preserved owned value.',
            );
          }
        } else if (
          change.kind === 'added'
          && !incomingItemIds.has(change.incomingItemId)
        ) {
          add(
            'invalid_source_state',
            path,
            'Added source value references an unknown incoming Item.',
          );
        } else if (
          change.kind === 'removed'
          && !activeItemIds.has(change.activeItemId)
        ) {
          add(
            'invalid_source_state',
            path,
            'Removed source value references an unknown active Item.',
          );
        }
        if (
          (change.state === 'open' && change.resolution)
          || (change.state === 'resolved' && !change.resolution)
        ) {
          add(
            'invalid_source_state',
            `${path}.state`,
            'Source update resolution state is inconsistent.',
          );
        }
      });
      const hasOpenOwnedConflict = sourceState.changes.some((change) => (
        change.state === 'open'
        && (
          (change.kind === 'changed' && change.userOwner !== undefined)
          || (change.kind === 'removed' && change.hasOwnedState)
        )
      ));
      if (
        (sourceState.status === 'conflict_source_vs_user')
        !== hasOpenOwnedConflict
      ) {
        add(
          'invalid_source_state',
          'sourceState.status',
          'Source update status does not match its open owned conflicts.',
        );
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    counts: {
      sourceRows: canonical.sourceRows.length,
      mappedSourceRows: mappedSourceRows.size,
      steps: canonical.steps.length,
      items: canonical.items.length,
      unresolved: parseResult.issues.filter(isAuthoringIssueOutstanding).length,
    },
  };
}

export const validateAuthoringDocument = validateTextAuthoringDocument;
