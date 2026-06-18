import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  koreanFlowContentCandidates,
  type KoreanFlowContentCandidate,
} from '../../lib/flow/korean-flow-content-candidates';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputPath = path.join(
  root,
  'docs/content-audit/2026-06-06-flow-content-ui-evaluation.html',
);

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

type UiKind = 'timeline' | 'routine' | 'sheet' | 'decision' | 'study' | 'task' | 'challenge';
type Priority = 'P0' | 'P1' | 'P2' | 'OK';

type Audit = {
  kind: UiKind;
  priority: Priority;
  fit: '좋음' | '보통' | '낮음';
  issue: string;
  direction: string;
};

const audits: Record<string, Audit> = {
  'washer-tub-clean-monthly': {
    kind: 'routine',
    priority: 'P1',
    fit: '보통',
    issue: '월 1회 관리인데 요일 반복처럼 보이면 어색하다.',
    direction: '마지막 실행일, 다음 실행일, 내부 체크 3개를 한 카드에 둔다.',
  },
  'lg-aircon-filter-biweekly': {
    kind: 'routine',
    priority: 'P1',
    fit: '보통',
    issue: '2주 청소와 6개월 교체가 같은 행으로 보이면 주기 차이가 약하다.',
    direction: '2주 청소 루틴과 6개월 교체 루틴을 분리한다.',
  },
  'air-purifier-filter-seasonal': {
    kind: 'routine',
    priority: 'P1',
    fit: '보통',
    issue: '계절 점검과 교체 결정이 한 리스트에 섞인다.',
    direction: '계절 점검판과 교체 필요 상태를 분리한다.',
  },
  'robot-vacuum-monthly-care': {
    kind: 'routine',
    priority: 'P1',
    fit: '보통',
    issue: '매주, 매월 작업이 같은 레벨로 보인다.',
    direction: '주간 관리와 월간 관리를 그룹으로 나눈다.',
  },
  'humidifier-daily-weekly-clean': {
    kind: 'routine',
    priority: 'P1',
    fit: '보통',
    issue: '매일, 주간, 월간 작업이 한 리스트에 있다.',
    direction: '오늘, 이번 주, 이번 달 그룹으로 나눈다.',
  },
  'water-purifier-filter-cycle': {
    kind: 'sheet',
    priority: 'P0',
    fit: '보통',
    issue: '필터명, 마지막 교체일, 다음 교체일 컬럼이 필요하다.',
    direction: '필터명, 주기, 마지막 교체일, 다음 교체일, 상태 표로 보여준다.',
  },
  'monstera-care-routine': {
    kind: 'routine',
    priority: 'P0',
    fit: '낮음',
    issue: '물주기는 완료보다 보류 판단이 중요하다.',
    direction: '물주기/보류 segmented action과 관찰 메모를 둔다.',
  },
  'stuckyi-overwater-prevention': {
    kind: 'routine',
    priority: 'P0',
    fit: '낮음',
    issue: '과습 방지는 “하지 않기”가 핵심인데 일반 완료 루틴처럼 보인다.',
    direction: '오늘 물주지 않음 상태와 보류 사유 UI를 둔다.',
  },
  'cat-litter-box-clean': {
    kind: 'routine',
    priority: 'P1',
    fit: '보통',
    issue: '매일, 주간, 전체 교체 주기가 구분되지 않는다.',
    direction: 'daily, weekly, replace 그룹을 나눈다.',
  },
  'puppy-vaccination-schedule': {
    kind: 'timeline',
    priority: 'P1',
    fit: '보통',
    issue: '접종 기록, 다음 예약, 매년 반복이 한 흐름에 있다.',
    direction: '접종 기록 카드, 다음 예약, 연간 반복을 분리한다.',
  },
  'wedding-12-month-timeline': {
    kind: 'timeline',
    priority: 'P1',
    fit: '보통',
    issue: '결혼 준비다운 월별 여정, 업체 비교, 계약 메모가 약하다.',
    direction: 'D-12부터 D-day까지 월별 rail과 업체 비교 sheet 진입을 둔다.',
  },
  'moving-d30-checklist': {
    kind: 'timeline',
    priority: 'P1',
    fit: '보통',
    issue: '이사 당일/이후 일정과 예약 항목이 같은 밀도다.',
    direction: 'D-30, D-14, D-7, D+1 날짜 그룹과 예약 상태를 둔다.',
  },
  'after-move-address-report': {
    kind: 'task',
    priority: 'OK',
    fit: '좋음',
    issue: '행정 체크로 단순해서 현재 방향이 비교적 맞다.',
    direction: '공식 링크와 준비물만 상세에 유지한다.',
  },
  'travel-d7-checklist': {
    kind: 'timeline',
    priority: 'P1',
    fit: '보통',
    issue: '여행 준비물과 D-day timeline이 섞인다.',
    direction: 'D-7 timeline과 짐/앱/서류 checklist를 이중 구조로 둔다.',
  },
  'japan-trip-packing': {
    kind: 'task',
    priority: 'OK',
    fit: '좋음',
    issue: '단순 체크리스트로 맞지만 선택형 항목은 별도 컨트롤이 있으면 좋다.',
    direction: '통신/결제 같은 선택 항목만 segmented control로 보여준다.',
  },
  'baby-food-four-week-menu': {
    kind: 'sheet',
    priority: 'P0',
    fit: '낮음',
    issue: '식단표인데 일별 메뉴와 반응 기록이 보이지 않는다.',
    direction: '4주 식단 calendar/table과 반응 메모 접힘 영역을 둔다.',
  },
  'child-weekend-play-rotation': {
    kind: 'routine',
    priority: 'P1',
    fit: '보통',
    issue: '로테이션 후보 고르기 UI가 약하다.',
    direction: '이번 주 놀이, 다음 후보, 아이 반응 구조로 둔다.',
  },
  'picture-book-reading-routine': {
    kind: 'routine',
    priority: 'P1',
    fit: '보통',
    issue: '질문 카드가 실행판에서 잘 드러나지 않는다.',
    direction: '읽기 전/중/후 질문 카드를 강조한다.',
  },
  'homelearn-reading-challenge': {
    kind: 'sheet',
    priority: 'P0',
    fit: '낮음',
    issue: '책 목록인데 책 제목, 상태, 읽은 날, 다음 책이 표로 보이지 않는다.',
    direction: '책 제목, 상태, 읽은 날, 다음 책 표로 구성한다.',
  },
  'plank-30-day-challenge': {
    kind: 'challenge',
    priority: 'P2',
    fit: '보통',
    issue: '30일 챌린지인데 후보 데이터가 4개뿐이라 그리드가 약하다.',
    direction: 'Day 1~30 축약 그리드 또는 샘플 일자 확장을 보여준다.',
  },
  'computer-license-2nd-written': {
    kind: 'study',
    priority: 'P2',
    fit: '보통',
    issue: 'CBT 링크, 오답, 점수 기록이 약하다.',
    direction: '회차, 점수, 오답 유형, 재시도일 필드를 둔다.',
  },
  'korean-history-3-week': {
    kind: 'study',
    priority: 'P2',
    fit: '보통',
    issue: '주차별 범위와 기출 회차가 약하다.',
    direction: '주차별 범위와 기출 회차 기록을 둔다.',
  },
  'used-car-buying-check': {
    kind: 'decision',
    priority: 'P1',
    fit: '보통',
    issue: '구매/보류/거절 버튼은 있지만 후보 차량 비교표가 없다.',
    direction: '차량 후보 row, 점검 체크, 최종 결정을 한 화면에 둔다.',
  },
  'car-cabin-filter-replace': {
    kind: 'routine',
    priority: 'P1',
    fit: '보통',
    issue: '단발 교체 절차와 6개월 반복이 섞인다.',
    direction: '오늘 교체 절차와 다음 교체 루틴 저장을 분리한다.',
  },
  'car-maintenance-schedule': {
    kind: 'sheet',
    priority: 'P0',
    fit: '낮음',
    issue: '주행거리, 마지막 교체 km, 다음 교체 기준이 없다.',
    direction: '소모품, 마지막 교체, 현재 km, 다음 기준, 상태 표로 둔다.',
  },
  'vehicle-inspection-prep': {
    kind: 'timeline',
    priority: 'P1',
    fit: '보통',
    issue: '검사 기간 확인은 공식 기간과 예약 CTA가 중요하다.',
    direction: '만료일 입력, 검사 가능 기간, 예약 체크를 둔다.',
  },
  'monthly-budget-close': {
    kind: 'sheet',
    priority: 'P0',
    fit: '낮음',
    issue: '금액, 카테고리, 이번달/다음달 구조가 없다.',
    direction: '고정비, 변동비, 저축 row와 금액 입력을 둔다.',
  },
  'emergency-fund-account': {
    kind: 'routine',
    priority: 'P0',
    fit: '낮음',
    issue: '통장 만들기는 체크이고 월급일 자동이체는 루틴이다.',
    direction: '초기 설정 checklist와 월급일 루틴을 분리한다.',
  },
  'passport-issue-prep': {
    kind: 'task',
    priority: 'OK',
    fit: '좋음',
    issue: '체크리스트 성격이 명확하다.',
    direction: '성인/미성년자 분기만 접힘 처리한다.',
  },
  'dog-adoption-first-week': {
    kind: 'timeline',
    priority: 'P1',
    fit: '보통',
    issue: '첫 주 타임라인과 준비물 체크가 섞인다.',
    direction: '입양 전, 입양 직후, 첫 주 그룹으로 나눈다.',
  },
  'regular-aircon-clean-home': {
    kind: 'routine',
    priority: 'P1',
    fit: '보통',
    issue: '셀프 청소 절차와 반복 루틴이 섞인다.',
    direction: '청소 절차 stepper와 다음 청소 알림을 분리한다.',
  },
};

