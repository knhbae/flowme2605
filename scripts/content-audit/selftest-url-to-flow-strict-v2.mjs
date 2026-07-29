import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readJson,
  scheduleHasLiteralValue,
  sourceText,
  specDir,
} from "./url-to-flow-strict-v2-core.mjs";
import { validateStrictProposal } from "./validate-url-to-flow-strict-v2.mjs";

const decisionWords = /판단|결정|선택|보류/u;
const actionWords = /준비|신청|등록|방문|청소|제출|수령|갱신/u;
const titleActionWords = /확인|판단|결정|선택|보류|준비|신청|등록|방문|청소|제출|수령|갱신/u;
const dateActionWords = /방문|신청|제출|예약|참석|수령|갱신|검사하기|진행/u;

function itemTitle(row) {
  if (row.rowType === "check") {
    return titleActionWords.test(row.title) ? row.title : `${row.title} 확인하기`;
  }
  if (row.rowType === "procedure") return row.title;
  if (row.rowType === "table_row") return `${row.title} 완료하기`;
  if (row.rowType === "resource") return `${row.title} 열어보기`;
  if (row.rowType === "date") {
    return titleActionWords.test(row.title) ? row.title : `${row.title} 확인하기`;
  }
  throw new Error(`Unexpected eligible row type: ${row.rowType}`);
}

function itemIntent(row) {
  if (row.rowType === "check") {
    if (decisionWords.test(row.title)) return ["decide", "decision"];
    if (actionWords.test(row.title)) return ["act", "check"];
    return ["inspect", "check"];
  }
  if (row.rowType === "resource") return ["open_resource", "check"];
  if (row.rowType === "date") {
    return dateActionWords.test(row.title) ? ["act", "check"] : ["inspect", "check"];
  }
  return ["act", "check"];
}

function expectedArtifact(eligibleRows) {
  if (eligibleRows.some((row) => scheduleHasLiteralValue(sourceText(row)))) return "calendar";
  if (eligibleRows.every((row) => row.rowType === "table_row")) return "sheet";
  if (eligibleRows.every((row) => row.rowType === "resource")) {
    return eligibleRows.length === 1 ? "memo" : "checklist";
  }
  return eligibleRows.length === 1 ? "todo" : "checklist";
}

export function positiveProposal(strictCase, promptVersion = "url-to-flow-prompt-v2.0") {
  const input = strictCase.generatorInput;
  const supporting = new Set(input.sourceOwnership.supportingSourceRefs);
  const eligibleRows = input.sourceRows.filter(
    (row) => !supporting.has(row.sourceRef) && row.rowType !== "reference",
  );
  const items = eligibleRows.map((row, index) => {
    const [intent, completionMode] = itemIntent(row);
    const hasSchedule = scheduleHasLiteralValue(sourceText(row));
    return {
      itemRef: `item-${String(index + 1).padStart(2, "0")}`,
      sourceRowRefs: [row.sourceRowRef],
      title: itemTitle(row),
      intent,
      completionMode,
      memo: null,
      scheduleEvidence: hasSchedule
        ? {
            sourceRowRefs: [row.sourceRowRef],
            sourceText: row.title,
            kind: "recurrence",
          }
        : null,
    };
  });
  const omittedRows = input.sourceRows
    .filter((row) => supporting.has(row.sourceRef) || row.rowType === "reference")
    .map((row) => ({
      sourceRowRef: row.sourceRowRef,
      reasonCode: supporting.has(row.sourceRef)
        ? "supporting_source_boundary"
        : "reference_only",
    }));
  const uncertaintyCodes = [];
  const humanCheckRowRefs = [];
  const addUncertainty = (code, rowRef) => {
    if (!uncertaintyCodes.includes(code)) uncertaintyCodes.push(code);
    if (!humanCheckRowRefs.includes(rowRef)) humanCheckRowRefs.push(rowRef);
  };
  for (const row of input.sourceRows) {
    if (row.rowType === "resource") addUncertainty("resource_contents_unseen", row.sourceRowRef);
    if (row.rowType === "date" && !scheduleHasLiteralValue(sourceText(row))) {
      addUncertainty("missing_date_value", row.sourceRowRef);
    }
    if (supporting.has(row.sourceRef)) {
      addUncertainty("supporting_source_not_structural", row.sourceRowRef);
    }
  }
  const primaryArtifact = expectedArtifact(eligibleRows);
  return {
    schemaVersion: "flowme-semantic-proposal-v2",
    promptVersion,
    requestRef: strictCase.requestRef,
    sampleRef: strictCase.sampleRef,
    result: {
      state: "proposal",
      reasonCode: null,
      disposition: "review",
      primaryArtifact,
    },
    items,
    omittedRows,
    projections: [{ target: primaryArtifact, itemRefs: items.map((item) => item.itemRef) }],
    review: { uncertaintyCodes, humanCheckRowRefs },
  };
}

