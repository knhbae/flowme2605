import goldSourceContractJson from "../../../docs/specs/2026-07-20-url-to-flow-output-quality-lab-v2/gold-source-contract-v2.json";
import qualifiedCorpusJson from "../../../docs/content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/qualified-corpus-v2/qualified-corpus-fixture-v2.json";
import { contentsBatch260601OfficialBundles } from "../contents-batch-260601-official";
import { realContentPilotBundles } from "../real-content-pilot-flows";
import type { GrammarSimulationScenario } from "./grammar-simulation";

type QualifiedSchedule =
  | {
      type: "relative_to_target";
      offsetDays: number;
    }
  | {
      type: "sequence_day";
      day: number;
    };

type QualifiedSourceRow = {
  sourceRowId: string;
  label: string;
  detail: string;
  sourceUrl: string;
};

type QualifiedItem = {
  itemId: string;
  itemTitle: string;
  schedule?: QualifiedSchedule;
  sourceRowIds: string[];
};

type QualifiedStep = {
  title: string;
  items: QualifiedItem[];
};

type QualifiedFlow = {
  sourceVideoUrl?: string;
  steps: QualifiedStep[];
};

type QualifiedCorpusEntry = {
  bundleId: string;
  title: string;
  sourceRows: QualifiedSourceRow[];
  bundle: {
    title: string;
    sourceUrls: string[];
    map: {
      flows: QualifiedFlow[];
    };
  };
};

type QualifiedCorpus = {
  schemaVersion: string;
  bundles: QualifiedCorpusEntry[];
};

type GoldSourceRow = {
  sourceRowId: string;
  rowType: string;
  title: string;
  detail: string;
  order: number;
};

type GoldSourceCase = {
  caseId: string;
  primarySource: {
    title: string;
    url: string;
  };
  sourceRows: GoldSourceRow[];
};

type GoldSourceContract = {
  cases: GoldSourceCase[];
};

const qualifiedCorpus = qualifiedCorpusJson as unknown as QualifiedCorpus;
const goldSourceContract =
  goldSourceContractJson as unknown as GoldSourceContract;

function requiredQualifiedEntry(bundleId: string): QualifiedCorpusEntry {
  const entry = qualifiedCorpus.bundles.find(
    (candidate) => candidate.bundleId === bundleId,
  );
  if (!entry) throw new Error(`Missing qualified corpus entry: ${bundleId}`);
  return entry;
}

function requiredGoldSourceCase(caseId: string): GoldSourceCase {
  const fixture = goldSourceContract.cases.find(
    (candidate) => candidate.caseId === caseId,
  );
  if (!fixture) throw new Error(`Missing gold source case: ${caseId}`);
  return fixture;
}

function scheduleToken(schedule: QualifiedSchedule): string {
  if (schedule.type === "sequence_day") return `D+${schedule.day - 1}`;
  if (schedule.offsetDays === 0) return "D-Day";
  return schedule.offsetDays > 0
    ? `D+${schedule.offsetDays}`
    : `D${schedule.offsetDays}`;
}

function buildQualifiedMarkdown(
  entry: QualifiedCorpusEntry,
  anchor?: string,
): string {
  const sourceRows = new Map(
    entry.sourceRows.map((row) => [row.sourceRowId, row]),
  );
  const lines = [`# ${entry.bundle.title}`];
  if (anchor) lines.push(`- 기준일: ${anchor}`);
  else if (entry.bundleId === "bundle-moving-d30") lines.push("기준일: 이사일");

  for (const flow of entry.bundle.map.flows) {
    for (const step of flow.steps) {
      lines.push(`## ${step.title}`);
      for (const item of step.items) {
        const rows = item.sourceRowIds.map((sourceRowId) => {
          const row = sourceRows.get(sourceRowId);
          if (!row) {
            throw new Error(
              `${entry.bundleId}: missing source row ${sourceRowId}`,
            );
          }
          return row;
        });
        lines.push(`- [ ] ${item.itemTitle}`);
        if (rows.length > 0) {
          lines.push(`  - 설명: ${rows.map((row) => row.detail).join(" · ")}`);
        }
        if (item.schedule) {
          lines.push(`  - 상대 날짜: ${scheduleToken(item.schedule)}`);
        }
        if (flow.sourceVideoUrl && rows[0]) {
          lines.push(`  - 자료: [${rows[0].label}](${flow.sourceVideoUrl})`);
        }
      }
    }
  }
  return lines.join("\n");
}

