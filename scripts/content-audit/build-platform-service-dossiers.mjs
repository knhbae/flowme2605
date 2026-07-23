import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPlatformVisual, platformVisuals } from "./platform-service-dossier-visual-data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const sourcePath = path.join(
  root,
  "docs/content-audit/2026-07-21-flowme-platform-service-dossiers-v1.json"
);
const captureLogPath = path.join(
  root,
  "docs/content-audit/assets/2026-07-21-flowme-platform-service-dossiers/capture-log.json"
);
const outputPath = path.join(
  root,
  "docs/content-audit/2026-07-21-flowme-platform-service-dossiers-ceo-ko.html"
);

const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const captureLog = JSON.parse(fs.readFileSync(captureLogPath, "utf8"));
const captures = new Map(captureLog.entries.map((entry) => [entry.name, entry]));
const totalSlides = 2 + data.platforms.length * 3 + 1;

const platformTakeaway = {
  GitHub: "원본을 지키면서도 누구나 작은 수정안을 보낼 수 있게 했다",
  "n8n Templates": "설명을 읽기 전에 완성된 결과를 복제해 보게 했다",
  "Product Hunt": "첫 사용자를 직접 모으고 매일 돌아올 이유를 만들었다",
  "Notion Marketplace": "빈 화면 대신 완성본을 보여주고 복제와 판매를 연결했다",
  note: "평범한 경험도 꾸준히 쌓이면 독자와 수익으로 이어지게 했다",
  Substack: "제작자가 독자와 구독 관계를 직접 쌓게 했다",
  wikiHow: "구체적인 문제를 단계로 풀고 작은 수정이 가능하게 했다",
  "Figma Community": "공개 파일을 구경하는 데서 끝내지 않고 바로 복제하게 했다",
  "Canva Creators": "품질 기준과 유통, 보상을 하나의 제작자 과정으로 묶었다",
  Wikipedia: "완성된 글보다 문장과 출처를 고치는 작은 참여가 먼저 쌓였다",
  OpenStreetMap: "현장에서 확인한 장소 한 건을 즉시 고칠 수 있게 했다",
  "Hugging Face Hub": "원본과 파생본, 버전과 사용 조건을 함께 보여준다",
  "NAVER 지식iN": "사람들이 반복해서 묻는 질문이 실제 수요를 드러냈다",
  "Stack Overflow": "구체적인 질문과 검증 가능한 답을 검색 자산으로 만들었다",
  오늘의집: "실제 공간의 영감을 상품과 행동으로 자연스럽게 이어 줬다",
  "Google Maps Local Guides": "긴 글이 아니어도 현장 정보 한 가지를 바로 고치게 했다",
  YouTube: "제작자와 시청자가 이미 모인 원본 플랫폼의 힘을 보여준다",
  Instructables: "완성작, 준비물, 사진 단계를 함께 보여줘 실행 확신을 준다",
  Cookpad: "레시피와 실제 조리 후기를 연결해 다음 사람의 실패를 줄인다",
  Reddit: "작은 관심사와 운영자가 강한 문화를 만들지만 운영 위험도 크다",
  Disquiet: "좁은 제작자 집단의 반응은 만들었지만 반복 사용은 별도 문제였다",
  "NAVER Cafe": "상황이 분명한 모임은 운영자와 규칙을 중심으로 오래 남았다"
};

const platformLessonTitle = {
  GitHub: "성장의 핵심은 ‘작은 첫 기여’와 검토 가능한 변경이었다",
  "n8n Templates": "자동화의 가치는 기능 설명보다 복제 가능한 완성본에서 보였다",
  "Product Hunt": "초기 성장은 대규모 광고가 아니라 직접 초대와 매일의 선별에서 시작됐다",
  "Notion Marketplace": "사용자는 빈 문서보다 완성된 시작점을 원했고, 제작자는 유통 경로를 얻었다",
  note: "전문가가 아닌 사람도 발행하고 꾸준히 쌓을 이유를 만들었다",
  Substack: "구독과 결제를 제작자가 직접 관리하게 한 것이 핵심이었다",
  wikiHow: "초기에는 편집 기능보다 직접 응대와 품질 검토가 더 중요했다",
  "Figma Community": "복제와 수정이 쉬울수록 공개 자산의 사용과 제작자 발견이 함께 늘었다",
  "Canva Creators": "품질 심사를 통과한 템플릿과 사용량 보상이 공급을 키웠다",
  Wikipedia: "기여 단위를 작게 나누고 모든 수정 이력을 공개했다",
  OpenStreetMap: "한 장소, 한 길처럼 현장에서 확인 가능한 최소 단위가 참여를 만들었다",
  "Hugging Face Hub": "버전과 파생 관계가 신뢰를 높였지만 인기 자산 쏠림도 커졌다",
  "NAVER 지식iN": "반복 질문이 콘텐츠 수요를 보여주고 답변이 검색 유입을 만들었다",
  "Stack Overflow": "구체성은 품질을 높였지만 높은 규범은 신규 참여를 어렵게 했다",
  오늘의집: "결과 사진과 관련 정보가 함께 있어 영감이 다음 행동으로 이어졌다",
  "Google Maps Local Guides": "방문 직후 가능한 작은 기여와 즉시 보상이 참여를 늘렸다",
  YouTube: "제작자 원본과 수익이 이미 모인 곳을 대체하는 전략은 비효율적이다",
  Instructables: "완성 결과를 먼저 보여주고 준비물과 과정을 뒤따르게 했다",
  Cookpad: "만든 사람의 후기가 레시피를 생활 속 지식으로 바꿨다",
  Reddit: "커뮤니티의 힘은 기능보다 운영자와 규칙에서 나왔다",
  Disquiet: "초기 관심과 가입 숫자만으로는 반복 사용을 설명할 수 없었다",
  "NAVER Cafe": "오래 남는 커뮤니티는 다루는 상황과 운영 책임자가 분명했다"
};

