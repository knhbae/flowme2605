import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  koreanFlowContentCandidates,
  type KoreanFlowContentCandidate,
} from '../../lib/flow/korean-flow-content-candidates';
import {
  applyKoreanFlowContentReviewRefresh,
  applyKoreanFlowContentSourceRefresh,
  koreanFlowContentSourceRefreshById,
} from '../../lib/flow/korean-flow-content-source-refresh';
import {
  koreanFlowContentUserReviewById,
  type KoreanFlowContentUserReview,
} from '../../lib/flow/korean-flow-content-user-review';
import {
  additionalSourceLeads,
  flowContentSelectionAudits,
  flowContentSelectionSummary,
  selectedFlowContentP0Ids,
  type FlowContentSelectionAudit,
  type FlowContentSelectionTier,
} from '../../lib/flow/flow-content-selection-audit';
import {
  antiRepetitionCandidateIds,
  creatorSourceBreadthCandidateIds,
  latestDiversificationCandidateIds,
  representativeCoverageGroups,
} from '../../lib/flow/flow-content-coverage-axes';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputPath = path.join(
  root,
  'docs/content-audit/2026-06-02-flow-content-ux-candidates.html',
);
const previewDir = path.join(root, 'docs/content-audit/flow-content-ux-candidates-previews');

const previewHrefFor = (candidate: KoreanFlowContentCandidate) =>
  `flow-content-ux-candidates-previews/${candidate.id}.html`;

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const patternFor = (candidate: KoreanFlowContentCandidate) => {
  if (
    candidate.id === 'college-dorm-move-in-checklist' ||
    candidate.id === 'elementary-school-entry-d30'
  ) {
    return {
      key: 'E',
      title: 'E. 생활 전환 준비 Flow',
      summary: '기숙사 입사, 초등 입학처럼 기준일 전 서류·준비물·연습을 가볍게 챙기는 Flow.',
    };
  }

  if (candidate.id === 'kids-printable-squishy-craft') {
    return {
      key: 'F',
      title: 'F. 제작자 자료 실행 Flow',
      summary: '도안, PDF, 영상처럼 원문 자료 링크를 보존하고 출력·재료·실행만 돕는 Flow.',
    };
  }

  if (candidate.id === 'anydesk-remote-setup-check') {
    return {
      key: 'G',
      title: 'G. 디지털 절차 체크 Flow',
      summary: '설치, 계정, 원격지원처럼 민감 정보 저장 없이 순서를 따라 하는 Flow.',
    };
  }

  if (candidate.id === 'fridge-cleanout-weekly-plan') {
    return {
      key: 'H',
      title: 'H. 재고·메뉴 시트 Flow',
      summary: '냉장고 재고, 식재료 소진처럼 7일 후보표와 보류 판단을 만드는 Flow.',
    };
  }

  if (candidate.id === 'balcony-fall-vegetable-calendar') {
    return {
      key: 'I',
      title: 'I. 계절 재배 캘린더 Flow',
      summary: '베란다 채소처럼 파종·관리·수확 후보일을 작은 시트와 캘린더로 나누는 Flow.',
    };
  }

  if (candidate.id === 'self-wall-paint-weekend') {
    return {
      key: 'J',
      title: 'J. 주말 프로젝트 체크 Flow',
      summary: '셀프 페인팅처럼 D-3 준비, D-1 보양, 당일 작업 순서가 있는 단기 실행 Flow.',
    };
  }

  if (candidate.id === 'freelancer-income-tax-docs') {
    return {
      key: 'K',
      title: 'K. 서류 준비 데드라인 Flow',
      summary: '세무·행정 판단은 분리하고 마감 전 자료 모으기만 돕는 체크 Flow.',
    };
  }

  if (candidate.structure === 'timeline') {
    return {
      key: 'D',
      title: 'D. 기준일 타임라인',
      summary: '결혼, 이사, 여행, 행정처럼 기준일 하나로 여러 일정이 생성되는 Flow.',
    };
  }

  if (candidate.structure === 'checklist') {
    return {
      key: 'C',
      title: 'C. 결정형 체크리스트',
      summary: '중고차, 행정, 점검처럼 완료보다 보류/결정/확인이 중요한 Flow.',
    };
  }

  if (
    candidate.category.includes('유아') ||
    candidate.category.includes('독서') ||
    candidate.structure === 'challenge'
  ) {
    return {
      key: 'B',
      title: 'B. 루틴 + 콘텐츠 카드',
      summary: '독서, 놀이, 운동, 글쓰기처럼 반복 루틴에 오늘 볼 콘텐츠를 꽂는 Flow.',
    };
  }

  return {
    key: 'A',
    title: 'A. 보유 대상 프로필 + 반복 Flow',
    summary: '세탁기, 식물, 차량, 반려동물처럼 사용자가 가진 대상에 반복 관리를 붙이는 Flow.',
  };
};

const patternKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

const destinationLabel: Record<KoreanFlowContentCandidate['destination'], string> = {
  calendar: '캘린더',
  routine: '루틴',
  checklist: '체크',
  sheet: '표',
  hybrid: '혼합',
};

const sourceTypeLabel: Record<KoreanFlowContentCandidate['sourceType'], string> = {
  creator_blog: '블로그/제작자',
  creator_video: '제작자 영상',
  official: '공식/자료',
  brand_support: '브랜드 지원',
  community: '커뮤니티',
  commerce: '커머스',
};

const fitLabel = (score: number) => {
  if (score >= 4.5) return '우선 검증';
  if (score >= 4.1) return '좋은 후보';
  if (score >= 3.8) return '조건부';
  return '보류';
};

const reviewStatusLabel: Record<KoreanFlowContentUserReview['status'], string> = {
  representative: '대표 P0',
  promote: '추가 검증',
  conditional: '조건부',
  hold: '보류',
};

const sourceQualityLabel: Record<KoreanFlowContentUserReview['sourceQuality'], string> = {
  strong_creator: '제작자성 강함',
  clear_official: '공식/명확',
  usable_but_ai_like: 'AI 느낌',
  too_broad: '범위 과다',
  source_unclear: '원문 불명확',
  needs_exact_source: '원문 보강 필요',
};

type TraceStrength = 'strong' | 'needs_review' | 'weak';

const traceStrengthLabel: Record<TraceStrength, string> = {
  strong: '대응 강함',
  needs_review: '재검토 필요',
  weak: '대응 약함',
};

const reviewFor = (candidate: KoreanFlowContentCandidate) => {
  const review = koreanFlowContentUserReviewById.get(candidate.id);
  if (!review) {
    throw new Error(`Missing user review for ${candidate.id}`);
  }
  return applyKoreanFlowContentReviewRefresh(review);
};

const traceStrengthFor = (candidate: KoreanFlowContentCandidate): TraceStrength => {
  const review = reviewFor(candidate);
  if (
    review.status === 'hold' ||
    review.sourceQuality === 'source_unclear' ||
    review.sourceQuality === 'needs_exact_source' ||
    candidate.fitScore < 3.8 ||
    candidate.flowItems.length < 2
  ) {
    return 'weak';
  }

  if (
    review.status === 'conditional' ||
    review.sourceQuality === 'too_broad' ||
    review.sourceQuality === 'usable_but_ai_like' ||
    candidate.fitScore < 4.2
  ) {
    return 'needs_review';
  }

  return 'strong';
};

const displayCandidates = koreanFlowContentCandidates.map(applyKoreanFlowContentSourceRefresh);
const representativeKoreanFlowContentIds = displayCandidates
  .filter((candidate) => reviewFor(candidate).status === 'representative')
  .map((candidate) => candidate.id);

const byPattern = displayCandidates.reduce<Record<string, number>>((acc, candidate) => {
  const pattern = patternFor(candidate);
  acc[pattern.key] = (acc[pattern.key] ?? 0) + 1;
  return acc;
}, {});

const statusRank: Record<KoreanFlowContentUserReview['status'], number> = {
  representative: 0,
  promote: 1,
  conditional: 2,
  hold: 3,
};

const sortedCandidates = [...displayCandidates].sort((a, b) => {
  const aReview = reviewFor(a);
  const bReview = reviewFor(b);
  const statusDiff = statusRank[aReview.status] - statusRank[bReview.status];
  if (statusDiff !== 0) return statusDiff;
  const scoreDiff = bReview.userScore - aReview.userScore;
  if (scoreDiff !== 0) return scoreDiff;
  return b.fitScore - a.fitScore;
});

const antiRepetitionCandidates = sortedCandidates.filter((candidate) =>
  antiRepetitionCandidateIds.has(candidate.id),
);
const latestDiversificationCandidates = sortedCandidates.filter((candidate) =>
  latestDiversificationCandidateIds.has(candidate.id),
);
const creatorSourceBreadthCandidates = sortedCandidates.filter((candidate) =>
  creatorSourceBreadthCandidateIds.has(candidate.id),
);

const userDraftReviewNotes: Record<string, { score: string; note: string; uiShape: string }> = {
  'washer-tub-clean-monthly': {
    score: '4.0',
    note:
      '매월 1회 루틴 하나로 묶고 나머지는 내부 체크리스트로 두면 판단 가능하다. 다만 AI가 만든 콘텐츠처럼 보이면 사용자가 따라할 이유가 약하다.',
    uiShape:
      '캘린더에는 세탁기 통세척 1개 루틴만 보이고, 상세에는 준비물·세척 방법·영상/구매 링크를 메모로 둔다.',
  },
  'lg-aircon-filter-biweekly': {
    score: '4.5',
    note:
      '2주 청소와 6개월 교체가 섞이면 여러 루틴 조합 UX를 봐야 한다. 그냥 자가 관리 루틴 묶음으로 보이면 복잡해질 수 있다.',
    uiShape:
      '대표 루틴은 필터 청소로 두고, 6개월 교체는 같은 Flow 안의 별도 일정 또는 상세 체크로 낮춘다.',
  },
  'picture-book-reading-routine': {
    score: '4.0',
    note:
      '여러 루틴이 붙는 구조다. 각 루틴마다 체크리스트가 붙으면 괜찮지만 UI가 뭉개지면 평가하기 어렵다.',
    uiShape:
      '오늘 루틴에는 읽기 1개만 표시하고, 상세에 질문 카드·준비 방법·링크를 붙인다.',
  },
  'water-purifier-filter-cycle': {
    score: '4.5',
    note: '메모에 간단하고 구체적인 교체 방법이 있으면 충분하다.',
    uiShape: '교체 주기 일정 + 상세 메모/링크 중심. 사진이나 증빙은 기본값에서 제외한다.',
  },
  'monstera-watering-routine': {
    score: '확인 중',
    note: '식물 관리는 주제 자체는 맞다. 물주기 루틴 하나와 관찰 체크가 결합되는지 확인이 필요하다.',
    uiShape: '물주기 루틴 + 잎/흙 관찰 체크 2~3개 + 사진/영상 링크 정도로 제한한다.',
  },
};