function withCanonicalAnchor(rawText: string, anchor: string): string {
  const lines = rawText.split(/\r?\n/u);
  const existingIndex = lines.findIndex((line) =>
    /^(?:-\s+)?기준일:/u.test(line.trim()),
  );
  if (existingIndex >= 0) {
    lines[existingIndex] = `- 기준일: ${anchor}`;
  } else {
    const headingIndex = lines.findIndex((line) => /^#\s+/u.test(line));
    lines.splice(
      headingIndex >= 0 ? headingIndex + 1 : 0,
      0,
      `- 기준일: ${anchor}`,
    );
  }
  return lines.join("\n");
}

function buildRelativePropertyMarkdown(rawText: string): string {
  return rawText
    .split(/\r?\n/u)
    .flatMap((line) => {
      const match =
        /^(\s*-\s+(?:\[[ xX]\]\s+)?)(.*?)(D\s*(?:(?:-|\+)\s*\d+|-?\s*DAY))\s*$/iu.exec(
          line,
        );
      if (!match) return [line];
      const indent = /^\s*/u.exec(match[1])?.[0] ?? "";
      return [
        `${indent}- [ ] ${match[2].trimEnd()}`,
        `${indent}  - 상대 날짜: ${match[3].replace(/\s+/gu, "")}`,
      ];
    })
    .join("\n");
}

function buildCanonicalSafetyMarkdown(title: string, rawText: string): string {
  const propertyLabels: Record<string, string> = {
    why: "설명",
    how: "설명",
    done: "완료 기준",
    caution: "주의",
  };
  const lines = rawText.split(/\r?\n/u).map((line) => {
    const item = /^-\s+(?!\[[ xX]\]\s+)(.+)$/u.exec(line);
    if (item) return `- [ ] ${item[1]}`;

    const link =
      /^\s{2,}link:\s*(.*?)\s*\|\s*(https?:\/\/\S+?)(?:\s*\|.*)?$/iu.exec(line);
    if (link) return `  - 자료: [${link[1]}](${link[2]})`;

    const property = /^\s{2,}(why|how|done|caution):\s*(.+)$/iu.exec(line);
    if (!property) return line;
    return `  - ${propertyLabels[property[1].toLowerCase()]}: ${property[2]}`;
  });
  return [`# ${title}`, ...lines].join("\n");
}

function buildKmoocSourceMarkdown(fixture: GoldSourceCase): string {
  const rows = fixture.sourceRows
    .filter((row) => /^KMOOC-W\d+$/u.test(row.sourceRowId))
    .sort((left, right) => left.order - right.order)
    .map((row) => {
      const title = /^(\d+주차)\s*·\s*(.+)$/u.exec(row.title);
      const activity = /^주차 활동:\s*(.+)$/u.exec(row.detail);
      if (!title || !activity) {
        throw new Error(`Malformed K-MOOC source row: ${row.sourceRowId}`);
      }
      return [
        `- [ ] ${title[2]}`,
        `  - 주차: ${title[1]}`,
        `  - 주차 활동: ${activity[1]}`,
      ];
    });
  if (rows.length !== 14) {
    throw new Error(
      `K-MOOC source Markdown must contain 14 Items; found ${rows.length}`,
    );
  }
  return [
    `# ${fixture.primarySource.title}`,
    "## 14주 강의계획",
    ...rows.flat(),
  ].join("\n");
}

function buildLibrivoxSourceMarkdown(fixture: GoldSourceCase): string {
  const rows = fixture.sourceRows
    .filter((row) => /^LIBRIVOX-C\d+$/u.test(row.sourceRowId))
    .sort((left, right) => left.order - right.order)
    .map((row) => {
      const title = /^(\d+)\.\s*(.+)$/u.exec(row.title);
      const duration = /^재생시간\s+(.+)$/u.exec(row.detail);
      if (!title || !duration) {
        throw new Error(`Malformed LibriVox source row: ${row.sourceRowId}`);
      }
      return [
        `- [ ] ${title[2]}`,
        `  - 순서: ${title[1]}`,
        `  - 재생시간: ${duration[1]}`,
      ];
    });
  if (rows.length !== 38) {
    throw new Error(
      `LibriVox source Markdown must contain 38 Items; found ${rows.length}`,
    );
  }
  return [
    `# ${fixture.primarySource.title}`,
    "## 장 목록",
    ...rows.flat(),
  ].join("\n");
}

function qualifiedOptions(entry: QualifiedCorpusEntry) {
  return {
    title: entry.bundle.title,
    sourceTitle: entry.title,
    sourceUrl: entry.bundle.sourceUrls[0],
    ownership: "creator" as const,
  };
}

function existingContentScenarios(): GrammarSimulationScenario[] {
  const moving = requiredQualifiedEntry("bundle-moving-d30");
  const allblanc = requiredQualifiedEntry("bundle-allblanc-7day-abs");
  const newCar = requiredQualifiedEntry("bundle-new-car-comparison");
  const kmooc = requiredGoldSourceCase("OQ-C02-KMOOC-FULL");
  const librivox = requiredGoldSourceCase("OQ-C03-LIBRIVOX");
  const vehicle = realContentPilotBundles.find(
    (bundle) => bundle.flow.id === "flow-vehicle-inspection-prep",
  );
  const safety = contentsBatch260601OfficialBundles.find(
    (bundle) => bundle.flow.id === "official-260601-overseas-safety",
  );
  if (!vehicle?.flow.raw_text || !vehicle.flow.source_url) {
    throw new Error("Missing vehicle inspection source fixture");
  }
  if (!safety?.flow.raw_text || !safety.flow.source_url) {
    throw new Error("Missing official travel safety source fixture");
  }

  return [
    {
      id: "content-moving-d30",
      group: "existing_content",
      title: "이사 D-30 체크리스트",
      summary: "6개 시기와 27개 원문 Item을 목표일 기준 캘린더로 변환한다.",
      sourceShape: "D-day 준비 타임라인 · 6 Step · 27 Item",
      naturalDestination: "calendar",
      rawText: buildQualifiedMarkdown(moving, "2026-08-31"),
      anchor: "2026-08-31",
      sourceReference: moving.bundle.sourceUrls[0],
      options: qualifiedOptions(moving),
      expected: {
        title: "이사 D-30 체크리스트",
        itemCount: 27,
        stepCount: 6,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 27, todo: 27, sheet: 27, memo: 27 },
        issueCount: 0,
        dateRange: { start: "2026-08-01", end: "2026-08-31" },
        icsEventCount: 27,
        icsHasRrule: false,
      },
      boundary: "기준일이 없으면 상대 날짜를 실제 날짜로 추정하지 않는다.",
    },
    {
      id: "content-vehicle-inspection",
      group: "existing_content",
      title: "자동차검사 D-14 준비",
      summary: "공식 일정의 D-14·D-10·D-3·D-Day 10개 항목을 그대로 유지한다.",
      sourceShape: "공식 점검 체크리스트 · 3 Step · 10 Item",
      naturalDestination: "calendar",
      rawText: withCanonicalAnchor(
        [
          `# ${vehicle.flow.title}`,
          buildRelativePropertyMarkdown(vehicle.flow.raw_text),
        ].join("\n"),
        "2026-08-15",
      ),
      anchor: "2026-08-15",
      sourceReference: vehicle.flow.source_url,
      options: {
        title: vehicle.flow.title,
        sourceTitle: vehicle.flow.source_title,
        sourceUrl: vehicle.flow.source_url,
        ownership: "creator",
      },
      expected: {
        itemCount: 10,
        stepCount: 3,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 10, todo: 10, sheet: 10, memo: 10 },
        issueCount: 0,
        dateRange: { start: "2026-08-01", end: "2026-08-15" },
        icsEventCount: 10,
        icsHasRrule: false,
      },
      boundary: "점검 절차나 안전 판단을 새 Item으로 발명하지 않는다.",
    },
    {
      id: "content-allblanc-7day",
      group: "existing_content",
      title: "Allblanc 7일 영상 챌린지",
      summary: "7개 영상 제목·URL·순서를 D+0~D+6 일정으로 유지한다.",
      sourceShape: "영상 시퀀스 · 7 Step · 7 Item",
      naturalDestination: "calendar",
      rawText: buildQualifiedMarkdown(allblanc, "2026-08-03"),
      anchor: "2026-08-03",
      sourceReference: allblanc.bundle.sourceUrls[0],
      options: qualifiedOptions(allblanc),
      expected: {
        itemCount: 7,
        stepCount: 7,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 7, todo: 7, sheet: 7, memo: 7 },
        issueCount: 0,
        dateRange: { start: "2026-08-03", end: "2026-08-09" },
        resourceUrls: [
          ...new Set(allblanc.sourceRows.map((row) => row.sourceUrl)),
        ].sort((left, right) => left.localeCompare(right)),
        icsEventCount: 7,
        icsHasRrule: false,
      },
      boundary: "영상에 없는 동작·세트·반복 횟수는 만들지 않는다.",
    },
    {
      id: "content-kmooc-14",
      group: "existing_content",
      title: "K-MOOC 14주 학습 목록",
      summary: "검증된 강의계획 14개 주차를 날짜 없는 Flow Item으로 보존한다.",
      sourceShape: "14개 주차 Item · 주차·주차 활동 속성",
      naturalDestination: "todo",
      rawText: buildKmoocSourceMarkdown(kmooc),
      sourceReference: kmooc.primarySource.url,
      options: {
        title: kmooc.primarySource.title,
        sourceTitle: kmooc.primarySource.title,
        sourceUrl: kmooc.primarySource.url,
        ownership: "creator",
      },
      expected: {
        itemCount: 14,
        stepCount: 1,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 0, todo: 14, sheet: 14, memo: 14 },
        issueCount: 0,
        dateRange: null,
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary: "주차 번호만 보고 실제 날짜를 추정하지 않는다.",
    },
    {
      id: "content-librivox-38",
      group: "existing_content",
      title: "LibriVox 38장 듣기 목록",
      summary:
        "검증된 38개 장 제목과 재생시간을 날짜 없는 Flow Item으로 보존한다.",
      sourceShape: "38개 장 Item · 순서·재생시간 속성",
      naturalDestination: "todo",
      rawText: buildLibrivoxSourceMarkdown(librivox),
      sourceReference: librivox.primarySource.url,
      options: {
        title: librivox.primarySource.title,
        sourceTitle: librivox.primarySource.title,
        sourceUrl: librivox.primarySource.url,
        ownership: "creator",
      },
      expected: {
        itemCount: 38,
        stepCount: 1,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 0, todo: 38, sheet: 38, memo: 38 },
        issueCount: 0,
        dateRange: null,
        firstItemTitle: "Mrs. Rachel Lynde Is Surprised",
        lastItemTitle: "The Bend in the Road",
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary: "목록 순서를 임의의 일일 일정으로 바꾸지 않는다.",
    },
    {
      id: "content-new-car-14",
      group: "existing_content",
      title: "신차 구매 8단계",
      summary: "8개 Step의 14개 결정·확인 행동을 Todo로 유지한다.",
      sourceShape: "구매·비교 절차 · 8 Step · 14 Item",
      naturalDestination: "todo",
      rawText: buildQualifiedMarkdown(newCar),
      sourceReference: newCar.bundle.sourceUrls[0],
      options: qualifiedOptions(newCar),
      expected: {
        itemCount: 14,
        stepCount: 8,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 0, todo: 14, sheet: 14, memo: 14 },
        issueCount: 0,
        dateRange: null,
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary: "기록 맥락을 별도의 15번째 행동으로 부풀리지 않는다.",
    },
    {
      id: "content-official-safety-4",
      group: "existing_content",
      title: "해외여행 안전정보·영사조력",
      summary:
        "공식 출처, 실행 설명, 완료 기준, 주의를 서로 다른 의미로 보존한다.",
      sourceShape: "공식 안전 안내 · 2 Step · 4 Item",
      naturalDestination: "todo",
      rawText: buildCanonicalSafetyMarkdown(
        safety.flow.title,
        safety.flow.raw_text,
      ),
      sourceReference: safety.flow.source_url,
      options: {
        title: safety.flow.title,
        sourceTitle: safety.flow.source_title,
        sourceUrl: safety.flow.source_url,
        ownership: "creator",
      },
      expected: {
        itemCount: 4,
        stepCount: 2,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 0, todo: 4, sheet: 4, memo: 4 },
        issueCount: 0,
        resourceUrls: [safety.flow.source_url],
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary: "공식 사실과 주의 문구를 체크 가능한 행동으로 오인하지 않는다.",
    },
    {
      id: "content-jeju-memo-5",
      group: "existing_content",
      title: "제주 여행 개인 메모",
      summary: "개인 메모에서 확정한 5개 행동을 v2 checklist로 작성한다.",
      sourceShape: "v2 Markdown · 1 Step · 5 Item",
      naturalDestination: "todo",
      rawText: [
        "# 제주 여행 준비",
        "## 할 일",
        "- [ ] 항공권 확인",
        "- [ ] 숙소 예약번호 정리",
        "- [ ] 렌터카 예약",
        "- [ ] 준비물 체크",
        "- [ ] 출발 전날 온라인 체크인",
      ].join("\n"),
      options: {
        title: "제주 여행 준비",
        sourceTitle: "개인 여행 메모",
        ownership: "personal",
      },
      expected: {
        title: "제주 여행 준비",
        inputKinds: ["markdown"],
        itemCount: 5,
        stepCount: 1,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 0, todo: 5, sheet: 0, memo: 5 },
        issueCount: 0,
        firstItemTitle: "항공권 확인",
        lastItemTitle: "출발 전날 온라인 체크인",
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary: "“8월”만 보고 연도나 날짜를 만들지 않는다.",
    },
  ];
}

