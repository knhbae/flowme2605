import assert from "node:assert/strict";
import test from "node:test";

import {
  clampTextAuthoringFlowViewUiState,
  createDefaultTextAuthoringFlowViewUiState,
  createTextAuthoringFlowViewUiStateKey,
  decideTextAuthoringFlowViewUiStateRestore,
  fingerprintTextAuthoringFlowViewSource,
  parseTextAuthoringFlowViewUiState,
  readTextAuthoringFlowViewUiState,
  removeTextAuthoringFlowViewUiState,
  serializeTextAuthoringFlowViewUiState,
  writeTextAuthoringFlowViewUiState,
  type TextAuthoringFlowViewUiState,
  type TextAuthoringFlowViewUiStorage,
} from "./flow-view-ui-state";

function completeState(
  overrides: Partial<TextAuthoringFlowViewUiState> = {},
): TextAuthoringFlowViewUiState {
  return {
    ...createDefaultTextAuthoringFlowViewUiState("raw-v1:12:fixture"),
    mode: "flow",
    selectionStart: 2,
    selectionEnd: 9,
    selectionDirection: "backward",
    textScrollTop: 120.5,
    textScrollLeft: 8,
    inputPaneScrollTop: 240,
    flowScrollTop: 360,
    activeLocatorId: "source-line-2",
    ...overrides,
  };
}

