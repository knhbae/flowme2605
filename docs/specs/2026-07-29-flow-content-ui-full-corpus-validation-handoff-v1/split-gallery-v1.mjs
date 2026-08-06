import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const sourceFileName =
  "2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html";
const sourcePath = path.join(repoRoot, "docs/content-audit", sourceFileName);
const outputDirectoryName =
  "2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko-parts";
const outputDirectory = path.join(
  repoRoot,
  "docs/content-audit",
  outputDirectoryName,
);
const targetFileBytes = Math.floor(1.4 * 1024 * 1024);
const hardFileBytes = Math.floor(1.45 * 1024 * 1024);
const expectedSourceSha256 =
  "021667d19d042a5dfd418f3dbcbf553fd871a08b0fd47703fe716538419aaf56";
const dataOpen = '<script id="corpusData" type="application/json">';
const dataClose = "</script>";
const sourceHtml = fs.readFileSync(sourcePath, "utf8");
const sourceSha256 = sha256(sourceHtml);
if (sourceSha256 !== expectedSourceSha256) {
  throw new Error(
    `Source Gallery SHA changed: expected ${expectedSourceSha256}, received ${sourceSha256}`,
  );
}
const dataStart = sourceHtml.indexOf(dataOpen);

if (dataStart < 0) {
  throw new Error(`Missing corpusData opening marker in ${sourceFileName}`);
}

const jsonStart = dataStart + dataOpen.length;
const jsonEnd = sourceHtml.indexOf(dataClose, jsonStart);

if (jsonEnd < 0) {
  throw new Error(`Missing corpusData closing marker in ${sourceFileName}`);
}

const sourceData = JSON.parse(sourceHtml.slice(jsonStart, jsonEnd));
const beforeData = sourceHtml.slice(0, jsonStart);
const afterData = sourceHtml.slice(jsonEnd);
const splitGeneratedAt = new Date().toISOString();
const splitId = `sha256:${sha256(
  `${sourceSha256}:${targetFileBytes}:flowme-gallery-split-v1`,
)}`;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function partFileName(partNumber, totalParts) {
  return `part-${pad(partNumber)}-of-${pad(totalParts)}.html`;
}

function byteLength(value) {
  return Buffer.byteLength(value, "utf8");
}

function rate(value, total) {
  return total ? Number((value / total).toFixed(4)) : 0;
}

function countValues(records, getValue, values) {
  return Object.fromEntries(
    values.map((value) => [
      value,
      records.filter((record) => getValue(record) === value).length,
    ]),
  );
}

function internalReviewMetrics(contents) {
  const reviews = contents
    .map((content) => content.internalReview)
    .filter(Boolean);
  const exactAgreement = reviews.filter(
    (review) => review.exactAgreement === true,
  ).length;
  const agreementKeys = [
    "itemGranularity",
    "primaryProjection",
    "checklistTodoDecision",
    "scheduleSuitability",
    "contentValue",
    "uiUnderstandability",
  ];
  const selectionKeys = ["primaryProjection", "checklistTodo"];
  const axisAgreement = Object.fromEntries(
    agreementKeys.map((key) => {
      const agreed = reviews.filter(
        (review) => review.agreement?.[key] === true,
      ).length;
      return [key, { agreed, total: reviews.length, rate: rate(agreed, reviews.length) }];
    }),
  );
  const selectionAgreement = Object.fromEntries(
    selectionKeys.map((key) => {
      const agreed = reviews.filter(
        (review) => review.selectionAgreement?.[key] === true,
      ).length;
      return [key, { agreed, total: reviews.length, rate: rate(agreed, reviews.length) }];
    }),
  );

  return {
    content: reviews.length,
    exactAgreement,
    exactAgreementRate: rate(exactAgreement, reviews.length),
    anyDisagreement: reviews.length - exactAgreement,
    axisAgreement,
    selectionAgreement,
    reviewerAContentValue: countValues(
      reviews,
      (review) => review.reviewerA?.contentValue,
      ["go", "modify", "hold"],
    ),
    reviewerBContentValue: countValues(
      reviews,
      (review) => review.reviewerB?.contentValue,
      ["go", "modify", "hold"],
    ),
    synthesizedInternalVerdict: countValues(
      reviews,
      (review) => review.synthesizedInternalVerdict,
      ["go", "modify", "hold"],
    ),
  };
}