const htmlList = (items: string[]) =>
  `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;

const renderFlowItems = (candidate: KoreanFlowContentCandidate) =>
  candidate.flowItems
    .map(
      (item, index) => `
        <li class="flow-item">
          <div class="flow-item-head">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <strong>${escapeHtml(item.title)}</strong>
          </div>
          <dl>
            <div><dt>일정/반복</dt><dd>${escapeHtml(item.schedule)}</dd></div>
            <div><dt>메모</dt><dd>${escapeHtml(item.memo)}</dd></div>
            <div><dt>완료 기준</dt><dd>${escapeHtml(item.completion)}</dd></div>
          </dl>
        </li>
      `,
    )
    .join('');

const renderCheckRows = (items: string[]) =>
  items
    .map(
      (item) => `
        <label class="mock-check-row">
          <input type="checkbox" />
          <span>${escapeHtml(item)}</span>
        </label>
      `,
    )
    .join('');

const renderUserDraftReview = (candidate: KoreanFlowContentCandidate) => {
  const note = userDraftReviewNotes[candidate.id];
  if (!note) return '';

  return `
    <section class="block user-draft-review">
      <div>
        <span>수동 확인 중 메모</span>
        <strong>${escapeHtml(note.score)}점</strong>
      </div>
      <p>${escapeHtml(note.note)}</p>
      <p class="shape">${escapeHtml(note.uiShape)}</p>
    </section>
  `;
};

const detailChecksFor = (candidate: KoreanFlowContentCandidate, item: KoreanFlowContentCandidate['flowItems'][number]) => {
  if (candidate.destination === 'sheet') {
    return ['표 행 추가/수정', item.completion, '다음 확인일 저장'];
  }

  if (candidate.structure === 'checklist') {
    return [item.title, item.completion, '보류/완료 상태 선택'];
  }

  if (candidate.structure === 'timeline') {
    return [item.title, item.completion, '날짜 변경 시 관련 일정 확인'];
  }

  if (candidate.structure === 'challenge') {
    return [item.title, '오늘 프롬프트/영상/과제 확인', item.completion];
  }

  return [item.title, item.completion, '반복 주기 유지/변경'];
};

const renderFlowUiMock = (candidate: KoreanFlowContentCandidate) => {
  const pattern = patternFor(candidate);
  const review = reviewFor(candidate);
  const primaryItem = candidate.flowItems[0];
  const secondaryItem = candidate.flowItems[1] ?? primaryItem;
  const tertiaryItem = candidate.flowItems[2] ?? secondaryItem;
  const destination = destinationLabel[candidate.destination];
  const rows = candidate.flowItems
    .map(
      (item, index) => `
        <button class="mock-exec-row ${index === 0 ? 'selected' : ''}" type="button">
          <span>${escapeHtml(item.schedule)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <em>${escapeHtml(item.completion)}</em>
        </button>
      `,
    )
    .join('');

  return `
    <section class="block flow-ui-mock">
      <h3>FlowMe UI로 보면</h3>
      <div class="flow-review-lab">
        <div class="lab-toolbar">
          <span>원문 확인</span>
          <span>저장 설정</span>
          <span>My Flow 실행</span>
          <span>상세 sheet</span>
        </div>
        <div class="lab-surface">
          <section class="lab-source">
            <small>원문에서 따라할 행동</small>
            <strong>${escapeHtml(candidate.sourceTitle)}</strong>
            <p>${escapeHtml(candidate.sourceSignal)}</p>
            <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a>
          </section>
          <section class="lab-save">
            <small>내 캘린더에 저장하기</small>
            <h4>${escapeHtml(candidate.title)}</h4>
            <div class="lab-fields">
              ${candidate.inputs
                .slice(0, 4)
                .map((input, index) => `<label><span>${escapeHtml(input)}</span><b>${index === 0 ? '사용자 입력' : '기본값'}</b></label>`)
                .join('')}
            </div>
            <button type="button">${escapeHtml(candidate.cta)}</button>
          </section>
          <section class="lab-myflow">
            <small>My Flow에서 보이는 형태</small>
            <nav class="lab-tabs" aria-label="My Flow preview links"><a class="active" href="#execution-preview">오늘</a><a href="#calendar-preview">캘린더</a><a href="#flow-summary">Flow</a><a href="#checklist-preview">체크</a></nav>
            <button class="lab-row active" type="button"><em>${escapeHtml(primaryItem.schedule)}</em><strong>${escapeHtml(primaryItem.title)}</strong></button>
            <button class="lab-row" type="button"><em>${escapeHtml(secondaryItem.schedule)}</em><strong>${escapeHtml(secondaryItem.title)}</strong></button>
            <button class="lab-row" type="button"><em>${escapeHtml(tertiaryItem.schedule)}</em><strong>${escapeHtml(tertiaryItem.title)}</strong></button>
          </section>
          <section class="lab-detail">
            <small>항목 상세</small>
            <h4>${escapeHtml(primaryItem.title)}</h4>
            <dl>
              <div><dt>날짜/반복</dt><dd>${escapeHtml(primaryItem.schedule)}</dd></div>
              <div><dt>메모</dt><dd>${escapeHtml(primaryItem.memo)}</dd></div>
              <div><dt>완료 기준</dt><dd>${escapeHtml(primaryItem.completion)}</dd></div>
            </dl>
            <div class="lab-actions"><button type="button">완료 체크</button><button type="button">메모 수정</button></div>
          </section>
        </div>
      </div>
      <div class="mock-grid">
        <div class="mock-card source">
          <span class="mock-label">원문 실행 단서</span>
          <h4>${escapeHtml(candidate.sourceTitle)}</h4>
          <p>${escapeHtml(candidate.sourceSignal)}</p>
          <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a>
        </div>

        <div class="mock-card save">
          <span class="mock-label">저장 화면</span>
          <h4>${escapeHtml(candidate.title)}</h4>
          <div class="mock-fields">
            ${candidate.inputs
              .map(
                (input, index) => `
                  <label>
                    <span>${escapeHtml(input)}</span>
                    <input value="${index === 0 ? '사용자 선택' : '기본값'}" readonly />
                  </label>
                `,
              )
              .join('')}
          </div>
          <button type="button">${escapeHtml(candidate.cta)}</button>
        </div>

        <div class="mock-card list">
          <span class="mock-label">My Flow 실행 목록</span>
          <div class="mock-exec-list">${rows}</div>
        </div>

        <div class="mock-card detail">
          <span class="mock-label">상세 편집</span>
          <h4>${escapeHtml(primaryItem.title)}</h4>
          <div class="mock-pills">
            <span>${escapeHtml(primaryItem.schedule)}</span>
            <span>${escapeHtml(pattern.title)}</span>
            <span>${escapeHtml(destination)}</span>
          </div>
          <div class="mock-checks">${renderCheckRows(detailChecksFor(candidate, primaryItem))}</div>
          <label class="mock-memo">
            <span>메모</span>
            <textarea readonly>${escapeHtml(primaryItem.memo)}

완료 기준: ${escapeHtml(primaryItem.completion)}
원문: ${escapeHtml(candidate.sourceUrl)}</textarea>
          </label>
          <div class="mock-actions">
            <button type="button">완료 체크</button>
            <button type="button" class="secondary">날짜/반복 수정</button>
          </div>
        </div>

        <div class="mock-card export">
          <span class="mock-label">외부 도구로 보내면</span>
          <strong>${escapeHtml(primaryItem.title)}</strong>
          <p>${escapeHtml(review.uxAction)}</p>
          <div class="mock-export-lines">
            <span>${escapeHtml(primaryItem.schedule)} · ${escapeHtml(primaryItem.title)}</span>
            <span>${escapeHtml(secondaryItem.schedule)} · ${escapeHtml(secondaryItem.title)}</span>
            <span>${escapeHtml(tertiaryItem.schedule)} · ${escapeHtml(tertiaryItem.title)}</span>
          </div>
        </div>
      </div>
    </section>
  `;
};

const renderUxPreview = (candidate: KoreanFlowContentCandidate) => {
  const pattern = patternFor(candidate);
  const primaryItem = candidate.flowItems[0];
  const secondaryItem = candidate.flowItems[1] ?? primaryItem;
  const tertiaryItem = candidate.flowItems[2] ?? secondaryItem;

  const destination = destinationLabel[candidate.destination];
  const saveLabel =
    candidate.destination === 'sheet'
      ? '표로 저장'
      : candidate.structure === 'timeline'
        ? '일정으로 저장'
        : candidate.destination === 'checklist'
          ? '체크리스트로 저장'
          : '내 캘린더에 저장';

  return `
    <aside class="ux-preview" aria-label="${escapeHtml(candidate.title)} UX 적용 미리보기">
      <div class="phone">
        <div class="phone-top">
          <span>${escapeHtml(pattern.title)}</span>
          <strong>${escapeHtml(destination)}</strong>
        </div>
        <section class="save-panel">
          <p class="small-label">저장 화면</p>
          <h4>${escapeHtml(candidate.title)}</h4>
          <div class="input-grid">
            ${candidate.inputs.map((input) => `<span>${escapeHtml(input)}</span>`).join('')}
          </div>
          <button>${escapeHtml(saveLabel)}</button>
        </section>
        <section class="calendar-panel">
          <p class="small-label">My Flow 적용</p>
          <div class="mini-row active">
            <span>${candidate.structure === 'timeline' ? 'D-30' : '오늘'}</span>
            <strong>${escapeHtml(primaryItem.title)}</strong>
          </div>
          <div class="mini-row">
            <span>${candidate.structure === 'single_routine' ? '반복' : '다음'}</span>
            <strong>${escapeHtml(secondaryItem.title)}</strong>
          </div>
          <div class="mini-row">
            <span>${candidate.destination === 'sheet' ? '표' : '메모'}</span>
            <strong>${escapeHtml(tertiaryItem.title)}</strong>
          </div>
        </section>
        <section class="detail-panel">
          <p class="small-label">상세 sheet</p>
          <h4>${escapeHtml(primaryItem.title)}</h4>
          <p>${escapeHtml(primaryItem.memo)}</p>
          <div class="done-rule">${escapeHtml(primaryItem.completion)}</div>
          <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a>
        </section>
      </div>
    </aside>
  `;
};

const renderCandidate = (candidate: KoreanFlowContentCandidate, index: number) => {
  const pattern = patternFor(candidate);
  const review = reviewFor(candidate);
  const sourceRefresh = koreanFlowContentSourceRefreshById.get(candidate.id);
  const isRepresentative = representativeKoreanFlowContentIds.includes(candidate.id);
  return `
    <article class="candidate${isRepresentative ? ' representative' : ''}" id="${escapeHtml(candidate.id)}">
      <header class="candidate-head">
        <div>
          <div class="tag-row">
            <span class="tag index">#${index + 1}</span>
            <span class="tag">${escapeHtml(candidate.category)}</span>
            <span class="tag">${escapeHtml(pattern.title)}</span>
            <span class="tag green">${escapeHtml(reviewStatusLabel[review.status])}</span>
            <span class="tag ${review.sourceQuality === 'usable_but_ai_like' || review.sourceQuality === 'too_broad' ? 'amber' : ''}">${escapeHtml(sourceQualityLabel[review.sourceQuality])}</span>
          </div>
          <h2>${escapeHtml(candidate.title)}</h2>
          <p>${escapeHtml(candidate.userNeed)}</p>
        </div>
        <div class="score"><span>사용자 점수</span><strong>${review.userScore.toFixed(1)}</strong></div>
      </header>

      <div class="candidate-body">
        <div class="content-col">
          <section class="block source-block">
            <h3>원문 컨텐츠</h3>
            <dl class="source-dl">
              <div>
                <dt>원문 링크</dt>
                <dd><a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.sourceTitle)}</a></dd>
              </div>
              <div>
                <dt>출처 성격</dt>
                <dd>${escapeHtml(sourceTypeLabel[candidate.sourceType])}</dd>
              </div>
              <div>
                <dt>원문 내용 요약</dt>
                <dd>${escapeHtml(candidate.sourceSignal)}</dd>
              </div>
              <div>
                <dt>사용자가 찾는 이유</dt>
                <dd>${escapeHtml(candidate.demandSignal)}</dd>
              </div>
            </dl>
            ${
              sourceRefresh
                ? `<div class="source-refresh">
                    <strong>원문 재확인 반영</strong>
                    <p>${escapeHtml(sourceRefresh.decision === 'kept_with_hold' ? '실제 원문은 확인했지만 대표 후보로 올리기에는 적합도가 낮아 보류 유지.' : '기존 AI 느낌/범위 과다/원문 불명확 문제를 실제 원문 기준으로 재작성.')}</p>
                    <span>${escapeHtml(sourceRefresh.refreshedAt)} 재확인 · ${escapeHtml(sourceQualityLabel[sourceRefresh.sourceQuality])}</span>
                  </div>`
                : ''
            }
          </section>

          <section class="block">
            <h3>Flow 컨텐츠 변환</h3>
            <div class="conversion-grid">
              <div><span>목적지</span><strong>${escapeHtml(destinationLabel[candidate.destination])}</strong></div>
              <div><span>구조</span><strong>${escapeHtml(candidate.structure)}</strong></div>
              <div><span>저장 CTA</span><strong>${escapeHtml(candidate.cta)}</strong></div>
            </div>
            <h4>사용자 입력</h4>
            ${htmlList(candidate.inputs)}
            <h4>실행 항목</h4>
            <ol class="flow-list">${renderFlowItems(candidate)}</ol>
          </section>

          ${renderUserDraftReview(candidate)}

          ${renderFlowUiMock(candidate)}

          <section class="block">
            <h3>UX 적용 판단</h3>
            <div class="review-grid">
              <div>
                <h4>UX 디자이너 관점</h4>
                <p>${escapeHtml(candidate.uxNote)}</p>
              </div>
              <div>
                <h4>사용자 관점</h4>
                <p>${escapeHtml(review.uxAction)}</p>
              </div>
            </div>
            <div class="user-review">
              <strong>사용자 검토 반영</strong>
              <p>${escapeHtml(review.conversionNote)}</p>
              ${review.sourceIssue ? `<p class="issue">${escapeHtml(review.sourceIssue)}</p>` : ''}
            </div>
            <div class="boundary">
              <strong>출처/주의 분리</strong>
              <p>${escapeHtml(candidate.sourceBoundary)}</p>
            </div>
            ${
              sourceRefresh
                ? `<div class="simulation">
                    <strong>Flow 시뮬레이션</strong>
                    <dl>
                      <div><dt>캘린더</dt><dd>${escapeHtml(sourceRefresh.simulation.calendar)}</dd></div>
                      <div><dt>상세</dt><dd>${escapeHtml(sourceRefresh.simulation.detail)}</dd></div>
                      <div><dt>Export 메모</dt><dd>${escapeHtml(sourceRefresh.simulation.exportMemo)}</dd></div>
                      <div><dt>실패 신호</dt><dd>${escapeHtml(sourceRefresh.simulation.failureSignal)}</dd></div>
                      <div><dt>판정</dt><dd>${escapeHtml(sourceRefresh.simulation.verdict)}</dd></div>
                    </dl>
                  </div>`
                : ''
            }
          </section>
        </div>

        ${renderUxPreview(candidate)}
      </div>
    </article>
  `;
};

const renderStandalonePreview = (candidate: KoreanFlowContentCandidate) => {
  const review = reviewFor(candidate);
  const pattern = patternFor(candidate);
  const note = userDraftReviewNotes[candidate.id];
  const sourceRefresh = koreanFlowContentSourceRefreshById.get(candidate.id);
  const firstItem = candidate.flowItems[0];
  const calendarCells = candidate.flowItems
    .slice(0, 12)
    .map(
      (item, index) => `
        <div class="cal-cell ${index === 0 ? 'active' : ''}">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.schedule)}</small>
        </div>
      `,
    )
    .join('');
  const checklistRows = candidate.flowItems
    .map(
      (item, index) => `
        <label class="task-row">
          <input type="checkbox" />
          <span>${index + 1}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <em>${escapeHtml(item.completion)}</em>
        </label>
      `,
    )
    .join('');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(candidate.title)} — Flow 프리뷰</title>
  <style>
    :root {
      --bg: #f6f8fb;
      --panel: #fff;
      --ink: #0f172a;
      --muted: #526071;
      --line: #dbe3ee;
      --blue: #2563eb;
      --blue-soft: #eff6ff;
      --green: #047857;
      --green-soft: #ecfdf5;
      --amber: #b45309;
      --amber-soft: #fffbeb;
      --purple-soft: #faf5ff;
      --purple-line: #c4b5fd;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.55;
      letter-spacing: 0;
    }
    a { color: var(--blue); text-decoration: none; font-weight: 800; }
    .page { max-width: 1160px; margin: 0 auto; padding: 28px 18px 72px; }
    .top-link { display: inline-flex; margin-bottom: 18px; color: #475569; font-size: 13px; }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: 22px;
      align-items: end;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--line);
    }
    .kicker { color: #475569; font-size: 14px; }
    h1 { margin: 8px 0 10px; font-size: clamp(36px, 7vw, 64px); line-height: 1.02; }
    .lead { margin: 0; max-width: 760px; color: #334155; font-size: 17px; }
    .pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
    .pill {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fff;
      padding: 7px 11px;
      color: #334155;
      font-size: 13px;
      font-weight: 850;
    }
    .pill.good { border-color: #bbf7d0; background: var(--green-soft); color: var(--green); }
    .score-card {
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      background: #fff;
      padding: 16px;
      box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
    }
    .score-card span { display: block; color: var(--muted); font-size: 12px; font-weight: 800; }
    .score-card strong { display: block; margin-top: 4px; font-size: 42px; line-height: 1; }
    .score-card p { margin: 10px 0 0; color: #334155; font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 18px;
      margin-top: 24px;
      align-items: start;
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 16px;
      box-shadow: 0 12px 26px rgba(15, 23, 42, 0.05);
    }
    .panel + .panel { margin-top: 14px; }
    .panel h2 { margin: 0 0 8px; font-size: 24px; line-height: 1.2; }
    .panel h3 { margin: 0 0 8px; font-size: 17px; }
    .panel p { margin: 7px 0 0; color: #334155; }
    .source-card { border-left: 4px solid #64748b; }
    .input-card { border-left: 4px solid var(--blue); }
    .input-list { display: grid; gap: 8px; margin-top: 12px; }
    .input-list label {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 130px;
      gap: 10px;
      align-items: center;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      padding: 10px;
    }
    .input-list span { color: #475569; font-size: 13px; font-weight: 850; }
    .input-list b {
      border-radius: 7px;
      background: #fff;
      color: var(--blue);
      padding: 7px 8px;
      text-align: center;
      font-size: 12px;
    }
    .primary-btn {
      width: 100%;
      border: 0;
      border-radius: 8px;
      background: var(--blue);
      color: #fff;
      padding: 13px 16px;
      margin-top: 12px;
      font: inherit;
      font-weight: 900;
    }
    .board-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 14px 0; }
    .board-tabs span,
    .board-tabs a { border-radius: 8px; background: #f1f5f9; padding: 8px 4px; text-align: center; color: #64748b; font-size: 12px; font-weight: 900; text-decoration: none; }
    .board-tabs .active { background: var(--blue); color: #fff; }
    .progress { display: inline-flex; border-radius: 999px; background: #f1f5f9; padding: 6px 10px; color: #334155; font-size: 12px; font-weight: 900; }
    .task-list { display: grid; gap: 8px; margin-top: 14px; }
    .task-row {
      display: grid;
      grid-template-columns: 20px 28px minmax(0, 1fr);
      gap: 8px;
      align-items: start;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      padding: 10px;
    }
    .task-row span { color: var(--blue); font-size: 12px; font-weight: 900; }
    .task-row strong { font-size: 14px; line-height: 1.35; }
    .task-row em { grid-column: 3; color: #64748b; font-size: 12px; font-style: normal; }
    .calendar-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
    .cal-cell {
      min-height: 92px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      padding: 9px;
    }
    .cal-cell.active { border-color: #60a5fa; background: #eff6ff; }
    .cal-cell span { display: block; color: #64748b; font-size: 11px; font-weight: 900; }
    .cal-cell strong { display: block; margin-top: 8px; font-size: 13px; line-height: 1.3; }
    .cal-cell small { display: block; margin-top: 6px; color: #64748b; font-size: 11px; }
    .detail {
      border-color: var(--purple-line);
      background: var(--purple-soft);
    }
    .detail dl { display: grid; gap: 9px; margin: 10px 0 0; }
    .detail dl div { display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 8px; }
    .detail dt { color: #6b21a8; font-size: 12px; font-weight: 900; }
    .detail dd { margin: 0; color: #334155; font-size: 14px; overflow-wrap: anywhere; }
    .detail dd a { font-weight: 900; }
    .actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
    .actions button { border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #334155; padding: 10px; font: inherit; font-weight: 900; }
    .actions button:first-child { border-color: var(--blue); background: var(--blue); color: #fff; }
    .export-lines { display: grid; gap: 7px; margin-top: 10px; }
    .export-lines span { border: 1px solid #fde68a; border-radius: 8px; background: #fff; padding: 9px; color: #334155; font-size: 13px; }
    .side { position: sticky; top: 18px; }
    .note-card { background: var(--amber-soft); border-color: #fcd34d; }
    .note-card strong { display: block; color: #92400e; }
    .note-card p { color: #78350f; font-size: 13px; }
    .boundary { background: #f8fafc; }
    .rubric { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .rubric div { border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; padding: 10px; }
    .rubric span { display: block; color: #64748b; font-size: 11px; font-weight: 900; }
    .rubric strong { display: block; margin-top: 3px; font-size: 20px; }
    @media (max-width: 840px) {
      .page { padding: 18px 10px 56px; }
      .hero, .grid { grid-template-columns: 1fr; }
      h1 { font-size: 40px; }
      .side { position: static; }
      .calendar-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .input-list label, .detail dl div, .task-row { grid-template-columns: 1fr; }
      .task-row em { grid-column: auto; }
    }
  </style>
</head>
<body>
  <main class="page">
    <a class="top-link" href="../2026-06-02-flow-content-ux-candidates.html#candidate-preview-index">← 후보 인덱스로 돌아가기</a>
    <section class="hero">
      <div>
        <div class="kicker">${escapeHtml(candidate.category)} · ${escapeHtml(sourceTypeLabel[candidate.sourceType])}</div>
        <h1>${escapeHtml(candidate.title)}</h1>
        <p class="lead">${escapeHtml(candidate.userNeed)}</p>
        <div class="pill-row">
          <span class="pill">${escapeHtml(destinationLabel[candidate.destination])}</span>
          <span class="pill">${escapeHtml(pattern.title)}</span>
          <span class="pill good">출처 확인 필요</span>
        </div>
      </div>
      <aside class="score-card">
        <span>사용자 검토 점수</span>
        <strong>${review.userScore.toFixed(1)}</strong>
        <p>${escapeHtml(reviewStatusLabel[review.status])} · ${escapeHtml(sourceQualityLabel[review.sourceQuality])}</p>
      </aside>
    </section>

    <div class="grid">
      <div>
        <section class="panel source-card">
          <h2>원문에서 따라할 행동</h2>
          <p><strong>${escapeHtml(candidate.sourceTitle)}</strong></p>
          <p>${escapeHtml(candidate.sourceSignal)}</p>
          <p><a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기 ↗</a></p>
        </section>

        <section class="panel input-card" id="save-preview">
          <h2>저장 화면</h2>
          <p>${escapeHtml(candidate.cta)}</p>
          <div class="input-list">
            ${candidate.inputs
              .map((input, index) => `<label><span>${escapeHtml(input)}</span><b>${index === 0 ? '사용자 입력' : '기본값'}</b></label>`)
              .join('')}
          </div>
          <button class="primary-btn" type="button">${escapeHtml(candidate.cta)}</button>
        </section>

        <section class="panel" id="calendar-preview">
          <h2>내 실행판</h2>
          <p>이 Flow를 저장하면 My Flow에서 보게 될 실행 형태입니다.</p>
          <nav class="board-tabs" aria-label="My Flow preview links"><a class="active" href="#execution-preview">오늘</a><a href="#calendar-preview">캘린더</a><a href="#flow-summary">Flow</a><a href="#checklist-preview">체크</a></nav>
          <span class="progress">0/${candidate.flowItems.length} 완료</span>
          ${candidate.destination === 'calendar' || candidate.destination === 'routine' || candidate.structure === 'timeline'
            ? `<div class="calendar-grid">${calendarCells}</div>`
            : `<div class="task-list">${checklistRows}</div>`}
        </section>

        <section class="panel detail" id="checklist-preview">
          <h2>상세 sheet</h2>
          <h3>${escapeHtml(firstItem.title)}</h3>
          <dl>
            <div><dt>날짜/반복</dt><dd>${escapeHtml(firstItem.schedule)}</dd></div>
            <div><dt>메모</dt><dd>${escapeHtml(firstItem.memo)}</dd></div>
            <div><dt>완료 기준</dt><dd>${escapeHtml(firstItem.completion)}</dd></div>
            <div><dt>원문 링크</dt><dd><a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.sourceTitle)}</a></dd></div>
          </dl>
          <div class="actions"><button type="button">완료 체크</button><button type="button">메모 수정</button></div>
        </section>

        <section class="panel">
          <h2>Export 미리보기</h2>
          <p>캘린더, 체크리스트, 시트로 옮겨졌을 때 남아야 할 핵심 행입니다.</p>
          <div class="export-lines">
            ${candidate.flowItems
              .slice(0, 6)
              .map((item) => `<span>${escapeHtml(item.schedule)} · ${escapeHtml(item.title)} · ${escapeHtml(item.completion)}</span>`)
              .join('')}
          </div>
        </section>
      </div>

      <aside class="side">
        ${note
          ? `<section class="panel note-card"><strong>수동 확인 중 메모 · ${escapeHtml(note.score)}점</strong><p>${escapeHtml(note.note)}</p><p>${escapeHtml(note.uiShape)}</p></section>`
          : ''}
        <section class="panel boundary">
          <h2>UX 판단</h2>
          <p>${escapeHtml(candidate.uxNote)}</p>
          <p>${escapeHtml(review.uxAction)}</p>
        </section>
        <section class="panel boundary">
          <h2>출처/주의 분리</h2>
          <p>${escapeHtml(candidate.sourceBoundary)}</p>
          ${review.sourceIssue ? `<p>${escapeHtml(review.sourceIssue)}</p>` : ''}
          ${sourceRefresh ? `<p>${escapeHtml(sourceRefresh.simulation.verdict)}</p>` : ''}
        </section>
        <section class="panel">
          <h2>평가 점수</h2>
          <div class="rubric">
            <div><span>사용자</span><strong>${review.userScore.toFixed(1)}</strong></div>
            <div><span>원문 적합</span><strong>${candidate.fitScore.toFixed(1)}</strong></div>
            <div><span>구조</span><strong>${escapeHtml(candidate.structure)}</strong></div>
            <div><span>목적지</span><strong>${escapeHtml(destinationLabel[candidate.destination])}</strong></div>
          </div>
        </section>
      </aside>
    </div>
  </main>
</body>
</html>`;
};