const platformWireframeTitle = {
  GitHub: "FlowMe에는 코드가 아니라 ‘원본·내 사본·수정 제안’ 구조가 필요하다",
  "n8n Templates": "FlowMe도 설명보다 실행 결과 미리보기를 먼저 보여줘야 한다",
  "Product Hunt": "처음부터 공개 플랫폼을 만들기보다 소수 파일럿을 정해진 일정으로 공개해야 한다",
  "Notion Marketplace": "Flow를 쓰기 전에 내 도구에 도착할 모습을 보여줘야 한다",
  note: "제작자의 기존 경험을 실행본으로 바꾸고 원문 유입을 돌려줘야 한다",
  Substack: "Flow 사용과 제작자 구독이 서로 경쟁하지 않게 연결해야 한다",
  wikiHow: "전체 Flow 작성보다 실행 직후 한 단계를 고치는 참여가 먼저다",
  "Figma Community": "기준본은 공개하되 개인 수정본은 쉽게 만들고 비공개로 둘 수 있어야 한다",
  "Canva Creators": "초기 제작자는 편집기보다 변환 지원과 명확한 발행 기준이 필요하다",
  Wikipedia: "공식 사실은 잠그고 경험 팁은 출처와 수정 이력을 남겨 보완해야 한다",
  OpenStreetMap: "현장에서 확인한 정보 한 건을 30초 안에 고치게 해야 한다",
  "Hugging Face Hub": "사용자는 어떤 기준본에서 시작했고 무엇을 바꿨는지 알아야 한다",
  "NAVER 지식iN": "반복 질문은 복사할 콘텐츠가 아니라 만들 Flow를 고르는 신호다",
  "Stack Overflow": "좋은 Flow는 막연한 조언보다 적용 조건과 완료 기준이 분명해야 한다",
  오늘의집: "원본 사진은 남겨 두고 영감을 세 가지 실행 행동으로 바꿔줘야 한다",
  "Google Maps Local Guides": "완료 직후 한 가지 피드백을 받는 것이 긴 후기보다 현실적이다",
  YouTube: "영상 아래 ‘이 콘텐츠로 실행하기’ 버튼이 FlowMe의 자연스러운 자리다",
  Instructables: "완성작을 먼저 보여주고 지금 필요한 준비물과 단계만 꺼내야 한다",
  Cookpad: "레시피 전체 메모와 장보기·조리 체크를 필요에 따라 나눠야 한다",
  Reddit: "관심사 커뮤니티를 열기 전에 검토 책임을 맡을 운영자를 확보해야 한다",
  Disquiet: "파일럿의 성공은 조회가 아니라 제작자의 두 번째 발행으로 판단해야 한다",
  "NAVER Cafe": "운영자가 반복 질문에 다시 쓸 수 있는 실행 링크부터 제공해야 한다"
};

const relationshipDisplay = {
  GitHub: "참여 운영 방식",
  "n8n Templates": "가까운 제품 참고",
  "Product Hunt": "초기 공급과 홍보 방식",
  "Notion Marketplace": "복제 경험과 제작자 유통",
  note: "제작자 발행과 수익",
  Substack: "제작자 유입 채널",
  wikiHow: "콘텐츠 검토 운영",
  "Figma Community": "복제와 개인 수정",
  "Canva Creators": "제작자 프로그램",
  Wikipedia: "작은 기여와 이력",
  OpenStreetMap: "현장 피드백",
  "Hugging Face Hub": "원본과 버전 관계",
  "NAVER 지식iN": "수요 발견과 콘텐츠 유입",
  "Stack Overflow": "품질 규칙과 참여 장벽",
  오늘의집: "콘텐츠에서 행동으로",
  "Google Maps Local Guides": "실행 직후 피드백",
  YouTube: "핵심 제작자 유입 채널",
  Instructables: "경험 콘텐츠 구성",
  Cookpad: "실행 후기와 권리",
  Reddit: "커뮤니티 운영 참고",
  Disquiet: "한국 초기 운영 참고",
  "NAVER Cafe": "상황별 커뮤니티 유입"
};

const groupDisplay = new Map([
  ["재사용 자산·협업", "복제·수정·협업"],
  ["실행 자산·자동화", "실행 가능한 템플릿"],
  ["초기 유통·선별", "첫 사용자와 선별"],
  ["템플릿·제작자 수익", "템플릿과 제작자 수익"],
  ["제작자 발행·수익", "제작자 발행과 수익"],
  ["제작자 발행·구독", "제작자 발행과 구독"],
  ["실용 가이드·검토", "실용 가이드와 검토"],
  ["템플릿·리믹스", "복제와 개인 수정"],
  ["템플릿·로열티", "템플릿과 보상"],
  ["협업 지식·거버넌스", "협업 지식과 운영"],
  ["현장 지식·작은 수정", "현장 지식과 작은 수정"],
  ["버전·파생 자산", "버전과 파생 관계"],
  ["질문·답변·수요 발견", "질문에서 수요 발견"],
  ["질문·평판·검색", "질문과 검색 자산"],
  ["경험 콘텐츠·커머스", "경험 콘텐츠와 구매"],
  ["현장 기여·지역 정보", "현장 기여와 지역 정보"],
  ["제작자 원본·유통", "제작자 원본과 유통"],
  ["DIY·완성작 가이드", "완성작 중심 가이드"],
  ["레시피·실행 후기", "레시피와 실행 후기"],
  ["관심사 커뮤니티", "관심사 커뮤니티"],
  ["한국 메이커 커뮤니티", "한국 메이커 커뮤니티"]
]);