const fallbackAudit = (candidate: KoreanFlowContentCandidate): Audit => {
  if (candidate.structure === 'challenge') {
    return { kind: 'challenge', priority: 'P2', fit: '보통', issue: '챌린지 밀도 확인 필요', direction: '일자별 수행 그리드를 점검한다.' };
  }
  if (candidate.structure === 'table_plan' || candidate.destination === 'sheet') {
    return { kind: 'sheet', priority: 'P0', fit: '낮음', issue: '시트 컬럼 확인 필요', direction: '표 컬럼을 원문 구조에 맞춘다.' };
  }
  if (candidate.destination === 'routine') {
    return { kind: 'routine', priority: 'P1', fit: '보통', issue: '반복 주기 확인 필요', direction: '주기와 다음 실행일을 명확히 둔다.' };
  }
  if (candidate.structure === 'timeline') {
    return { kind: 'timeline', priority: 'P1', fit: '보통', issue: '날짜 흐름 확인 필요', direction: '날짜 그룹과 현재 구간을 강조한다.' };
  }
  return { kind: 'task', priority: 'OK', fit: '좋음', issue: '기본 체크리스트', direction: '체크 항목과 상세 메모를 유지한다.' };
};

const auditFor = (candidate: KoreanFlowContentCandidate) => audits[candidate.id] ?? fallbackAudit(candidate);