const renderAppLikeStandalonePreview = (candidate: KoreanFlowContentCandidate) => {
  const review = reviewFor(candidate);
  const pattern = patternFor(candidate);
  const traceStrength = traceStrengthFor(candidate);
  const note = userDraftReviewNotes[candidate.id];
  const sourceRefresh = koreanFlowContentSourceRefreshById.get(candidate.id);
  const primaryItem = candidate.flowItems[0];
  const total = candidate.flowItems.length;
  const previewDone = Math.min(1, Math.max(0, Math.floor(total / 5)));
  const progress = Math.round((previewDone / Math.max(total, 1)) * 100);
  const shownItems = candidate.flowItems.slice(0, 7);
  const exportItems = candidate.flowItems.slice(0, 4);
  const isCalendarLike =
    candidate.destination === 'calendar' ||
    candidate.destination === 'routine' ||
    candidate.structure === 'timeline' ||
    candidate.structure === 'challenge';
  const isStudyLike =
    candidate.category.includes('공부') ||
    candidate.category.includes('자격증') ||
    candidate.title.includes('공부') ||
    candidate.title.includes('컴활') ||
    candidate.title.includes('코딩');
  const isRoutineLike = candidate.destination === 'routine' || candidate.structure === 'single_routine';
  const isChallengeLike = candidate.structure === 'challenge' || candidate.title.includes('30일');
  const isTablePlanLike = candidate.structure === 'table_plan' || candidate.destination === 'sheet';
  const isDecisionLike =
    candidate.structure === 'checklist' &&
    candidate.title.includes('중고차');
  const isTimelineLike = candidate.structure === 'timeline' && !isStudyLike;
  const saveFields = candidate.inputs
    .map(
      (input, index) => `
        <label class="save-field">
          <span>${escapeHtml(input)}</span>
          <input value="${index === 0 ? '사용자 입력' : '기본값'}" readonly />
        </label>
      `,
    )
    .join('');
  const savePanelTitle =
    traceStrength === 'weak' ? '저장 보류' : traceStrength === 'needs_review' ? '조건부 저장 화면' : '저장 화면';
  const savePanelDescription =
    traceStrength === 'weak'
      ? '원문 교체 또는 후보 제외를 먼저 판단합니다.'
      : traceStrength === 'needs_review'
        ? '원문/범위/사용 조건을 확인한 뒤 저장 후보로 볼 수 있습니다.'
        : candidate.cta;
  const savePanelBody =
    traceStrength === 'weak'
      ? `<label class="save-field"><span>현재 상태</span><input value="저장 후보 아님" readonly /></label>`
      : saveFields;
  const savePanelButtonLabel =
    traceStrength === 'weak'
      ? '원문 교체 후 다시 검토'
      : traceStrength === 'needs_review'
        ? '조건 확인 후 저장 검토'
        : candidate.cta;
  const stageCards = shownItems
    .map(
      (item, index) => `
        <article class="stage-card ${index === 0 ? 'current' : ''}">
          <div class="stage-head">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <strong>${escapeHtml(item.schedule)}</strong>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.completion)}</p>
        </article>
      `,
    )
    .join('');
  const taskRows = shownItems
    .map(
      (item, index) => `
        <label class="task-card ${index === 0 ? 'active' : ''}">
          <input type="checkbox" ${index < previewDone ? 'checked' : ''} />
          <span class="task-date">${escapeHtml(item.schedule)}</span>
          <div class="task-main">
            <strong>${escapeHtml(item.title)}</strong>
            <em>${escapeHtml(item.completion)}</em>
          </div>
        </label>
      `,
    )
    .join('');
  const timelineRows = shownItems
    .map(
      (item, index) => `
        <label class="timeline-row ${index === 0 ? 'active' : ''}">
          <input type="checkbox" ${index < previewDone ? 'checked' : ''} />
          <span class="timeline-date">${escapeHtml(item.schedule)}</span>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.memo)}</p>
            <em>${escapeHtml(item.completion)}</em>
          </div>
        </label>
      `,
    )
    .join('');
  const studyRows = shownItems
    .map(
      (item, index) => `
        <label class="study-row ${index === 0 ? 'active' : ''}">
          <input type="checkbox" ${index < previewDone ? 'checked' : ''} />
          <div class="study-date">${escapeHtml(item.schedule)}</div>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.memo)}</p>
          </div>
          <em>${escapeHtml(item.completion)}</em>
        </label>
      `,
    )
    .join('');
  const challengeCells = shownItems
    .map(
      (item, index) => `
        <label class="challenge-cell ${index === 0 ? 'active' : ''}">
          <span>Day ${index + 1}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <input type="checkbox" ${index < previewDone ? 'checked' : ''} />
        </label>
      `,
    )
    .join('');
  const routineRows = shownItems
    .map(
      (item, index) => `
        <label class="routine-row ${index === 0 ? 'active' : ''}">
          <input type="checkbox" ${index < previewDone ? 'checked' : ''} />
          <span>${escapeHtml(item.schedule)}</span>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.completion)}</p>
          </div>
        </label>
      `,
    )
    .join('');
  const tableRows = shownItems
    .map(
      (item, index) => `
        <tr class="${index === 0 ? 'active' : ''}">
          <td><input type="checkbox" ${index < previewDone ? 'checked' : ''} /></td>
          <td><strong>${escapeHtml(item.schedule)}</strong></td>
          <td>
            <b>${escapeHtml(item.title)}</b>
            <p>${escapeHtml(item.memo)}</p>
          </td>
          <td><span>${escapeHtml(item.completion)}</span></td>
        </tr>
      `,
    )
    .join('');
  const tableCards = shownItems
    .map(
      (item, index) => `
        <label class="sheet-card-row ${index === 0 ? 'active' : ''}">
          <input type="checkbox" ${index < previewDone ? 'checked' : ''} />
          <div>
            <span>${escapeHtml(item.schedule)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.memo)}</p>
            <em>${escapeHtml(item.completion)}</em>
          </div>
        </label>
      `,
    )
    .join('');
  const decisionRows = shownItems
    .map(
      (item, index) => `
        <label class="decision-row ${index === 0 ? 'active' : ''}">
          <input type="checkbox" ${index < previewDone ? 'checked' : ''} />
          <div>
            <span>${escapeHtml(item.schedule)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.memo)}</p>
          </div>
          <em>${escapeHtml(item.completion)}</em>
        </label>
      `,
    )
    .join('');
  const executionBoard = isStudyLike
    ? `<div class="study-board" id="calendar-preview">
        <div class="study-summary">
          <div><span>시험 기준</span><strong>${escapeHtml(candidate.inputs[0] ?? '시험일')}</strong></div>
          <div><span>오늘 목표</span><strong>${escapeHtml(primaryItem.title)}</strong></div>
          <div><span>완료 조건</span><strong>${escapeHtml(primaryItem.completion)}</strong></div>
        </div>
        <div class="study-list">${studyRows}</div>
      </div>`
      : isChallengeLike
        ? `<div class="challenge-board" id="calendar-preview">${challengeCells}</div>`
        : isTablePlanLike
          ? `<div class="sheet-board" id="calendar-preview">
              <div class="sheet-toolbar">
                <strong>${escapeHtml(candidate.title)}</strong>
                <span>시트/표 보기</span>
              </div>
              <table>
                <thead><tr><th></th><th>주기</th><th>항목</th><th>완료 기준</th></tr></thead>
                <tbody>${tableRows}</tbody>
              </table>
              <div class="sheet-mobile-list">${tableCards}</div>
            </div>`
          : isDecisionLike
            ? `<div class="decision-board" id="calendar-preview">
                <div class="decision-actions">
                  <button type="button">구매</button>
                  <button type="button">보류</button>
                  <button type="button">거절</button>
                </div>
                <div class="decision-list">${decisionRows}</div>
              </div>`
            : isRoutineLike
        ? `<div class="routine-board" id="calendar-preview">
            <div class="routine-cadence">
              <span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span>
            </div>
            <div class="routine-list">${routineRows}</div>
          </div>`
        : isTimelineLike
          ? `<div class="timeline-board" id="calendar-preview">${timelineRows}</div>`
          : `<div class="task-list" id="calendar-preview">${taskRows}</div>`;
  const executionLabel = isStudyLike
    ? '공부 플랜'
    : isChallengeLike
      ? '챌린지 보기'
      : isTablePlanLike
        ? '시트 보기'
        : isDecisionLike
          ? '결정 보기'
      : isRoutineLike
        ? '루틴 보기'
        : isTimelineLike
          ? '타임라인 보기'
          : isCalendarLike
            ? '캘린더 보기'
            : '체크 보기';
  const exportRows = exportItems
    .map(
      (item) => `
        <li>
          <span>${escapeHtml(item.schedule)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.completion)}</p>
        </li>
      `,
    )
    .join('');
  const sourceTraceRows = exportItems
    .map(
      (item, index) => `
        <li>
          <div>
            <span>원문 단서</span>
            <p>${escapeHtml(index === 0 ? `${candidate.sourceSignal} ${item.memo}` : item.memo)}</p>
          </div>
          <div>
            <span>Flow에서 확인</span>
            <p>${escapeHtml(item.schedule)} · ${escapeHtml(item.title)} · 완료 기준: ${escapeHtml(item.completion)}</p>
          </div>
        </li>
      `,
    )
    .join('');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(candidate.title)} - Flow 프리뷰</title>
  <style>
    :root {
      --bg: #fafaf8;
      --surface: #fff;
      --soft: #f5f7fb;
      --ink: #111827;
      --muted: #667085;
      --line: #e5e7eb;
      --line-strong: #cbd5e1;
      --blue: #2563eb;
      --blue-dark: #1e40af;
      --blue-soft: #eff6ff;
      --green: #047857;
      --green-soft: #ecfdf5;
      --amber: #b45309;
      --amber-soft: #fffbeb;
      --red: #b91c1c;
      --shadow: 0 18px 48px rgba(15, 23, 42, 0.09);
    }
    * { box-sizing: border-box; }
    html { background: var(--bg); }
    body {
      margin: 0;
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
      letter-spacing: 0;
    }
    a { color: var(--blue); text-decoration: none; font-weight: 800; }
    button, input, textarea { font: inherit; }
    .app {
      min-height: 100vh;
      padding-bottom: 92px;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 1px solid var(--line);
      background: rgba(250, 250, 248, 0.94);
      backdrop-filter: blur(16px);
    }
    .topbar-inner {
      max-width: 1120px;
      margin: 0 auto;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .back {
      color: #475467;
      font-size: 13px;
      font-weight: 800;
    }
    .top-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .ghost-btn,
    .solid-btn {
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      background: #fff;
      color: #344054;
      padding: 9px 12px;
      font-size: 13px;
      font-weight: 850;
      cursor: default;
    }
    .solid-btn {
      border-color: var(--blue);
      background: var(--blue);
      color: #fff;
    }
    .page {
      max-width: 1120px;
      margin: 0 auto;
      padding: 26px 18px 40px;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 18px;
      align-items: stretch;
    }
    .hero-main,
    .hero-score,
    .panel {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .hero-main {
      padding: 22px;
    }
    .source-line {
      margin: 0 0 10px;
      color: #475467;
      font-size: 13px;
      font-weight: 800;
    }
    h1 {
      margin: 0;
      max-width: 780px;
      font-size: clamp(32px, 5.4vw, 58px);
      line-height: 1.04;
      letter-spacing: 0;
    }
    .lead {
      margin: 12px 0 0;
      max-width: 760px;
      color: #344054;
      font-size: 16px;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 18px;
    }
    .meta-row span {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fff;
      padding: 6px 10px;
      color: #344054;
      font-size: 12px;
      font-weight: 850;
    }
    .meta-row .ok {
      border-color: #bbf7d0;
      background: var(--green-soft);
      color: var(--green);
    }
    .hero-score {
      padding: 18px;
      display: grid;
      align-content: space-between;
      gap: 16px;
    }
    .score-number span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
    }
    .score-number strong {
      display: block;
      margin-top: 3px;
      font-size: 46px;
      line-height: 1;
    }
    .mini-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .mini-stats div {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--soft);
      padding: 10px;
    }
    .mini-stats span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 850;
    }
    .mini-stats strong {
      display: block;
      margin-top: 3px;
      font-size: 18px;
    }
    .workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 18px;
      margin-top: 18px;
      align-items: start;
    }
    .panel {
      padding: 18px;
    }
    .panel + .panel {
      margin-top: 14px;
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .panel h2 {
      margin: 0;
      font-size: 20px;
      line-height: 1.25;
    }
    .panel p {
      margin: 6px 0 0;
      color: #475467;
      font-size: 14px;
    }
    .source-card {
      border-left: 4px solid #64748b;
    }
    .source-card strong {
      display: block;
      font-size: 16px;
      line-height: 1.35;
    }
    .save-panel {
      border-left: 4px solid var(--blue);
    }
    .save-grid {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }
    .save-field {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 128px;
      gap: 10px;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: #f8fafc;
      padding: 9px;
    }
    .save-field span {
      color: #344054;
      font-size: 13px;
      font-weight: 850;
    }
    .save-field input {
      min-width: 0;
      border: 1px solid #eef2f7;
      border-radius: 7px;
      background: #fff;
      color: var(--blue);
      padding: 7px 8px;
      text-align: center;
      font-size: 12px;
      font-weight: 850;
    }
    .save-panel .solid-btn {
      width: 100%;
      margin-top: 12px;
      padding: 12px;
    }
    .progress-panel {
      border-color: #bfdbfe;
      background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
    }
    .progress-line {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
    }
    .bar {
      height: 9px;
      flex: 1;
      overflow: hidden;
      border-radius: 999px;
      background: #e5e7eb;
    }
    .bar span {
      display: block;
      width: ${progress}%;
      height: 100%;
      border-radius: inherit;
      background: var(--blue);
    }
    .progress-line strong {
      color: #344054;
      font-size: 13px;
      white-space: nowrap;
    }
    .tabs {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
      margin-top: 14px;
    }
    .tabs span,
    .tabs a {
      border-radius: 8px;
      background: #eef2f7;
      color: #667085;
      padding: 8px 4px;
      text-align: center;
      font-size: 12px;
      font-weight: 850;
      text-decoration: none;
    }
    .tabs .active {
      background: var(--blue);
      color: #fff;
    }
    .stages {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }
    .stage-card {
      min-height: 122px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }
    .stage-card.current {
      border-color: #93c5fd;
      background: var(--blue-soft);
    }
    .stage-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
    }
    .stage-card h3 {
      margin: 10px 0 0;
      font-size: 14px;
      line-height: 1.35;
    }
    .stage-card p {
      margin-top: 7px;
      font-size: 12px;
      line-height: 1.4;
    }
    .task-list {
      display: grid;
      gap: 9px;
      margin-top: 14px;
    }
    .task-card {
      display: grid;
      grid-template-columns: 20px 92px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }
    .task-card.active {
      border-color: #93c5fd;
      background: var(--blue-soft);
    }
    .task-card .task-date {
      color: var(--blue);
      font-size: 12px;
      font-weight: 900;
    }
    .task-main {
      min-width: 0;
    }
    .task-card strong {
      display: block;
      font-size: 15px;
      line-height: 1.35;
    }
    .task-card em {
      display: block;
      margin-top: 4px;
      color: #667085;
      font-size: 12px;
      font-style: normal;
    }
    .timeline-board,
    .study-list,
    .routine-list {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }
    .timeline-row {
      position: relative;
      display: grid;
      grid-template-columns: 20px 94px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      padding: 13px;
    }
    .timeline-row::before {
      content: "";
      position: absolute;
      left: 112px;
      top: 36px;
      bottom: -12px;
      width: 2px;
      background: #dbeafe;
    }
    .timeline-row:last-child::before {
      display: none;
    }
    .timeline-row.active {
      border-color: #93c5fd;
      background: var(--blue-soft);
    }
    .timeline-date {
      position: relative;
      z-index: 1;
      display: inline-flex;
      justify-content: center;
      border-radius: 999px;
      background: #fff;
      color: var(--blue);
      padding: 5px 8px;
      font-size: 12px;
      font-weight: 950;
      box-shadow: inset 0 0 0 1px #bfdbfe;
    }
    .timeline-row strong,
    .study-row strong,
    .routine-row strong {
      display: block;
      font-size: 15px;
      line-height: 1.35;
    }
    .timeline-row p,
    .study-row p,
    .routine-row p {
      margin-top: 4px;
      color: #667085;
      font-size: 12px;
      line-height: 1.45;
    }
    .timeline-row em,
    .study-row em {
      display: inline-flex;
      margin-top: 7px;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      padding: 4px 8px;
      font-size: 11px;
      font-style: normal;
      font-weight: 900;
    }
    .study-board {
      margin-top: 14px;
    }
    .study-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }
    .study-summary div {
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      background: #fff;
      padding: 10px;
    }
    .study-summary span {
      display: block;
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
    }
    .study-summary strong {
      display: block;
      margin-top: 4px;
      font-size: 13px;
      line-height: 1.35;
    }
    .study-row {
      display: grid;
      grid-template-columns: 20px 92px minmax(0, 1fr) 128px;
      gap: 10px;
      align-items: start;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }
    .study-row.active {
      border-color: #93c5fd;
      background: var(--blue-soft);
    }
    .study-date {
      color: var(--blue);
      font-size: 12px;
      font-weight: 950;
    }
    .routine-board {
      margin-top: 14px;
    }
    .routine-cadence {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 6px;
      margin-bottom: 12px;
    }
    .routine-cadence span {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fff;
      color: #475467;
      padding: 7px 4px;
      text-align: center;
      font-size: 12px;
      font-weight: 900;
    }
    .routine-cadence span:nth-child(2n) {
      border-color: #bbf7d0;
      background: var(--green-soft);
      color: var(--green);
    }
    .routine-row {
      display: grid;
      grid-template-columns: 20px 92px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }
    .routine-row.active {
      border-color: #93c5fd;
      background: var(--blue-soft);
    }
    .routine-row span {
      color: var(--green);
      font-size: 12px;
      font-weight: 950;
    }
    .challenge-board {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }
    .challenge-cell {
      min-height: 104px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 10px;
      display: grid;
      gap: 8px;
      align-content: start;
    }
    .challenge-cell.active {
      border-color: #93c5fd;
      background: var(--blue-soft);
    }
    .challenge-cell span {
      color: var(--blue);
      font-size: 11px;
      font-weight: 950;
    }
    .challenge-cell strong {
      font-size: 13px;
      line-height: 1.35;
    }
    .challenge-cell input {
      align-self: end;
    }
    .sheet-board {
      margin-top: 14px;
      overflow: hidden;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      background: #fff;
    }
    .sheet-toolbar {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid var(--line);
      background: #f8fbff;
      padding: 12px;
    }
    .sheet-toolbar strong {
      font-size: 14px;
      line-height: 1.35;
    }
    .sheet-toolbar span {
      color: var(--blue);
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }
    .sheet-board table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .sheet-board th,
    .sheet-board td {
      border-bottom: 1px solid #eef2f7;
      padding: 11px 10px;
      vertical-align: top;
      text-align: left;
    }
    .sheet-board th {
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
      background: #fff;
    }
    .sheet-board tr.active td {
      background: var(--blue-soft);
    }
    .sheet-board td:first-child {
      width: 34px;
    }
    .sheet-board td:nth-child(2) {
      width: 116px;
      color: var(--blue);
      font-weight: 900;
    }
    .sheet-board b {
      display: block;
      font-size: 14px;
      line-height: 1.35;
    }
    .sheet-board p {
      margin-top: 4px;
      color: #667085;
      font-size: 12px;
      line-height: 1.45;
    }
    .sheet-board td:last-child span {
      display: inline-flex;
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 900;
    }
    .sheet-mobile-list {
      display: none;
      gap: 9px;
      padding: 10px;
    }
    .sheet-card-row {
      display: grid;
      grid-template-columns: 20px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }
    .sheet-card-row.active {
      border-color: #93c5fd;
      background: var(--blue-soft);
    }
    .sheet-card-row span {
      color: var(--blue);
      font-size: 12px;
      font-weight: 950;
    }
    .sheet-card-row strong {
      display: block;
      margin-top: 3px;
      font-size: 14px;
      line-height: 1.35;
    }
    .sheet-card-row p {
      margin-top: 4px;
      color: #667085;
      font-size: 12px;
      line-height: 1.45;
    }
    .sheet-card-row em {
      display: inline-flex;
      margin-top: 7px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      padding: 4px 8px;
      font-size: 11px;
      font-style: normal;
      font-weight: 900;
    }
    .decision-board {
      margin-top: 14px;
    }
    .decision-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }
    .decision-actions button {
      border: 1px solid var(--line);
      border-radius: 9px;
      background: #fff;
      color: #344054;
      padding: 10px;
      font-weight: 900;
    }
    .decision-actions button:nth-child(1) {
      border-color: #bbf7d0;
      background: var(--green-soft);
      color: var(--green);
    }
    .decision-actions button:nth-child(2) {
      border-color: #fde68a;
      background: var(--amber-soft);
      color: var(--amber);
    }
    .decision-actions button:nth-child(3) {
      border-color: #fecaca;
      background: #fef2f2;
      color: var(--red);
    }
    .decision-list {
      display: grid;
      gap: 9px;
    }
    .decision-row {
      display: grid;
      grid-template-columns: 20px minmax(0, 1fr) 110px;
      gap: 10px;
      align-items: start;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 12px;
    }
    .decision-row.active {
      border-color: #93c5fd;
      background: var(--blue-soft);
    }
    .decision-row span {
      color: var(--blue);
      font-size: 12px;
      font-weight: 950;
    }
    .decision-row strong {
      display: block;
      margin-top: 3px;
      font-size: 15px;
      line-height: 1.35;
    }
    .decision-row p {
      margin-top: 4px;
      color: #667085;
      font-size: 12px;
      line-height: 1.45;
    }
    .decision-row em {
      justify-self: end;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      padding: 4px 8px;
      font-size: 11px;
      font-style: normal;
      font-weight: 900;
      text-align: center;
    }
    .detail-sheet {
      border-color: #c4b5fd;
      background: #faf5ff;
    }
    .detail-grid {
      display: grid;
      gap: 9px;
      margin-top: 12px;
    }
    .detail-row {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
    }
    .detail-row span {
      color: #6b21a8;
      font-size: 12px;
      font-weight: 900;
    }
    .detail-row strong,
    .detail-row p {
      margin: 0;
      color: #344054;
      font-size: 14px;
      font-weight: 600;
    }
    .detail-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 14px;
    }
    .export-list {
      display: grid;
      gap: 8px;
      margin: 12px 0 0;
      padding: 0;
      list-style: none;
    }
    .export-list li {
      border: 1px solid #fde68a;
      border-radius: 9px;
      background: #fff;
      padding: 10px;
    }
    .export-list span {
      display: block;
      color: var(--amber);
      font-size: 11px;
      font-weight: 900;
    }
    .export-list strong {
      display: block;
      margin-top: 3px;
      font-size: 13px;
    }
    .export-list p {
      margin-top: 3px;
      font-size: 12px;
    }
    .trace-list {
      display: grid;
      gap: 10px;
      margin: 12px 0 0;
      padding: 0;
      list-style: none;
    }
    .trace-list li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 10px;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      background: #fff;
      padding: 12px;
    }
    .trace-list span {
      display: block;
      color: var(--blue);
      font-size: 11px;
      font-weight: 900;
    }
    .trace-list p {
      margin: 4px 0 0;
      color: var(--ink);
      font-size: 13px;
      font-weight: 750;
      line-height: 1.55;
    }
    .side {
      position: sticky;
      top: 74px;
    }
    .note-card {
      border-color: #fcd34d;
      background: var(--amber-soft);
    }
    .note-card h2,
    .note-card p {
      color: #78350f;
    }
    .boundary-card {
      background: #f8fafc;
    }
    .rubric {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }
    .rubric div {
      border: 1px solid var(--line);
      border-radius: 9px;
      background: #fff;
      padding: 10px;
    }
    .rubric span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 850;
    }
    .rubric strong {
      display: block;
      margin-top: 3px;
      font-size: 18px;
    }
    .mobile-bar {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 20;
      display: none;
      border-top: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 -16px 40px rgba(15, 23, 42, 0.16);
      backdrop-filter: blur(14px);
      padding: 12px;
    }
    .mobile-bar-inner {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
    }
    .mobile-bar span {
      display: block;
      color: #667085;
      font-size: 12px;
      font-weight: 800;
    }
    .mobile-bar strong {
      display: block;
      color: var(--ink);
      font-size: 14px;
    }
    @media (max-width: 900px) {
      .topbar-inner { padding: 10px 12px; }
      .top-actions .ghost-btn { display: none; }
      .page { padding: 16px 10px 28px; }
      .hero,
      .workspace {
        grid-template-columns: 1fr;
      }
      .hero-main,
      .hero-score,
      .panel {
        border-radius: 10px;
        box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
      }
      h1 { font-size: 34px; }
      .lead { font-size: 15px; }
      .hero-score { display: none; }
      .side { position: static; }
      .stages {
        grid-template-columns: 1fr;
      }
      .save-field,
      .detail-row {
        grid-template-columns: 1fr;
      }
      .task-card,
      .timeline-row,
      .routine-row {
        grid-template-columns: 20px minmax(72px, 86px) minmax(0, 1fr);
        gap: 9px;
      }
      .study-row {
        grid-template-columns: 20px minmax(72px, 86px) minmax(0, 1fr);
      }
      .study-row em {
        grid-column: 3;
      }
      .timeline-row::before { left: 105px; }
      .study-summary,
      .challenge-board {
        grid-template-columns: 1fr;
      }
      .sheet-board {
        overflow: hidden;
      }
      .sheet-board table {
        display: none;
      }
      .sheet-mobile-list {
        display: grid;
      }
      .decision-actions,
      .decision-row {
        grid-template-columns: 1fr;
      }
      .trace-list li {
        grid-template-columns: 1fr;
      }
      .decision-row em {
        justify-self: start;
      }
      .task-card strong,
      .timeline-row strong,
      .study-row strong,
      .routine-row strong {
        font-size: 14px;
      }
      .mobile-bar { display: block; }
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div class="topbar-inner">
        <a class="back" href="../2026-06-02-flow-content-ux-candidates.html#candidate-preview-index">← 후보 인덱스</a>
        <div class="top-actions">
          <a class="ghost-btn" href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 보기</a>
          <button class="solid-btn" type="button">${
            traceStrength === 'weak' ? '보류 후보' : traceStrength === 'needs_review' ? '조건부 저장 검토' : '내 Flow에 저장'
          }</button>
        </div>
      </div>
    </header>
    <main class="page">
      <section class="hero" id="flow-summary">
        <div class="hero-main">
          <p class="source-line">${escapeHtml(candidate.category)} · ${escapeHtml(sourceTypeLabel[candidate.sourceType])}</p>
          <h1>${escapeHtml(candidate.title)}</h1>
          <p class="lead">${escapeHtml(candidate.userNeed)}</p>
          <div class="meta-row">
            <span>${escapeHtml(destinationLabel[candidate.destination])}</span>
            <span>${escapeHtml(pattern.title)}</span>
            <span>${total}개 실행 항목</span>
            <span>${escapeHtml(traceStrengthLabel[traceStrength])}</span>
            <span class="ok">출처 확인 필요</span>
          </div>
        </div>
        <aside class="hero-score">
          <div class="score-number">
            <span>사용자 검토 점수</span>
            <strong>${review.userScore.toFixed(1)}</strong>
            <p>${escapeHtml(reviewStatusLabel[review.status])} · ${escapeHtml(sourceQualityLabel[review.sourceQuality])}</p>
          </div>
          <div class="mini-stats">
            <div><span>원문 적합</span><strong>${candidate.fitScore.toFixed(1)}</strong></div>
            <div><span>구조</span><strong>${escapeHtml(candidate.structure)}</strong></div>
          </div>
        </aside>
      </section>

      <section class="workspace">
        <div>
          <section class="panel source-card">
            <div class="panel-head">
              <div>
                <h2>원문에서 따라할 행동</h2>
                <p>${escapeHtml(candidate.sourceSignal)}</p>
              </div>
              <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 ↗</a>
            </div>
            <strong>${escapeHtml(candidate.sourceTitle)}</strong>
          </section>

          <section class="panel save-panel">
            <div class="panel-head">
              <div>
                <h2>${escapeHtml(savePanelTitle)}</h2>
                <p>${escapeHtml(savePanelDescription)}</p>
              </div>
            </div>
            <div class="save-grid">${savePanelBody}</div>
            <button class="solid-btn" type="button">${escapeHtml(savePanelButtonLabel)}</button>
          </section>

          <section class="panel progress-panel" id="execution-preview">
            <div class="panel-head">
              <div>
                <h2>My Flow 실행판</h2>
                <p>저장 후 사용자가 실제로 보게 될 실행 화면입니다.</p>
              </div>
              <button class="ghost-btn" type="button">${escapeHtml(executionLabel)}</button>
            </div>
            <div class="progress-line">
              <div class="bar"><span></span></div>
              <strong>${previewDone}/${total} · ${progress}%</strong>
            </div>
            <nav class="tabs" aria-label="My Flow preview links"><a class="active" href="#execution-preview">오늘</a><a href="#calendar-preview">캘린더</a><a href="#flow-summary">Flow</a><a href="#checklist-preview">체크</a></nav>
            ${executionBoard}
          </section>

          <section class="panel detail-sheet" id="checklist-preview">
            <div class="panel-head">
              <div>
                <h2>상세 sheet</h2>
                <p>${escapeHtml(primaryItem.title)}</p>
              </div>
            </div>
            <div class="detail-grid">
              <div class="detail-row"><span>날짜/반복</span><strong>${escapeHtml(primaryItem.schedule)}</strong></div>
              <div class="detail-row"><span>메모</span><p>${escapeHtml(primaryItem.memo)}</p></div>
              <div class="detail-row"><span>완료 기준</span><p>${escapeHtml(primaryItem.completion)}</p></div>
              <div class="detail-row"><span>원문 링크</span><p><a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.sourceTitle)}</a></p></div>
            </div>
            <div class="detail-actions">
              <button class="solid-btn" type="button">완료 체크</button>
              <button class="ghost-btn" type="button">메모 수정</button>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <div>
                <h2>Export 미리보기</h2>
                <p>캘린더, 체크리스트, 시트로 옮겼을 때 남아야 할 핵심 항목입니다.</p>
              </div>
            </div>
            <ol class="export-list">${exportRows}</ol>
          </section>
        </div>

        <aside class="side">
          ${note
            ? `<section class="panel note-card"><h2>수동 확인 중 메모 · ${escapeHtml(note.score)}점</h2><p>${escapeHtml(note.note)}</p><p>${escapeHtml(note.uiShape)}</p></section>`
            : ''}
          ${
            traceStrength === 'weak'
              ? `<section class="panel boundary-card"><h2>현재 저장 후보 아님</h2><p>${escapeHtml(review.sourceIssue ?? '원문 근거와 실행 항목의 연결이 약합니다.')}</p><p>${escapeHtml(review.uxAction)}</p></section>`
              : ''
          }
          ${
            traceStrength === 'needs_review'
              ? `<section class="panel boundary-card"><h2>조건부 저장 검토</h2><p>${escapeHtml(review.sourceIssue ?? review.conversionNote)}</p><p>${escapeHtml(review.uxAction)}</p></section>`
              : ''
          }
          <section class="panel boundary-card">
            <h2>최우선 판정 질문</h2>
            <p>원문을 읽고 저장한 뒤, 생성된 캘린더/체크리스트/시트/메모만 보고도 다음 행동을 할 수 있는가?</p>
            <ul>
              <li>원문의 순서, 주기, 조건, 판단 지점이 실행 항목에 남아 있는가</li>
              <li>최소 입력만으로 ${escapeHtml(destinationLabel[candidate.destination])}에 저장 가능한가</li>
              <li>날짜나 항목을 열었을 때 원문 기반 체크와 완료 기준이 보이는가</li>
              <li>사용자가 원문 의미를 다시 추측하지 않아도 되는가</li>
            </ul>
          </section>
          <section class="panel boundary-card">
            <h2>원문 → 실행 산출물 대응</h2>
            <p>원문 단서가 실제 저장 항목, 상세 메모, 완료 기준으로 옮겨졌는지 확인합니다.</p>
            <ul class="trace-list">${sourceTraceRows}</ul>
          </section>
          <section class="panel boundary-card">
            <h2>UX 판단</h2>
            <p>${escapeHtml(candidate.uxNote)}</p>
            <p>${escapeHtml(review.uxAction)}</p>
          </section>
          <section class="panel boundary-card">
            <h2>출처/주의 분리</h2>
            <p>${escapeHtml(candidate.sourceBoundary)}</p>
            ${review.sourceIssue ? `<p>${escapeHtml(review.sourceIssue)}</p>` : ''}
            ${sourceRefresh ? `<p>${escapeHtml(sourceRefresh.simulation.verdict)}</p>` : ''}
          </section>
          <section class="panel">
            <h2>평가 점수</h2>
            <div class="rubric">
              <div><span>사용자</span><strong>${review.userScore.toFixed(1)}</strong></div>
              <div><span>원문 적합</span><strong>${candidate.fitScore.toFixed(1)}</strong></div>
              <div><span>목적지</span><strong>${escapeHtml(destinationLabel[candidate.destination])}</strong></div>
              <div><span>항목</span><strong>${total}개</strong></div>
            </div>
          </section>
        </aside>
      </section>
    </main>
    <div class="mobile-bar">
      <div class="mobile-bar-inner">
        <div>
          <span>진행률 ${previewDone}/${total}</span>
          <strong>${escapeHtml(primaryItem.title)}</strong>
        </div>
        <button class="solid-btn" type="button">저장</button>
      </div>
    </div>
  </div>
