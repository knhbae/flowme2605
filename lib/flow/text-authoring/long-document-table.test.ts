import assert from "node:assert/strict";
import test from "node:test";

import { buildAuthoringArtifactProjection } from "./artifact-projection";
import { buildAuthoringSheetExportTable } from "./file-export";
import {
  LONG_DOCUMENT_MARKDOWN_ESCAPED_PIPE_FIXTURE,
  LONG_DOCUMENT_MIXED_CRLF_FIXTURE,
  LONG_DOCUMENT_TSV_MULTILINE_FIXTURE,
} from "./long-document-table-fixtures";
import {
  analyzeAuthoringLongDocument,
  locateAuthoringSource,
} from "./long-document-table";
import {
  buildTextAuthoringLongDocumentRuntimeView,
  createTextAuthoringDocument,
} from "./parser";
import { validateTextAuthoringDocument } from "./validation";

test("mixed raw blocks and CRLF CSV round-trip with exact block, row, and cell locators", () => {
  const raw = LONG_DOCUMENT_MIXED_CRLF_FIXTURE;
  const analysis = analyzeAuthoringLongDocument(raw, { enabled: true });
  assert.equal(analysis.status, "partially-structured");
  assert.equal(analysis.tables.length, 1);
  assert.ok(analysis.blocks.some((block) => block.kind === "blank"));
  const fence = analysis.blocks.find((block) => block.kind === "code_fence");
  assert.ok(fence);
  assert.equal(fence.locator.endLine - fence.locator.startLine, 3);
  assert.equal(
    locateAuthoringSource(raw, fence.locator).rawText,
    fence.rawText,
  );

  const table = analysis.tables[0];
  assert.equal(table.state, "table-safe");
  assert.deepEqual(table.headers, ["이름", "설명", "링크", "가격", "빈칸"]);
  assert.deepEqual(table.rows, [
    ["첫째", "두 줄의\r\n설명", "https://example.com/a", "₩12,000", ""],
  ]);
  assert.equal(table.logicalCellCount, 10);
  for (const row of table.sourceRows) {
    assert.deepEqual(locateAuthoringSource(raw, row.locator), {
      valid: true,
      rawText: row.rawText,
    });
    for (const cell of row.cells) {
      assert.deepEqual(locateAuthoringSource(raw, cell.locator), {
        valid: true,
        rawText: cell.rawText,
      });
    }
  }
});

test("quoted multiline TSV and escaped Markdown pipe keep logical cell shape", () => {
  const tsv = analyzeAuthoringLongDocument(
    LONG_DOCUMENT_TSV_MULTILINE_FIXTURE,
    { enabled: true },
  ).tables[0];
  assert.equal(tsv.state, "table-safe");
  assert.deepEqual(tsv.rows, [
    ["첫째", "두 줄의\r\n설명", "https://example.com/a"],
  ]);

  const markdown = analyzeAuthoringLongDocument(
    LONG_DOCUMENT_MARKDOWN_ESCAPED_PIPE_FIXTURE,
    { enabled: true },
  ).tables[0];
  assert.equal(markdown.state, "table-safe");
  assert.deepEqual(markdown.rows, [
    ["첫째", "A | B", "https://example.com/a", ""],
  ]);
});

test("safe source tables stay non-executable and project/export only through Sheet and exact TXT", () => {
  const document = createTextAuthoringDocument(
    LONG_DOCUMENT_MIXED_CRLF_FIXTURE,
    { longDocumentTable: { enabled: true }, now: "2026-08-13T00:00:00.000Z" },
  );
  assert.equal(document.features?.longDocumentTable, true);
  assert.equal(document.parseResult.canonical.items.length, 0);
  assert.equal(validateTextAuthoringDocument(document).valid, true);
  const projection = buildAuthoringArtifactProjection(document);
  assert.equal(projection.artifacts.calendar.rows.length, 0);
  assert.equal(projection.artifacts.todo.rows.length, 0);
  assert.equal(projection.artifacts.sheet.eligible, true);
  assert.equal(projection.artifacts.sheet.longDocumentTables?.length, 1);
  assert.equal(
    projection.artifacts.memo.textBlocks[0].rawText,
    document.rawText,
  );
  assert.deepEqual(buildAuthoringSheetExportTable(projection.artifacts.sheet), {
    columns: ["이름", "설명", "링크", "가격", "빈칸"],
    rows: [["첫째", "두 줄의\r\n설명", "https://example.com/a", "₩12,000", ""]],
  });
});

