import assert from "node:assert/strict";
import test from "node:test";

import {
  applyFlowEditorChangesToRaw,
  clampFlowEditorSelection,
  createFlowEditorRawSnapshot,
  createFlowEditorSourceAdapter,
  mapFlowEditorSelectionToRaw,
  mapFlowRawSelectionToEditor,
  replaceFlowEditorRawRange,
  restoreFlowEditorRawSnapshot,
} from "./flow-live-editor-adapter";

test("normalizes only editor line endings and maps LF, CRLF, CR, and mixed offsets", () => {
  const rawText = "a\r\nb\rc\nd";
  const adapter = createFlowEditorSourceAdapter(rawText);

  assert.equal(adapter.editorText, "a\nb\nc\nd");
  assert.equal(adapter.preferredLineEnding, "\r\n");
  assert.equal(adapter.rawTextLength, rawText.length);

  const editorToRaw = [0, 1, 3, 4, 5, 6, 7, 8];
  editorToRaw.forEach((rawOffset, editorOffset) => {
    assert.equal(adapter.editorToRawOffset(editorOffset), rawOffset);
  });

  assert.equal(adapter.rawToEditorOffset(1), 1);
  assert.equal(adapter.rawToEditorOffset(2, "before"), 1);
  assert.equal(adapter.rawToEditorOffset(2, "after"), 2);
  assert.equal(adapter.rawToEditorOffset(3), 2);
  assert.equal(adapter.rawToEditorOffset(5), 4);
  assert.equal(adapter.rawToEditorOffset(8), 7);
});

test("chooses the dominant raw ending and breaks a count tie by first appearance", () => {
  assert.equal(
    createFlowEditorSourceAdapter("a\rb\rc\nd").preferredLineEnding,
    "\r",
  );
  assert.equal(
    createFlowEditorSourceAdapter("a\r\nb\rc\nd").preferredLineEnding,
    "\r\n",
  );
  assert.equal(
    createFlowEditorSourceAdapter("no ending").preferredLineEnding,
    "\n",
  );
});

test("contextualizes inserted newlines without changing untouched CRLF source", () => {
  const rawText = "alpha\r\nbeta\r\ngamma";
  const adapter = createFlowEditorSourceAdapter(rawText);
  const result = applyFlowEditorChangesToRaw(
    rawText,
    [{ fromA: 2, toA: 2, insertedText: "X\nY" }],
    adapter,
  );

  assert.equal(result.rawText, "alX\r\nYpha\r\nbeta\r\ngamma");
  assert.ok(Object.isFrozen(result));
});

test("reuses an exact source adapter and rejects any different raw source", () => {
  const rawText = "one\r\ntwo";
  const adapter = createFlowEditorSourceAdapter(rawText);
  assert.equal(
    applyFlowEditorChangesToRaw(
      rawText,
      [{ fromA: 4, toA: 7, insertedText: "TWO" }],
      adapter,
    ).rawText,
    "one\r\nTWO",
  );
  assert.throws(
    () =>
      applyFlowEditorChangesToRaw(
        `${rawText}!`,
        [{ fromA: 0, toA: 0, insertedText: "x" }],
        adapter,
      ),
    /sourceAdapter/u,
  );
  assert.throws(
    () =>
      applyFlowEditorChangesToRaw(
        "one\ntwo!",
        [{ fromA: 0, toA: 0, insertedText: "x" }],
        adapter,
      ),
    /exact raw source/u,
  );
});

test("uses the current mixed-EOL line, then the previous ending at EOF", () => {
  const rawText = "a\rb\r\nc\nd";
  const inCrLfLine = applyFlowEditorChangesToRaw(rawText, [
    { fromA: 3, toA: 3, insertedText: "\nX" },
  ]).rawText;
  const inLfLine = applyFlowEditorChangesToRaw(rawText, [
    { fromA: 5, toA: 5, insertedText: "\nX" },
  ]).rawText;
  const atEnd = applyFlowEditorChangesToRaw(rawText, [
    { fromA: 7, toA: 7, insertedText: "\nX" },
  ]).rawText;

  assert.equal(inCrLfLine, "a\rb\r\nX\r\nc\nd");
  assert.equal(inLfLine, "a\rb\r\nc\nX\nd");
  assert.equal(atEnd, "a\rb\r\nc\nd\nX");
});

test("applies disjoint CodeMirror ranges against the original source in descending order", () => {
  const rawText = "one\r\ntwo\rthree\nfour";
  const result = applyFlowEditorChangesToRaw(rawText, [
    { fromA: 14, toA: 18, insertedText: "FOUR" },
    { fromA: 0, toA: 3, insertedText: "ONE" },
    { fromA: 4, toA: 7, insertedText: "TWO\n2" },
  ]);

  assert.equal(result.rawText, "ONE\r\nTWO\r2\rthree\nFOUR");
});

test("replaces an exact raw range without normalizing inserted source", () => {
  const rawText = "앞\r\n뒤";
  assert.equal(
    replaceFlowEditorRawRange(rawText, 1, 3, "<\rX\n>"),
    "앞<\rX\n>뒤",
  );
  assert.equal(rawText, "앞\r\n뒤");
});

