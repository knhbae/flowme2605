import assert from "node:assert/strict";
import test from "node:test";

import type { AuthoringReceiptView } from "./authoring-ui-types";
import {
  consumeTextAuthoringSaveReceiptHandoff,
  getTextAuthoringDraftPath,
  storeTextAuthoringSaveReceiptHandoff,
} from "./TextAuthoringServiceRoute";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const RECEIPT: AuthoringReceiptView = {
  receiptId: "receipt-1",
  title: "저장한 콘텐츠",
  ownership: "personal",
  ownershipLabel: "개인 초안",
  revisionLabel: "revision-1",
  artifact: "TXT",
  stepCount: 1,
  itemCount: 0,
  sourcePreserved: true,
  reviewRequiredCount: 0,
  reviewEvidenceCount: 0,
  reviewPersonalOnlyCount: 0,
  sourceState: "current",
  sourceOpenChangeCount: 0,
  savedAtLabel: "2026. 8. 12.",
};

test("collection navigation uses the stable product route", () => {
  assert.equal(getTextAuthoringDraftPath(), "/flows/authoring");
  assert.equal(getTextAuthoringDraftPath(null), "/flows/authoring");
});

test("draft navigation encodes the saved identity as one path segment", () => {
  assert.equal(
    getTextAuthoringDraftPath("draft/2026 08 11"),
    "/flows/authoring/draft%2F2026%2008%2011",
  );
});

test("save receipt handoff is scoped to one draft and consumed once", () => {
  const storage = memoryStorage();
  assert.equal(
    storeTextAuthoringSaveReceiptHandoff(storage, "draft-1", RECEIPT),
    true,
  );
  assert.deepEqual(
    consumeTextAuthoringSaveReceiptHandoff(storage, "draft-1"),
    RECEIPT,
  );
  assert.equal(
    consumeTextAuthoringSaveReceiptHandoff(storage, "draft-1"),
    null,
  );
});

test("a receipt for another draft is discarded instead of resurfacing later", () => {
  const storage = memoryStorage();
  storeTextAuthoringSaveReceiptHandoff(storage, "draft-1", RECEIPT);
  assert.equal(
    consumeTextAuthoringSaveReceiptHandoff(storage, "draft-2"),
    null,
  );
  assert.equal(
    consumeTextAuthoringSaveReceiptHandoff(storage, "draft-1"),
    null,
  );
});