test("loss-risk blocks Sheet but preserves raw and explicit Items outside the table", () => {
  const raw = [
    "- [ ] 명시적 일정 2026-08-20",
    "",
    "이름,설명",
    "첫째,설명,초과",
  ].join("\n");
  const document = createTextAuthoringDocument(raw, {
    longDocumentTable: { enabled: true },
    now: "2026-08-13T00:00:00.000Z",
  });
  const projection = buildAuthoringArtifactProjection(document);
  assert.equal(
    document.parseResult.longDocument?.tables[0].state,
    "table-loss-risk",
  );
  const block =
    document.parseResult.longDocument?.tableLossManifest.tableBlocks[0];
  assert.ok(block);
  assert.equal(block.tableState, "table-loss-risk");
  assert.equal(block.risk, "possible");
  assert.deepEqual(block.affectedArtifacts, ["sheet"]);
  assert.ok(block.unsupportedShapes.includes("unsafe-sheet-shape"));
  assert.deepEqual(locateAuthoringSource(raw, block.sourceRange), {
    valid: true,
    rawText: "이름,설명\n첫째,설명,초과",
  });
  assert.equal(document.parseResult.canonical.items.length, 1);
  assert.equal(projection.artifacts.calendar.rows.length, 1);
  assert.equal(projection.artifacts.todo.rows.length, 1);
  assert.equal(projection.artifacts.sheet.eligible, false);
  assert.ok(
    projection.artifacts.sheet.losses.some(
      (loss) => loss.reason === "long_document_table_loss_risk",
    ),
  );
  assert.equal(projection.artifacts.memo.textBlocks[0].rawText, raw);
});

test("bytes, lines, and cell budgets fall back to TXT without truncation or Items", () => {
  for (const [raw, limits, expected] of [
    ["가나다", { utf8Bytes: 2 }, "bytes"],
    ["첫째\n둘째", { lines: 1 }, "lines"],
    ["A,B\n1,2", { logicalCells: 3 }, "cells"],
  ] as const) {
    const document = createTextAuthoringDocument(raw, {
      longDocumentTable: { enabled: true, limits },
      now: "2026-08-13T00:00:00.000Z",
    });
    assert.deepEqual(document.parseResult.longDocument?.budget.exceeded, [
      expected,
    ]);
    assert.equal(document.parseResult.longDocument?.status, "txt-only");
    assert.equal(document.parseResult.canonical.items.length, 0);
    assert.equal(document.parseResult.canonical.sourceRows.length, 0);
    assert.equal(document.parseResult.blocks.length, 0);
    assert.equal(document.parseResult.mappings.length, 0);
    assert.equal(document.parseResult.issues.length, 0);
    const manifest = document.parseResult.longDocument?.tableLossManifest;
    assert.match(manifest?.manifestId ?? "", /^table-loss-manifest-/u);
    assert.ok((manifest?.tableBlocks.length ?? 0) <= 1);
    if (expected !== "cells") assert.equal(manifest?.tableBlocks.length, 0);
    const projection = buildAuthoringArtifactProjection(document);
    assert.equal(projection.artifacts.calendar.eligible, false);
    assert.equal(projection.artifacts.todo.eligible, false);
    assert.equal(projection.artifacts.sheet.eligible, false);
    assert.equal(projection.artifacts.memo.textBlocks[0].rawText, raw);
    assert.equal(document.rawText, raw);
  }
  const skipped = analyzeAuthoringLongDocument("A,B\n1,2", {
    enabled: true,
    limits: { utf8Bytes: 1 },
  });
  assert.equal(skipped.tables.length, 0);
  assert.equal(skipped.blocks.length, 1);
  assert.equal(skipped.blocks[0].rawText, "A,B\n1,2");
});