const kindLabel: Record<UiKind, string> = {
  timeline: '타임라인',
  routine: '루틴',
  sheet: '시트',
  decision: '결정',
  study: '공부',
  task: '체크',
  challenge: '챌린지',
};

const previewHrefFor = (candidate: KoreanFlowContentCandidate) =>
  `flow-content-ux-candidates-previews/${candidate.id}.html`;

const sample = <T,>(values: T[], length: number) => {
  if (values.length >= length) return values.slice(0, length);
  return [...values, ...values].slice(0, length);
};

const renderTimelineMock = (candidate: KoreanFlowContentCandidate) => `
  <div class="mock timeline-mock">
    <div class="mock-top"><strong>월별 여정</strong><span>현재 구간 강조</span></div>
    ${candidate.flowItems
      .map(
        (item, index) => `
          <div class="timeline-line ${index === 0 ? 'active' : ''}">
            <span>${escapeHtml(item.schedule)}</span>
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.completion)}</p>
            </div>
          </div>
        `,
      )
      .join('')}
  </div>
`;

const renderRoutineMock = (candidate: KoreanFlowContentCandidate, audit: Audit) => `
  <div class="mock routine-mock">
    <div class="mock-top"><strong>반복 관리판</strong><span>다음 실행 중심</span></div>
    <div class="routine-next">
      <span>다음 실행</span>
      <strong>${escapeHtml(candidate.flowItems[0]?.schedule ?? '반복 주기')}</strong>
      <p>${escapeHtml(audit.direction)}</p>
    </div>
    <div class="routine-actions">
      <button>완료</button><button>보류</button><button>교체 필요</button>
    </div>
    ${candidate.flowItems
      .slice(0, 3)
      .map((item) => `<label><input type="checkbox" /> <span>${escapeHtml(item.title)}</span></label>`)
      .join('')}
  </div>
`;

