import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SPEC_DIR, '..', '..', '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'docs', 'content-audit');
const OUTPUT = path.join(
  CONTENT_DIR,
  '2026-07-28-flow-item-map-architecture-qualified-portfolio-fit-review-v2-ko.html',
);
const V1_SPEC_DIR = path.join(
  REPO_ROOT,
  'docs',
  'specs',
  '2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1',
);

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const readSpec = (name) => readJson(path.join(SPEC_DIR, name));

const fixture = readSpec('qualified-corpus-fixture-v2.json');
const delta = readSpec('baseline-delta-v2.json');
const readiness = readSpec('rights-and-readiness-matrix-v2.json');
const scorecard = readSpec('architecture-scorecard-v2.json');
const projections = readSpec('projection-matrix-v2.json');
const roundTrip = readSpec('round-trip-results-v2.json');
const vertical = readSpec('vertical-opportunity-appendix-v1.json');
const adjudication = readSpec('final-adjudication-v2.json');
const qualifiedPortfolio = readJson(
  path.join(CONTENT_DIR, '2026-07-27-creator-portfolio-qualified-v2.json'),
);
const historicalFixtures = [
  'bundle-triple-cappadocia-departure',
  'bundle-fitpet-puppy-vaccination',
].map((name) =>
  readJson(path.join(V1_SPEC_DIR, 'fixtures', 'canonical', `${name}.json`)),
);

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeVerdict(value = '') {
  const lower = String(value).toLowerCase();
  if (lower.includes('go') || lower.includes('ready')) return 'go';
  if (lower.includes('modify') || lower.includes('partner')) return 'modify';
  if (lower.includes('hold') || lower.includes('stop')) return 'hold';
  return 'neutral';
}

function allFlows(record) {
  return record.bundle.map.flows;
}

function allSteps(record) {
  return allFlows(record).flatMap((flow) => flow.steps);
}

function allItems(record) {
  return allFlows(record).flatMap((flow) =>
    flow.steps.flatMap((step) =>
      step.items.map((item) => ({
        ...item,
        flowId: flow.flowId,
        flowTitle: flow.title,
        stepId: step.stepId,
        stepTitle: step.title,
      })),
    ),
  );
}

function itemSchedule(item) {
  return item.schedule ?? null;
}

function scheduleText(schedule) {
  if (!schedule) return '날짜 없음';
  if (typeof schedule === 'string') return schedule;
  const parts = [];
  if (schedule.type) parts.push(schedule.type);
  if (schedule.offsetDays !== undefined) {
    parts.push(`D${schedule.offsetDays >= 0 ? '+' : ''}${schedule.offsetDays}`);
  }
  if (schedule.dayOffset !== undefined) {
    parts.push(`D${schedule.dayOffset >= 0 ? '+' : ''}${schedule.dayOffset}`);
  }
  if (schedule.dayIndex !== undefined) parts.push(`D+${schedule.dayIndex}`);
  if (schedule.day !== undefined) parts.push(`Day ${schedule.day}`);
  if (schedule.week !== undefined) parts.push(`${schedule.week}주차`);
  if (schedule.weekday) parts.push(schedule.weekday);
  if (schedule.date) parts.push(schedule.date);
  return parts.length ? parts.join(' · ') : JSON.stringify(schedule);
}

function sourceRowsForItem(record, item) {
  const ids = new Set(item.sourceRowIds ?? []);
  return record.sourceRows.filter((row) => ids.has(row.sourceRowId));
}

function firstItem(record) {
  return allItems(record)[0];
}

function firstSourceUrl(record) {
  return record.sourceRows[0]?.sourceUrl ?? record.bundle.sourceUrls?.[0] ?? '#';
}

const readinessByBundle = new Map(
  readiness.records.map((record) => [record.bundleId, record]),
);

const projectionRecords =
  projections.records ??
  projections.items ??
  projections.itemProjections ??
  projections.projectionRecords ??
  [];
const projectionByItem = new Map(
  projectionRecords
    .filter((record) => record.itemId)
    .map((record) => [record.itemId, record]),
);

const categoryLabels = {
  home_living: '집·살림',
  family_parenting: '가족·육아',
  study_reading: '공부·독서',
  money_admin_purchase: '돈·행정·구매',
  health_fitness: '건강·운동',
  travel_outings: '여행·외출',
  meals_grocery: '식사·장보기',
  work_career: '일·커리어',
  hobby_pet: '취미·반려',
};

const sourceShapeLabels = {
  date_offsets: 'D-day 역산 행',
  table_rows: '날짜·연령 표 행',
  lesson_rows: '강의·계획 행',
  procedure_rows: '순서형 절차 행',
  resource_collection: '리소스 컬렉션',
  checklist_rows: '체크리스트 행',
};

const executionLabels = {
  date_preparation: '기준일 역산 실행',
  progress_tracking: '진도 상태 관리',
  ordered_procedure: '순서형 절차',
  resource_queue: '자료 큐',
};

const artifactLabels = {
  calendar: 'Calendar',
  checklist: 'Checklist',
  todo: 'Todo',
  sheet: 'Sheet',
  memo: 'Memo',
};

const imageByCreator = {
  'home-ajd': 'creator-home-ajd-source.png',
  'family-babyfood016': 'creator-family-babyfood016-source.png',
  'study-mansour': 'creator-study-mansour-source.png',
  'study-opentutorials': 'creator-study-opentutorials-source.png',
  'money-getcha': 'creator-money-getcha-source.png',
  'health-allblanc': 'creator-health-allblanc-source.png',
  'meals-wtable': 'creator-meals-wtable-source.png',
  'work-andstudio': 'creator-work-andstudio-source.png',
};

const caseNotes = {
  'bundle-moving-d30': {
    rowUnit: '원문의 D-30·D-10·D-3·D-1·당일 체크 행',
    grouping:
      '같은 시점의 세부 원문 행을 사용자가 한 번에 완료할 수 있는 행동으로 묶습니다.',
    whyProjection:
      '이사일이라는 기준 날짜가 있으므로 Calendar가 주 결과물이고 Checklist가 완료 상태를 보조합니다.',
  },
  'bundle-baby-food-174': {
    rowUnit: 'PDF 표의 D+n 식단 한 행',
    grouping:
      '원문 날짜·메뉴 한 행이 그대로 한 Item이 되고, 3일 범위가 하나의 Step이 됩니다.',
    whyProjection:
      'D+n을 실제 날짜로 계산할 수 있어 Calendar와 Sheet가 자연스럽지만 공개는 권리·안전 경계로 Hold입니다.',
  },
  'bundle-opic-plan': {
    rowUnit: '계획표의 연습 행과 연결 영상 행',
    grouping:
      '같은 모의고사 회차의 연습·녹음·보완 행과 영상 행을 하나의 실행 Item에 연결합니다.',
    whyProjection:
      '원본 진도는 Sheet가 소유하고, 사용자가 시작일을 정한 경우에만 Calendar 일정이 생깁니다.',
  },
  'bundle-opentutorials-web1-progress': {
    rowUnit: '공개 토픽 목록의 lesson 한 행',
    grouping:
      '원문 토픽 한 행이 날짜 없는 학습 Item 한 개가 됩니다. 사용자가 다시 강의 구조를 입력하지 않습니다.',
    whyProjection:
      '원문에 날짜가 없으므로 Sheet·Checklist가 주 결과물이고 VEVENT는 만들지 않습니다.',
  },
  'bundle-new-car-comparison': {
    rowUnit: '구매 8단계 안의 세부 절차·판단 행',
    grouping:
      '예산처럼 함께 결정해야 하는 여러 원문 행은 하나의 결정 Item으로 묶고, 독립 확인은 별도 Item으로 둡니다.',
    whyProjection:
      '순서는 있지만 원문 날짜가 없으므로 Checklist·Sheet·Memo가 자연스럽고 Calendar는 만들지 않습니다.',
  },
  'bundle-allblanc-7day-abs': {
    rowUnit: '7일 챌린지의 날짜 순서가 있는 영상 한 편',
    grouping:
      '영상 한 편이 그날 실행할 Item 한 개이며 영상 안의 동작을 별도 체크 행으로 발명하지 않습니다.',
    whyProjection:
      '원문이 Day 1~7 순서를 명시하므로 시작일을 받으면 Calendar와 Checklist로 이어집니다.',
  },
  'bundle-wtable-summer-banchan-five': {
    rowUnit: '큐레이션에 포함된 레시피 한 개',
    grouping:
      '레시피 한 행이 만들기 Item 한 개가 되고, 상세 조리법은 원문 링크와 Memo에 남깁니다.',
    whyProjection:
      '원문에 조리 날짜가 없으므로 Checklist·Memo로 보며 사용자가 날짜를 선택하지 않은 상태에서 VEVENT를 만들지 않습니다.',
  },
  'bundle-andstudio-job-prep-videos': {
    rowUnit: '취업 준비 컬렉션의 영상 메타데이터 한 편',
    grouping:
      '영상 한 편이 Todo 한 개입니다. 영상 자막이나 제작자의 설명을 임의 체크리스트로 복제하지 않습니다.',
    whyProjection:
      '세 영상은 날짜 없는 자료 큐이므로 Todo·Memo가 자연스럽고 제목·URL·순서만 공개 범위로 사용합니다.',
  },
};

const currentCounts = delta.currentCorpus.counts;
const baselineCounts = delta.baseline.counts;
const normalReadiness = readiness.records.filter(
  (record) => record.includedInNormalCorpusTotals === true,
);
const boundaryReadiness = readiness.records.filter(
  (record) => record.includedInNormalCorpusTotals === false,
);

function statusMark(label, value) {
  return `<span class="status ${normalizeVerdict(value)}"><b>${esc(label)}</b>${esc(value)}</span>`;
}

function sourceImage(record) {
  const file = imageByCreator[record.creatorId];
  if (!file) return '';
  return `2026-07-27-creator-portfolio-qualified-assets/${file}`;
}

function inputList(record) {
  const fields = record.bundle.setupFields ?? [];
  if (!fields.length) {
    return '<div class="overlay-empty">사용자 입력 0개 · 원문 값 그대로 시작</div>';
  }
  return `<div class="overlay-list">${fields
    .map(
      (field) =>
        `<div><strong>${esc(field.label)}</strong><span>${esc(field.type)} · ${field.required ? '필수' : '선택'}</span></div>`,
    )
    .join('')}</div>`;
}

