import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const samplesPath = "docs/content-audit/original-source-review/2026-06-01-creator-flow-validation-samples.json";
const seedPath = "docs/content-audit/original-source-review/2026-06-01-my-flow-seed-candidates.json";
const htmlPath = "docs/content-audit/2026-06-01-creator-flow-samples.html";
const publicHtmlPath = "public/content-audit/creator-flow-review.html";
const mdPath = "docs/content-audit/2026-06-01-creator-flow-samples.md";
const rulesPath = "docs/content-audit/2026-06-01-creator-flow-prompt-rules.md";
const serverPath = "scripts/content-audit/serve-creator-flow-review.mjs";
const remoteApiPath = "public/content-audit/api/reviews.js";

const data = JSON.parse(fs.readFileSync(samplesPath, "utf8"));
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const html = fs.readFileSync(htmlPath, "utf8");
const publicHtml = fs.readFileSync(publicHtmlPath, "utf8");
const md = fs.readFileSync(mdPath, "utf8");
const rules = fs.readFileSync(rulesPath, "utf8");
const server = fs.readFileSync(serverPath, "utf8");
const remoteApi = fs.readFileSync(remoteApiPath, "utf8");

test("representative sample set matches the requested validation scope", () => {
  assert.equal(data.samples.length, 12);
  assert.ok(data.samples.filter((sample) => sample.depth === "deep").length >= 3);

  const sourceStructures = new Set(data.samples.map((sample) => sample.sourceStructure));
  for (const required of ["single_url", "source_bundle", "youtube_playlist", "blog_series", "template", "official_plus_creator"]) {
    assert.ok(sourceStructures.has(required), `missing source structure: ${required}`);
  }

  const requiredTypes = [
    "단일 URL 체크리스트형",
    "단일 URL 챌린지형",
    "제작자 여러 URL 묶음형",
    "유튜브 플레이리스트형",
    "블로그 시리즈형",
    "공식 정보 + 제작자 경험 혼합형",
    "기준일 타임라인형",
    "생활 루틴/관리형",
    "제작/운영 파이프라인형",
  ];
  const types = new Set(data.samples.map((sample) => sample.requiredType));
  for (const required of requiredTypes) {
    assert.ok(types.has(required), `missing representative type: ${required}`);
  }
});