const RELATIVE_RAW = [
  "# 행사 준비",
  "## 준비",
  "- [ ] 장소 확인",
  "  - 상대 날짜: D-3",
  "- [ ] 최종 확인",
  "  - 상대 날짜: D-Day",
].join("\n");

function conditionChangeScenarios(): GrammarSimulationScenario[] {
  return [
    {
      id: "change-relative-no-anchor",
      group: "condition_change",
      title: "상대 날짜 · 실제 기준일 없음",
      summary:
        "문법상 기준 대상은 있지만 실제 날짜 입력이 없는 상태를 확인한다.",
      sourceShape: "D-3·D-Day 2개",
      naturalDestination: "todo",
      rawText: RELATIVE_RAW,
      comparisonKey: "relative-anchor",
      changeLabel: "기준일 날짜 미입력",
      expected: {
        itemCount: 2,
        stepCount: 1,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 0, todo: 2, sheet: 0, memo: 2 },
        issueCount: 0,
        dateRange: null,
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary: "“행사일”이라는 이름만으로 날짜를 계산하지 않는다.",
    },
    {
      id: "change-relative-anchor-aug",
      group: "condition_change",
      title: "상대 날짜 · 8월 기준일 적용",
      summary: "동일 원문에 2026-08-10 기준일만 적용한다.",
      sourceShape: "D-3·D-Day 2개",
      naturalDestination: "calendar",
      rawText: withCanonicalAnchor(RELATIVE_RAW, "2026-08-10"),
      anchor: "2026-08-10",
      comparisonKey: "relative-anchor",
      changeLabel: "기준일 2026-08-10",
      expected: {
        itemCount: 2,
        stepCount: 1,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 2, todo: 2, sheet: 2, memo: 2 },
        issueCount: 0,
        dateRange: { start: "2026-08-07", end: "2026-08-10" },
        icsEventCount: 2,
        icsHasRrule: false,
      },
      boundary:
        "원문 Item과 상대 오프셋은 그대로 두고 projection 날짜만 계산한다.",
    },
    {
      id: "change-relative-anchor-sep",
      group: "condition_change",
      title: "상대 날짜 · 9월 기준일로 변경",
      summary: "원문은 그대로 두고 기준일만 2026-09-10으로 옮긴다.",
      sourceShape: "D-3·D-Day 2개",
      naturalDestination: "calendar",
      rawText: withCanonicalAnchor(RELATIVE_RAW, "2026-09-10"),
      anchor: "2026-09-10",
      comparisonKey: "relative-anchor",
      changeLabel: "기준일 2026-09-10",
      expected: {
        itemCount: 2,
        stepCount: 1,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 2, todo: 2, sheet: 2, memo: 2 },
        issueCount: 0,
        dateRange: { start: "2026-09-07", end: "2026-09-10" },
        icsEventCount: 2,
        icsHasRrule: false,
      },
      boundary: "기준일 변경으로 제목·Item 수·원문을 바꾸지 않는다.",
    },
    {
      id: "change-relative-to-absolute",
      group: "condition_change",
      title: "상대 날짜를 절대 날짜로 명시",
      summary: "두 오프셋을 작성자가 확정한 ISO 날짜로 바꾼다.",
      sourceShape: "절대 날짜 2개",
      naturalDestination: "calendar",
      rawText: [
        "# 행사 준비",
        "## 준비",
        "- [ ] 장소 확인",
        "  - 날짜: 2026-08-07",
        "- [ ] 최종 확인",
        "  - 날짜: 2026-08-10",
      ].join("\n"),
      comparisonKey: "relative-anchor",
      changeLabel: "절대 날짜로 확정",
      expected: {
        itemCount: 2,
        stepCount: 1,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 2, todo: 2, sheet: 2, memo: 2 },
        issueCount: 0,
        dateRange: { start: "2026-08-07", end: "2026-08-10" },
        icsEventCount: 2,
        icsHasRrule: false,
      },
      boundary: "ISO 날짜가 명시된 경우에만 기준일 없이 캘린더를 만든다.",
    },
    {
      id: "change-mixed-dated-undated",
      group: "condition_change",
      title: "날짜 있음 + 날짜 없음 혼합",
      summary: "한 Item만 날짜가 있을 때 Todo를 주 결과로 유지한다.",
      sourceShape: "날짜 1개 · 미정 1개",
      naturalDestination: "todo",
      rawText: [
        "# 혼합 일정",
        "## 실행",
        "- [ ] 예약 확인",
        "  - 날짜: 2026-08-03",
        "- [ ] 메모 정리",
      ].join("\n"),
      comparisonKey: "date-coverage",
      changeLabel: "두 번째 Item 날짜 제거",
      expected: {
        itemCount: 2,
        stepCount: 1,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 1, todo: 2, sheet: 0, memo: 2 },
        issueCount: 0,
        dateRange: { start: "2026-08-03", end: "2026-08-03" },
        icsEventCount: 1,
        icsHasRrule: false,
      },
      boundary: "날짜 없는 Item을 VEVENT로 만들지 않는다.",
    },
    {
      id: "change-time-timezone-duration",
      group: "condition_change",
      title: "시간·시간대·소요 시간 추가",
      summary: "날짜 Item에 실행 시각과 지속시간을 한 필드씩 더한다.",
      sourceShape: "시간 지정 일정 1개",
      naturalDestination: "calendar",
      rawText: [
        "# 시간 지정",
        "## 실행",
        "- [ ] 인터뷰 진행",
        "  - 날짜: 2026-08-03",
        "  - 시간: 09:00",
        "  - 시간대: Asia/Seoul",
        "  - 소요 시간: 30분",
      ].join("\n"),
      comparisonKey: "schedule-detail",
      changeLabel: "09:00 · Asia/Seoul · 30분",
      expected: {
        itemCount: 1,
        stepCount: 1,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 1, todo: 1, sheet: 0, memo: 1 },
        issueCount: 0,
        dateRange: { start: "2026-08-03", end: "2026-08-03" },
        icsEventCount: 1,
        icsHasRrule: false,
      },
      boundary:
        "시간과 지속시간은 날짜가 있는 Item에만 실행 일정으로 적용한다.",
    },
    {
      id: "change-daily-repeat-until-date",
      group: "condition_change",
      title: "매일 반복 + 종료일",
      summary:
        "매일 반복을 명시한 종료일까지 계산해 네 결과에 같은 5회차를 만든다.",
      sourceShape: "일일 루틴 Item 1개 · 종료일 포함",
      naturalDestination: "calendar",
      rawText: [
        "# 5일 아침 스트레칭",
        "## 실행",
        "- [ ] 스트레칭 영상 따라하기",
        "  - 날짜: 2026-08-11",
        "  - 시간: 07:30",
        "  - 반복: 매일",
        "  - 반복 종료: 2026-08-15",
        "  - 자료: [스트레칭 영상](https://example.com/stretch)",
        "  - 완료 기준: 영상을 끝까지 한 번 따라했습니다.",
      ].join("\n"),
      comparisonKey: "repeat-end",
      changeLabel: "매일 · 2026-08-15 종료",
      expected: {
        itemCount: 1,
        stepCount: 1,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 5, todo: 5, sheet: 5, memo: 5 },
        issueCount: 0,
        dateRange: { start: "2026-08-11", end: "2026-08-15" },
        repeatValues: ["매일"],
        resourceUrls: ["https://example.com/stretch"],
        icsEventCount: 5,
        icsHasRrule: false,
      },
      boundary:
        "원본 Item은 하나로 유지하고 종료일을 포함한 5개 회차만 파생한다.",
    },
    {
      id: "change-same-day-timed-agenda",
      group: "condition_change",
      title: "같은 날 여러 일정 · 시간순",
      summary:
        "원문 시간이 뒤섞여 있어도 Calendar는 종일 일정 다음에 시각 오름차순으로 보여 준다.",
      sourceShape: "하루 일정 4개 · 종일 1개 + 시간 지정 3개",
      naturalDestination: "calendar",
      rawText: [
        "# 세미나 하루 일정",
        "## 실행",
        "- [ ] 네트워킹 메모 정리",
        "  - 날짜: 2026-08-20",
        "  - 시간: 16:30",
        "  - 소요 시간: 30분",
        "  - 장소: 라운지",
        "- [ ] 참가 등록",
        "  - 날짜: 2026-08-20",
        "  - 시간: 09:00",
        "  - 소요 시간: 30분",
        "  - 장소: 등록 데스크",
        "- [ ] 행사 안내 확인",
        "  - 날짜: 2026-08-20",
        "- [ ] 발표 세션 참여",
        "  - 날짜: 2026-08-20",
        "  - 시간: 10:00",
        "  - 소요 시간: 60분",
        "  - 장소: 세미나실",
      ].join("\n"),
      comparisonKey: "same-day-order",
      changeLabel: "종일 먼저 · 09:00 · 10:00 · 16:30",
      expected: {
        itemCount: 4,
        stepCount: 1,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 4, todo: 4, sheet: 4, memo: 4 },
        issueCount: 0,
        dateRange: { start: "2026-08-20", end: "2026-08-20" },
        icsEventCount: 4,
        icsHasRrule: false,
      },
      boundary:
        "Calendar만 종일·시간순으로 표시하고 Todo·Sheet·TXT와 원문은 작성 순서를 유지한다.",
    },
    {
      id: "change-repeat-condition-weekly",
      group: "condition_change",
      title: "매주 반복 + 실행 조건",
      summary: "매주 반복 회차를 4주 범위로 계산하고 실행 조건은 표시만 한다.",
      sourceShape: "반복 문구가 있는 일정 1개",
      naturalDestination: "calendar",
      rawText: [
        "# 정기 점검",
        "## 실행",
        "- [ ] 필터 확인",
        "  - 날짜: 2026-08-03",
        "  - 반복: 매주 월요일",
        "  - 실행 조건: 사용 중인 경우",
      ].join("\n"),
      comparisonKey: "repeat-condition",
      changeLabel: "매주 월요일 · 사용 중",
      expected: {
        itemCount: 1,
        stepCount: 1,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 4, todo: 4, sheet: 4, memo: 4 },
        issueCount: 0,
        repeatValues: ["매주 월요일"],
        conditionValues: ["사용 중인 경우"],
        icsEventCount: 4,
        icsHasRrule: false,
      },
      boundary:
        "원본 Item은 하나로 유지하고 보이는 회차만 파생하며 RRULE은 만들지 않는다.",
    },
    {
      id: "change-latest-grammar-showcase",
      group: "condition_change",
      title: "최신 문법 한눈에 · 3회 반복",
      summary:
        "날짜·유한 반복·하위 체크·링크·추가 메모의 최신 처리 결과를 한 번에 확인한다.",
      sourceShape: "유한 반복 Item 1개 · 하위 체크 2개 · 링크 2개",
      naturalDestination: "calendar",
      rawText: [
        "# 최신 문법 한눈에",
        "## 실행",
        "- [ ] 정기 자료 확인",
        "  - 설명: 세 번의 실행에서 같은 자료를 확인합니다.",
        "  - 날짜: 2026-08-03",
        "  - 반복: 매주 월요일",
        "  - 반복 종료: 3회",
        "  - 실행 조건: 자료가 공개된 경우",
        "  - [ ] 참고 자료 열기",
        "  - [ ] 확인 메모 남기기",
        "  - 자료: [참고 자료](https://example.com/resource)",
        "  - 출처: [원문](https://example.com/source)",
        "  - 담당 메모: 담당자와 확인 범위를 적습니다.",
      ].join("\n"),
      comparisonKey: "latest-grammar",
      changeLabel: "유한 3회 · 하위 체크 · 링크 · 추가 메모",
      expected: {
        title: "최신 문법 한눈에",
        itemCount: 1,
        stepCount: 1,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 3, todo: 3, sheet: 3, memo: 3 },
        issueCount: 0,
        dateRange: { start: "2026-08-03", end: "2026-08-17" },
        repeatValues: ["매주 월요일"],
        conditionValues: ["자료가 공개된 경우"],
        resourceUrls: [
          "https://example.com/resource",
          "https://example.com/source",
        ],
        icsEventCount: 3,
        icsHasRrule: false,
      },
      boundary:
        "추가 메모는 설명에 보존하고 날짜·반복·링크를 설명에 다시 넣지 않는다.",
    },
    {
      id: "change-repeat-condition-monthly",
      group: "condition_change",
      title: "매월 반복 + 변경된 조건",
      summary:
        "지원하는 월간 반복을 계산하고 조건 문구는 회차 수에 영향을 주지 않는다.",
      sourceShape: "반복 문구가 있는 일정 1개",
      naturalDestination: "calendar",
      rawText: [
        "# 정기 점검",
        "## 실행",
        "- [ ] 필터 확인",
        "  - 날짜: 2026-08-15",
        "  - 반복: 매월 15일",
        "  - 실행 조건: 경고등이 꺼져 있는 경우",
      ].join("\n"),
      comparisonKey: "repeat-condition",
      changeLabel: "매월 15일 · 경고등 꺼짐",
      expected: {
        itemCount: 1,
        stepCount: 1,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 1, todo: 1, sheet: 1, memo: 1 },
        issueCount: 0,
        repeatValues: ["매월 15일"],
        conditionValues: ["경고등이 꺼져 있는 경우"],
        icsEventCount: 1,
        icsHasRrule: false,
      },
      boundary: "조건은 필터나 자동 분기 규칙으로 해석하지 않는다.",
    },
  ];
}

