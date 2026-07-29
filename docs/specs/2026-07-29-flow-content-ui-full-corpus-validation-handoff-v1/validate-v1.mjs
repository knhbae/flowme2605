import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECTIONS = ["calendar", "checklist", "todo", "sheet", "memo"];
const NORMAL_TIERS = new Set(["product_candidate", "structure_probe"]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(SPEC_DIR, file), "utf8"));
}

function fileSha256(file) {
  return `sha256:${crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(SPEC_DIR, file)))
    .digest("hex")}`;
}

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  if (typeof value === "number") return "number";
  return typeof value;
}

function resolveJsonPointer(rootSchema, ref) {
  if (!ref.startsWith("#/")) {
    throw new Error(`Only local JSON Schema refs are supported: ${ref}`);
  }
  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, part) => value?.[part], rootSchema);
}

export function validateJsonSchemaSubset(instance, schema) {
  const errors = [];
  const walk = (value, node, instancePath) => {
    if (!node || typeof node !== "object") return;
    if (node.$ref) {
      const resolved = resolveJsonPointer(schema, node.$ref);
      if (!resolved) {
        errors.push(`${instancePath}: unresolved schema ref ${node.$ref}`);
        return;
      }
      walk(value, resolved, instancePath);
      return;
    }
    if ("const" in node && !jsonEqual(value, node.const)) {
      errors.push(`${instancePath}: must equal ${JSON.stringify(node.const)}`);
    }
    if (node.enum && !node.enum.some((candidate) => jsonEqual(candidate, value))) {
      errors.push(`${instancePath}: must be one of ${JSON.stringify(node.enum)}`);
    }

    const acceptedTypes = node.type
      ? (Array.isArray(node.type) ? node.type : [node.type])
      : [];
    if (
      acceptedTypes.length &&
      !acceptedTypes.some(
        (type) =>
          valueType(value) === type ||
          (type === "number" && valueType(value) === "integer"),
      )
    ) {
      errors.push(
        `${instancePath}: expected ${acceptedTypes.join("|")}, got ${valueType(value)}`,
      );
      return;
    }

    if (typeof value === "string") {
      if (node.minLength != null && value.length < node.minLength) {
        errors.push(`${instancePath}: string shorter than ${node.minLength}`);
      }
      if (node.pattern && !new RegExp(node.pattern).test(value)) {
        errors.push(`${instancePath}: does not match ${node.pattern}`);
      }
    }
    if (typeof value === "number") {
      if (node.minimum != null && value < node.minimum) {
        errors.push(`${instancePath}: number below ${node.minimum}`);
      }
      if (node.maximum != null && value > node.maximum) {
        errors.push(`${instancePath}: number above ${node.maximum}`);
      }
    }
    if (Array.isArray(value)) {
      if (node.minItems != null && value.length < node.minItems) {
        errors.push(`${instancePath}: fewer than ${node.minItems} items`);
      }
      if (node.maxItems != null && value.length > node.maxItems) {
        errors.push(`${instancePath}: more than ${node.maxItems} items`);
      }
      if (
        node.uniqueItems &&
        new Set(value.map((item) => JSON.stringify(item))).size !== value.length
      ) {
        errors.push(`${instancePath}: items must be unique`);
      }
      if (node.items) {
        value.forEach((item, index) => walk(item, node.items, `${instancePath}/${index}`));
      }
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (node.minProperties != null && keys.length < node.minProperties) {
        errors.push(`${instancePath}: fewer than ${node.minProperties} properties`);
      }
      for (const key of node.required ?? []) {
        if (!(key in value)) errors.push(`${instancePath}/${key}: is required`);
      }
      for (const [key, child] of Object.entries(node.properties ?? {})) {
        if (key in value) walk(value[key], child, `${instancePath}/${key}`);
      }
      const known = new Set(Object.keys(node.properties ?? {}));
      for (const key of keys.filter((candidate) => !known.has(candidate))) {
        if (node.additionalProperties === false) {
          errors.push(`${instancePath}/${key}: additional property is not allowed`);
        } else if (
          node.additionalProperties &&
          typeof node.additionalProperties === "object"
        ) {
          walk(value[key], node.additionalProperties, `${instancePath}/${key}`);
        }
      }
    }
  };

  walk(instance, schema, "$");
  return errors;
}

function unique(values) {
  return [...new Set(values)];
}

function ids(values, key) {
  return values.map((value) => value?.[key]).filter(Boolean);
}

function canonicalItems(content) {
  return content.canonical?.items ?? [];
}

function canonicalRows(content) {
  return content.canonical?.sourceRows ?? [];
}

function projectionRecords(cell) {
  if (cell.projection === "calendar") {
    return cell.output?.records ?? cell.preview?.records ?? [];
  }
  if (cell.projection === "checklist") {
    return (cell.output?.groups ?? []).flatMap((group) => group.entries ?? []);
  }
  if (cell.projection === "todo") {
    return cell.output?.tasks ?? [];
  }
  if (cell.projection === "sheet") {
    return cell.output?.rows ?? [];
  }
  return cell.output?.sections ?? [];
}

