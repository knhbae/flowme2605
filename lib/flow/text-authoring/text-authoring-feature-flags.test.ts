import assert from "node:assert/strict";
import test from "node:test";

import {
  isTextAuthoringP1LongDocumentTableEnabled,
  resetTextAuthoringP1LongDocumentTableRuntimeEnabled,
  resolveTextAuthoringP1LongDocumentTableGate,
  setTextAuthoringP1LongDocumentTableRuntimeEnabled,
} from "./text-authoring-feature-flags";

test("P1-C long-document analysis is off for P0 documents", () => {
  assert.equal(isTextAuthoringP1LongDocumentTableEnabled(), false);
});

test("only an explicit document feature enables P1-C", () => {
  assert.equal(
    isTextAuthoringP1LongDocumentTableEnabled({ enabled: true }),
    true,
  );
  assert.equal(
    isTextAuthoringP1LongDocumentTableEnabled({ enabled: false }),
    false,
  );
});

test("the local runtime seam controls fresh documents and reset restores unconfigured P0", () => {
  resetTextAuthoringP1LongDocumentTableRuntimeEnabled();
  assert.deepEqual(resolveTextAuthoringP1LongDocumentTableGate(), {
    enabled: false,
    configured: false,
  });
  setTextAuthoringP1LongDocumentTableRuntimeEnabled(true);
  assert.deepEqual(resolveTextAuthoringP1LongDocumentTableGate(), {
    enabled: true,
    configured: true,
  });
  assert.equal(
    resolveTextAuthoringP1LongDocumentTableGate({ enabled: false }).enabled,
    false,
  );
  resetTextAuthoringP1LongDocumentTableRuntimeEnabled();
});