function compatibilityAndErrorScenarios(): GrammarSimulationScenario[] {
  return [
    {
      id: "compat-legacy-aliases",
      group: "compatibility",
      title: "이전 초안 별칭 읽기",
      summary:
        "자세히·예상 시간·link 같은 이전 표기를 읽기 호환으로만 허용한다.",
      sourceShape: "Legacy Markdown 1 Item",
      naturalDestination: "calendar",
      rawText: [
        "# 이전 초안",
        "## 실행",
        "- [ ] 첫 번째 항목",
        "  자세히: 이전 설명입니다.",
        "  날짜: 2026-08-03",
        "  예상 시간: 45분",
        "  link: 이전 자료 | https://example.com/legacy",
      ].join("\n"),
      expected: {
        itemCount: 1,
        stepCount: 1,
        primaryArtifact: "calendar",
        artifactCounts: { calendar: 1, todo: 1, sheet: 0, memo: 1 },
        issueCount: 0,
        resourceUrls: ["https://example.com/legacy"],
        icsEventCount: 1,
        icsHasRrule: false,
      },
      boundary: "새로 내보낼 때는 공식 표기 설명·소요 시간·자료를 사용한다.",
    },
    {
      id: "compat-title-h1-wins",
      group: "compatibility",
      title: "H1과 저장 제목 충돌",
      summary: "붙여 넣은 Markdown H1을 화면·canonical 제목의 기준으로 삼는다.",
      sourceShape: "H1 + 1 Item",
      naturalDestination: "todo",
      rawText: ["# 원문에 적힌 제목", "## 단계", "- [ ] 제목 확인"].join("\n"),
      options: {
        title: "저장된 옛 제목",
      },
      expected: {
        title: "원문에 적힌 제목",
        itemCount: 1,
        stepCount: 1,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 0, todo: 1, sheet: 0, memo: 1 },
        issueCount: 0,
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary: "두 제목을 별도 Flow로 만들거나 조용히 섞지 않는다.",
    },
    {
      id: "compat-resource-links",
      group: "compatibility",
      title: "공식 링크 + 이전 구분자",
      summary:
        "Markdown 링크와 “이름 | URL”을 모두 읽되 URL을 그대로 보존한다.",
      sourceShape: "링크 표현 2종 · 2 Item",
      naturalDestination: "todo",
      rawText: [
        "# 링크 형식",
        "## 실행",
        "- [ ] 공식 형식 확인",
        "  자료: [참고 자료](https://example.com/resource)",
        "  출처: [원문](https://example.com/source)",
        "- [ ] 이전 형식 확인",
        "  자료: 이전 자료 | https://example.com/legacy",
      ].join("\n"),
      expected: {
        itemCount: 2,
        stepCount: 1,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 0, todo: 2, sheet: 0, memo: 2 },
        issueCount: 0,
        resourceUrls: [
          "https://example.com/legacy",
          "https://example.com/resource",
          "https://example.com/source",
        ],
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary: "링크 이름을 행동 제목으로 승격하지 않는다.",
    },
    {
      id: "error-unknown-property",
      group: "exception_handling",
      title: "정의되지 않은 속성 · 설명 보존",
      summary: "Item 바로 아래의 미정 속성을 이름과 값 그대로 설명에 보존한다.",
      sourceShape: "알 수 없는 속성 1개",
      naturalDestination: "todo",
      rawText: [
        "# 속성 오류",
        "## 실행",
        "- [ ] 항목 확인",
        "  - 담당자: 홍길동",
      ].join("\n"),
      expected: {
        itemCount: 1,
        stepCount: 1,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 0, todo: 1, sheet: 0, memo: 1 },
        issueCount: 0,
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary:
        "구조 필드로 승격하거나 값을 버리지 않고 원문 설명으로만 보존한다.",
    },
    {
      id: "error-ambiguous-date",
      group: "exception_handling",
      title: "연도 없는 날짜",
      summary: "8월 3일을 현재 연도나 다음 날짜로 추정하지 않는다.",
      sourceShape: "모호한 날짜 1개",
      naturalDestination: "review",
      rawText: [
        "# 날짜 오류",
        "## 실행",
        "- [ ] 항공권 확인",
        "  - 날짜: 8월 3일",
      ].join("\n"),
      expected: {
        itemCount: 1,
        stepCount: 1,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 0, todo: 1, sheet: 0, memo: 1 },
        issueCount: 1,
        issueTypes: ["invalid_date"],
        issueMessageKeys: ["authoring.invalid_explicit_date"],
        dateRange: null,
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary:
        "예외 처리 방침은 확정됐지만 YYYY-MM-DD로 고칠 때까지 Calendar는 만들지 않는다.",
    },
    {
      id: "error-invalid-relative-date",
      group: "exception_handling",
      title: "지원하지 않는 상대 날짜",
      summary: "“내일”을 D+1로 자동 치환하지 않는다.",
      sourceShape: "모호한 상대 날짜 1개",
      naturalDestination: "review",
      rawText: [
        "# 상대 날짜 오류",
        "## 실행",
        "- [ ] 장소 확인",
        "  - 상대 날짜: 내일",
      ].join("\n"),
      expected: {
        itemCount: 1,
        stepCount: 1,
        primaryArtifact: "todo",
        artifactCounts: { calendar: 0, todo: 1, sheet: 0, memo: 1 },
        issueCount: 1,
        issueTypes: ["invalid_date"],
        issueMessageKeys: ["authoring.invalid_explicit_relative_date"],
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary:
        "예외 처리 방침은 확정됐지만 D-숫자·D-Day·D+숫자로 고칠 때까지 날짜를 계산하지 않는다.",
    },
    {
      id: "error-url-only",
      group: "exception_handling",
      title: "URL만 붙여 넣음",
      summary: "AI import가 없는 현재 단계에서는 URL 내용을 추정하지 않는다.",
      sourceShape: "URL 1개",
      naturalDestination: "review",
      rawText: "https://example.com/source",
      expected: {
        inputKinds: ["url"],
        itemCount: 0,
        stepCount: 0,
        primaryArtifact: "memo",
        artifactCounts: { calendar: 0, todo: 0, sheet: 0, memo: 0 },
        issueCount: 1,
        issueTypes: ["source_import_required"],
        issueMessageKeys: ["authoring.source_import_required"],
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary:
        "예외 처리 방침은 확정됐지만 원문 본문을 직접 넣기 전에는 URL 내용을 발명하지 않는다.",
    },
    {
      id: "error-explanatory-prose",
      group: "exception_handling",
      title: "표식 없는 설명문 · TXT 보존",
      summary:
        "완료 가능한 행동이 아닌 문장을 Item으로 만들지 않고 원문 메모로 보존한다.",
      sourceShape: "설명 문장 1개",
      naturalDestination: "memo",
      rawText: "제주 여행은 여름에 사람이 많습니다.",
      expected: {
        inputKinds: ["plain_text"],
        itemCount: 0,
        stepCount: 0,
        primaryArtifact: "memo",
        artifactCounts: { calendar: 0, todo: 0, sheet: 0, memo: 1 },
        issueCount: 1,
        issueTypes: ["ambiguous_role"],
        issueMessageKeys: ["authoring.ambiguous_plain_sentence"],
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary:
        "표식 없는 문장은 Item으로 추론하지 않고 TXT 원문 메모로 자동 보존하며 검토 경고를 만들지 않는다.",
    },
    {
      id: "compat-tab-table",
      group: "compatibility",
      title: "탭 표",
      summary:
        "표의 행을 1:1 Sheet/TXT 행으로 유지하고 행동을 발명하지 않는다.",
      sourceShape: "TSV · 3 SourceRow",
      naturalDestination: "sheet",
      rawText: [
        "순서\t주제\t활동",
        "1\t첫 번째\t강의 듣기",
        "2\t두 번째\t실습하기",
        "3\t세 번째\t복습하기",
      ].join("\n"),
      comparisonKey: "table-format",
      changeLabel: "탭",
      expected: {
        inputKinds: ["table"],
        itemCount: 3,
        stepCount: 1,
        primaryArtifact: "sheet",
        artifactCounts: { calendar: 0, todo: 0, sheet: 3, memo: 3 },
        issueCount: 0,
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary:
        "표 행 수를 합치거나 나누지 않으며 명시 행동 표식이 없으면 Todo로 만들지 않는다.",
    },
    {
      id: "compat-csv-table",
      group: "compatibility",
      title: "CSV 표",
      summary: "쉼표가 포함된 인용 셀도 한 행으로 유지한다.",
      sourceShape: "CSV · 2 SourceRow",
      naturalDestination: "sheet",
      rawText: [
        "순서,작품,자료",
        '1,"어린 왕자, 낭독본",https://example.com/1',
        "2,오만과 편견,https://example.com/2",
      ].join("\n"),
      comparisonKey: "table-format",
      changeLabel: "CSV",
      expected: {
        inputKinds: ["table", "url", "mixed"],
        itemCount: 2,
        stepCount: 1,
        primaryArtifact: "sheet",
        artifactCounts: { calendar: 0, todo: 0, sheet: 2, memo: 2 },
        issueCount: 0,
        firstItemTitle: "어린 왕자, 낭독본",
        lastItemTitle: "오만과 편견",
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary:
        "쉼표 한 개만으로 일반 메모를 표로 오인하지 않고 표의 사실 행을 Todo로 만들지 않는다.",
    },
    {
      id: "compat-markdown-table",
      group: "compatibility",
      title: "Markdown 표",
      summary: "익숙한 Markdown 표도 Sheet 행으로 읽는다.",
      sourceShape: "Markdown table · 2 SourceRow",
      naturalDestination: "sheet",
      rawText: [
        "| 순서 | 주제 | 활동 |",
        "| --- | --- | --- |",
        "| 1 | 첫 번째 | 강의 듣기 |",
        "| 2 | 두 번째 | 실습하기 |",
      ].join("\n"),
      comparisonKey: "table-format",
      changeLabel: "Markdown 표",
      expected: {
        inputKinds: ["table"],
        itemCount: 2,
        stepCount: 1,
        primaryArtifact: "sheet",
        artifactCounts: { calendar: 0, todo: 0, sheet: 2, memo: 2 },
        issueCount: 0,
        icsEventCount: 0,
        icsHasRrule: false,
      },
      boundary:
        "표 안의 설명 셀을 별도 Item으로 확장하거나 사실 행을 Todo로 만들지 않는다.",
    },
  ];
}

export const TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS: GrammarSimulationScenario[] =
  [
    ...existingContentScenarios(),
    ...conditionChangeScenarios(),
    ...compatibilityAndErrorScenarios(),
  ];