function countsFor(contents) {
  const productCandidate = contents.filter(
    (content) => content.corpusTier === "product_candidate",
  ).length;
  const structureProbe = contents.filter(
    (content) => content.corpusTier === "structure_probe",
  ).length;
  const normalContents = contents.filter((content) =>
    ["product_candidate", "structure_probe"].includes(content.corpusTier),
  );

  return {
    gallery: contents.length,
    normal: productCandidate + structureProbe,
    productCandidate,
    structureProbe,
    boundary: contents.filter(
      (content) => content.corpusTier === "boundary_control",
    ).length,
    historical: contents.filter(
      (content) => content.corpusTier === "historical_preview",
    ).length,
    item: normalContents.reduce(
      (total, content) => total + (content.canonical?.items?.length ?? 0),
      0,
    ),
    sourceRow: normalContents.reduce(
      (total, content) =>
        total + (content.canonical?.sourceRows?.length ?? 0),
      0,
    ),
    projectionCell: normalContents.reduce(
      (total, content) => total + (content.projectionCells?.length ?? 0),
      0,
    ),
  };
}

function defaultTierFor(contents) {
  if (
    contents.some((content) => content.corpusTier === "product_candidate")
  ) {
    return "product_candidate";
  }
  if (contents.some((content) => content.corpusTier === "structure_probe")) {
    return "structure_probe";
  }
  return "all";
}

function serializeEmbeddedData(data) {
  const { contents, ...metadata } = data;
  const metadataJson = JSON.stringify(metadata);
  const contentLines = contents.map((content) => JSON.stringify(content));
  return `${metadataJson.slice(0, -1)},"contents":[\n${contentLines.join(
    ",\n",
  )}\n]}`.replaceAll("<", "\\u003c");
}

function replaceRequired(value, search, replacement, label) {
  if (!value.includes(search)) {
    throw new Error(`Could not find ${label}`);
  }
  return value.replace(search, replacement);
}

function buildPartData(contents, metadata) {
  return {
    ...sourceData,
    counts: countsFor(contents),
    contents,
    internalReviewMetrics: internalReviewMetrics(contents),
    splitMetadata: {
      schemaVersion: "flowme-gallery-split-v1",
      splitId,
      generatedAt: splitGeneratedAt,
      sourceFile: sourceFileName,
      sourceSha256: `sha256:${sourceSha256}`,
      originalCorpusFingerprint: sourceData.corpusFingerprint,
      originalCounts: sourceData.counts,
      partNumber: metadata.partNumber,
      totalParts: metadata.totalParts,
      originalStartIndex: metadata.startIndex + 1,
      originalEndIndex: metadata.startIndex + contents.length,
      defaultTier: defaultTierFor(contents),
      contentIds: contents.map((content) => content.contentId),
    },
  };
}

