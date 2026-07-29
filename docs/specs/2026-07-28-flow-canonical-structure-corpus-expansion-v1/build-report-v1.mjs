import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const OUTPUT = path.join(
  ROOT,
  'docs/content-audit/2026-07-28-flow-canonical-structure-corpus-expansion-review-ko.html',
);

const INPUTS = {
  corpus: 'canonical-corpus-v1.json',
  coverage: 'structural-coverage-contract-v1.json',
  storyboard: 'report-storyboard-v1.json',
  decisions: 'planning-decision-register-v1.json',
  runtime: 'runtime-crosswalk-v1.json',
  dtos: 'representative-backend-dto-v1.json',
};

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_INITIAL_DOM_NODES = 8000;

function readRequiredJson(name) {
  const relative = INPUTS[name];
  const absolute = path.join(HERE, relative);
  if (!fs.existsSync(absolute)) {
    throw new Error(
      `Missing report input: ${relative}. Run build-corpus-v1.mjs and finish the planning contracts before building the report.`,
    );
  }
  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function scriptJson(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))];
}

function frequency(values) {
  return Object.fromEntries(
    [...values.reduce((map, value) => map.set(String(value), (map.get(String(value)) || 0) + 1), new Map())].sort(
      ([a], [b]) => a.localeCompare(b, 'ko'),
    ),
  );
}

function entriesOf(value) {
  return Object.entries(value || {});
}

function rowsOf(fixture) {
  return fixture.canonicalContent?.sourceRows || [];
}

function itemsOf(fixture) {
  return fixture.canonicalContent?.items || [];
}

function stepsOf(fixture) {
  return fixture.canonicalContent?.steps || [];
}

function flowsOf(fixture) {
  return fixture.canonicalContent?.flows || [];
}

function fieldsOf(fixture) {
  return fixture.canonicalContent?.fields || [];
}

function memosOf(fixture) {
  return fixture.canonicalContent?.memos || [];
}

function sourceRefsOf(fixture) {
  return fixture.canonicalContent?.sourceRefs || [];
}

function scheduleBucket(fixture) {
  const scheduled = fixture.metrics?.scheduledItemCount || 0;
  const undated = fixture.metrics?.undatedItemCount || 0;
  if (scheduled && undated) return 'mixed';
  return scheduled ? 'scheduled' : 'undated';
}

function inputBucket(fixture) {
  const count = fixture.inputs?.required?.length || 0;
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  return 'two_plus';
}

function stateBuckets(fixture) {
  const values = unique(itemsOf(fixture).map((item) => item.intent));
  return values.length ? values : ['structure_only_no_items'];
}

function relationBuckets(fixture) {
  return unique((fixture.conversionAudit?.rowAccounting || []).map((entry) => entry.relationType));
}

function hierarchyBucket(fixture) {
  if ((fixture.metrics?.itemCount || 0) === 0) return 'structure_only_no_items';
  if ((fixture.metrics?.flowCount || 0) > 1) return 'multi_flow_map';
  if ((fixture.metrics?.stepCount || 0) > 1) return 'multi_step_flow';
  if ((fixture.metrics?.itemCount || 0) > 1) return 'multi_item_step';
  return 'single_item';
}

function originBucket(fixture) {
  return fixture.batch === 'qualified_v2_baseline' ? 'baseline' : 'new';
}

function extensionBucket(fixture) {
  return fixture.conversionAudit?.canonicalExtensionCandidates?.length ? 'extension_needed' : 'current_canonical';
}

function scheduleText(schedule) {
  if (!schedule) return '날짜 없음';
  const recurrence = schedule.recurrence
    ? ` · ${label(schedule.recurrence.frequency)} ×${schedule.recurrence.interval || 1}`
    : '';
  if (schedule.mode === 'anchor_offset') {
    const offset = Number(schedule.dayOffset || 0);
    return `${offset === 0 ? '기준일' : `기준일 ${offset > 0 ? '+' : ''}${offset}일`}${recurrence}`;
  }
  if (schedule.mode === 'date_window') {
    return `${schedule.startDate || '?'} ~ ${schedule.endDate || '?'}${recurrence}`;
  }
  if (schedule.mode === 'absolute') {
    return `${String(schedule.start || schedule.startDate || '?').replace('T', ' ')}${recurrence}`;
  }
  return `${label(schedule.mode)}${recurrence}`;
}

function label(value) {
  const labels = {
    single_action: '단일 행동',
    checklist_rows: '체크 행',
    date_offsets: '기준일 역산',
    date_window: '날짜 구간',
    recurrence_rule: '반복 규칙',
    procedure_rows: '순서 절차',
    table_rows: '표 행',
    lesson_rows: '강의·진도 행',
    resource_collection: '자료 컬렉션',
    decision_criteria: '비교 기준',
    narrative_guidance: '서술 가이드',
    template_fields: '템플릿 필드',
    date_preparation: '날짜 준비',
    ordered_procedure: '순서 실행',
    repeating_routine: '반복 루틴',
    progress_tracking: '진도 추적',
    resource_queue: '자료 큐',
    compare_decide: '비교·결정',
    phase_lifecycle: '단계 수명주기',
    calendar: 'Calendar',
    checklist: 'Checklist',
    todo: 'Todo',
    sheet: 'Sheet',
    memo: 'Memo',
    act: '실행',
    inspect: '확인',
    decide: '결정',
    record: '기록',
    use_resource: '자료 사용',
    check: '체크',
    decision: '결정',
    absolute: '고정 일시',
    anchor_offset: '기준일 상대',
    none: '날짜 없음',
    mixed: '일정 혼합',
    scheduled: '일정 있음',
    undated: '날짜 없음',
    zero: '필수 입력 0',
    one: '필수 입력 1',
    two_plus: '필수 입력 2+',
    structure_only_no_items: 'Item 0 · 구조 전용',
    single_item: '단일 Item',
    multi_item_step: '여러 Item · 한 Step',
    multi_step_flow: '여러 Step · 한 Flow',
    multi_flow_map: '여러 Flow · Map',
    baseline: '기존 baseline',
    new: '신규 확장',
    extension_needed: 'canonical 확장 후보',
    current_canonical: '현재 canonical로 처리',
    qualified_v2_baseline: 'Qualified v2',
    output_quality_gold: 'Output quality',
    value_qualified_gold: 'Value-qualified',
    deep_set_unique: 'Deep set',
    live_reverified_expansion: '재확인 확장',
    one_to_one: '1:1',
    one_to_one_or_many_to_one: '1:1 / many:1',
    many_to_one: 'many:1',
    one_to_many: '1:many',
    many_to_many: 'many:many',
    unassigned: '미배정',
    item: 'Item',
    field: 'Field',
    memo_target: 'Memo',
    flow_context: 'Flow 문맥',
    step_context: 'Step 문맥',
    omitted: '보류·생략',
    settled: '확정',
    configurable: '정책 선택',
    open: '열린 결정',
    direct: '직접 대응',
    automatic_adapter: '자동 adapter',
    lossy_adapter: '손실 adapter',
    new_backend_field: '신규 backend 필드',
    human_decision: '사람 판정',
    not_implemented: '미구현',
    weekly: '매주',
    monthly: '매월',
    daily: '매일',
    completeFixturesAtLeast40: '완전 fixture 40+',
    allSevenExecutionPatterns: '실행 방식 7종',
    eachExecutionPatternAtLeastTwo: '실행 방식별 2+',
    allFiveArtifacts: '결과물 5종',
    allFiveIntents: 'Intent 5종',
    allThreeCompletionModes: '완료 방식 3종',
    scheduleModesPresent: '일정 방식 전체',
    recurrencePresent: '반복 규칙',
    fieldsPresent: 'Field',
    memosPresent: 'Memo',
    oneToManyPresent: '1:many mapping',
    manyToOnePresent: 'many:1 mapping',
    manyToManyPresent: 'many:many mapping',
    omissionControlPresent: '생략 사유',
    optionalItemPresent: '선택 Item',
    conditionPresent: '조건',
    dependencyPresent: '의존 관계',
    twoSetupInputPathPresent: '2개 setup 입력',
    duringExecutionFieldPresent: '실행 중 기록 Field',
    singleItemFixturePresent: '단일 Item fixture',
    boundaryControlsAtMostFive: '경계 제어 5개 이하',
  };
  return labels[String(value)] || String(value || '—').replaceAll('_', ' ');
}

function sourceRowsForItem(fixture, item) {
  const refIds = new Set(item.sourceRefIds || []);
  const rowIds = new Set(
    sourceRefsOf(fixture)
      .filter((ref) => refIds.has(ref.sourceRefId))
      .flatMap((ref) => ref.sourceRowIds || []),
  );
  return rowsOf(fixture).filter((row) => rowIds.has(row.sourceRowId));
}

function projectionNames(fixture) {
  const evaluation = fixture.projectionEvaluation || {};
  const selected = ['calendar', 'checklist', 'todo', 'sheet', 'memo'].filter(
    (key) => evaluation[key]?.selected || evaluation.primaryArtifact === key,
  );
  return unique([
    fixture.taxonomy?.primaryArtifact,
    ...(fixture.taxonomy?.secondaryArtifacts || []),
    ...selected,
  ]);
}

function countText(value) {
  return new Intl.NumberFormat('ko-KR').format(Number(value || 0));
}

function compactCaseTitle(value, suffix, limit = 46) {
  const text = String(value || '콘텐츠');
  const compact = text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
  return `${compact} · ${suffix}`;
}

function titleBlock({ number, question, answer, note = '' }) {
  return `<header class="slide-head">
    <span>${esc(number)}</span>
    <div>
      <p>${esc(question)}</p>
      <h2>${esc(answer)}</h2>
      ${note ? `<div class="slide-note">${esc(note)}</div>` : ''}
    </div>
  </header>`;
}

function metric(labelText, value, note = '') {
  return `<div class="metric"><strong>${esc(countText(value))}</strong><span>${esc(labelText)}</span>${
    note ? `<small>${esc(note)}</small>` : ''
  }</div>`;
}

function chip(value, tone = '') {
  return `<span class="chip ${esc(tone)}">${esc(label(value))}</span>`;
}

function visibleRows(fixture, rowIds) {
  const byId = new Map(rowsOf(fixture).map((row) => [row.sourceRowId, row]));
  const selected = (rowIds || []).map((id) => byId.get(id)).filter(Boolean);
  return selected.length ? selected : rowsOf(fixture).slice(0, 3);
}

function visibleItems(fixture, itemIds) {
  const byId = new Map(itemsOf(fixture).map((item) => [item.itemId, item]));
  const selected = (itemIds || []).map((id) => byId.get(id)).filter(Boolean);
  return selected.length ? selected : itemsOf(fixture).slice(0, 3);
}

function sourceRowCards(rows) {
  return rows
    .map(
      (row, index) => `<article class="source-row">
        <span>SR ${String(index + 1).padStart(2, '0')}</span>
        <div>
          <strong>${esc(row.title)}</strong>
          <p>${esc(row.detail || row.locator || '원문 위치와 순서를 보존')}</p>
          <small>${esc(label(row.rowType))} · ${esc(row.locator || row.sourceRowId)}</small>
        </div>
      </article>`,
    )
    .join('');
}

function itemCards(fixture, items) {
  return items
    .map((item, index) => {
      const supportingRows = sourceRowsForItem(fixture, item);
      return `<article class="item-row">
        <span>I ${String(index + 1).padStart(2, '0')}</span>
        <div>
          <strong>${esc(item.title)}</strong>
          <p>${esc(item.description || item.completion?.doneWhen || '독립 실행 상태를 가진 Item')}</p>
          <div class="micro-line">
            ${chip(item.intent, 'canonical')}
            ${chip(item.completion?.mode, 'canonical')}
            ${chip(item.schedule ? item.schedule.mode : 'none', item.schedule ? 'projection' : '')}
            <span>${esc(`${supportingRows.length} SourceRow`)}</span>
          </div>
        </div>
      </article>`;
    })
    .join('');
}