const sheetColumnsById: Record<string, string[]> = {
  'water-purifier-filter-cycle': ['필터명', '주기', '마지막 교체일', '다음 교체일', '상태'],
  'baby-food-four-week-menu': ['주차', '메뉴/재료', '새 재료', '반응 메모', '상태'],
  'homelearn-reading-challenge': ['책 제목', '상태', '읽은 날', '다음 책', '메모'],
  'car-maintenance-schedule': ['소모품', '마지막 교체', '현재 km', '다음 기준', '상태'],
  'monthly-budget-close': ['분류', '이번 달 금액', '전월 대비', '다음 달 조정', '상태'],
};

const renderSheetMock = (candidate: KoreanFlowContentCandidate) => {
  const columns = sheetColumnsById[candidate.id] ?? ['항목', '주기', '기록', '다음 일정', '상태'];
  return `
    <div class="mock sheet-mock">
      <div class="mock-top"><strong>시트 미리보기</strong><span>${columns.join(' / ')}</span></div>
      <div class="sheet-table">
        <div class="sheet-row head">${columns.map((column) => `<span>${escapeHtml(column)}</span>`).join('')}</div>
        ${candidate.flowItems
          .slice(0, 3)
          .map(
            (item) => `
              <div class="sheet-row">
                ${columns
                  .map((column, index) => {
                    const value = index === 0 ? item.title : index === 1 ? item.schedule : index === columns.length - 1 ? item.completion : '사용자 입력';
                    return `<span>${escapeHtml(value)}</span>`;
                  })
                  .join('')}
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
};

const renderDecisionMock = (candidate: KoreanFlowContentCandidate) => `
  <div class="mock decision-mock">
    <div class="mock-top"><strong>후보 비교와 결정</strong><span>구매/보류/거절</span></div>
    <div class="candidate-row">
      <strong>후보 차량 A</strong><span>방문 전</span><span>보험이력 확인 전</span>
    </div>
    <div class="decision-buttons"><button>구매</button><button>보류</button><button>거절</button></div>
    ${candidate.flowItems
      .map((item) => `<label><input type="checkbox" /> <span>${escapeHtml(item.title)}</span></label>`)
      .join('')}
  </div>
`;

const renderStudyMock = (candidate: KoreanFlowContentCandidate) => `
  <div class="mock study-mock">
    <div class="mock-top"><strong>공부 기록판</strong><span>점수/오답</span></div>
    <div class="study-grid">
      <div><span>회차</span><strong>1회</strong></div>
      <div><span>점수</span><strong>사용자 입력</strong></div>
      <div><span>오답</span><strong>유형 선택</strong></div>
    </div>
    ${candidate.flowItems
      .map((item) => `<label><input type="checkbox" /> <span>${escapeHtml(item.schedule)} · ${escapeHtml(item.title)}</span></label>`)
      .join('')}
  </div>
`;

