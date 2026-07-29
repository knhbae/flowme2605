import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const auditDir = path.join(repoRoot, "docs/content-audit/2026-07-19-url-to-flow-p0-ten-url-benchmark");
const readJson = async (relative) => JSON.parse(await fs.readFile(path.join(auditDir, relative), "utf8"));
const writeJson = async (relative, value) => {
  const file = path.join(auditDir, relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const [snapshots, lower, higher] = await Promise.all([
  readJson("source-snapshots.json"),
  readJson("model-runs/lower-cost.json"),
  readJson("model-runs/higher-capability.json"),
]);
const snapshotById = new Map(snapshots.snapshots.map((entry) => [entry.caseId, entry]));
const lowerById = new Map(lower.cases.map((entry) => [entry.caseId, entry]));
const higherById = new Map(higher.cases.map((entry) => [entry.caseId, entry]));

const questions = [
  { id: "source_fidelity", text: "원문 snapshot에서 직접 확인되는 근거만 사용했는가?" },
  { id: "execution_clarity", text: "사용자가 다음 행동과 완료 상태를 바로 이해할 수 있는가?" },
  { id: "artifact_fit", text: "기본 결과물과 projection이 이 사용자 일에 자연스러운가?" },
  { id: "specificity", text: "일반적인 AI 목록이 아니라 원문에 묶인 구체적인 Flow인가?" },
  { id: "safety_and_hold", text: "민감·권리·접근 부족 상황에서 생성 또는 보류 판단이 안전한가?" },
  { id: "reuse_value", text: "다시 열고 수정·내보내기할 기준본으로 쓸 가치가 있는가?" },
];

const packets = { "reviewer-a": [], "reviewer-b": [] };
const orderMap = [];

for (const [index, caseId] of [...snapshotById.keys()].sort().entries()) {
  const source = snapshotById.get(caseId);
  const low = lowerById.get(caseId);
  const premium = higherById.get(caseId);
  if (!low || !premium) throw new Error(`missing lane output for ${caseId}`);

  for (const reviewerId of Object.keys(packets)) {
    const lowFirst = reviewerId === "reviewer-a" ? index % 2 === 0 : index % 2 !== 0;
    const optionA = lowFirst ? low : premium;
    const optionB = lowFirst ? premium : low;
    packets[reviewerId].push({
      caseId,
      source: {
        title: source.title,
        requestedUrl: source.requestedUrl,
        accessStatus: source.accessStatus,
        capturedAt: source.capturedAt,
        selectedLines: source.selectedLines,
        headings: source.headings,
        playlistItems: source.playlistItems,
      },
      optionA,
      optionB,
      questions,
      allowedChoice: ["A", "B", "tie"],
    });
    orderMap.push({
      reviewerId,
      caseId,
      optionA: lowFirst ? "lower_cost" : "higher_capability",
      optionB: lowFirst ? "higher_capability" : "lower_cost",
    });
  }
}

for (const reviewerId of Object.keys(packets)) {
  await writeJson(`review-packets/${reviewerId}.json`, {
    protocolVersion: "flowme-ten-url-blind-review-v1.0",
    reviewerId,
    prohibitedContext: ["model name", "tier", "cost", "latency", "expected winner", "other reviewer result"],
    requiredCaseOutput: {
      caseId: "string",
      judgments: questions.map((entry) => ({ questionId: entry.id, choice: "A|B|tie", reason: "short Korean reason" })),
      optionScores: {
        A: {
          userNeedFit: "1-5",
          executionClarity: "1-5",
          contentFidelity: "1-5",
          portability: "1-5",
          cognitiveLoad: "1-5",
          copySpecificity: "1-5",
          sourceSafety: "1-5",
          accessibilityOperability: "1-5"
        },
        B: {
          userNeedFit: "1-5",
          executionClarity: "1-5",
          contentFidelity: "1-5",
          portability: "1-5",
          cognitiveLoad: "1-5",
          copySpecificity: "1-5",
          sourceSafety: "1-5",
          accessibilityOperability: "1-5"
        }
      },
      overallChoice: "A|B|tie",
      criticalFindings: [],
      note: "short Korean note"
    },
    cases: packets[reviewerId],
  });
}
await writeJson("review-packets/order-map.json", orderMap);
process.stdout.write(`${packets["reviewer-a"].length} paired cases\n`);