function buildPartHtml(contents, metadata) {
  const partData = buildPartData(contents, metadata);
  const partLabel = `Part ${pad(metadata.partNumber)}/${pad(
    metadata.totalParts,
  )}`;
  const indexLink =
    '<a class="btn icon-btn" href="index.html" aria-label="분할 Gallery 목록">☷</a>';
  const previousLink =
    metadata.partNumber > 1
      ? `<a class="btn icon-btn" href="${partFileName(
          metadata.partNumber - 1,
          metadata.totalParts,
        )}#gallery" aria-label="이전 Part">‹</a>`
      : "";
  const nextLink =
    metadata.partNumber < metadata.totalParts
      ? `<a class="btn icon-btn" href="${partFileName(
          metadata.partNumber + 1,
          metadata.totalParts,
        )}#gallery" aria-label="다음 Part">›</a>`
      : "";
  let html = `${beforeData}${serializeEmbeddedData(partData)}${afterData}`;

  html = replaceRequired(
    html,
    "<title>FlowMe Full-Corpus 검토 Gallery</title>",
    `<title>FlowMe Full-Corpus 검토 Gallery · ${partLabel}</title>`,
    "Gallery title",
  );
  html = replaceRequired(
    html,
    "</style>",
    `.header-actions a.btn{text-decoration:none}.brand .part-label{margin-left:5px;color:var(--blue)}
@media(max-width:560px){.brand .part-label,.header-actions button[data-action="download-corpus"]{display:none}}
</style>`,
    "style closing tag",
  );
  html = replaceRequired(
    html,
    '<div class="brand">FLOW<span>Me</span> <small class="mini">Lab</small></div>',
    `<div class="brand">FLOW<span>Me</span> <small class="mini part-label">${partLabel}</small></div>`,
    "brand",
  );
  html = replaceRequired(
    html,
    '<div class="header-actions">',
    `<div class="header-actions">\n    ${previousLink}${indexLink}${nextLink}`,
    "header actions",
  );
  html = replaceRequired(
    html,
    'const STORAGE_KEY="flowme-full-corpus-review-v1";',
    `const STORAGE_KEY="flowme-full-corpus-review-split-v1-part-${pad(
      metadata.partNumber,
    )}";`,
    "split storage key",
  );
  html = replaceRequired(
    html,
    'tier:"product_candidate"',
    'tier:DATA.splitMetadata?.defaultTier??"product_candidate"',
    "default tier",
  );
  html = replaceRequired(
    html,
    '<div class="eyebrow">Full-Corpus Validation Workbench</div>',
    `<div class="eyebrow">${partLabel} · Full-Corpus Validation Workbench</div>`,
    "Gallery eyebrow",
  );

  const quickButtons = [
    '<button class="btn" data-content="canonical:base-opentutorials-web1-progress">WEB1 일정화 보기</button>',
    '<button class="btn" data-content="canonical:base-moving-d30">이사 Checklist 보기</button>',
    '<button class="btn" data-content="events:event-kr-sokcho-summer">진행 예정 행사 보기</button>',
  ];

  for (const button of quickButtons) {
    html = replaceRequired(html, button, "", `quick button ${button}`);
  }

  html = replaceRequired(
    html,
    'downloadJson("flowme-full-corpus-ui-view-model-v1.json",DATA',
    `downloadJson("flowme-full-corpus-ui-view-model-v1-${partFileName(
      metadata.partNumber,
      metadata.totalParts,
    ).replace(".html", ".json")}",DATA`,
    "corpus download name",
  );
  html = replaceRequired(
    html,
    '>Corpus JSON</button>',
    ">Part Corpus JSON</button>",
    "corpus download label",
  );
  html = replaceRequired(
    html,
    'aria-label="전체 corpus JSON 내려받기"',
    'aria-label="현재 Part corpus JSON 내려받기"',
    "mobile corpus download label",
  );
  html = replaceRequired(
    html,
    '"전체 corpus JSON을 내보냈습니다"',
    '"현재 Part corpus JSON을 내보냈습니다"',
    "corpus download toast",
  );
  html = replaceRequired(
    html,
    'downloadJson("flowme-full-corpus-review-v1.json",{...reviews',
    `downloadJson("flowme-full-corpus-review-split-v1-part-${pad(
      metadata.partNumber,
    )}.json",{...reviews`,
    "review download name",
  );
  html = replaceRequired(
    html,
    "정상 '+DATA.counts.normal+'개 수치",
    "정상 '+(DATA.splitMetadata?.originalCounts?.normal??DATA.counts.normal)+'개 수치",
    "full-corpus exclusion count",
  );
  html = replaceRequired(
    html,
    'function pathToRelative(p){return p.startsWith("docs/content-audit/")?p.replace("docs/content-audit/",""):p}',
    'function pathToRelative(p){const prefix="docs/content-audit/flow-content-ux-candidates-previews/";if(p.startsWith(prefix))return"../reference-260601-previews/"+p.slice(prefix.length);return p.startsWith("docs/content-audit/")?"../"+p.replace("docs/content-audit/",""):p}',
    "nested historical preview path",
  );

  return html;
}