test("explicit gate off keeps table-like input TXT-only without factual Items", () => {
  const raw = "이름,설명\n첫째,기록";
  const document = createTextAuthoringDocument(raw, {
    longDocumentTable: { enabled: false },
    now: "2026-08-13T00:00:00.000Z",
  });
  assert.equal(document.features?.longDocumentTable, false);
  assert.equal(document.parseResult.longDocument?.featureEnabled, false);
  assert.equal(document.parseResult.longDocument?.fallbackActive, true);
  assert.equal(document.parseResult.longDocument?.status, "txt-only");
  assert.equal(document.parseResult.canonical.items.length, 0);
  const projection = buildAuthoringArtifactProjection(document);
  assert.equal(projection.artifacts.todo.rows.length, 0);
  assert.equal(projection.artifacts.calendar.rows.length, 0);
  assert.equal(projection.artifacts.sheet.rows.length, 0);
  assert.equal(projection.artifacts.memo.textBlocks[0].rawText, raw);
  assert.equal(document.rawText, raw);
});

test("omitted gate preserves legacy P0 behavior for stored callers", () => {
  const raw = "이름,설명\n첫째,기록";
  const document = createTextAuthoringDocument(raw, {
    now: "2026-08-13T00:00:00.000Z",
  });
  assert.equal(document.features, undefined);
  assert.ok(document.parseResult.canonical.items.length > 0);
});

test("one-row and empty-header TSV never fall through to Todo or Calendar", () => {
  for (const raw of [
    "값1\t값2\t값3",
    "\t설명\t링크\n첫째\t기록\thttps://example.com/a",
    "앞 문장입니다.\n가격\t10000원\n뒤 문장입니다.",
    "앞 문장입니다.\n\t설명\t링크\n첫째\t기록\thttps://example.com/a\n뒤 문장입니다.",
  ]) {
    const document = createTextAuthoringDocument(raw, {
      longDocumentTable: { enabled: true },
      now: "2026-08-13T00:00:00.000Z",
    });
    const projection = buildAuthoringArtifactProjection(document);
    assert.equal(document.parseResult.canonical.items.length, 0);
    assert.equal(projection.artifacts.todo.rows.length, 0);
    assert.equal(projection.artifacts.calendar.rows.length, 0);
    assert.equal(projection.artifacts.memo.textBlocks[0].rawText, raw);
  }
});

test("tabs inside a fenced code block stay raw and never become a table", () => {
  const raw = ["설명입니다.", "```txt", "가격\t10000원", "```"].join("\n");
  const analysis = analyzeAuthoringLongDocument(raw, { enabled: true });
  assert.equal(analysis.tables.length, 0);
  assert.equal(analysis.tableLossManifest.tableBlocks.length, 0);
  assert.match(analysis.tableLossManifest.manifestId, /^table-loss-manifest-/u);
  const fence = analysis.blocks.find((block) => block.kind === "code_fence");
  assert.ok(fence);
  assert.equal(fence.rawText, "```txt\n가격\t10000원\n```");
});

test("cell overflow retains only bounded TXT analysis and explicit loss trace", () => {
  const raw = `H1,H2,H3\n${Array.from({ length: 12 }, (_, index) => `a${index},b${index},c${index}`).join("\n")}`;
  const document = createTextAuthoringDocument(raw, {
    documentId: "budget-document",
    longDocumentTable: { enabled: true, limits: { logicalCells: 9 } },
    now: "2026-08-13T00:00:00.000Z",
  });
  const analysis = document.parseResult.longDocument;
  assert.deepEqual(analysis?.budget.exceeded, ["cells"]);
  assert.equal(analysis?.tables.length, 0);
  assert.equal(analysis?.blocks.length, 1);
  assert.equal(analysis?.blocks[0].rawText, raw);
  const sheetLoss = analysis?.lossManifest.find(
    (loss) => loss.result === "sheet",
  );
  assert.equal(sheetLoss?.documentId, "budget-document");
  assert.equal(sheetLoss?.contractVersion, "p1-c-long-document-v1");
  assert.equal(sheetLoss?.fallback, "txt-raw-preserved");
  assert.equal(sheetLoss?.reason, "too-large");
  const projection = buildAuthoringArtifactProjection(document);
  assert.equal(projection.artifacts.memo.eligible, true);
  assert.equal(projection.artifacts.memo.textBlocks[0].rawText, raw);
  assert.equal(projection.artifacts.calendar.eligible, false);
  assert.equal(projection.artifacts.todo.eligible, false);
  assert.equal(projection.artifacts.sheet.eligible, false);
});