function projectionStrip(fixture) {
  const evaluation = fixture.projectionEvaluation || {};
  return ['calendar', 'checklist', 'todo', 'sheet', 'memo']
    .map((name) => {
      const selected = projectionNames(fixture).includes(name);
      const count =
        name === 'calendar'
          ? evaluation.calendar?.eventCount || 0
          : name === 'sheet'
            ? evaluation.sheet?.rows?.length || 0
            : name === 'memo'
              ? evaluation.memo?.blocks?.length || 0
              : evaluation[name]?.entries?.length || 0;
      const caption =
        name === 'calendar' && !selected
          ? '일정 없으면 비활성'
          : selected
            ? `${countText(count)}개 출력 단위`
            : '선택하지 않음';
      return `<div class="projection-node ${selected ? 'is-on' : 'is-off'}">
        <span>${esc(label(name))}</span>
        <strong>${esc(caption)}</strong>
      </div>`;
    })
    .join('');
}

function sourceCaseSlide(fixture, representative, pairIndex, { hero = false } = {}) {
  const rows = visibleRows(fixture, representative.sourceRowIds);
  const mainItem = visibleItems(fixture, representative.itemIds)[0];
  const sourceHost = (() => {
    try {
      return new URL(fixture.source.canonicalUrl || fixture.source.url).hostname;
    } catch {
      return fixture.source.provider || '원문';
    }
  })();
  return `<section class="deck-screen case-screen source-case ${hero ? 'opening' : ''}" 
    id="case-${pairIndex}-source" data-case-pair="${pairIndex}" data-case-screen="source">
    <div class="screen-inner">
      ${
        hero
          ? `<header class="opening-title">
              <p>FlowMe Canonical Structure Corpus Expansion v1</p>
              <h1>원문 한 줄이<br>실행 가능한 데이터가 되는<br>과정</h1>
              <div>첫 화면부터 실제 사례 · ${esc(fixture.source.title)}</div>
            </header>`
          : titleBlock({
              number: `${String(pairIndex).padStart(2, '0')}A`,
              question: '원문을 무엇으로 읽었나',
              answer: compactCaseTitle(fixture.source.title, '원문에서 SourceRow로'),
              note: representative.claim,
            })
      }
      <div class="case-source-grid">
        <article class="source-document">
          <div class="browser-line"><span></span><span></span><span></span><b>${esc(sourceHost)}</b></div>
          <div class="source-document-body">
            <p>${esc(fixture.source.provider || '원문 제공자')}</p>
            <h3>${esc(fixture.source.title)}</h3>
            <strong>${esc(fixture.userNeed)}</strong>
            <div class="source-facts">
              <span>${esc(label(fixture.taxonomy.sourceShape))}</span>
              <span>${esc(`${countText(fixture.metrics.sourceRowCount)}개 원문 행`)}</span>
              <span>${esc(fixture.source.locale || 'locale unknown')}</span>
            </div>
          </div>
          <footer>
            <span>원문에서 확보한 값은 다시 묻지 않는다</span>
            <a href="${esc(fixture.source.canonicalUrl || fixture.source.url || '#')}" target="_blank" rel="noreferrer">원문 링크</a>
          </footer>
        </article>
        <div class="source-to-row">
          <div class="transform-label"><span>01</span><strong>원문을 행 단위 근거로 고정</strong></div>
          <div class="source-row-stack">${sourceRowCards(rows)}</div>
          <div class="case-callout">
            <span>다음 상태 단위</span>
            <strong>${esc(mainItem?.title || 'SourceRow를 실행 가능한 Item으로 묶는다')}</strong>
          </div>
        </div>
      </div>
      ${hero ? `<a class="opening-next" href="#case-1-result">Item 구조 보기 ↓</a>` : ''}
    </div>
  </section>`;
}