test("maps forward and backward selections without losing direction", () => {
  const adapter = createFlowEditorSourceAdapter("a\r\nb\rc");
  const rawForward = mapFlowEditorSelectionToRaw(adapter, {
    anchor: 1,
    head: 4,
  });
  const rawBackward = mapFlowEditorSelectionToRaw(adapter, {
    anchor: 4,
    head: 1,
  });

  assert.deepEqual(rawForward, { anchor: 1, head: 5 });
  assert.deepEqual(rawBackward, { anchor: 5, head: 1 });
  assert.deepEqual(mapFlowRawSelectionToEditor(adapter, rawForward), {
    anchor: 1,
    head: 4,
  });
  assert.deepEqual(mapFlowRawSelectionToEditor(adapter, rawBackward), {
    anchor: 4,
    head: 1,
  });
});

test("clamps selection coordinates without mutating the input", () => {
  const input = { anchor: -4.8, head: 99 };
  const clamped = clampFlowEditorSelection(input, 7);

  assert.deepEqual(clamped, { anchor: 0, head: 7 });
  assert.deepEqual(input, { anchor: -4.8, head: 99 });
  assert.ok(Object.isFrozen(clamped));
});

test("stores and restores exact immutable source snapshots for undo", () => {
  const rawText = "a\r\nb\rc\n👩‍💻e\u0301";
  const snapshot = createFlowEditorRawSnapshot(rawText, {
    anchor: 3,
    head: rawText.length,
  });
  const restored = restoreFlowEditorRawSnapshot(snapshot);

  assert.equal(restored.rawText, rawText);
  assert.deepEqual(restored.selection, {
    anchor: 3,
    head: rawText.length,
  });
  assert.notEqual(restored, snapshot);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.selection));
  assert.ok(Object.isFrozen(restored));
  assert.ok(Object.isFrozen(restored.selection));
});

test("keeps trailing newline boundaries reversible and contextual", () => {
  const rawText = "a\r\n";
  const adapter = createFlowEditorSourceAdapter(rawText);

  assert.equal(adapter.editorText, "a\n");
  assert.equal(adapter.editorToRawOffset(2), 3);
  assert.equal(adapter.rawToEditorOffset(2, "before"), 1);
  assert.equal(adapter.rawToEditorOffset(2, "after"), 2);
  assert.equal(
    applyFlowEditorChangesToRaw(rawText, [
      { fromA: 2, toA: 2, insertedText: "\n끝" },
    ]).rawText,
    "a\r\n\r\n끝",
  );
  assert.equal(
    applyFlowEditorChangesToRaw(rawText, [
      { fromA: 1, toA: 2, insertedText: "" },
    ]).rawText,
    "a",
  );
});

test("uses LF for an empty source and keeps a trailing empty editor line", () => {
  const adapter = createFlowEditorSourceAdapter("");
  assert.equal(adapter.editorText, "");
  assert.equal(adapter.preferredLineEnding, "\n");
  assert.equal(adapter.rawToEditorOffset(0), 0);
  assert.equal(adapter.editorToRawOffset(0), 0);
  assert.equal(
    applyFlowEditorChangesToRaw("", [
      { fromA: 0, toA: 0, insertedText: "첫째\n둘째\n" },
    ]).rawText,
    "첫째\n둘째\n",
  );
});

test("maps emoji, ZWJ sequences, and combining marks in UTF-16 units", () => {
  const rawText = "👩‍💻 e\u0301\r\n한글";
  const adapter = createFlowEditorSourceAdapter(rawText);
  const crOffset = rawText.indexOf("\r");

  for (
    let editorOffset = 0;
    editorOffset <= adapter.editorText.length;
    editorOffset += 1
  ) {
    const rawOffset = adapter.editorToRawOffset(editorOffset);
    assert.equal(adapter.rawToEditorOffset(rawOffset), editorOffset);
  }
  for (let rawOffset = 0; rawOffset <= rawText.length; rawOffset += 1) {
    if (rawOffset === crOffset + 1) continue;
    const editorOffset = adapter.rawToEditorOffset(rawOffset);
    assert.equal(adapter.editorToRawOffset(editorOffset), rawOffset);
  }

  const emojiEnd = "👩‍💻".length;
  assert.equal(adapter.rawToEditorOffset(emojiEnd), emojiEnd);
  assert.equal(adapter.editorToRawOffset(emojiEnd), emojiEnd);
});

test("rejects invalid and overlapping editor changes without touching source", () => {
  const rawText = "a\r\nb";

  assert.throws(
    () =>
      applyFlowEditorChangesToRaw(rawText, [
        { fromA: 0, toA: 2, insertedText: "x" },
        { fromA: 1, toA: 3, insertedText: "y" },
      ]),
    /non-overlapping/u,
  );
  assert.throws(
    () =>
      applyFlowEditorChangesToRaw(rawText, [
        { fromA: 9, toA: 9, insertedText: "x" },
      ]),
    /fromA/u,
  );
  assert.throws(
    () => createFlowEditorRawSnapshot(rawText, { anchor: 0, head: 9 }),
    /selection\.head/u,
  );
  assert.equal(rawText, "a\r\nb");
});