test("production logical-cell boundary allows exactly 50,000 and blocks 50,001", () => {
  const exactRaw = `${Array.from({ length: 25_000 }, () => "H").join(",")}\n${Array.from({ length: 25_000 }, () => "V").join(",")}`;
  const exact = analyzeAuthoringLongDocument(exactRaw, { enabled: true });
  assert.deepEqual(exact.budget.exceeded, []);
  assert.equal(exact.tables.length, 1);
  assert.equal(exact.tables[0].logicalCellCount, 50_000);
  assert.equal(exact.tableLossManifest.counts.parsed.cells, 50_000);
  assert.equal(exact.tableLossManifest.counts.parsed.cellAccuracy, "exact");

  const overflowRaw = `${Array.from({ length: 25_000 }, () => "H").join(",")}\n${Array.from({ length: 25_001 }, () => "V").join(",")}`;
  const overflow = analyzeAuthoringLongDocument(overflowRaw, { enabled: true });
  assert.deepEqual(overflow.budget.exceeded, ["cells"]);
  assert.equal(overflow.status, "txt-only");
  assert.equal(overflow.tables.length, 0);
  assert.equal(overflow.blocks.length, 1);
  assert.equal(overflow.blocks[0].rawText, overflowRaw);
  assert.equal(overflow.tableLossManifest.counts.source.cells, 50_001);
  assert.equal(
    overflow.tableLossManifest.counts.source.cellAccuracy,
    "lower-bound",
  );
  assert.deepEqual(overflow.tableLossManifest.detectedFormats, ["csv"]);
  assert.equal(overflow.tableLossManifest.tableBlocks.length, 1);
  const overflowBlock = overflow.tableLossManifest.tableBlocks[0];
  assert.equal(overflowBlock.tableState, "budget-blocked");
  assert.equal(
    overflowBlock.sourceRange.rawHash,
    overflow.blocks[0].locator.rawHash,
  );
  assert.deepEqual(
    locateAuthoringSource(overflowRaw, overflowBlock.sourceRange),
    {
      valid: true,
      rawText: overflowRaw,
    },
  );
  assert.deepEqual(overflowBlock.counts, {
    source: {
      rows: 2,
      cells: 50_001,
      rowAccuracy: "lower-bound",
      cellAccuracy: "lower-bound",
    },
    parsed: {
      rows: 0,
      cells: 0,
      rowAccuracy: "exact",
      cellAccuracy: "exact",
    },
    preserved: {
      rows: 2,
      cells: 50_001,
      rowAccuracy: "lower-bound",
      cellAccuracy: "lower-bound",
    },
  });
  assert.equal(overflowBlock.risk, "confirmed");
  assert.deepEqual(overflowBlock.affectedArtifacts, [
    "calendar",
    "todo",
    "sheet",
  ]);
  assert.deepEqual(overflowBlock.unsupportedShapes, [
    "structured-results-over-budget",
  ]);
  assert.deepEqual(overflowBlock.preservedShapes, [
    "raw-source",
    "line-endings",
    "table-raw",
  ]);
  assert.equal(overflowBlock.generatedAt, null);
  assert.ok(
    overflow.lossManifest.every(
      (entry) => entry.fallback === "txt-raw-preserved",
    ),
  );
});