</body>
</html>`;
};

const patternCards = patternKeys
  .map((key) => {
    const sample = sortedCandidates.find((candidate) => patternFor(candidate).key === key);
    const pattern = sample
      ? patternFor(sample)
      : {
          key,
          title: `${key}. 후보 없음`,
          summary: '현재 매핑된 후보가 없습니다.',
        };
    return `
      <a class="summary-card" href="#pattern-${key}">
        <span>${escapeHtml(pattern.title)}</span>
        <strong>${byPattern[key] ?? 0}개</strong>
        <p>${escapeHtml(pattern.summary)}</p>
      </a>
    `;
  })
  .join('');

const coveragePanel = `
  <section class="coverage-panel" id="representative-coverage">
    <div class="section-title">
      <span>대표 검토 축</span>
      <h2>콘텐츠 종류별로 어떤 Flow 가능성을 보고 있는지</h2>
      <p>
        후보 개수가 늘어날수록 개별 점수보다 카테고리 대표성이 중요해집니다. 아래 축은 원문 콘텐츠를
        캘린더, 체크리스트, 시트, 메모로 옮길 때 어떤 사용자 순간을 검증 중인지 보여줍니다.
      </p>
    </div>
    <div class="coverage-grid">
      ${representativeCoverageGroups
        .map((group) => {
          const candidates = group.candidateIds
            .map((id) => sortedCandidates.find((candidate) => candidate.id === id))
            .filter((candidate): candidate is KoreanFlowContentCandidate => Boolean(candidate));
          const primary = candidates[0];
          return `
            <article class="coverage-card">
              <div class="coverage-card-head">
                <span>${escapeHtml(group.label)}</span>
                <b>${candidates.length}개</b>
              </div>
              <p class="coverage-artifact">${escapeHtml(group.artifact)}</p>
              <p>${escapeHtml(group.question)}</p>
              <div class="coverage-links">
                ${candidates
                  .map(
                    (candidate) => `
                      <a href="#${escapeHtml(candidate.id)}">${escapeHtml(candidate.title)}</a>
                    `,
                  )
                  .join('')}
              </div>
              ${
                primary
                  ? `<a class="coverage-preview-link" href="${escapeHtml(previewHrefFor(primary))}" target="_blank" rel="noreferrer">대표 프리뷰 보기</a>`
                  : ''
              }
            </article>
          `;
        })
        .join('')}
    </div>
  </section>