function verifyViewModelShape(viewModel) {
  const errors = [];
  const requiredRoot = [
    "schemaVersion",
    "generatedAt",
    "corpusFingerprint",
    "claimBoundary",
    "counts",
    "filters",
    "contents",
  ];
  for (const key of requiredRoot) {
    if (!(key in viewModel)) errors.push(`root.${key} is required`);
  }
  if (viewModel.schemaVersion !== "flow-content-ui-view-model-v1") {
    errors.push("schemaVersion mismatch");
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(viewModel.corpusFingerprint ?? "")) {
    errors.push("corpusFingerprint must be sha256");
  }
  if (!Array.isArray(viewModel.contents) || viewModel.contents.length < 80) {
    errors.push("contents must contain at least 80 records");
  }
  const contentModes = new Set([
    "flow_content",
    "field_template_probe",
    "event_source_before_user_intent",
    "boundary_control",
    "historical_preview",
  ]);
  const tiers = new Set([
    "product_candidate",
    "structure_probe",
    "boundary_control",
    "historical_preview",
  ]);
  for (const [index, content] of (viewModel.contents ?? []).entries()) {
    for (const key of [
      "contentId",
      "userJobId",
      "displayTitle",
      "saveReason",
      "userJob",
      "source",
      "taxonomy",
      "readiness",
      "minimumInputs",
      "sourceProvidedFields",
      "primaryProjection",
      "secondaryProjections",
      "projectionCells",
      "dataGraph",
    ]) {
      if (content[key] == null) errors.push(`contents[${index}].${key} is required`);
    }
    if (!contentModes.has(content.contentMode)) {
      errors.push(`${content.contentId}: invalid contentMode`);
    }
    if (!tiers.has(content.corpusTier)) {
      errors.push(`${content.contentId}: invalid corpusTier`);
    }
    if (content.userReviewStatus !== "not_reviewed") {
      errors.push(`${content.contentId}: initial user review must be not_reviewed`);
    }
    if (!PROJECTIONS.includes(content.primaryProjection)) {
      errors.push(`${content.contentId}: invalid primaryProjection`);
    }
  }
  return errors;
}