function memoryStorage(): TextAuthoringFlowViewUiStorage & {
  values: Map<string, string>;
} {
  const values = new Map<string, string>();
  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("v1 keys isolate draft and document identities and reject an empty scope", () => {
  assert.equal(
    createTextAuthoringFlowViewUiStateKey({
      draftId: "draft/one",
      documentId: "document one",
    }),
    "flow:text-authoring:flow-view-ui:v1:draft:draft%2Fone:document:document%20one",
  );
  assert.notEqual(
    createTextAuthoringFlowViewUiStateKey({ draftId: "draft-one" }),
    createTextAuthoringFlowViewUiStateKey({ documentId: "draft-one" }),
  );
  assert.equal(
    createTextAuthoringFlowViewUiStateKey({ draftId: " ", documentId: null }),
    null,
  );
});

test("the exact raw source fingerprint distinguishes LF, CRLF, and content", () => {
  const lf = fingerprintTextAuthoringFlowViewSource("한 줄\n두 줄");
  assert.equal(lf, fingerprintTextAuthoringFlowViewSource("한 줄\n두 줄"));
  assert.notEqual(lf, fingerprintTextAuthoringFlowViewSource("한 줄\r\n두 줄"));
  assert.notEqual(lf, fingerprintTextAuthoringFlowViewSource("한 줄\n세 줄"));
});

test("v1 sidecar serialization preserves every view, selection, scroll, and locator field", () => {
  const state = completeState();
  const serialized = serializeTextAuthoringFlowViewUiState(state);
  assert.ok(serialized);
  assert.deepEqual(parseTextAuthoringFlowViewUiState(serialized), state);
});

test("malformed, partial, unsupported-version, and unsafe numeric payloads are ignored", () => {
  const base = completeState();
  const cases: unknown[] = [
    null,
    "{",
    { ...base, version: 2 },
    { ...base, mode: "preview" },
    { ...base, fingerprint: "" },
    { ...base, selectionStart: -1 },
    { ...base, selectionStart: 10, selectionEnd: 2 },
    { ...base, selectionEnd: 2.5 },
    { ...base, selectionDirection: "sideways" },
    { ...base, flowScrollTop: Number.POSITIVE_INFINITY },
    { ...base, activeLocatorId: "" },
  ];
  for (const value of cases) {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    assert.equal(parseTextAuthoringFlowViewUiState(serialized), null);
  }
});

test("clamping reconciles a shorter source and DOM scroll bounds without mutating input", () => {
  const state = completeState({
    selectionStart: 8,
    selectionEnd: 20,
    textScrollTop: 120,
    textScrollLeft: 40,
    inputPaneScrollTop: 240,
    flowScrollTop: 360,
  });
  const snapshot = structuredClone(state);
  const clamped = clampTextAuthoringFlowViewUiState(state, {
    sourceLength: 8,
    maxTextScrollTop: 100,
    maxTextScrollLeft: 12,
    maxInputPaneScrollTop: 200,
    maxFlowScrollTop: 300,
    validLocatorIds: ["different-locator"],
  });

  assert.deepEqual(state, snapshot);
  assert.deepEqual(clamped, {
    ...state,
    selectionStart: 8,
    selectionEnd: 8,
    selectionDirection: "none",
    textScrollTop: 100,
    textScrollLeft: 12,
    inputPaneScrollTop: 200,
    flowScrollTop: 300,
    activeLocatorId: null,
  });
});

test("restore accepts only an exact fingerprint and otherwise fails open to text", () => {
  const expectedFingerprint =
    fingerprintTextAuthoringFlowViewSource("정확히 같은 원문");
  const state = completeState({ fingerprint: expectedFingerprint });
  const serialized = serializeTextAuthoringFlowViewUiState(state);
  assert.ok(serialized);

  assert.deepEqual(
    decideTextAuthoringFlowViewUiStateRestore(serialized, expectedFingerprint, {
      sourceLength: 20,
      validLocatorIds: ["source-line-2"],
    }),
    { restore: true, reason: "restored", state },
  );

  const stale = decideTextAuthoringFlowViewUiStateRestore(
    serialized,
    fingerprintTextAuthoringFlowViewSource("달라진 원문"),
    { sourceLength: 6 },
  );
  assert.equal(stale.restore, false);
  assert.equal(stale.reason, "fingerprint-mismatch");
  assert.equal(stale.state.mode, "text");
  assert.equal(stale.state.selectionStart, 0);
  assert.equal(stale.state.activeLocatorId, null);

  const malformed = decideTextAuthoringFlowViewUiStateRestore(
    "not-json",
    expectedFingerprint,
    { sourceLength: 8 },
  );
  assert.equal(malformed.restore, false);
  assert.equal(malformed.reason, "malformed");
  assert.equal(malformed.state.mode, "text");
});

test("safe storage helpers round-trip sidecar state without touching another identity", () => {
  const storage = memoryStorage();
  const firstKey = createTextAuthoringFlowViewUiStateKey({
    draftId: "draft-one",
    documentId: "document-one",
  });
  const secondKey = createTextAuthoringFlowViewUiStateKey({
    draftId: "draft-two",
    documentId: "document-two",
  });
  const state = completeState();

  assert.equal(
    writeTextAuthoringFlowViewUiState(storage, firstKey, state),
    true,
  );
  assert.equal(storage.values.has(secondKey ?? ""), false);
  assert.deepEqual(
    readTextAuthoringFlowViewUiState(storage, firstKey, state.fingerprint, {
      sourceLength: 12,
      validLocatorIds: ["source-line-2"],
    }),
    { restore: true, reason: "restored", state },
  );
  assert.equal(removeTextAuthoringFlowViewUiState(storage, firstKey), true);
  assert.equal(storage.values.has(firstKey ?? ""), false);
});

test("missing identity and storage exceptions fail open without throwing", () => {
  const state = completeState();
  const throwingStorage: TextAuthoringFlowViewUiStorage = {
    getItem() {
      throw new Error("read denied");
    },
    setItem() {
      throw new Error("quota denied");
    },
    removeItem() {
      throw new Error("remove denied");
    },
  };

  const decision = readTextAuthoringFlowViewUiState(
    throwingStorage,
    "flow-view-key",
    state.fingerprint,
    { sourceLength: 12 },
  );
  assert.equal(decision.restore, false);
  assert.equal(decision.reason, "storage-unavailable");
  assert.equal(decision.state.mode, "text");
  assert.equal(
    writeTextAuthoringFlowViewUiState(throwingStorage, "flow-view-key", state),
    false,
  );
  assert.equal(
    removeTextAuthoringFlowViewUiState(throwingStorage, "flow-view-key"),
    false,
  );
  assert.equal(writeTextAuthoringFlowViewUiState(null, null, state), false);
  assert.equal(
    readTextAuthoringFlowViewUiState(null, null, state.fingerprint, {
      sourceLength: 12,
    }).state.mode,
    "text",
  );
});