test("Markdown header, separator, and body honor the bounded logical-cell parser", () => {
  const exact = analyzeAuthoringLongDocument(
    "| A | B |\n| --- | --- |\n| 1 | 2 |",
    { enabled: true, limits: { logicalCells: 4 } },
  );
  assert.deepEqual(exact.budget.exceeded, []);
  assert.equal(exact.tables[0].logicalCellCount, 4);
  assert.equal(exact.tableLossManifest.counts.source.cells, 6);
  assert.equal(exact.tableLossManifest.counts.parsed.cells, 4);

  for (const raw of [
    "| A | B |\n| --- | --- |\n| 1 | 2 | 3 |",
    "| A | B |\n| --- | --- | --- |\n| 1 | 2 |",
  ]) {
    const overflow = analyzeAuthoringLongDocument(raw, {
      enabled: true,
      limits: { logicalCells: 4 },
    });
    assert.deepEqual(overflow.budget.exceeded, ["cells"]);
    assert.equal(overflow.tables.length, 0);
    assert.deepEqual(overflow.tableLossManifest.detectedFormats, ["markdown"]);
    assert.equal(
      overflow.tableLossManifest.counts.source.cellAccuracy,
      "lower-bound",
    );
  }
});

test("authoritative table loss manifest is deterministic and revision-traceable", () => {
  const options = { enabled: true, documentId: "manifest-document" } as const;
  const first = analyzeAuthoringLongDocument(
    LONG_DOCUMENT_MIXED_CRLF_FIXTURE,
    options,
  ).tableLossManifest;
  const second = analyzeAuthoringLongDocument(
    LONG_DOCUMENT_MIXED_CRLF_FIXTURE,
    options,
  ).tableLossManifest;
  assert.deepEqual(first, second);
  assert.match(first.manifestId, /^table-loss-manifest-/u);
  assert.equal(first.scope, "document");
  assert.equal(first.encoding, "utf-8");
  assert.equal(first.generatedAt, null);
  assert.equal(first.generatedAtPolicy, "deterministic-analysis-no-timestamp");
  assert.deepEqual(first.detectedFormats, ["csv"]);
  assert.deepEqual(first.delimiters, [","]);
  assert.deepEqual(first.counts, {
    source: {
      rows: 16,
      cells: 10,
      rowAccuracy: "exact",
      cellAccuracy: "exact",
    },
    parsed: {
      rows: 2,
      cells: 10,
      rowAccuracy: "exact",
      cellAccuracy: "exact",
    },
    preserved: {
      rows: 16,
      cells: 10,
      rowAccuracy: "exact",
      cellAccuracy: "exact",
    },
  });
  assert.ok(first.preservedShapes.includes("code-fence"));
  assert.ok(first.preservedShapes.includes("table-cell-boundaries"));
  assert.deepEqual(first.unsupportedShapes, [
    "calendar-from-factual-table",
    "todo-from-factual-table",
  ]);
  assert.equal(first.risk, "none");
  assert.deepEqual(first.affectedArtifacts, []);
  assert.deepEqual(first.fallbacks, [
    "raw-txt",
    "source-download",
    "source-edit",
  ]);
  assert.equal(first.entries.length, 2);
  assert.equal(first.tableBlocks.length, 1);
  const table = analyzeAuthoringLongDocument(
    LONG_DOCUMENT_MIXED_CRLF_FIXTURE,
    options,
  ).tables[0];
  const block = first.tableBlocks[0];
  assert.match(block.blockManifestId, /^table-block-loss-manifest-/u);
  assert.equal(block.tableId, table.tableId);
  assert.equal(block.tableState, "table-safe");
  assert.deepEqual(block.sourceRange, table.locator);
  assert.deepEqual(
    locateAuthoringSource(LONG_DOCUMENT_MIXED_CRLF_FIXTURE, block.sourceRange),
    { valid: true, rawText: table.rawText },
  );
  assert.deepEqual(block.counts, {
    source: {
      rows: 3,
      cells: 10,
      rowAccuracy: "exact",
      cellAccuracy: "exact",
    },
    parsed: {
      rows: 2,
      cells: 10,
      rowAccuracy: "exact",
      cellAccuracy: "exact",
    },
    preserved: {
      rows: 3,
      cells: 10,
      rowAccuracy: "exact",
      cellAccuracy: "exact",
    },
  });
  assert.equal(block.risk, "none");
  assert.deepEqual(block.affectedArtifacts, []);
  assert.deepEqual(block.unsupportedShapes, [
    "calendar-from-factual-table",
    "todo-from-factual-table",
  ]);
  assert.ok(block.preservedShapes.includes("table-row-boundaries"));
  assert.ok(block.preservedShapes.includes("table-cell-boundaries"));
  assert.deepEqual(block.fallbacks, [
    "raw-txt",
    "source-download",
    "source-edit",
  ]);
  assert.equal(block.generatedAt, null);

  const document = createTextAuthoringDocument(
    LONG_DOCUMENT_MIXED_CRLF_FIXTURE,
    {
      documentId: "manifest-document",
      longDocumentTable: { enabled: true },
      now: "2026-08-13T00:00:00.000Z",
    },
  );
  assert.equal(
    document.parseResult.longDocument?.tableLossManifest.workingRevisionId,
    document.revision.revisionId,
  );
  assert.ok(
    document.parseResult.longDocument?.lossManifest.every(
      (entry) => entry.workingRevisionId === document.revision.revisionId,
    ),
  );
  assert.ok(
    document.parseResult.longDocument?.tableLossManifest.tableBlocks.every(
      (entry) =>
        entry.workingRevisionId === document.revision.revisionId &&
        entry.documentId === document.documentId,
    ),
  );
});

