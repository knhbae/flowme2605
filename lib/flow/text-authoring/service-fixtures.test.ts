import assert from "node:assert/strict";
import test from "node:test";

import { buildAuthoringArtifactProjection } from "./artifact-projection";
import { createTextAuthoringDocument } from "./parser";
import { P0_TEXT_AUTHORING_FIXTURES } from "./service-fixtures";

const ARTIFACTS = ["calendar", "todo", "sheet", "memo"] as const;

for (const fixture of P0_TEXT_AUTHORING_FIXTURES) {
  test(`P0-00 fixture matrix: ${fixture.id}`, () => {
    const document = createTextAuthoringDocument(fixture.source, {
      documentId: `p0-fixture-${fixture.id}`,
      fixtureVersion: "text-authoring-service-p0-v1",
      ownership: "creator",
      now: "2026-08-11T00:00:00.000Z",
    });
    const projection = buildAuthoringArtifactProjection(document);
    const explicitRootItems = fixture.source
      .split(/\r?\n/u)
      .filter((line) => /^- \[[ xX]\]\s+/u.test(line)).length;
    const checklistEntries = document.parseResult.canonical.items.reduce(
      (count, item) => count + (item.subchecks?.length ?? 0),
      0,
    );
    const issueTypes = document.parseResult.issues.map((issue) => issue.type);
    const blockingIssueCount = document.parseResult.issues.filter(
      (issue) => issue.blocking,
    ).length;

    assert.equal(document.rawText, fixture.source);
    assert.equal(
      document.parseResult.canonical.items.length,
      fixture.expected.canonicalItems,
    );
    assert.equal(explicitRootItems, fixture.expected.explicitRootItems);
    assert.equal(checklistEntries, fixture.expected.checklistEntries);
    assert.deepEqual(issueTypes, fixture.expected.issueTypes);
    assert.equal(blockingIssueCount, fixture.expected.blockingIssueCount);
    for (const artifact of ARTIFACTS) {
      assert.equal(
        projection.artifacts[artifact].count,
        fixture.expected.projectionCounts[artifact],
        `${fixture.id} ${artifact} projection count`,
      );
    }
    assert.equal(projection.sourceMutationCount, 0);

    const sourceRowIds = new Set(
      document.parseResult.canonical.sourceRows.map((row) => row.sourceRowId),
    );
    assert.equal(
      document.parseResult.canonical.items.every(
        (item) =>
          item.sourceRowIds.length > 0 &&
          item.sourceRowIds.every((sourceRowId) =>
            sourceRowIds.has(sourceRowId),
          ),
      ),
      true,
      `${fixture.id} canonical Items must retain source lineage`,
    );

    const inventedActionCount =
      fixture.expected.explicitRootItems === 0
        ? projection.artifacts.todo.count
        : Math.max(
            0,
            document.parseResult.canonical.items.length -
              fixture.expected.canonicalItems,
          );
    assert.equal(inventedActionCount, fixture.expected.inventedActionCount);
  });
}

test("P0-00 finite repeat shares one ordered occurrence set across all four projections", () => {
  const fixture = P0_TEXT_AUTHORING_FIXTURES.find(
    (candidate) => candidate.id === "finite-repeat",
  );
  assert.ok(fixture);
  const document = createTextAuthoringDocument(fixture.source, {
    documentId: "p0-fixture-finite-repeat",
    now: "2026-08-11T00:00:00.000Z",
  });
  const projection = buildAuthoringArtifactProjection(document);
  const expectedOccurrenceIds = projection.artifacts.calendar.rows.map(
    (row) => row.occurrenceId,
  );

  assert.equal(new Set(expectedOccurrenceIds).size, 3);
  for (const artifact of ARTIFACTS) {
    assert.deepEqual(
      projection.artifacts[artifact].rows.map((row) => row.occurrenceId),
      expectedOccurrenceIds,
    );
    assert.deepEqual(
      projection.artifacts[artifact].rows.map((row) => row.date),
      ["2026-08-11", "2026-08-12", "2026-08-13"],
    );
  }
});
