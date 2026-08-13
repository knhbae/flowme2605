export type TextAuthoringSourceComparisonKind = "added" | "removed" | "changed";

export type TextAuthoringSourceComparisonBlock = {
  blockId: string;
  kind: TextAuthoringSourceComparisonKind;
  beforeStartLine?: number;
  afterStartLine?: number;
  beforeLines: string[];
  afterLines: string[];
};

export type TextAuthoringSourceComparison = {
  differs: boolean;
  blocks: TextAuthoringSourceComparisonBlock[];
  addedLineCount: number;
  removedLineCount: number;
  changedBlockCount: number;
};

type DiffOperation = {
  kind: "equal" | "added" | "removed";
  text: string;
  beforeLine?: number;
  afterLine?: number;
};

const MAX_LCS_CELLS = 250_000;

function sourceLines(value: string): string[] {
  const normalized = value.replace(/\r\n?/gu, "\n");
  if (!normalized) return [];
  return normalized.split("\n");
}

function fallbackOperations(
  beforeLines: string[],
  afterLines: string[],
): DiffOperation[] {
  return [
    ...beforeLines.map((text, index) => ({
      kind: "removed" as const,
      text,
      beforeLine: index + 1,
    })),
    ...afterLines.map((text, index) => ({
      kind: "added" as const,
      text,
      afterLine: index + 1,
    })),
  ];
}

function buildOperations(
  beforeLines: string[],
  afterLines: string[],
): DiffOperation[] {
  if (beforeLines.length * afterLines.length > MAX_LCS_CELLS) {
    return fallbackOperations(beforeLines, afterLines);
  }

  const rows = beforeLines.length + 1;
  const columns = afterLines.length + 1;
  const lengths = Array.from({ length: rows }, () => new Uint16Array(columns));

  for (
    let beforeIndex = beforeLines.length - 1;
    beforeIndex >= 0;
    beforeIndex -= 1
  ) {
    for (
      let afterIndex = afterLines.length - 1;
      afterIndex >= 0;
      afterIndex -= 1
    ) {
      lengths[beforeIndex][afterIndex] =
        beforeLines[beforeIndex] === afterLines[afterIndex]
          ? lengths[beforeIndex + 1][afterIndex + 1] + 1
          : Math.max(
              lengths[beforeIndex + 1][afterIndex],
              lengths[beforeIndex][afterIndex + 1],
            );
    }
  }

  const operations: DiffOperation[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;
  while (beforeIndex < beforeLines.length && afterIndex < afterLines.length) {
    if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
      operations.push({
        kind: "equal",
        text: beforeLines[beforeIndex],
        beforeLine: beforeIndex + 1,
        afterLine: afterIndex + 1,
      });
      beforeIndex += 1;
      afterIndex += 1;
      continue;
    }

    if (
      lengths[beforeIndex + 1][afterIndex] >=
      lengths[beforeIndex][afterIndex + 1]
    ) {
      operations.push({
        kind: "removed",
        text: beforeLines[beforeIndex],
        beforeLine: beforeIndex + 1,
      });
      beforeIndex += 1;
    } else {
      operations.push({
        kind: "added",
        text: afterLines[afterIndex],
        afterLine: afterIndex + 1,
      });
      afterIndex += 1;
    }
  }

  while (beforeIndex < beforeLines.length) {
    operations.push({
      kind: "removed",
      text: beforeLines[beforeIndex],
      beforeLine: beforeIndex + 1,
    });
    beforeIndex += 1;
  }
  while (afterIndex < afterLines.length) {
    operations.push({
      kind: "added",
      text: afterLines[afterIndex],
      afterLine: afterIndex + 1,
    });
    afterIndex += 1;
  }

  return operations;
}

export function compareTextAuthoringSources(
  before: string,
  after: string,
): TextAuthoringSourceComparison {
  const beforeLines = sourceLines(before);
  const afterLines = sourceLines(after);
  if (
    beforeLines.length === afterLines.length &&
    beforeLines.every((line, index) => line === afterLines[index])
  ) {
    return {
      differs: false,
      blocks: [],
      addedLineCount: 0,
      removedLineCount: 0,
      changedBlockCount: 0,
    };
  }

  const operations = buildOperations(beforeLines, afterLines);
  const blocks: TextAuthoringSourceComparisonBlock[] = [];
  let pending: DiffOperation[] = [];

  const flush = () => {
    if (pending.length === 0) return;
    const removed = pending.filter((operation) => operation.kind === "removed");
    const added = pending.filter((operation) => operation.kind === "added");
    blocks.push({
      blockId: `source-change-${blocks.length + 1}`,
      kind:
        removed.length > 0 && added.length > 0
          ? "changed"
          : removed.length > 0
            ? "removed"
            : "added",
      ...(removed[0]?.beforeLine
        ? { beforeStartLine: removed[0].beforeLine }
        : {}),
      ...(added[0]?.afterLine ? { afterStartLine: added[0].afterLine } : {}),
      beforeLines: removed.map((operation) => operation.text),
      afterLines: added.map((operation) => operation.text),
    });
    pending = [];
  };

  operations.forEach((operation) => {
    if (operation.kind === "equal") {
      flush();
      return;
    }
    pending.push(operation);
  });
  flush();

  return {
    differs: blocks.length > 0,
    blocks,
    addedLineCount: blocks.reduce(
      (total, block) => total + block.afterLines.length,
      0,
    ),
    removedLineCount: blocks.reduce(
      (total, block) => total + block.beforeLines.length,
      0,
    ),
    changedBlockCount: blocks.filter((block) => block.kind === "changed")
      .length,
  };
}