test("multiple independent tables block Sheet instead of yielding an empty export", () => {
  const raw = ["A,B", "1,2", "", "C,D", "3,4"].join("\n");
  const document = createTextAuthoringDocument(raw, {
    longDocumentTable: { enabled: true },
    now: "2026-08-13T00:00:00.000Z",
  });
  const projection = buildAuthoringArtifactProjection(document);
  assert.equal(document.parseResult.longDocument?.tables.length, 2);
  const manifest = document.parseResult.longDocument?.tableLossManifest;
  assert.equal(manifest?.tableBlocks.length, 2);
  assert.ok(manifest?.tableBlocks.every((block) => block.risk === "possible"));
  assert.ok(
    manifest?.tableBlocks.every(
      (block) =>
        block.affectedArtifacts.length === 1 &&
        block.affectedArtifacts[0] === "sheet" &&
        block.unsupportedShapes.includes("multiple-table-sheet"),
    ),
  );
  for (const block of manifest?.tableBlocks ?? []) {
    const table = document.parseResult.longDocument?.tables.find(
      (candidate) => candidate.tableId === block.tableId,
    );
    assert.ok(table);
    assert.deepEqual(block.sourceRange, table.locator);
    assert.deepEqual(locateAuthoringSource(raw, block.sourceRange), {
      valid: true,
      rawText: table.rawText,
    });
  }
  assert.equal(projection.artifacts.sheet.eligible, false);
  assert.equal(projection.artifacts.sheet.longDocumentTables, undefined);
  assert.ok(
    projection.artifacts.sheet.losses.some(
      (loss) => loss.reason === "long_document_table_loss_risk",
    ),
  );
});

test("runtime gate off suppresses a persisted P1-C Sheet without mutating saved bytes or feature", () => {
  const saved = createTextAuthoringDocument(LONG_DOCUMENT_MIXED_CRLF_FIXTURE, {
    longDocumentTable: { enabled: true },
    now: "2026-08-13T00:00:00.000Z",
  });
  const before = JSON.stringify(saved);
  const runtime = buildTextAuthoringLongDocumentRuntimeView(saved, false);
  assert.equal(runtime.rawText, saved.rawText);
  assert.equal(runtime.features?.longDocumentTable, true);
  assert.equal(runtime.parseResult.longDocument?.featureEnabled, false);
  assert.equal(runtime.parseResult.longDocument?.fallbackActive, true);
  const projection = buildAuthoringArtifactProjection(runtime);
  assert.equal(projection.artifacts.sheet.eligible, false);
  assert.equal(projection.artifacts.todo.eligible, false);
  assert.equal(projection.artifacts.calendar.eligible, false);
  assert.equal(projection.artifacts.memo.eligible, true);
  assert.equal(projection.artifacts.memo.textBlocks[0].rawText, saved.rawText);
  assert.equal(JSON.stringify(saved), before);
});