function sourceRowList(rows, limit = 3) {
  return `<ol class="row-list">${rows
    .slice(0, limit)
    .map(
      (row, index) => `<li>
        <span>${String(index + 1).padStart(2, '0')}</span>
        <div><strong>${esc(row.label)}</strong><small>${esc(row.detail ?? row.sourceLocator ?? '')}</small></div>
      </li>`,
    )
    .join('')}</ol>`;
}

function itemList(items, limit = 3) {
  return `<ol class="item-list">${items
    .slice(0, limit)
    .map(
      (item, index) => `<li>
        <span>${String(index + 1).padStart(2, '0')}</span>
        <div><strong>${esc(item.itemTitle)}</strong><small>${esc(scheduleText(itemSchedule(item)))} · SourceRow ${(item.sourceRowIds ?? []).length}개</small></div>
      </li>`,
    )
    .join('')}</ol>`;
}

function fieldRows(record, item) {
  const sourceRows = sourceRowsForItem(record, item);
  const schedule = itemSchedule(item);
  const rows = [
    ['itemId', item.itemId, 'required'],
    ['itemTitle', item.itemTitle, 'required'],
    ['detail / memo', item.memo ?? '—', 'required'],
    ['completionMode', item.completionMode ?? 'manual_check', 'required'],
    ['optional', String(item.optional ?? false), 'required'],
    ['schedule', schedule ? scheduleText(schedule) : 'null', schedule ? 'optional-on' : 'optional-off'],
    ['sourceRowIds', (item.sourceRowIds ?? []).join(', '), 'required'],
  ];
  return `<div class="field-table">${rows
    .map(
      ([key, value, state]) => `<div class="${state}">
        <code>${esc(key)}</code>
        <strong>${esc(value)}</strong>
      </div>`,
    )
    .join('')}
    <p>이 Item의 근거: ${sourceRows
      .map((row) => `<a href="${esc(row.sourceUrl)}">${esc(row.label)}</a>`)
      .join(' · ')}</p>
  </div>`;
}

function projectionCards(record) {
  const primary = record.taxonomy.primaryArtifact;
  const secondary = new Set(record.taxonomy.secondaryArtifacts ?? []);
  const scheduled = record.metrics.scheduledItems;
  const artifacts = ['calendar', 'checklist', 'todo', 'sheet', 'memo'];
  return `<div class="projection-cards">${artifacts
    .map((artifact) => {
      let state = 'available';
      let detail = 'adapter에서 선택 가능';
      if (artifact === primary) {
        state = 'primary';
        detail = '주 결과물';
      } else if (secondary.has(artifact)) {
        state = 'secondary';
        detail = '보조 결과물';
      }
      if (artifact === 'calendar') {
        if (scheduled) {
          detail = `VEVENT ${scheduled}개 · ${record.taxonomy.naturalCalendarPolicy}`;
          if (primary !== 'calendar' && !secondary.has('calendar')) state = 'available';
        } else {
          state = 'off';
          detail = '날짜 없음 · VEVENT 0';
        }
      }
      return `<div class="projection ${state}">
        <strong>${artifactLabels[artifact]}</strong>
        <span>${esc(detail)}</span>
      </div>`;
    })
    .join('')}</div>
    ${
      record.metrics.undatedItems
        ? '<p class="projection-note">VTODO는 지원 destination에서만 후보로 사용하며 기본값은 off입니다. Checklist·Todo·Sheet·Memo fallback을 유지합니다.</p>'
        : ''
    }`;
}

function evidenceLevel(label, count, copy, tone) {
  return `<article class="evidence-level ${tone}">
    <strong>${count}</strong>
    <div><h3>${esc(label)}</h3><p>${esc(copy)}</p></div>
  </article>`;
}

function sectionHeading(number, question, answer, copy = '') {
  return `<header class="section-heading">
    <span>${esc(number)}</span>
    <div>
      <p>${esc(question)}</p>
      <h2>${esc(answer)}</h2>
      ${copy ? `<div class="section-copy">${esc(copy)}</div>` : ''}
    </div>
  </header>`;
}