`;

const antiRepetitionPanel = `
  <section class="anti-repetition-panel" id="anti-repetition-candidates">
    <div class="section-title">
      <span>반복 방지 신규 후보</span>
      <h2>기존 가전·여행·결혼·공부 반복 밖에서 먼저 볼 ${antiRepetitionCandidates.length}개</h2>
      <p>
        개별 후보가 틀린 것은 아니지만 같은 축이 반복되어 플랫폼 가능성을 보기 어려웠습니다. 아래 후보는 public 승격 전,
        서로 다른 사용자 순간에서 원문을 Flow로 옮길 수 있는지 확인하기 위한 source-to-Flow QA 후보입니다.
      </p>
    </div>
    <div class="anti-repetition-grid">
      ${antiRepetitionCandidates
        .map((candidate) => {
          const review = reviewFor(candidate);
          const first = candidate.flowItems[0];
          return `
            <article class="anti-card">
              <div class="anti-card-head">
                <span>${escapeHtml(candidate.category)}</span>
                <b>${review.userScore.toFixed(1)}점</b>
              </div>
              <h3>${escapeHtml(candidate.title)}</h3>
              <p>${escapeHtml(review.conversionNote)}</p>
              <dl>
                <div><dt>첫 실행</dt><dd>${escapeHtml(first.title)} · ${escapeHtml(first.schedule)}</dd></div>
                <div><dt>산출물</dt><dd>${escapeHtml(destinationLabel[candidate.destination])} · ${escapeHtml(candidate.structure)}</dd></div>
                <div><dt>입력</dt><dd>${escapeHtml(candidate.inputs.join(' / '))}</dd></div>
              </dl>
              <div class="anti-card-actions">
                <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a>
                <a class="primary" href="${escapeHtml(previewHrefFor(candidate))}" target="_blank" rel="noreferrer">프리뷰 보기</a>
              </div>
            </article>
          `;
        })
        .join('')}
    </div>
  </section>
`;

const latestDiversificationPanel = `
  <section class="anti-repetition-panel" id="latest-diversification-candidates">
    <div class="section-title">
      <span>최근 다양화 후보</span>
      <h2>김장·여권·자동차검사·캠핑·폐가전 ${latestDiversificationCandidates.length}개</h2>
      <p>
        같은 가전·식물·결혼·공부 후보가 반복되는 문제를 줄이기 위해 추가한 최신 후보입니다. 공식 절차, 계절 행사,
        야외 준비, 방문수거처럼 서로 다른 사용자 순간에서 FlowMe가 얼마나 가볍게 실행판을 만들 수 있는지 봅니다.
      </p>
    </div>
    <div class="anti-repetition-grid">
      ${latestDiversificationCandidates
        .map((candidate) => {
          const review = reviewFor(candidate);
          const first = candidate.flowItems[0];
          return `
            <article class="anti-card">
              <div class="anti-card-head">
                <span>${escapeHtml(candidate.category)}</span>
                <b>${review.userScore.toFixed(1)}점</b>
              </div>
              <h3>${escapeHtml(candidate.title)}</h3>
              <p>${escapeHtml(review.conversionNote)}</p>
              <dl>
                <div><dt>첫 실행</dt><dd>${escapeHtml(first.title)} · ${escapeHtml(first.schedule)}</dd></div>
                <div><dt>산출물</dt><dd>${escapeHtml(destinationLabel[candidate.destination])} · ${escapeHtml(candidate.structure)}</dd></div>
                <div><dt>입력</dt><dd>${escapeHtml(candidate.inputs.join(' / '))}</dd></div>
              </dl>
              <div class="anti-card-actions">
                <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a>
                <a class="primary" href="${escapeHtml(previewHrefFor(candidate))}" target="_blank" rel="noreferrer">프리뷰 보기</a>
              </div>
            </article>
          `;
        })
        .join('')}
    </div>
  </section>