function resultCaseSlide(fixture, representative, pairIndex, { hero = false } = {}) {
  const items = visibleItems(fixture, representative.itemIds);
  const firstStep = stepsOf(fixture).find((step) => step.itemIds?.includes(items[0]?.itemId)) || stepsOf(fixture)[0];
  const requiredInputs = fixture.inputs?.required || [];
  return `<section class="deck-screen case-screen result-case ${hero ? 'opening-result' : ''}" 
    id="case-${pairIndex}-result" data-case-pair="${pairIndex}" data-case-screen="result">
    <div class="screen-inner">
      ${titleBlock({
        number: `${String(pairIndex).padStart(2, '0')}B`,
        question: '사용자는 실제로 무엇을 실행하나',
        answer: compactCaseTitle(fixture.source.title, 'Item에서 projection으로'),
        note:
          requiredInputs.length === 0
            ? '첫 실행 필수 입력 0개 · 원문 값만으로 시작'
            : `첫 실행 필수 입력 ${requiredInputs.length}개 · ${requiredInputs.map((input) => input.label || input.key).join(', ')}`,
      })}
      <div class="case-result-grid">
        <div class="canonical-side">
          <div class="hierarchy-path">
            <span>SourceRow ${countText(fixture.metrics.sourceRowCount)}</span><b>→</b>
            <span>Item ${countText(fixture.metrics.itemCount)}</span><b>→</b>
            <span>Step ${countText(fixture.metrics.stepCount)}</span><b>→</b>
            <span>Flow ${countText(fixture.metrics.flowCount)}</span><b>→</b>
            <span>Bundle 1</span>
          </div>
          <div class="item-stack">${itemCards(fixture, items)}</div>
          <div class="step-context">
            <span>현재 Step</span>
            <strong>${esc(firstStep?.title || '단일 실행 그룹')}</strong>
            <small>Step은 묶음만 담당하고 완료 상태는 각 Item이 소유</small>
          </div>
        </div>
        <div class="projection-side">
          <div class="projection-title">
            <span>${esc(label(fixture.taxonomy.primaryExecutionPattern))}</span>
            <h3>같은 canonical Item을 필요한 도구로 보낸다</h3>
          </div>
          <div class="projection-list">${projectionStrip(fixture)}</div>
          <div class="projection-rule">
            <strong>${esc(
              (fixture.metrics.scheduledItemCount || 0) > 0
                ? `${countText(fixture.metrics.scheduledItemCount)}개 일정 Item만 VEVENT 후보`
                : '날짜 없는 Item에는 VEVENT를 만들지 않음',
            )}</strong>
            <p>${esc(
              fixture.projectionEvaluation?.calendar?.rule ||
                'Calendar는 canonical 원본이 아니라 선택 가능한 projection이다.',
            )}</p>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function conceptSlides(context) {
  const { corpus, coverage, firstFixture, firstItem } = context;
  const observed = coverage.observed || {};
  const sourceRows = corpus.counts.sourceRows;
  const items = corpus.counts.items;
  const steps = corpus.counts.steps;
  const flows = corpus.counts.flows;
  const completeFixtures = corpus.counts.completeFixtures;
  const noCalendar = corpus.fixtures.filter(
    (fixture) => (fixture.projectionEvaluation?.calendar?.eventCount || 0) === 0,
  ).length;
  const relationTypes = observed.relationTypes || frequency(
    corpus.fixtures.flatMap((fixture) => fixture.conversionAudit?.rowAccounting?.map((entry) => entry.relationType) || []),
  );
  return [
    `<section class="deck-screen" id="model">
      <div class="screen-inner">
        ${titleBlock({
          number: '01',
          question: '무엇을 기본 데이터로 둘 것인가',
          answer: 'ICS가 아니라 Item을 원본으로 둔다',
          note: '날짜가 있는 실행도, 날짜가 없는 진도·결정·기록도 같은 구조로 보존하기 위해서다.',
        })}
        <div class="thesis-layout">
          <div class="thesis-main">
            <p>SourceRow는 <b>원문 근거</b>, Item은 <b>독립 실행 상태</b>다.</p>
            <strong>Calendar · Checklist · Todo · Sheet · Memo는<br>Item을 쓰는 다섯 가지 방법이다.</strong>
          </div>
          <div class="thesis-proof">
            ${metric('완전 fixture', completeFixtures)}
            ${metric('날짜 없는 Item', corpus.counts.undatedItems, '그래도 완전한 실행 데이터')}
            ${metric('Calendar 없는 fixture', noCalendar, '자연스러운 비Calendar 결과')}
          </div>
        </div>
      </div>
    </section>`,
    `<section class="deck-screen alt" id="hierarchy">
      <div class="screen-inner">
        ${titleBlock({
          number: '02',
          question: '원문과 실행 화면 사이에는 무엇이 있나',
          answer: '근거·상태·그룹·목적·출력을 서로 다른 층으로 둔다',
          note: 'UX는 층을 숨길 수 있지만, backend는 각 층의 ID와 소유권을 섞지 않는다.',
        })}
        <div class="pipeline">
          <div class="pipe source"><span>${countText(sourceRows)}</span><strong>SourceRow</strong><small>원문 최소 근거</small></div>
          <b>→</b>
          <div class="pipe canonical"><span>${countText(items)}</span><strong>Item</strong><small>최소 상태 단위</small></div>
          <b>→</b>
          <div class="pipe canonical"><span>${countText(steps)}</span><strong>Step</strong><small>의미 그룹</small></div>
          <b>→</b>
          <div class="pipe canonical"><span>${countText(flows)}</span><strong>Flow</strong><small>한 사용자 job</small></div>
          <b>→</b>
          <div class="pipe canonical"><span>${countText(completeFixtures)}</span><strong>Bundle / Map</strong><small>관련 Flow 묶음</small></div>
          <b>→</b>
          <div class="pipe projection"><span>5</span><strong>Projection</strong><small>도구별 표현</small></div>
        </div>
        <p class="large-rule">완료 상태는 Item이 소유한다. Step·Flow·Map·외부 파일이 대신 소유하지 않는다.</p>
      </div>
    </section>`,
    `<section class="deck-screen" id="row-vs-item">
      <div class="screen-inner">
        ${titleBlock({
          number: '03',
          question: 'SourceRow와 Item은 왜 따로 필요한가',
          answer: '원문 한 줄과 사용자가 체크할 한 단위는 항상 1:1이 아니다',
          note: '합치거나 나눌 때도 모든 원문 행이 어디로 갔는지 추적해야 한다.',
        })}
        <div class="compare-halves">
          <article class="compare-half source-half">
            <span>SourceRow</span>
            <h3>원문이 실제로 말한 최소 조각</h3>
            <ul>
              <li>제목·설명·원문 위치</li>
              <li>sourceId·snapshotId</li>
              <li>행의 순서와 종류</li>
              <li>실행이 아닌 주의·맥락도 포함</li>
            </ul>
          </article>
          <article class="compare-half canonical-half">
            <span>Item</span>
            <h3>사용자가 독립적으로 완료·결정·기록할 단위</h3>
            <ul>
              <li>intent와 completion</li>
              <li>선택적 schedule·Field·Memo</li>
              <li>SourceRef로 근거 연결</li>
              <li>개인 실행 상태의 기준 ID</li>
            </ul>
          </article>
        </div>
        <div class="mapping-band"><b>지원 관계</b>${entriesOf(relationTypes)
          .map(([name, count]) => `<span>${esc(label(name))} · ${esc(countText(count))}</span>`)
          .join('')}</div>
      </div>
    </section>`,
    `<section class="deck-screen alt" id="item-anatomy">
      <div class="screen-inner">
        ${titleBlock({
          number: '04',
          question: 'Item 한 개에는 무엇이 들어가나',
          answer: `${firstFixture.source.title}의 실제 Item을 펼쳐본다`,
          note: '제목·실행 의도·완료 조건·SourceRef가 기본이고, 일정·입력·기록값은 필요한 경우에만 켜진다.',
        })}
        <div class="anatomy-layout">
          <article class="anatomy-card">
            <div class="anatomy-title"><span>Item</span><strong>${esc(firstItem.title)}</strong></div>
            <dl>
              <div><dt>intent</dt><dd>${esc(label(firstItem.intent))}</dd></div>
              <div><dt>completion</dt><dd>${esc(label(firstItem.completion?.mode))}</dd></div>
              <div><dt>detail</dt><dd>${esc(firstItem.description || firstItem.completion?.doneWhen || '—')}</dd></div>
              <div><dt>schedule</dt><dd>${esc(scheduleText(firstItem.schedule))}</dd></div>
              <div><dt>sourceRefs</dt><dd>${esc(countText(firstItem.sourceRefIds?.length || 0))}개</dd></div>
            </dl>
          </article>
          <div class="anatomy-rules">
            <article><span>항상</span><strong>identity · title · intent · completion · order · sourceRefs</strong></article>
            <article><span>필요할 때만</span><strong>schedule · fields · location · condition · dependency · memo</strong></article>
            <article><span>별도 층</span><strong>사용자 수정 · 실행 기록 · review · projection 결과</strong></article>
          </div>
        </div>
      </div>
    </section>`,
    `<section class="deck-screen" id="field-memo">
      <div class="screen-inner">
        ${titleBlock({
          number: '05',
          question: '무엇을 Item으로 만들지 말아야 하나',
          answer: '값은 Field, 설명은 Memo, 독립 상태만 Item',
          note: '모든 문장을 체크박스로 만들면 Flow의 가치가 떨어진다.',
        })}
        <div class="boundary-lanes">
          <article><span>Item</span><h3>독립 실행·확인·결정·기록</h3><p>사용자가 완료 상태를 따로 남길 이유가 있을 때만 생성</p></article>
          <article><span>Field</span><h3>정렬·일정·입력·기록에 쓰는 값</h3><p>${countText(corpus.counts.fields)}개 typed Field가 실제 corpus에 존재</p></article>
          <article><span>Memo</span><h3>방법·맥락·주의·링크·자유문</h3><p>${countText(corpus.counts.memos)}개 Memo가 실행 항목을 부풀리지 않고 설명을 보존</p></article>
        </div>
        <p class="large-rule">원문의 값은 자동 채우고, 사용자에게는 아직 모르는 최소값만 요청한다.</p>
      </div>
    </section>`,
    `<section class="deck-screen alt" id="schedule">
      <div class="screen-inner">
        ${titleBlock({
          number: '06',
          question: '언제 Calendar가 생기나',
          answer: 'Item에 근거 있는 schedule이 있을 때만',
          note: '행 순서·주차·D+n 표시는 실제 날짜가 아니다. source 또는 사용자 anchor가 날짜를 결정해야 한다.',
        })}
        <div class="schedule-branches">
          <article class="schedule-on">
            <span>schedule 있음</span>
            <strong>${countText(corpus.counts.scheduledItems)} Item</strong>
            <div>${entriesOf(observed.scheduleModes || {})
              .filter(([name]) => name !== 'none')
              .map(([name, count]) => `<p><b>${esc(label(name))}</b><span>${esc(countText(count))}</span></p>`)
              .join('')}</div>
            <footer>해결된 일정만 VEVENT 후보</footer>
          </article>
          <article class="schedule-off">
            <span>schedule 없음</span>
            <strong>${countText(corpus.counts.undatedItems)} Item</strong>
            <p>진도·절차·자료 큐·결정은 날짜 없이도 완전하다.</p>
            <footer>Checklist · Todo · Sheet · Memo</footer>
          </article>
        </div>
      </div>
    </section>`,
    `<section class="deck-screen" id="projection">
      <div class="screen-inner">
        ${titleBlock({
          number: '07',
          question: '한 Item은 여러 도구에서 어떻게 보이나',
          answer: '의미는 하나, 표현은 목적지마다 다르다',
          note: 'projection은 필요할 때 생성하며 canonical 완료 상태를 소유하지 않는다.',
        })}
        <div class="projection-radial">
          <div class="radial-center"><span>Canonical</span><strong>Item</strong><small>상태·근거·일정의 원본</small></div>
          ${entriesOf(observed.primaryArtifacts || {})
            .map(
              ([name, count]) =>
                `<div class="radial-node"><span>${esc(label(name))}</span><strong>${esc(countText(count))} fixtures</strong></div>`,
            )
            .join('')}
        </div>
        <div class="projection-guardrails"><span>일정 없는 VEVENT 0</span><span>VEVENT/VTODO 중첩 0</span><span>VTODO 기본 off + fallback</span></div>
      </div>
    </section>`,
    `<section class="deck-screen alt" id="accounting">
      <div class="screen-inner">
        ${titleBlock({
          number: '08',
          question: '변환 중 손실과 발명을 어떻게 막나',
          answer: '모든 SourceRow의 도착점을 기록한다',
          note: 'Item으로 만들지 않은 행도 Field·Memo·문맥·생략 사유 중 하나로 남긴다.',
        })}
        <div class="accounting-flow">
          <div class="accounting-source"><span>${countText(sourceRows)}</span><strong>captured SourceRows</strong></div>
          <b>→</b>
          <div class="accounting-targets">
            ${entriesOf(relationTypes)
              .map(([name, count]) => `<article><strong>${esc(label(name))}</strong><span>${esc(countText(count))}</span></article>`)
              .join('')}
          </div>
        </div>
        <div class="audit-rules">
          <span>행마다 target 또는 omission reason</span>
          <span>Item의 행동·완료·일정 각각 provenance</span>
          <span>원문에 없는 날짜·반복·행동 생성 금지</span>
        </div>
      </div>
    </section>`,
  ];
}

function summarySlides(context) {
  const { corpus, coverage, decisions, runtime, dtos } = context;
  const requiredCoverage = coverage.requiredCoverage || {};
  const batchCounts = frequency(corpus.fixtures.map((fixture) => fixture.batch));
  const shapeCounts = coverage.observed?.sourceShapes || frequency(corpus.fixtures.map((fixture) => fixture.taxonomy.sourceShape));
  const decisionSummary = decisions.summary?.byStatus || frequency(decisions.decisions.map((entry) => entry.status));
  const runtimeSummary = runtime.summary?.byStatus || frequency(runtime.fieldMappings.map((entry) => entry.status));
  const boundaryControls = corpus.boundaryControls || [];
  const gate = decisions.implementationGate || {};
  return [
    `<section class="deck-screen" id="coverage">
      <div class="screen-inner">
        ${titleBlock({
          number: '33',
          question: '40개 이상으로 무엇이 달라졌나',
          answer: '카테고리가 아니라 구조 축으로 포화도를 확인했다',
          note: '같은 형태를 많이 모으는 대신 schedule·intent·completion·mapping·projection 경로가 실제 원문에서 반복되는지 확인했다.',
        })}
        <div class="coverage-layout">
          <div class="coverage-big">
            ${metric('완전 fixture', corpus.counts.completeFixtures)}
            ${metric('SourceRow', corpus.counts.sourceRows)}
            ${metric('Item', corpus.counts.items)}
          </div>
          <div class="coverage-checks">
            ${entriesOf(requiredCoverage)
              .map(
                ([name, passed]) =>
                  `<div class="${passed ? 'pass' : 'fail'}"><span>${passed ? '✓' : '!'}</span><strong>${esc(label(name))}</strong></div>`,
              )
              .join('')}
          </div>
        </div>
      </div>
    </section>`,
    `<section class="deck-screen alt" id="shape-coverage">
      <div class="screen-inner">
        ${titleBlock({
          number: '34',
          question: '어떤 원문 형태를 실제로 다뤘나',
          answer: '행의 모양이 달라도 같은 canonical 문법으로 정리된다',
          note: '분포는 목표 비율이 아니라 실제 확보된 완전 source packet의 결과다.',
        })}
        <div class="shape-bars">
          ${entriesOf(shapeCounts)
            .map(([name, count]) => {
              const max = Math.max(...Object.values(shapeCounts), 1);
              const width = Math.max(8, Math.round((Number(count) / max) * 100));
              return `<div><span>${esc(label(name))}</span><i><b style="width:${width}%"></b></i><strong>${esc(countText(count))}</strong></div>`;
            })
            .join('')}
        </div>
        <div class="batch-line">${entriesOf(batchCounts)
          .map(([name, count]) => `<span>${esc(label(name))} <b>${esc(countText(count))}</b></span>`)
          .join('')}</div>
      </div>
    </section>`,
    `<section class="deck-screen" id="backend-dto">
      <div class="screen-inner">
        ${titleBlock({
          number: '35',
          question: 'Backend에는 어떤 예시를 넘기나',
          answer: `${countText(dtos.count || dtos.dtos?.length)}개 대표 DTO로 구현 경로를 고정한다`,
          note: '날짜 역산·고정 일시·날짜창·반복·결정·기록·자료 사용·무Calendar를 같은 응답 계약으로 비교한다.',
        })}
        <div class="dto-layout">
          <div class="dto-list">${(dtos.dtos || [])
            .slice(0, 9)
            .map(
              (dto, index) =>
                `<article><span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(label(dto.archetype))}</strong><small>${esc(dto.source?.title || dto.fixtureId)}</small></article>`,
            )
            .join('')}</div>
          <div class="dto-code">
            <span>공통 응답</span>
            <code>source + taxonomy</code>
            <code>bundle / flows / steps / items</code>
            <code>fields / memos / sourceRows / sourceRefs</code>
            <code>inputs + projectionEvaluation</code>
            <strong>한 구조로 15개 archetype 표현</strong>
          </div>
        </div>
      </div>
    </section>`,
    `<section class="deck-screen alt" id="runtime-crosswalk">
      <div class="screen-inner">
        ${titleBlock({
          number: '36',
          question: '현재 앱 구조와 얼마나 가까운가',
          answer: '바로 대응되는 필드와 새 backend 필드를 분리했다',
          note: '이번 목표는 runtime을 바꾸지 않는다. adapter와 신규 저장 계약의 범위만 수치로 넘긴다.',
        })}
        <div class="runtime-layout">
          <div class="runtime-counts">${entriesOf(runtimeSummary)
            .map(([name, count]) => `<article><strong>${esc(countText(count))}</strong><span>${esc(label(name))}</span></article>`)
            .join('')}</div>
          <div class="runtime-phases">
            ${(runtime.recommendedMigrationOrder || [])
              .map((entry) => `<p><span>${esc(entry.phase)}</span><strong>${esc(entry.action)}</strong></p>`)
              .join('')}
          </div>
        </div>
      </div>
    </section>`,
    `<section class="deck-screen" id="planning-decisions">
      <div class="screen-inner">
        ${titleBlock({
          number: '37',
          question: '기획에서 확정된 것과 남은 것은 무엇인가',
          answer: `${countText(decisions.summary?.decisionCount)}개 결정을 세 상태로 나눴다`,
          note: '확정값은 backend 기본 계약, 정책 선택은 controlled option, 열린 결정은 sidecar 또는 NOT IMPLEMENTED로 유지한다.',
        })}
        <div class="decision-columns">
          ${['settled', 'configurable', 'open']
            .map((status) => {
              const examples = decisions.decisions.filter((entry) => entry.status === status).slice(0, 3);
              return `<article class="${esc(status)}">
                <div><span>${esc(label(status))}</span><strong>${esc(countText(decisionSummary[status] || 0))}</strong></div>
                ${examples.map((entry) => `<p>${esc(entry.decision)}</p>`).join('')}
              </article>`;
            })
            .join('')}
        </div>
      </div>
    </section>`,
    `<section class="deck-screen final-screen" id="handoff">
      <div class="screen-inner">
        ${titleBlock({
          number: '38',
          question: '이제 무엇을 기획과 Backend에 넘길 수 있나',
          answer: 'Item-first canonical 계약은 구현을 시작할 만큼 명확하다',
          note: '단, 외부 Calendar 왕복·실사용자 가치·공개 가능성은 이번 구조 검증의 결과가 아니다.',
        })}
        <div class="handoff-grid">
          <article class="can-start">
            <span>바로 시작</span>
            ${(gate.backendCanStartWith || []).map((entry) => `<p>${esc(entry)}</p>`).join('')}
          </article>
          <article class="must-not">
            <span>아직 가정 금지</span>
            ${(gate.backendMustNotAssume || []).map((entry) => `<p>${esc(entry)}</p>`).join('')}
          </article>
        </div>
        <div class="boundary-note">
          <strong>연구용 중지 사례 ${esc(countText(boundaryControls.length))}개</strong>
          <span>원문 행이 불완전한 경우 complete Item을 만들지 않고 링크·Memo 수준에서 멈춘다.</span>
          <a href="#explorer">전체 fixture 탐색기 보기 ↓</a>
        </div>
      </div>
    </section>`,
  ];
}

function integrityCheck({ corpus, coverage, storyboard, decisions, runtime, dtos }) {
  if (!Array.isArray(corpus.fixtures) || corpus.fixtures.length < 40) {
    throw new Error(`Report requires at least 40 complete fixtures; received ${corpus.fixtures?.length || 0}.`);
  }
  const fixtureIds = corpus.fixtures.map((fixture) => fixture.fixtureId);
  if (new Set(fixtureIds).size !== fixtureIds.length) throw new Error('Duplicate fixtureId found in canonical corpus.');
  if (!Array.isArray(storyboard.representatives) || storyboard.representatives.length !== 12) {
    throw new Error(`Report requires exactly 12 representatives; received ${storyboard.representatives?.length || 0}.`);
  }
  if (storyboard.representativeCount !== 12) {
    throw new Error(`Storyboard representativeCount must be 12; received ${storyboard.representativeCount}.`);
  }
  if (storyboard.mainDeckTargetScreens < 30 || storyboard.mainDeckTargetScreens > 40) {
    throw new Error(`mainDeckTargetScreens must be within 30–40; received ${storyboard.mainDeckTargetScreens}.`);
  }
  const fixtureById = new Map(corpus.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const representativeIds = storyboard.representatives.map((entry) => entry.fixtureId);
  if (new Set(representativeIds).size !== representativeIds.length) {
    throw new Error('Storyboard representatives must use 12 unique fixture IDs.');
  }
  for (const representative of storyboard.representatives) {
    const fixture = fixtureById.get(representative.fixtureId);
    if (!fixture) throw new Error(`Storyboard references unknown fixture: ${representative.fixtureId}.`);
    const rowIds = new Set(rowsOf(fixture).map((row) => row.sourceRowId));
    const itemIds = new Set(itemsOf(fixture).map((item) => item.itemId));
    for (const sourceRowId of representative.sourceRowIds || []) {
      if (!rowIds.has(sourceRowId)) {
        throw new Error(`Storyboard ${representative.fixtureId} references unknown SourceRow ${sourceRowId}.`);
      }
    }
    for (const itemId of representative.itemIds || []) {
      if (!itemIds.has(itemId)) {
        throw new Error(`Storyboard ${representative.fixtureId} references unknown Item ${itemId}.`);
      }
    }
  }
  const computedCounts = {
    completeFixtures: corpus.fixtures.length,
    sourceRows: corpus.fixtures.reduce((sum, fixture) => sum + rowsOf(fixture).length, 0),
    items: corpus.fixtures.reduce((sum, fixture) => sum + itemsOf(fixture).length, 0),
    steps: corpus.fixtures.reduce((sum, fixture) => sum + stepsOf(fixture).length, 0),
    flows: corpus.fixtures.reduce((sum, fixture) => sum + flowsOf(fixture).length, 0),
  };
  for (const [key, value] of Object.entries(computedCounts)) {
    if (Number(corpus.counts?.[key]) !== value) {
      throw new Error(`Corpus count mismatch for ${key}: declared ${corpus.counts?.[key]}, computed ${value}.`);
    }
  }
  if (!coverage.observed || Number(coverage.observed.fixtureCount) !== corpus.fixtures.length) {
    throw new Error('Coverage fixture count does not match canonical corpus.');
  }
  if (!Array.isArray(decisions.decisions) || !Array.isArray(runtime.fieldMappings) || !Array.isArray(dtos.dtos)) {
    throw new Error('Planning decision, runtime crosswalk, or backend DTO input has an invalid collection shape.');
  }
  return { fixtureById, computedCounts };
}

function slimFixture(fixture) {
  return {
    fixtureId: fixture.fixtureId,
    batch: fixture.batch,
    evidenceTier: fixture.evidenceTier,
    source: {
      title: fixture.source.title,
      provider: fixture.source.provider,
      canonicalUrl: fixture.source.canonicalUrl,
      locale: fixture.source.locale,
      observedAt: fixture.source.observedAt,
    },
    userNeed: fixture.userNeed,
    taxonomy: fixture.taxonomy,
    metrics: fixture.metrics,
    inputs: fixture.inputs,
    bundle: {
      bundleId: fixture.canonicalContent.bundle?.bundleId,
      title: fixture.canonicalContent.bundle?.title,
      flowIds: fixture.canonicalContent.bundle?.flowIds || [],
    },
    flows: flowsOf(fixture).map((flow) => ({
      flowId: flow.flowId,
      title: flow.title,
      stepIds: flow.stepIds || [],
      primarySourceId: flow.primarySourceId,
    })),
    steps: stepsOf(fixture).map((step) => ({
      stepId: step.stepId,
      flowId: step.flowId,
      title: step.title,
      order: step.order,
      itemIds: step.itemIds || [],
      groupingHint: step.groupingHint || '',
    })),
    items: itemsOf(fixture).map((item) => ({
      itemId: item.itemId,
      stepId: item.stepId,
      title: item.title,
      description: item.description || '',
      intent: item.intent,
      completion: item.completion,
      schedule: item.schedule || null,
      optional: Boolean(item.optional),
      sourceRefIds: item.sourceRefIds || [],
      fieldIds: item.fieldIds || [],
      memoIds: item.memoIds || [],
    })),
    sourceRows: rowsOf(fixture).map((row) => ({
      sourceRowId: row.sourceRowId,
      rowType: row.rowType,
      title: row.title,
      detail: row.detail || '',
      locator: row.locator || '',
      order: row.order,
    })),
    sourceRefs: sourceRefsOf(fixture).map((ref) => ({
      sourceRefId: ref.sourceRefId,
      entityType: ref.entityType,
      entityId: ref.entityId,
      sourceRowIds: ref.sourceRowIds || [],
      relation: ref.relation,
    })),
    fields: fieldsOf(fixture).map((field) => ({
      fieldId: field.fieldId,
      key: field.key,
      label: field.label,
      valueType: field.valueType,
      purposes: field.purposes || [],
      valueSource: field.valueSource,
      required: Boolean(field.required),
    })),
    memos: memosOf(fixture).map((memo) => ({
      memoId: memo.memoId,
      title: memo.title || '',
      body: memo.text || memo.body || memo.content || '',
      kind: memo.kind || memo.memoType || 'context',
    })),
    rowAccounting: (fixture.conversionAudit?.rowAccounting || []).map((entry) => ({
      sourceRowId: entry.sourceRowId,
      targets: entry.targets || [],
      targetType: entry.targetType,
      relationType: entry.relationType,
      reason: entry.reason || '',
    })),
    canonicalExtensionCandidates: fixture.conversionAudit?.canonicalExtensionCandidates || [],
    classificationDelta: fixture.conversionAudit?.classificationDelta || null,
    projection: {
      primaryArtifact: fixture.projectionEvaluation?.primaryArtifact || fixture.taxonomy.primaryArtifact,
      secondaryArtifacts:
        fixture.projectionEvaluation?.secondaryArtifacts || fixture.taxonomy.secondaryArtifacts || [],
      calendarPolicy: fixture.projectionEvaluation?.calendarPolicy || 'none',
      calendarEligibleScheduledItemCount: fixture.projectionEvaluation?.calendar?.eligibleScheduledItemCount || 0,
      calendarEventCount: fixture.projectionEvaluation?.calendar?.eventCount || 0,
      suppressedUndatedItemIds: fixture.projectionEvaluation?.calendar?.suppressedUndatedItemIds || [],
      vtodoCapabilityStatus: fixture.projectionEvaluation?.vtodo?.capabilityStatus || 'not_tested',
      fallbackOrder: fixture.projectionEvaluation?.vtodo?.fallbackOrder || [],
      selectedArtifacts: projectionNames(fixture),
      forbidden: fixture.projectionEvaluation?.forbidden || [],
      lossNotes: fixture.projectionEvaluation?.lossNotes || [],
    },
    researchBoundary: fixture.researchReview?.claimBoundary || '',
    explorerFacets: {
      states: stateBuckets(fixture),
      relations: relationBuckets(fixture),
      hierarchy: hierarchyBucket(fixture),
      origin: originBucket(fixture),
      extension: extensionBucket(fixture),
    },
  };
}

function filterOptions(fixtures) {
  return {
    sourceShape: unique(fixtures.map((fixture) => fixture.taxonomy.sourceShape)).sort(),
    executionPattern: unique(fixtures.map((fixture) => fixture.taxonomy.primaryExecutionPattern)).sort(),
    artifact: unique(fixtures.map((fixture) => fixture.taxonomy.primaryArtifact)).sort(),
    schedule: unique(fixtures.map(scheduleBucket)).sort(),
    input: unique(fixtures.map(inputBucket)).sort(),
    batch: unique(fixtures.map((fixture) => fixture.batch)).sort(),
    state: unique(fixtures.flatMap(stateBuckets)).sort(),
    relation: unique(fixtures.flatMap(relationBuckets)).sort(),
    hierarchy: unique(fixtures.map(hierarchyBucket)).sort(),
    origin: unique(fixtures.map(originBucket)).sort(),
    extension: unique(fixtures.map(extensionBucket)).sort(),
  };
}

function selectOptions(values) {
  return `<option value="">전체</option>${values
    .map((value) => `<option value="${esc(value)}">${esc(label(value))}</option>`)
    .join('')}`;
}

function explorerCards(fixtures) {
  return fixtures
    .map(
      (fixture, index) => `<button class="fixture-card" type="button"
        data-fixture-card data-index="${index}"
        data-title="${esc(`${fixture.source.title} ${fixture.source.provider} ${fixture.userNeed}`.toLowerCase())}"
        data-source-shape="${esc(fixture.taxonomy.sourceShape)}"
        data-execution-pattern="${esc(fixture.taxonomy.primaryExecutionPattern)}"
        data-artifact="${esc(fixture.taxonomy.primaryArtifact)}"
        data-schedule="${esc(scheduleBucket(fixture))}"
        data-input="${esc(inputBucket(fixture))}"
        data-batch="${esc(fixture.batch)}"
        data-state="${esc(stateBuckets(fixture).join('|'))}"
        data-relation="${esc(relationBuckets(fixture).join('|'))}"
        data-hierarchy="${esc(hierarchyBucket(fixture))}"
        data-origin="${esc(originBucket(fixture))}"
        data-extension="${esc(extensionBucket(fixture))}"
        aria-pressed="${index === 0 ? 'true' : 'false'}">
        <span class="fixture-order">${String(index + 1).padStart(2, '0')}</span>
        <div>
          <strong>${esc(fixture.source.title)}</strong>
          <small>${esc(fixture.source.provider)} · ${esc(label(fixture.batch))}</small>
        </div>
        <div class="fixture-meta">
          <span>${esc(label(fixture.taxonomy.sourceShape))}</span>
          <span>${esc(label(fixture.taxonomy.primaryExecutionPattern))}</span>
          <span>${esc(label(fixture.taxonomy.primaryArtifact))}</span>
        </div>
        <b>${esc(`${countText(fixture.metrics.sourceRowCount)}R → ${countText(fixture.metrics.itemCount)}I`)}</b>
      </button>`,
    )
    .join('');
}

function buildHtml(context) {
  const { corpus, coverage, storyboard, decisions, runtime, dtos, fixtureById } = context;
  const representatives = storyboard.representatives.map((entry) => ({
    representative: entry,
    fixture: fixtureById.get(entry.fixtureId),
  }));
  const first = representatives[0];
  const concepts = conceptSlides({
    corpus,
    coverage,
    firstFixture: first.fixture,
    firstItem: visibleItems(first.fixture, first.representative.itemIds)[0] || itemsOf(first.fixture)[0],
  });
  const summaries = summarySlides({ corpus, coverage, decisions, runtime, dtos });
  const caseSlides = representatives.slice(1).flatMap(({ fixture, representative }, index) => [
    sourceCaseSlide(fixture, representative, index + 2),
    resultCaseSlide(fixture, representative, index + 2),
  ]);
  const mainSlides = [
    sourceCaseSlide(first.fixture, first.representative, 1, { hero: true }),
    resultCaseSlide(first.fixture, first.representative, 1, { hero: true }),
    ...concepts,
    ...caseSlides,
    ...summaries,
  ];
  if (mainSlides.length !== storyboard.mainDeckTargetScreens) {
    throw new Error(
      `Generated ${mainSlides.length} deck screens but storyboard requires ${storyboard.mainDeckTargetScreens}.`,
    );
  }
  const options = filterOptions(corpus.fixtures);
  const explorerData = corpus.fixtures.map(slimFixture);
  const generatedAt = corpus.generatedAt || new Date().toISOString();
  const style = `
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
  body{margin:0;background:var(--paper);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",Arial,sans-serif;line-height:1.56;overflow-wrap:anywhere}
  a{color:inherit}
  button,input,select{font:inherit}
  button{color:inherit}
  .screen-inner,.explorer-inner{width:min(1280px,calc(100% - 72px));margin:auto}
  .deck-progress{position:fixed;z-index:100;left:0;right:0;top:0;height:44px;background:rgba(8,41,31,.96);color:#fff;display:flex;align-items:center;padding:0 24px;gap:16px;font-size:12px}
  .deck-progress a{text-decoration:none;font-weight:900;white-space:nowrap}
  .deck-progress-track{height:2px;background:rgba(255,255,255,.2);flex:1}
  .deck-progress-track i{display:block;height:100%;width:0;background:var(--lime);transition:width .2s ease}
  .deck-progress-count{min-width:58px;text-align:right;font-variant-numeric:tabular-nums}
  .deck-screen{min-height:900px;padding:92px 0 70px;border-bottom:1px solid var(--line);display:flex;align-items:center;position:relative;overflow:hidden}
  .deck-screen.alt{background:var(--white)}
  .slide-head{display:grid;grid-template-columns:70px minmax(0,1fr);gap:22px;align-items:start;margin-bottom:42px}
  .slide-head>span{width:58px;height:58px;border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;color:var(--projection);font-size:13px;font-weight:900}
  .slide-head p,.opening-title p{margin:0 0 5px;color:var(--projection);font-weight:900;font-size:14px}
  h1,h2,h3,p{margin-top:0}
  h1{font-size:clamp(54px,6.1vw,92px);line-height:.98;letter-spacing:-.065em;margin:16px 0 24px}
  h2{font-size:clamp(38px,4.2vw,62px);line-height:1.04;letter-spacing:-.05em;margin:0 0 13px;max-width:1060px}
  h3{font-size:24px;line-height:1.22;letter-spacing:-.03em}
  .slide-note{font-size:17px;color:var(--muted);max-width:950px}
  .opening{background:radial-gradient(circle at 82% 22%,#315d36 0,transparent 34%),linear-gradient(135deg,#05281f,#113d2f);color:white;align-items:flex-start}
  .opening{padding:68px 0 38px}
  .opening .screen-inner{padding-top:8px}
  .opening-title{margin-bottom:20px}
  .opening-title p{color:var(--lime)}
  .opening-title h1{max-width:900px}
  .opening h1{font-size:clamp(48px,5.3vw,76px);margin:10px 0 18px}
  .opening-title div{font-size:19px;color:#cadbd2}
  .opening .case-source-grid{grid-template-columns:.9fr 1.1fr}
  .opening .source-document{color:var(--ink)}
  .opening .source-document{min-height:330px}
  .opening .source-document-body{padding:23px}
  .opening .source-row{padding:9px 0}
  .opening .source-row p{-webkit-line-clamp:1}
  .opening .source-row{border-color:rgba(255,255,255,.18)}
  .opening .source-row strong{color:white}
  .opening .source-row p,.opening .source-row small{color:#c7d8cf}
  .opening .case-callout{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.18)}
  .opening .case-callout span{color:var(--lime)}
  .opening-next{position:absolute;right:46px;bottom:28px;text-decoration:none;color:var(--lime);font-weight:900}
  .case-screen{align-items:flex-start}
  .source-case:not(.opening){padding:72px 0 48px}
  .source-case:not(.opening) .slide-head{margin-bottom:28px}
  .source-case:not(.opening) h2{font-size:clamp(36px,3.7vw,56px)}
  .source-case:not(.opening) .source-document{min-height:390px}
  .source-case:not(.opening) .source-row{padding:11px 0}
  .case-source-grid{display:grid;grid-template-columns:42% 1fr;gap:56px;align-items:start}
  .source-document{background:white;border:1px solid var(--line);box-shadow:var(--shadow);min-height:430px;display:flex;flex-direction:column}
  .browser-line{height:42px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:6px;padding:0 14px;color:var(--muted);font-size:11px}
  .browser-line span{width:8px;height:8px;border-radius:50%;background:#c9d5ce}
  .browser-line b{margin-left:8px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .source-document-body{padding:34px;flex:1}
  .source-document-body>p{color:var(--source);font-size:13px;font-weight:900;margin-bottom:8px}
  .source-document-body h3{font-size:33px;margin:0 0 14px}
  .source-document-body>strong{display:block;color:var(--muted);font-size:17px;font-weight:650}
  .source-facts{display:flex;gap:8px;flex-wrap:wrap;margin-top:30px}
  .source-facts span{background:var(--source-bg);color:var(--source);padding:8px 10px;font-size:12px;font-weight:850}
  .source-document footer{border-top:1px solid var(--line);padding:14px 18px;display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--muted)}
  .source-document footer a{color:var(--source);font-weight:900}
  .transform-label{display:flex;align-items:center;gap:12px;margin-bottom:10px}
  .transform-label span{color:var(--source);font-weight:900}
  .source-row-stack,.item-stack{display:grid}
  .source-row,.item-row{display:grid;grid-template-columns:46px 1fr;gap:14px;padding:14px 0;border-bottom:1px solid var(--line)}
  .source-row>span{color:var(--source);font-size:12px;font-weight:900}
  .item-row>span{color:var(--canonical);font-size:12px;font-weight:900}
  .source-row strong,.item-row strong{display:block;font-size:17px}
  .source-row p,.item-row p{margin:3px 0;color:var(--muted);font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .source-row small{font-size:11px;color:var(--muted)}
  .case-callout{margin-top:22px;border:1px solid var(--line);background:white;padding:20px}
  .case-callout span{display:block;color:var(--canonical);font-size:12px;font-weight:900}
  .case-callout strong{display:block;font-size:21px;margin-top:4px}
  .case-result-grid{display:grid;grid-template-columns:1.12fr .88fr;gap:58px}
  .result-case{padding:64px 0 40px}
  .result-case .slide-head{margin-bottom:28px}
  .result-case h2{font-size:clamp(34px,3.4vw,52px)}
  .result-case .item-row{padding:10px 0}
  .result-case .item-row p{-webkit-line-clamp:1}
  .hierarchy-path{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}
  .hierarchy-path span{padding:7px 9px;background:var(--canonical-bg);color:var(--canonical);font-size:11px;font-weight:900}
  .hierarchy-path b{color:var(--muted)}
  .micro-line{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:7px}
  .chip,.micro-line>span{font-size:10px;padding:4px 7px;background:#eef1ef;color:var(--muted);font-weight:850}
  .chip.canonical{background:var(--canonical-bg);color:var(--canonical)}
  .chip.projection{background:var(--projection-bg);color:var(--projection)}
  .step-context{margin-top:18px;border-left:4px solid var(--canonical);padding:13px 17px}
  .step-context span,.step-context small{display:block;color:var(--muted);font-size:11px}
  .step-context strong{display:block;font-size:19px;margin:3px 0}
  .projection-side{background:white;border:1px solid var(--line);padding:30px}
  .projection-title span{color:var(--projection);font-size:12px;font-weight:900}
  .projection-title h3{font-size:26px;margin:6px 0 20px}
  .projection-list{display:grid;gap:7px}
  .projection-node{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}
  .projection-node span{font-weight:900}
  .projection-node strong{font-size:12px}
  .projection-node.is-on span,.projection-node.is-on strong{color:var(--projection)}
  .projection-node.is-off{opacity:.43}
  .projection-rule{margin-top:22px;padding:16px;background:var(--projection-bg)}
  .projection-rule strong{display:block;color:var(--projection)}
  .projection-rule p{margin:5px 0 0;font-size:12px;color:var(--muted)}
  .thesis-layout{display:grid;grid-template-columns:1.1fr .9fr;gap:70px;align-items:end}
  .thesis-main p{font-size:25px;color:var(--muted)}
  .thesis-main strong{font-size:clamp(36px,4.1vw,58px);line-height:1.08;letter-spacing:-.045em}
  .thesis-proof{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .metric{padding:24px 16px;border-right:1px solid var(--line)}
  .metric:last-child{border-right:0}
  .metric strong{display:block;color:var(--projection);font-size:46px;line-height:1}
  .metric span{display:block;font-size:13px;font-weight:900;margin-top:8px}
  .metric small{display:block;color:var(--muted);font-size:10px;margin-top:4px}
  .pipeline{display:grid;grid-template-columns:repeat(5,1fr auto) 1.2fr;gap:10px;align-items:center}
  .pipe{min-height:178px;background:white;border-top:6px solid var(--line);padding:20px 14px}
  .pipe.source{border-color:var(--source)}
  .pipe.canonical{border-color:var(--canonical)}
  .pipe.projection{border-color:var(--projection)}
  .pipe span{display:block;font-size:41px;line-height:1;font-weight:900;color:var(--canonical)}
  .pipe.source span{color:var(--source)}
  .pipe.projection span{color:var(--projection)}
  .pipe strong,.pipe small{display:block}
  .pipe strong{font-size:17px;margin-top:10px}
  .pipe small{color:var(--muted);font-size:11px;margin-top:4px}
  .pipeline>b{color:var(--muted)}
  .large-rule{margin:40px 0 0;border-left:4px solid var(--lime);padding-left:20px;font-size:22px;font-weight:850}
  .compare-halves{display:grid;grid-template-columns:1fr 1fr;gap:0;background:white;border:1px solid var(--line)}
  .compare-half{padding:42px 46px}
  .compare-half+article{border-left:1px solid var(--line)}
  .compare-half>span{font-size:13px;font-weight:900}
  .source-half>span{color:var(--source)}
  .canonical-half>span{color:var(--canonical)}
  .compare-half h3{font-size:31px;margin:8px 0 22px}
  .compare-half ul{margin:0;padding-left:20px;color:var(--muted);font-size:17px}
  .compare-half li+li{margin-top:8px}
  .mapping-band{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:24px}
  .mapping-band>b{margin-right:8px}
  .mapping-band span{background:var(--paper);border:1px solid var(--line);padding:8px 10px;font-size:12px}
  .anatomy-layout{display:grid;grid-template-columns:.9fr 1.1fr;gap:56px}
  .anatomy-card{background:white;border:1px solid var(--line);box-shadow:var(--shadow)}
  .anatomy-title{background:var(--canonical-bg);padding:28px}
  .anatomy-title span{display:block;color:var(--canonical);font-size:12px;font-weight:900}
  .anatomy-title strong{display:block;font-size:27px;margin-top:5px}
  .anatomy-card dl{margin:0;padding:12px 28px 24px}
  .anatomy-card dl>div{display:grid;grid-template-columns:130px 1fr;gap:16px;padding:10px 0;border-bottom:1px solid var(--line)}
  .anatomy-card dt{font:700 12px ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--canonical)}
  .anatomy-card dd{margin:0;font-size:13px}
  .anatomy-rules{display:grid;gap:14px}
  .anatomy-rules article{border-left:4px solid var(--canonical);padding:20px 24px;background:white}
  .anatomy-rules span{display:block;color:var(--canonical);font-size:12px;font-weight:900}
  .anatomy-rules strong{display:block;margin-top:5px;font-size:20px}
  .boundary-lanes{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .boundary-lanes article{padding:32px;background:white;border-top:6px solid var(--canonical)}
  .boundary-lanes article:nth-child(2){border-color:var(--overlay)}
  .boundary-lanes article:nth-child(3){border-color:var(--source)}
  .boundary-lanes span{font-weight:900;color:var(--canonical)}
  .boundary-lanes h3{font-size:28px;margin:18px 0}
  .boundary-lanes p{color:var(--muted);font-size:16px}
  .schedule-branches{display:grid;grid-template-columns:1fr 1fr;gap:32px}
  .schedule-branches article{background:white;padding:40px;border-top:7px solid var(--projection)}
  .schedule-branches .schedule-off{border-color:var(--canonical)}
  .schedule-branches article>span{font-weight:900;color:var(--projection)}
  .schedule-branches article>strong{display:block;font-size:58px;margin:16px 0}
  .schedule-branches article p{display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding:10px 0;margin:0;color:var(--muted)}
  .schedule-branches footer{margin-top:24px;font-size:21px;font-weight:900}
  .projection-radial{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;align-items:stretch}
  .radial-center,.radial-node{padding:26px 20px;background:white;border:1px solid var(--line);min-height:180px}
  .radial-center{background:var(--canonical-bg);border-color:#c8daf3}
  .radial-center span,.radial-center small,.radial-node span,.radial-node strong{display:block}
  .radial-center span{color:var(--canonical);font-weight:900}
  .radial-center strong{font-size:40px}
  .radial-center small{color:var(--muted)}
  .radial-node span{color:var(--projection);font-weight:900}
  .radial-node strong{font-size:25px;margin-top:24px}
  .projection-guardrails{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}
  .projection-guardrails span{padding:11px 14px;background:var(--projection-bg);color:var(--projection);font-weight:900}
  .accounting-flow{display:grid;grid-template-columns:.65fr auto 1.35fr;gap:34px;align-items:center}
  .accounting-source{background:var(--source-bg);padding:42px}
  .accounting-source span{display:block;font-size:64px;color:var(--source);font-weight:900}
  .accounting-source strong{font-size:22px}
  .accounting-targets{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .accounting-targets article{background:white;border:1px solid var(--line);padding:16px}
  .accounting-targets strong,.accounting-targets span{display:block}
  .accounting-targets strong{font-size:13px}
  .accounting-targets span{color:var(--canonical);font-size:27px;font-weight:900}
  .audit-rules{display:flex;gap:12px;flex-wrap:wrap;margin-top:34px}
  .audit-rules span{padding:12px 15px;background:var(--canonical-bg);color:var(--canonical);font-weight:850}
  .coverage-layout{display:grid;grid-template-columns:1fr;gap:28px}
  .coverage-big{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .coverage-checks{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .coverage-checks div{display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:center;background:white;border:1px solid var(--line);padding:7px 10px}
  .coverage-checks span{font-weight:900;color:var(--projection)}
  .coverage-checks strong{font-size:10.5px}
  .coverage-checks .fail span{color:var(--hold)}
  .shape-bars{display:grid;grid-template-columns:1fr 1fr;gap:10px 36px}
  .shape-bars>div{display:grid;grid-template-columns:145px 1fr 28px;gap:12px;align-items:center}
  .shape-bars span{font-size:12px;font-weight:850}
  .shape-bars i{height:8px;background:#e8eeea}
  .shape-bars b{display:block;height:100%;background:var(--source)}
  .shape-bars strong{font-size:13px}
  .batch-line{display:flex;gap:12px;flex-wrap:wrap;margin-top:34px}
  .batch-line span{background:white;border:1px solid var(--line);padding:10px 13px;font-size:12px}
  .dto-layout{display:grid;grid-template-columns:1.2fr .8fr;gap:48px}
  .dto-list{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}
  .dto-list article{display:grid;grid-template-columns:30px 135px 1fr;gap:10px;padding:11px 0;border-bottom:1px solid var(--line);align-items:center}
  .dto-list span{color:var(--canonical);font-weight:900;font-size:11px}
  .dto-list strong{font-size:13px}
  .dto-list small{color:var(--muted);font-size:11px}
  .dto-code{background:var(--deep);color:white;padding:34px}
  .dto-code>span{color:var(--lime);font-size:12px;font-weight:900}
  .dto-code code{display:block;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.17);color:#d8e5df}
  .dto-code strong{display:block;font-size:24px;margin-top:24px}
  .runtime-layout{display:grid;grid-template-columns:.85fr 1.15fr;gap:50px}
  .runtime-counts{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .runtime-counts article{background:white;border:1px solid var(--line);padding:22px}
  .runtime-counts strong,.runtime-counts span{display:block}
  .runtime-counts strong{font-size:40px;color:var(--canonical)}
  .runtime-counts span{font-size:12px;font-weight:850}
  .runtime-phases{border-top:1px solid var(--line)}
  .runtime-phases p{display:grid;grid-template-columns:30px 1fr;gap:14px;padding:12px 0;margin:0;border-bottom:1px solid var(--line)}
  .runtime-phases span{color:var(--projection);font-weight:900}
  .runtime-phases strong{font-size:13px}
  .decision-columns{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .decision-columns article{background:white;border-top:7px solid var(--projection);padding:28px}
  .decision-columns .configurable{border-color:var(--overlay)}
  .decision-columns .open{border-color:var(--source)}
  .decision-columns article>div{display:flex;justify-content:space-between;align-items:center}
  .decision-columns article>div span{font-weight:900}
  .decision-columns article>div strong{font-size:46px}
  .decision-columns p{font-size:13px;color:var(--muted);padding-top:12px;border-top:1px solid var(--line)}
  .final-screen{background:linear-gradient(135deg,#05281f,#123b2e);color:white}
  .final-screen .slide-head>span{border-color:rgba(255,255,255,.3);color:var(--lime)}
  .final-screen .slide-head p{color:var(--lime)}
  .final-screen .slide-note{color:#c4d7cd}
  .handoff-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .handoff-grid article{padding:30px;background:rgba(255,255,255,.08);border-top:5px solid var(--lime)}
  .handoff-grid .must-not{border-color:#f0b878}
  .handoff-grid article>span{font-weight:900;color:var(--lime)}
  .handoff-grid .must-not>span{color:#f0b878}
  .handoff-grid p{font-size:15px;color:#d9e5df;margin:12px 0;padding-left:16px;position:relative}
  .handoff-grid p:before{content:"";position:absolute;left:0;top:.65em;width:6px;height:6px;background:currentColor}
  .boundary-note{display:grid;grid-template-columns:auto 1fr auto;gap:20px;align-items:center;margin-top:28px;padding-top:22px;border-top:1px solid rgba(255,255,255,.2)}
  .boundary-note strong{color:#f0b878}
  .boundary-note span{color:#c4d7cd;font-size:13px}
  .boundary-note a{color:var(--lime);font-weight:900;text-decoration:none}
  .explorer{padding:86px 0 110px;background:#edf2ee}
  .explorer-head{display:grid;grid-template-columns:1fr .7fr;gap:50px;align-items:end;margin-bottom:34px}
  .explorer-head h2{margin-bottom:14px}
  .explorer-head p{color:var(--muted);font-size:17px}
  .explorer-stats{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .explorer-controls{position:sticky;top:44px;z-index:50;background:rgba(237,242,238,.96);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:12px 0;margin-bottom:28px}
  .control-grid{display:grid;grid-template-columns:1.35fr repeat(6,1fr);gap:8px}
  .control-grid label{display:grid;gap:4px;font-size:10px;color:var(--muted);font-weight:850}
  .control-grid input,.control-grid select{width:100%;min-width:0;border:1px solid var(--line);background:white;border-radius:0;padding:9px 10px;font-size:12px;color:var(--ink)}
  .explorer-layout{display:grid;grid-template-columns:420px minmax(0,1fr);gap:28px;align-items:start}
  .fixture-list{display:grid;gap:8px;max-height:calc(100vh - 160px);overflow:auto;padding-right:5px}
  .fixture-card{appearance:none;border:1px solid var(--line);background:white;text-align:left;padding:15px;display:grid;grid-template-columns:32px 1fr auto;gap:10px;align-items:start;cursor:pointer}
  .fixture-card:hover,.fixture-card:focus-visible{border-color:var(--canonical);outline:none}
  .fixture-card[aria-pressed=true]{background:var(--canonical-bg);border-color:var(--canonical)}
  .fixture-card[hidden]{display:none}
  .fixture-order{font-size:10px;color:var(--canonical);font-weight:900}
  .fixture-card strong{display:block;font-size:14px;line-height:1.25}
  .fixture-card small{display:block;color:var(--muted);font-size:10px;margin-top:4px}
  .fixture-card>b{font-size:10px;color:var(--canonical);white-space:nowrap}
  .fixture-meta{grid-column:2/4;display:flex;gap:5px;flex-wrap:wrap}
  .fixture-meta span{font-size:9px;padding:4px 6px;background:var(--paper)}
  .fixture-detail{position:sticky;top:116px;background:white;border:1px solid var(--line);min-height:640px;max-height:calc(100vh - 140px);overflow:auto}
  .detail-empty{padding:50px;color:var(--muted)}
  .detail-head{padding:30px;border-bottom:1px solid var(--line)}
  .detail-head>span{color:var(--source);font-size:11px;font-weight:900}
  .detail-head h3{font-size:32px;margin:7px 0}
  .detail-head p{color:var(--muted);font-size:14px}
  .detail-head a{display:inline-block;margin-top:8px;color:var(--source);font-size:12px;font-weight:900}
  .detail-summary{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--line)}
  .detail-summary div{padding:16px;border-right:1px solid var(--line)}
  .detail-summary div:last-child{border-right:0}
  .detail-summary strong,.detail-summary span{display:block}
  .detail-summary strong{font-size:23px;color:var(--canonical)}
  .detail-summary span{font-size:9px;color:var(--muted)}
  .detail-section{padding:24px 30px;border-bottom:1px solid var(--line)}
  .detail-section h4{margin:0 0 13px;font-size:16px}
  .detail-section>p{font-size:13px;color:var(--muted)}
  .detail-pipeline{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .detail-pipeline span{padding:7px 9px;background:var(--canonical-bg);color:var(--canonical);font-size:10px;font-weight:900}
  .detail-list{display:grid;gap:6px}
  .detail-row{display:grid;grid-template-columns:105px 1fr auto;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:11px}
  .detail-row code{color:var(--source);font-size:9px}
  .detail-row strong{font-size:12px}
  .detail-row span{color:var(--muted);font-size:10px}
  .detail-tabs{display:flex;gap:6px;margin-bottom:13px}
  .detail-tab{appearance:none;border:1px solid var(--line);background:white;padding:7px 10px;font-size:10px;cursor:pointer}
  .detail-tab[aria-pressed=true]{background:var(--deep);color:white;border-color:var(--deep)}
  .detail-scroll{max-height:280px;overflow:auto}
  .explorer-zero{grid-column:1/-1;padding:40px;text-align:center;color:var(--muted);background:white;border:1px solid var(--line)}
  .claim-footer{padding:24px 0;background:var(--deep);color:#c4d7cd;font-size:11px}
  .claim-footer .explorer-inner{display:flex;justify-content:space-between;gap:20px}
  @media(max-width:1050px){
    .deck-screen{min-height:820px}
    .pipeline{grid-template-columns:repeat(3,1fr);gap:10px}
    .pipeline>b{display:none}
    .projection-radial{grid-template-columns:repeat(3,1fr)}
    .control-grid{grid-template-columns:repeat(4,1fr)}
    .control-grid label:first-child{grid-column:span 2}
    .explorer-layout{grid-template-columns:340px 1fr}
    .coverage-layout,.runtime-layout{grid-template-columns:1fr}
  }
  @media(max-width:760px){
    .screen-inner,.explorer-inner{width:min(100% - 34px,680px)}
    .deck-progress{padding:0 12px}
    .deck-progress a{font-size:0}
    .deck-progress a:after{content:"FlowMe";font-size:11px}
    .deck-screen{min-height:100svh;padding:76px 0 44px;align-items:flex-start;overflow:visible}
    .slide-head{grid-template-columns:44px 1fr;gap:10px;margin-bottom:28px}
    .slide-head>span{width:40px;height:40px;font-size:10px}
    h1{font-size:41px}
    h2{font-size:34px}
    h3{font-size:21px}
    .slide-note{font-size:14px}
    .opening .screen-inner{padding-top:0}
    .opening-title{margin-bottom:24px}
    .opening-title div{font-size:14px}
    .opening .case-source-grid{grid-template-columns:1fr}
    .opening .source-to-row{display:none}
    .opening-next{position:static;display:inline-block;margin-top:20px}
    .case-source-grid,.case-result-grid,.thesis-layout,.compare-halves,.anatomy-layout,.schedule-branches,.coverage-layout,.dto-layout,.runtime-layout,.handoff-grid,.explorer-head{grid-template-columns:1fr}
    .case-source-grid{gap:24px}
    .source-document{min-height:0}
    .source-document-body{padding:24px}
    .source-document-body h3{font-size:25px}
    .source-document footer{flex-direction:column}
    .source-row:nth-child(n+3),.item-row:nth-child(n+3){display:none}
    .case-result-grid{gap:24px}
    .projection-side{padding:22px}
    .hierarchy-path{gap:5px}
    .thesis-layout{gap:34px}
    .thesis-main p{font-size:19px}
    .thesis-main strong{font-size:34px}
    .thesis-proof{grid-template-columns:repeat(3,1fr)}
    .metric{padding:16px 8px}
    .metric strong{font-size:30px}
    .metric span{font-size:10px}
    .metric small{display:none}
    .pipeline{grid-template-columns:1fr 1fr}
    .pipe{min-height:130px}
    .pipe span{font-size:30px}
    .compare-half{padding:26px}
    .compare-half+article{border-left:0;border-top:1px solid var(--line)}
    .mapping-band{align-items:stretch}
    .mapping-band>*{width:calc(50% - 6px)}
    .boundary-lanes,.decision-columns{grid-template-columns:1fr}
    .boundary-lanes article,.decision-columns article{padding:24px}
    .projection-radial{grid-template-columns:1fr 1fr}
    .radial-center,.radial-node{min-height:120px;padding:18px}
    .accounting-flow{grid-template-columns:1fr}
    .accounting-flow>b{transform:rotate(90deg);text-align:center}
    .accounting-targets{grid-template-columns:1fr 1fr}
    .coverage-big{grid-template-columns:repeat(3,1fr)}
    .coverage-checks{grid-template-columns:1fr}
    .shape-bars{grid-template-columns:1fr}
    .dto-list{grid-template-columns:1fr}
    .dto-list article{grid-template-columns:26px 110px 1fr}
    .runtime-counts{grid-template-columns:1fr 1fr}
    .handoff-grid{gap:12px}
    .boundary-note{grid-template-columns:1fr}
    .explorer{padding-top:62px}
    .explorer-head p{font-size:15px}
    .explorer-stats{grid-template-columns:repeat(3,1fr)}
    .explorer-controls{top:44px}
    .control-grid{display:flex;overflow:auto}
    .control-grid label{min-width:150px}
    .control-grid label:first-child{min-width:220px}
    .explorer-layout{grid-template-columns:1fr}
    .fixture-list{max-height:360px}
    .fixture-detail{position:static;max-height:none;min-height:0}
    .detail-head{padding:24px}
    .detail-head h3{font-size:26px}
    .detail-summary{grid-template-columns:repeat(3,1fr)}
    .detail-summary div:nth-child(n+4){border-top:1px solid var(--line)}
    .detail-section{padding:20px 24px}
    .claim-footer .explorer-inner{display:block}
  }
  @media(max-width:420px){
    .screen-inner,.explorer-inner{width:calc(100% - 26px)}
    h1{font-size:37px}
    h2{font-size:31px}
    .opening-title p{font-size:11px}
    .source-facts span{font-size:10px}
    .anatomy-card dl>div{grid-template-columns:95px 1fr}
    .projection-radial{grid-template-columns:1fr 1fr}
    .coverage-big{grid-template-columns:1fr}
    .coverage-big .metric{border-right:0;border-bottom:1px solid var(--line)}
    .runtime-counts{grid-template-columns:1fr}
    .fixture-card{grid-template-columns:26px 1fr}
    .fixture-card>b{grid-column:2}
    .fixture-meta{grid-column:2}
    .detail-summary{grid-template-columns:1fr 1fr}
    .detail-row{grid-template-columns:1fr}
  }
  @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.deck-progress-track i{transition:none}}
  @media print{
    .deck-progress,.explorer-controls{display:none}
    .deck-screen{page-break-after:always;min-height:900px}
    .fixture-detail{position:static}
  }`;

  const client = `
  (() => {
    const labels = ${scriptJson(
      Object.fromEntries(
        unique([
          ...options.sourceShape,
          ...options.executionPattern,
          ...options.artifact,
          ...options.schedule,
          ...options.input,
          ...options.batch,
          ...options.state,
          ...options.relation,
          ...options.hierarchy,
          ...options.origin,
          ...options.extension,
          'act',
          'inspect',
          'decide',
          'record',
          'use_resource',
          'check',
          'decision',
          'absolute',
          'anchor_offset',
          'date_window',
          'none',
        ]).map((value) => [value, label(value)]),
      ),
    )};
    const fixtureData = JSON.parse(document.getElementById('fixture-data').textContent);
    const cards = [...document.querySelectorAll('[data-fixture-card]')];
    const detail = document.getElementById('fixture-detail');
    const resultCount = document.getElementById('result-count');
    const query = document.getElementById('filter-query');
    const filters = [...document.querySelectorAll('[data-filter-select]')];
    const labelOf = (value) => labels[value] || String(value || '—').replaceAll('_', ' ');
    const element = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined && text !== null) node.textContent = String(text);
      return node;
    };
    const appendText = (parent, tag, className, text) => {
      const node = element(tag, className, text);
      parent.append(node);
      return node;
    };
    const metric = (value, name) => {
      const wrap = element('div');
      appendText(wrap, 'strong', '', value);
      appendText(wrap, 'span', '', name);
      return wrap;
    };
    const section = (title) => {
      const wrap = element('section', 'detail-section');
      appendText(wrap, 'h4', '', title);
      detail.append(wrap);
      return wrap;
    };
    const detailRow = (id, title, meta) => {
      const row = element('div', 'detail-row');
      appendText(row, 'code', '', id);
      appendText(row, 'strong', '', title);
      appendText(row, 'span', '', meta);
      return row;
    };
    function renderList(container, records, kind) {
      const scroll = element('div', 'detail-scroll');
      const list = element('div', 'detail-list');
      for (const record of records) {
        if (kind === 'rows') {
          list.append(detailRow(record.sourceRowId, record.title, labelOf(record.rowType)));
        } else if (kind === 'items') {
          const schedule = record.schedule
            ? (record.schedule.mode === 'anchor_offset'
              ? '기준일 ' + (record.schedule.dayOffset >= 0 ? '+' : '') + (record.schedule.dayOffset || 0) + '일'
              : labelOf(record.schedule.mode))
            : '날짜 없음';
          list.append(detailRow(record.itemId, record.title, labelOf(record.intent) + ' · ' + schedule));
        } else if (kind === 'fields') {
          list.append(
            detailRow(
              record.fieldId,
              record.label,
              labelOf(record.valueType) + ' · ' + labelOf(record.valueSource) + (record.required ? ' · 필수' : ' · 선택'),
            ),
          );
        } else if (kind === 'memos') {
          list.append(detailRow(record.memoId, record.title || 'Memo', labelOf(record.kind)));
        } else {
          list.append(detailRow(record.sourceRowId, (record.targets || []).join(', ') || labelOf(record.targetType), labelOf(record.relationType)));
        }
      }
      scroll.append(list);
      container.append(scroll);
    }
    function renderFixture(index) {
      const fixture = fixtureData[index];
      if (!fixture) return;
      detail.replaceChildren();
      cards.forEach((card) => card.setAttribute('aria-pressed', String(Number(card.dataset.index) === index)));
      const head = element('header', 'detail-head');
      appendText(head, 'span', '', labelOf(fixture.batch) + ' · ' + fixture.evidenceTier);
      appendText(head, 'h3', '', fixture.source.title);
      appendText(head, 'p', '', fixture.userNeed);
      if (/^https?:\\/\\//.test(fixture.source.canonicalUrl || '')) {
        const link = appendText(head, 'a', '', '원문 열기 ↗');
        link.href = fixture.source.canonicalUrl;
        link.target = '_blank';
        link.rel = 'noreferrer';
      }
      detail.append(head);
      const summary = element('div', 'detail-summary');
      summary.append(
        metric(fixture.metrics.sourceRowCount, 'SourceRow'),
        metric(fixture.metrics.itemCount, 'Item'),
        metric(fixture.metrics.stepCount, 'Step'),
        metric(fixture.metrics.flowCount, 'Flow'),
        metric(fixture.projection.calendarEventCount, 'VEVENT 후보'),
      );
      detail.append(summary);
      const grammar = section('Canonical hierarchy');
      const pipe = element('div', 'detail-pipeline');
      [
        'SourceRow ' + fixture.metrics.sourceRowCount,
        'Item ' + fixture.metrics.itemCount,
        'Step ' + fixture.metrics.stepCount,
        'Flow ' + fixture.metrics.flowCount,
        'Bundle 1',
        fixture.projection.selectedArtifacts.map(labelOf).join(' + '),
      ].forEach((value, index) => {
        if (index) appendText(pipe, 'b', '', '→');
        appendText(pipe, 'span', '', value);
      });
      grammar.append(pipe);
      appendText(
        grammar,
        'p',
        '',
        labelOf(fixture.taxonomy.sourceShape) + ' → ' +
          labelOf(fixture.taxonomy.primaryExecutionPattern) + ' → ' +
          labelOf(fixture.taxonomy.primaryArtifact),
      );
      const evidence = section('SourceRow · Item · accounting');
      const tabs = element('div', 'detail-tabs');
      const body = element('div');
      const tabData = [
        ['rows', 'SourceRows ' + fixture.sourceRows.length, fixture.sourceRows],
        ['items', 'Items ' + fixture.items.length, fixture.items],
        ['fields', 'Fields ' + fixture.fields.length, fixture.fields],
        ['memos', 'Memos ' + fixture.memos.length, fixture.memos],
        ['mapping', 'Mapping ' + fixture.rowAccounting.length, fixture.rowAccounting],
      ];
      tabData.forEach(([kind, title, records], tabIndex) => {
        const button = element('button', 'detail-tab', title);
        button.type = 'button';
        button.setAttribute('aria-pressed', String(tabIndex === 0));
        button.addEventListener('click', () => {
          [...tabs.children].forEach((child) => child.setAttribute('aria-pressed', String(child === button)));
          body.replaceChildren();
          renderList(body, records, kind);
        });
        tabs.append(button);
      });
      evidence.append(tabs, body);
      renderList(body, fixture.sourceRows, 'rows');
      const inputs = section('최소 사용자 입력');
      const required = fixture.inputs.required || [];
      appendText(
        inputs,
        'p',
        '',
        required.length
          ? required.map((input) => input.label || input.key).join(' · ')
          : '필수 입력 0개 — 확보한 source 값을 그대로 사용',
      );
      const projection = section('Projection과 손실 경계');
      appendText(
        projection,
        'p',
        '',
        'Primary ' + labelOf(fixture.projection.primaryArtifact) +
          ' · Secondary ' + (fixture.projection.secondaryArtifacts || []).map(labelOf).join(', ') +
          ' · Calendar policy ' + fixture.projection.calendarPolicy,
      );
      appendText(
        projection,
        'p',
        '',
        fixture.projection.calendarEventCount
          ? fixture.projection.calendarEventCount + '개 schedule-backed VEVENT 후보'
          : fixture.projection.calendarEligibleScheduledItemCount
            ? 'Calendar 미선택 · schedule-backed Item ' + fixture.projection.calendarEligibleScheduledItemCount + '개'
            : '일정 없는 VEVENT 0 — ' + fixture.projection.fallbackOrder.map(labelOf).join(' → '),
      );
      if (fixture.projection.lossNotes.length) {
        appendText(projection, 'p', '', '손실: ' + fixture.projection.lossNotes.join(' · '));
      }
      const structureReview = section('발견된 구조 판단');
      if (fixture.classificationDelta) {
        appendText(
          structureReview,
          'p',
          '',
          '결과물 재판정: ' + labelOf(fixture.classificationDelta.fromPrimaryArtifact) + ' → ' +
            labelOf(fixture.classificationDelta.toPrimaryArtifact) + ' · ' + fixture.classificationDelta.reason,
        );
      }
      appendText(
        structureReview,
        'p',
        '',
        fixture.canonicalExtensionCandidates.length
          ? 'canonical 확장 후보: ' + fixture.canonicalExtensionCandidates.join(' · ')
          : '현재 canonical과 conversion-audit sidecar로 처리',
      );
      const boundary = section('검증 범위');
      appendText(boundary, 'p', '', fixture.researchBoundary);
      detail.scrollTop = 0;
    }
    function applyFilters() {
      const term = query.value.trim().toLowerCase();
      const active = Object.fromEntries(filters.map((select) => [select.dataset.filterSelect, select.value]));
      let visible = 0;
      let firstVisible = null;
      for (const card of cards) {
        const matchesText = !term || card.dataset.title.includes(term);
        const matchesSelects = Object.entries(active).every(
          ([key, value]) => !value || String(card.dataset[key] || '').split('|').includes(value),
        );
        const show = matchesText && matchesSelects;
        card.hidden = !show;
        if (show) {
          visible += 1;
          if (!firstVisible) firstVisible = card;
        }
      }
      resultCount.textContent = visible + ' / ' + cards.length;
      const selected = cards.find((card) => card.getAttribute('aria-pressed') === 'true' && !card.hidden);
      if (!selected && firstVisible) renderFixture(Number(firstVisible.dataset.index));
      if (!firstVisible) {
        detail.replaceChildren();
        appendText(detail, 'div', 'detail-empty', '현재 필터에 맞는 fixture가 없습니다.');
      }
    }
    cards.forEach((card) => card.addEventListener('click', () => renderFixture(Number(card.dataset.index))));
    query.addEventListener('input', applyFilters);
    filters.forEach((select) => select.addEventListener('change', applyFilters));
    renderFixture(0);
    applyFilters();

    const screens = [...document.querySelectorAll('.deck-screen')];
    const progress = document.getElementById('deck-progress-fill');
    const count = document.getElementById('deck-progress-count');
    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!active) return;
        const index = screens.indexOf(active.target) + 1;
        count.textContent = index + ' / ' + screens.length;
        progress.style.width = (index / screens.length) * 100 + '%';
      },
      { threshold: [0.35, 0.6] },
    );
    screens.forEach((screen) => observer.observe(screen));
    const explorerObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        count.textContent = 'Explorer';
        progress.style.width = '100%';
      },
      { threshold: 0.08 },
    );
    explorerObserver.observe(document.getElementById('explorer'));
  })();`;

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2308291f'/%3E%3Cpath d='M8 9h16v4H13v3h9v4h-9v6H8z' fill='%23d8f26a'/%3E%3C/svg%3E">
  <title>Flow Canonical Structure Corpus Expansion & Planning Handoff v1</title>
  <style>${style}</style>
</head>
<body>
  <nav class="deck-progress" aria-label="보고서 진행">
    <a href="#case-1-source">Flow canonical corpus v1</a>
    <span class="deck-progress-track"><i id="deck-progress-fill"></i></span>
    <span class="deck-progress-count" id="deck-progress-count">1 / ${mainSlides.length}</span>
    <a href="#explorer">전체 탐색기 ↓</a>
  </nav>
  <main id="main-deck" data-main-screens="${mainSlides.length}">
    ${mainSlides.join('\n')}
  </main>
  <section class="explorer" id="explorer" data-fixture-count="${corpus.fixtures.length}">
    <div class="explorer-inner">
      <header class="explorer-head">
        <div>
          <p>Complete fixture explorer</p>
          <h2>${esc(countText(corpus.counts.completeFixtures))}개 전체 구조를<br>한 건씩 검토</h2>
          <p>목록에는 요약만 두고, 선택한 한 건의 SourceRow·Item·mapping만 상세 화면에 그립니다.</p>
        </div>
        <div class="explorer-stats">
          ${metric('SourceRow', corpus.counts.sourceRows)}
          ${metric('Item', corpus.counts.items)}
          ${metric('날짜 없음', corpus.counts.undatedItems)}
        </div>
      </header>
    </div>
    <div class="explorer-controls">
      <div class="explorer-inner control-grid">
        <label>검색<input id="filter-query" type="search" placeholder="콘텐츠·제공자·사용자 job"></label>
        <label>원문 형태<select data-filter-select="sourceShape">${selectOptions(options.sourceShape)}</select></label>
        <label>실행 방식<select data-filter-select="executionPattern">${selectOptions(options.executionPattern)}</select></label>
        <label>결과물<select data-filter-select="artifact">${selectOptions(options.artifact)}</select></label>
        <label>일정<select data-filter-select="schedule">${selectOptions(options.schedule)}</select></label>
        <label>입력<select data-filter-select="input">${selectOptions(options.input)}</select></label>
        <label>입력 batch<select data-filter-select="batch">${selectOptions(options.batch)}</select></label>
        <label>실행 상태<select data-filter-select="state">${selectOptions(options.state)}</select></label>
        <label>Row→Item 관계<select data-filter-select="relation">${selectOptions(options.relation)}</select></label>
        <label>계층<select data-filter-select="hierarchy">${selectOptions(options.hierarchy)}</select></label>
        <label>기존/신규<select data-filter-select="origin">${selectOptions(options.origin)}</select></label>
        <label>canonical 확장<select data-filter-select="extension">${selectOptions(options.extension)}</select></label>
      </div>
    </div>
    <div class="explorer-inner">
      <div class="explorer-layout">
        <div>
          <p><strong id="result-count">${corpus.fixtures.length} / ${corpus.fixtures.length}</strong> fixtures</p>
          <div class="fixture-list" id="fixture-list">${explorerCards(corpus.fixtures)}</div>
        </div>
        <section class="fixture-detail" id="fixture-detail" aria-live="polite">
          <div class="detail-empty">fixture를 선택하면 상세 구조를 표시합니다.</div>
        </section>
      </div>
    </div>
  </section>
  <footer class="claim-footer">
    <div class="explorer-inner">
      <span>${esc(corpus.claimBoundary)}</span>
      <span>Generated ${esc(generatedAt)} · 외부 Calendar 왕복 / 실제 사용자 검증 NOT RUN</span>
    </div>
  </footer>
  <script id="fixture-data" type="application/json">${scriptJson(explorerData)}</script>
  <script>${client}</script>
</body>
</html>`;
}

function main() {
  const corpus = readRequiredJson('corpus');
  const coverage = readRequiredJson('coverage');
  const storyboard = readRequiredJson('storyboard');
  const decisions = readRequiredJson('decisions');
  const runtime = readRequiredJson('runtime');
  const dtos = readRequiredJson('dtos');
  const checked = integrityCheck({ corpus, coverage, storyboard, decisions, runtime, dtos });
  const html = buildHtml({
    corpus,
    coverage,
    storyboard,
    decisions,
    runtime,
    dtos,
    ...checked,
  });
  const bytes = Buffer.byteLength(html, 'utf8');
  const mainDeckScreens = (html.match(/class="deck-screen(?:\s|")/g) || []).length;
  const representativeSourceScreens = (html.match(/data-case-screen="source"/g) || []).length;
  const representativeResultScreens = (html.match(/data-case-screen="result"/g) || []).length;
  const explorerCardsCount = (html.match(/<button class="fixture-card"[^>]*\bdata-fixture-card\b/g) || []).length;
  const emptyImages = (html.match(/<img\b[^>]*\bsrc=(?:""|''|[^\s>]+)/gi) || []).filter((tag) =>
    /\bsrc=(?:""|''|#)/i.test(tag),
  ).length;
  const estimatedInitialDomNodes = (html.match(/<[a-z][^>]*>/gi) || []).length;
  if (mainDeckScreens !== storyboard.mainDeckTargetScreens) {
    throw new Error(`HTML deck screen count ${mainDeckScreens} does not match storyboard ${storyboard.mainDeckTargetScreens}.`);
  }
  if (representativeSourceScreens !== 12 || representativeResultScreens !== 12) {
    throw new Error(
      `Representative screens must be 12 source + 12 result; got ${representativeSourceScreens} + ${representativeResultScreens}.`,
    );
  }
  if (explorerCardsCount !== corpus.fixtures.length) {
    throw new Error(`Explorer card count ${explorerCardsCount} does not match fixture count ${corpus.fixtures.length}.`);
  }
  if (emptyImages !== 0) throw new Error(`Report contains ${emptyImages} empty image source(s).`);
  if (estimatedInitialDomNodes >= MAX_INITIAL_DOM_NODES) {
    throw new Error(`Estimated initial DOM nodes ${estimatedInitialDomNodes} exceed limit ${MAX_INITIAL_DOM_NODES}.`);
  }
  if (bytes >= MAX_HTML_BYTES) {
    throw new Error(`HTML size ${bytes} bytes exceeds limit ${MAX_HTML_BYTES}.`);
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, html, 'utf8');
  process.stdout.write(
    `${JSON.stringify(
      {
        output: path.relative(ROOT, OUTPUT).replaceAll('\\', '/'),
        mainDeckScreens,
        representativePairs: representativeSourceScreens,
        explorerCards: explorerCardsCount,
        bytes,
        estimatedInitialDomNodes,
        emptyImages,
        filterOptionCounts: Object.fromEntries(
          Object.entries(filterOptions(corpus.fixtures)).map(([key, values]) => [key, values.length]),
        ),
        representativeReferenceIntegrity: 'passed',
      },
      null,
      2,
    )}\n`,
  );
}

main();