const renderTaskMock = (candidate: KoreanFlowContentCandidate) => `
  <div class="mock task-mock">
    <div class="mock-top"><strong>체크리스트</strong><span>빠른 완료</span></div>
    ${candidate.flowItems
      .map(
        (item) => `
          <label class="task-line">
            <input type="checkbox" />
            <span>${escapeHtml(item.schedule)}</span>
            <strong>${escapeHtml(item.title)}</strong>
          </label>
        `,
      )
      .join('')}
  </div>
`;

const renderChallengeMock = (candidate: KoreanFlowContentCandidate) => {
  const days = sample(candidate.flowItems, 12);
  return `
    <div class="mock challenge-mock">
      <div class="mock-top"><strong>30일 진행판</strong><span>축약 그리드</span></div>
      <div class="day-grid">
        ${days
          .map((item, index) => `<div class="${index === 0 ? 'active' : ''}"><span>Day ${index + 1}</span><strong>${escapeHtml(item.title)}</strong></div>`)
          .join('')}
      </div>
    </div>
  `;
};

const renderMock = (candidate: KoreanFlowContentCandidate, audit: Audit) => {
  if (audit.kind === 'timeline') return renderTimelineMock(candidate);
  if (audit.kind === 'routine') return renderRoutineMock(candidate, audit);
  if (audit.kind === 'sheet') return renderSheetMock(candidate);
  if (audit.kind === 'decision') return renderDecisionMock(candidate);
  if (audit.kind === 'study') return renderStudyMock(candidate);
  if (audit.kind === 'challenge') return renderChallengeMock(candidate);
  return renderTaskMock(candidate);
};

const priorityRank: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, OK: 3 };
const candidates = [...koreanFlowContentCandidates].sort((a, b) => {
  const auditDiff = priorityRank[auditFor(a).priority] - priorityRank[auditFor(b).priority];
  if (auditDiff !== 0) return auditDiff;
  return b.fitScore - a.fitScore;
});

const summary = candidates.reduce(
  (acc, candidate) => {
    const audit = auditFor(candidate);
    acc.total += 1;
    acc.priority[audit.priority] = (acc.priority[audit.priority] ?? 0) + 1;
    acc.kind[audit.kind] = (acc.kind[audit.kind] ?? 0) + 1;
    return acc;
  },
  {
    total: 0,
    priority: {} as Record<Priority, number>,
    kind: {} as Record<UiKind, number>,
  },
);