const modeDisplay = {
  fork: "원본과 내 사본",
  export: "결과 미리보기",
  launch: "좁은 파일럿",
  template: "복제 가능한 실행본",
  creator: "제작자 원본",
  "micro-edit": "작은 수정",
  field: "현장 피드백",
  demand: "반복 질문",
  visual: "결과에서 행동으로",
  guide: "준비물과 단계",
  recipe: "요리 실행",
  community: "운영자 검토"
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const softenInternalTerms = (value) =>
  String(value)
    .replaceAll("P0", "초기 단계")
    .replaceAll("p0", "초기 단계")
    .replaceAll("Bridge", "콘텐츠와 행동을 잇는 구간")
    .replaceAll("Vertical", "전문 서비스")
    .replaceAll("Export", "내보내기")
    .replaceAll("커뮤니티 제안", "다른 사람의 수정 제안");

const groupClass = (group) => {
  if (group.includes("템플릿") || group.includes("자동화") || group.includes("재사용")) return "mint";
  if (group.includes("수익") || group.includes("커머스") || group.includes("로열티")) return "gold";
  if (group.includes("지식") || group.includes("버전") || group.includes("가이드")) return "blue";
  if (group.includes("커뮤니티") || group.includes("질문") || group.includes("유통")) return "coral";
  return "ink";
};

const slideNumber = (number) =>
  `<span class="slide-no">${String(number).padStart(2, "0")} / ${totalSlides}</span>`;

function resolveScreen(platform) {
  const visual = getPlatformVisual(platform.name);
  const capture = captures.get(platform.name);
  const useFallback = visual.preferFallback || capture?.status === "fallback";
  const imagePath = useFallback
    ? visual.fallbackAsset
    : capture?.imagePath ?? visual.fallbackAsset;
  const sourceUrl = useFallback
    ? visual.fallbackSourceUrl ?? capture?.sourceUrl ?? visual.screenUrls[0]
    : capture?.finalUrl ?? capture?.sourceUrl ?? visual.screenUrls[0];
  const status = useFallback ? "기존 원자료 화면" : "2026-07-23 자동 캡처";
  const limitation = useFallback
    ? "공개 홈의 자동 캡처가 차단되거나 내용이 비어 있어, 저장소에 보관된 원자료 화면을 사용했다."
    : "공개 화면을 자동 캡처한 자료이며 실제 사용자 검증 결과가 아니다.";
  const caption = useFallback
    ? visual.fallbackCaption ?? visual.screenCaption
    : visual.screenCaption;
  return { imagePath, sourceUrl, status, limitation, caption };
}

function platformHeader(platform, index, sectionLabel) {
  const visual = getPlatformVisual(platform.name);
  return `
    <header class="platform-header">
      <div class="rank-mark">${String(platform.rank).padStart(2, "0")}</div>
      <div class="platform-heading">
        <div class="eyebrow">
          <span>사례 ${String(index + 1).padStart(2, "0")} / 22</span>
          <span>${escapeHtml(sectionLabel)}</span>
          <span>${escapeHtml(relationshipDisplay[platform.name])}</span>
        </div>
        <h2>${escapeHtml(platform.name)}</h2>
        <p>${escapeHtml(platformTakeaway[platform.name])}</p>
      </div>
      <a class="section-jump" href="#platform-index" aria-label="플랫폼 목차로 이동">목차</a>
    </header>
    <div class="platform-tabs" aria-label="${escapeHtml(platform.name)} 세부 장표">
      <a href="#platform-${visual.slug}-overview">서비스 이해</a>
      <a href="#platform-${visual.slug}-lesson">성장 구조</a>
      <a href="#platform-${visual.slug}-wireframe">FlowMe 적용</a>
    </div>`;
}

function renderOverviewSlide(platform, index, number) {
  const visual = getPlatformVisual(platform.name);
  const screen = resolveScreen(platform);
  const accent = groupClass(platform.group);
  const loop = visual.coreLoop.map((item, loopIndex) => `
    <li>
      <span>${loopIndex + 1}</span>
      <p>${escapeHtml(item)}</p>
    </li>`).join("");

  return `
  <section class="slide platform-slide ${accent}" id="platform-${visual.slug}-overview">
    ${platformHeader(platform, index, "1. 서비스 이해")}
    <div class="overview-layout">
      <figure class="service-screen">
        <div class="browser-chrome">
          <i></i><i></i><i></i>
          <span>${escapeHtml(new URL(screen.sourceUrl).hostname)}</span>
        </div>
        <img src="${escapeHtml(screen.imagePath)}" alt="${escapeHtml(`${platform.name} 공개 서비스 화면`)}">
        <figcaption>
          <b>${escapeHtml(screen.caption)}</b>
          <span>${escapeHtml(screen.status)}</span>
        </figcaption>
      </figure>
      <div class="service-definition">
        <div class="definition-lead">
          <span class="mini-label">무엇을 하는 서비스인가</span>
          <h3>${escapeHtml(visual.whatItIs)}</h3>
        </div>
        <dl class="service-facts">
          <div><dt>주요 사용자</dt><dd>${escapeHtml(visual.audience)}</dd></div>
          <div><dt>콘텐츠 단위</dt><dd>${escapeHtml(visual.contentUnit)}</dd></div>
        </dl>
        <div class="core-loop">
          <span class="mini-label">사용자가 반복하는 핵심 행동</span>
          <ol>${loop}</ol>
        </div>
      </div>
    </div>
    <div class="source-strip">
      <a href="${escapeHtml(screen.sourceUrl)}" target="_blank" rel="noreferrer">
        <b>화면 출처</b>
        <span>${escapeHtml(screen.sourceUrl)}</span>
      </a>
      <p>${escapeHtml(screen.limitation)}</p>
    </div>
    ${slideNumber(number)}
  </section>`;
}

function renderLessonSlide(platform, index, number) {
  const visual = getPlatformVisual(platform.name);
  const accent = groupClass(platform.group);
  const metrics = platform.metrics.map((metric) => `
    <a class="metric" href="${escapeHtml(metric.sourceUrl)}" target="_blank" rel="noreferrer">
      <strong>${escapeHtml(metric.display)}</strong>
      <b>${escapeHtml(metric.label)}</b>
      <span>${escapeHtml(metric.period)} · ${escapeHtml(metric.scope)}</span>
      <small>근거 ${escapeHtml(metric.evidenceLevel)}</small>
    </a>`).join("");
  const mechanisms = platform.mechanism.map((item, mechanismIndex) => `
    <li><span>${mechanismIndex + 1}</span><p>${escapeHtml(softenInternalTerms(item))}</p></li>`).join("");

  return `
  <section class="slide platform-slide ${accent}" id="platform-${visual.slug}-lesson">
    ${platformHeader(platform, index, "2. 성장 구조")}
    <div class="lesson-title">
      <span class="mini-label">이 서비스에서 확인한 핵심</span>
      <h3>${escapeHtml(platformLessonTitle[platform.name])}</h3>
    </div>
    <div class="metric-row">${metrics}</div>
    <div class="lesson-layout">
      <div class="growth-column">
        <span class="mini-label">숫자 뒤에서 실제로 작동한 구조</span>
        <p class="growth-story">${escapeHtml(softenInternalTerms(platform.growthStory))}</p>
        <ol class="mechanism-list">${mechanisms}</ol>
      </div>
      <div class="decision-column">
        <div class="decision-block take">
          <span class="decision-icon">+</span>
          <div><b>FlowMe가 가져올 점</b><p>${escapeHtml(softenInternalTerms(platform.flowme.take))}</p></div>
        </div>
        <div class="decision-block avoid">
          <span class="decision-icon">−</span>
          <div><b>가져오지 않을 점</b><p>${escapeHtml(softenInternalTerms(platform.flowme.avoid))}</p></div>
        </div>
        <div class="decision-block question">
          <span class="decision-icon">?</span>
          <div><b>먼저 확인할 질문</b><p>${escapeHtml(softenInternalTerms(platform.flowme.p0Question))}</p></div>
        </div>
      </div>
    </div>
    <p class="caveat"><b>해석할 때 주의할 점</b>${escapeHtml(softenInternalTerms(platform.caveat))}</p>
    ${slideNumber(number)}
  </section>`;
}

function renderWireframeSlide(platform, index, number) {
  const visual = getPlatformVisual(platform.name);
  const wireframe = visual.wireframe;
  const accent = groupClass(platform.group);
  const items = wireframe.items.map((item, itemIndex) => `
    <li>
      <span class="check-box">${itemIndex + 1}</span>
      <p>${escapeHtml(item)}</p>
      <i>${itemIndex === 0 ? "기본" : "선택"}</i>
    </li>`).join("");

  return `
  <section class="slide platform-slide wireframe-slide ${accent}" id="platform-${visual.slug}-wireframe">
    ${platformHeader(platform, index, "3. FlowMe 적용")}
    <div class="wireframe-title">
      <span class="mini-label">FlowMe에 적용하면</span>
      <h3>${escapeHtml(platformWireframeTitle[platform.name])}</h3>
    </div>
    <div class="wireframe-layout">
      <div class="mock-stage">
        <div class="mock-shell mode-${escapeHtml(wireframe.mode)}">
          <div class="mock-topbar">
            <div class="flowme-brand"><span>F</span><b>FlowMe</b></div>
            <span class="prototype-badge">전략 예시 · 미구현</span>
          </div>
          <div class="mock-body">
            <div class="mock-mode">${escapeHtml(modeDisplay[wireframe.mode])}</div>
            <p class="mock-eyebrow">${escapeHtml(wireframe.eyebrow)}</p>
            <h4>${escapeHtml(wireframe.title)}</h4>
            <p class="mock-source">${escapeHtml(wireframe.source)}</p>
            <p class="mock-context">${escapeHtml(wireframe.context)}</p>
            <ol class="mock-items">${items}</ol>
            <div class="mock-actions">
              <button type="button">${escapeHtml(wireframe.primary)}</button>
              <button type="button" class="secondary">${escapeHtml(wireframe.secondary)}</button>
            </div>
          </div>
        </div>
        <p class="mock-note">실제 제품 화면이 아니라, 해당 서비스에서 차용할 원리를 보여주는 전략 와이어프레임이다.</p>
      </div>
      <div class="application-notes">
        <div class="application-point">
          <span>01</span>
          <div><b>차용할 원리</b><p>${escapeHtml(softenInternalTerms(platform.flowme.take))}</p></div>
        </div>
        <div class="application-point">
          <span>02</span>
          <div><b>첫 화면에서 보여줄 것</b><p>${escapeHtml(wireframe.context)}. 사용자가 결과를 바꾸는 최소 정보만 받는다.</p></div>
        </div>
        <div class="application-point signal">
          <span>03</span>
          <div><b>먼저 볼 행동 신호</b><p>${escapeHtml(wireframe.signal)}</p></div>
        </div>
        <div class="application-boundary">
          <b>경계</b>
          <p>${escapeHtml(softenInternalTerms(platform.flowme.avoid))}</p>
        </div>
      </div>
    </div>
    ${slideNumber(number)}
  </section>`;
}

const platformSlides = data.platforms.map((platform, index) => {
  const firstNumber = 3 + index * 3;
  return [
    renderOverviewSlide(platform, index, firstNumber),
    renderLessonSlide(platform, index, firstNumber + 1),
    renderWireframeSlide(platform, index, firstNumber + 2)
  ].join("\n");
}).join("\n");

const indexCards = data.platforms.map((platform) => {
  const visual = getPlatformVisual(platform.name);
  return `
    <a class="index-card ${groupClass(platform.group)}" href="#platform-${visual.slug}-overview">
      <span>${String(platform.rank).padStart(2, "0")}</span>
      <div><b>${escapeHtml(platform.name)}</b><small>${escapeHtml(relationshipDisplay[platform.name])}</small></div>
      <em>${platform.score}</em>
    </a>`;
}).join("");

const selectedScreenStats = data.platforms.reduce(
  (result, platform) => {
    const visual = getPlatformVisual(platform.name);
    const capture = captures.get(platform.name);
    const fallback = visual.preferFallback || capture?.status === "fallback";
    result[fallback ? "officialFallback" : "freshCapture"] += 1;
    return result;
  },
  { freshCapture: 0, officialFallback: 0 }
);

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe 플랫폼·서비스 22개 상세 도감 | CEO 전략 보고서</title>
  <style>
    :root {
      --paper: #eef1ee;
      --white: #ffffff;
      --ink: #17201d;
      --muted: #5f6b66;
      --line: #d9dfdb;
      --green: #13765d;
      --green-soft: #e2f1eb;
      --blue: #245f9c;
      --blue-soft: #e7eff8;
      --gold: #9b6718;
      --gold-soft: #f6edd8;
      --coral: #ab4c3a;
      --coral-soft: #f7e8e3;
      --shadow: 0 20px 64px rgba(24, 37, 31, .1);
      --toolbar-h: 56px;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", Arial, sans-serif;
      letter-spacing: 0;
    }
    a { color: inherit; }
    button, select { font: inherit; letter-spacing: 0; }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 50;
      min-height: var(--toolbar-h);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 9px 22px;
      background: rgba(23, 32, 29, .97);
      color: #fff;
      box-shadow: 0 5px 20px rgba(0, 0, 0, .14);
    }
    .toolbar strong { font-size: 14px; }
    .toolbar nav { display: flex; align-items: center; gap: 8px; }
    .toolbar a, .toolbar select {
      min-height: 34px;
      border: 1px solid rgba(255,255,255,.28);
      border-radius: 4px;
      background: transparent;
      color: #fff;
      padding: 7px 11px;
      text-decoration: none;
      font-size: 12px;
      font-weight: 800;
    }
    .toolbar select { max-width: 240px; background: #17201d; }
    main { display: grid; gap: 28px; padding: 28px 0 72px; }
    .slide {
      position: relative;
      width: min(1440px, calc(100% - 32px));
      min-height: 810px;
      margin: 0 auto;
      padding: 42px 54px 48px;
      overflow: hidden;
      background: var(--white);
      border: 1px solid #e0e5e1;
      box-shadow: var(--shadow);
      scroll-margin-top: calc(var(--toolbar-h) + 8px);
    }
    .slide::before {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 6px;
      background: var(--ink);
    }
    .slide.mint::before { background: var(--green); }
    .slide.blue::before { background: var(--blue); }
    .slide.gold::before { background: var(--gold); }
    .slide.coral::before { background: var(--coral); }
    .slide-no {
      position: absolute;
      right: 28px;
      bottom: 18px;
      color: #7c8782;
      font-size: 11px;
      font-weight: 900;
    }
    .eyebrow {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-bottom: 7px;
    }
    .eyebrow span, .mini-label {
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .eyebrow span + span::before { content: "·"; margin-right: 7px; color: #aab3af; }
    .cover {
      background: #17201d;
      color: #fff;
      padding: 78px 76px 60px;
    }
    .cover::before { background: #35a782; }
    .cover .cover-mark {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 900;
      color: #9ed9c6;
    }
    .cover .cover-mark span {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 1px solid #55b494;
      border-radius: 50%;
      color: #fff;
    }
    .cover h1 {
      max-width: 1030px;
      margin: 94px 0 22px;
      font-size: clamp(48px, 5.4vw, 78px);
      line-height: 1.08;
      letter-spacing: 0;
    }
    .cover .cover-thesis {
      max-width: 1080px;
      margin: 0;
      color: #d5dfdb;
      font-size: 24px;
      line-height: 1.55;
    }
    .cover-stats {
      display: flex;
      gap: 36px;
      margin-top: 82px;
      padding-top: 30px;
      border-top: 1px solid rgba(255,255,255,.15);
    }
    .cover-stats div { min-width: 160px; }
    .cover-stats strong { display: block; font-size: 34px; line-height: 1; color: #fff; }
    .cover-stats span { display: block; margin-top: 9px; color: #9eaaa5; font-size: 12px; }
    .cover .slide-no { color: #8ea098; }
    .index-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 28px;
      margin-bottom: 24px;
    }
    .index-head h2 {
      margin: 6px 0 0;
      font-size: 42px;
      line-height: 1.14;
    }
    .index-head p {
      max-width: 520px;
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.7;
    }
    .index-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .index-card {
      min-height: 74px;
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr) 34px;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--line);
      border-left: 4px solid var(--ink);
      border-radius: 5px;
      text-decoration: none;
      background: #fff;
    }
    .index-card.mint { border-left-color: var(--green); }
    .index-card.blue { border-left-color: var(--blue); }
    .index-card.gold { border-left-color: var(--gold); }
    .index-card.coral { border-left-color: var(--coral); }
    .index-card > span { color: #8a948f; font-size: 11px; font-weight: 900; }
    .index-card b { display: block; font-size: 14px; line-height: 1.25; }
    .index-card small { display: block; margin-top: 4px; color: var(--muted); font-size: 10px; }
    .index-card em {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #f0f3f1;
      font-size: 11px;
      font-style: normal;
      font-weight: 900;
    }
    .index-guide {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-top: 18px;
      padding: 16px 18px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
    }
    .index-guide b { color: var(--ink); }
    .platform-slide { padding-top: 32px; }
    .platform-header {
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr) 48px;
      align-items: start;
      gap: 16px;
    }
    .rank-mark {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      border: 1px solid var(--line);
      border-radius: 50%;
      font-size: 14px;
      font-weight: 900;
      color: var(--muted);
    }
    .platform-heading h2 {
      display: inline;
      margin: 0;
      font-size: 34px;
      line-height: 1.15;
    }
    .platform-heading > p {
      display: inline;
      margin: 0 0 0 14px;
      color: var(--muted);
      font-size: 17px;
      font-weight: 700;
      line-height: 1.45;
    }
    .section-jump {
      display: grid;
      place-items: center;
      width: 46px;
      min-height: 36px;
      border: 1px solid var(--line);
      border-radius: 4px;
      text-decoration: none;
      font-size: 11px;
      font-weight: 900;
    }
    .platform-tabs {
      display: flex;
      gap: 4px;
      margin: 14px 0 22px 70px;
    }
    .platform-tabs a {
      padding: 6px 10px;
      border-bottom: 2px solid var(--line);
      color: var(--muted);
      text-decoration: none;
      font-size: 11px;
      font-weight: 800;
    }
    .overview-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.58fr) minmax(330px, .72fr);
      gap: 30px;
      align-items: stretch;
    }
    .service-screen {
      min-width: 0;
      margin: 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      overflow: hidden;
      background: #f6f8f6;
    }
    .browser-chrome {
      height: 34px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 12px;
      border-bottom: 1px solid var(--line);
      background: #f2f4f2;
    }
    .browser-chrome i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #bdc6c1;
    }
    .browser-chrome span {
      margin-left: 7px;
      color: #6d7772;
      font-size: 10px;
    }
    .service-screen img {
      display: block;
      width: 100%;
      height: 440px;
      object-fit: cover;
      object-position: top;
      background: #eef1ef;
    }
    .service-screen figcaption {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 52px;
      padding: 10px 14px;
      border-top: 1px solid var(--line);
      background: #fff;
    }
    .service-screen figcaption b { font-size: 12px; line-height: 1.45; }
    .service-screen figcaption span {
      flex: 0 0 auto;
      color: var(--muted);
      font-size: 10px;
      font-weight: 800;
    }
    .service-definition {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 10px 0 0;
    }
    .definition-lead h3 {
      margin: 9px 0 0;
      font-size: 24px;
      line-height: 1.42;
    }
    .service-facts { margin: 0; border-top: 1px solid var(--line); }
    .service-facts div {
      display: grid;
      grid-template-columns: 88px minmax(0, 1fr);
      gap: 12px;
      padding: 13px 0;
      border-bottom: 1px solid var(--line);
    }
    .service-facts dt { color: var(--muted); font-size: 11px; font-weight: 900; }
    .service-facts dd { margin: 0; font-size: 13px; font-weight: 700; line-height: 1.5; }
    .core-loop ol { list-style: none; margin: 10px 0 0; padding: 0; }
    .core-loop li {
      display: grid;
      grid-template-columns: 30px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      min-height: 48px;
      border-bottom: 1px solid var(--line);
    }
    .core-loop li span {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--ink);
      color: #fff;
      font-size: 10px;
      font-weight: 900;
    }
    .core-loop li p { margin: 0; font-size: 13px; line-height: 1.45; }
    .source-strip {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(0, .75fr);
      gap: 18px;
      margin-top: 17px;
      padding-top: 14px;
      border-top: 1px solid var(--line);
    }
    .source-strip a { min-width: 0; text-decoration: none; }
    .source-strip b { margin-right: 8px; font-size: 11px; }
    .source-strip span {
      color: var(--blue);
      font-size: 10px;
      overflow-wrap: anywhere;
    }
    .source-strip p { margin: 0; color: var(--muted); font-size: 10px; line-height: 1.45; }
    .lesson-title, .wireframe-title {
      display: grid;
      grid-template-columns: 170px minmax(0, 1fr);
      gap: 20px;
      align-items: baseline;
      margin: 2px 0 18px;
      padding: 16px 0 17px;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }
    .lesson-title h3, .wireframe-title h3 {
      margin: 0;
      font-size: 27px;
      line-height: 1.35;
    }
    .metric-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .metric {
      position: relative;
      min-height: 112px;
      padding: 15px 16px;
      border: 1px solid var(--line);
      border-radius: 5px;
      text-decoration: none;
    }
    .metric strong { display: block; font-size: 28px; line-height: 1.05; }
    .metric b { display: block; margin-top: 7px; font-size: 12px; }
    .metric span { display: block; margin-top: 5px; color: var(--muted); font-size: 10px; }
    .metric small {
      position: absolute;
      right: 10px;
      top: 10px;
      padding: 3px 6px;
      border-radius: 3px;
      background: #eff2f0;
      color: var(--muted);
      font-size: 9px;
      font-weight: 900;
    }
    .lesson-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(380px, .85fr);
      gap: 30px;
    }
    .growth-column { padding-right: 26px; border-right: 1px solid var(--line); }
    .growth-story { margin: 10px 0 14px; font-size: 16px; line-height: 1.75; }
    .mechanism-list { list-style: none; margin: 0; padding: 0; }
    .mechanism-list li {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      min-height: 46px;
      border-top: 1px solid var(--line);
    }
    .mechanism-list li span { color: var(--muted); font-size: 10px; font-weight: 900; }
    .mechanism-list li p { margin: 0; font-size: 13px; line-height: 1.4; }
    .decision-column { display: grid; gap: 10px; }
    .decision-block {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 12px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 5px;
    }
    .decision-icon {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--green-soft);
      color: var(--green);
      font-size: 17px;
      font-weight: 900;
    }
    .decision-block.avoid .decision-icon { background: var(--coral-soft); color: var(--coral); }
    .decision-block.question .decision-icon { background: var(--blue-soft); color: var(--blue); }
    .decision-block b { font-size: 12px; }
    .decision-block p { margin: 5px 0 0; color: #3e4944; font-size: 12px; line-height: 1.55; }
    .caveat {
      margin: 16px 0 0;
      padding: 12px 14px;
      border-left: 3px solid var(--gold);
      background: var(--gold-soft);
      font-size: 11px;
      line-height: 1.55;
    }
    .caveat b { margin-right: 10px; }
    .wireframe-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(360px, .75fr);
      gap: 38px;
      align-items: center;
    }
    .mock-stage { min-width: 0; }
    .mock-shell {
      width: min(780px, 100%);
      margin: 0 auto;
      border: 1px solid #cfd6d2;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 18px 46px rgba(24, 38, 31, .13);
    }
    .mock-topbar {
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 9px 14px;
      background: #17201d;
      color: #fff;
    }
    .flowme-brand { display: flex; align-items: center; gap: 8px; }
    .flowme-brand span {
      display: grid;
      place-items: center;
      width: 25px;
      height: 25px;
      border-radius: 50%;
      background: #35a782;
      font-size: 11px;
      font-weight: 900;
    }
    .flowme-brand b { font-size: 12px; }
    .prototype-badge {
      color: #b9c7c1;
      font-size: 10px;
      font-weight: 800;
    }
    .mock-body { padding: 20px 22px 22px; }
    .mock-mode {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      background: var(--green-soft);
      color: var(--green);
      font-size: 10px;
      font-weight: 900;
    }
    .mode-launch .mock-mode, .mode-community .mock-mode { background: var(--coral-soft); color: var(--coral); }
    .mode-demand .mock-mode, .mode-field .mock-mode { background: var(--blue-soft); color: var(--blue); }
    .mode-creator .mock-mode, .mode-recipe .mock-mode { background: var(--gold-soft); color: var(--gold); }
    .mock-eyebrow { margin: 14px 0 5px; color: var(--muted); font-size: 10px; font-weight: 800; }
    .mock-body h4 { margin: 0; font-size: 25px; line-height: 1.25; }
    .mock-source { margin: 8px 0 0; color: var(--blue); font-size: 11px; font-weight: 700; }
    .mock-context {
      margin: 12px 0 14px;
      padding: 10px 12px;
      border-left: 3px solid var(--green);
      background: #f3f6f4;
      font-size: 12px;
      line-height: 1.5;
    }
    .mock-items { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
    .mock-items li {
      display: grid;
      grid-template-columns: 30px minmax(0, 1fr) 34px;
      gap: 10px;
      align-items: center;
      min-height: 52px;
      border-bottom: 1px solid var(--line);
    }
    .check-box {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border: 1px solid #bbc5c0;
      border-radius: 4px;
      color: var(--muted);
      font-size: 9px;
      font-weight: 900;
    }
    .mock-items p { margin: 0; font-size: 12px; line-height: 1.45; }
    .mock-items i { color: #8a948f; font-size: 9px; font-style: normal; font-weight: 800; }
    .mock-actions { display: flex; gap: 9px; margin-top: 18px; }
    .mock-actions button {
      min-height: 40px;
      padding: 9px 15px;
      border: 1px solid var(--ink);
      border-radius: 4px;
      background: var(--ink);
      color: #fff;
      font-size: 11px;
      font-weight: 900;
    }
    .mock-actions button.secondary { background: #fff; color: var(--ink); }
    .mock-note {
      max-width: 780px;
      margin: 10px auto 0;
      color: var(--muted);
      font-size: 10px;
      text-align: center;
    }
    .application-notes { display: grid; gap: 8px; }
    .application-point {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr);
      gap: 12px;
      padding: 13px 0;
      border-bottom: 1px solid var(--line);
    }
    .application-point > span {
      color: var(--muted);
      font-size: 10px;
      font-weight: 900;
    }
    .application-point b { font-size: 12px; }
    .application-point p { margin: 5px 0 0; color: #45504b; font-size: 12px; line-height: 1.6; }
    .application-point.signal { border-bottom: 0; }
    .application-boundary {
      margin-top: 8px;
      padding: 14px;
      border-left: 3px solid var(--coral);
      background: var(--coral-soft);
    }
    .application-boundary b { font-size: 11px; }
    .application-boundary p { margin: 5px 0 0; font-size: 11px; line-height: 1.55; }
    .conclusion h2 {
      max-width: 980px;
      margin: 58px 0 28px;
      font-size: 46px;
      line-height: 1.2;
    }
    .conclusion-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-top: 36px;
    }
    .conclusion-point {
      min-height: 178px;
      padding: 20px;
      border-top: 4px solid var(--green);
      background: #f5f7f5;
    }
    .conclusion-point:nth-child(2) { border-top-color: var(--blue); }
    .conclusion-point:nth-child(3) { border-top-color: var(--gold); }
    .conclusion-point span { color: var(--muted); font-size: 10px; font-weight: 900; }
    .conclusion-point b { display: block; margin-top: 18px; font-size: 20px; line-height: 1.35; }
    .conclusion-point p { margin: 10px 0 0; color: var(--muted); font-size: 13px; line-height: 1.65; }
    .decision-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 26px;
      margin: 30px 0 0;
      padding: 22px 0 0;
      border-top: 1px solid var(--line);
    }
    .decision-list div {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr);
      gap: 10px;
      padding: 13px 0;
      border-bottom: 1px solid var(--line);
    }
    .decision-list span { color: var(--green); font-size: 12px; font-weight: 900; }
    .decision-list p { margin: 0; font-size: 13px; line-height: 1.5; }
    .report-meta {
      margin-top: 22px;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.6;
    }
    @media (max-width: 900px) {
      :root { --toolbar-h: 52px; }
      .toolbar { padding: 8px 10px; gap: 8px; }
      .toolbar { position: static; }
      .toolbar strong { font-size: 11px; }
      .toolbar nav a { display: none; }
      .toolbar select { max-width: 190px; font-size: 10px; }
      main { gap: 14px; padding: 10px 0 32px; }
      .slide {
        width: calc(100% - 16px);
        min-height: 0;
        padding: 30px 18px 44px;
        scroll-margin-top: 6px;
      }
      .cover { min-height: calc(100vh - 68px); padding: 38px 24px 48px; }
      .cover h1 { margin: 70px 0 18px; font-size: 40px; }
      .cover .cover-thesis { font-size: 17px; line-height: 1.55; }
      .cover-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 58px; }
      .cover-stats div { min-width: 0; }
      .cover-stats strong { font-size: 27px; }
      .index-head { display: block; }
      .index-head h2 { font-size: 31px; }
      .index-head p { margin-top: 14px; }
      .index-grid { grid-template-columns: 1fr; }
      .index-card { min-height: 62px; }
      .index-guide { align-items: flex-start; flex-direction: column; }
      .platform-header { grid-template-columns: 42px minmax(0, 1fr); gap: 11px; }
      .rank-mark { width: 40px; height: 40px; font-size: 11px; }
      .platform-heading h2 { display: block; font-size: 27px; }
      .platform-heading > p { display: block; margin: 7px 0 0; font-size: 14px; }
      .section-jump { display: none; }
      .platform-tabs { margin: 13px 0 20px 52px; overflow-x: auto; }
      .platform-tabs a { flex: 0 0 auto; }
      .overview-layout, .lesson-layout, .wireframe-layout, .source-strip {
        grid-template-columns: 1fr;
      }
      .service-screen img { height: 230px; }
      .service-screen figcaption { align-items: flex-start; flex-direction: column; gap: 4px; }
      .service-definition { padding-top: 0; }
      .definition-lead h3 { font-size: 21px; }
      .source-strip { gap: 8px; }
      .lesson-title, .wireframe-title { grid-template-columns: 1fr; gap: 8px; }
      .lesson-title h3, .wireframe-title h3 { font-size: 23px; }
      .metric-row { grid-template-columns: 1fr; }
      .metric { min-height: 94px; }
      .growth-column { padding-right: 0; border-right: 0; }
      .mock-body { padding: 17px 15px 18px; }
      .mock-body h4 { font-size: 22px; }
      .mock-actions { align-items: stretch; flex-direction: column; }
      .mock-actions button { width: 100%; }
      .conclusion h2 { margin-top: 36px; font-size: 33px; }
      .conclusion-grid, .decision-list { grid-template-columns: 1fr; }
      .conclusion-point { min-height: 0; }
    }
    @media print {
      .toolbar { display: none; }
      main { display: block; padding: 0; }
      .slide {
        width: 100%;
        min-height: 100vh;
        margin: 0;
        box-shadow: none;
        page-break-after: always;
        break-after: page;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>FlowMe 플랫폼·서비스 22개 상세 도감</strong>
    <nav>
      <a href="#cover">처음</a>
      <a href="#platform-index">목차</a>
      <select aria-label="플랫폼 바로가기" onchange="if(this.value) location.hash=this.value">
        <option value="">플랫폼 바로가기</option>
        ${data.platforms.map((platform) => {
          const visual = getPlatformVisual(platform.name);
          return `<option value="#platform-${visual.slug}-overview">${String(platform.rank).padStart(2, "0")}. ${escapeHtml(platform.name)}</option>`;
        }).join("")}
      </select>
      <a href="#cross-platform-conclusion">결론</a>
    </nav>
  </div>
  <main>
    <section class="slide cover" id="cover">
      <div class="cover-mark"><span>F</span> FlowMe Strategy Dossier · 2026.07.23</div>
      <h1>22개 서비스에서<br>FlowMe가 배워야 할 것</h1>
      <p class="cover-thesis">플랫폼의 겉모습을 따라가는 보고서가 아니다. 원본을 보존하면서 사용자가 바로 실행하고, 제작자와 참여자가 작은 피드백을 남기게 하는 구조를 찾았다.</p>
      <div class="cover-stats">
        <div><strong>22개</strong><span>플랫폼·서비스 사례</span></div>
        <div><strong>66장</strong><span>서비스 이해·성장 구조·적용 예시</span></div>
        <div><strong>${selectedScreenStats.freshCapture}개</strong><span>새로 확보한 공개 화면</span></div>
        <div><strong>${selectedScreenStats.officialFallback}개</strong><span>기존 원자료 화면</span></div>
      </div>
      ${slideNumber(1)}
    </section>

    <section class="slide" id="platform-index">
      <div class="index-head">
        <div>
          <span class="mini-label">읽는 방법</span>
          <h2>서비스마다 세 장씩 본다</h2>
        </div>
        <p>첫 장은 실제 화면과 핵심 사용 장면, 둘째 장은 숫자와 성장 구조, 셋째 장은 FlowMe 적용 와이어프레임이다. 순위는 ‘그대로 따라야 할 순서’가 아니라 참고 가치 점수다.</p>
      </div>
      <div class="index-grid">${indexCards}</div>
      <div class="index-guide">
        <span><b>화면 자료</b> ${selectedScreenStats.freshCapture}개는 2026-07-23 공개 화면 자동 캡처, ${selectedScreenStats.officialFallback}개는 기존 원자료 화면</span>
        <span><b>근거 등급</b> A 공식 자료·공시·제품 화면 · B 창업자 회고·원 연구 · C 보도·표본</span>
        <span><b>주의</b> 자동 캡처와 보고서 분석은 실제 사용자 검증이 아니다.</span>
      </div>
      ${slideNumber(2)}
    </section>

    ${platformSlides}

    <section class="slide conclusion" id="cross-platform-conclusion">
      <span class="mini-label">22개 사례를 함께 봤을 때의 결론</span>
      <h2>FlowMe가 먼저 만들어야 할 것은 큰 플랫폼이 아니라, 원본에서 실행까지 이어지는 짧고 믿을 수 있는 경로다</h2>
      <div class="conclusion-grid">
        <div class="conclusion-point">
          <span>사용자</span>
          <b>완성된 실행 결과를 먼저 본다</b>
          <p>원문을 읽고 다시 계획하게 하지 않는다. 내보낼 일정·체크리스트·메모를 먼저 보여주고 필요한 정보만 받는다.</p>
        </div>
        <div class="conclusion-point">
          <span>제작자</span>
          <b>이름과 원문 유입, 사용 신호를 돌려받는다</b>
          <p>원문을 복제하지 않는다. 제작자 출처와 링크를 보존하고, 사용자가 동의한 범위에서 실행 신호를 집계해 돌려준다.</p>
        </div>
        <div class="conclusion-point">
          <span>참여자</span>
          <b>전체 제작보다 작은 보완부터 한다</b>
          <p>오래된 정보 신고, 지역 정보 수정, 한 단계 추가처럼 30초에서 1분 안에 끝나는 기여를 먼저 연다.</p>
        </div>
      </div>
      <div class="decision-list">
        <div><span>01</span><p><b>승인할 것:</b> 제작자 출처가 있는 실행 결과와 외부 도구 내보내기를 초기 제품의 중심으로 둔다.</p></div>
        <div><span>02</span><p><b>먼저 검증할 것:</b> 저장·내보내기 뒤 첫 행동 체크와 일주일 내 재사용을 핵심 신호로 본다.</p></div>
        <div><span>03</span><p><b>운영할 것:</b> 제작자 10명 안팎의 좁은 파일럿에서 FlowMe가 변환을 지원하고 두 번째 발행을 확인한다.</p></div>
        <div><span>04</span><p><b>미룰 것:</b> 공개 커뮤니티, 평판 점수, 거래 마켓, 복잡한 편집기는 반복 사용이 확인된 뒤 연다.</p></div>
      </div>
      <p class="report-meta">근거: 플랫폼별 공식 화면·공식 발표·공식 도움말 및 원자료 링크. FlowMe 적용 화면은 전략 예시이며 구현 완료나 사용자 검증을 뜻하지 않는다.</p>
      ${slideNumber(totalSlides)}
    </section>
  </main>
  <script>
    document.querySelectorAll('.toolbar a, .platform-tabs a, .index-card, .section-jump').forEach((link) => {
      link.addEventListener('click', () => {
        const select = document.querySelector('.toolbar select');
        if (select) select.value = '';
      });
    });
  </script>
</body>
</html>`;

fs.writeFileSync(outputPath, html, "utf8");
console.log(
  `Wrote ${path.relative(root, outputPath)} (${data.platforms.length} platforms, ${totalSlides} slides)`
);

if (Object.keys(platformVisuals).length !== data.platforms.length) {
  throw new Error(
    `Visual data count ${Object.keys(platformVisuals).length} does not match platform count ${data.platforms.length}`
  );
}
