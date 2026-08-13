import assert from "node:assert/strict";
import test from "node:test";

import { compareTextAuthoringSources } from "./source-comparison";

test("source comparison reports changed, added, and removed blocks with line numbers", () => {
  const comparison = compareTextAuthoringSources(
    ["# 제목", "- [ ] 이전", "  - 설명: 유지", "삭제할 메모"].join("\n"),
    ["# 제목", "- [ ] 이후", "  - 설명: 유지", "추가한 메모"].join("\n"),
  );

  assert.equal(comparison.differs, true);
  assert.equal(comparison.blocks.length, 2);
  assert.deepEqual(comparison.blocks[0], {
    blockId: "source-change-1",
    kind: "changed",
    beforeStartLine: 2,
    afterStartLine: 2,
    beforeLines: ["- [ ] 이전"],
    afterLines: ["- [ ] 이후"],
  });
  assert.deepEqual(comparison.blocks[1], {
    blockId: "source-change-2",
    kind: "changed",
    beforeStartLine: 4,
    afterStartLine: 4,
    beforeLines: ["삭제할 메모"],
    afterLines: ["추가한 메모"],
  });
});

test("source comparison treats CRLF and LF as the same source", () => {
  assert.deepEqual(
    compareTextAuthoringSources("첫 줄\r\n둘째 줄", "첫 줄\n둘째 줄"),
    {
      differs: false,
      blocks: [],
      addedLineCount: 0,
      removedLineCount: 0,
      changedBlockCount: 0,
    },
  );
});

test("source comparison remains bounded for very long sources", () => {
  const before = Array.from(
    { length: 600 },
    (_, index) => `이전 ${index}`,
  ).join("\n");
  const after = Array.from({ length: 600 }, (_, index) => `이후 ${index}`).join(
    "\n",
  );
  const comparison = compareTextAuthoringSources(before, after);

  assert.equal(comparison.differs, true);
  assert.equal(comparison.blocks.length, 1);
  assert.equal(comparison.blocks[0].kind, "changed");
  assert.equal(comparison.removedLineCount, 600);
  assert.equal(comparison.addedLineCount, 600);
});