test("each sample contains source-grounded flow fields", () => {
  for (const sample of data.samples) {
    assert.ok(sample.id.startsWith("rep-"));
    assert.ok(sample.title);
    assert.ok(sample.sourceUrls.length >= 1);
    assert.ok(sample.sourceSignals.length >= 3);
    assert.ok(sample.userGoal);
    assert.ok(sample.creatorIncentive);
    assert.ok(sample.userInputs.length >= 1 && sample.userInputs.length <= 3);
    assert.ok(sample.today.length >= 1);
    assert.ok(sample.calendar.length >= 1);
    assert.ok(sample.items.length >= 3);
    assert.ok(sample.memo);
    assert.ok(sample.completion);
    assert.ok(sample.hold.length >= 2);
    assert.ok(sample.boundary.copyright);
    assert.ok(sample.boundary.source);
    assert.ok(sample.boundary.risk);
    assert.ok(sample.uxProblems.length >= 2);
    assert.ok(sample.average >= 4);

    for (const [, , url] of sample.sourceUrls) {
      assert.match(url, /^https:\/\//);
    }

    for (const key of data.dimensions) {
      assert.ok(Number.isInteger(sample.scores[key]), `${sample.id} missing score ${key}`);
      assert.ok(sample.scores[key] >= 1 && sample.scores[key] <= 5, `${sample.id} invalid score ${key}`);
    }

    for (const [, , completion] of sample.items) {
      assert.doesNotMatch(completion, /완료 상태로 표시/);
    }
  }
});

test("multi-source structures actually contain multiple source URLs", () => {
  for (const sample of data.samples) {
    if (["source_bundle", "youtube_playlist", "blog_series", "official_plus_creator"].includes(sample.sourceStructure)) {
      assert.ok(sample.sourceUrls.length >= 2, `${sample.id} should have multiple URLs`);
    }
  }
});

test("seed candidate file can be used as a My Flow demo-data draft", () => {
  assert.ok(seed.seedCandidates.length >= 10);
  for (const candidate of seed.seedCandidates) {
    assert.ok(candidate.id);
    assert.ok(candidate.title);
    assert.ok(candidate.destination);
    assert.ok(candidate.sourceUrls.length >= 1);
    assert.ok(candidate.userInputs.length >= 1 && candidate.userInputs.length <= 3);
    assert.ok(candidate.items.length >= 3);
    assert.ok(candidate.demoFlow);
    assert.ok(candidate.demoFlow.filledInputs.length >= 1);
    assert.ok(candidate.demoFlow.today.length >= 1);
    assert.ok(candidate.demoFlow.calendar.length >= 1);

    for (const item of candidate.items) {
      assert.ok(item.title);
      assert.ok(item.type);
      assert.ok(item.completion);
    }
  }
});

test("human review artifacts include diagnosis, score table, samples, and rules", () => {
  for (const artifact of [html, md, rules]) {
    assert.doesNotMatch(artifact, /undefined/);
    assert.doesNotMatch(artifact, /\[object Object\]/);
  }

  assert.match(html, /기존 자동 exampleFlow 진단/);
  assert.match(html, /정답 Flow 샘플/);
  assert.match(html, /data-section="executive-summary"/);
  assert.match(html, /data-section="priority-groups"/);
  assert.match(html, /data-section="review-toolbar"/);
  assert.match(html, /저장 가능한 리뷰 페이지 열기/);
  assert.match(html, /http:\/\/127\.0\.0\.1:54521\/review/);
  assert.match(html, /data-export-reviews="json"/);
  assert.match(html, /data-export-reviews="md"/);
  assert.equal((html.match(/data-section="actual-demo"/g) ?? []).length, 12);
  assert.equal((html.match(/data-section="user-review"/g) ?? []).length, 12);
  assert.equal((html.match(/<form class="review"/g) ?? []).length, 12);
  assert.equal((html.match(/<button type="submit" data-save-review/g) ?? []).length, 12);
  assert.equal((html.match(/target="review-save-frame"/g) ?? []).length, 12);
  assert.match(html, /name="review-save-frame"/);
  assert.match(html, /flowme\.creatorFlowReviewNotes\.v1/);
  assert.match(html, /\/api\/reviews/);
  assert.match(html, /location\.protocol === "file:"/);
  assert.match(html, /http:\/\/127\.0\.0\.1:54521/);
  assert.match(html, /location\.port === "54521"/);
  assert.match(html, /isReviewServer \? "\/api\/reviews" : localApiOrigin \+ "\/api\/reviews"/);
  assert.equal((html.match(/<article class="card">/g) ?? []).length, 12);
  assert.match(md, /## 점수표/);
  assert.match(md, /## 결론 먼저/);
  assert.match(md, /## 후보 그룹/);
  assert.match(md, /## 다음 UX\/UI 우선순위/);
  assert.equal((md.match(/### 실제 생성 예시/g) ?? []).length, 12);
  assert.match(md, /UX\/UI 검증 결과 요약/);
  assert.match(rules, /자동 생성 금지 신호/);
  assert.equal(publicHtml, html);
});

test("local review server writes review notes through an API", () => {
  assert.match(server, /createServer/);
  assert.match(server, /2026-06-01-creator-flow-review-notes\.json/);
  assert.match(server, /2026-06-01-creator-flow-review-notes\.md/);
  assert.match(server, /rating must be 1-5/);
  assert.match(server, /x-review-write-key/);
  assert.match(server, /application\/x-www-form-urlencoded/);
  assert.match(server, /URLSearchParams/);
});

test("remote review API is wired for GitHub-backed repository storage", () => {
  assert.match(remoteApi, /GITHUB_TOKEN/);
  assert.match(remoteApi, /GITHUB_OWNER/);
  assert.match(remoteApi, /REVIEW_WRITE_KEY/);
  assert.match(remoteApi, /flow-mvp\/docs\/content-audit\/original-source-review\/2026-06-01-creator-flow-review-notes\.json/);
  assert.match(remoteApi, /api.github.com\/repos/);
  assert.match(html, /x-review-write-key/);
  assert.match(html, /서버 저장 설정 필요/);
});