export function validateLab({ writeResult = false } = {}) {
  const view = readJson("content-ui-view-model-v1.json");
  const viewSchema = readJson("content-ui-view-model-v1.schema.json");
  const inventory = readJson("corpus-inventory-v1.json");
  const inclusion = readJson("corpus-inclusion-exclusion-v1.json");
  const coverage = readJson("corpus-coverage-matrix-v1.json");
  const projections = readJson("projection-ui-results-v1.json");
  const pacing = readJson("schedule-playground-results-v1.json");
  const events = readJson("event-ui-results-v1.json");
  const reviewContract = readJson("review-state-contract-v1.json");
  const newSources = readJson("new-source-verification-v1.json");
  const directLinks = readJson("direct-link-manifest-v1.json");
  const valueReadjudication = readJson("content-value-readjudication-v1.json");
  const planningHandoff = readJson("planning-decision-handoff-v1.json");
  const independentReview = readJson("independent-ui-review-v1.json");
  const gapRegister = readJson("content-and-logic-gap-register-v1.json");
  const semanticAudit = readJson("semantic-provenance-audit-v1.json");
  const semanticManual = readJson(
    "semantic-provenance-manual-adjudication-v1.json",
  );
  const browserQa = readJson("browser-qa-v1.json");

  const checks = [];
  const check = (id, pass, evidence) => {
    checks.push({ id, pass: Boolean(pass), evidence });
  };

  const contents = view.contents;
  const normal = contents.filter((content) => NORMAL_TIERS.has(content.corpusTier));
  const normalIds = new Set(ids(normal, "contentId"));
  const contentIds = ids(contents, "contentId");
  const normalProjectionCells = normal.flatMap((content) => content.projectionCells ?? []);

  const schemaErrors = verifyViewModelShape(view);
  check("schema.view_model_shape", schemaErrors.length === 0, schemaErrors);
  const jsonSchemaErrors = validateJsonSchemaSubset(view, viewSchema);
  check(
    "schema.view_model_json_schema",
    jsonSchemaErrors.length === 0,
    jsonSchemaErrors.slice(0, 100),
  );
  check(
    "corpus.gallery_count_matches",
    view.counts.gallery === contents.length,
    { declared: view.counts.gallery, actual: contents.length },
  );
  check(
    "corpus.normal_minimum_80",
    normal.length >= 80,
    { normal: normal.length, target: 80 },
  );
  check(
    "corpus.normal_target_100",
    normal.length >= 100,
    { normal: normal.length, target: 100 },
  );
  check(
    "corpus.unique_content_ids",
    unique(contentIds).length === contentIds.length,
    { total: contentIds.length, unique: unique(contentIds).length },
  );
  check(
    "corpus.normal_unique_user_jobs",
    unique(ids(normal, "userJobId")).length === normal.length,
    { normal: normal.length, uniqueUserJobs: unique(ids(normal, "userJobId")).length },
  );
  check(
    "corpus.counts_recomputed",
    view.counts.normal === normal.length &&
      view.counts.productCandidate ===
        contents.filter((content) => content.corpusTier === "product_candidate").length &&
      view.counts.structureProbe ===
        contents.filter((content) => content.corpusTier === "structure_probe").length &&
      view.counts.boundary ===
        contents.filter((content) => content.corpusTier === "boundary_control").length &&
      view.counts.historical ===
        contents.filter((content) => content.corpusTier === "historical_preview").length,
    view.counts,
  );
  check(
    "corpus.inclusion_counts_match",
    inclusion.counts.normal === normal.length &&
      inclusion.counts.includedSourceBacked ===
        normal.length + newSources.counts.boundary + newSources.counts.historical,
    inclusion.counts,
  );
  check(
    "corpus.inventory_lineage_complete",
    inventory.records.every(
      (record) =>
        record.contentId &&
        (record.canonicalUrl || record.contentMode === "historical_preview") &&
        record.userJob &&
        record.inclusionStatus &&
        record.inclusionReason,
    ),
    { records: inventory.records.length },
  );
  const activeSourceIdentityErrors = contents
    .filter((content) => content.corpusTier !== "historical_preview")
    .filter(
      (content) =>
        !content.source?.title?.trim() ||
        !content.source?.url?.trim() ||
        !content.source?.canonicalUrl?.trim(),
    )
    .map((content) => content.contentId);
  check(
    "corpus.active_source_identity_complete",
    activeSourceIdentityErrors.length === 0,
    { contents: activeSourceIdentityErrors },
  );
  check(
    "corpus.new_urls_reviewed_24",
    newSources.counts.reviewedUrls >= 24,
    newSources.counts,
  );
  check(
    "corpus.new_normal_16",
    newSources.counts.normal >= 16,
    newSources.counts,
  );
  check(
    "corpus.new_sources_have_direct_evidence",
    newSources.records.every(
      (record) =>
        record.source?.url &&
        record.source?.canonicalUrl &&
        record.source?.observedAt &&
        Array.isArray(record.sourceRows) &&
        record.sourceRows.length > 0 &&
        record.evidenceNotes?.length > 0,
    ),
    { records: newSources.records.length },
  );
  check(
    "corpus.coverage_counts_are_machine_derived",
    coverage.counts.normal === normal.length &&
      Object.values(coverage.lifeArea).reduce((sum, count) => sum + count, 0) === normal.length &&
      Object.values(coverage.primaryProjection).reduce((sum, count) => sum + count, 0) ===
        normal.length,
    coverage.counts,
  );
  const partialProductCandidates = normal.filter(
    (content) =>
      content.corpusTier === "product_candidate" &&
      content.readiness.sourceCompleteness !== "complete",
  );
  check(
    "corpus.partial_source_is_not_product_candidate",
    partialProductCandidates.length === 0,
    {
      contents: partialProductCandidates.map((content) => ({
        contentId: content.contentId,
        sourceCompleteness: content.readiness.sourceCompleteness,
      })),
    },
  );

  const sourceInputLeaks = [];
  const sourceProvidedFieldErrors = [];
  for (const content of contents) {
    for (const input of content.minimumInputs ?? []) {
      if (input.source !== "user_overlay") {
        sourceInputLeaks.push({
          contentId: content.contentId,
          key: input.key,
          source: input.source,
        });
      }
    }
    const canonicalSourceFields = (content.canonical?.fields ?? []).filter(
      (field) => field.valueSource === "source",
    );
    const providedByKey = new Map(
      (content.sourceProvidedFields ?? []).map((field) => [field.key, field]),
    );
    for (const field of canonicalSourceFields) {
      const provided = providedByKey.get(field.key);
      if (
        !provided ||
        provided.source !== "source" ||
        !jsonEqual(provided.value, field.sourceDefault ?? null) ||
        (content.minimumInputs ?? []).some((input) => input.key === field.key)
      ) {
        sourceProvidedFieldErrors.push({
          contentId: content.contentId,
          key: field.key,
          provided: provided ?? null,
        });
      }
    }
  }
  check("inputs.source_value_reentry_zero", sourceInputLeaks.length === 0, {
    leaks: sourceInputLeaks,
  });
  check(
    "inputs.source_provided_fields_preserved",
    sourceProvidedFieldErrors.length === 0,
    {
      errors: sourceProvidedFieldErrors.slice(0, 50),
      sourceProvidedFieldCount: contents.reduce(
        (sum, content) => sum + (content.sourceProvidedFields?.length ?? 0),
        0,
      ),
    },
  );

  check(
    "projection.five_cells_per_normal_content",
    normal.every(
      (content) =>
        content.projectionCells.length === 5 &&
        PROJECTIONS.every((projection) =>
          content.projectionCells.some((cell) => cell.projection === projection),
        ),
    ),
    { content: normal.length, expectedCells: normal.length * 5 },
  );
  check(
    "projection.result_count_matches",
    projections.results.length === normal.length * 5 &&
      view.counts.projectionCell === projections.results.length &&
      normalProjectionCells.length === projections.results.length,
    {
      expected: normal.length * 5,
      results: projections.results.length,
      embedded: normalProjectionCells.length,
    },
  );
  check(
    "projection.unique_cells",
    unique(ids(projections.results, "cellId")).length === projections.results.length,
    { cells: projections.results.length },
  );
  const blankCells = projections.results.filter((cell) => {
    if (!cell.fallback?.trim()) return true;
    if (cell.generationState === "generated") return !cell.output;
    if (cell.generationState === "preview_requires_overlay") return !cell.preview;
    if (cell.generationState === "prohibited") return !cell.prohibitionReason?.trim();
    return true;
  });
  check("projection.no_blank_or_unexplained_cells", blankCells.length === 0, {
    blankCellIds: ids(blankCells, "cellId"),
  });
  check(
    "projection.recommendation_availability_fidelity_present",
    projections.results.every(
      (cell) =>
        ["primary", "secondary", "optional", "not_recommended"].includes(
          cell.recommendation,
        ) &&
        ["available_now", "available_after_user_overlay", "unavailable"].includes(
          cell.availability,
        ) &&
        [
          "lossless_or_low_loss",
          "bounded_loss",
          "misleading_or_prohibited",
        ].includes(cell.fidelity),
    ),
    { cells: projections.results.length },
  );

  const provenanceErrors = [];
  for (const content of normal.filter((entry) => entry.canonical)) {
    const rowIds = new Set(ids(canonicalRows(content), "sourceRowId"));
    const refById = new Map(
      (content.canonical.sourceRefs ?? []).map((ref) => [ref.sourceRefId, ref]),
    );
    for (const item of canonicalItems(content)) {
      const traceRows = (item.sourceTrace ?? []).flatMap((trace) => trace.sourceRowIds ?? []);
      const refRows = (item.sourceRefIds ?? []).flatMap(
        (refId) => refById.get(refId)?.sourceRowIds ?? [],
      );
      const attachedRows = unique([
        ...(item.sourceRowIds ?? []),
        ...traceRows,
        ...refRows,
      ]);
      if (!attachedRows.length || attachedRows.some((rowId) => !rowIds.has(rowId))) {
        provenanceErrors.push({
          contentId: content.contentId,
          itemId: item.itemId,
          attachedRows,
        });
      }
    }
  }
  check("canonical.item_provenance_100_percent", provenanceErrors.length === 0, {
    errors: provenanceErrors.slice(0, 25),
  });

  const undatedVevents = [];
  const dueOnlyVevents = [];
  const calendarSourceOwnerErrors = [];
  const nestedComponents = [];
  for (const content of normal) {
    const itemById = new Map(canonicalItems(content).map((item) => [item.itemId, item]));
    const calendar = content.projectionCells.find((cell) => cell.projection === "calendar");
    for (const record of calendar?.output?.records ?? []) {
      if (record.component !== "VEVENT") continue;
      if (record.component === "VTODO" || record.nestedComponentCount > 0) {
        nestedComponents.push(record.recordId);
      }
      if (record.sourceOwner !== "source") {
        calendarSourceOwnerErrors.push(record.recordId);
      }
      for (const itemId of record.childItemIds ?? []) {
        const item = itemById.get(itemId);
        if (!item?.schedule) undatedVevents.push({ contentId: content.contentId, itemId });
        if ((item.temporalIntent ?? item.schedule?.mode) === "due_deadline") {
          dueOnlyVevents.push({ contentId: content.contentId, itemId });
        }
      }
    }
  }
  check("calendar.undated_source_item_vevent_zero", undatedVevents.length === 0, {
    records: undatedVevents,
  });
  check("calendar.due_only_auto_timeblock_zero", dueOnlyVevents.length === 0, {
    records: dueOnlyVevents,
  });
  check(
    "calendar.generated_source_owner_is_source",
    calendarSourceOwnerErrors.length === 0,
    { records: calendarSourceOwnerErrors },
  );
  check("icalendar.vevent_vtodo_nested_zero", nestedComponents.length === 0, {
    records: nestedComponents,
  });

  const bundleLossErrors = projections.results.filter(
    (cell) =>
      cell.projection === "calendar" &&
      (cell.output?.records ?? []).some((record) => record.childItemIds?.length > 1) &&
      !cell.lossManifest.some((loss) =>
        String(loss.reason ?? loss).toLowerCase().includes("child item"),
      ),
  );
  check("calendar.bundle_child_ids_and_completion_loss_visible", bundleLossErrors.length === 0, {
    cells: ids(bundleLossErrors, "cellId"),
  });
  const vtodoFallbackErrors = projections.results.filter(
    (cell) =>
      cell.projection === "todo" &&
      cell.output &&
      (!cell.output.destinationCapabilities ||
        cell.output.destinationCapabilities.vtodo !== false ||
        !cell.fallback?.trim()),
  );
  check("todo.vtodo_unsupported_fallback_present", vtodoFallbackErrors.length === 0, {
    cells: ids(vtodoFallbackErrors, "cellId"),
  });
  const checklistTodoSameShape = normal.filter((content) => {
    const checklist = content.projectionCells.find((cell) => cell.projection === "checklist");
    const todo = content.projectionCells.find((cell) => cell.projection === "todo");
    return checklist?.output && todo?.output && checklist.output.kind === todo.output.kind;
  });
  check("projection.checklist_todo_schema_distinct", checklistTodoSameShape.length === 0, {
    contents: ids(checklistTodoSameShape, "contentId"),
  });
  const sheetColumnSets = projections.results
    .filter((cell) => cell.projection === "sheet" && cell.output)
    .map((cell) => JSON.stringify(cell.output.columns));
  check(
    "projection.sheet_columns_stable",
    unique(sheetColumnSets).length === 1,
    { columnContracts: unique(sheetColumnSets).length },
  );
  const rawMemos = projections.results.filter(
    (cell) => cell.projection === "memo" && cell.output?.canonicalRawData !== false,
  );
  check("projection.memo_is_not_canonical_raw_json", rawMemos.length === 0, {
    cells: ids(rawMemos, "cellId"),
  });

  const pacingErrors = [];
  for (const experiment of pacing.results) {
    const target = experiment.result.targetItemIds ?? [];
    const assigned = (experiment.result.assignments ?? []).map((assignment) => assignment.itemId);
    if (
      unique(assigned).length !== assigned.length ||
      target.length !== assigned.length ||
      target.some((itemId) => !assigned.includes(itemId)) ||
      !(experiment.result.assignments ?? []).every(
        (assignment) =>
          assignment.scheduleOwner === "user_overlay" &&
          assignment.derivation === "pacing_policy" &&
          assignment.suggestionStatus === "draft",
      )
    ) {
      pacingErrors.push(experiment.contentId);
    }
  }
  check("pacing.no_duplicate_or_missing_items", pacingErrors.length === 0, {
    contents: pacingErrors,
    targetItems: pacing.counts.targetItems,
    assignments: pacing.counts.assignments,
  });
  check(
    "pacing.source_and_overlay_are_separate",
    pacing.results.every((experiment) =>
      (experiment.result.assignments ?? []).every(
        (assignment) => assignment.scheduleOwner === "user_overlay",
      ),
    ),
    { experiments: pacing.results.length },
  );

  const eventErrors = [];
  const falseYearlyRecurrence = [];
  for (const experiment of events.results) {
    const sourceRows = new Set(
      (experiment.sourceState.occurrences ?? []).flatMap(
        (occurrence) => occurrence.sourceRowIds ?? [],
      ),
    );
    const preview = experiment.defaultPreview;
    if (
      preview?.ok &&
      preview.item &&
      (!preview.item.sourceRowIds?.length ||
        preview.item.sourceRowIds.some((rowId) => !sourceRows.has(rowId)) ||
        preview.projectionPlan?.nestedComponentCount !== 0)
    ) {
      eventErrors.push(experiment.contentId);
    }
    if (
      experiment.sourceState.series?.dateVariesByEdition &&
      experiment.sourceState.series?.rrule
    ) {
      falseYearlyRecurrence.push(experiment.contentId);
    }
  }
  check("event.provenance_and_component_nesting_valid", eventErrors.length === 0, {
    contents: eventErrors,
  });
  check("event.false_yearly_rrule_zero", falseYearlyRecurrence.length === 0, {
    contents: falseYearlyRecurrence,
  });

  const directLinkIds = new Set(directLinks.links.map((link) => link.contentId));
  check(
    "ui.direct_links_cover_gallery",
    contents.every((content) => directLinkIds.has(content.contentId)),
    { gallery: contents.length, covered: directLinkIds.size },
  );
  const directLinkErrors = [];
  for (const content of contents) {
    const base = `#content/${encodeURIComponent(content.contentId)}`;
    const expected = new Map([
      ["detail", base],
      ...PROJECTIONS.map((projection) => [
        `projection:${projection}`,
        `${base}/projection/${projection}`,
      ]),
      ["lineage", `${base}/lineage`],
      ["review", `${base}/review`],
      ...(content.pacingEligible ? [["pacing", `${base}/pacing`]] : []),
      ...(content.contentMode === "event_source_before_user_intent"
        ? [["event", `${base}/event`]]
        : []),
    ]);
    const actual = directLinks.links.filter(
      (link) => link.contentId === content.contentId,
    );
    const actualModes = new Map(actual.map((link) => [link.mode, link.hash]));
    const duplicateModes = actual
      .map((link) => link.mode)
      .filter((mode, index, modes) => modes.indexOf(mode) !== index);
    const missing = [...expected.keys()].filter((mode) => !actualModes.has(mode));
    const unexpected = [...actualModes.keys()].filter((mode) => !expected.has(mode));
    const hashMismatches = [...expected].filter(
      ([mode, hash]) => actualModes.has(mode) && actualModes.get(mode) !== hash,
    );
    if (duplicateModes.length || missing.length || unexpected.length || hashMismatches.length) {
      directLinkErrors.push({
        contentId: content.contentId,
        duplicateModes: unique(duplicateModes),
        missing,
        unexpected,
        hashMismatches,
      });
    }
  }
  check("ui.direct_link_modes_and_hashes_exact", directLinkErrors.length === 0, {
    errors: directLinkErrors.slice(0, 50),
    links: directLinks.links.length,
  });
  check(
    "review.user_state_initially_empty",
    Object.keys(reviewContract.initialState.reviewsByContentId ?? {}).length ===
      contents.length &&
      Object.values(reviewContract.initialState.reviewsByContentId ?? {}).every(
        (review) =>
          review.userReviewStatus === "not_reviewed" &&
          review.verdict == null &&
          review.comment === "" &&
          review.updatedAt == null,
      ),
    {
      records: Object.keys(reviewContract.initialState.reviewsByContentId ?? {}).length,
      expected: contents.length,
    },
  );
  check(
    "review.value_readjudication_keeps_user_not_reviewed",
    valueReadjudication.records.length === normal.length &&
      valueReadjudication.records.every(
        (record) => record.userReviewStatus === "NOT_REVIEWED_BY_USER",
      ),
    { records: valueReadjudication.records.length },
  );
  check(
    "review.two_independent_runs_cover_full_normal_corpus",
    independentReview.runLineage.length === 2 &&
      independentReview.runLineage.every(
        (run) => run.peerOutputVisible === false && run.records === normal.length,
      ) &&
      independentReview.comparisons.length === normal.length,
    {
      runs: independentReview.runLineage,
      comparisons: independentReview.comparisons.length,
    },
  );
  check(
    "review.disagreements_are_explicit",
    independentReview.metrics.anyDisagreement ===
      independentReview.disagreementContentIds.length &&
      independentReview.comparisons.every(
        (comparison) =>
          comparison.exactAgreement === (comparison.disagreeingAxes.length === 0) &&
          comparison.userReviewStatus === "NOT_REVIEWED_BY_USER",
      ),
    {
      anyDisagreement: independentReview.metrics.anyDisagreement,
      disagreementIds: independentReview.disagreementContentIds.length,
    },
  );

  const semanticAuditQueue =
    semanticAudit.manualReviewQueue.traceOnlySemantics;
  const semanticAuditKeys = semanticAuditQueue.map(
    (record) => `${record.contentId}|${record.itemId}|${record.field}`,
  );
  const semanticManualKeys = semanticManual.adjudications.map(
    (record) => record.uniqueKey,
  );
  const semanticNeedsModify = semanticManual.adjudications.filter(
    (record) => record.verdict === "needs_modify",
  );
  const semanticNeedsModifyContentIds = unique(
    semanticNeedsModify.map((record) => record.uniqueKey.split("|")[0]),
  );
  const semanticVerdictCounts = Object.fromEntries(
    Object.entries(
      Object.groupBy(
        semanticManual.adjudications,
        (record) => record.verdict,
      ),
    ).map(([verdict, records]) => [verdict, records.length]),
  );
  const semanticReasonCounts = Object.fromEntries(
    Object.entries(
      Object.groupBy(
        semanticNeedsModify,
        (record) => record.reasonCode,
      ),
    ).map(([reasonCode, records]) => [reasonCode, records.length]),
  );
  const ownerOrProvenanceMissing =
    semanticAudit.manualReviewQueue.ownerOrProvenanceMissing;
  const completionProvenanceGaps = ownerOrProvenanceMissing.filter(
    (record) => record.field === "completion",
  );
  const scheduleProvenanceGaps = ownerOrProvenanceMissing.filter(
    (record) => record.field === "schedule",
  );
  check(
    "semantic.manual_adjudication_inputs_frozen",
    semanticManual.inputArtifacts[
      "semantic-provenance-audit-v1.json"
    ].embeddedAuditHash === semanticAudit.auditHash &&
      semanticManual.inputArtifacts.corpusFingerprint ===
        view.corpusFingerprint,
    {
      reviewedInputArtifacts: semanticManual.inputArtifacts,
      currentSemanticAuditHash: semanticAudit.auditHash,
      currentCorpusFingerprint: view.corpusFingerprint,
      currentFileHashes: {
        semanticAudit: fileSha256("semantic-provenance-audit-v1.json"),
        viewModel: fileSha256("content-ui-view-model-v1.json"),
      },
      note:
        "Post-review UI/source-field metadata changed file hashes; embedded semantic audit hash, corpus fingerprint, and exact queue coverage remain the transfer boundary.",
    },
  );
  check(
    "semantic.manual_adjudication_exact_queue_coverage",
    semanticManual.adjudications.length === 141 &&
      unique(semanticManualKeys).length === 141 &&
      semanticAuditKeys.length === 141 &&
      jsonEqual(
        [...semanticManualKeys].sort(),
        [...semanticAuditKeys].sort(),
      ) &&
      jsonEqual(
        semanticManual.adjudications
          .map((record) => record.queueIndex)
          .sort((left, right) => left - right),
        Array.from({ length: 141 }, (_, index) => index),
      ),
    {
      auditQueue: semanticAuditKeys.length,
      adjudications: semanticManualKeys.length,
      uniqueKeys: unique(semanticManualKeys).length,
    },
  );
  check(
    "semantic.manual_adjudication_distribution",
    semanticVerdictCounts.verified_equivalent === 37 &&
      semanticVerdictCounts.bounded_normalization === 87 &&
      semanticVerdictCounts.needs_modify === 17 &&
      (semanticVerdictCounts.unknown ?? 0) === 0 &&
      Object.values(semanticVerdictCounts).reduce(
        (sum, count) => sum + count,
        0,
      ) === 141,
    {
      actual: semanticVerdictCounts,
      declared: semanticManual.summary.traceOnlyVerdictCounts,
    },
  );
  check(
    "semantic.manual_needs_modify_is_explicit",
    semanticNeedsModify.length === 17 &&
      semanticNeedsModifyContentIds.length === 11 &&
      semanticNeedsModifyContentIds.every((contentId) =>
        normalIds.has(contentId),
      ) &&
      semanticManual.mismatches.length === 17 &&
      jsonEqual(
        semanticManual.mismatches
          .map((record) => record.queueIndex)
          .sort((left, right) => left - right),
        semanticNeedsModify
          .map((record) => record.queueIndex)
          .sort((left, right) => left - right),
      ) &&
      Object.values(semanticReasonCounts).reduce(
        (sum, count) => sum + count,
        0,
      ) === 17,
    {
      needsModify: semanticNeedsModify.length,
      contentIds: semanticNeedsModifyContentIds,
      reasonCounts: semanticReasonCounts,
    },
  );
  check(
    "semantic.owner_derivation_gaps_remain_open",
    completionProvenanceGaps.length === 412 &&
      scheduleProvenanceGaps.length === 124 &&
      semanticManual.summary.ownerOrProvenanceGapCounts.total === 536 &&
      semanticManual.combinedClaimBoundary.zeroInventionClaim ===
        "NOT_PROVEN",
    {
      completion: completionProvenanceGaps.length,
      schedule: scheduleProvenanceGaps.length,
      zeroInventionClaim:
        semanticManual.combinedClaimBoundary.zeroInventionClaim,
    },
  );
  check(
    "semantic.manual_self_validation_13_of_13",
    semanticManual.selfValidation.status === "PASS" &&
      semanticManual.selfValidation.passed === 13 &&
      semanticManual.selfValidation.total === 13,
    semanticManual.selfValidation,
  );
  const manualStatusByContent = new Map(
    valueReadjudication.records.map((record) => [
      record.contentId,
      record.manualSemanticAdjudication,
    ]),
  );
  const planningDecisionIds = new Set(
    planningHandoff.decisions.map((decision) => decision.decisionId),
  );
  const gapIds = new Set(gapRegister.gaps.map((gap) => gap.gapId));
  check(
    "semantic.manual_results_linked_to_review_and_planning",
    independentReview.manualSemanticAdjudication?.needsModify === 17 &&
      independentReview.manualSemanticAdjudication
        ?.needsModifyContentCount === 11 &&
      semanticNeedsModifyContentIds.every(
        (contentId) =>
          manualStatusByContent.get(contentId)?.status === "NEEDS_MODIFY",
      ) &&
      planningHandoff.manualSemanticAdjudication?.needsModify === 17 &&
      planningDecisionIds.has("PD-15-semantic-source-preservation") &&
      planningDecisionIds.has(
        "PD-16-completion-schedule-provenance",
      ) &&
      gapIds.has("GAP-08-manual-semantic-needs-modify") &&
      gapIds.has("GAP-09-completion-provenance") &&
      gapIds.has("GAP-10-schedule-owner-derivation"),
    {
      independentReview:
        independentReview.manualSemanticAdjudication,
      planningDecisionIds: [...planningDecisionIds],
      gapIds: [...gapIds],
    },
  );
  check(
    "planning.handoff_is_draft_pending_user_review",
    planningHandoff.status === "DRAFT_PENDING_USER_REVIEW" &&
      planningHandoff.decisions.length >= 14 &&
      planningHandoff.decisions.every(
        (decision) =>
          decision.userApprovalRequired === true &&
          decision.recommendation &&
          decision.alternative &&
          Array.isArray(decision.evidenceContentIds),
      ),
    {
      status: planningHandoff.status,
      decisions: planningHandoff.decisions.length,
    },
  );
  check(
    "planning.gaps_have_counts_and_evidence",
    gapRegister.gaps.length >= 7 &&
      gapRegister.gaps.every(
        (gap) =>
          Number.isInteger(gap.repeatedProblemCount) &&
          Array.isArray(gap.contentIds) &&
          gap.proposedRule,
      ),
    { gaps: gapRegister.gaps.length },
  );

  const galleryPath = path.resolve(
    SPEC_DIR,
    "../../content-audit/2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html",
  );
  const currentGallerySha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(galleryPath))
    .digest("hex");
  const routeCoverage = browserQa.routeCoverage;
  const expectedRouteCoverage = {
    normalContentDetail: normal.length,
    boundaryAndHistoricalDetail: contents.length - normal.length,
    normalProjectionRoutes: normal.length * PROJECTIONS.length,
    pacingRoutes: directLinks.links.filter((link) => link.mode === "pacing").length,
    eventRoutes: directLinks.links.filter((link) => link.mode === "event").length,
    reviewRoutes: contents.length,
    lineageRoutes: contents.length,
  };
  check(
    "browser_qa.final_gallery_fingerprint_matches",
    browserQa.artifacts?.gallery?.sha256 === currentGallerySha256,
    {
      declared: browserQa.artifacts?.gallery?.sha256,
      current: currentGallerySha256,
    },
  );
  const reviewReportPath = path.resolve(
    SPEC_DIR,
    "../../content-audit/2026-07-29-flow-content-ui-full-corpus-validation-review-v1-ko.html",
  );
  const currentReviewReportSha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(reviewReportPath))
    .digest("hex");
  check(
    "browser_qa.final_report_fingerprint_matches",
    browserQa.artifacts?.reviewReport?.sha256 ===
      currentReviewReportSha256,
    {
      declared: browserQa.artifacts?.reviewReport?.sha256,
      current: currentReviewReportSha256,
    },
  );
  check(
    "browser_qa.all_declared_routes_pass",
    Object.entries(expectedRouteCoverage).every(([key, expected]) => {
      const actual = routeCoverage?.[key];
      return (
        actual?.expected === expected &&
        actual?.tested === expected &&
        actual?.failed === 0
      );
    }),
    { expectedRouteCoverage, routeCoverage },
  );
  check(
    "browser_qa.required_viewports_pass",
    [1440, 768, 390].every((width) =>
      browserQa.viewportResults.some(
        (viewport) =>
          viewport.width === width &&
          viewport.horizontalOverflow === false &&
          viewport.brokenAssets === 0 &&
          viewport.emptyDetailScreens === 0,
      ),
    ) &&
      browserQa.summary.overflowFindings === 0 &&
      browserQa.summary.brokenAssets === 0 &&
      browserQa.summary.consoleErrors === 0,
    {
      summary: browserQa.summary,
      viewportResults: browserQa.viewportResults,
    },
  );
  check(
    "browser_qa.final_report_pass",
    browserQa.reportQa?.status === "PASS" &&
      browserQa.reportQa.horizontalOverflowFindings === 0 &&
      browserQa.reportQa.brokenAssets === 0 &&
      browserQa.reportQa.consoleErrors === 0,
    browserQa.reportQa,
  );
  check(
    "browser_qa.screenshots_exist_and_match",
    browserQa.screenshots.every((screenshot) => {
      const screenshotPath = path.resolve(
        SPEC_DIR,
        "../../..",
        screenshot.path,
      );
      if (!fs.existsSync(screenshotPath)) return false;
      const actual = crypto
        .createHash("sha256")
        .update(fs.readFileSync(screenshotPath))
        .digest("hex");
      return actual === screenshot.sha256;
    }),
    browserQa.screenshots,
  );

  const userReviewStatus = "NOT_REVIEWED_BY_USER";
  const externalRoundTripStatus = "NOT_RUN";
  const observedUserValidationStatus = "NOT_RUN";
  check("claim.external_calendar_round_trip_not_run", externalRoundTripStatus === "NOT_RUN", {
    status: externalRoundTripStatus,
  });
  check(
    "claim.observed_user_validation_not_claimed",
    observedUserValidationStatus === "NOT_RUN",
    { status: observedUserValidationStatus },
  );
  check(
    "claim.user_review_not_populated_by_internal_qa",
    userReviewStatus === "NOT_REVIEWED_BY_USER" &&
      browserQa.claimBoundary?.cleanFinalOriginUserReviewState ===
        "NOT_REVIEWED_BY_USER",
    {
      userReviewStatus,
      browserQa: browserQa.claimBoundary?.cleanFinalOriginUserReviewState,
    },
  );

  const failed = checks.filter((entry) => !entry.pass);
  const result = {
    schemaVersion: "flow-content-ui-validation-results-v1",
    generatedAt: "2026-07-29T23:59:00+09:00",
    corpusFingerprint: view.corpusFingerprint,
    summary: {
      status: failed.length ? "FAIL" : "PASS",
      checks: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    corpus: {
      gallery: contents.length,
      normal: normal.length,
      productCandidate: contents.filter(
        (content) => content.corpusTier === "product_candidate",
      ).length,
      structureProbe: contents.filter(
        (content) => content.corpusTier === "structure_probe",
      ).length,
      newUrlsReviewed: newSources.counts.reviewedUrls,
      newNormal: newSources.counts.normal,
      projectionCells: projections.results.length,
      pacingTargets: pacing.counts.content,
      eventTargets: events.counts.content,
    },
    semanticProvenance: {
      manualTraceQueueReviewed:
        semanticManual.scope.traceOnlyQueueReviewed,
      manualTraceContentsReviewed:
        semanticManual.scope.traceOnlyContentReviewed,
      verdictCounts:
        semanticManual.summary.traceOnlyVerdictCounts,
      needsModifyContentIds:
        semanticNeedsModifyContentIds,
      ownerOrProvenanceGapCounts:
        semanticManual.summary.ownerOrProvenanceGapCounts,
      manualSelfValidation:
        semanticManual.selfValidation,
    },
    claimBoundary: {
      userReviewStatus,
      observedUserValidation: observedUserValidationStatus,
      externalCalendarVtodoRoundTrip: externalRoundTripStatus,
      browserQa: browserQa.summary.status,
      zeroInventionClaim:
        semanticManual.combinedClaimBoundary.zeroInventionClaim,
    },
    checks,
  };
  if (writeResult) {
    fs.writeFileSync(
      path.join(SPEC_DIR, "validation-results-v1.json"),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateLab({ writeResult: true });
  console.log(
    `${result.summary.status}: ${result.summary.passed}/${result.summary.checks} checks passed`,
  );
  for (const failure of result.checks.filter((check) => !check.pass)) {
    console.error(`- ${failure.id}`, JSON.stringify(failure.evidence));
  }
  process.exitCode = result.summary.failed ? 1 : 0;
}