function estimatePartBytes(contents) {
  return byteLength(
    buildPartHtml(contents, {
      partNumber: 99,
      totalParts: 99,
      startIndex: 999,
    }),
  );
}

function partitionContents(contents) {
  const chunks = [];
  let current = [];

  for (const content of contents) {
    const candidate = [...current, content];
    if (current.length && estimatePartBytes(candidate) > targetFileBytes) {
      chunks.push(current);
      current = [content];
    } else {
      current = candidate;
    }
  }
  if (current.length) {
    chunks.push(current);
  }
  return chunks;
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function indexHtml(manifest) {
  const archiveLinks = manifest.parts
    .map(
      (part) => `
      <li>
        <a href="${part.fileName}#gallery">전체 QA Part ${pad(
          part.partNumber,
        )}</a>
        <span>${escapeHtml(part.firstTitle)} → ${escapeHtml(
          part.lastTitle,
        )} · ${part.contentCount}개</span>
      </li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="icon" href="data:,">
<title>FlowMe 대표 콘텐츠 검토</title>
<style>
:root{--text:#18181b;--muted:#65656f;--line:#e5e7eb;--blue:#3654ff;--soft:#f4f6ff;--warn:#fff8e8}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:var(--text);font-family:Pretendard,"Noto Sans KR",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
a{color:inherit}
header{border-bottom:1px solid var(--line)}
.topbar{max-width:760px;margin:0 auto;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{font-size:17px;font-weight:850;letter-spacing:-.03em}.brand span{color:var(--blue)}
.topbar small{color:var(--muted);font-weight:700}
main{max-width:760px;margin:0 auto;padding:54px 20px 80px}
h1{max-width:560px;font-size:44px;line-height:1.12;letter-spacing:-.055em;margin:0}
.lead{max-width:620px;margin:18px 0 0;color:var(--muted);font-size:18px;line-height:1.7;word-break:keep-all}
.created{margin:10px 0 0;color:var(--muted);font-size:12px}
.primary{display:inline-flex;align-items:center;justify-content:center;min-height:52px;margin-top:28px;padding:0 22px;border-radius:12px;background:var(--blue);color:#fff;text-decoration:none;font-weight:800}
.guide{margin-top:54px;border-top:1px solid var(--line)}
.guide-row{display:grid;grid-template-columns:34px 1fr;gap:14px;padding:20px 0;border-bottom:1px solid var(--line)}
.guide-row b{display:flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:50%;background:var(--soft);color:var(--blue)}
.guide-row strong{display:block;font-size:16px}.guide-row p{margin:5px 0 0;color:var(--muted);font-size:14px;line-height:1.55}
h2{font-size:22px;letter-spacing:-.035em;margin:54px 0 18px}
.groups{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.group{padding:18px;border:1px solid var(--line);border-radius:14px}
.group strong{display:block;font-size:15px}.group p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.55}
.boundary{margin-top:34px;padding:16px 18px;background:var(--warn);border-radius:12px;color:#704d00;font-size:13px;line-height:1.6}
details{margin-top:42px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
summary{min-height:56px;display:flex;align-items:center;cursor:pointer;font-weight:750}
.archive{padding:0 0 18px;margin:0;list-style:none}
.archive li{padding:12px 0;border-top:1px solid var(--line)}
.archive a{display:block;color:var(--blue);font-weight:750;text-decoration:none}
.archive span{display:block;margin-top:4px;color:var(--muted);font-size:12px;line-height:1.45}
.original{display:inline-block;margin:4px 0 16px;color:var(--muted);font-size:12px}
:focus-visible{outline:3px solid rgba(54,84,255,.35);outline-offset:3px}
@media(max-width:620px){
  .topbar{padding:15px 16px}
  main{padding:38px 16px 64px}
  h1{font-size:36px}
  .lead{font-size:16px}
  .primary{display:flex;width:100%}
  .guide{margin-top:42px}
  .groups{grid-template-columns:1fr}
}
</style>
</head>
<body>
<header>
  <div class="topbar">
    <div class="brand">FLOW<span>Me</span></div>
    <small>대표 콘텐츠 검토</small>
  </div>
</header>
<main>
  <h1>10개만 보면 됩니다</h1>
  <p class="lead">전체 156개를 훑는 대신, 캘린더·체크리스트·진도표·할 일·메모·행사처럼 서로 다른 결과를 대표하는 콘텐츠만 모았습니다. 화면과 내용이 이해되는지만 판단해 주세요.</p>
  <p class="created">만든 날짜 · 2026. 07. 30.</p>
  <a class="primary" href="review.html#home">30분 검토 시작</a>

  <section class="guide" aria-label="검토 방법">
    <div class="guide-row"><b>1</b><div><strong>내용 보기</strong><p>누구에게 어떤 행동을 만들어 주는지 확인합니다.</p></div></div>
    <div class="guide-row"><b>2</b><div><strong>도구 결과 보기</strong><p>캘린더·체크리스트·할 일·표·메모 중 결과가 자연스러운지 봅니다.</p></div></div>
    <div class="guide-row"><b>3</b><div><strong>한 줄로 판단하기</strong><p>Go·수정 필요·보류 중 하나와 이유만 남기면 됩니다.</p></div></div>
  </section>

  <h2>대표 사례 구성</h2>
  <section class="groups">
    <article class="group"><strong>날짜 기준 실행</strong><p>이사, 이유식처럼 기준일에 따라 행동이 배치되는 콘텐츠</p></article>
    <article class="group"><strong>날짜 없는 진행</strong><p>학습 진도표와 영상 목록처럼 먼저 표나 할 일로 시작하는 콘텐츠</p></article>
    <article class="group"><strong>결정과 결과물</strong><p>비교·선택 내용을 체크리스트나 메모로 옮기는 콘텐츠</p></article>
    <article class="group"><strong>일정과 안전 경계</strong><p>시험 일정, 변경된 행사, 공식 안전 점검처럼 멈춤 기준이 필요한 콘텐츠</p></article>
  </section>

  <p class="boundary">이 화면은 대표 사례를 빠르게 검토하기 위한 것입니다. 전체 데이터와 기술 검증 자료는 아래 보관본에 그대로 남아 있습니다.</p>

  <details>
    <summary>전체 QA 보관본 보기</summary>
    <ul class="archive">${archiveLinks}</ul>
    <a class="original" href="../${sourceFileName}">8.72MB 원본 Gallery 열기</a>
  </details>
</main>
</body>
</html>`;
}

function prepareOutputDirectory() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const generatedName =
    /^(?:part-\d{2}-of-\d{2}\.html|index\.html|manifest\.json)$/;
  for (const name of fs.readdirSync(outputDirectory)) {
    if (generatedName.test(name)) {
      fs.unlinkSync(path.join(outputDirectory, name));
    }
  }
}

const chunks = partitionContents(sourceData.contents);
const totalParts = chunks.length;
const generatedParts = [];
let startIndex = 0;

prepareOutputDirectory();

for (const [index, contents] of chunks.entries()) {
  const partNumber = index + 1;
  const fileName = partFileName(partNumber, totalParts);
  const html = buildPartHtml(contents, {
    partNumber,
    totalParts,
    startIndex,
  });
  const bytes = byteLength(html);

  if (bytes > hardFileBytes) {
    throw new Error(
      `${fileName} is ${bytes} bytes, above hard limit ${hardFileBytes}`,
    );
  }

  const counts = countsFor(contents);
  fs.writeFileSync(path.join(outputDirectory, fileName), html);
  generatedParts.push({
    partNumber,
    fileName,
    originalStartIndex: startIndex + 1,
    originalEndIndex: startIndex + contents.length,
    contentCount: contents.length,
    firstContentId: contents[0].contentId,
    lastContentId: contents.at(-1).contentId,
    firstTitle: contents[0].title,
    lastTitle: contents.at(-1).title,
    defaultTier: defaultTierFor(contents),
    counts,
    bytes,
    sizeMiB: Number((bytes / 1024 / 1024).toFixed(4)),
    sha256: `sha256:${sha256(html)}`,
    longestLineBytes: Math.max(
      ...html.split(/\r?\n/).map((line) => byteLength(line)),
    ),
  });
  startIndex += contents.length;
}

const flattenedContents = chunks.flat();
const flattenedIds = flattenedContents.map((content) => content.contentId);
const uniqueIds = new Set(flattenedIds);

if (
  flattenedContents.length !== sourceData.contents.length ||
  uniqueIds.size !== sourceData.contents.length
) {
  throw new Error("Split parts contain missing or duplicate content IDs");
}

for (const [index, content] of sourceData.contents.entries()) {
  if (JSON.stringify(content) !== JSON.stringify(flattenedContents[index])) {
    throw new Error(`Content changed during split at index ${index}`);
  }
}

const summedCounts = generatedParts.reduce(
  (total, part) => {
    for (const key of Object.keys(total)) {
      total[key] += part.counts[key];
    }
    return total;
  },
  {
    gallery: 0,
    normal: 0,
    productCandidate: 0,
    structureProbe: 0,
    boundary: 0,
    historical: 0,
    item: 0,
    sourceRow: 0,
    projectionCell: 0,
  },
);

for (const [key, value] of Object.entries(sourceData.counts)) {
  if (summedCounts[key] !== value) {
    throw new Error(
      `Split count mismatch for ${key}: ${summedCounts[key]} !== ${value}`,
    );
  }
}

if (sha256(fs.readFileSync(sourcePath)) !== sourceSha256) {
  throw new Error("Source Gallery changed while creating split files");
}

const manifest = {
  schemaVersion: "flowme-gallery-split-manifest-v1",
  splitId,
  generatedAt: splitGeneratedAt,
  source: {
    path: path
      .relative(repoRoot, sourcePath)
      .replaceAll(path.sep, "/"),
    bytes: byteLength(sourceHtml),
    sha256: `sha256:${sourceSha256}`,
    corpusFingerprint: sourceData.corpusFingerprint,
    counts: sourceData.counts,
  },
  policy: {
    ordering: "original_content_order",
    packing: "greedy_utf8_byte_bounded",
    targetFileBytes,
    hardFileBytes,
    originalContentJsonPreserved: true,
    originalSourceHtmlPreserved: true,
    historicalPreviewLinksAdjustedForNestedDirectory: true,
  },
  totalParts,
  totalContents: flattenedContents.length,
  maxPartBytes: Math.max(...generatedParts.map((part) => part.bytes)),
  maxPartMiB: Math.max(...generatedParts.map((part) => part.sizeMiB)),
  parts: generatedParts,
  summedCounts,
  claimBoundary: sourceData.claimBoundary,
};

const index = indexHtml(manifest);
fs.writeFileSync(path.join(outputDirectory, "index.html"), index);
fs.writeFileSync(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      outputDirectory: path
        .relative(repoRoot, outputDirectory)
        .replaceAll(path.sep, "/"),
      indexBytes: byteLength(index),
      totalParts,
      totalContents: flattenedContents.length,
      targetFileBytes,
      hardFileBytes,
      sourceSha256,
      parts: generatedParts.map((part) => ({
        part: part.partNumber,
        contents: part.contentCount,
        bytes: part.bytes,
        sizeMiB: part.sizeMiB,
        longestLineBytes: part.longestLineBytes,
      })),
    },
    null,
    2,
  ),
);
