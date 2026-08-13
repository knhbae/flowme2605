import assert from "node:assert/strict";
import test from "node:test";

import {
  isTextAuthoringP1SourceCandidateEnabled,
  isTextAuthoringP1LongDocumentTableEnabled,
  resetTextAuthoringP1SourceCandidateRuntimeEnabled,
  resetTextAuthoringP1LongDocumentTableRuntimeEnabled,
  resolveTextAuthoringP1SourceCandidateGate,
  resolveTextAuthoringP1LongDocumentTableGate,
  setTextAuthoringP1SourceCandidateRuntimeEnabled,
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

test("P1-E source candidates stay off until an explicit local gate opens them", () => {
  resetTextAuthoringP1SourceCandidateRuntimeEnabled();
  assert.deepEqual(resolveTextAuthoringP1SourceCandidateGate(), {
    enabled: false,
    configured: false,
  });
  assert.equal(isTextAuthoringP1SourceCandidateEnabled(), false);

  setTextAuthoringP1SourceCandidateRuntimeEnabled(true);
  assert.deepEqual(resolveTextAuthoringP1SourceCandidateGate(), {
    enabled: true,
    configured: true,
  });
  assert.equal(
    resolveTextAuthoringP1SourceCandidateGate({ enabled: false }).enabled,
    false,
  );
  resetTextAuthoringP1SourceCandidateRuntimeEnabled();
});