export function negativeProposal(strictCase) {
  return {
    schemaVersion: "flowme-semantic-proposal-v2",
    promptVersion: "deterministic-preflight-v2",
    requestRef: strictCase.requestRef,
    sampleRef: strictCase.sampleRef,
    result: {
      state: "blocked",
      reasonCode: strictCase.preflightResult.errorCode,
      disposition: strictCase.preflightResult.recommendedDisposition,
      primaryArtifact: null,
    },
    items: [],
    omittedRows: [],
    projections: [],
    review: { uncertaintyCodes: [], humanCheckRowRefs: [] },
  };
}

function expectFailure({ name, proposal, strictCase, schema, protocol, code }) {
  let result;
  try {
    result = validateStrictProposal({
      proposal,
      strictCase,
      schema,
      protocol,
      expectedPromptVersion: "url-to-flow-prompt-v2.0",
    });
  } catch (error) {
    return { name, passed: false, error: `validator threw: ${error.message}` };
  }
  const codes = result.errors.map((entry) => entry.code);
  return {
    name,
    passed: !result.passed && (!code || codes.includes(code)),
    expectedCode: code ?? null,
    actualCodes: codes,
  };
}

export async function selftestStrictV2() {
  const { value: cases } = await readJson(path.join(specDir, "cases-v2.json"));
  const { value: schema } = await readJson(path.join(specDir, "proposal-schema-v2.json"));
  const { value: protocol } = await readJson(path.join(specDir, "protocol-v2.json"));
  const casesById = new Map(cases.cases.map((entry) => [entry.auditCaseId, entry]));
  const validResults = cases.cases.map((strictCase) => {
    const proposal = strictCase.generatorInput
      ? positiveProposal(strictCase)
      : negativeProposal(strictCase);
    const result = validateStrictProposal({
      proposal,
      strictCase,
      schema,
      protocol,
      expectedPromptVersion: "url-to-flow-prompt-v2.0",
    });
    return {
      auditCaseId: strictCase.auditCaseId,
      passed: result.passed,
      errorCodes: result.errors.map((entry) => entry.code),
    };
  });

  const case02 = casesById.get("case-02");
  const case03 = casesById.get("case-03");
  const case05 = casesById.get("case-05");
  const case06 = casesById.get("case-06");
  const case11 = casesById.get("case-11");
  const invalidTests = [];

  const unlicensed = structuredClone(positiveProposal(case03));
  unlicensed.items[0].title = "여권 구매하기";
  invalidTests.push(expectFailure({ name: "unlicensed title", proposal: unlicensed, strictCase: case03, schema, protocol, code: "item_title_outside_row_license" }));

  const ordinalSchedule = structuredClone(positiveProposal(case05));
  ordinalSchedule.items[0].scheduleEvidence = {
    sourceRowRefs: ordinalSchedule.items[0].sourceRowRefs,
    sourceText: "1주차",
    kind: "recurrence",
  };
  invalidTests.push(expectFailure({ name: "ordinal is not schedule", proposal: ordinalSchedule, strictCase: case05, schema, protocol, code: "schedule_value_not_supported" }));

  const wrongScheduleKind = structuredClone(positiveProposal(case02));
  wrongScheduleKind.items[0].scheduleEvidence.kind = "date";
  invalidTests.push(expectFailure({ name: "schedule kind mismatch", proposal: wrongScheduleKind, strictCase: case02, schema, protocol, code: "schedule_kind_mismatch" }));

  const wrongArtifact = structuredClone(positiveProposal(case03));
  wrongArtifact.result.primaryArtifact = "calendar";
  wrongArtifact.projections[0].target = "calendar";
  invalidTests.push(expectFailure({ name: "artifact matrix mismatch", proposal: wrongArtifact, strictCase: case03, schema, protocol, code: "primary_artifact_policy_mismatch" }));

  const partial = structuredClone(positiveProposal(case03));
  partial.result.state = "partial";
  partial.result.reasonCode = "source_meaning_unclear";
  invalidTests.push(expectFailure({ name: "partial forbidden in frozen positives", proposal: partial, strictCase: case03, schema, protocol, code: "frozen_positive_state_must_be_proposal" }));

  const extraUncertainty = structuredClone(positiveProposal(case06));
  extraUncertainty.review.uncertaintyCodes.push("ambiguous_life_area");
  invalidTests.push(expectFailure({ name: "extra uncertainty marker", proposal: extraUncertainty, strictCase: case06, schema, protocol, code: "uncertainty_codes_not_exact_required_set" }));

  const pollutedNegative = structuredClone(negativeProposal(case11));
  pollutedNegative.items = [null];
  invalidTests.push(expectFailure({ name: "negative content pollution", proposal: pollutedNegative, strictCase: case11, schema, protocol, code: "negative_items_present" }));

  const malformedPositive = structuredClone(positiveProposal(case03));
  malformedPositive.items = [null];
  invalidTests.push(expectFailure({ name: "malformed item does not throw", proposal: malformedPositive, strictCase: case03, schema, protocol }));

  const passed = validResults.every((entry) => entry.passed) && invalidTests.every((entry) => entry.passed);
  return {
    selftestVersion: "flowme-url-to-flow-strict-selftest-v2",
    passed,
    validResults,
    invalidTests,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  selftestStrictV2()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (!result.passed) process.exitCode = 1;
    })
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
