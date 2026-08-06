import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PptxGenJS from "pptxgenjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT = path.join(
  ROOT,
  "docs/content-audit/2026-07-30-ai-calendar-task-scheduling-strategy-ko.pptx",
);
const REPORT_ASSETS = path.join(
  ROOT,
  "docs/content-audit/2026-07-30-ai-calendar-task-scheduling-strategy-assets",
);
const ASSET = {
  motion: path.join(REPORT_ASSETS, "motion-ai-calendar.png"),
  reclaim: path.join(REPORT_ASSETS, "reclaim-assistant.png"),
  microsoft: path.join(REPORT_ASSETS, "microsoft-reschedule-preferences.png"),
  apple: path.join(REPORT_ASSETS, "apple-suggested-reminders.png"),
  notion: path.join(REPORT_ASSETS, "notion-meeting-notes.png"),
  flowme: path.join(REPORT_ASSETS, "flowme-current-calendar-myflow.png"),
};

for (const [key, filePath] of Object.entries(ASSET)) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required asset: ${key} -> ${filePath}`);
  }
}

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "OpenAI Codex";
pptx.company = "FlowMe";
pptx.subject = "AI calendar, task, and scheduling market research and FlowMe strategy";
pptx.title = "AI 일정관리의 다음 승부처";
pptx.lang = "ko-KR";
pptx.theme = {
  headFontFace: "Malgun Gothic",
  bodyFontFace: "Malgun Gothic",
  lang: "ko-KR",
};
pptx.defineSlideMaster({
  title: "FLOWME",
  background: { color: "FFFFFF" },
  objects: [
    {
      line: {
        x: 0.43,
        y: 7.05,
        w: 12.47,
        h: 0,
        line: { color: "E5E7EB", width: 0.7 },
      },
    },
    {
      text: {
        text: "FLOWME · AI SCHEDULING STRATEGY · 2026.07.30",
        options: {
          x: 0.45,
          y: 7.12,
          w: 6.4,
          h: 0.18,
          margin: 0,
          fontFace: "Malgun Gothic",
          fontSize: 7,
          color: "7A818D",
          charSpacing: 0.5,
        },
      },
    },
  ],
  slideNumber: {
    x: 12.35,
    y: 7.1,
    w: 0.45,
    h: 0.2,
    margin: 0,
    fontFace: "Malgun Gothic",
    fontSize: 8,
    color: "7A818D",
    align: "right",
  },
});

const C = {
  ink: "0B0D12",
  muted: "667085",
  faint: "98A2B3",
  line: "D9DEE7",
  panel: "F2F4F7",
  panel2: "F8FAFC",
  white: "FFFFFF",
  blue: "3D8DFF",
  blueDark: "1D5FD0",
  bluePale: "DCEEFF",
  blueSoft: "EFF6FF",
  cyan: "D0EDFA",
  green: "16A56A",
  greenPale: "E6F7EF",
  amber: "E9A23B",
  amberPale: "FFF4DD",
  red: "D92D20",
  redPale: "FEECEB",
};

const S = pptx.ShapeType;
const FONT = "Malgun Gothic";

function addText(slide, text, x, y, w, h, opts = {}) {
  const base = {
    x,
    y,
    w,
    h,
    margin: 0,
    fontFace: FONT,
    fontSize: opts.fontSize ?? 18,
    color: opts.color ?? C.ink,
    bold: opts.bold ?? false,
    align: opts.align ?? "left",
    valign: opts.valign ?? "mid",
    breakLine: false,
    fit: opts.fit ?? "shrink",
    paraSpaceAfterPt: opts.paraSpaceAfterPt ?? 0,
    isTextBox: true,
  };
  if (opts.italic !== undefined) base.italic = opts.italic;
  if (opts.charSpacing !== undefined) base.charSpacing = opts.charSpacing;
  if (opts.bullet !== undefined) base.bullet = opts.bullet;
  if (opts.transparency !== undefined) base.transparency = opts.transparency;
  slide.addText(text, base);
}

function addBox(slide, x, y, w, h, opts = {}) {
  slide.addShape(opts.shape ?? S.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: opts.radius ?? 0.08,
    fill: {
      color: opts.fill ?? C.panel,
      transparency: opts.fillTransparency ?? 0,
    },
    line: {
      color: opts.line ?? opts.fill ?? C.panel,
      transparency: opts.lineTransparency ?? 0,
      width: opts.lineWidth ?? 0.7,
      dash: opts.dash ?? "solid",
    },
  });
}

function addLine(slide, x, y, w, h, opts = {}) {
  slide.addShape(S.line, {
    x,
    y,
    w,
    h,
    line: {
      color: opts.color ?? C.line,
      width: opts.width ?? 1.2,
      dash: opts.dash ?? "solid",
      beginArrowType: opts.beginArrowType,
      endArrowType: opts.endArrowType,
    },
  });
}

function addPill(slide, text, x, y, w, opts = {}) {
  addBox(slide, x, y, w, opts.h ?? 0.34, {
    fill: opts.fill ?? C.bluePale,
    line: opts.line ?? opts.fill ?? C.bluePale,
    radius: 0.18,
  });
  addText(slide, text, x + 0.08, y + 0.02, w - 0.16, (opts.h ?? 0.34) - 0.04, {
    fontSize: opts.fontSize ?? 10.5,
    bold: opts.bold ?? true,
    color: opts.color ?? C.blueDark,
    align: opts.align ?? "center",
  });
}

function addTitle(slide, title, kicker, subtitle) {
  if (kicker) {
    addText(slide, kicker.toUpperCase(), 0.45, 0.27, 6.6, 0.22, {
      fontSize: 9,
      bold: true,
      color: C.blueDark,
      charSpacing: 1.15,
    });
  }
  addText(slide, title, 0.45, 0.54, 12.25, 0.62, {
    fontSize: 28,
    bold: true,
    color: C.ink,
    valign: "top",
  });
  if (subtitle) {
    addText(slide, subtitle, 0.45, 1.15, 12.15, 0.36, {
      fontSize: 12.5,
      color: C.muted,
      valign: "top",
    });
  }
}

function addMetric(slide, x, y, w, value, label, opts = {}) {
  const metricHeight = opts.h ?? 1.25;
  addBox(slide, x, y, w, metricHeight, {
    fill: opts.fill ?? C.panel2,
    line: opts.line ?? C.line,
  });
  if (metricHeight < 1) {
    addText(slide, value, x + 0.16, y + 0.09, w * 0.48, metricHeight - 0.18, {
      fontSize: opts.valueSize ?? 16,
      bold: true,
      color: opts.valueColor ?? C.ink,
      valign: "mid",
    });
    addText(
      slide,
      label,
      x + w * 0.54,
      y + 0.09,
      w * 0.41,
      metricHeight - 0.18,
      {
        fontSize: opts.labelSize ?? 9,
        color: opts.labelColor ?? C.muted,
        align: "right",
        valign: "mid",
      },
    );
    return;
  }
  addText(slide, value, x + 0.18, y + 0.14, w - 0.36, 0.52, {
    fontSize: opts.valueSize ?? 26,
    bold: true,
    color: opts.valueColor ?? C.ink,
    valign: "top",
  });
  addText(slide, label, x + 0.18, y + 0.78, w - 0.36, 0.28, {
    fontSize: opts.labelSize ?? 10.5,
    color: opts.labelColor ?? C.muted,
    valign: "top",
  });
}

function addNotes(slide, sources) {
  const text = ["[Sources]", ...sources.map((s) => `- ${s}`)].join("\n");
  slide.addNotes(text);
}

function addImageFrame(slide, filePath, x, y, w, h, opts = {}) {
  addBox(slide, x - 0.03, y - 0.03, w + 0.06, h + 0.06, {
    fill: opts.frameFill ?? C.white,
    line: opts.line ?? C.line,
    lineWidth: 0.8,
  });
  slide.addImage({ path: filePath, x, y, w, h });
}

function addArrowLabel(slide, x1, y, x2, label) {
  addLine(slide, x1, y, x2 - x1, 0, {
    color: C.blue,
    width: 2,
    endArrowType: "triangle",
  });
  if (label) {
    addPill(slide, label, (x1 + x2) / 2 - 0.55, y - 0.45, 1.1, {
      fill: C.white,
      line: C.line,
      color: C.muted,
      fontSize: 9.5,
    });
  }
}

function addCheckRow(slide, text, x, y, w, opts = {}) {
  addBox(slide, x, y + 0.02, 0.24, 0.24, {
    fill: opts.fill ?? C.greenPale,
    line: opts.line ?? C.green,
    radius: 0.05,
  });
  addText(slide, opts.icon ?? "✓", x, y, 0.24, 0.27, {
    fontSize: 10,
    bold: true,
    color: opts.iconColor ?? C.green,
    align: "center",
  });
  addText(slide, text, x + 0.34, y, w - 0.34, 0.3, {
    fontSize: opts.fontSize ?? 11,
    color: opts.color ?? C.ink,
  });
}

// 1 — Cover
{
  const slide = pptx.addSlide("FLOWME");
  slide.background = { color: C.white };
  addText(slide, "FLOWME STRATEGY", 0.45, 0.38, 3.2, 0.25, {
    fontSize: 10,
    bold: true,
    color: C.blueDark,
    charSpacing: 1.7,
  });
  addPill(slide, "2026.07.30 기준 · 공식 출처 10개 제품", 9.1, 0.36, 3.78, {
    fill: C.panel,
    line: C.panel,
    color: C.muted,
    fontSize: 9.5,
  });
  addText(slide, "AI 일정관리의\n다음 승부처", 0.45, 1.25, 7.6, 1.7, {
    fontSize: 50,
    bold: true,
    color: C.ink,
    valign: "top",
    fit: "shrink",
  });
  addText(
    slide,
    "캘린더를 대신 조작하는 것이 아니라,\n콘텐츠를 출처가 보존된 실행 일정으로 바꾸는 것",
    0.48,
    3.26,
    7.5,
    0.92,
    { fontSize: 22, color: C.blueDark, bold: true, valign: "top" },
  );
  addBox(slide, 8.3, 1.32, 4.55, 4.6, {
    fill: C.ink,
    line: C.ink,
  });
  addText(slide, "SOURCE", 8.7, 1.78, 2.8, 0.35, {
    fontSize: 12,
    color: C.cyan,
    bold: true,
    charSpacing: 1.5,
  });
  addText(slide, "→", 11.85, 1.74, 0.5, 0.4, {
    fontSize: 22,
    color: C.blue,
    bold: true,
    align: "center",
  });
  addText(slide, "ITEM", 8.7, 2.46, 2.8, 0.35, {
    fontSize: 12,
    color: C.white,
    bold: true,
    charSpacing: 1.5,
  });
  addText(slide, "→", 11.85, 2.42, 0.5, 0.4, {
    fontSize: 22,
    color: C.blue,
    bold: true,
    align: "center",
  });
  addText(slide, "CONSTRAINT", 8.7, 3.14, 3.1, 0.35, {
    fontSize: 12,
    color: C.white,
    bold: true,
    charSpacing: 1.5,
  });
  addText(slide, "→", 11.85, 3.1, 0.5, 0.4, {
    fontSize: 22,
    color: C.blue,
    bold: true,
    align: "center",
  });
  addText(slide, "PREVIEW", 8.7, 3.82, 2.8, 0.35, {
    fontSize: 12,
    color: C.white,
    bold: true,
    charSpacing: 1.5,
  });
  addText(slide, "→", 11.85, 3.78, 0.5, 0.4, {
    fontSize: 22,
    color: C.blue,
    bold: true,
    align: "center",
  });
  addText(slide, "EXPORT + RECEIPT", 8.7, 4.5, 3.6, 0.42, {
    fontSize: 12,
    color: C.cyan,
    bold: true,
    charSpacing: 1.2,
  });
  addText(slide, "리서치 → 제품 경계 → 3개 사용자 여정 → 수치형 실험", 0.48, 6.25, 8, 0.36, {
    fontSize: 13,
    color: C.muted,
  });
  addNotes(slide, [
    `${ROOT}/docs/content-audit/2026-07-30-ai-calendar-task-scheduling-research-source-ledger-ko.md`,
    `${ROOT}/docs/PRODUCT_PRINCIPLES.md`,
  ]);
}

// 2 — Executive answer
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "결론: 범용 AI 캘린더는 이미 붐빈다",
    "EXECUTIVE ANSWER",
    "FlowMe가 소유해야 할 빈칸은 ‘원본 콘텐츠 → 실행 가능한 일정 후보 → 안전한 외부 이동’이다.",
  );
  addMetric(slide, 0.45, 1.73, 2.75, "8 / 9", "맥락→action을 명확히 지원", {
    valueColor: C.blueDark,
  });
  addMetric(slide, 3.39, 1.73, 2.75, "7 / 9", "Preview·승인·Undo 명시", {
    valueColor: C.blueDark,
  });
  addMetric(slide, 6.33, 1.73, 2.75, "2 / 9", "지속 자동 재스케줄 명확", {
    valueColor: C.red,
  });
  addMetric(slide, 9.27, 1.73, 3.56, "3개", "FlowMe 우선 검증 실험", {
    valueColor: C.green,
  });

  const cards = [
    {
      n: "01",
      title: "입력은 평준화됐다",
      body: "채팅·음성·이메일·회의에서 task를 만드는 기능은 기본 기대치다.",
      fill: C.panel2,
    },
    {
      n: "02",
      title: "신뢰는 diff에서 생긴다",
      body: "제안 → 편집 → 승인 → 적용 → receipt/undo가 시장의 안전 계약으로 수렴한다.",
      fill: C.blueSoft,
    },
    {
      n: "03",
      title: "FlowMe는 source를 보존한다",
      body: "원문과 개인 일정의 경계를 보존하며 Calendar·Todo·Sheet·Memo로 보낸다.",
      fill: C.panel2,
    },
  ];
  cards.forEach((c, i) => {
    const x = 0.45 + i * 4.15;
    addBox(slide, x, 3.35, 3.92, 2.42, { fill: c.fill, line: C.line });
    addText(slide, c.n, x + 0.22, 3.56, 0.52, 0.38, {
      fontSize: 14,
      bold: true,
      color: C.blueDark,
    });
    addText(slide, c.title, x + 0.22, 4.02, 3.4, 0.45, {
      fontSize: 20,
      bold: true,
    });
    addText(slide, c.body, x + 0.22, 4.62, 3.42, 0.8, {
      fontSize: 12.5,
      color: C.muted,
      valign: "top",
    });
  });
  addPill(slide, "권고", 0.45, 6.25, 0.78, {
    fill: C.ink,
    line: C.ink,
    color: C.white,
  });
  addText(
    slide,
    "다음 AI 일정 slice는 ‘Study pacing preview’ 하나로 제한하고, 외부 캘린더 직접 쓰기는 round-trip 근거 뒤로 둔다.",
    1.42,
    6.22,
    11.25,
    0.36,
    { fontSize: 14, bold: true },
  );
  addNotes(slide, [
    `${ROOT}/docs/content-audit/2026-07-30-ai-calendar-task-scheduling-research-source-ledger-ko.md`,
    "https://help.reclaim.ai/en/articles/14846468-reclaim-ai-2-0-overview",
    "https://www.usemotion.com/help/time-management/auto-scheduling",
    "https://support.google.com/gemini/answer/15305236",
    "https://support.microsoft.com/en-us/planner/what-can-you-do-with-planner-agent-in-copilot",
  ]);
}

// 3 — Evolution
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "최근 발전은 ‘생성’보다 ‘계속 살아 있는 실행 루프’다",
    "MARKET EVOLUTION",
    "아래는 출시 연도가 아니라 2026년 7월 현재 기능 성숙도를 설명하는 4단계다.",
  );
  const stages = [
    {
      n: "1",
      title: "Capture",
      body: "채팅·음성으로\nTask / Event 생성",
      ex: "Todoist Ramble\nMotion AI Chat",
      color: C.panel,
    },
    {
      n: "2",
      title: "Extract",
      body: "이메일·회의·문서에서\naction과 날짜 추출",
      ex: "Apple Suggestions\nNotion Meeting Notes",
      color: C.blueSoft,
    },
    {
      n: "3",
      title: "Schedule",
      body: "duration·deadline·priority로\n후보 배치·재계획",
      ex: "Sunsama Projection\nMotion / Reclaim",
      color: C.bluePale,
    },
    {
      n: "4",
      title: "Agent loop",
      body: "trigger → diff → 승인 →\n적용 → history / undo",
      ex: "Google Spark\nMicrosoft / Notion",
      color: C.ink,
      inverse: true,
    },
  ];
  stages.forEach((s, i) => {
    const x = 0.45 + i * 3.12;
    addBox(slide, x, 1.75, 2.78, 3.78, {
      fill: s.color,
      line: s.inverse ? C.ink : C.line,
    });
    addPill(slide, s.n, x + 0.22, 1.98, 0.42, {
      fill: s.inverse ? C.blue : C.white,
      line: s.inverse ? C.blue : C.line,
      color: s.inverse ? C.white : C.blueDark,
    });
    addText(slide, s.title, x + 0.22, 2.56, 2.34, 0.45, {
      fontSize: 22,
      bold: true,
      color: s.inverse ? C.white : C.ink,
    });
    addText(slide, s.body, x + 0.22, 3.18, 2.34, 0.88, {
      fontSize: 13,
      bold: true,
      color: s.inverse ? C.white : C.ink,
      valign: "top",
    });
    addLine(slide, x + 0.22, 4.28, 2.3, 0, {
      color: s.inverse ? "3A414D" : C.line,
      width: 1,
    });
    addText(slide, s.ex, x + 0.22, 4.48, 2.34, 0.72, {
      fontSize: 10.5,
      color: s.inverse ? C.cyan : C.muted,
      valign: "top",
    });
    if (i < stages.length - 1) {
      addText(slide, "→", x + 2.82, 3.32, 0.3, 0.4, {
        fontSize: 20,
        bold: true,
        color: C.blue,
        align: "center",
      });
    }
  });
  addBox(slide, 0.45, 5.92, 12.4, 0.73, {
    fill: C.panel2,
    line: C.line,
  });
  addText(slide, "공통 기반", 0.72, 6.08, 1.25, 0.32, {
    fontSize: 11,
    bold: true,
    color: C.blueDark,
  });
  addText(
    slide,
    "겉은 대화형 AI지만, 실행 품질은 Task/Event 의미·제약 필드·검토 가능한 변경안이 결정한다.",
    1.92,
    6.04,
    10.56,
    0.36,
    { fontSize: 14, bold: true },
  );
  addNotes(slide, [
    "https://www.todoist.com/help/articles/turn-your-scattered-thoughts-into-clear-tasks-ramble-jan-21-HhmP8ue8R",
    "https://www.usemotion.com/help/knowledge-management/ai-chat",
    "https://support.apple.com/guide/iphone/use-apple-intelligence-in-reminders-iphcb580b580/26/ios/26",
    "https://www.notion.com/en-US/product/ai-meeting-notes",
    "https://www.sunsama.com/features/timeboxing",
    "https://help.reclaim.ai/en/articles/14846468-reclaim-ai-2-0-overview",
    "https://support.google.com/gemini/answer/17094710",
    "https://support.microsoft.com/en-US/Outlook/calendar-instructions-in-outlook-and-copilot",
  ]);
}

// 4 — Capability matrix
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "자연어·추출은 기본, 지속 자동 재계획은 아직 소수",
    "CAPABILITY MATRIX",
    "현재 운영 9개 제품을 공식 문서로 보수적으로 코딩했다. Y=명확, P=제한적·수동·설정형, N=공식 범위에서 확인 안 됨.",
  );

  const products = [
    ["Motion", "Y", "Y", "P", "Y", "P"],
    ["Reclaim 2.0", "Y", "Y", "Y", "Y", "Y"],
    ["Sunsama", "P", "Y", "Y", "P", "N"],
    ["Akiflow", "Y", "Y", "Y", "P", "Y"],
    ["Todoist", "Y", "Y", "P", "N", "N"],
    ["Google", "Y", "Y", "Y", "N", "Y"],
    ["Microsoft", "Y", "Y", "Y", "P", "Y"],
    ["Apple", "Y", "P", "Y", "N", "N"],
    ["Notion", "Y", "Y", "Y", "P", "Y"],
  ];
  const colorFor = (v) =>
    v === "Y"
      ? { fill: C.bluePale, color: C.blueDark }
      : v === "P"
        ? { fill: C.amberPale, color: "9A6700" }
        : { fill: C.panel, color: C.faint };
  const headers = [
    "제품",
    "맥락→action",
    "자연어\n생성·수정",
    "Preview\n승인·Undo",
    "지속 자동\n재계획",
    "일정·이벤트\ntrigger agent",
  ];
  const colWidths = [1.82, 2.12, 2.12, 2.12, 2.12, 2.1];
  const colX = [];
  let cursorX = 0.45;
  colWidths.forEach((width) => {
    colX.push(cursorX);
    cursorX += width;
  });
  headers.forEach((header, index) => {
    addBox(slide, colX[index], 1.67, colWidths[index], 0.53, {
      fill: C.ink,
      line: C.line,
      radius: 0.01,
    });
    addText(
      slide,
      header,
      colX[index] + 0.05,
      1.71,
      colWidths[index] - 0.1,
      0.43,
      {
        fontSize: 9.5,
        bold: true,
        color: C.white,
        align: index === 0 ? "left" : "center",
      },
    );
  });
  products.forEach((row, rowIndex) => {
    const y = 2.2 + rowIndex * 0.42;
    row.forEach((value, colIndex) => {
      const cellColor =
        colIndex === 0 ? { fill: C.white, color: C.ink } : colorFor(value);
      addBox(slide, colX[colIndex], y, colWidths[colIndex], 0.42, {
        fill: cellColor.fill,
        line: C.line,
        radius: 0.01,
      });
      addText(
        slide,
        value,
        colX[colIndex] + 0.07,
        y + 0.04,
        colWidths[colIndex] - 0.14,
        0.31,
        {
          fontSize: colIndex === 0 ? 9.7 : 10.5,
          bold: true,
          color: cellColor.color,
          align: colIndex === 0 ? "left" : "center",
        },
      );
    });
  });

  const counts = [
    ["맥락→action", "8Y / 1P"],
    ["자연어", "8Y / 1P"],
    ["검토·Undo", "7Y / 2P"],
    ["지속 재계획", "2Y / 4P / 3N"],
    ["trigger", "5Y / 1P / 3N"],
  ];
  counts.forEach((c, i) => {
    const x = 0.45 + i * 2.49;
    addText(slide, c[0], x, 6.47, 1.48, 0.24, {
      fontSize: 9.5,
      color: C.muted,
    });
    addText(slide, c[1], x + 1.25, 6.43, 1.12, 0.3, {
      fontSize: 11.5,
      bold: true,
      color: i === 3 ? C.red : C.blueDark,
      align: "right",
    });
  });
  addNotes(slide, [
    `${ROOT}/docs/content-audit/2026-07-30-ai-calendar-task-scheduling-research-source-ledger-ko.md`,
    "https://www.usemotion.com/help/time-management/auto-scheduling",
    "https://help.reclaim.ai/en/articles/14846468-reclaim-ai-2-0-overview",
    "https://www.sunsama.com/features/timeboxing",
    "https://product.akiflow.com/en/help/articles/3161671-schedule-optimizer",
    "https://www.todoist.com/help/articles/introduction-to-todoist-assist-KgPP22q5O",
    "https://support.google.com/gemini/answer/15305236",
    "https://support.microsoft.com/en-US/Outlook/calendar-instructions-in-outlook-and-copilot",
    "https://support.apple.com/guide/iphone/use-apple-intelligence-in-reminders-iphcb580b580/26/ios/26",
    "https://www.notion.com/help/connect-calendar-to-custom-agents",
  ]);
}

// 5 — Motion vs Reclaim actual UI
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "같은 ‘AI 일정’도 통제 계약은 다르다",
    "REAL UI · AUTOPILOT VS PREVIEW",
    "Motion은 지속 최적화를 전면에, Reclaim 2.0은 Preview Mode와 Assistant를 전면에 둔다.",
  );
  addImageFrame(slide, ASSET.motion, 0.45, 1.63, 5.92, 4.11);
  addImageFrame(slide, ASSET.reclaim, 6.91, 1.63, 5.92, 3.79);
  addPill(slide, "MOTION", 0.7, 1.85, 0.98, {
    fill: C.ink,
    line: C.ink,
    color: C.white,
  });
  addPill(slide, "RECLAIM 2.0", 7.16, 1.85, 1.36, {
    fill: C.white,
    line: C.line,
    color: C.ink,
  });
  addBox(slide, 0.45, 5.91, 5.92, 0.72, { fill: C.panel2, line: C.line });
  addText(slide, "Task를 deadline·duration·priority로 계속 재배치", 0.7, 6.08, 5.4, 0.32, {
    fontSize: 12.5,
    bold: true,
  });
  addBox(slide, 6.91, 5.57, 5.92, 1.06, { fill: C.blueSoft, line: C.line });
  addText(slide, "Planner에서 변경을 먼저 보고", 7.16, 5.74, 2.6, 0.32, {
    fontSize: 12,
    color: C.muted,
  });
  addText(slide, "Preview → Apply / Discard", 9.48, 5.72, 3.04, 0.36, {
    fontSize: 15,
    bold: true,
    color: C.blueDark,
    align: "right",
  });
  addText(slide, "FlowMe 권고", 7.16, 6.14, 1.25, 0.25, {
    fontSize: 10,
    bold: true,
    color: C.blueDark,
  });
  addText(slide, "초기값은 Reclaim식 reviewable diff", 8.33, 6.09, 4.2, 0.32, {
    fontSize: 12.5,
    bold: true,
    align: "right",
  });
  addNotes(slide, [
    "https://www.usemotion.com/features/ai-calendar",
    `Asset captured from official Motion page on 2026-07-30: ${ASSET.motion}`,
    "https://help.reclaim.ai/en/articles/14846468-reclaim-ai-2-0-overview",
    `Asset captured from official Reclaim page on 2026-07-30: ${ASSET.reclaim}`,
  ]);
}

// 6 — Incumbent context UI
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "플랫폼 사업자는 ‘이미 가진 맥락’에서 바로 실행한다",
    "REAL UI · CONTEXT TO ACTION",
    "메일·계정·회의·캘린더 맥락은 Google·Microsoft·Apple·Notion이 구조적으로 유리한 영역이다.",
  );
  const cols = [
    {
      x: 0.45,
      w: 3.8,
      label: "APPLE",
      title: "원문 아래 제안",
      body: "Mail 내용에서 reminder를 제안하고 개별 Add 또는 Include All로 확정한다.",
      image: ASSET.apple,
      iw: 1.77,
      ih: 3.66,
      ix: 1.47,
      iy: 1.68,
    },
    {
      x: 4.52,
      w: 4.0,
      label: "MICROSOFT",
      title: "허용 범위를 구조화",
      body: "충돌 시 재조정 토글과 acceptable day/time을 먼저 받는다.",
      image: ASSET.microsoft,
      iw: 3.8,
      ih: 2.38,
      ix: 4.62,
      iy: 1.94,
    },
    {
      x: 8.78,
      w: 4.05,
      label: "NOTION",
      title: "회의가 action으로",
      body: "회의 transcript를 Summary·Next Steps로 바꿔 후속 실행에 연결한다.",
      image: ASSET.notion,
      iw: 3.85,
      ih: 2.41,
      ix: 8.88,
      iy: 1.94,
    },
  ];
  cols.forEach((c) => {
    addBox(slide, c.x, 1.56, c.w, 4.88, { fill: C.panel2, line: C.line });
    addPill(slide, c.label, c.x + 0.18, 1.75, c.label === "MICROSOFT" ? 1.32 : 0.96, {
      fill: C.white,
      line: C.line,
      color: C.ink,
      fontSize: 9,
    });
    addImageFrame(slide, c.image, c.ix, c.iy, c.iw, c.ih, { line: C.line });
    addText(slide, c.title, c.x + 0.22, 5.52, c.w - 0.44, 0.34, {
      fontSize: 16,
      bold: true,
    });
    addText(slide, c.body, c.x + 0.22, 5.91, c.w - 0.44, 0.4, {
      fontSize: 10.5,
      color: C.muted,
      valign: "top",
    });
  });
  addText(
    slide,
    "FlowMe의 차별화는 같은 맥락을 다시 소유하는 것이 아니라, 외부 source의 실행 구조와 provenance를 가지고 들어오는 것.",
    0.48,
    6.61,
    12.25,
    0.3,
    { fontSize: 13.5, bold: true, color: C.blueDark, align: "center" },
  );
  addNotes(slide, [
    "https://support.apple.com/en-ie/124025",
    `Asset captured from official Apple support page on 2026-07-30: ${ASSET.apple}`,
    "https://support.microsoft.com/en-us/office/automatically-reschedule-events-with-copilot-in-microsoft-outlook-and-microsoft-teams",
    `Asset captured from official Microsoft support page on 2026-07-30: ${ASSET.microsoft}`,
    "https://www.notion.com/product/ai-meeting-notes",
    `Asset captured from official Notion product page on 2026-07-30: ${ASSET.notion}`,
  ]);
}

// 7 — Clockwise shutdown
{
  const slide = pptx.addSlide();
  slide.background = { color: C.ink };
  addText(slide, "MARKET RISK", 0.45, 0.38, 2.6, 0.24, {
    fontSize: 10,
    bold: true,
    color: C.cyan,
    charSpacing: 1.5,
  });
  addText(slide, "자동화 성과는\n영속성을 보장하지 않는다", 0.45, 0.92, 8.2, 1.38, {
    fontSize: 38,
    bold: true,
    color: C.white,
    valign: "top",
  });
  const stats = [
    ["40K", "조직"],
    ["8M", "Focus Time 시간"],
    ["23M", "재배치한 회의"],
  ];
  stats.forEach((s, i) => {
    const x = 0.45 + i * 3.65;
    addText(slide, s[0], x, 3.1, 3.05, 0.76, {
      fontSize: 42,
      bold: true,
      color: i === 2 ? C.blue : C.white,
    });
    addText(slide, s[1], x, 3.95, 3.05, 0.35, {
      fontSize: 12,
      color: C.faint,
    });
  });
  addLine(slide, 0.45, 4.8, 12.3, 0, { color: "353A44", width: 1 });
  addText(slide, "CLOCKWISE", 0.45, 5.23, 2.8, 0.36, {
    fontSize: 15,
    bold: true,
    color: C.white,
    charSpacing: 1.5,
  });
  addText(slide, "2026.03.27", 9.7, 5.06, 3.04, 0.62, {
    fontSize: 30,
    bold: true,
    color: C.blue,
    align: "right",
  });
  addText(
    slide,
    "서비스 종료 · Smart Hold 삭제 · Flexible Meetings 중지 · 데이터 삭제 예정",
    0.45,
    5.84,
    8.8,
    0.42,
    { fontSize: 13, color: C.faint },
  );
  addBox(slide, 0.45, 6.46, 12.28, 0.5, {
    fill: "171B22",
    line: "353A44",
  });
  addText(
    slide,
    "FlowMe 신뢰 계약 = portable export + change history + rollback + source receipt",
    0.7,
    6.55,
    11.8,
    0.28,
    { fontSize: 13.5, bold: true, color: C.cyan, align: "center" },
  );
  slide.addNotes(
    [
      "[Sources]",
      "- https://getclockwise.com/",
      "- https://status.getclockwise.com/",
      "- https://support.getclockwise.com/article/184-flexible-meetings",
      "- Vendor-reported cumulative figures; not independently verified.",
    ].join("\n"),
  );
}

// 8 — Autonomy ladder
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "AI 일정은 한 모드가 아니라 자율성 사다리다",
    "AUTONOMY LADDER",
    "콘텐츠 위험도와 외부 영향에 따라 제안·투영·승인형 변경·지속 자동화를 구분해야 한다.",
  );
  const ladder = [
    {
      x: 0.45,
      y: 4.67,
      w: 2.7,
      h: 1.35,
      n: "01",
      title: "제안",
      ex: "Apple · Todoist",
      body: "Add / Include",
      fill: C.panel,
    },
    {
      x: 3.22,
      y: 3.86,
      w: 2.8,
      h: 2.16,
      n: "02",
      title: "비파괴 투영",
      ex: "Sunsama",
      body: "Projection → drag",
      fill: C.blueSoft,
    },
    {
      x: 6.11,
      y: 2.84,
      w: 2.9,
      h: 3.18,
      n: "03",
      title: "변경안 + 승인",
      ex: "Akiflow · Reclaim",
      body: "Preview / Apply / Undo",
      fill: C.bluePale,
    },
    {
      x: 9.11,
      y: 1.73,
      w: 3.72,
      h: 4.29,
      n: "04",
      title: "지속 자동화",
      ex: "Motion · Reclaim",
      body: "background replan",
      fill: C.ink,
      inverse: true,
    },
  ];
  ladder.forEach((l) => {
    addBox(slide, l.x, l.y, l.w, l.h, {
      fill: l.fill,
      line: l.inverse ? C.ink : C.line,
    });
    addPill(slide, l.n, l.x + 0.2, l.y + 0.2, 0.46, {
      fill: l.inverse ? C.blue : C.white,
      line: l.inverse ? C.blue : C.line,
      color: l.inverse ? C.white : C.blueDark,
    });
    addText(slide, l.title, l.x + 0.2, l.y + 0.72, l.w - 0.4, 0.42, {
      fontSize: l.inverse ? 24 : 18,
      bold: true,
      color: l.inverse ? C.white : C.ink,
    });
    if (l.h > 1.8) {
      addText(slide, l.ex, l.x + 0.2, l.y + 1.38, l.w - 0.4, 0.3, {
        fontSize: 11,
        bold: true,
        color: l.inverse ? C.cyan : C.blueDark,
      });
      addText(slide, l.body, l.x + 0.2, l.y + 1.83, l.w - 0.4, 0.36, {
        fontSize: 11.5,
        color: l.inverse ? C.faint : C.muted,
      });
    } else {
      addText(slide, l.ex, l.x + 0.2, l.y + 1.07, l.w - 0.4, 0.22, {
        fontSize: 9.5,
        bold: true,
        color: C.blueDark,
      });
    }
  });
  addLine(slide, 0.65, 6.37, 11.75, 0, {
    color: C.blue,
    width: 2.2,
    endArrowType: "triangle",
  });
  addText(slide, "사용자 통제 높음", 0.45, 6.5, 2.2, 0.27, {
    fontSize: 10.5,
    color: C.muted,
  });
  addText(slide, "외부 영향·복구 요구 높음", 10.04, 6.5, 2.78, 0.27, {
    fontSize: 10.5,
    color: C.red,
    bold: true,
    align: "right",
  });
  addNotes(slide, [
    "https://support.apple.com/guide/iphone/use-apple-intelligence-in-reminders-iphcb580b580/26/ios/26",
    "https://www.todoist.com/help/articles/turn-your-scattered-thoughts-into-clear-tasks-ramble-jan-21-HhmP8ue8R",
    "https://www.sunsama.com/features/timeboxing",
    "https://product.akiflow.com/en/help/articles/3161671-schedule-optimizer",
    "https://help.reclaim.ai/en/articles/14846468-reclaim-ai-2-0-overview",
    "https://www.usemotion.com/help/time-management/auto-scheduling",
  ]);
}

// 9 — Structured contract
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "Chat은 표면, 일정 품질은 구조화된 계약이 만든다",
    "PRODUCT CONTRACT",
    "AI는 해석·제안·설명하고, deterministic scheduler가 검증 가능한 규칙으로 배치한다.",
  );
  addBox(slide, 0.45, 1.65, 4.02, 4.88, { fill: C.ink, line: C.ink });
  addText(slide, "자연어 입력", 0.76, 1.98, 1.6, 0.32, {
    fontSize: 12,
    bold: true,
    color: C.cyan,
  });
  addText(
    slide,
    "“8월 3일 시작,\n주 3회,\n월·수·금 저녁”",
    0.76,
    2.5,
    3.2,
    1.46,
    { fontSize: 25, bold: true, color: C.white, valign: "top" },
  );
  addText(slide, "AI가 제약 필드로 해석", 0.76, 4.32, 2.8, 0.3, {
    fontSize: 11.5,
    color: C.faint,
  });
  const chips = [
    ["START", "08.03"],
    ["PACE", "3 / week"],
    ["DAYS", "M·W·F"],
    ["TIME", "evening"],
    ["FLEX", "movable"],
  ];
  chips.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.76 + col * 1.62;
    const y = 4.79 + row * 0.52;
    addBox(slide, x, y, col === 0 ? 1.44 : 1.48, 0.38, {
      fill: "202631",
      line: "3A414D",
    });
    addText(slide, c[0], x + 0.08, y + 0.04, 0.54, 0.24, {
      fontSize: 7.5,
      bold: true,
      color: C.faint,
    });
    addText(slide, c[1], x + 0.58, y + 0.02, 0.76, 0.28, {
      fontSize: 9,
      bold: true,
      color: C.cyan,
      align: "right",
    });
  });
  addArrowLabel(slide, 4.69, 4.06, 5.42, "parse");

  const nodes = [
    {
      x: 5.56,
      y: 1.72,
      w: 2.18,
      h: 1.27,
      title: "SourceRow",
      body: "원문·anchor·순서",
      fill: C.panel2,
    },
    {
      x: 8.01,
      y: 1.72,
      w: 2.18,
      h: 1.27,
      title: "Canonical Item",
      body: "state·type·owner",
      fill: C.panel2,
    },
    {
      x: 10.46,
      y: 1.72,
      w: 2.32,
      h: 1.27,
      title: "Constraints",
      body: "date·duration·flex",
      fill: C.blueSoft,
    },
    {
      x: 5.56,
      y: 3.62,
      w: 2.18,
      h: 1.45,
      title: "Deterministic\nschedule",
      body: "규칙으로 후보 계산",
      fill: C.bluePale,
    },
    {
      x: 8.01,
      y: 3.62,
      w: 2.18,
      h: 1.45,
      title: "Editable diff",
      body: "바뀐 행만 표시",
      fill: C.bluePale,
    },
    {
      x: 10.46,
      y: 3.62,
      w: 2.32,
      h: 1.45,
      title: "Destinations",
      body: "Todo · Sheet · Calendar",
      fill: C.ink,
      inverse: true,
    },
  ];
  nodes.forEach((n) => {
    addBox(slide, n.x, n.y, n.w, n.h, {
      fill: n.fill,
      line: n.inverse ? C.ink : C.line,
    });
    addText(slide, n.title, n.x + 0.17, n.y + 0.18, n.w - 0.34, 0.55, {
      fontSize: 16,
      bold: true,
      color: n.inverse ? C.white : C.ink,
      valign: "top",
    });
    addText(slide, n.body, n.x + 0.17, n.y + n.h - 0.4, n.w - 0.34, 0.24, {
      fontSize: 9.5,
      color: n.inverse ? C.cyan : C.muted,
    });
  });
  addLine(slide, 7.75, 2.36, 0.22, 0, { color: C.blue, width: 1.6, endArrowType: "triangle" });
  addLine(slide, 10.2, 2.36, 0.22, 0, { color: C.blue, width: 1.6, endArrowType: "triangle" });
  addLine(slide, 11.62, 3.02, 0, 0.34, { color: C.blue, width: 1.6 });
  addLine(slide, 6.74, 3.36, 4.88, 0, {
    color: C.blue,
    width: 1.6,
    beginArrowType: "triangle",
  });
  addLine(slide, 7.75, 4.34, 0.22, 0, { color: C.blue, width: 1.6, endArrowType: "triangle" });
  addLine(slide, 10.2, 4.34, 0.22, 0, { color: C.blue, width: 1.6, endArrowType: "triangle" });
  addBox(slide, 5.56, 5.55, 7.22, 0.88, { fill: C.panel2, line: C.line });
  addText(slide, "AI가 해도 되는 일", 5.82, 5.74, 1.52, 0.24, {
    fontSize: 10,
    bold: true,
    color: C.blueDark,
  });
  addText(slide, "parse · propose · explain", 7.16, 5.7, 2.15, 0.3, {
    fontSize: 12.5,
    bold: true,
  });
  addText(slide, "규칙이 해야 하는 일", 9.38, 5.74, 1.68, 0.24, {
    fontSize: 10,
    bold: true,
    color: C.muted,
  });
  addText(slide, "validate · place · diff", 11.02, 5.7, 1.5, 0.3, {
    fontSize: 12.5,
    bold: true,
    align: "right",
  });
  addNotes(slide, [
    "https://www.usemotion.com/help/time-management/auto-scheduling",
    "https://www.usemotion.com/help/project-management/task/reference-tasks/the-difference-between-tasks-and-events-in-motion",
    "https://www.sunsama.com/features/timeboxing",
    `${ROOT}/docs/DECISIONS.md`,
    `${ROOT}/docs/specs/2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/user-pacing-schedule-contract-v1.json`,
  ]);
}

// 10 — Closed loop
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "시장은 일정 생성에서 ‘관찰·실행·재계획’ 폐루프로 이동했다",
    "CLOSED LOOP",
    "FlowMe는 전체 캘린더를 소유할 필요가 없다. source와 실행 artefact 사이의 단절을 닫으면 된다.",
  );
  const loop = [
    ["SOURCE", "강의·이메일·회의"],
    ["ACTION", "Item 추출"],
    ["PLAN", "제약·일정 후보"],
    ["EXECUTE", "Todo·Calendar"],
    ["OBSERVE", "완료·이탈"],
    ["REPLAN", "future-only diff"],
  ];
  loop.forEach((n, i) => {
    const x = 0.45 + i * 2.08;
    const highlight = i <= 2 || i === 5;
    addBox(slide, x, 2.05, 1.72, 1.52, {
      fill: highlight ? C.blueSoft : C.panel2,
      line: highlight ? C.blue : C.line,
      lineWidth: highlight ? 1.5 : 0.7,
    });
    addText(slide, n[0], x + 0.15, 2.26, 1.42, 0.26, {
      fontSize: 10,
      bold: true,
      color: highlight ? C.blueDark : C.muted,
      charSpacing: 0.8,
    });
    addText(slide, n[1], x + 0.15, 2.72, 1.42, 0.48, {
      fontSize: 12.5,
      bold: true,
      valign: "top",
    });
    if (i < loop.length - 1) {
      addLine(slide, x + 1.76, 2.81, 0.27, 0, {
        color: C.blue,
        width: 1.6,
        endArrowType: "triangle",
      });
    }
  });
  addLine(slide, 11.62, 3.75, 0, 0.8, {
    color: C.blue,
    width: 1.6,
    dash: "dash",
  });
  addLine(slide, 1.18, 4.55, 10.44, 0, {
    color: C.blue,
    width: 1.6,
    dash: "dash",
    beginArrowType: "triangle",
  });
  addText(slide, "source update / missed schedule", 5.16, 4.13, 2.8, 0.28, {
    fontSize: 10,
    color: C.blueDark,
    bold: true,
    align: "center",
  });
  addBox(slide, 0.45, 5.05, 5.92, 1.23, { fill: C.ink, line: C.ink });
  addText(slide, "플랫폼이 강한 영역", 0.72, 5.28, 1.65, 0.28, {
    fontSize: 11,
    bold: true,
    color: C.cyan,
  });
  addText(slide, "계정 · Gmail · Outlook · 캘린더 충돌 · trigger", 0.72, 5.72, 5.2, 0.34, {
    fontSize: 15,
    bold: true,
    color: C.white,
  });
  addBox(slide, 6.91, 5.05, 5.92, 1.23, { fill: C.bluePale, line: C.blue });
  addText(slide, "FlowMe가 가져갈 빈칸", 7.18, 5.28, 1.9, 0.28, {
    fontSize: 11,
    bold: true,
    color: C.blueDark,
  });
  addText(slide, "source provenance · version · portable receipt · safe diff", 7.18, 5.72, 5.2, 0.34, {
    fontSize: 15,
    bold: true,
    color: C.ink,
  });
  addNotes(slide, [
    "https://www.notion.com/en-US/product/ai-meeting-notes",
    "https://help.reclaim.ai/en/articles/14846468-reclaim-ai-2-0-overview",
    "https://support.google.com/gemini/answer/17094710",
    "https://support.microsoft.com/en-US/Outlook/calendar-instructions-in-outlook-and-copilot",
    `${ROOT}/docs/PRODUCT_PRINCIPLES.md`,
    `${ROOT}/docs/DECISIONS.md`,
  ]);
}

// 11 — Personas
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "세 페르소나의 공통 요구는 ‘대신 결정’이 아니라 ‘안전한 개인화’다",
    "PERSONAS & SCENARIOS",
    "AI 역할은 콘텐츠 종류와 실패 비용에 따라 달라진다.",
  );
  const personas = [
    {
      x: 0.45,
      tag: "P1 · 학습",
      name: "준호",
      situation: "2주 커리큘럼을\n현실적인 속도로",
      input: "시작일 · 주 3회 · 요일",
      ai: "제약 해석",
      rule: "lesson 순서 보존",
      output: "Todo + Sheet + Calendar",
      metric: "≤ 3분",
      fill: C.blueSoft,
    },
    {
      x: 4.59,
      tag: "P2 · 이사",
      name: "민지",
      situation: "D-30 체크리스트를\n내 이사일로",
      input: "이사일 1개",
      ai: "날짜 이유 설명",
      rule: "anchor offset 보존",
      output: "Checklist + 핵심 anchor",
      metric: "발명 0건",
      fill: C.panel2,
    },
    {
      x: 8.73,
      tag: "P3 · 멀티 Flow",
      name: "수진",
      situation: "오늘 할 일에서\n지금 할 3개 선택",
      input: "가용시간 · must-do",
      ai: "3개 + 이유 제안",
      rule: "전체 목록 보존",
      output: "accept / replace / undate",
      metric: "≤ 20초",
      fill: C.bluePale,
    },
  ];
  personas.forEach((p) => {
    addBox(slide, p.x, 1.62, 3.86, 4.95, { fill: p.fill, line: C.line });
    addPill(slide, p.tag, p.x + 0.2, 1.84, 1.25, {
      fill: C.white,
      line: C.line,
      color: C.blueDark,
      fontSize: 9,
    });
    addText(slide, p.name, p.x + 2.72, 1.84, 0.88, 0.32, {
      fontSize: 15,
      bold: true,
      align: "right",
    });
    addText(slide, p.situation, p.x + 0.22, 2.47, 3.25, 0.92, {
      fontSize: 22,
      bold: true,
      valign: "top",
    });
    const rows = [
      ["입력", p.input],
      ["AI", p.ai],
      ["규칙", p.rule],
      ["결과", p.output],
    ];
    rows.forEach((r, i) => {
      const y = 3.68 + i * 0.52;
      addText(slide, r[0], p.x + 0.22, y, 0.55, 0.27, {
        fontSize: 9.5,
        bold: true,
        color: C.muted,
      });
      addText(slide, r[1], p.x + 0.85, y, 2.62, 0.29, {
        fontSize: 11.5,
        bold: true,
        align: "right",
      });
      if (i < rows.length - 1) {
        addLine(slide, p.x + 0.22, y + 0.39, 3.25, 0, {
          color: C.line,
          width: 0.7,
        });
      }
    });
    addBox(slide, p.x + 0.22, 5.92, 3.42, 0.42, {
      fill: C.ink,
      line: C.ink,
    });
    addText(slide, p.metric, p.x + 0.38, 5.99, 3.1, 0.24, {
      fontSize: 12,
      bold: true,
      color: C.cyan,
      align: "center",
    });
  });
  addNotes(slide, [
    `${ROOT}/docs/content-audit/2026-07-30-ai-calendar-task-scheduling-research-source-ledger-ko.md`,
    `${ROOT}/docs/specs/2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/user-pacing-schedule-contract-v1.json`,
    `${ROOT}/docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/fixtures/canonical/bundle-moving-d30.json`,
  ]);
}

// 12 — Study journey
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "우선 여정: 커리큘럼을 ‘내 속도’로 바꾸고 바로 검토한다",
    "JOURNEY 01 · STUDY PACING",
    "첫 AI 일정 slice로 권고: source lesson은 잠그고, 개인 pacing만 수정 가능하게 한다.",
  );
  // Source card
  addBox(slide, 0.45, 1.62, 3.25, 4.68, { fill: C.panel2, line: C.line });
  addPill(slide, "SOURCE · LOCKED", 0.68, 1.84, 1.42, {
    fill: C.white,
    line: C.line,
    color: C.muted,
    fontSize: 8.5,
  });
  addText(slide, "오픽 모의고사\n2주 계획", 0.68, 2.37, 2.65, 0.86, {
    fontSize: 23,
    bold: true,
    valign: "top",
  });
  ["1회 모의고사", "2회 모의고사", "3회 모의고사", "…", "주간 총복습"].forEach(
    (t, i) => {
      addCheckRow(slide, t, 0.72, 3.48 + i * 0.48, 2.54, {
        fill: C.white,
        line: C.line,
        icon: "•",
        iconColor: C.blueDark,
        fontSize: 10.5,
      });
    },
  );
  addText(slide, "순서·원문 영상·범위 유지", 0.7, 5.97, 2.72, 0.25, {
    fontSize: 9.5,
    color: C.muted,
    align: "center",
  });
  addArrowLabel(slide, 3.83, 3.95, 4.4, "personalize");

  // Controls
  addBox(slide, 4.53, 1.62, 3.2, 4.68, { fill: C.blueSoft, line: C.blue });
  addPill(slide, "MY PACING", 4.77, 1.84, 1.05, {
    fill: C.white,
    line: C.line,
    color: C.blueDark,
    fontSize: 8.5,
  });
  addText(slide, "“8월 3일 시작,\n주 3회, 월·수·금”", 4.77, 2.38, 2.68, 0.82, {
    fontSize: 19,
    bold: true,
    valign: "top",
  });
  const fields = [
    ["시작일", "2026.08.03"],
    ["속도", "주 3회"],
    ["요일", "월 · 수 · 금"],
    ["시간", "저녁"],
  ];
  fields.forEach((f, i) => {
    const y = 3.45 + i * 0.57;
    addBox(slide, 4.78, y, 2.7, 0.43, { fill: C.white, line: C.line });
    addText(slide, f[0], 4.9, y + 0.07, 0.58, 0.23, {
      fontSize: 9,
      color: C.muted,
    });
    addText(slide, f[1], 5.52, y + 0.05, 1.8, 0.26, {
      fontSize: 10.5,
      bold: true,
      align: "right",
    });
  });
  addText(slide, "AI: 자연어 → 필드", 4.8, 5.89, 1.42, 0.26, {
    fontSize: 9.5,
    bold: true,
    color: C.blueDark,
  });
  addText(slide, "규칙: 날짜 후보 계산", 6.02, 5.89, 1.42, 0.26, {
    fontSize: 9.5,
    bold: true,
    color: C.ink,
    align: "right",
  });
  addArrowLabel(slide, 7.86, 3.95, 8.43, "preview");

  // Calendar preview
  addBox(slide, 8.56, 1.62, 4.27, 4.68, { fill: C.white, line: C.line });
  addPill(slide, "PREVIEW · 6 CHANGES", 8.8, 1.84, 1.7, {
    fill: C.bluePale,
    line: C.bluePale,
    color: C.blueDark,
    fontSize: 8.5,
  });
  addText(slide, "8월", 11.79, 1.84, 0.75, 0.28, {
    fontSize: 14,
    bold: true,
    align: "right",
  });
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  days.forEach((d, i) => {
    addText(slide, d, 8.82 + i * 0.72, 2.4, 0.6, 0.22, {
      fontSize: 7.5,
      color: C.faint,
      align: "center",
    });
  });
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      const x = 8.8 + c * 0.72;
      const y = 2.72 + r * 0.86;
      addBox(slide, x, y, 0.64, 0.72, {
        fill: C.panel2,
        line: C.line,
        radius: 0.04,
      });
      addText(slide, String(3 + r * 5 + c), x + 0.08, y + 0.06, 0.22, 0.2, {
        fontSize: 7.5,
        color: C.faint,
      });
    }
  }
  const events = [
    [0, 0, "1회"],
    [0, 2, "2회"],
    [0, 4, "3회"],
    [1, 0, "4회"],
    [1, 2, "5회"],
    [1, 4, "복습"],
  ];
  events.forEach(([r, c, t]) => {
    const x = 8.82 + c * 0.72;
    const y = 3.04 + r * 0.86;
    addBox(slide, x, y, 0.59, 0.25, { fill: C.blue, line: C.blue, radius: 0.05 });
    addText(slide, t, x + 0.03, y + 0.01, 0.53, 0.18, {
      fontSize: 7.2,
      bold: true,
      color: C.white,
      align: "center",
    });
  });
  addText(slide, "변경된 날짜만 파란색", 8.8, 5.55, 1.8, 0.22, {
    fontSize: 8.5,
    color: C.blueDark,
  });
  addBox(slide, 8.8, 5.82, 1.08, 0.32, { fill: C.white, line: C.line });
  addText(slide, "수정", 8.8, 5.87, 1.08, 0.18, {
    fontSize: 8.5,
    align: "center",
  });
  addBox(slide, 9.98, 5.82, 2.56, 0.32, { fill: C.ink, line: C.ink });
  addText(slide, "Todo + Sheet 저장", 10.02, 5.87, 2.48, 0.18, {
    fontSize: 8.5,
    bold: true,
    color: C.white,
    align: "center",
  });

  addMetric(slide, 0.45, 6.48, 2.55, "≤ 3분", "usable schedule median", {
    h: 0.47,
    valueSize: 13,
    labelSize: 8.5,
    fill: C.white,
  });
  addMetric(slide, 3.2, 6.48, 2.55, "≥ 35%", "manual 대비 단축", {
    h: 0.47,
    valueSize: 13,
    labelSize: 8.5,
    fill: C.white,
  });
  addMetric(slide, 5.95, 6.48, 2.55, "0건", "source/date/duration 발명", {
    h: 0.47,
    valueSize: 13,
    labelSize: 8.5,
    fill: C.white,
  });
  addMetric(slide, 8.7, 6.48, 4.13, "9 / 12", "수정 ≤ 2회 안에 저장·export", {
    h: 0.47,
    valueSize: 13,
    labelSize: 8.5,
    fill: C.white,
  });
  addNotes(slide, [
    `${ROOT}/docs/specs/2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/user-pacing-schedule-contract-v1.json`,
    `${ROOT}/docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/fixtures/canonical/bundle-opic-plan.json`,
    `${ROOT}/docs/content-audit/2026-07-30-ai-calendar-task-scheduling-research-source-ledger-ko.md`,
    "UI shown is a strategy prototype, not a production screenshot.",
  ]);
}

// 13 — Moving journey
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "이사 여정: AI는 날짜를 만들지 않고 ‘왜 이 날짜인지’ 설명한다",
    "JOURNEY 02 · MOVING D-30",
    "source anchor offset은 deterministic하게 계산하고, 완료·과거·원문 일정은 자동 이동하지 않는다.",
  );
  addBox(slide, 0.45, 1.64, 12.38, 1.02, { fill: C.panel2, line: C.line });
  addText(slide, "개인 anchor", 0.72, 1.86, 1.05, 0.24, {
    fontSize: 10,
    bold: true,
    color: C.blueDark,
  });
  addText(slide, "이사일", 2.06, 1.84, 0.72, 0.26, {
    fontSize: 10.5,
    color: C.muted,
  });
  addText(slide, "2026.09.01", 2.77, 1.8, 1.66, 0.34, {
    fontSize: 16,
    bold: true,
  });
  addLine(slide, 4.72, 2.15, 5.2, 0, { color: C.blue, width: 2, endArrowType: "triangle" });
  addText(slide, "source offset 적용", 6.42, 1.78, 1.74, 0.26, {
    fontSize: 10,
    bold: true,
    color: C.blueDark,
    align: "center",
  });
  addText(slide, "원문 날짜 발명 0건", 10.22, 1.8, 2.28, 0.34, {
    fontSize: 15,
    bold: true,
    color: C.green,
    align: "right",
  });

  const timeline = [
    ["D-30", "08.02", "업체 견적·예약"],
    ["D-14", "08.18", "주소·정기배송 변경"],
    ["D-7", "08.25", "인터넷·관리사무소"],
    ["D-1", "08.31", "귀중품·최종 확인"],
    ["D-DAY", "09.01", "이사·인수 확인"],
  ];
  addLine(slide, 1.18, 3.62, 10.8, 0, { color: C.line, width: 3 });
  timeline.forEach((t, i) => {
    const x = 1.18 + i * 2.7;
    slide.addShape(S.ellipse, {
      x: x - 0.12,
      y: 3.5,
      w: 0.24,
      h: 0.24,
      fill: { color: i === 4 ? C.ink : C.blue },
      line: { color: i === 4 ? C.ink : C.blue, width: 0.5 },
    });
    addText(slide, t[0], x - 0.54, 2.97, 1.08, 0.28, {
      fontSize: 11,
      bold: true,
      color: i === 4 ? C.ink : C.blueDark,
      align: "center",
    });
    addText(slide, t[1], x - 0.54, 3.83, 1.08, 0.28, {
      fontSize: 13,
      bold: true,
      align: "center",
    });
    addText(slide, t[2], x - 0.84, 4.25, 1.68, 0.65, {
      fontSize: 10.5,
      color: C.muted,
      align: "center",
      valign: "top",
    });
  });

  addBox(slide, 0.45, 5.2, 7.48, 1.17, { fill: C.blueSoft, line: C.blue });
  addPill(slide, "AI 설명", 0.7, 5.42, 0.86, {
    fill: C.white,
    line: C.line,
    color: C.blueDark,
  });
  addText(
    slide,
    "“D-14 원문 anchor를 이사일에서 14일 뺀 8월 18일로 계산했습니다.”",
    1.8,
    5.39,
    5.85,
    0.36,
    { fontSize: 13, bold: true },
  );
  addText(slide, "source row 확인", 1.82, 5.86, 1.3, 0.24, {
    fontSize: 9,
    color: C.blueDark,
  });
  addText(slide, "개인 날짜 수정", 3.2, 5.86, 1.24, 0.24, {
    fontSize: 9,
    color: C.blueDark,
  });
  addText(slide, "Checklist 저장", 4.54, 5.86, 1.24, 0.24, {
    fontSize: 9,
    color: C.blueDark,
  });
  addBox(slide, 8.18, 5.2, 4.65, 1.17, { fill: C.panel2, line: C.line });
  addText(slide, "재계획 경계", 8.46, 5.42, 1.25, 0.26, {
    fontSize: 10.5,
    bold: true,
    color: C.red,
  });
  addCheckRow(slide, "완료·과거 Item 유지", 8.48, 5.79, 1.92, {
    fill: C.white,
    line: C.line,
    fontSize: 9.5,
  });
  addCheckRow(slide, "future incomplete만 제안", 10.46, 5.79, 2.12, {
    fill: C.white,
    line: C.line,
    fontSize: 9.5,
  });
  addNotes(slide, [
    `${ROOT}/docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/fixtures/canonical/bundle-moving-d30.json`,
    `${ROOT}/docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/fixtures/ics/canonical-compact/bundle-moving-d30.ics`,
    `${ROOT}/docs/content-audit/2026-07-30-ai-calendar-task-scheduling-research-source-ledger-ko.md`,
    "UI shown is a strategy prototype, not a production screenshot.",
  ]);
}

// 14 — Today top 3 journey
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "멀티 Flow 여정: ‘오늘 3개’는 전체 목록 위의 설명 가능한 lens",
    "JOURNEY 03 · TODAY TOP 3",
    "외부 캘린더를 읽었다고 암시하지 않고, FlowMe 내부 일정·가용시간·must-do만 사용한다.",
  );
  // Left list
  addBox(slide, 0.45, 1.62, 3.22, 4.86, { fill: C.panel2, line: C.line });
  addText(slide, "오늘 할 일 · 9개", 0.72, 1.88, 2.4, 0.34, {
    fontSize: 18,
    bold: true,
  });
  addPill(slide, "전체 목록 유지", 2.26, 1.87, 1.1, {
    fill: C.white,
    line: C.line,
    color: C.muted,
    fontSize: 8.5,
  });
  const allTasks = [
    ["이사", "견적 2곳 비교"],
    ["학습", "모의고사 3회"],
    ["가족", "학교 서류 확인"],
    ["업무", "기획서 검토"],
    ["생활", "정기배송 중지"],
    ["", "4개 더"],
  ];
  allTasks.forEach((t, i) => {
    const y = 2.55 + i * 0.56;
    addBox(slide, 0.7, y, 2.72, 0.43, {
      fill: i < 3 ? C.white : C.panel,
      line: C.line,
    });
    addText(slide, t[0], 0.82, y + 0.08, 0.45, 0.22, {
      fontSize: 8.5,
      bold: true,
      color: C.blueDark,
    });
    addText(slide, t[1], 1.28, y + 0.06, 1.95, 0.24, {
      fontSize: 9.7,
      bold: i < 3,
      color: i === 5 ? C.muted : C.ink,
      align: i === 5 ? "center" : "left",
    });
  });
  addBox(slide, 0.7, 6.0, 2.72, 0.3, { fill: C.white, line: C.line });
  addText(slide, "Flow 탭에서 모두 보기", 0.7, 6.05, 2.72, 0.18, {
    fontSize: 8.5,
    color: C.blueDark,
    align: "center",
  });
  addArrowLabel(slide, 3.83, 4.03, 4.4, "recommend");

  // Center recommendations
  addBox(slide, 4.53, 1.62, 4.05, 4.86, { fill: C.blueSoft, line: C.blue });
  addPill(slide, "AI BRIEF · FLOWME INTERNAL", 4.78, 1.84, 2.18, {
    fill: C.white,
    line: C.line,
    color: C.blueDark,
    fontSize: 8.2,
  });
  addText(slide, "지금 처리할 3개", 4.78, 2.35, 2.4, 0.38, {
    fontSize: 21,
    bold: true,
  });
  const recs = [
    ["1", "학교 서류 확인", "오늘 마감 · 15분"],
    ["2", "견적 2곳 비교", "연락 가능 시간 전 · 30분"],
    ["3", "모의고사 3회", "저녁 가용 · 45분"],
  ];
  recs.forEach((r, i) => {
    const y = 2.94 + i * 0.85;
    addBox(slide, 4.78, y, 3.55, 0.68, { fill: C.white, line: C.line });
    addPill(slide, r[0], 4.92, y + 0.16, 0.36, {
      fill: C.ink,
      line: C.ink,
      color: C.white,
      fontSize: 9,
      h: 0.32,
    });
    addText(slide, r[1], 5.43, y + 0.1, 2.54, 0.26, {
      fontSize: 11.5,
      bold: true,
    });
    addText(slide, r[2], 5.43, y + 0.39, 2.54, 0.19, {
      fontSize: 8.5,
      color: C.muted,
    });
  });
  addBox(slide, 4.78, 5.74, 1.02, 0.34, { fill: C.white, line: C.line });
  addText(slide, "교체", 4.78, 5.8, 1.02, 0.18, { fontSize: 8.5, align: "center" });
  addBox(slide, 5.92, 5.74, 2.41, 0.34, { fill: C.ink, line: C.ink });
  addText(slide, "3개로 시작", 5.92, 5.8, 2.41, 0.18, {
    fontSize: 8.5,
    bold: true,
    color: C.white,
    align: "center",
  });

  // Right evidence and boundaries
  addBox(slide, 8.83, 1.62, 4.0, 2.65, { fill: C.white, line: C.line });
  addText(slide, "추천 이유가 보여야 한다", 9.08, 1.89, 3.45, 0.34, {
    fontSize: 17,
    bold: true,
  });
  addCheckRow(slide, "마감·anchor", 9.08, 2.46, 1.5, { fontSize: 10 });
  addCheckRow(slide, "예상 duration", 10.66, 2.46, 1.66, { fontSize: 10 });
  addCheckRow(slide, "가용시간", 9.08, 2.98, 1.5, { fontSize: 10 });
  addCheckRow(slide, "must-do", 10.66, 2.98, 1.66, { fontSize: 10 });
  addBox(slide, 9.08, 3.55, 3.48, 0.4, { fill: C.redPale, line: C.redPale });
  addText(slide, "외부 calendar read 없음", 9.08, 3.62, 3.48, 0.23, {
    fontSize: 9.5,
    bold: true,
    color: C.red,
    align: "center",
  });
  addMetric(slide, 8.83, 4.52, 1.86, "≤ 20초", "첫 행동 선택", {
    h: 0.9,
    valueSize: 16,
    labelSize: 9,
  });
  addMetric(slide, 10.86, 4.52, 1.97, "≥ 80%", "이유 이해", {
    h: 0.9,
    valueSize: 16,
    labelSize: 9,
  });
  addMetric(slide, 8.83, 5.58, 1.86, "≥ 90%", "전체 목록 찾기", {
    h: 0.72,
    valueSize: 14,
    labelSize: 8.5,
  });
  addMetric(slide, 10.86, 5.58, 1.97, "0건", "숨은 완료", {
    h: 0.72,
    valueSize: 14,
    labelSize: 8.5,
  });
  addNotes(slide, [
    `${ROOT}/docs/SERVICE_STRUCTURE.md`,
    `${ROOT}/docs/DECISIONS.md`,
    `${ROOT}/docs/content-audit/2026-07-30-ai-calendar-task-scheduling-research-source-ledger-ko.md`,
    "UI shown is a strategy prototype, not a production screenshot.",
  ]);
}

// 15 — Current FlowMe evidence and gap
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "현재 FlowMe는 ‘일정 의미’는 강하고 ‘실제 연결 근거’는 비어 있다",
    "CURRENT BASELINE",
    "fixture·projection 계약은 충분히 진전됐지만, 이것을 AI 자동화나 external round-trip 성공으로 해석하면 안 된다.",
  );
  addImageFrame(slide, ASSET.flowme, 0.45, 1.64, 7.12, 4.45);
  addPill(slide, "CURRENT PRODUCT · MY FLOW", 0.7, 1.86, 1.95, {
    fill: C.white,
    line: C.line,
    color: C.ink,
    fontSize: 8.5,
  });
  addText(slide, "날짜별 그룹 + canonical Item", 0.73, 5.7, 3.35, 0.28, {
    fontSize: 10.5,
    bold: true,
    color: C.blueDark,
  });

  addMetric(slide, 7.88, 1.64, 2.24, "63", "scheduling/event fixtures", {
    h: 1.08,
    valueColor: C.blueDark,
  });
  addMetric(slide, 10.31, 1.64, 2.52, "315", "63 × 5 projection cells", {
    h: 1.08,
    valueColor: C.blueDark,
  });
  addMetric(slide, 7.88, 2.9, 2.24, "32 / 32", "자동 계약 검증", {
    h: 1.08,
    valueColor: C.green,
  });
  addMetric(slide, 10.31, 2.9, 2.52, "94 / 100", "canonical architecture score", {
    h: 1.08,
    valueColor: C.green,
  });
  addMetric(slide, 7.88, 4.16, 2.24, "92.86%", "Checklist/Todo agreement", {
    h: 1.08,
    valueColor: C.ink,
  });
  addMetric(slide, 10.31, 4.16, 2.52, "97.62%", "primary projection agreement", {
    h: 1.08,
    valueColor: C.ink,
  });
  addBox(slide, 7.88, 5.42, 4.95, 1.02, { fill: C.redPale, line: C.red });
  addText(slide, "아직 없는 근거", 8.15, 5.63, 1.25, 0.26, {
    fontSize: 10.5,
    bold: true,
    color: C.red,
  });
  addText(slide, "실제 Calendar/VTODO round-trip  NOT_RUN", 9.32, 5.59, 3.22, 0.32, {
    fontSize: 12.5,
    bold: true,
    align: "right",
  });
  addText(slide, "observed users 0", 9.32, 5.98, 3.22, 0.24, {
    fontSize: 10.5,
    color: C.red,
    bold: true,
    align: "right",
  });
  addNotes(slide, [
    `${ROOT}/docs/content-audit/2026-07-29-p35-r13-final-internal-gate/README.md`,
    `FlowMe screenshot: ${ASSET.flowme}`,
    `${ROOT}/docs/specs/2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/architecture-comparison-v1.json`,
    `${ROOT}/docs/specs/2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/validation-results-v1.json`,
    `${ROOT}/docs/specs/2026-07-29-flow-projection-semantics-scheduling-event-corpus-v1/classification-comparison-v1.json`,
    `${ROOT}/docs/STATUS.md`,
  ]);
}

// 16 — Boundaries
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "제품 경계: 지금은 source-grounded preview, 자동 쓰기는 나중",
    "BUILD / DEFER / AVOID",
    "기능을 많이 넣는 것이 아니라, 어떤 변경이 어디까지 안전한지 명확하게 자른다.",
  );
  const cols = [
    {
      x: 0.45,
      title: "BUILD NOW",
      color: C.green,
      fill: C.greenPale,
      items: [
        "source text·row 보존",
        "개인 constraint 필드",
        "deterministic schedule",
        "editable diff",
        "export receipt·undo",
      ],
    },
    {
      x: 4.59,
      title: "DEFER",
      color: C.amber,
      fill: C.amberPale,
      items: [
        "external calendar read",
        "양방향 sync",
        "background auto-write",
        "cross-device trigger",
        "creator update auto-merge",
      ],
    },
    {
      x: 8.73,
      title: "DO NOT BUILD",
      color: C.red,
      fill: C.redPale,
      items: [
        "범용 AI Calendar 복제",
        "원문 없는 날짜 발명",
        "날짜 없는 Item 강제 배치",
        "승인 없는 외부 변경",
        "전체 목록 숨기기",
      ],
    },
  ];
  cols.forEach((c) => {
    addBox(slide, c.x, 1.68, 3.86, 4.86, { fill: c.fill, line: c.color });
    addText(slide, c.title, c.x + 0.24, 1.96, 3.34, 0.34, {
      fontSize: 16,
      bold: true,
      color: c.color,
      charSpacing: 1,
    });
    addLine(slide, c.x + 0.24, 2.5, 3.34, 0, {
      color: c.color,
      width: 1.3,
    });
    c.items.forEach((t, i) => {
      const y = 2.84 + i * 0.64;
      addBox(slide, c.x + 0.24, y + 0.01, 0.28, 0.28, {
        fill: C.white,
        line: c.color,
        radius: 0.05,
      });
      addText(slide, i + 1, c.x + 0.24, y + 0.02, 0.28, 0.24, {
        fontSize: 8.5,
        bold: true,
        color: c.color,
        align: "center",
      });
      addText(slide, t, c.x + 0.67, y, 2.74, 0.3, {
        fontSize: 12.5,
        bold: true,
      });
    });
    addBox(slide, c.x + 0.24, 6.01, 3.34, 0.3, {
      fill: C.white,
      line: C.white,
    });
    addText(
      slide,
      c.title === "BUILD NOW"
        ? "사용자에게 바로 보이는 계약"
        : c.title === "DEFER"
          ? "근거가 생기면 재검토"
          : "제품 정체성을 흐리는 범위",
      c.x + 0.3,
      6.06,
      3.22,
      0.18,
      { fontSize: 8.5, color: c.color, bold: true, align: "center" },
    );
  });
  addNotes(slide, [
    `${ROOT}/docs/PRODUCT_PRINCIPLES.md`,
    `${ROOT}/docs/DECISIONS.md`,
    `${ROOT}/docs/SERVICE_STRUCTURE.md`,
    `${ROOT}/docs/content-audit/2026-07-30-ai-calendar-task-scheduling-research-source-ledger-ko.md`,
    "https://getclockwise.com/",
  ]);
}

// 17 — Experiments
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "세 실험은 ‘정확도’보다 행동 시간·이해·복구를 본다",
    "VALIDATION PLAN",
    "자동 테스트 통과가 아니라 관찰 사용자 행동으로 다음 제품 결정을 내린다.",
  );
  const exps = [
    {
      x: 0.45,
      tag: "E1 · PRIORITY 1",
      n: "12명",
      title: "Study pacing preview",
      task: "커리큘럼 + 개인 속도 → 저장",
      gates: ["≤ 3분", "≥ 35% 단축", "발명 0건", "9/12 ≤ 2 edits"],
      fill: C.bluePale,
      line: C.blue,
    },
    {
      x: 4.59,
      tag: "E2 · CROSSOVER",
      n: "15명",
      title: "Today top 3 brief",
      task: "7일 crossover · 첫 행동 선택",
      gates: ["≤ 20초", "이유 이해 ≥ 80%", "목록 찾기 ≥ 90%", "수용 ≥ 60%"],
      fill: C.panel2,
      line: C.line,
    },
    {
      x: 8.73,
      tag: "E3 · RECOVERY",
      n: "12명",
      title: "Missed schedule replan",
      task: "future incomplete만 재계획",
      gates: ["changed rows ≥ 90%", "undo 100%", "≥ 40% 단축", "과거 변경 0건"],
      fill: C.blueSoft,
      line: C.blue,
    },
  ];
  exps.forEach((e) => {
    addBox(slide, e.x, 1.66, 3.86, 4.86, { fill: e.fill, line: e.line });
    addPill(slide, e.tag, e.x + 0.22, 1.88, 1.42, {
      fill: C.white,
      line: C.line,
      color: C.blueDark,
      fontSize: 8.2,
    });
    addText(slide, e.n, e.x + 2.68, 1.83, 0.92, 0.42, {
      fontSize: 18,
      bold: true,
      align: "right",
      color: e.line === C.blue ? C.blueDark : C.ink,
    });
    addText(slide, e.title, e.x + 0.22, 2.55, 3.38, 0.66, {
      fontSize: 22,
      bold: true,
      valign: "top",
    });
    addText(slide, e.task, e.x + 0.22, 3.38, 3.38, 0.48, {
      fontSize: 11.5,
      color: C.muted,
      valign: "top",
    });
    e.gates.forEach((g, i) => {
      const y = 4.04 + i * 0.5;
      addCheckRow(slide, g, e.x + 0.22, y, 3.26, {
        fill: C.white,
        line: e.line === C.blue ? C.blue : C.line,
        iconColor: e.line === C.blue ? C.blueDark : C.green,
        fontSize: 10.5,
      });
    });
    addText(slide, "PASS / ITERATE / STOP", e.x + 0.22, 6.12, 3.38, 0.24, {
      fontSize: 9,
      bold: true,
      color: C.muted,
      charSpacing: 0.9,
      align: "center",
    });
  });
  addNotes(slide, [
    `${ROOT}/docs/content-audit/2026-07-30-ai-calendar-task-scheduling-research-source-ledger-ko.md`,
    `${ROOT}/docs/STATUS.md`,
    "Sample sizes and success thresholds are proposed decision gates, not observed results.",
  ]);
}

// 18 — Roadmap and integration gates
{
  const slide = pptx.addSlide("FLOWME");
  addTitle(
    slide,
    "6주 안에 ‘계속 갈지’ 결정하고, integration은 24 round-trips 뒤",
    "BOUNDED ROADMAP",
    "하나의 vertical journey로 학습한 뒤에만 더 넓은 자동화로 확장한다.",
  );
  const phases = [
    {
      x: 0.45,
      w: 2.55,
      week: "W0",
      title: "계약 고정",
      items: ["source / personal 경계", "constraint schema", "diff / receipt"],
      fill: C.panel2,
    },
    {
      x: 3.17,
      w: 3.05,
      week: "W1–2",
      title: "Study prototype",
      items: ["pacing input", "deterministic preview", "Todo + Sheet export"],
      fill: C.blueSoft,
    },
    {
      x: 6.39,
      w: 3.05,
      week: "W3–4",
      title: "12명 관찰",
      items: ["manual 비교", "source 이해", "≤ 2 edits"],
      fill: C.bluePale,
    },
    {
      x: 9.61,
      w: 3.22,
      week: "W5–6",
      title: "결정",
      items: ["PASS → E2", "ITERATE → contract", "STOP → no automation"],
      fill: C.ink,
      inverse: true,
    },
  ];
  phases.forEach((p, i) => {
    addBox(slide, p.x, 1.75, p.w, 3.36, {
      fill: p.fill,
      line: p.inverse ? C.ink : C.line,
    });
    addPill(slide, p.week, p.x + 0.2, 1.98, 0.76, {
      fill: p.inverse ? C.blue : C.white,
      line: p.inverse ? C.blue : C.line,
      color: p.inverse ? C.white : C.blueDark,
      fontSize: 9,
    });
    addText(slide, p.title, p.x + 0.2, 2.55, p.w - 0.4, 0.44, {
      fontSize: 20,
      bold: true,
      color: p.inverse ? C.white : C.ink,
    });
    p.items.forEach((t, j) => {
      addText(slide, `• ${t}`, p.x + 0.2, 3.3 + j * 0.48, p.w - 0.4, 0.28, {
        fontSize: 11.5,
        color: p.inverse ? C.faint : C.muted,
      });
    });
    if (i < phases.length - 1) {
      addText(slide, "→", p.x + p.w + 0.03, 3.24, 0.16, 0.36, {
        fontSize: 18,
        bold: true,
        color: C.blue,
        align: "center",
      });
    }
  });
  addBox(slide, 0.45, 5.45, 12.38, 1.04, { fill: C.redPale, line: C.red });
  addText(slide, "EXTERNAL INTEGRATION GATE", 0.72, 5.7, 2.7, 0.26, {
    fontSize: 11,
    bold: true,
    color: C.red,
    charSpacing: 0.9,
  });
  addText(slide, "8 representative events", 3.58, 5.63, 2.5, 0.38, {
    fontSize: 17,
    bold: true,
  });
  addText(slide, "×", 6.12, 5.62, 0.35, 0.4, {
    fontSize: 18,
    bold: true,
    color: C.red,
    align: "center",
  });
  addText(slide, "Google · Outlook · Apple", 6.58, 5.63, 3.1, 0.38, {
    fontSize: 17,
    bold: true,
  });
  addText(slide, "=", 9.72, 5.62, 0.35, 0.4, {
    fontSize: 18,
    bold: true,
    color: C.red,
    align: "center",
  });
  addText(slide, "24 round-trips", 10.18, 5.58, 2.36, 0.45, {
    fontSize: 21,
    bold: true,
    color: C.red,
    align: "right",
  });
  addText(
    slide,
    "timezone · all-day · recurrence · update · delete · source receipt를 통과한 뒤에만 direct integration 표현",
    0.72,
    6.13,
    11.86,
    0.24,
    { fontSize: 9.5, color: C.red, align: "center" },
  );
  addNotes(slide, [
    `${ROOT}/docs/content-audit/2026-07-30-ai-calendar-task-scheduling-research-source-ledger-ko.md`,
    `${ROOT}/docs/STATUS.md`,
    `${ROOT}/docs/SERVICE_STRUCTURE.md`,
    "Roadmap duration and 24-round-trip gate are proposed planning constraints, not completed work.",
  ]);
}

// 19 — Closing decision
{
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  addText(slide, "FLOWME DECISION", 0.45, 0.42, 3.2, 0.24, {
    fontSize: 10,
    bold: true,
    color: C.blueDark,
    charSpacing: 1.6,
  });
  addText(
    slide,
    "콘텐츠를 일정으로 바꾸되,\n출처와 통제권은 남긴다.",
    0.45,
    1.38,
    10.6,
    1.62,
    { fontSize: 46, bold: true, valign: "top" },
  );
  addBox(slide, 0.45, 3.55, 12.38, 1.55, { fill: C.ink, line: C.ink });
  addText(slide, "NEXT SLICE", 0.76, 3.84, 1.6, 0.26, {
    fontSize: 10,
    bold: true,
    color: C.cyan,
    charSpacing: 1.2,
  });
  addText(slide, "Study pacing preview", 2.42, 3.73, 4.65, 0.5, {
    fontSize: 26,
    bold: true,
    color: C.white,
  });
  addText(
    slide,
    "source 잠금 · 개인 제약 · deterministic schedule · editable diff · export receipt",
    2.43,
    4.37,
    9.8,
    0.34,
    { fontSize: 13, color: C.faint },
  );
  addBox(slide, 0.45, 5.52, 3.85, 0.9, { fill: C.blueSoft, line: C.blue });
  addText(slide, "승인할 것", 0.7, 5.72, 1.05, 0.26, {
    fontSize: 10.5,
    bold: true,
    color: C.blueDark,
  });
  addText(slide, "E1 12명 관찰", 1.82, 5.67, 2.18, 0.34, {
    fontSize: 16,
    bold: true,
    align: "right",
  });
  addBox(slide, 4.49, 5.52, 3.85, 0.9, { fill: C.panel2, line: C.line });
  addText(slide, "보류할 것", 4.74, 5.72, 1.05, 0.26, {
    fontSize: 10.5,
    bold: true,
    color: C.muted,
  });
  addText(slide, "external auto-write", 5.83, 5.67, 2.22, 0.34, {
    fontSize: 16,
    bold: true,
    align: "right",
  });
  addBox(slide, 8.53, 5.52, 4.3, 0.9, { fill: C.redPale, line: C.red });
  addText(slide, "필수 조건", 8.78, 5.72, 1.05, 0.26, {
    fontSize: 10.5,
    bold: true,
    color: C.red,
  });
  addText(slide, "발명 0 · undo 100%", 9.84, 5.67, 2.7, 0.34, {
    fontSize: 16,
    bold: true,
    color: C.red,
    align: "right",
  });
  addText(
    slide,
    "이 보고서는 전략 권고이며 실제 사용자 검증 결과가 아니다.",
    0.45,
    6.76,
    12.38,
    0.24,
    { fontSize: 9.5, color: C.muted, align: "center" },
  );
  slide.addNotes(
    [
      "[Sources]",
      `- ${ROOT}/docs/content-audit/2026-07-30-ai-calendar-task-scheduling-research-source-ledger-ko.md`,
      `- ${ROOT}/docs/PRODUCT_PRINCIPLES.md`,
      `- ${ROOT}/docs/STATUS.md`,
      "- Final recommendation is an inference from the cited market research and current FlowMe evidence.",
    ].join("\n"),
  );
}

const slideLimit = Number.parseInt(process.env.SLIDE_LIMIT ?? "0", 10);
if (Number.isFinite(slideLimit) && slideLimit > 0 && slideLimit < pptx._slides.length) {
  pptx._slides = pptx._slides.slice(0, slideLimit);
}
const deckOutput = process.env.DECK_OUTPUT || OUTPUT;
await pptx.writeFile({ fileName: deckOutput, compression: true });
console.log(`Created ${deckOutput}`);
console.log(`Slides: ${pptx._slides.length}`);