`;

const creatorSourceBreadthPanel = `
  <section class="anti-repetition-panel" id="creator-source-breadth-candidates">
    <div class="section-title">
      <span>제작자 자료 확장 후보</span>
      <h2>악보·반려묘·전세계약·굿노트·마카롱 ${creatorSourceBreadthCandidates.length}개</h2>
      <p>
        네이버 블로그/티스토리/콘텐츠 페이지처럼 제작자 자료, 댓글 반응, PDF·도안·체크리스트가 보이는 원문을 별도로 모았습니다.
        FlowMe가 자료를 복제하지 않고 원문 링크와 실행 일정만 제공해도 사용자가 따라 할 수 있는지 확인합니다.
      </p>
    </div>
    <div class="anti-repetition-grid">
      ${creatorSourceBreadthCandidates
        .map((candidate) => {
          const review = reviewFor(candidate);
          const first = candidate.flowItems[0];
          return `
            <article class="anti-card">
              <div class="anti-card-head">
                <span>${escapeHtml(candidate.category)}</span>
                <b>${review.userScore.toFixed(1)}점</b>
              </div>
              <h3>${escapeHtml(candidate.title)}</h3>
              <p>${escapeHtml(review.conversionNote)}</p>
              <dl>
                <div><dt>첫 실행</dt><dd>${escapeHtml(first.title)} · ${escapeHtml(first.schedule)}</dd></div>
                <div><dt>산출물</dt><dd>${escapeHtml(destinationLabel[candidate.destination])} · ${escapeHtml(candidate.structure)}</dd></div>
                <div><dt>입력</dt><dd>${escapeHtml(candidate.inputs.join(' / '))}</dd></div>
              </dl>
              <div class="anti-card-actions">
                <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a>
                <a class="primary" href="${escapeHtml(previewHrefFor(candidate))}" target="_blank" rel="noreferrer">프리뷰 보기</a>
              </div>
            </article>
          `;
        })
        .join('')}
    </div>
  </section>