function caseSourceSlide(record, index) {
  const note = caseNotes[record.bundleId];
  const image = sourceImage(record);
  const readinessRecord = readinessByBundle.get(record.bundleId);
  return `<section class="slide case-slide source-slide" id="case-${index + 1}-source">
    <div class="wrap">
      ${sectionHeading(
        `${String(index + 1).padStart(2, '0')}A`,
        '원문이 SourceRow가 되는 방법',
        record.title,
        record.userJob,
      )}
      <div class="source-layout">
        <figure class="source-frame">
          <a href="${esc(firstSourceUrl(record))}">
            <img src="${esc(image)}" alt="${esc(record.creatorName)} 원문 근거 화면">
          </a>
          <figcaption>
            <strong>${esc(record.creatorName)}</strong>
            <span>${esc(sourceShapeLabels[record.taxonomy.sourceShape] ?? record.taxonomy.sourceShape)}</span>
          </figcaption>
        </figure>
        <div class="source-explain">
          <div class="plain-fact">
            <span>원문에서 한 줄로 보는 단위</span>
            <strong>${esc(note.rowUnit)}</strong>
          </div>
          ${sourceRowList(record.sourceRows)}
          <div class="source-count-line">
            <div><strong>${record.metrics.sourceRows}</strong><span>SourceRow</span></div>
            <i>→</i>
            <div><strong>${record.metrics.items}</strong><span>Item</span></div>
            <i>→</i>
            <div><strong>${record.metrics.steps}</strong><span>Step</span></div>
            <i>→</i>
            <div><strong>${record.metrics.flows}</strong><span>Flow</span></div>
          </div>
          <div class="overlay-panel">
            <div>
              <span>사용자가 입력하는 overlay</span>
              <p>원문에 이미 있는 값은 다시 묻지 않습니다.</p>
            </div>
            ${inputList(record)}
          </div>
          <div class="readiness-line">
            ${statusMark('Logic', readinessRecord.logicReadiness)}
            ${statusMark('Public', readinessRecord.publicReadiness)}
            ${statusMark('Rights', readinessRecord.rightsStatus)}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function caseItemSlide(record, index) {
  const note = caseNotes[record.bundleId];
  const items = allItems(record);
  return `<section class="slide case-slide data-slide" id="case-${index + 1}-data">
    <div class="wrap">
      ${sectionHeading(
        `${String(index + 1).padStart(2, '0')}B`,
        'SourceRow를 canonical 구조로 묶는 방법',
        `${record.metrics.items}개 Item으로 정리`,
        note.grouping,
      )}
      <div class="item-structure-layout">
        <div>
          <div class="mini-label">실제 Item 예시</div>
          ${itemList(items)}
        </div>
        <div class="structure-story">
          <span class="mini-label">원문이 정리되는 계층</span>
          <div class="structure-stack">
            <div class="source"><strong>${record.metrics.sourceRows}</strong><span>SourceRow</span><small>원문의 최소 근거 행</small></div>
            <b>↓</b>
            <div class="canonical"><strong>${record.metrics.items}</strong><span>Item</span><small>독립 완료 가능한 실행 단위</small></div>
            <b>↓</b>
            <div class="canonical"><strong>${record.metrics.steps}</strong><span>Step</span><small>같은 단계·시점의 Item 묶음</small></div>
            <b>↓</b>
            <div class="canonical"><strong>${record.metrics.flows}</strong><span>Flow</span><small>한 가지 사용자 job</small></div>
            <b>↓</b>
            <div class="canonical"><strong>1</strong><span>Bundle / Map</span><small>Flow 사이의 순서와 관계</small></div>
          </div>
          <p class="structure-rule">각 층은 아래 데이터를 복제하지 않고 묶는 의미만 더합니다. 완료 상태와 출처 연결은 Item에 남습니다.</p>
        </div>
      </div>
    </div>
  </section>`;
}

function caseProjectionSlide(record, index) {
  const note = caseNotes[record.bundleId];
  const item = firstItem(record);
  const readinessRecord = readinessByBundle.get(record.bundleId);
  return `<section class="slide case-slide projection-slide" id="case-${index + 1}-projection">
    <div class="wrap">
      ${sectionHeading(
        `${String(index + 1).padStart(2, '0')}C`,
        'canonical Item을 실제 도구에 보내는 방법',
        `${artifactLabels[record.taxonomy.primaryArtifact]} 중심으로 projection`,
        '같은 Item을 다시 만드는 것이 아니라 목적지에 필요한 필드만 직렬화합니다.',
      )}
      <div class="case-projection-layout">
        <div class="item-anatomy">
          <div class="mini-label">대표 canonical Item</div>
          <h3>${esc(item.itemTitle)}</h3>
          ${fieldRows(record, item)}
        </div>
        <div class="projection-explain">
          <div class="why-box">
            <span>왜 이 결과물인가</span>
            <p>${esc(note.whyProjection)}</p>
          </div>
          <div class="projection-band">
            <div>
              <span>내보낼 때만 목적지 형태로 변환</span>
              <strong>${esc(artifactLabels[record.taxonomy.primaryArtifact])} 중심</strong>
            </div>
            ${projectionCards(record)}
          </div>
          <div class="state-foot">
            <span>Architecture fit <b>${esc(readinessRecord.architectureFit)}</b></span>
            <span>Logic <b>${esc(readinessRecord.logicReadiness)}</b></span>
            <span>Public <b>${esc(readinessRecord.publicReadiness)}</b></span>
            <span>Personal <b>${esc(readinessRecord.personalConversionAvailability?.status)}</b></span>
            <span>Source <b>${esc(readinessRecord.sourceCompleteness)}</b></span>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function comparisonCase(record, emphasis) {
  const first = firstItem(record);
  return `<article class="comparison-case ${emphasis}">
    <span>${esc(record.title)}</span>
    <h3>${esc(sourceShapeLabels[record.taxonomy.sourceShape])}</h3>
    <p>${esc(first.itemTitle)}</p>
    <div class="comparison-schedule">${esc(scheduleText(first.schedule))}</div>
    <strong>${esc(artifactLabels[record.taxonomy.primaryArtifact])}</strong>
  </article>`;
}

function architectureCard(architecture, index) {
  const id = architecture.id ?? architecture.architectureId;
  const score =
    architecture.score ??
    architecture.totalScore ??
    architecture.total ??
    architecture.weightedScore ??
    0;
  const verdict =
    architecture.verdict ?? architecture.decision ?? architecture.status;
  const label =
    {
      current_canonical_v1: 'Canonical Item',
      literal_ics_first: 'Literal ICS-first',
      item_first_shared_context: 'Item + SharedContext',
    }[id] ?? architecture.label ?? id;
  const explanation =
    {
      current_canonical_v1:
        '160 Item과 210 SourceRow를 원본으로 보존하고 일정 있는 112개만 VEVENT로 보냅니다.',
      literal_ics_first:
        '날짜 없는 48개와 완료·출처 보존이 외부 VTODO·X-property 지원에 의존합니다.',
      item_first_shared_context:
        '의미는 보존하지만 공유 일정 이점이 이사 1개뿐이라 새 canonical entity가 과합니다.',
    }[id] ?? architecture.summary ?? '';
  return `<article class="architecture-summary ${normalizeVerdict(verdict)}">
    <span>${String.fromCharCode(65 + index)}</span>
    <div><h3>${esc(label)}</h3><p>${esc(explanation)}</p></div>
    <strong>${score}<small>${esc(verdict)}</small></strong>
  </article>`;
}

function readinessExample(record) {
  const content = fixture.bundles.find(
    (entry) => entry.bundleId === record.bundleId,
  );
  return `<article class="readiness-example">
    <h3>${esc(record.title)}</h3>
    <p>${esc(content?.userJob ?? record.qualificationReason ?? '')}</p>
    <div>
      ${statusMark('Architecture', record.architectureFit)}
      ${statusMark('Logic', record.logicReadiness)}
      ${statusMark('Public', record.publicReadiness)}
      ${statusMark('Rights', record.rightsStatus)}
      ${statusMark(
        'Personal',
        record.personalConversionAvailability?.status,
      )}
    </div>
  </article>`;
}

function boundarySlide(historical, state, index) {
  const flows = historical.flows ?? [];
  const items = flows.flatMap((flow) =>
    flow.steps.flatMap((step) => step.items),
  );
  return `<section class="slide boundary-slide" id="boundary-${index + 1}">
    <div class="wrap">
      ${sectionHeading(
        `B${index + 1}`,
        '데이터로 만들 수 있어도 지금 공개하면 안 되는 사례',
        historical.title,
        historical.userJob,
      )}
      <div class="boundary-layout">
        <div>
          <span class="mini-label">역사적 실제 구조</span>
          ${sourceRowList(historical.sourceRows)}
          <div class="source-count-line">
            <div><strong>${historical.sourceRows.length}</strong><span>SourceRow</span></div>
            <i>→</i>
            <div><strong>${items.length}</strong><span>Item</span></div>
            <i>→</i>
            <div><strong>${historical.taxonomy.primaryArtifact}</strong><span>후보 결과</span></div>
          </div>
        </div>
        <div class="stop-panel">
          <span>현재 gate에서 중지</span>
          <h3>${esc(state.boundaryReason)}</h3>
          <p>${esc(state.publicReason)}</p>
          <div>
            ${statusMark('Logic', state.logicReadiness)}
            ${statusMark('Public', state.publicReadiness)}
            ${statusMark('Rights', state.rightsStatus)}
            ${statusMark('Safety', state.safetyReview)}
          </div>
          <strong>승격 조건</strong>
          <p>${esc(state.promotionCondition)}</p>
          <small>Historical / boundary · 정상 8개 corpus 수치에 포함하지 않음</small>
        </div>
      </div>
    </div>
  </section>`;
}

function portfolioCard(record) {
  return `<article class="portfolio-card">
    <span>${esc(record.categoryLabel)}</span>
    <h3>${esc(record.displayName)}</h3>
    <div>
      ${statusMark('Logic', record.logicReadiness)}
      ${statusMark('Public', record.publicReadiness)}
    </div>
    <p>${record.sourceRowsReady ? 'Source rows 표시 있음' : '원문 행 추가 확보 필요'}</p>
    <small>${esc(record.selectionRole)}</small>
  </article>`;
}

function verticalContract(opportunity) {
  const mapping =
    opportunity.canonicalCategoryMapping?.canonicalLifeArea ??
    opportunity.canonicalCategory ??
    opportunity.categoryCanonical ??
    opportunity.category;
  return `<article class="future-contract">
    <div class="future-head">
      <span>${esc(opportunity.opportunityStatus ?? opportunity.status)}</span>
      <strong>SourceRow 0 · Item 0</strong>
    </div>
    <h3>${esc(opportunity.title)}</h3>
    <p>${esc(opportunity.userMoment)}</p>
    <dl>
      <div><dt>최소 입력</dt><dd>${esc(opportunity.minimumAnchor ?? opportunity.expectedInputs?.join(', ') ?? '')}</dd></div>
      <div><dt>필요 원문 행</dt><dd>${esc((opportunity.requiredSourceRows ?? []).join(' · '))}</dd></div>
      <div><dt>자연스러운 결과</dt><dd>${esc(opportunity.naturalArtifact)}</dd></div>
      <div><dt>canonical category</dt><dd>${esc(mapping)}</dd></div>
    </dl>
    <aside>${esc(opportunity.doNotBuildBoundary ?? opportunity.publicUseBoundary ?? '')}</aside>
    <small>미래 field contract · 변환 완료 아님</small>
  </article>`;
}

function fullExplorerCard(record) {
  const items = allItems(record);
  const state = readinessByBundle.get(record.bundleId);
  return `<article class="explorer-card" data-card data-schedule="${record.metrics.scheduledItems ? 'scheduled' : 'undated'}" data-public="${String(state.publicReadiness).toLowerCase()}">
    <header>
      <div><span>${esc(categoryLabels[record.taxonomy.lifeArea])}</span><h3>${esc(record.title)}</h3></div>
      <strong>${record.metrics.items} Item</strong>
    </header>
    <p>${esc(record.userJob)}</p>
    <div class="explorer-summary">
      <span>${record.metrics.sourceRows} SourceRow</span>
      <span>${record.metrics.steps} Step</span>
      <span>${record.metrics.flows} Flow</span>
      <span>${record.metrics.scheduledItems} 일정</span>
      <span>${record.metrics.undatedItems} 날짜 없음</span>
    </div>
    <details>
      <summary>전체 Item ${items.length}개 보기</summary>
      <div class="appendix-list">${items
        .map(
          (item, index) => `<div><b>${index + 1}</b><strong>${esc(item.itemTitle)}</strong><span>${esc(scheduleText(item.schedule))}</span><small>${esc((item.sourceRowIds ?? []).join(', '))}</small></div>`,
        )
        .join('')}</div>
    </details>
    <details>
      <summary>전체 SourceRow ${record.sourceRows.length}개 보기</summary>
      <div class="appendix-list">${record.sourceRows
        .map(
          (row, index) => `<div><b>${index + 1}</b><strong>${esc(row.label)}</strong><span>${esc(row.detail ?? '')}</span><small>${esc(row.sourceRowId)}</small></div>`,
        )
        .join('')}</div>
    </details>
  </article>`;
}

const byBundle = new Map(fixture.bundles.map((record) => [record.bundleId, record]));
const moving = byBundle.get('bundle-moving-d30');
const babyFood = byBundle.get('bundle-baby-food-174');
const opic = byBundle.get('bundle-opic-plan');
const web1 = byBundle.get('bundle-opentutorials-web1-progress');
const newCar = byBundle.get('bundle-new-car-comparison');
const allblanc = byBundle.get('bundle-allblanc-7day-abs');
const wtable = byBundle.get('bundle-wtable-summer-banchan-five');
const andStudio = byBundle.get('bundle-andstudio-job-prep-videos');

for (const required of [
  moving,
  babyFood,
  opic,
  web1,
  newCar,
  allblanc,
  wtable,
  andStudio,
]) {
  if (!required) throw new Error('Expanded report requires all eight Qualified v2 bundles.');
}

const movingScheduleGroups = new Map();
for (const item of allItems(moving)) {
  const key = scheduleText(item.schedule);
  const group = movingScheduleGroups.get(key) ?? [];
  group.push(item);
  movingScheduleGroups.set(key, group);
}
const movingBundleGroup = [...movingScheduleGroups.entries()].sort(
  (a, b) => b[1].length - a[1].length,
)[0];

const portfolioCategoryOrder = [
  'home_living',
  'family_parenting',
  'study_reading',
  'money_admin_purchase',
  'health_fitness',
  'travel_outings',
  'meals_grocery',
  'work_career',
  'hobby_pet',
];
const portfolioGroups = portfolioCategoryOrder.map((categoryId) =>
  qualifiedPortfolio.qualificationRecords.filter(
    (record) => record.categoryId === categoryId,
  ),
);

const verticalPairs = [];
for (let index = 0; index < vertical.opportunities.length; index += 2) {
  verticalPairs.push(vertical.opportunities.slice(index, index + 2));
}

const architectureRecords =
  scorecard.architectures ?? scorecard.records ?? scorecard.options ?? [];
const projectionSummary = projections.summary ?? {};
const roundTripSummary = roundTrip.summary ?? {};
const finalDecision =
  adjudication.decision ===
  'keep_current_canonical_v1_add_projection_time_grouping'
    ? 'Canonical Item 유지 + 내보낼 때만 묶기'
    : adjudication.decision;

const sourceShapeStories = [
  {
    number: '01',
    title: 'D-day 역산 행',
    copy: '여러 원문 행을 같은 시점의 실행 Item으로 묶습니다.',
    examples: '이사 D-30',
    route: 'date_offsets → Calendar',
  },
  {
    number: '02',
    title: '날짜·연령 표 행',
    copy: '표의 한 행이 날짜 계산 가능한 Item 한 개가 됩니다.',
    examples: '초기 이유식',
    route: 'table_rows → Calendar + Sheet',
  },
  {
    number: '03',
    title: '날짜 있는 lesson 행',
    copy: '원본 계획표를 진도 Sheet로 보존하고 시작일이 있을 때만 일정화합니다.',
    examples: 'OPIc 계획표',
    route: 'lesson_rows → Sheet + Calendar',
  },
  {
    number: '04',
    title: '날짜 없는 lesson 행',
    copy: '진도는 완전하지만 VEVENT는 만들지 않습니다.',
    examples: '생활코딩 WEB1',
    route: 'lesson_rows → Sheet + Checklist',
  },
  {
    number: '05',
    title: '순서형 절차 행',
    copy: '날짜가 아니라 결정 순서와 완료 상태를 보존합니다.',
    examples: '신차 구매 8단계',
    route: 'procedure_rows → Checklist + Sheet',
  },
  {
    number: '06',
    title: '리소스 컬렉션',
    copy: '같은 컬렉션이라도 원문 순서와 사용자 job에 따라 목적지가 달라집니다.',
    examples: 'Allblanc · 여름 반찬 · AND 영상',
    route: 'collection → Calendar / Checklist / Todo',
  },
];

const css = String.raw`
  :root{
    --deep:#08291f;--deep-2:#123b2e;--paper:#f5f8f4;--white:#fff;
    --ink:#10231c;--muted:#66756e;--line:#d8e3dc;--lime:#d8f26a;
    --source:#7653a6;--source-bg:#f0eafa;--canonical:#2f66b7;
    --canonical-bg:#e9f0fb;--projection:#19714d;--projection-bg:#e5f3ea;
    --overlay:#b77a0d;--overlay-bg:#fff3d2;--review:#b96b13;
    --review-bg:#fff0da;--hold:#ae4d45;--hold-bg:#fbe8e5;
    --shadow:0 22px 60px rgba(16,47,36,.09);
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",Arial,sans-serif;line-height:1.58;overflow-wrap:anywhere}
  a{color:inherit}
  button{font:inherit}
  .wrap{width:min(1280px,calc(100% - 64px));margin:auto}
  .slide{min-height:900px;padding:82px 0;border-bottom:1px solid var(--line);display:flex;align-items:center;position:relative;overflow:hidden}
  .slide:nth-of-type(even):not(.hero):not(.final-slide){background:var(--white)}
  .slide-label{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--lime);font-weight:900}
  h1,h2,h3,p{margin-top:0}
  h1{font-size:clamp(64px,7vw,104px);line-height:.96;letter-spacing:-.065em;margin:24px 0 28px}
  h2{font-size:clamp(42px,4.2vw,66px);line-height:1.04;letter-spacing:-.05em;margin:5px 0 18px}
  h3{font-size:25px;line-height:1.2;letter-spacing:-.025em}
  .lead{font-size:21px;max-width:880px;color:var(--muted)}
  .report-nav{position:sticky;top:0;z-index:40;background:rgba(8,41,31,.96);color:white;border-bottom:1px solid rgba(255,255,255,.12)}
  .report-nav .wrap{display:flex;gap:10px;overflow:auto;padding:11px 0;scrollbar-width:none}
  .report-nav .wrap::-webkit-scrollbar{display:none}
  .report-nav a{white-space:nowrap;text-decoration:none;font-size:13px;padding:8px 11px;border-radius:99px;color:#cddbd4}
  .report-nav a:hover,.report-nav a:focus{background:rgba(255,255,255,.1);color:white}
  .hero{background:radial-gradient(circle at 83% 18%,#315d36 0,transparent 36%),linear-gradient(135deg,#05281f,#113d2f);color:white;align-items:flex-start}
  .hero .wrap{padding-top:24px}
  .hero-top{display:grid;grid-template-columns:1.15fr .85fr;gap:70px;align-items:end}
  .hero h1{max-width:790px}
  .hero-copy{font-size:22px;max-width:760px;color:#d9e8e0}
  .hero-copy strong{color:var(--lime)}
  .hero-stats{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid rgba(255,255,255,.2);border-bottom:1px solid rgba(255,255,255,.2)}
  .hero-stats div{padding:26px 18px;border-right:1px solid rgba(255,255,255,.18)}
  .hero-stats div:last-child{border-right:0}
  .hero-stats strong{display:block;font-size:54px;line-height:1;color:var(--lime)}
  .hero-stats span{display:block;margin-top:9px;font-size:16px}
  .hero-stats small{color:#b8cbc1}
  .hero-pipeline{display:grid;grid-template-columns:1fr auto 1fr auto 1.1fr auto 1.8fr;gap:18px;align-items:center;margin-top:62px}
  .hero-node{border-top:1px solid rgba(255,255,255,.3);padding-top:18px;min-height:112px}
  .hero-node span{display:block;color:var(--lime);font-size:14px;font-weight:900}
  .hero-node strong{display:block;font-size:24px;margin:5px 0}
  .hero-node small{color:#bbcec4;font-size:14px}
  .hero-arrow{font-size:30px;color:var(--lime)}
  .hero-outputs{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
  .hero-outputs span{border:1px solid rgba(255,255,255,.2);padding:13px;border-radius:10px;text-align:center;font-weight:800}
  .section-heading{display:grid;grid-template-columns:82px 1fr;gap:22px;align-items:start;margin-bottom:46px}
  .section-heading>span{width:64px;height:64px;border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;color:var(--projection);font-weight:900;font-size:15px}
  .section-heading p{margin:1px 0 4px;color:var(--projection);font-weight:900;font-size:15px}
  .section-heading h2{max-width:1000px}
  .section-copy{font-size:19px;color:var(--muted);max-width:980px}
  .evidence-levels{display:grid;gap:20px}
  .evidence-level{display:grid;grid-template-columns:130px 1fr;gap:30px;align-items:center;padding:22px 0;border-bottom:1px solid var(--line)}
  .evidence-level>strong{font-size:72px;line-height:1;color:var(--projection)}
  .evidence-level h3{margin-bottom:5px}
  .evidence-level p{margin:0;color:var(--muted);font-size:18px}
  .evidence-level.boundary>strong{color:var(--review)}
  .evidence-level.map>strong{color:var(--canonical)}
  .evidence-level.future>strong{color:var(--source)}
  .shape-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0 56px}
  .shape-story{display:grid;grid-template-columns:54px 1fr;gap:16px;padding:20px 0;border-bottom:1px solid var(--line)}
  .shape-story>span{color:var(--source);font-weight:900}
  .shape-story h3{margin-bottom:6px}
  .shape-story p{color:var(--muted);font-size:16px;margin-bottom:10px}
  .shape-story div>span{display:inline-block;color:var(--canonical);font-weight:800;margin-right:16px}
  .shape-story code{font-size:13px;color:var(--projection)}
  .grammar-stage{display:grid;grid-template-columns:repeat(6,1fr);align-items:center;gap:12px;margin:50px 0}
  .grammar-stage>div{min-height:170px;border-top:5px solid var(--line);padding:22px 14px;background:white}
  .grammar-stage>div.source{border-color:var(--source)}
  .grammar-stage>div.canonical{border-color:var(--canonical)}
  .grammar-stage>div.projection{border-color:var(--projection)}
  .grammar-stage strong{font-size:22px;display:block;margin-bottom:8px}
  .grammar-stage span{font-size:40px;line-height:1;font-weight:900;display:block;color:var(--canonical)}
  .grammar-stage small{display:block;color:var(--muted);margin-top:12px}
  .grammar-note{display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .grammar-note article{border-left:3px solid var(--canonical);padding-left:22px}
  .grammar-note article:last-child{border-color:var(--projection)}
  .grammar-note p{font-size:18px;color:var(--muted)}
  .anatomy-layout{display:grid;grid-template-columns:.75fr 1.25fr;gap:58px;align-items:start}
  .anatomy-source{background:var(--source-bg);padding:34px;border-radius:22px}
  .anatomy-source>span,.mini-label{font-size:13px;font-weight:900;color:var(--source);letter-spacing:.05em;text-transform:uppercase}
  .anatomy-source h3{margin-top:12px}
  .anatomy-source p{color:var(--muted)}
  .field-table{border-top:1px solid var(--line)}
  .field-table>div{display:grid;grid-template-columns:170px 1fr;gap:18px;padding:12px 0;border-bottom:1px solid var(--line);min-width:0}
  .field-table code{font-size:13px;color:var(--canonical)}
  .field-table strong{font-size:15px;font-weight:650;min-width:0}
  .field-table .optional-off{opacity:.58}
  .field-table .optional-on code{color:var(--overlay)}
  .field-table>p{font-size:13px;color:var(--muted);margin-top:14px}
  .field-table>p a{color:var(--source)}
  .field-legend{display:flex;gap:20px;flex-wrap:wrap;margin-top:20px}
  .field-legend span{font-size:14px}
  .field-legend b{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px;background:var(--canonical)}
  .field-legend span:last-child b{background:var(--overlay)}
  .branch-layout{display:grid;grid-template-columns:1fr 1fr;gap:32px}
  .branch{padding:38px;border-radius:24px;background:white;border:1px solid var(--line)}
  .branch.scheduled{border-top:7px solid var(--projection)}
  .branch.undated{border-top:7px solid var(--canonical)}
  .branch h3{font-size:32px}
  .branch>strong{display:block;font-size:25px;margin:24px 0}
  .branch ol{padding-left:22px;color:var(--muted);font-size:17px}
  .branch-result{margin-top:28px;display:flex;gap:9px;flex-wrap:wrap}
  .branch-result span{background:var(--paper);padding:10px 13px;border-radius:8px;font-weight:800}
  .case-slide{align-items:flex-start}
  .source-layout{display:grid;grid-template-columns:42% 1fr;gap:58px;align-items:start}
  .source-frame{margin:0;border:1px solid var(--line);background:white;box-shadow:var(--shadow);border-radius:18px;overflow:hidden}
  .source-frame a{display:block;height:440px;background:#eef2ef}
  .source-frame img{width:100%;height:100%;object-fit:contain;display:block}
  .source-frame figcaption{display:flex;justify-content:space-between;padding:16px 18px}
  .source-frame figcaption span{color:var(--source)}
  .plain-fact{border-left:4px solid var(--source);padding-left:20px;margin-bottom:22px}
  .plain-fact span{display:block;color:var(--source);font-size:13px;font-weight:900}
  .plain-fact strong{font-size:22px;display:block;margin-top:7px}
  .row-list,.item-list{list-style:none;margin:0;padding:0}
  .row-list li,.item-list li{display:grid;grid-template-columns:42px 1fr;gap:14px;padding:13px 0;border-bottom:1px solid var(--line)}
  .row-list li>span{color:var(--source);font-weight:900}
  .item-list li>span{color:var(--canonical);font-weight:900}
  .row-list strong,.item-list strong{display:block;font-size:17px}
  .row-list small,.item-list small{display:block;color:var(--muted);font-size:13px;margin-top:3px}
  .source-count-line{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;gap:8px;align-items:center;margin:28px 0}
  .source-count-line>div{text-align:center;border-top:2px solid var(--line);padding-top:12px}
  .source-count-line strong{display:block;font-size:27px}
  .source-count-line span{font-size:12px;color:var(--muted)}
  .source-count-line i{font-style:normal;color:var(--projection);font-size:22px}
  .overlay-panel{display:grid;grid-template-columns:.75fr 1.25fr;gap:18px;background:var(--overlay-bg);padding:18px;border-radius:16px}
  .overlay-panel>div>span{color:var(--overlay);font-weight:900}
  .overlay-panel p{font-size:13px;color:var(--muted);margin:5px 0 0}
  .overlay-list{display:grid;gap:6px}
  .overlay-list>div,.overlay-empty{background:rgba(255,255,255,.7);padding:9px 11px;border-radius:8px}
  .overlay-list strong{font-size:14px}
  .overlay-list span{display:block;color:var(--muted);font-size:11px}
  .readiness-line{display:flex;flex-wrap:wrap;gap:7px;margin-top:18px}
  .status{display:inline-flex;gap:6px;align-items:center;border-radius:99px;background:#edf2ef;padding:7px 10px;font-size:12px}
  .status b{font-weight:900}
  .status.go{background:var(--projection-bg);color:var(--projection)}
  .status.modify{background:var(--review-bg);color:var(--review)}
  .status.hold{background:var(--hold-bg);color:var(--hold)}
  .data-layout{display:grid;grid-template-columns:.9fr 1.1fr;gap:60px}
  .data-flow-panel>.item-list{margin-top:10px}
  .item-structure-layout{display:grid;grid-template-columns:1fr .92fr;gap:72px;align-items:start}
  .structure-story{border:1px solid var(--line);border-radius:22px;background:white;padding:28px 32px}
  .structure-stack{display:grid;grid-template-columns:1fr;gap:8px;margin-top:16px}
  .structure-stack>div{display:grid;grid-template-columns:72px 110px 1fr;align-items:center;gap:12px;border-left:4px solid var(--line);padding:12px 16px;background:var(--paper);border-radius:0 12px 12px 0}
  .structure-stack>div.source{border-color:var(--source);background:var(--source-bg)}
  .structure-stack>div.canonical{border-color:var(--canonical);background:var(--canonical-bg)}
  .structure-stack strong{font-size:28px;line-height:1;color:var(--canonical)}
  .structure-stack .source strong{color:var(--source)}
  .structure-stack span{font-weight:900}
  .structure-stack small{color:var(--muted)}
  .structure-stack>b{text-align:center;color:var(--canonical);line-height:1}
  .structure-rule{margin:20px 0 0;padding-top:18px;border-top:1px solid var(--line);color:var(--muted)}
  .hierarchy-lane{display:grid;grid-template-columns:repeat(9,auto);align-items:center;gap:8px;margin:30px 0}
  .hierarchy-lane>div{min-width:80px;border-top:3px solid var(--line);padding-top:10px;text-align:center}
  .hierarchy-lane .canonical{border-color:var(--canonical)}
  .hierarchy-lane strong{display:block;font-size:24px}
  .hierarchy-lane span{font-size:11px;color:var(--muted)}
  .hierarchy-lane b{color:var(--canonical)}
  .why-box{border-left:4px solid var(--projection);padding-left:18px}
  .why-box span{font-size:13px;color:var(--projection);font-weight:900}
  .why-box p{font-size:17px;margin-top:7px;color:var(--muted)}
  .case-projection-layout{display:grid;grid-template-columns:1.02fr .98fr;gap:54px;align-items:start}
  .projection-explain{min-width:0}
  .item-anatomy{background:white;border:1px solid var(--line);padding:28px;border-radius:20px}
  .item-anatomy h3{font-size:28px;margin:10px 0 18px}
  .projection-band{margin-top:42px;border-top:1px solid var(--line);padding-top:24px}
  .projection-band>div:first-child{display:flex;justify-content:space-between;align-items:end;margin-bottom:18px}
  .projection-band>div:first-child span{color:var(--projection);font-weight:900}
  .projection-band>div:first-child strong{font-size:22px}
  .projection-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
  .projection{padding:16px;border:1px solid var(--line);border-radius:12px;min-height:86px}
  .projection strong{display:block;font-size:17px}
  .projection span{display:block;color:var(--muted);font-size:12px;margin-top:6px}
  .projection.primary{background:var(--projection);color:white;border-color:var(--projection)}
  .projection.primary span{color:#d7e9df}
  .projection.secondary{background:var(--projection-bg);border-color:#9ccdb1}
  .projection.off{opacity:.48;text-decoration:none}
  .projection-note{font-size:13px;color:var(--muted);margin:12px 0 0}
  .case-projection-layout .projection-band{margin-top:30px}
  .case-projection-layout .projection-cards{grid-template-columns:repeat(2,1fr)}
  .state-foot{display:flex;gap:20px;flex-wrap:wrap;margin-top:22px;color:var(--muted);font-size:12px}
  .state-foot b{color:var(--ink)}
  .comparison-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:28px}
  .comparison-grid.three{grid-template-columns:repeat(3,1fr)}
  .comparison-case{padding:32px;background:white;border-top:7px solid var(--canonical);min-height:330px}
  .comparison-case span{color:var(--source);font-weight:900}
  .comparison-case h3{font-size:32px;margin-top:14px}
  .comparison-case p{font-size:18px;color:var(--muted);min-height:60px}
  .comparison-schedule{padding:13px;background:var(--paper);margin:26px 0;font-family:ui-monospace,Consolas,monospace}
  .comparison-case>strong{font-size:24px;color:var(--projection)}
  .projection-center{display:grid;grid-template-columns:.8fr 1.2fr;gap:56px;align-items:center}
  .canonical-core{width:330px;height:330px;border:3px solid var(--canonical);border-radius:50%;display:grid;place-items:center;text-align:center;background:white}
  .canonical-core strong{font-size:43px;display:block}
  .canonical-core span{color:var(--muted)}
  .projection-spokes{display:grid;gap:12px}
  .projection-spokes div{display:grid;grid-template-columns:160px 1fr;gap:16px;padding:15px 0;border-bottom:1px solid var(--line)}
  .projection-spokes strong{font-size:20px}
  .projection-spokes span{color:var(--muted)}
  .bundle-layout{display:grid;grid-template-columns:1fr 80px 1fr;gap:28px;align-items:center}
  .bundle-items{display:grid;gap:10px}
  .bundle-items div{background:white;border-left:4px solid var(--canonical);padding:16px 20px}
  .bundle-items strong{display:block}
  .bundle-items span{font-size:12px;color:var(--muted)}
  .bundle-arrow{text-align:center;font-size:44px;color:var(--projection)}
  .bundle-event{background:var(--projection);color:white;padding:38px;border-radius:22px}
  .bundle-event span{color:var(--lime);font-weight:900}
  .bundle-event h3{font-size:32px;margin-top:12px}
  .bundle-event p{color:#d8e7df}
  .bundle-event code{display:block;background:rgba(0,0,0,.14);padding:14px;margin-top:18px;overflow-wrap:anywhere}
  .architecture-list{display:grid;gap:18px}
  .architecture-summary{display:grid;grid-template-columns:56px 1fr 120px;gap:22px;align-items:center;background:white;padding:22px 26px;border-left:7px solid var(--line)}
  .architecture-summary.go{border-color:var(--projection)}
  .architecture-summary.modify{border-color:var(--review)}
  .architecture-summary.hold{border-color:var(--hold)}
  .architecture-summary>span{width:42px;height:42px;border-radius:50%;background:var(--paper);display:grid;place-items:center;font-weight:900}
  .architecture-summary h3{margin:0 0 4px}
  .architecture-summary p{margin:0;color:var(--muted)}
  .architecture-summary>strong{font-size:48px;text-align:right}
  .architecture-summary small{font-size:12px;display:block}
  .readiness-examples{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .readiness-example{background:white;border:1px solid var(--line);padding:26px}
  .readiness-example p{min-height:86px;color:var(--muted)}
  .readiness-example>div{display:flex;gap:6px;flex-wrap:wrap}
  .delta-list{display:grid;grid-template-columns:repeat(2,1fr);gap:0 60px}
  .delta-row{display:grid;grid-template-columns:1fr 90px auto 90px 60px;gap:12px;align-items:center;padding:18px 0;border-bottom:1px solid var(--line)}
  .delta-row span{color:var(--muted)}
  .delta-row strong{font-size:28px}
  .delta-row i{font-style:normal;color:var(--projection)}
  .delta-row b{color:var(--review)}
  .replacement-line{margin-top:35px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
  .replacement-line article{background:white;padding:22px;border-top:5px solid var(--line)}
  .replacement-line article:first-child{border-color:var(--projection)}
  .replacement-line article:not(:first-child){border-color:var(--review)}
  .replacement-line span{font-size:12px;color:var(--muted)}
  .replacement-line p{margin:8px 0 0;color:var(--muted)}
  .boundary-layout{display:grid;grid-template-columns:1fr 1fr;gap:60px}
  .stop-panel{background:var(--hold-bg);border-left:8px solid var(--hold);padding:38px}
  .stop-panel>span{color:var(--hold);font-weight:900}
  .stop-panel h3{font-size:31px;margin-top:14px}
  .stop-panel>p{font-size:17px;color:#68443f}
  .stop-panel>div{display:flex;gap:6px;flex-wrap:wrap;margin:22px 0}
  .stop-panel>strong{display:block;margin-top:25px}
  .stop-panel small{display:block;margin-top:24px;color:var(--hold);font-weight:900}
  .portfolio-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .portfolio-card{background:white;border:1px solid var(--line);padding:20px;min-height:190px}
  .portfolio-card>span{font-size:12px;color:var(--source);font-weight:900}
  .portfolio-card h3{font-size:21px;margin:8px 0 13px}
  .portfolio-card>div{display:flex;gap:5px;flex-wrap:wrap}
  .portfolio-card p{font-size:13px;color:var(--muted);margin:15px 0 5px}
  .portfolio-card small{color:var(--canonical)}
  .portfolio-disclaimer{margin-top:24px;border-left:4px solid var(--review);padding-left:18px;color:var(--muted)}
  .future-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:28px}
  .future-contract{border:2px dashed #b8a7cf;background:white;padding:28px;min-height:470px}
  .future-head{display:flex;justify-content:space-between}
  .future-head span{color:var(--source);font-weight:900}
  .future-head strong{color:var(--hold)}
  .future-contract h3{font-size:31px;margin:16px 0 8px}
  .future-contract>p{color:var(--muted);min-height:56px}
  .future-contract dl{margin:22px 0}
  .future-contract dl>div{display:grid;grid-template-columns:120px 1fr;gap:16px;border-top:1px solid var(--line);padding:10px 0}
  .future-contract dt{color:var(--muted)}
  .future-contract dd{margin:0}
  .future-contract aside{background:var(--review-bg);padding:13px;color:#774c16}
  .future-contract>small{display:block;color:var(--source);margin-top:18px;font-weight:900}
  .gap-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px 50px}
  .gap-item{border-top:2px solid var(--line);padding-top:18px}
  .gap-item span{color:var(--hold);font-weight:900;font-size:13px}
  .gap-item h3{margin:7px 0}
  .gap-item p{color:var(--muted)}
  .final-slide{background:var(--deep);color:white}
  .final-layout{display:grid;grid-template-columns:.8fr 1.2fr;gap:70px}
  .final-decision span{color:var(--lime);font-weight:900}
  .final-decision strong{font-size:54px;line-height:1.08;display:block;margin:18px 0 24px}
  .final-decision p{color:#ccddd4;font-size:18px}
  .backend-rules{display:grid;gap:10px}
  .backend-rules div{padding:15px 18px;border-bottom:1px solid rgba(255,255,255,.18);font-size:16px}
  .backend-rules b{color:var(--lime);margin-right:12px}
  .not-run{margin-top:25px;padding:18px;border:1px solid rgba(255,255,255,.18);color:#c9d8d0}
  .appendix-intro{background:#e7eee9}
  .appendix-intro h2{max-width:800px}
  .filter-bar{position:sticky;top:58px;z-index:30;background:rgba(245,248,244,.96);border-bottom:1px solid var(--line)}
  .filters{display:flex;gap:8px;overflow:auto;padding:12px 0}
  .filter{appearance:none;border:1px solid var(--line);background:white;border-radius:99px;padding:9px 14px;white-space:nowrap;cursor:pointer;font-weight:800;color:var(--ink)}
  .filter[aria-pressed=true]{background:var(--deep);color:white;border-color:var(--deep)}
  .explorer-section{padding:60px 0}
  .explorer-stack{display:grid;gap:22px}
  .explorer-card{background:white;border:1px solid var(--line);padding:28px}
  .explorer-card[hidden]{display:none}
  .explorer-card header{display:flex;justify-content:space-between;gap:20px}
  .explorer-card header span{color:var(--source);font-size:12px;font-weight:900}
  .explorer-card header h3{font-size:27px;margin:5px 0}
  .explorer-card header>strong{color:var(--canonical);font-size:25px}
  .explorer-card>p{color:var(--muted)}
  .explorer-summary{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0}
  .explorer-summary span{background:var(--paper);padding:8px 10px;font-size:12px}
  details{border-top:1px solid var(--line);padding-top:14px;margin-top:14px}
  summary{cursor:pointer;color:var(--projection);font-weight:900}
  .appendix-list{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:14px;max-height:520px;overflow:auto}
  .appendix-list>div{display:grid;grid-template-columns:30px 1fr;gap:5px 10px;background:var(--paper);padding:11px}
  .appendix-list b{grid-row:1/4;color:var(--canonical)}
  .appendix-list span,.appendix-list small{color:var(--muted);font-size:11px}
  .empty-result{display:none;text-align:center;padding:50px;color:var(--muted)}
  .footer{background:#071d17;color:#b9cbc2;padding:42px 0}
  .footer .wrap{display:flex;justify-content:space-between;gap:30px}
  .footer a{color:var(--lime)}
  @media(max-width:980px){
    .slide{min-height:auto;padding:58px 0}
    .hero-top,.source-layout,.data-layout,.item-structure-layout,.case-projection-layout,.anatomy-layout,.projection-center,.boundary-layout,.final-layout{grid-template-columns:1fr}
    .hero-pipeline{grid-template-columns:1fr}.hero-arrow{transform:rotate(90deg);text-align:center}
    .source-frame a{height:430px}
    .shape-grid,.grammar-note,.branch-layout,.comparison-grid,.comparison-grid.three,.readiness-examples,.delta-list,.future-grid,.gap-grid{grid-template-columns:1fr}
    .grammar-stage{grid-template-columns:repeat(3,1fr)}
    .projection-cards{grid-template-columns:repeat(3,1fr)}
    .portfolio-grid{grid-template-columns:repeat(2,1fr)}
    .bundle-layout{grid-template-columns:1fr}.bundle-arrow{transform:rotate(90deg)}
    .final-layout{gap:35px}
  }
  @media(max-width:600px){
    .wrap{width:calc(100% - 28px)}
    .slide{padding:42px 0}
    .report-nav .wrap{width:100%;padding-left:14px;padding-right:14px}
    h1{font-size:52px}
    h2{font-size:38px}
    .hero-copy,.lead{font-size:17px}
    .hero-stats{grid-template-columns:1fr}
    .hero-stats div{border-right:0;border-bottom:1px solid rgba(255,255,255,.16)}
    .hero-stats div:last-child{border-bottom:0}
    .hero-stats strong{font-size:42px}
    .section-heading{grid-template-columns:1fr;gap:12px;margin-bottom:30px}
    .section-heading>span{width:48px;height:48px}
    .section-copy{font-size:16px}
    .evidence-level{grid-template-columns:80px 1fr;gap:18px}
    .evidence-level>strong{font-size:50px}
    .evidence-level p{font-size:15px}
    .shape-grid{grid-template-columns:1fr}
    .grammar-stage{grid-template-columns:1fr}
    .grammar-stage>div{min-height:auto}
    .source-frame a{height:245px}
    .source-count-line{grid-template-columns:1fr}.source-count-line i{transform:rotate(90deg);text-align:center}
    .overlay-panel{grid-template-columns:1fr}
    .data-layout{gap:30px}
    .item-structure-layout,.case-projection-layout{gap:30px}
    .structure-story{padding:20px}
    .structure-stack>div{grid-template-columns:58px 92px 1fr;padding:11px 12px}
    .hierarchy-lane{grid-template-columns:1fr}.hierarchy-lane b{transform:rotate(90deg);text-align:center}
    .item-anatomy{padding:18px}
    .field-table>div{grid-template-columns:1fr;gap:4px}
    .projection-band>div:first-child{display:block}
    .projection-cards{grid-template-columns:1fr}
    .state-foot{display:grid;gap:8px}
    .comparison-case{min-height:auto}
    .canonical-core{width:260px;height:260px;margin:auto}
    .projection-spokes div{grid-template-columns:1fr}
    .architecture-summary{grid-template-columns:44px 1fr}
    .architecture-summary>strong{grid-column:2;text-align:left}
    .portfolio-grid{grid-template-columns:1fr}
    .future-contract{min-height:auto;padding:20px}
    .future-contract dl>div{grid-template-columns:1fr;gap:4px}
    .appendix-list{grid-template-columns:1fr}
    .footer .wrap{display:block}
  }
`;

const deltaRows = [
  ['Bundle', baselineCounts.bundles, currentCounts.bundles],
  ['Flow', baselineCounts.flows, currentCounts.flows],
  ['Step', baselineCounts.steps, currentCounts.steps],
  ['Item', baselineCounts.items, currentCounts.items],
  ['SourceRow', baselineCounts.sourceRows, currentCounts.sourceRows],
  ['일정 Item', baselineCounts.scheduledItems, currentCounts.scheduledItems],
  ['날짜 없는 Item', baselineCounts.undatedItems, currentCounts.undatedItems],
];

const backendRulesKo = [
  'schedule이 null이면 VEVENT 생성을 거부한다.',
  'VEVENT와 VTODO를 중첩하지 않고 VCALENDAR 안의 형제 component로 내보낸다.',
  '안정적인 Item ID와 occurrence key를 projection 식별자로 유지한다.',
  'step_bundle에는 모든 child Item ID를 넣고 완료 상태의 소유자를 canonical Item으로 선언한다.',
  'VTODO·RELATED-TO·VALARM·VJOURNAL·X-property 보존은 가정하지 않고 destination capability로 다룬다.',
  '권리·검토·개인 overlay는 canonical DTO에 보존하되 사용자 export에서는 제외한다.',
  '실험용 anchor 날짜를 원문 사실로 승격하지 않는다.',
];

const gaps = [
  {
    title: '여행·외출 정상 사례',
    copy: '트리플은 historical boundary입니다. 최신성 관리 책임과 권리 근거가 있는 실제 출국·예약 원문을 다시 확보해야 합니다.',
  },
  {
    title: '취미·반려 정상 사례',
    copy: '핏펫은 safety·rights Hold입니다. 공식 근거와 제작자 허가가 함께 있는 반복 관리 또는 일정 원문이 필요합니다.',
  },
  {
    title: '반복 루틴',
    copy: '실제 주기와 행동 행이 있는 가전·식물·반려 관리 원문을 확보해야 repeating_routine을 검증할 수 있습니다.',
  },
  {
    title: '비교·결정',
    copy: '신차 절차 안에 결정은 있지만 독립 compare_decide corpus는 아닙니다. 후보·기준·선택 결과가 있는 원문 표가 필요합니다.',
  },
  {
    title: '단계형 lifecycle',
    copy: '여러 phase와 전환 조건이 명시된 프로젝트 원문이 없어 phase_lifecycle은 아직 실제 corpus로 검증하지 못했습니다.',
  },
  {
    title: 'Primary Memo·공식 날짜창',
    copy: '참고 기준 자체가 결과물인 Memo와 공식 단일 기한·날짜창 사례를 다음 source acquisition에서 우선 확보해야 합니다.',
  },
];

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe Item·Map Architecture Qualified Corpus Revalidation v2 — Expanded</title>
  <meta name="description" content="실제 원문이 SourceRow, Item, Step, Flow, Map과 목적지별 projection으로 정리되는 과정을 8개 콘텐츠로 풀어 설명합니다.">
  <style>${css}</style>
</head>
<body>
  <nav class="report-nav" aria-label="보고서 목차">
    <div class="wrap">
      <a href="#top">결론</a>
      <a href="#evidence">증거 범위</a>
      <a href="#shapes">데이터 형태</a>
      <a href="#case-1-source">실제 8개</a>
      <a href="#compare-lessons">형태 비교</a>
      <a href="#architecture">아키텍처</a>
      <a href="#boundaries">Boundary</a>
      <a href="#portfolio-1">27개 지도</a>
      <a href="#future-1">다음 8개</a>
      <a href="#decision">Backend 결론</a>
      <a href="#appendix">전체 데이터</a>
    </div>
  </nav>

  <section class="slide hero" id="top">
    <div class="wrap">
      <div class="hero-top">
        <div>
          <span class="slide-label">2026-07-28 · Qualified corpus revalidation v2</span>
          <h1>Item은 원본,<br>ICS는 전달물</h1>
          <p class="hero-copy">원문에서 확보한 실행 의미는 <strong>canonical Item</strong>이 소유합니다. Calendar·Checklist·Todo·Sheet·Memo는 같은 Item을 목적지에 맞게 보여주는 projection입니다.</p>
        </div>
        <div class="hero-stats">
          <div><strong>${currentCounts.items}</strong><span>Item</span><small>실행 상태의 원본</small></div>
          <div><strong>${currentCounts.sourceRows}</strong><span>SourceRow</span><small>원문 근거 단위</small></div>
          <div><strong>${currentCounts.undatedItems}</strong><span>날짜 없음</span><small>가짜 VEVENT 0</small></div>
        </div>
      </div>
      <div class="hero-pipeline" aria-label="FlowMe 데이터 파이프라인">
        <div class="hero-node"><span>01</span><strong>원문 콘텐츠</strong><small>웹·영상·표·파일</small></div>
        <div class="hero-arrow">→</div>
        <div class="hero-node"><span>02</span><strong>SourceRow</strong><small>출처 기반 최소 행</small></div>
        <div class="hero-arrow">→</div>
        <div class="hero-node"><span>03</span><strong>Item</strong><small>독립 완료 가능한 원본</small></div>
        <div class="hero-arrow">→</div>
        <div class="hero-outputs"><span>Calendar</span><span>Checklist</span><span>Todo</span><span>Sheet · Memo</span></div>
      </div>
    </div>
  </section>

  <section class="slide" id="evidence">
    <div class="wrap">
      ${sectionHeading(
        '01',
        '이 보고서는 무엇을 실제로 보여주나',
        '콘텐츠 수가 아니라 증거 수준부터 구분',
        '완전 변환, historical boundary, 자격 판정 대상, 미래 데이터 계약은 서로 다른 상태입니다.',
      )}
      <div class="evidence-levels">
        ${evidenceLevel('Qualified canonical 변환', '8', 'SourceRow → Item → Step → Flow → Bundle/Map 전체 구조가 있고 이번 수치에 포함됩니다.', 'qualified')}
        ${evidenceLevel('Historical / boundary', '2', '실제 구조는 있지만 최신 logic·rights·safety gate 때문에 정상 수치에서 제외했습니다.', 'boundary')}
        ${evidenceLevel('콘텐츠 자격 판정 지도', '27', '9개 lifeArea의 조사 대상입니다. 27개 모두가 변환 완료 Flow라는 뜻은 아닙니다.', 'map')}
        ${evidenceLevel('다음 field contract', '8', 'Vertical 기회입니다. 필요한 행 구조를 정의했지만 SourceRow 0·Item 0입니다.', 'future')}
      </div>
    </div>
  </section>

  <section class="slide" id="shapes">
    <div class="wrap">
      ${sectionHeading(
        '02',
        '원문은 어떤 데이터 형태로 들어오나',
        '8개 콘텐츠에서 확인한 여섯 가지 변환 문법',
        '카테고리가 아니라 원문 행의 모양과 사용자 job이 projection을 결정합니다.',
      )}
      <div class="shape-grid">
        ${sourceShapeStories
          .map(
            (shape) => `<article class="shape-story">
              <span>${shape.number}</span>
              <div><h3>${esc(shape.title)}</h3><p>${esc(shape.copy)}</p><span>${esc(shape.examples)}</span><code>${esc(shape.route)}</code></div>
            </article>`,
          )
          .join('')}
      </div>
    </div>
  </section>

  <section class="slide" id="grammar">
    <div class="wrap">
      ${sectionHeading(
        '03',
        '각 층은 무슨 일을 하나',
        '상태는 Item이 소유하고, 위층은 의미를 묶는다',
        '이사 사례의 실제 52 SourceRow와 27 Item을 같은 계층에 놓고 보면 관계가 선명해집니다.',
      )}
      <div class="grammar-stage">
        <div class="source"><strong>SourceRow</strong><span>${moving.metrics.sourceRows}</span><small>원문 D-day·세부 체크 행</small></div>
        <div class="canonical"><strong>Item</strong><span>${moving.metrics.items}</span><small>독립 완료·결정 단위</small></div>
        <div class="canonical"><strong>Step</strong><span>${moving.metrics.steps}</span><small>D-30·D-10·D-3 등</small></div>
        <div class="canonical"><strong>Flow</strong><span>${moving.metrics.flows}</span><small>이사 준비라는 한 user job</small></div>
        <div class="canonical"><strong>Bundle / Map</strong><span>1</span><small>Flow의 관계와 순서</small></div>
        <div class="projection"><strong>Projection</strong><span>5</span><small>목적지마다 다른 표현</small></div>
      </div>
      <div class="grammar-note">
        <article><h3>여러 SourceRow → Item 하나</h3><p>이사 방식, 업체 견적, 입주청소 견적처럼 사용자가 한 번에 결정하는 원문 행은 하나의 Item으로 묶을 수 있습니다.</p></article>
        <article><h3>Item 하나 → 여러 Projection</h3><p>같은 Item이 Calendar에서는 일정, Checklist에서는 체크 행, Sheet에서는 상태 행으로 보이지만 완료 상태의 원본은 하나입니다.</p></article>
      </div>
    </div>
  </section>

  <section class="slide" id="item-anatomy">
    <div class="wrap">
      ${sectionHeading(
        '04',
        'Item 한 개에는 무엇이 들어가나',
        '할 일 + 상세 설명이 기본, 일정·장소·조건은 선택',
        '모든 콘텐츠를 VEVENT처럼 만들 필요가 없습니다. 필요한 필드만 켜집니다.',
      )}
      <div class="anatomy-layout">
        <div class="anatomy-source">
          <span>실제 이사 Item</span>
          <h3>${esc(firstItem(moving).itemTitle)}</h3>
          <p>${esc(firstItem(moving).memo)}</p>
          ${sourceRowList(sourceRowsForItem(moving, firstItem(moving)))}
        </div>
        <div>
          ${fieldRows(moving, firstItem(moving))}
          <div class="field-legend"><span><b></b>모든 Item이 갖는 실행·출처 필드</span><span><b></b>상황에 따라 켜지는 일정·조건 필드</span></div>
        </div>
      </div>
    </div>
  </section>

  <section class="slide" id="schedule-branch">
    <div class="wrap">
      ${sectionHeading(
        '05',
        '일정이 있느냐 없느냐가 무엇을 바꾸나',
        'Item은 같고 Calendar 경로만 갈라진다',
        '날짜가 없는 콘텐츠도 완전한 Flow가 될 수 있습니다.',
      )}
      <div class="branch-layout">
        <article class="branch scheduled">
          <span>schedule 있음 · ${currentCounts.scheduledItems} Item</span>
          <h3>Calendar 경로 활성</h3>
          <strong>Item → VEVENT 또는 step_bundle</strong>
          <ol><li>원문 날짜 또는 사용자 anchor가 있어야 함</li><li>원문에 없는 날짜·반복을 발명하지 않음</li><li>묶어도 완료 상태는 child Item이 소유</li></ol>
          <div class="branch-result"><span>이사</span><span>초기 이유식</span><span>OPIc</span><span>Allblanc</span></div>
        </article>
        <article class="branch undated">
          <span>schedule 없음 · ${currentCounts.undatedItems} Item</span>
          <h3>Calendar 없이 실행</h3>
          <strong>Item → Sheet · Checklist · Todo · Memo</strong>
          <ol><li>VEVENT 0</li><li>VTODO 후보는 destination 지원 시에만 사용</li><li>지원하지 않으면 비Calendar fallback 유지</li></ol>
          <div class="branch-result"><span>WEB1</span><span>신차 구매</span><span>여름 반찬</span><span>AND 영상</span></div>
        </article>
      </div>
    </div>
  </section>

  ${fixture.bundles
    .map(
      (record, index) =>
        `${caseSourceSlide(record, index)}${caseItemSlide(record, index)}${caseProjectionSlide(record, index)}`,
    )
    .join('')}

  <section class="slide" id="compare-lessons">
    <div class="wrap">
      ${sectionHeading(
        '06',
        '같은 lesson_rows인데 왜 결과가 다른가',
        '원문 날짜가 있으면 Calendar, 없으면 진도표',
        '콘텐츠 카테고리가 아니라 source row의 날짜 의미가 분기를 만듭니다.',
      )}
      <div class="comparison-grid">
        ${comparisonCase(opic, 'dated')}
        ${comparisonCase(web1, 'undated')}
      </div>
    </div>
  </section>

  <section class="slide" id="compare-collections">
    <div class="wrap">
      ${sectionHeading(
        '07',
        '같은 resource_collection인데 왜 목적지가 다른가',
        '순서·날짜·사용자 job이 Calendar·Checklist·Todo를 가른다',
        '컬렉션이라는 형태만 보고 결과물을 고정하지 않습니다.',
      )}
      <div class="comparison-grid three">
        ${comparisonCase(allblanc, 'dated')}
        ${comparisonCase(wtable, 'undated')}
        ${comparisonCase(andStudio, 'undated')}
      </div>
    </div>
  </section>

  <section class="slide" id="projection">
    <div class="wrap">
      ${sectionHeading(
        '08',
        'Item 한 개는 여러 도구에서 어떻게 보이나',
        '원본 하나, 표현은 목적지마다 다르게',
        'ICS·Checklist·Todo·Sheet·Memo는 경쟁하는 저장 구조가 아닙니다.',
      )}
      <div class="projection-center">
        <div class="canonical-core"><div><strong>Item</strong><span>완료·결정·기록·출처의 원본</span></div></div>
        <div class="projection-spokes">
          <div><strong>VEVENT</strong><span>일정 있는 Item만 날짜·시간·설명으로 직렬화</span></div>
          <div><strong>VTODO 후보</strong><span>날짜 없는 작업이지만 client 보존을 확인하지 않았으므로 기본 off</span></div>
          <div><strong>Checklist / Todo</strong><span>제목·상세·완료 상태를 가볍게 사용</span></div>
          <div><strong>Sheet</strong><span>행·순서·상태·진도·메모를 표로 관리</span></div>
          <div><strong>Memo</strong><span>원문 링크·상세 설명·주의·개인 메모 보존</span></div>
        </div>
      </div>
    </div>
  </section>

  <section class="slide" id="step-bundle">
    <div class="wrap">
      ${sectionHeading(
        '09',
        '같은 날짜의 여러 Item은 어떻게 묶나',
        'Calendar에서는 한 일정, FlowMe에서는 여러 완료 상태',
        '묶기는 저장 구조가 아니라 export 정책입니다.',
      )}
      <div class="bundle-layout">
        <div class="bundle-items">
          ${movingBundleGroup[1]
            .slice(0, 4)
            .map(
              (item) => `<div><strong>${esc(item.itemTitle)}</strong><span>${esc(item.itemId)}</span></div>`,
            )
            .join('')}
        </div>
        <div class="bundle-arrow">→</div>
        <div class="bundle-event">
          <span>Calendar step_bundle · ${esc(movingBundleGroup[0])}</span>
          <h3>같은 시점 Item을 한 VEVENT로 보기</h3>
          <p>Calendar 화면은 간결해지지만 child Item ID는 모두 남고 각 체크의 완료 상태는 canonical Item에 저장됩니다.</p>
          <code>completionOwner=canonical_item_state</code>
        </div>
      </div>
    </div>
  </section>

  <section class="slide" id="architecture">
    <div class="wrap">
      ${sectionHeading(
        '10',
        '세 저장 구조를 다시 계산하면',
        'Canonical Item 95 · ICS-first 46 · SharedContext 89',
        '상세 10개 평가축은 machine scorecard에 보존하고 여기서는 핵심 손실만 보여줍니다.',
      )}
      <div class="architecture-list">${architectureRecords
        .map(architectureCard)
        .join('')}</div>
    </div>
  </section>

  <section class="slide" id="readiness">
    <div class="wrap">
      ${sectionHeading(
        '11',
        '만들 수 있으면 바로 공개해도 되나',
        'Architecture·Logic·Public·Rights·Personal은 다른 축',
        'Logic Go를 Public Go로 표현하지 않습니다.',
      )}
      <div class="readiness-examples">
        ${[
          readinessByBundle.get(web1.bundleId),
          readinessByBundle.get(moving.bundleId),
          readinessByBundle.get(babyFood.bundleId),
        ]
          .map(readinessExample)
          .join('')}
      </div>
    </div>
  </section>

  <section class="slide" id="delta">
    <div class="wrap">
      ${sectionHeading(
        '12',
        '왜 같은 결론을 다시 실험했나',
        '구조가 틀린 게 아니라 시험지가 바뀌었다',
        '7월 23일 baseline은 보존하고 최신 Qualified v2 8개만 새 corpus로 계산했습니다.',
      )}
      <div class="delta-list">${deltaRows
        .map(([label, before, after]) => {
          const change = after - before;
          return `<div class="delta-row"><span>${esc(label)}</span><strong>${before}</strong><i>→</i><strong>${after}</strong><b>${change >= 0 ? '+' : ''}${change}</b></div>`;
        })
        .join('')}</div>
      <div class="replacement-line">
        <article><span>신규 정상 대표</span><h3>생활코딩 WEB1</h3><p>26개 날짜 없는 진도 Item · 현재 유일한 Public Go</p></article>
        <article><span>Boundary 이동</span><h3>트리플 여행 체크</h3><p>Logic Modify · Public Modify · 최신성 책임 불명확</p></article>
        <article><span>Boundary 이동</span><h3>핏펫 예방접종</h3><p>Logic Hold · Public Hold · 권리와 최신 공식 근거 필요</p></article>
      </div>
    </div>
  </section>

  <div id="boundaries"></div>
  ${historicalFixtures
    .map((historical, index) => {
      const state = boundaryReadiness.find(
        (record) => record.bundleId === historical.bundleId,
      );
      return boundarySlide(historical, state, index);
    })
    .join('')}

  ${portfolioGroups
    .map(
      (group, index) => `<section class="slide" id="portfolio-${index + 1}">
        <div class="wrap">
          ${sectionHeading(
            `P${index + 1}`,
            '27개 발굴 대상은 어디까지 왔나',
            `${group
              .map((record) => record.categoryLabel)
              .filter((value, position, values) => values.indexOf(value) === position)
              .join(' · ')}`,
            '각 대상의 자격 판정 상태를 보여주는 지도입니다. 8개 외의 항목을 canonical 변환 완료로 세지 않습니다.',
          )}
          <div class="portfolio-grid">${group.map(portfolioCard).join('')}</div>
          <p class="portfolio-disclaimer"><code>sourceRowsReady=true</code>는 자격 판정에 필요한 행 표시가 있다는 뜻이지, 완전한 Item·Step·Flow fixture가 있다는 뜻은 아닙니다.</p>
        </div>
      </section>`,
    )
    .join('')}

  ${verticalPairs
    .map(
      (pair, index) => `<section class="slide" id="future-${index + 1}">
        <div class="wrap">
          ${sectionHeading(
            `F${index + 1}`,
            '다음 corpus는 어떤 원문 행을 확보해야 하나',
            `미래 데이터 계약 ${index * 2 + 1}–${index * 2 + pair.length}`,
            'Vertical 실험의 기회는 실제 변환 결과가 아니라 source acquisition을 위한 field contract입니다.',
          )}
          <div class="future-grid">${pair.map(verticalContract).join('')}</div>
        </div>
      </section>`,
    )
    .join('')}

  <section class="slide" id="gaps">
    <div class="wrap">
      ${sectionHeading(
        '13',
        '보고서가 아직 증명하지 못한 것은',
        '카테고리 2개와 실행 형태 4개가 실제 corpus로 비어 있다',
        '미래 계약을 그렸다고 실제 콘텐츠를 확보한 것은 아닙니다.',
      )}
      <div class="gap-grid">${gaps
        .map(
          (gap, index) => `<article class="gap-item"><span>GAP ${index + 1}</span><h3>${esc(gap.title)}</h3><p>${esc(gap.copy)}</p></article>`,
        )
        .join('')}</div>
    </div>
  </section>

  <section class="slide final-slide" id="decision">
    <div class="wrap">
      <div class="final-layout">
        <div class="final-decision">
          <span>최종 재판정</span>
          <strong>${esc(finalDecision)}</strong>
          <p>날짜 없는 Item이 30개에서 48개로 늘어난 최신 corpus에서도 원문 의미·완료 상태·권리 검토를 가장 적게 잃는 구조입니다.</p>
          <div class="not-run"><b>NOT RUN</b><br>Google·Outlook·Apple Calendar의 VTODO·RELATED-TO 실제 왕복과 실제 사용자 검증은 수행하지 않았습니다.</div>
        </div>
        <div class="backend-rules">${backendRulesKo
          .map(
            (rule, index) => `<div><b>${index + 1}</b>${esc(rule)}</div>`,
          )
          .join('')}</div>
      </div>
    </div>
  </section>

  <section class="slide appendix-intro" id="appendix">
    <div class="wrap">
      ${sectionHeading(
        'A',
        '설명보다 원본 데이터를 직접 보고 싶다면',
        '8개 콘텐츠의 160 Item·210 SourceRow 전체 explorer',
        '본편은 사례당 대표 SourceRow·Item을 3개씩 보여주고, 전체 행은 여기에서 펼칩니다.',
      )}
    </div>
  </section>

  <div class="filter-bar">
    <div class="wrap filters" aria-label="전체 데이터 필터">
      <button class="filter" data-filter="all" aria-pressed="true">전체 8개</button>
      <button class="filter" data-filter="schedule:scheduled" aria-pressed="false">일정 있음</button>
      <button class="filter" data-filter="schedule:undated" aria-pressed="false">날짜 없음</button>
      <button class="filter" data-filter="public:go" aria-pressed="false">Public Go</button>
      <button class="filter" data-filter="public:modify" aria-pressed="false">Public Modify</button>
      <button class="filter" data-filter="public:hold" aria-pressed="false">Public Hold</button>
    </div>
  </div>

  <section class="explorer-section">
    <div class="wrap">
      <div class="explorer-stack">${fixture.bundles
        .map(fullExplorerCard)
        .join('')}</div>
      <p class="empty-result" id="emptyResult">조건에 맞는 콘텐츠가 없습니다.</p>
    </div>
  </section>

  <footer class="footer">
    <div class="wrap">
      <div>Machine-readable source: <a href="../specs/2026-07-28-flow-item-map-architecture-qualified-corpus-revalidation-v2/qualified-corpus-fixture-v2.json">qualified-corpus-fixture-v2.json</a></div>
      <div><a href="2026-07-28-icalendar-components-easy-explainer-ko.html">VEVENT·VTODO 설명</a> · <a href="2026-07-27-creator-portfolio-qualified-review-ko.html">Qualified v2 자격 판정</a></div>
    </div>
  </footer>

  <script>
    const buttons = [...document.querySelectorAll('[data-filter]')];
    const cards = [...document.querySelectorAll('[data-card]')];
    const empty = document.getElementById('emptyResult');
    function applyFilter(value) {
      const [axis, expected] = value.split(':');
      let visible = 0;
      for (const card of cards) {
        const match = value === 'all' || card.dataset[axis] === expected;
        card.hidden = !match;
        if (match) visible += 1;
      }
      empty.style.display = visible ? 'none' : 'block';
      for (const button of buttons) {
        button.setAttribute('aria-pressed', String(button.dataset.filter === value));
      }
    }
    for (const button of buttons) {
      button.addEventListener('click', () => applyFilter(button.dataset.filter));
    }
  </script>
</body>
</html>`;

fs.writeFileSync(OUTPUT, html, 'utf8');

console.log(
  JSON.stringify(
    {
      output: path.relative(REPO_ROOT, OUTPUT).replaceAll('\\', '/'),
      bytes: Buffer.byteLength(html),
      normalContents: fixture.bundles.length,
      historicalBoundaries: historicalFixtures.length,
      qualificationSubjects: qualifiedPortfolio.qualificationRecords.length,
      futureContracts: vertical.opportunities.length,
      itemCount: currentCounts.items,
      sourceRowCount: currentCounts.sourceRows,
      generatedSlides: (html.match(/<section class="slide/g) ?? []).length,
      externalCalendarRoundTrip:
        roundTripSummary.externalClientRoundTrip ?? 'NOT_RUN',
      observedUserValidation:
        roundTripSummary.observedUserValidation ?? 'NOT_RUN',
      projectionChecks: {
        schedulelessVevents: projectionSummary.schedulelessVevents ?? 0,
        nestedVeventOrVtodo:
          roundTripSummary.nestedVeventOrVtodo ?? 0,
      },
    },
    null,
    2,
  ),
);
