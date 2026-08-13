"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { TextAuthoringWorkspace } from "./TextAuthoringWorkspace";
import type { AuthoringReceiptView } from "./authoring-ui-types";

const SAVE_RECEIPT_HANDOFF_KEY = "flow:text-authoring:save-receipt-handoff:v1";

type SaveReceiptHandoff = {
  version: 1;
  draftId: string;
  receipt: AuthoringReceiptView;
};

function isAuthoringReceiptView(value: unknown): value is AuthoringReceiptView {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<AuthoringReceiptView>;
  return (
    typeof receipt.receiptId === "string" &&
    typeof receipt.title === "string" &&
    typeof receipt.itemCount === "number" &&
    typeof receipt.stepCount === "number" &&
    typeof receipt.artifact === "string" &&
    typeof receipt.sourcePreserved === "boolean"
  );
}

export function storeTextAuthoringSaveReceiptHandoff(
  storage: Pick<Storage, "setItem">,
  draftId: string,
  receipt: AuthoringReceiptView,
): boolean {
  try {
    const handoff: SaveReceiptHandoff = {
      version: 1,
      draftId,
      receipt,
    };
    storage.setItem(SAVE_RECEIPT_HANDOFF_KEY, JSON.stringify(handoff));
    return true;
  } catch {
    return false;
  }
}

export function consumeTextAuthoringSaveReceiptHandoff(
  storage: Pick<Storage, "getItem" | "removeItem">,
  draftId: string,
): AuthoringReceiptView | null {
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_RECEIPT_HANDOFF_KEY);
    if (raw !== null) storage.removeItem(SAVE_RECEIPT_HANDOFF_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const handoff = JSON.parse(raw) as Partial<SaveReceiptHandoff>;
    if (
      handoff.version !== 1 ||
      handoff.draftId !== draftId ||
      !isAuthoringReceiptView(handoff.receipt)
    ) {
      return null;
    }
    return handoff.receipt;
  } catch {
    return null;
  }
}

export type TextAuthoringServiceRouteProps = {
  draftId?: string;
  initialView?: "library" | "editor";
};

export function getTextAuthoringDraftPath(draftId?: string | null): string {
  return draftId
    ? `/flows/authoring/${encodeURIComponent(draftId)}`
    : "/flows/authoring";
}

export function TextAuthoringServiceRoute({
  draftId,
  initialView,
}: TextAuthoringServiceRouteProps) {
  const router = useRouter();
  const [saveReceiptHandoff, setSaveReceiptHandoff] =
    useState<AuthoringReceiptView | null>(null);

  useEffect(() => {
    if (!draftId) {
      setSaveReceiptHandoff(null);
      return;
    }
    setSaveReceiptHandoff(
      consumeTextAuthoringSaveReceiptHandoff(window.sessionStorage, draftId),
    );
  }, [draftId]);

  const handleNavigateDraft = useCallback(
    (
      nextDraftId: string | null,
      options?: {
        replace?: boolean;
        preserveWorkspace?: boolean;
        saveReceipt?: AuthoringReceiptView;
      },
    ) => {
      const path = getTextAuthoringDraftPath(nextDraftId);
      if (options?.preserveWorkspace && options.saveReceipt && nextDraftId) {
        storeTextAuthoringSaveReceiptHandoff(
          window.sessionStorage,
          nextDraftId,
          options.saveReceipt,
        );
      }
      if (options?.replace) router.replace(path);
      else router.push(path);
    },
    [router],
  );
  const handleNavigateNew = useCallback(() => {
    router.push("/flows/new");
  }, [router]);

  return (
    <TextAuthoringWorkspace
      productMode
      initialView={initialView ?? (draftId ? "editor" : "library")}
      initialDraftId={draftId}
      initialSaveReceipt={saveReceiptHandoff}
      onNavigateDraft={handleNavigateDraft}
      onNavigateNew={handleNavigateNew}
    />
  );
}