`;

const previewIndexPanel = `
  <section class="preview-index-panel" id="candidate-preview-index">
    <div class="section-title">
      <span>원문/프리뷰 인덱스</span>
      <h2>후보별 Flow 프리뷰를 따로 열어 비교하세요</h2>
      <p>
        레퍼런스처럼 각 후보를 하나의 작은 실행 화면으로 분리했습니다. 먼저 원문을 열고, 바로 옆 Flow 프리뷰에서
        입력값, 실행판, 상세 sheet, export 형태가 자연스러운지 확인하면 됩니다.
      </p>
    </div>
    <div class="preview-index-wrap">
      <table class="preview-index-table">
        <thead>
          <tr>
            <th>후보</th>
            <th>원문</th>
            <th>프리뷰</th>
            <th>점수</th>
            <th>대응</th>
            <th>검토 포인트</th>
          </tr>
        </thead>
        <tbody>
          ${sortedCandidates
            .map((candidate) => {
              const review = reviewFor(candidate);
              const traceStrength = traceStrengthFor(candidate);
              const note = userDraftReviewNotes[candidate.id];
              return `
                <tr>
                  <td>
                    <strong>${escapeHtml(candidate.title)}</strong>
                    <small>${antiRepetitionCandidateIds.has(candidate.id) ? '반복 방지 신규 축 · ' : ''}${latestDiversificationCandidateIds.has(candidate.id) ? '최근 다양화 후보 · ' : ''}${creatorSourceBreadthCandidateIds.has(candidate.id) ? '제작자 자료 확장 · ' : ''}${escapeHtml(candidate.category)} · ${escapeHtml(candidate.structure)} · ${escapeHtml(destinationLabel[candidate.destination])}</small>
                  </td>
                  <td><a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 ↗</a></td>
                  <td><a href="${escapeHtml(previewHrefFor(candidate))}" target="_blank" rel="noreferrer">프리뷰 →</a></td>
                  <td><b>${review.userScore.toFixed(1)}</b></td>
                  <td>${escapeHtml(traceStrengthLabel[traceStrength])}</td>
                  <td>${escapeHtml(note?.note ?? review.conversionNote)}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
    <div class="preview-index-cards">
      ${sortedCandidates
        .map((candidate) => {
          const review = reviewFor(candidate);
          const note = userDraftReviewNotes[candidate.id];
          return `
            <article class="preview-index-card">
              <h3>${escapeHtml(candidate.title)}</h3>
              <p>${escapeHtml(note?.note ?? review.conversionNote)}</p>
              <div class="preview-index-card-meta">
                <span>${review.userScore.toFixed(1)}점</span>
                ${antiRepetitionCandidateIds.has(candidate.id) ? '<span>신규 축</span>' : ''}
                ${latestDiversificationCandidateIds.has(candidate.id) ? '<span>최근 다양화</span>' : ''}
                ${creatorSourceBreadthCandidateIds.has(candidate.id) ? '<span>제작자 자료</span>' : ''}
                <span>${escapeHtml(candidate.category)}</span>
                <span>${escapeHtml(destinationLabel[candidate.destination])}</span>
              </div>
              <div class="preview-index-card-actions">
                <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a>
                <a class="primary" href="${escapeHtml(previewHrefFor(candidate))}" target="_blank" rel="noreferrer">프리뷰 보기</a>
              </div>
            </article>
          `;
        })
        .join('')}
    </div>
  </section>
`;

const representativePanel = `
  <section class="priority-panel" aria-label="대표 P0 후보">
    <div>
      <span>대표 P0 후보</span>
      <h2>먼저 UX에 실제 적용해볼 ${representativeKoreanFlowContentIds.length}개</h2>
      <p>사용자 점수 4.5 이상이면서 AI 느낌 원문을 피하고, 원문 실행 구조가 비교적 명확한 후보입니다.</p>
    </div>
    <div class="priority-links">
      ${representativeKoreanFlowContentIds
        .map((id) => {
          const candidate = displayCandidates.find((item) => item.id === id);
          const review = candidate ? reviewFor(candidate) : undefined;
          if (!candidate || !review) return '';
          return `<a href="#${escapeHtml(candidate.id)}"><strong>${escapeHtml(candidate.title)}</strong><span>${review.userScore.toFixed(1)} / ${escapeHtml(sourceQualityLabel[review.sourceQuality])}</span></a>`;
        })
        .join('')}
    </div>
  </section>
`;

const selectionTierLabel: Record<FlowContentSelectionTier, string> = {
  p0_apply_to_ux12: 'P0 UX12 적용',
  p1_evaluate_next: 'P1 추가 검증',
  p2_hold_or_support: '보류/보조 출처',
  merge_or_replace: '병합/대체',
};

const selectionTierRank: Record<FlowContentSelectionTier, number> = {
  p0_apply_to_ux12: 0,
  p1_evaluate_next: 1,
  merge_or_replace: 2,
  p2_hold_or_support: 3,
};

const selectionOriginLabel = (audit: FlowContentSelectionAudit) =>
  audit.origin === 'creator_interaction_8'
    ? '제작자 상호작용 후보'
    : audit.origin === 'runtime_diversity_addition'
      ? '다양화 신규 후보'
      : '기존 후보';

const renderSelectionRow = (audit: FlowContentSelectionAudit) => `
  <tr>
    <td><span class="selection-pill ${audit.tier}">${escapeHtml(selectionTierLabel[audit.tier])}</span></td>
    <td>
      <a href="#${escapeHtml(audit.id)}">${escapeHtml(audit.title)}</a>
      <small>${selectionOriginLabel(audit)} · ${escapeHtml(audit.category)}</small>
    </td>
    <td>${audit.totalScore.toFixed(1)}</td>
    <td>${audit.interactionScore.toFixed(0)}</td>
    <td>${audit.executionScore.toFixed(0)}</td>
    <td>${audit.uiFitScore.toFixed(0)}</td>
    <td>${audit.riskScore.toFixed(0)}</td>
    <td>${audit.supplySignalScore.toFixed(0)}</td>
    <td>${escapeHtml(audit.reason)}</td>
    <td>${escapeHtml(audit.ux12Action)}</td>
  </tr>
`;

const renderSelectionCard = (audit: FlowContentSelectionAudit) => `
  <article class="selection-review-card">
    <div class="selection-review-head">
      <span class="selection-pill ${audit.tier}">${escapeHtml(selectionTierLabel[audit.tier])}</span>
      <strong>${audit.totalScore.toFixed(1)}</strong>
    </div>
    <h3><a href="#${escapeHtml(audit.id)}">${escapeHtml(audit.title)}</a></h3>
    <p class="selection-review-meta">
      ${selectionOriginLabel(audit)} · ${escapeHtml(audit.category)}
    </p>
    <div class="selection-review-scores" aria-label="${escapeHtml(audit.title)} 평가 점수">
      <span>상호 ${audit.interactionScore.toFixed(0)}</span>
      <span>실행 ${audit.executionScore.toFixed(0)}</span>
      <span>UI ${audit.uiFitScore.toFixed(0)}</span>
      <span>위험 ${audit.riskScore.toFixed(0)}</span>
      <span>공급 ${audit.supplySignalScore.toFixed(0)}</span>
    </div>
    <dl class="selection-review-detail">
      <div>
        <dt>판단 이유</dt>
        <dd>${escapeHtml(audit.reason)}</dd>
      </div>
      <div>
        <dt>다음 UX12 액션</dt>
        <dd>${escapeHtml(audit.ux12Action)}</dd>
      </div>
    </dl>
  </article>
`;

const sortedSelectionAudits = [...flowContentSelectionAudits].sort((a, b) => {
  const tierDiff = selectionTierRank[a.tier] - selectionTierRank[b.tier];
  if (tierDiff !== 0) return tierDiff;
  return b.totalScore - a.totalScore;
});

const selectionAuditPanel = `
  <section class="selection-panel" id="selection-audit">
    <div class="section-title">
      <span>전수 평가 결과</span>
      <h2>${flowContentSelectionSummary.totalEvaluated}개 후보 평가와 대표 후보 재선정</h2>
      <p>
        현재 런타임 후보 ${koreanFlowContentCandidates.length}개와 제작자/사용자 상호작용 후보 8개를 같은 기준으로 다시 점수화했습니다.
        기준은 상호작용, 실행 단위, UI 적합성, 위험/출처 경계, 컨텐츠 공급 가능성입니다.
      </p>
    </div>
    <div class="selection-summary">
      <div><span>전체 평가</span><strong>${flowContentSelectionSummary.totalEvaluated}개</strong></div>
      <div><span>P0 UX12 적용</span><strong>${flowContentSelectionSummary.p0Count}개</strong></div>
      <div><span>P1 추가 검증</span><strong>${flowContentSelectionSummary.p1Count}개</strong></div>
      <div><span>보류/병합</span><strong>${flowContentSelectionSummary.holdCount + flowContentSelectionSummary.mergeCount}개</strong></div>
      <div><span>추가 조사 리드</span><strong>${flowContentSelectionSummary.additionalLeadCount}개</strong></div>
    </div>
    <div class="selection-conclusion">
      <h3>현재 결론</h3>
      <p>
        Flow화 가능한 원문은 충분히 많지만, 전부 담으면 안 됩니다. 우선 담을 원문은 날짜/반복/체크/결정 단위가 원문에 이미 보이고,
        사용자가 캘린더·체크리스트·메모로 바로 옮길 수 있어야 합니다.
      </p>
      <p>
        제작자형 원문은 댓글, 자료 요청, 수정 공지처럼 실제 사용 흔적이 보일수록 우선순위를 높입니다.
        UX12에는 먼저 P0 후보만 넣어 캘린더, 루틴, 체크, 상세 메모가 충분한지 봅니다.
      </p>
    </div>
    <div class="selection-p0">
      <h3>새 P0 shortlist</h3>
      <div class="selection-p0-links">
        ${selectedFlowContentP0Ids
          .map((id) => {
            const audit = flowContentSelectionAudits.find((item) => item.id === id);
            if (!audit) return '';
            return `<a href="#${escapeHtml(audit.id)}"><strong>${escapeHtml(audit.title)}</strong><span>${audit.totalScore.toFixed(1)} · ${escapeHtml(audit.category)}</span></a>`;
          })
          .join('')}
      </div>
    </div>
    <div class="selection-table-wrap">
      <table class="selection-table">
        <thead>
          <tr>
            <th>판정</th>
            <th>후보</th>
            <th>총점</th>
            <th>상호</th>
            <th>실행</th>
            <th>UI</th>
            <th>위험</th>
            <th>공급</th>
            <th>판단 이유</th>
            <th>다음 UX12 액션</th>
          </tr>
        </thead>
        <tbody>${sortedSelectionAudits.map(renderSelectionRow).join('')}</tbody>
      </table>
    </div>
    <div class="selection-review-cards">
      ${sortedSelectionAudits.map(renderSelectionCard).join('')}
    </div>
  </section>
`;

const additionalSourceLeadPanel = `
  <section class="source-lead-panel" id="additional-source-leads">
    <div class="section-title">
      <span>추가 조사</span>
      <h2>컨텐츠 공급 가능성 리드</h2>
      <p>네이버 블로그 검색에서 자료 요청, 비밀번호 공유, 정정 요청, 체크리스트 파일처럼 사용자 상호작용이 보이는 후보가 계속 발견됩니다.</p>
    </div>
    <div class="source-lead-grid">
      ${additionalSourceLeads
        .map(
          (lead) => `
            <article class="source-lead">
              <span>${escapeHtml(lead.category)} · ${escapeHtml(lead.useFor)}</span>
              <h3><a href="${escapeHtml(lead.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(lead.title)}</a></h3>
              <p><strong>상호작용:</strong> ${escapeHtml(lead.interactionSignal)}</p>
              <p><strong>Flow 가능성:</strong> ${escapeHtml(lead.flowPotential)}</p>
            </article>
          `,
        )
        .join('')}
    </div>
  </section>
`;

const groupedSections = patternKeys
  .map((key) => {
    const items = sortedCandidates.filter((candidate) => patternFor(candidate).key === key);
    if (items.length === 0) return '';
    const pattern = patternFor(items[0]);
    return `
      <section class="pattern-section" id="pattern-${key}">
        <div class="section-title">
          <span>UX 후보 ${key}</span>
          <h2>${escapeHtml(pattern.title)}</h2>
          <p>${escapeHtml(pattern.summary)}</p>
        </div>
        <div class="candidate-list">
          ${items.map((candidate, index) => renderCandidate(candidate, sortedCandidates.indexOf(candidate))).join('')}
        </div>
      </section>
    `;
  })
  .join('');

const readCreatorInteractionEmbed = () => {
  const creatorHtmlPath = path.join(
    root,
    'docs/content-audit/2026-06-03-creator-interaction-flow-candidates.html',
  );

  if (!fs.existsSync(creatorHtmlPath)) {
    return `
      <section class="creator-integration" id="creator-interaction-candidates">
        <div class="section-title">
          <span>제작자 상호작용 후보</span>
          <h2>제작자/사용자 반응 기반 후보</h2>
          <p>아직 별도 후보 HTML이 생성되지 않았습니다. 먼저 build-creator-interaction-flow-candidates-html.mjs를 실행하세요.</p>
        </div>
      </section>
    `;
  }

  const creatorHtml = fs.readFileSync(creatorHtmlPath, 'utf8');
  const style = creatorHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
  const main = creatorHtml.match(/<main class="page">([\s\S]*?)<\/main>/)?.[1] ?? '';

  if (!style || !main) {
    return `
      <section class="creator-integration" id="creator-interaction-candidates">
        <div class="section-title">
          <span>제작자 상호작용 후보</span>
          <h2>제작자/사용자 반응 기반 후보</h2>
          <p>별도 후보 HTML을 읽었지만 본문 추출에 실패했습니다.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="creator-integration" id="creator-interaction-candidates">
      <div class="section-title">
        <span>추가 검증 묶음</span>
        <h2>제작자/사용자 상호작용 기반 후보 8개</h2>
        <p>네이버 블로그, 유튜브, 개인 후기처럼 댓글/공감/조회/자료 요청 신호가 보이는 원문을 FlowMe UI 형태로 붙였습니다.</p>
      </div>
      <div id="creator-interaction-shadow"></div>
      <template id="creator-interaction-template">
        <style>${style}</style>
        <main class="page">${main}</main>
      </template>
      <script>
        (() => {
          const host = document.getElementById('creator-interaction-shadow');
          const template = document.getElementById('creator-interaction-template');
          if (!host || !template) return;
          const root = host.attachShadow({ mode: 'open' });
          root.appendChild(template.content.cloneNode(true));
        })();
      </script>
    </section>
  `;
};

const creatorInteractionEmbed = readCreatorInteractionEmbed();
const generatedAt = new Date().toISOString();

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Flow 컨텐츠 UX 후보 비교</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7fb;
      --panel: #ffffff;
      --ink: #0f172a;
      --muted: #5b6472;
      --line: #dfe5ee;
      --soft: #f1f5f9;
      --blue: #2563eb;
      --blue-soft: #eff6ff;
      --green: #047857;
      --green-soft: #ecfdf5;
      --amber: #b45309;
      --amber-soft: #fffbeb;
      --red: #b91c1c;
      --shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 14px 34px rgba(15, 23, 42, 0.07);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
      letter-spacing: 0;
    }
    a { color: var(--blue); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .page {
      max-width: 1360px;
      margin: 0 auto;
      padding: 28px 18px 80px;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 20px;
      align-items: end;
      margin-bottom: 18px;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      border: 1px solid #bfdbfe;
      border-radius: 999px;
      background: var(--blue-soft);
      color: #1d4ed8;
      padding: 4px 10px;
      font-size: 13px;
      font-weight: 800;
    }
    h1 {
      margin: 12px 0 0;
      max-width: 840px;
      font-size: clamp(34px, 5vw, 60px);
      line-height: 1.08;
      letter-spacing: 0;
    }
    .hero p {
      margin: 14px 0 0;
      max-width: 820px;
      color: var(--muted);
      font-size: 15px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 14px;
      box-shadow: var(--shadow);
    }
    .metric span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    .metric strong {
      display: block;
      margin-top: 5px;
      font-size: 25px;
      line-height: 1.1;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin: 18px 0 26px;
    }
    .priority-panel {
      display: grid;
      grid-template-columns: 300px minmax(0, 1fr);
      gap: 14px;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      background: #fff;
      box-shadow: var(--shadow);
      padding: 16px;
      margin: 0 0 24px;
    }
    .priority-panel span {
      color: var(--blue);
      font-size: 13px;
      font-weight: 900;
    }
    .priority-panel h2 {
      margin: 4px 0 0;
      font-size: 24px;
      line-height: 1.2;
    }
    .priority-panel p {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .priority-links {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .priority-links a {
      display: block;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      background: var(--blue-soft);
      padding: 10px;
      color: inherit;
    }
    .priority-links a:hover {
      border-color: #93c5fd;
      text-decoration: none;
    }
    .priority-links strong {
      display: block;
      font-size: 13px;
      line-height: 1.3;
    }
    .priority-links span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
    }
    .selection-panel,
    .source-lead-panel {
      margin: 26px 0;
    }
    .selection-summary {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .selection-summary div,
    .selection-p0,
    .source-lead {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
      padding: 13px;
    }
    .selection-summary span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .selection-summary strong {
      display: block;
      margin-top: 4px;
      font-size: 23px;
    }
    .selection-p0 {
      margin-bottom: 14px;
      border-color: #bfdbfe;
      background: #fff;
    }
    .selection-conclusion {
      margin-bottom: 14px;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      background: var(--green-soft);
      padding: 14px;
    }
    .selection-conclusion h3 {
      margin: 0 0 8px;
      font-size: 16px;
    }
    .selection-conclusion p {
      margin: 7px 0 0;
      color: #14532d;
      font-size: 14px;
    }
    .selection-p0 h3 {
      margin: 0 0 10px;
      font-size: 16px;
    }
    .selection-p0-links,
    .source-lead-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .selection-p0-links a {
      display: block;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      background: var(--blue-soft);
      padding: 10px;
      color: inherit;
    }
    .selection-p0-links a:hover { text-decoration: none; border-color: #93c5fd; }
    .selection-p0-links strong {
      display: block;
      font-size: 13px;
      line-height: 1.3;
    }
    .selection-p0-links span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
    }
    .selection-table-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      box-shadow: var(--shadow);
    }
    .selection-table {
      width: 100%;
      min-width: 1180px;
      border-collapse: collapse;
      font-size: 12px;
    }
    .selection-table th,
    .selection-table td {
      border-bottom: 1px solid #e2e8f0;
      padding: 9px;
      text-align: left;
      vertical-align: top;
    }
    .selection-table th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f8fafc;
      color: #475569;
      font-weight: 900;
      white-space: nowrap;
    }
    .selection-table td:nth-child(3),
    .selection-table td:nth-child(4),
    .selection-table td:nth-child(5),
    .selection-table td:nth-child(6),
    .selection-table td:nth-child(7),
    .selection-table td:nth-child(8) {
      text-align: center;
      font-weight: 900;
    }
    .selection-table small {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 11px;
    }
    .selection-review-cards {
      display: none;
      gap: 10px;
    }
    .selection-review-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 12px;
      box-shadow: var(--shadow);
    }
    .selection-review-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }
    .selection-review-head strong {
      font-size: 20px;
      line-height: 1;
    }
    .selection-review-card h3 {
      margin: 0;
      font-size: 15px;
      line-height: 1.35;
    }
    .selection-review-meta {
      margin: 4px 0 10px;
      color: var(--muted);
      font-size: 12px;
    }
    .selection-review-scores {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 5px;
      margin-bottom: 10px;
    }
    .selection-review-scores span {
      border: 1px solid #dbeafe;
      border-radius: 7px;
      background: var(--blue-soft);
      padding: 5px 4px;
      text-align: center;
      color: #1d4ed8;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }
    .selection-review-detail {
      display: grid;
      gap: 8px;
      margin: 0;
    }
    .selection-review-detail div {
      display: grid;
      gap: 2px;
    }
    .selection-review-detail dt {
      color: #475569;
      font-size: 11px;
      font-weight: 900;
    }
    .selection-review-detail dd {
      margin: 0;
      color: #334155;
      font-size: 13px;
      line-height: 1.45;
    }
    .selection-pill {
      display: inline-flex;
      border: 1px solid #dbeafe;
      border-radius: 999px;
      background: var(--blue-soft);
      color: #1d4ed8;
      padding: 3px 7px;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }
    .selection-pill.p0_apply_to_ux12 {
      border-color: #bbf7d0;
      background: var(--green-soft);
      color: var(--green);
    }
    .selection-pill.p1_evaluate_next {
      border-color: #dbeafe;
      background: var(--blue-soft);
      color: #1d4ed8;
    }
    .selection-pill.merge_or_replace {
      border-color: #fde68a;
      background: var(--amber-soft);
      color: var(--amber);
    }
    .selection-pill.p2_hold_or_support {
      border-color: #e2e8f0;
      background: #f8fafc;
      color: #475569;
    }
    .source-lead h3 {
      margin: 5px 0 7px;
      font-size: 16px;
      line-height: 1.3;
    }
    .source-lead span {
      color: var(--blue);
      font-size: 12px;
      font-weight: 900;
    }
    .source-lead p {
      margin: 6px 0 0;
      color: #334155;
      font-size: 13px;
    }
    .summary-card,
    .candidate {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }
    .summary-card {
      display: block;
      padding: 14px;
      color: inherit;
    }
    .summary-card:hover { text-decoration: none; border-color: #93c5fd; }
    .summary-card span {
      display: block;
      color: var(--blue);
      font-size: 13px;
      font-weight: 900;
    }
    .summary-card strong {
      display: block;
      margin-top: 4px;
      font-size: 24px;
    }
    .summary-card p {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .creator-integration {
      margin-top: 34px;
      border-top: 1px solid var(--line);
      padding-top: 28px;
    }
    #creator-interaction-shadow {
      display: block;
      margin-top: 12px;
    }
    .pattern-section { margin-top: 30px; }
    .section-title {
      margin-bottom: 12px;
      border-left: 4px solid var(--blue);
      padding-left: 12px;
    }
    .section-title span {
      color: var(--blue);
      font-size: 13px;
      font-weight: 900;
    }
    .section-title h2 {
      margin: 2px 0 0;
      font-size: 28px;
      line-height: 1.2;
    }
    .section-title p {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    .candidate-list {
      display: grid;
      gap: 18px;
    }
    .candidate {
      overflow: hidden;
    }
    .candidate.representative {
      border-color: #93c5fd;
    }
    .candidate-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: start;
      border-bottom: 1px solid var(--line);
      padding: 18px;
      background: linear-gradient(180deg, #ffffff, #fbfdff);
    }
    .candidate h2 {
      margin: 8px 0 0;
      font-size: 27px;
      line-height: 1.2;
      letter-spacing: 0;
    }
    .candidate-head p {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tag {
      border: 1px solid #dbeafe;
      border-radius: 999px;
      background: var(--blue-soft);
      color: #1d4ed8;
      padding: 4px 9px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .tag.green {
      border-color: #bbf7d0;
      background: var(--green-soft);
      color: var(--green);
    }
    .tag.amber {
      border-color: #fde68a;
      background: var(--amber-soft);
      color: var(--amber);
    }
    .tag.index {
      border-color: #e2e8f0;
      background: #f8fafc;
      color: #334155;
    }
    .score {
      display: grid;
      place-items: center;
      width: 82px;
      height: 82px;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      background: var(--green-soft);
      color: var(--green);
      text-align: center;
      font-weight: 900;
    }
    .score span {
      display: block;
      font-size: 11px;
      font-weight: 800;
    }
    .score strong {
      display: block;
      margin-top: 2px;
      font-size: 24px;
    }
    .candidate-body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 16px;
      padding: 18px;
    }
    .content-col {
      display: grid;
      gap: 14px;
    }
    .block {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 14px;
    }
    .block h3 {
      margin: 0 0 10px;
      font-size: 15px;
    }
    .block h4 {
      margin: 13px 0 7px;
      font-size: 13px;
    }
    .block p,
    .block li,
    .block dd {
      color: #334155;
      font-size: 13px;
    }
    .block ul,
    .block ol {
      margin: 0;
      padding-left: 19px;
    }
    .source-dl,
    .flow-item dl {
      display: grid;
      gap: 8px;
      margin: 0;
    }
    .source-dl div,
    .flow-item dl div {
      display: grid;
      grid-template-columns: 88px minmax(0, 1fr);
      gap: 10px;
    }
    dt {
      color: #64748b;
      font-size: 12px;
      font-weight: 900;
    }
    dd { margin: 0; }
    .conversion-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .conversion-grid div {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f8fafc;
      padding: 10px;
    }
    .conversion-grid span {
      display: block;
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
    }
    .conversion-grid strong {
      display: block;
      margin-top: 4px;
      font-size: 13px;
    }
    .flow-list {
      display: grid;
      gap: 10px;
      padding-left: 0 !important;
      list-style: none;
    }
    .flow-item {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fbfdff;
      padding: 11px;
    }
    .flow-item-head {
      display: flex;
      gap: 9px;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .flow-item-head span {
      flex: 0 0 auto;
      border-radius: 6px;
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: 900;
    }
    .flow-item-head strong {
      font-size: 14px;
      line-height: 1.35;
    }
    .flow-ui-mock {
      background: #f8fafc;
    }
    .flow-review-lab {
      overflow: hidden;
      border: 1px solid #c7d2fe;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 18px 40px rgba(30, 64, 175, 0.08);
      margin-bottom: 12px;
    }
    .lab-toolbar {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1px;
      background: #dbeafe;
    }
    .lab-toolbar span {
      background: #eff6ff;
      color: #1d4ed8;
      padding: 9px 10px;
      text-align: center;
      font-size: 12px;
      font-weight: 900;
    }
    .lab-surface {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
      gap: 12px;
      padding: 12px;
    }
    .lab-source,
    .lab-save,
    .lab-myflow,
    .lab-detail {
      min-width: 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      padding: 12px;
    }
    .lab-detail {
      border-color: #c4b5fd;
      background: #faf5ff;
    }
    .lab-source small,
    .lab-save small,
    .lab-myflow small,
    .lab-detail small {
      display: block;
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
      margin-bottom: 6px;
    }
    .lab-source strong,
    .lab-save h4,
    .lab-detail h4 {
      display: block;
      margin: 0 0 7px;
      font-size: 15px;
      line-height: 1.3;
    }
    .lab-source p {
      margin: 0 0 8px;
      color: #475569;
      font-size: 12px;
    }
    .lab-fields {
      display: grid;
      gap: 7px;
      margin: 10px 0;
    }
    .lab-fields label {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      background: #f8fafc;
      padding: 8px;
      font-size: 12px;
    }
    .lab-fields span {
      color: #475569;
      font-weight: 800;
    }
    .lab-fields b {
      color: #1d4ed8;
      font-weight: 900;
      white-space: nowrap;
    }
    .lab-tabs {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 4px;
      margin-bottom: 8px;
    }
    .lab-tabs span,
    .lab-tabs a {
      border-radius: 7px;
      background: #f1f5f9;
      color: #64748b;
      padding: 6px 4px;
      text-align: center;
      font-size: 11px;
      font-weight: 900;
      text-decoration: none;
    }
    .lab-tabs .active {
      background: #2563eb;
      color: #fff;
    }
    .lab-row {
      display: grid;
      grid-template-columns: 82px minmax(0, 1fr);
      gap: 8px;
      width: 100%;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      padding: 8px;
      margin-top: 6px;
      text-align: left;
    }
    .lab-row.active {
      border-color: #93c5fd;
      background: #eff6ff;
    }
    .lab-row em {
      color: #64748b;
      font-size: 11px;
      font-style: normal;
      font-weight: 900;
    }
    .lab-row strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
    }
    .lab-detail dl {
      display: grid;
      gap: 7px;
      margin: 0;
    }
    .lab-detail dl div {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr);
      gap: 8px;
    }
    .lab-detail dt {
      color: #6b21a8;
      font-size: 11px;
      font-weight: 900;
    }
    .lab-detail dd {
      margin: 0;
      color: #334155;
      font-size: 12px;
    }
    .lab-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .user-draft-review {
      border-color: #fcd34d;
      background: #fffbeb;
    }
    .user-draft-review div {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      margin-bottom: 8px;
    }
    .user-draft-review span {
      color: #92400e;
      font-size: 12px;
      font-weight: 900;
    }
    .user-draft-review strong {
      border-radius: 999px;
      background: #f59e0b;
      color: #fff;
      padding: 4px 9px;
      font-size: 12px;
    }
    .user-draft-review p {
      margin: 7px 0 0;
      color: #78350f;
      font-size: 13px;
    }
    .user-draft-review .shape {
      border-top: 1px solid #fde68a;
      padding-top: 8px;
      font-weight: 800;
    }
    .mock-grid {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
      gap: 10px;
    }
    .mock-card {
      min-width: 0;
      border: 1px solid #dbe3ee;
      border-radius: 8px;
      background: #fff;
      padding: 12px;
    }
    .mock-card.source { border-left: 4px solid #64748b; }
    .mock-card.save { border-left: 4px solid var(--blue); }
    .mock-card.list { border-left: 4px solid #0f766e; }
    .mock-card.detail {
      grid-row: span 2;
      border-left: 4px solid #7c3aed;
    }
    .mock-card.export {
      grid-column: 1 / -1;
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
    }
    .mock-label {
      display: inline-flex;
      margin-bottom: 7px;
      color: var(--blue);
      font-size: 11px;
      font-weight: 900;
    }
    .mock-card h4 {
      margin: 0 0 7px;
      font-size: 16px;
      line-height: 1.25;
    }
    .mock-card p {
      margin: 0 0 9px;
      color: #475569;
      font-size: 12px;
    }
    .mock-fields {
      display: grid;
      gap: 8px;
      margin: 8px 0 10px;
    }
    .mock-fields label,
    .mock-memo {
      display: grid;
      gap: 5px;
    }
    .mock-fields span,
    .mock-memo span {
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
    }
    .mock-fields input,
    .mock-memo textarea {
      width: 100%;
      border: 1px solid #dbe3ee;
      border-radius: 7px;
      background: #f8fafc;
      padding: 8px;
      color: #334155;
      font: inherit;
      font-size: 12px;
    }
    .mock-memo textarea {
      min-height: 116px;
      resize: vertical;
      line-height: 1.5;
    }
    .mock-exec-list {
      display: grid;
      gap: 7px;
    }
    .mock-exec-row {
      display: grid;
      grid-template-columns: 82px minmax(0, 1fr);
      gap: 5px 8px;
      width: 100%;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      padding: 9px;
      text-align: left;
    }
    .mock-exec-row.selected {
      border-color: #93c5fd;
      background: #eff6ff;
    }
    .mock-exec-row span {
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
    }
    .mock-exec-row strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
    }
    .mock-exec-row em {
      grid-column: 2;
      overflow: hidden;
      color: #64748b;
      font-size: 11px;
      font-style: normal;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mock-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 9px;
    }
    .mock-pills span {
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      background: #f8fafc;
      color: #475569;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 800;
    }
    .mock-checks {
      display: grid;
      gap: 6px;
      margin-bottom: 10px;
    }
    .mock-check-row {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      gap: 7px;
      align-items: start;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      background: #fbfdff;
      padding: 7px;
      color: #334155;
      font-size: 12px;
    }
    .mock-check-row input {
      margin: 2px 0 0;
    }
    .mock-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    button.secondary {
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #334155;
    }
    .mock-export-lines {
      display: grid;
      gap: 5px;
    }
    .mock-export-lines span {
      border: 1px solid #fde68a;
      border-radius: 7px;
      background: #fff;
      color: #334155;
      padding: 7px;
      font-size: 12px;
    }
    .review-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .review-grid div,
    .boundary,
    .user-review,
    .source-refresh,
    .simulation {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      padding: 11px;
    }
    .review-grid h4,
    .boundary strong,
    .user-review strong,
    .source-refresh strong,
    .simulation strong {
      display: block;
      margin: 0 0 6px;
      font-size: 13px;
    }
    .review-grid p,
    .boundary p,
    .user-review p,
    .source-refresh p {
      margin: 0;
      color: #334155;
      font-size: 13px;
    }
    .user-review {
      margin-top: 10px;
      background: var(--blue-soft);
      border-color: #bfdbfe;
    }
    .user-review .issue {
      margin-top: 7px;
      color: var(--red);
    }
    .boundary {
      margin-top: 10px;
      background: var(--amber-soft);
      border-color: #fde68a;
    }
    .source-refresh {
      margin-top: 10px;
      background: var(--green-soft);
      border-color: #bbf7d0;
    }
    .source-refresh span {
      display: block;
      margin-top: 6px;
      color: var(--green);
      font-size: 12px;
      font-weight: 800;
    }
    .simulation {
      margin-top: 10px;
      background: #fff;
    }
    .simulation dl {
      display: grid;
      gap: 7px;
      margin: 0;
    }
    .simulation div {
      display: grid;
      grid-template-columns: 86px minmax(0, 1fr);
      gap: 8px;
    }
    .simulation dd {
      margin: 0;
      color: #334155;
      font-size: 13px;
    }
    .ux-preview {
      align-self: start;
      position: sticky;
      top: 14px;
    }
    .phone {
      border: 1px solid #cbd5e1;
      border-radius: 22px;
      background: #f8fafc;
      padding: 12px;
      box-shadow: inset 0 0 0 6px #111827, 0 18px 36px rgba(15, 23, 42, 0.12);
    }
    .phone-top {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 8px 4px 12px;
      color: #f8fafc;
      font-size: 12px;
    }
    .save-panel,
    .calendar-panel,
    .detail-panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 12px;
      margin-bottom: 10px;
    }
    .small-label {
      margin: 0 0 4px;
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
    }
    .save-panel h4,
    .detail-panel h4 {
      margin: 0 0 9px;
      font-size: 16px;
      line-height: 1.25;
    }
    .input-grid {
      display: grid;
      gap: 6px;
      margin-bottom: 10px;
    }
    .input-grid span {
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      background: #f8fafc;
      padding: 7px 8px;
      color: #475569;
      font-size: 12px;
    }
    button {
      width: 100%;
      border: 0;
      border-radius: 8px;
      background: var(--blue);
      color: #fff;
      padding: 9px 10px;
      font-weight: 900;
    }
    .mini-row {
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      padding: 8px;
      margin-top: 7px;
    }
    .mini-row.active {
      border-color: #93c5fd;
      background: #eff6ff;
    }
    .mini-row span {
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
    }
    .mini-row strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
    }
    .detail-panel p {
      margin: 0;
      color: #334155;
      font-size: 12px;
    }
    .done-rule {
      margin-top: 9px;
      border-radius: 7px;
      background: var(--green-soft);
      color: var(--green);
      padding: 8px;
      font-size: 12px;
      font-weight: 800;
    }
    .detail-panel a {
      display: inline-flex;
      margin-top: 9px;
      font-size: 12px;
      font-weight: 900;
    }
    .preview-index-panel {
      margin-top: 18px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 16px 34px rgba(15, 23, 42, 0.07);
      overflow: hidden;
    }
    .anti-repetition-panel {
      margin-top: 18px;
      border: 1px solid #bfdbfe;
      border-radius: 18px;
      background: linear-gradient(180deg, #eff6ff 0%, #fff 36%);
      box-shadow: 0 16px 34px rgba(15, 23, 42, 0.07);
      overflow: hidden;
    }
    .coverage-panel {
      margin-top: 18px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 16px 34px rgba(15, 23, 42, 0.07);
      overflow: hidden;
    }
    .coverage-panel .section-title {
      padding: 20px 20px 10px;
    }
    .coverage-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 12px;
      padding: 0 20px 20px;
    }
    .coverage-card {
      display: flex;
      min-height: 238px;
      flex-direction: column;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: #f8fafc;
      padding: 14px;
    }
    .coverage-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      color: var(--blue);
      font-size: 12px;
      font-weight: 900;
    }
    .coverage-card-head b {
      border-radius: 999px;
      background: #dbeafe;
      padding: 5px 8px;
      font-size: 11px;
    }
    .coverage-card p {
      margin: 8px 0 0;
      color: #475569;
      font-size: 12px;
      line-height: 1.55;
    }
    .coverage-artifact {
      color: var(--ink) !important;
      font-weight: 900;
    }
    .coverage-links {
      display: grid;
      gap: 5px;
      margin-top: 12px;
    }
    .coverage-links a,
    .coverage-preview-link {
      color: var(--blue);
      font-size: 12px;
      font-weight: 900;
      text-decoration: none;
    }
    .coverage-preview-link {
      margin-top: auto;
      padding-top: 12px;
    }
    .anti-repetition-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
      padding: 0 20px 20px;
    }
    .anti-card {
      display: flex;
      min-height: 260px;
      flex-direction: column;
      border: 1px solid #dbeafe;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.94);
      padding: 14px;
    }
    .anti-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      color: var(--blue);
      font-size: 11px;
      font-weight: 900;
    }
    .anti-card-head span,
    .anti-card-head b {
      border-radius: 999px;
      background: #dbeafe;
      padding: 5px 8px;
    }
    .anti-card h3 {
      margin: 12px 0 0;
      color: var(--ink);
      font-size: 16px;
      line-height: 1.35;
    }
    .anti-card p {
      margin: 8px 0 0;
      color: #475569;
      font-size: 12px;
      line-height: 1.55;
    }
    .anti-card dl {
      display: grid;
      gap: 7px;
      margin: 12px 0 0;
      color: #334155;
      font-size: 12px;
    }
    .anti-card dl div {
      display: grid;
      gap: 2px;
    }
    .anti-card dt {
      color: var(--blue);
      font-weight: 900;
    }
    .anti-card dd {
      margin: 0;
      line-height: 1.4;
    }
    .anti-card-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: auto;
      padding-top: 12px;
    }
    .anti-card-actions a {
      border: 1px solid #bfdbfe;
      border-radius: 9px;
      background: #fff;
      padding: 9px;
      text-align: center;
      font-size: 12px;
      font-weight: 900;
    }
    .anti-card-actions a.primary {
      border-color: var(--blue);
      background: var(--blue);
      color: #fff;
    }
    .preview-index-panel .section-title {
      padding: 20px 20px 10px;
    }
    .preview-index-wrap {
      overflow-x: auto;
      padding: 0 20px 20px;
    }
    .preview-index-table {
      width: 100%;
      min-width: 760px;
      border-collapse: collapse;
      font-size: 13px;
    }
    .preview-index-table th {
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      font-size: 11px;
      text-align: left;
      text-transform: uppercase;
    }
    .preview-index-table th,
    .preview-index-table td {
      padding: 11px 10px;
      vertical-align: top;
    }
    .preview-index-table tr + tr td {
      border-top: 1px solid #f1f5f9;
    }
    .preview-index-table strong {
      display: block;
      color: var(--ink);
      font-size: 13px;
      line-height: 1.35;
    }
    .preview-index-table small {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      line-height: 1.35;
    }
    .preview-index-table a {
      font-weight: 900;
      white-space: nowrap;
    }
    .preview-index-table b {
      display: inline-flex;
      min-width: 42px;
      justify-content: center;
      border-radius: 999px;
      background: #eff6ff;
      color: var(--blue);
      padding: 5px 8px;
    }
    .preview-index-cards {
      display: none;
      gap: 10px;
      padding: 0 20px 20px;
    }
    .preview-index-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      padding: 13px;
    }
    .preview-index-card h3 {
      margin: 0;
      color: var(--ink);
      font-size: 15px;
      line-height: 1.35;
    }
    .preview-index-card p {
      margin: 7px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .preview-index-card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 9px;
    }
    .preview-index-card-meta span {
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 900;
    }
    .preview-index-card-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 11px;
    }
    .preview-index-card-actions a {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f8fafc;
      padding: 9px;
      text-align: center;
      font-size: 12px;
      font-weight: 900;
    }
    .preview-index-card-actions a.primary {
      border-color: var(--blue);
      background: var(--blue);
      color: #fff;
    }
    .footer-note {
      margin-top: 30px;
      color: var(--muted);
      font-size: 12px;
      text-align: center;
    }
    @media (max-width: 980px) {
      .hero,
      .candidate-body {
        grid-template-columns: 1fr;
      }
      .mock-grid {
        grid-template-columns: 1fr;
      }
      .lab-surface {
        grid-template-columns: 1fr;
      }
      .mock-card.detail,
      .mock-card.export {
        grid-column: auto;
        grid-row: auto;
      }
      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .ux-preview {
        position: static;
      }
      .phone {
        max-width: 420px;
      }
    }
    @media (max-width: 640px) {
      .page { padding: 18px 10px 60px; }
      .hero { display: block; }
      .metrics { margin-top: 16px; }
      .summary-grid,
      .metrics,
      .priority-panel,
      .selection-summary,
      .selection-p0-links,
      .source-lead-grid,
      .conversion-grid,
      .review-grid {
        grid-template-columns: 1fr;
      }
      .priority-links {
        grid-template-columns: 1fr;
      }
      .selection-table-wrap {
        display: none;
      }
      .selection-review-cards {
        display: grid;
      }
      .anti-repetition-grid {
        grid-template-columns: 1fr;
        padding: 0 14px 16px;
      }
      .coverage-grid {
        grid-template-columns: 1fr;
        padding: 0 14px 16px;
      }
      .coverage-panel .section-title {
        padding: 16px 14px 8px;
      }
      .selection-review-scores {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .preview-index-panel .section-title {
        padding: 16px 14px 8px;
      }
      .preview-index-wrap {
        padding: 0 14px 16px;
      }
      .preview-index-table {
        min-width: 700px;
      }
      .preview-index-wrap {
        display: none;
      }
      .preview-index-cards {
        display: grid;
        padding: 0 14px 16px;
      }
      .lab-toolbar {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .lab-detail dl div,
      .lab-row {
        grid-template-columns: 1fr;
      }
      .candidate-head {
        grid-template-columns: 1fr;
      }
      .score {
        width: 100%;
        height: auto;
        min-height: 62px;
      }
      .source-dl div,
      .flow-item dl div {
        grid-template-columns: 1fr;
        gap: 2px;
      }
      .candidate-body,
      .candidate-head {
        padding: 14px;
      }
      .phone {
        border-radius: 16px;
        box-shadow: inset 0 0 0 4px #111827, 0 14px 28px rgba(15, 23, 42, 0.1);
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div>
        <span class="eyebrow">Flow UX Candidate File</span>
        <h1>사용자 검토를 반영한 Flow UX 후보 비교안</h1>
        <p>
          2026-06-03 사용자 검토 점수와 원문 품질 의견을 반영했습니다. 대표 후보를 위로 올리고,
          AI 느낌, 원문 불명확, 범위 과다 후보는 조건부/보류로 낮췄습니다. 각 카드에서 원문 링크,
          Flow 변환, My Flow 적용, 사용자 검토 반영 내용을 같이 비교할 수 있습니다.
          localhost 없이 열리는 정적 HTML입니다.
        </p>
      </div>
      <div class="metrics">
      <div class="metric"><span>검증 후보</span><strong>${displayCandidates.length}개</strong></div>
      <div class="metric"><span>대표 P0</span><strong>${representativeKoreanFlowContentIds.length}개</strong></div>
      <div class="metric"><span>사용자 4.5+</span><strong>${displayCandidates.filter((candidate) => reviewFor(candidate).userScore >= 4.5).length}개</strong></div>
        <div class="metric"><span>생성 시각</span><strong>${escapeHtml(generatedAt.slice(0, 10))}</strong></div>
      </div>
    </section>

    <nav class="summary-grid" aria-label="UX 후보 바로가기">
      ${patternCards}
      <a class="summary-card" href="#creator-interaction-candidates">
        <span>제작자 상호작용 후보</span>
        <strong>8개</strong>
        <p>댓글/공감/조회/자료 요청이 보이는 원문을 FlowMe UI 형태로 검토합니다.</p>
      </a>
    </nav>

    ${coveragePanel}

    ${antiRepetitionPanel}

    ${latestDiversificationPanel}

    ${creatorSourceBreadthPanel}

    ${previewIndexPanel}

    ${representativePanel}

    ${selectionAuditPanel}

    ${additionalSourceLeadPanel}

    ${groupedSections}

    ${creatorInteractionEmbed}

    <p class="footer-note">
      Generated from lib/flow/korean-flow-content-candidates.ts, source refresh overlays, and creator interaction candidate HTML at ${escapeHtml(generatedAt)}.
      원문 링크는 비교 검토용이며, 민감 영역은 공식 기준/전문가 판단과 분리해야 합니다.
    </p>
  </main>
</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf8');
fs.mkdirSync(previewDir, { recursive: true });
sortedCandidates.forEach((candidate) => {
  fs.writeFileSync(
    path.join(previewDir, `${candidate.id}.html`),
    renderAppLikeStandalonePreview(candidate),
    'utf8',
  );
});
console.log(
  `Wrote ${path.relative(root, outputPath)} and ${sortedCandidates.length} candidate previews`,
);