const candidateCards = candidates
  .map((candidate) => {
    const audit = auditFor(candidate);
    return `
      <article class="candidate-card" data-kind="${audit.kind}" data-priority="${audit.priority}" id="${escapeHtml(candidate.id)}">
        <section class="candidate-info">
          <div class="card-head">
            <div>
              <span class="category">${escapeHtml(candidate.category)}</span>
              <h2>${escapeHtml(candidate.title)}</h2>
            </div>
            <span class="priority ${audit.priority.toLowerCase()}">${audit.priority}</span>
          </div>
          <p class="need">${escapeHtml(candidate.userNeed)}</p>
          <dl>
            <div><dt>현재 문제</dt><dd>${escapeHtml(audit.issue)}</dd></div>
            <div><dt>수정 방향</dt><dd>${escapeHtml(audit.direction)}</dd></div>
            <div><dt>UI 타입</dt><dd>${escapeHtml(kindLabel[audit.kind])} · ${escapeHtml(audit.fit)}</dd></div>
          </dl>
          <div class="link-row">
            <a href="${escapeHtml(candidate.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기 ↗</a>
            <a href="${escapeHtml(previewHrefFor(candidate))}" target="_blank" rel="noreferrer">현재 프리뷰 ↗</a>
          </div>
        </section>
        <section class="candidate-preview">
          ${renderMock(candidate, audit)}
        </section>
        <section class="candidate-eval" data-eval="${escapeHtml(candidate.id)}">
          <h3>내 평가</h3>
          <label class="check"><input type="checkbox" data-field="hasProblem" /> 문제 있음</label>
          <div class="score-buttons" role="group" aria-label="${escapeHtml(candidate.title)} 점수">
            ${[1, 2, 3, 4, 5].map((score) => `<button type="button" data-score="${score}">${score}</button>`).join('')}
          </div>
          <textarea data-field="memo" placeholder="왜 맞거나 안 맞는지 메모"></textarea>
          <div class="eval-state"><span data-saved>저장 전</span></div>
        </section>
      </article>
    `;
  })
  .join('');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Flow 콘텐츠 UI 평가판</title>
  <style>
    :root {
      --bg: #f6f7f9;
      --surface: #fff;
      --ink: #111827;
      --muted: #667085;
      --line: #e5e7eb;
      --blue: #2563eb;
      --blue-soft: #eff6ff;
      --green: #047857;
      --green-soft: #ecfdf5;
      --amber: #b45309;
      --amber-soft: #fffbeb;
      --red: #b91c1c;
      --red-soft: #fef2f2;
      --purple: #6d28d9;
      --purple-soft: #f5f3ff;
      --shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
      letter-spacing: 0;
    }
    a { color: var(--blue); text-decoration: none; font-weight: 850; }
    button, textarea, input { font: inherit; }
    .page { max-width: 1360px; margin: 0 auto; padding: 28px 16px 72px; }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 18px;
      align-items: stretch;
    }
    .hero-main, .summary-panel, .toolbar, .candidate-card {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .hero-main { padding: 24px; }
    .hero-main span { color: var(--blue); font-size: 13px; font-weight: 950; }
    h1 { margin: 8px 0 12px; font-size: clamp(34px, 5vw, 58px); line-height: 1.05; }
    .hero-main p { margin: 0; max-width: 860px; color: #344054; font-size: 16px; }
    .summary-panel { padding: 18px; display: grid; gap: 10px; }
    .summary-panel div {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #f8fafc;
      padding: 10px;
    }
    .summary-panel span { color: var(--muted); font-size: 12px; font-weight: 850; }
    .summary-panel strong { font-size: 20px; }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 5;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      margin: 18px 0;
      padding: 12px;
    }
    .filters { display: flex; flex-wrap: wrap; gap: 7px; }
    .filters button, .export-btn {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fff;
      color: #344054;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
    }
    .filters button.active, .export-btn { border-color: var(--blue); background: var(--blue); color: #fff; }
    .cards { display: grid; gap: 14px; }
    .candidate-card {
      display: grid;
      grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 1.2fr) 260px;
      gap: 14px;
      padding: 14px;
      scroll-margin-top: 82px;
    }
    .candidate-card.is-hidden { display: none; }
    .candidate-info, .candidate-preview, .candidate-eval {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      padding: 14px;
    }
    .candidate-preview { background: #fbfcff; }
    .card-head { display: flex; justify-content: space-between; gap: 10px; align-items: start; }
    .category { color: var(--muted); font-size: 12px; font-weight: 900; }
    h2 { margin: 5px 0 0; font-size: 22px; line-height: 1.22; }
    .priority {
      border-radius: 999px;
      padding: 6px 9px;
      font-size: 12px;
      font-weight: 950;
      white-space: nowrap;
    }
    .priority.p0 { background: var(--red-soft); color: var(--red); }
    .priority.p1 { background: var(--amber-soft); color: var(--amber); }
    .priority.p2 { background: var(--blue-soft); color: var(--blue); }
    .priority.ok { background: var(--green-soft); color: var(--green); }
    .need { margin: 10px 0 0; color: #344054; font-size: 14px; }
    dl { display: grid; gap: 9px; margin: 14px 0 0; }
    dl div { display: grid; grid-template-columns: 74px minmax(0, 1fr); gap: 8px; }
    dt { color: var(--muted); font-size: 12px; font-weight: 950; }
    dd { margin: 0; color: #344054; font-size: 13px; }
    .link-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; font-size: 13px; }
    .mock {
      border: 1px solid #dbeafe;
      border-radius: 12px;
      background: #fff;
      padding: 12px;
    }
    .mock-top { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
    .mock-top strong { font-size: 15px; }
    .mock-top span { color: var(--blue); font-size: 12px; font-weight: 900; }
    .timeline-line {
      display: grid;
      grid-template-columns: 82px minmax(0, 1fr);
      gap: 10px;
      border-left: 2px solid #bfdbfe;
      padding: 0 0 12px 13px;
      margin-left: 8px;
    }
    .timeline-line span {
      border-radius: 999px;
      background: #fff;
      color: var(--blue);
      font-size: 12px;
      font-weight: 950;
    }
    .timeline-line.active div { border-color: #93c5fd; background: var(--blue-soft); }
    .timeline-line div, .candidate-row {
      border: 1px solid var(--line);
      border-radius: 9px;
      background: #fff;
      padding: 9px;
    }
    .timeline-line strong, .mock label span, .sheet-row span, .candidate-row strong { font-size: 13px; }
    .timeline-line p, .routine-next p, .sheet-row span, .study-grid span { margin: 4px 0 0; color: var(--muted); font-size: 12px; }
    .routine-next { border: 1px solid #bbf7d0; border-radius: 10px; background: var(--green-soft); padding: 10px; }
    .routine-next span { color: var(--green); font-size: 12px; font-weight: 950; }
    .routine-next strong { display: block; margin-top: 4px; }
    .routine-actions, .decision-buttons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin: 10px 0; }
    .routine-actions button, .decision-buttons button {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 8px;
      font-size: 12px;
      font-weight: 900;
    }
    .routine-actions button:first-child, .decision-buttons button:first-child { background: var(--green-soft); color: var(--green); border-color: #bbf7d0; }
    .decision-buttons button:nth-child(2) { background: var(--amber-soft); color: var(--amber); border-color: #fde68a; }
    .decision-buttons button:nth-child(3) { background: var(--red-soft); color: var(--red); border-color: #fecaca; }
    .mock label {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 9px;
      margin-top: 7px;
    }
    .sheet-table { overflow: hidden; border: 1px solid var(--line); border-radius: 10px; }
    .sheet-row { display: grid; grid-template-columns: repeat(5, minmax(90px, 1fr)); border-bottom: 1px solid #eef2f7; }
    .sheet-row:last-child { border-bottom: 0; }
    .sheet-row.head { background: #f8fafc; font-weight: 950; }
    .sheet-row span { padding: 8px; border-right: 1px solid #eef2f7; }
    .sheet-row span:last-child { border-right: 0; }
    .study-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-bottom: 10px; }
    .study-grid div { border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 9px; }
    .study-grid strong { display: block; font-size: 13px; }
    .task-line {
      display: grid !important;
      grid-template-columns: 20px 74px minmax(0, 1fr);
      align-items: center !important;
    }
    .task-line span { color: var(--blue); font-weight: 950; }
    .day-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
    .day-grid div { min-height: 74px; border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 8px; }
    .day-grid .active { border-color: #93c5fd; background: var(--blue-soft); }
    .day-grid span { color: var(--blue); font-size: 11px; font-weight: 950; }
    .day-grid strong { display: block; margin-top: 5px; font-size: 12px; line-height: 1.3; }
    .candidate-eval h3 { margin: 0 0 10px; font-size: 17px; }
    .check { display: inline-flex; gap: 7px; align-items: center; font-size: 13px; font-weight: 850; }
    .score-buttons { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 12px 0; }
    .score-buttons button {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 8px 0;
      font-weight: 950;
      cursor: pointer;
    }
    .score-buttons button.active { border-color: var(--blue); background: var(--blue); color: #fff; }
    textarea {
      width: 100%;
      min-height: 112px;
      resize: vertical;
      border: 1px solid var(--line);
      border-radius: 9px;
      padding: 10px;
      color: #344054;
      font-size: 13px;
    }
    .eval-state { margin-top: 8px; color: var(--muted); font-size: 12px; }
    @media (max-width: 1080px) {
      .hero, .candidate-card { grid-template-columns: 1fr; }
      .toolbar { position: static; }
    }
    @media (max-width: 640px) {
      .page { padding: 14px 8px 50px; }
      .hero-main, .summary-panel, .toolbar, .candidate-card { border-radius: 10px; }
      h1 { font-size: 34px; }
      .candidate-card { padding: 8px; }
      .candidate-info, .candidate-preview, .candidate-eval { padding: 12px; }
      dl div { grid-template-columns: 1fr; gap: 3px; }
      .sheet-table { overflow-x: auto; }
      .sheet-row { min-width: 640px; }
      .day-grid { grid-template-columns: repeat(2, 1fr); }
      .routine-actions, .decision-buttons, .study-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="hero-main">
        <span>Flow Content UI Evaluation</span>
        <h1>콘텐츠별 Flow UI 적합성 평가판</h1>
        <p>각 콘텐츠가 어떤 UI로 보여야 하는지 실제 미니 프리뷰로 비교합니다. 점수, 문제 있음, 메모는 이 브라우저에 자동 저장되며 JSON으로 내보낼 수 있습니다.</p>
      </div>
      <aside class="summary-panel">
        <div><span>전체 후보</span><strong>${summary.total}</strong></div>
        <div><span>P0 수정</span><strong>${summary.priority.P0 ?? 0}</strong></div>
        <div><span>P1 수정</span><strong>${summary.priority.P1 ?? 0}</strong></div>
        <div><span>OK/낮은 우선순위</span><strong>${(summary.priority.OK ?? 0) + (summary.priority.P2 ?? 0)}</strong></div>
      </aside>
    </section>

    <nav class="toolbar" aria-label="필터와 내보내기">
      <div class="filters">
        <button class="active" type="button" data-filter="all">전체</button>
        <button type="button" data-filter="P0">P0</button>
        <button type="button" data-filter="P1">P1</button>
        <button type="button" data-filter="sheet">시트</button>
        <button type="button" data-filter="routine">루틴</button>
        <button type="button" data-filter="timeline">타임라인</button>
        <button type="button" data-filter="decision">결정</button>
      </div>
      <button class="export-btn" type="button" id="export-json">평가 JSON 내보내기</button>
    </nav>

    <section class="cards">
      ${candidateCards}
    </section>
  </main>
  <script>
    const storageKey = 'flow-content-ui-evaluation-v1';
    const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const save = () => localStorage.setItem(storageKey, JSON.stringify(state, null, 2));

    document.querySelectorAll('[data-eval]').forEach((panel) => {
      const id = panel.getAttribute('data-eval');
      state[id] = state[id] || {};
      const saved = panel.querySelector('[data-saved]');
      const problem = panel.querySelector('[data-field="hasProblem"]');
      const memo = panel.querySelector('[data-field="memo"]');
      const scoreButtons = Array.from(panel.querySelectorAll('[data-score]'));

      problem.checked = Boolean(state[id].hasProblem);
      memo.value = state[id].memo || '';
      scoreButtons.forEach((button) => {
        button.classList.toggle('active', Number(button.dataset.score) === Number(state[id].score));
      });
      saved.textContent = state[id].updatedAt ? '저장됨 ' + state[id].updatedAt : '저장 전';

      const persist = () => {
        state[id].hasProblem = problem.checked;
        state[id].memo = memo.value;
        state[id].updatedAt = new Date().toLocaleString('ko-KR');
        saved.textContent = '저장됨 ' + state[id].updatedAt;
        save();
      };

      problem.addEventListener('change', persist);
      memo.addEventListener('input', persist);
      scoreButtons.forEach((button) => {
        button.addEventListener('click', () => {
          state[id].score = Number(button.dataset.score);
          scoreButtons.forEach((item) => item.classList.toggle('active', item === button));
          persist();
        });
      });
    });

    document.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
        document.querySelectorAll('.candidate-card').forEach((card) => {
          const show = filter === 'all' || card.dataset.kind === filter || card.dataset.priority === filter;
          card.classList.toggle('is-hidden', !show);
        });
      });
    });

    document.querySelector('#export-json').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'flow-content-ui-evaluation.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  </script>
</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Wrote ${path.relative(root, outputPath)} (${candidates.length} candidates)`);
