import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const packageName = '2026-07-11-flowme-longitudinal-user-journey-review-package';
const outputDir = path.join(repoRoot, 'docs', 'content-audit', packageName);
const screenshotDir = path.join(outputDir, 'screenshots');
const sourcePackageName = '2026-07-11-claude-design-p21-final-review-package';
const sourcePackageDir = path.join(repoRoot, 'docs', 'content-audit', sourcePackageName);
const sourceEvidencePath = path.join(sourcePackageDir, 'route-evidence.json');
const sourceEvidence = JSON.parse(fs.readFileSync(sourceEvidencePath, 'utf8'));
const sourceScenarios = new Map(sourceEvidence.scenarios.map((scenario) => [scenario.id, scenario]));
const githubBase = `https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/${packageName}`;

const supportMeta = {
  verified: { label: '확인됨', tone: 'good' },
  partial: { label: '부분 지원', tone: 'partial' },
  missing: { label: '미구현', tone: 'missing' },
  evidence_gap: { label: 'evidence 부족', tone: 'gap' },
  deferred: { label: '의도적 보류', tone: 'deferred' },
};

const lifecycle = [
  { id: 'discover', label: '발견', status: 'verified', note: '홈 URL/메모 진입과 public 공유 진입이 존재한다.' },
  { id: 'convert', label: 'Flow 변환', status: 'verified', note: 'URL hit와 miss 결정론적 초안이 분리된다.' },
  { id: 'save', label: '저장', status: 'verified', note: 'public, source-backed, draft 모두 My Flow 저장 경로가 있다.' },
  { id: 'personalize', label: '개인화', status: 'verified', note: '기준일, 제목, 항목 날짜, 메모 overlay가 있다.' },
  { id: 'execute', label: '실행', status: 'verified', note: 'My Flow는 할 일, Calendar는 날짜 중심으로 실행한다.' },
  { id: 'complete', label: '완료', status: 'verified', note: '행 왼쪽 완료 체크와 완료 취소가 있다.' },
  { id: 'return', label: '재방문', status: 'partial', note: '동일 브라우저 로컬 상태와 오프라인 행동은 확인했지만 계정 간 연속성은 없다.' },
  { id: 'review', label: '리뷰', status: 'missing', note: '완료 후 유용성·정확성·만족도를 남기는 사용자 표면이 없다.' },
  { id: 'request_revision', label: '수정 요청', status: 'missing', note: '개인 수정과 원본/제작자 개선 요청을 분리한 경로가 없다.' },
  { id: 'reuse', label: '재사용', status: 'partial', note: '기존 draft 재사용은 되지만 버전 업데이트·반복 사용 성과는 충분히 증명되지 않았다.' },
];

const personas = [
  {
    id: 'moving-planner',
    name: '이사 준비 사용자',
    profile: '한 달 뒤 이사를 앞두고 검색한 원문을 자기 일정으로 바꾸려는 모바일 중심 사용자',
    goal: '이사일을 기준으로 준비 항목을 저장하고, 일부 날짜와 메모를 자기 상황에 맞춰 바꾼 뒤 매일 실행한다.',
    preliminary: '핵심 실행 loop는 연결되지만 완료 후 평가·원본 수정 요청이 끊긴다.',
    sessions: [
      {
        id: 'moving-session-1',
        label: '세션 1 · 발견과 기준 설정',
        timing: '이사 30일 전',
        steps: [
          step('moving-home-entry', '홈에서 URL/메모 진입 찾기', 'discover', 'verified', '/', 'Flow 찾기 입구를 첫 화면에서 찾는다.', 'URL이나 메모로 Flow 찾기 입구가 추천보다 먼저 보인다.', ['01-home-mobile']),
          step('moving-url-hit', '이사 원문 URL로 준비된 Flow 찾기', 'convert', 'verified', '/flows', '기존 준비가 있으면 재사용 가능한 결과를 기대한다.', 'canonical hit 결과가 준비된 Flow로 연결된다.', ['27-url-first-hit-mobile']),
          step('moving-date-context', '시작일이 아닌 이사일로 일정 맞추기', 'personalize', 'verified', '/flows', '입력 날짜가 무엇을 뜻하는지 알고 싶다.', '이사일 라벨과 D-30 일정 설명이 보인다.', ['28b-url-first-moving-custom-start-mobile']),
        ],
      },
      {
        id: 'moving-session-2',
        label: '세션 2 · 저장 직후 개인화',
        timing: '같은 날',
        steps: [
          step('moving-save-land', 'My Flow에 저장됐는지 확인', 'save', 'verified', '/my?savedMap=moving-d30', '저장 완료와 다음 행동을 바로 확인한다.', 'post-save 확인과 첫 실행 항목이 같은 실행 허브에 나타난다.', ['13-post-save-my-moving-mobile']),
          step('moving-anchor-edit', '이사일과 이름 다시 바꾸기', 'personalize', 'verified', '/my?savedMap=curated-ajd-moving-d30', '한 번 정한 전체 기준일을 다시 바꾸고 싶다.', 'Flow 전체 기준일·이름 수정 입구가 보인다.', ['13b-my-moving-personal-anchor-settings-mobile']),
          step('moving-item-edit', '한 할 일만 날짜와 메모 바꾸기', 'personalize', 'verified', '/my?savedMap=curated-ajd-moving-d30', '전체 일정은 유지하고 한 항목만 늦춘다.', '항목 날짜 override와 제목·날짜·메모 수정 입구가 분리된다.', ['13c-my-moving-personal-step-date-override-mobile']),
        ],
      },
      {
        id: 'moving-session-3',
        label: '세션 3 · 실행, 완료, 회고',
        timing: '며칠 뒤',
        steps: [
          step('moving-calendar', 'Calendar에서 오늘 일정 실행', 'execute', 'verified', '/calendar', '수정한 날짜에 맞춰 할 일을 확인한다.', '날짜 agenda와 Flow 구분 marker가 저장 상태를 읽는다.', ['14-calendar-after-moving-save-mobile']),
          step('moving-complete-return', '완료 후 다시 열고 완료 취소하기', 'complete', 'partial', '/my', '실수로 완료했을 때 되돌리고 싶다.', '완료 0개 남음과 완료 취소 패턴은 확인됐지만 이사 Flow의 연속 장면은 별도 캡처가 없다.', ['48-draft-completed-zero-mobile']),
          step('moving-review', '이 Flow가 실제로 도움됐는지 리뷰 남기기', 'review', 'missing', '/my', '완료 경험과 빠진 준비를 남기고 싶다.', '완료 뒤 유용성·만족도·한줄 리뷰 입력 표면이 없다.', []),
          step('moving-correction', '틀린 날짜나 준비 항목 수정 요청', 'request_revision', 'missing', '/my', '개인 수정과 별개로 원본 개선을 요청하고 싶다.', '개인 overlay는 있으나 원본/제작자에게 보내는 수정 요청 경로가 없다.', []),
        ],
      },
    ],
  },
  {
    id: 'miss-draft-user',
    name: '준비된 Flow가 없는 사용자',
    profile: '검색 중 찾은 낯선 URL이나 개인 메모를 바로 실행 가능한 초안으로 바꾸려는 사용자',
    goal: 'miss 상태에서도 앱 밖으로 나가지 않고 초안을 저장·수정·실행하고, 품질 문제를 나중에 피드백한다.',
    preliminary: '초안 생성부터 실행까지 가장 길게 연결됐지만 품질 회고와 실제 AI 경계가 다음 과제다.',
    sessions: [
      {
        id: 'miss-session-1',
        label: '세션 1 · miss와 초안 준비',
        timing: '첫 방문',
        steps: [
          step('miss-detected', '준비된 Flow가 없음을 이해', 'convert', 'verified', '/flows', '찾지 못했을 때 다음 선택지를 알고 싶다.', 'miss가 요청 저장과 초안 준비 흐름으로 이어진다.', ['29-url-first-miss-candidate-form-mobile']),
          step('miss-request-detail', '요청 제목·메모와 원 URL 확인', 'convert', 'verified', '/flows', '내가 남긴 요청을 다시 확인하고 고친다.', 'candidate detail에서 제목·메모·원 URL을 확인한다.', ['30-url-first-candidate-detail-mobile']),
          step('miss-suggestions', '3개 이상 실행 항목 초안 확인', 'convert', 'verified', '/flows', '빈 placeholder가 아니라 손볼 수 있는 시작점을 기대한다.', '결정론적 제안 항목과 기준일 날짜가 보인다.', ['45-draft-save-failure-mobile']),
          step('miss-live-ai', '실제 AI 자동 생성 기대 관리', 'convert', 'deferred', '/flows', '자동 생성인지 수동 초안인지 알고 싶다.', '현재는 결정론적 초안이며 live AI로 과장하지 않는다.', ['29-url-first-miss-candidate-form-mobile']),
        ],
      },
      {
        id: 'miss-session-2',
        label: '세션 2 · 저장, 수정, 투영',
        timing: '같은 날',
        steps: [
          step('miss-studio-shelf', 'Studio 초안 선반에서 다시 찾기', 'return', 'verified', '/u/my-flow-studio', '저장한 초안을 잃지 않고 다시 찾는다.', 'Studio 초안 탭에 같은 draft가 보인다.', ['39e-url-first-draft-studio-shelf-mobile']),
          step('miss-item-edit', '항목 제목·날짜·메모 수정', 'personalize', 'verified', '/my', '제안 항목을 내 말과 날짜로 고친다.', '항목별 편집 입구와 사용자 메모가 있다.', ['39a-url-first-draft-item-edit-entry-mobile']),
          step('miss-anchor-edit', 'Flow 전체 기준일 다시 계산', 'personalize', 'verified', '/my', '전체 날짜를 한 번에 이동한다.', '기준일 변경과 개별 override 유지 정책이 보인다.', ['39b-url-first-draft-anchor-edit-mobile']),
          step('miss-calendar-export', 'Calendar와 export가 수정본 읽기', 'execute', 'verified', '/calendar', '수정한 결과가 모든 목적지에서 같기를 기대한다.', 'Calendar와 export projection evidence가 연결된다.', ['39d-url-first-draft-calendar-export-mobile']),
        ],
      },
      {
        id: 'miss-session-3',
        label: '세션 3 · 실패 복구와 반복 사용',
        timing: '며칠 뒤',
        steps: [
          step('miss-save-failure', '저장 실패 뒤 입력 보존과 재시도', 'return', 'verified', '/flows', '실패해도 작성한 내용을 잃지 않는다.', '입력 보존, 오류 설명, 재시도 행동이 있다.', ['45-draft-save-failure-mobile']),
          step('miss-duplicate', '같은 URL 중복 저장 방지', 'reuse', 'verified', '/flows', '같은 초안을 여러 개 만들지 않고 기존 것을 연다.', '중복 생성 없이 기존 My Flow 초안으로 이어진다.', ['46-draft-duplicate-mobile']),
          step('miss-completed-zero', '모든 항목 완료 후 상태 확인', 'complete', 'verified', '/my', '남은 일이 0임을 이해하고 필요하면 되돌린다.', '전체 완료, 남은 0, 완료 취소 가능 상태가 보인다.', ['48-draft-completed-zero-mobile']),
          step('miss-offline', '이미 연 화면에서 오프라인 로컬 행동', 'return', 'verified', '/my', '네트워크가 끊겨도 현재 체크를 이어간다.', '이미 열린 My Flow의 로컬 완료 행동이 유지된다.', ['49-draft-offline-local-action-mobile']),
          step('miss-quality-review', '초안 품질과 빠진 항목 피드백', 'review', 'missing', '/my', '초안이 유용했는지와 틀린 부분을 남긴다.', 'draft 품질 리뷰나 개선 요청의 사용자 경로가 없다.', []),
        ],
      },
    ],
  },
  {
    id: 'public-share-recipient',
    name: '공유 Flow를 받은 사용자',
    profile: '메신저나 검색 결과로 public /f 링크를 열고 저장 여부를 빠르게 판단하는 사용자',
    goal: '원문과 실행 항목을 신뢰할 수 있는지 보고 통째로 저장하거나 export한 뒤 개인 실행으로 전환한다.',
    preliminary: '저장 전후 경계는 명확해졌지만 개인 수정·외부 도구 왕복·콘텐츠 리뷰 연결이 부족하다.',
    sessions: [
      {
        id: 'public-session-1',
        label: '세션 1 · 공유 링크 평가',
        timing: '처음 링크를 받은 순간',
        steps: [
          step('public-shell', '저장 전 Flow 전체 가치 판단', 'discover', 'verified', '/f/vehicle-inspection-prep', '무엇을 받게 되는지 먼저 본다.', '공유 shell이 저장/setup을 첫 행동으로 둔다.', ['06-public-vehicle-mobile']),
          step('public-preview', '저장 전 항목 preview 확인', 'discover', 'verified', '/f/moving-d30-basic', '체크가 완료가 아니라 포함 preview임을 이해한다.', '저장 전 선택과 저장 후 완료가 분리된다.', ['07-public-moving-mobile']),
          step('public-export', 'Flow 단위 export 형식 판단', 'save', 'verified', '/f/moving-d30-basic', '전체 Flow를 Calendar·시트·메모로 가져간다.', 'export는 본문 secondary이며 sticky 저장보다 뒤에 있다.', ['08-public-moving-bottom-mobile']),
        ],
      },
      {
        id: 'public-session-2',
        label: '세션 2 · 저장 후 개인 실행',
        timing: '저장 직후',
        steps: [
          step('public-post-save', 'My Flow 완료 체크 활성화', 'execute', 'verified', '/my', '저장 뒤 preview가 실제 실행 상태로 바뀐다.', '같은 콘텐츠가 row-left 완료 체크 패턴으로 전환된다.', ['12b-public-new-car-post-save-my-flow-mobile']),
          step('public-source-detail', '원문 근거와 세부 확인', 'execute', 'verified', '/f/new-car-delivery-check', '항목을 실행할 때 출처 맥락을 다시 본다.', '반복 source link 없이 공통 source 접근과 항목 detail이 유지된다.', ['25-workbench-new-car-open-details-mobile']),
          step('public-personal-edit', '공유 Flow를 내 상황에 맞게 수정', 'personalize', 'evidence_gap', '/my', '저장한 공개 Flow도 제목·날짜·메모를 고치고 싶다.', 'overlay 모델은 있으나 public 저장 직후 같은 Flow를 편집하는 종단 capture가 없다.', []),
          step('public-export-roundtrip', '외부 Calendar/메모에서 실제 사용', 'execute', 'evidence_gap', 'external-tool', '내보낸 파일이 목적지에서 실사용 가능한지 확인한다.', 'export 생성은 검증됐지만 외부 도구 import·실행·재진입은 package가 증명하지 않는다.', []),
        ],
      },
      {
        id: 'public-session-3',
        label: '세션 3 · 재방문과 신뢰 피드백',
        timing: '실행 후',
        steps: [
          step('public-return', '저장한 Flow 다시 이어서 실행', 'return', 'partial', '/my', '공유 링크가 아니라 내 실행 기록으로 돌아온다.', '로컬 재방문은 가능하지만 계정·기기 간 연속성은 없다.', ['49-draft-offline-local-action-mobile']),
          step('public-review', '공유 Flow 유용성 리뷰', 'review', 'missing', '/my', '다른 사용자와 제작자에게 도움이 된 정도를 남긴다.', 'public Flow 리뷰 표면이 없다.', []),
          step('public-report', '틀린 항목이나 원문 불일치 신고', 'request_revision', 'missing', '/my', '잘못된 실행 항목을 원본 개선 요청으로 보낸다.', '개인 수정과 콘텐츠 오류 신고를 분리한 경로가 없다.', []),
        ],
      },
    ],
  },
  {
    id: 'multi-flow-worker',
    name: '여러 Flow를 동시에 쓰는 직장인',
    profile: '이사·여행·공부 준비가 겹쳐 오늘 할 일과 같은 날짜 여러 Flow를 함께 관리하는 사용자',
    goal: '복잡한 목록에서도 오늘 할 일을 먼저 끝내고 Calendar에서 Flow를 구분해 날짜를 조정한다.',
    preliminary: '밀도와 구분은 개선됐지만 대량 관리, 일괄 정리, 장기 회고 evidence가 약하다.',
    sessions: [
      {
        id: 'multi-session-1',
        label: '세션 1 · 여러 Flow 저장 후 우선순위 확인',
        timing: '월요일 아침',
        steps: [
          step('multi-today', '오늘·지난·다음 큐에서 지금 할 일 찾기', 'execute', 'verified', '/my', '몇 번 들어가지 않고 오늘 일을 본다.', '오늘 1프레임과 inline 완료가 우선한다.', ['16-my-multi-queue-mobile']),
          step('multi-inventory', '5개 이상 저장 목록 훑기', 'return', 'verified', '/my', '저장한 Flow가 많아도 마지막 항목까지 접근한다.', '긴 목록 top/bottom과 fixed nav clearance가 확보된다.', ['18-my-long-list-top-mobile', '20-my-long-list-inventory-bottom-mobile']),
        ],
      },
      {
        id: 'multi-session-2',
        label: '세션 2 · 같은 날짜 여러 Flow 실행',
        timing: '일정이 겹친 날',
        steps: [
          step('multi-grid', '월간 grid에서 3~5개 Flow 구분', 'execute', 'verified', '/calendar', '날짜 셀은 compact하게 보고 전체는 agenda에서 본다.', '주요 2개 marker와 외 N개 요약이 보인다.', ['43b-calendar-grid-flow-stack-mobile']),
          step('multi-agenda', '선택일 agenda에서 전체 Flow 확인', 'execute', 'verified', '/calendar', '같은 날짜 모든 Flow와 할 일을 본다.', 'Flow별 group과 전체 항목이 표시된다.', ['43-calendar-same-date-multi-flow-mobile']),
          step('multi-wide', 'wide 화면에서도 밀도 유지', 'execute', 'verified', '/calendar', '데스크톱에서 날짜와 agenda를 동시에 비교한다.', 'grid와 agenda 2열이 overflow 없이 유지된다.', ['44b-calendar-grid-flow-stack-wide']),
        ],
      },
      {
        id: 'multi-session-3',
        label: '세션 3 · 밀린 일 복구와 장기 관리',
        timing: '일주일 뒤',
        steps: [
          step('multi-overdue', '지난 할 일 중복 없이 열기', 'return', 'verified', '/my', '밀린 일만 모아 다시 처리한다.', 'overdue sheet가 중복 row 없이 열린다.', ['17-my-multi-queue-overdue-sheet-mobile']),
          step('multi-reschedule', '한 항목 날짜만 이동', 'personalize', 'partial', '/my', '다른 Flow 일정은 건드리지 않고 한 일만 미룬다.', '항목 date override는 확인됐지만 다중 Flow 전환 장면은 별도 evidence가 없다.', ['13c-my-moving-personal-step-date-override-mobile']),
          step('multi-offline', '출근길 오프라인 완료 체크', 'return', 'partial', '/my', '이미 연 목록에서 체크를 이어간다.', '로컬 행동은 되지만 동기화·충돌 복구는 없다.', ['49-draft-offline-local-action-mobile']),
          step('multi-archive', '끝난 Flow 정리와 성과 회고', 'reuse', 'evidence_gap', '/my', '완료한 Flow를 보관하고 다시 쓸지 판단한다.', '완료 0 상태는 있으나 archive/reuse history 종단 evidence가 없다.', []),
          step('multi-review', '장기 사용 후 개선 의견 남기기', 'review', 'missing', '/my', '어떤 부분이 반복해서 불편했는지 남긴다.', '사용 경험 리뷰 경로가 없다.', []),
        ],
      },
    ],
  },
  {
    id: 'study-repeater',
    name: '학습·워크시트 반복 사용자',
    profile: '교재나 학습 자료를 저장해 매일 조금씩 공부하고 진행 맥락을 확인하는 사용자',
    goal: '날짜가 없거나 반복되는 학습 항목을 부담 없이 저장하고, 진행 숫자의 의미를 이해하며 다시 공부한다.',
    preliminary: '저장과 기본 실행은 가능하지만 반복 재사용·학습 기록·피드백의 종단 evidence가 적다.',
    sessions: [
      {
        id: 'study-session-1',
        label: '세션 1 · 학습 콘텐츠 선택과 저장',
        timing: '학습 시작일',
        steps: [
          step('study-map', '학습 Flow 구조와 원문 확인', 'discover', 'verified', '/flow-maps/middle-school-math-1', '교재 범위가 실행 항목으로 옮겨졌는지 본다.', 'source-backed 학습 Flow Map이 저장 경로를 제공한다.', ['05-flow-map-math-mobile']),
          step('study-save', '날짜 없는 학습 Flow My Flow 착지', 'save', 'verified', '/my?savedMap=middle-school-math-1', '캘린더 강제 없이 바로 공부 항목을 본다.', 'undated content가 My Flow 할 일 중심으로 저장된다.', ['15-post-save-my-math-mobile']),
        ],
      },
      {
        id: 'study-session-2',
        label: '세션 2 · 공부와 진행 확인',
        timing: '다음 날',
        steps: [
          step('study-complete', '학습 항목 inline 완료', 'complete', 'verified', '/my', '상세를 열지 않고 공부한 항목을 체크한다.', '완료 control은 checkbox 한 종류로 유지된다.', ['15-post-save-my-math-mobile']),
          step('study-progress', '진행 숫자의 범위 이해', 'execute', 'partial', '/my', '전체 진도와 확인 항목 진도를 구분한다.', '진행 숫자 맥락화 marker는 있으나 장기 학습 변화 화면은 제한적이다.', ['15-post-save-my-math-mobile']),
        ],
      },
      {
        id: 'study-session-3',
        label: '세션 3 · 반복 학습과 개선',
        timing: '일주일 뒤',
        steps: [
          step('study-edit', '학습 제목·날짜·메모 수정', 'personalize', 'evidence_gap', '/my', '내 교재 표현과 복습일로 바꾼다.', 'overlay 모델은 공통이지만 학습 Flow 편집 장면이 package에 없다.', []),
          step('study-reuse', '다음 단원이나 다음 주에 재사용', 'reuse', 'evidence_gap', '/my', '완료 기록을 남기고 같은 구조를 다시 쓴다.', '반복 복제·새 주기 시작·이전 기록 비교가 증명되지 않는다.', []),
          step('study-notes', '학습 결과와 틀린 구조 피드백', 'review', 'missing', '/my', '이해가 안 된 부분과 잘못 나눈 단원을 남긴다.', '학습 결과 리뷰나 콘텐츠 수정 요청 경로가 없다.', []),
        ],
      },
    ],
  },
  {
    id: 'creator-curator',
    name: '제작·수정에 관심 있는 사용자',
    profile: '자기 초안을 정리하고 다른 사람에게 공개할 수 있는지 확인하려는 보조 Studio 사용자',
    goal: '초안을 다시 찾고 수정한 뒤, 향후 공개·버전 업데이트·사용자 피드백 반영 가능성을 판단한다.',
    preliminary: '초안 선반과 공개 profile은 있지만 제작→발행→리뷰→개정 loop는 아직 제품 경계 밖이다.',
    sessions: [
      {
        id: 'creator-session-1',
        label: '세션 1 · Studio와 공개 profile 이해',
        timing: '첫 제작 시도',
        steps: [
          step('creator-studio', '내 Studio를 보조 표면으로 열기', 'discover', 'verified', '/u/my-flow-studio', '5번째 탭이 아닌 제작 보조 공간임을 이해한다.', 'filled Studio가 모바일에서 접근 가능하다.', ['39-creator-profile-my-flow-studio-mobile']),
          step('creator-profile', '공개 creator profile 확인', 'discover', 'verified', '/u/flow-curation-team', '공개 콘텐츠와 개인 실행 공간을 구분한다.', 'public creator profile이 별도 사용자 표면으로 보인다.', ['41-creator-profile-flow-curation-team-mobile']),
        ],
      },
      {
        id: 'creator-session-2',
        label: '세션 2 · 초안 재발견과 수정',
        timing: '며칠 뒤',
        steps: [
          step('creator-shelf', 'URL-first draft를 초안 탭에서 찾기', 'return', 'verified', '/u/my-flow-studio', '예전에 만든 초안을 다시 연다.', 'Studio draft shelf에 local draft card가 나타난다.', ['39e-url-first-draft-studio-shelf-mobile']),
          step('creator-edit', '같은 My Flow 편집 방으로 이동', 'personalize', 'verified', '/my', '별도 에디터가 아니라 검증된 수정 모델을 쓴다.', 'Studio card가 My Flow item edit path로 이어진다.', ['39a-url-first-draft-item-edit-entry-mobile']),
        ],
      },
      {
        id: 'creator-session-3',
        label: '세션 3 · 공개, 리뷰, 개정',
        timing: '공개를 고려할 때',
        steps: [
          step('creator-publish', '개인 초안을 공개 Flow로 발행', 'save', 'missing', '/u/my-flow-studio', '검토 후 공개 링크를 만든다.', '사용자용 publish/version gate가 없다.', []),
          step('creator-correction', '사용자 수정 요청 받기', 'request_revision', 'missing', '/u/my-flow-studio', '틀린 항목 제보를 원본 개선 요청으로 받는다.', '수정 요청 inbox나 항목 단위 연결이 없다.', []),
          step('creator-review-response', '리뷰에 답하고 새 버전 알리기', 'review', 'missing', '/u/my-flow-studio', '리뷰를 보고 개정 후 사용자에게 알린다.', '리뷰·답변·changelog·업데이트 알림이 없다.', []),
          step('creator-source-update', 'source-backed 새 버전 적용', 'reuse', 'evidence_gap', '/my', '원본이 바뀌면 개인 수정과 충돌 없이 업데이트한다.', 'update review 로직 테스트는 있으나 이번 사용자 여정 package의 시각 evidence가 없다.', []),
        ],
      },
    ],
  },
];

const openQuestions = [
  '완료 후 리뷰는 Flow 전체 만족도, 개별 항목 정확성, 실제 실행 결과 중 무엇을 먼저 물어야 하는가?',
  '개인 overlay 수정과 원본/제작자 수정 요청을 어떤 카피와 데이터 경계로 나눌 것인가?',
  '리뷰·오류 신고 입구는 My Flow 완료 상태, 항목 detail, public /f, Studio 중 어디가 가장 자연스러운가?',
  '커뮤니티를 만들지 않고도 가능한 최소 feedback slice는 무엇인가?',
  '외부 Calendar/메모/시트로 export한 뒤 실제 실행과 완료를 FLOW가 어디까지 다시 받아야 하는가?',
  'localStorage 기반 재방문을 상용서비스 연속성으로 볼 수 있는가, 계정·기기 동기화가 언제 필요한가?',
  'creator/studio를 보조 표면으로 유지하면서도 수정 요청과 버전 개정을 처리할 수 있는가?',
  '실제 AI는 어떤 사용자 행동 데이터와 review gate가 생긴 뒤에 열어야 하는가?',
];

const preliminaryFindings = [
  {
    severity: 'High',
    title: '실행 뒤 리뷰·수정 요청 loop가 비어 있다',
    detail: '발견→저장→개인화→실행→완료는 연결되지만 완료 경험을 콘텐츠 개선으로 되돌리는 사용자 표면이 없다.',
  },
  {
    severity: 'High',
    title: '개인 수정과 원본 개선의 소유권 경계가 UI에 없다',
    detail: 'personal overlay는 강하지만 사용자가 틀린 원본을 발견했을 때 자기 사본만 고칠지 제작자에게 요청할지 선택할 수 없다.',
  },
  {
    severity: 'High',
    title: 'export는 생성되지만 외부 도구 왕복 실행은 evidence 밖이다',
    detail: 'Calendar·시트·메모 파일 생성은 검증됐지만 실제 import, 사용, 완료, FLOW 재진입은 시뮬레이션되지 않았다.',
  },
  {
    severity: 'Medium',
    title: '동일 브라우저 재방문은 되지만 계정·기기 연속성은 없다',
    detail: '오프라인 로컬 행동은 강점이지만 상용 반복 사용에서 기기 변경과 저장 손실 복구가 정의되지 않았다.',
  },
  {
    severity: 'Medium',
    title: 'Studio의 보조 역할과 향후 발행 역할 사이가 비어 있다',
    detail: '초안 선반은 유용하지만 사용자에게 공개·버전·리뷰를 약속하지 않는 현재 경계를 유지할지 결정이 필요하다.',
  },
];

const codexAssessment = {
  method: 'P21 screenshot, route-evidence, E2E marker를 같은 페르소나의 다회차 여정으로 재배열한 독립 휴리스틱 평가',
  verdict: {
    level: 'Conditional',
    label: '조건부 사용 가능',
    detail: '한 기기·한 브라우저에서 개인 Flow를 찾고 저장·수정·실행·완료하는 private beta는 가능하다. 계정·기기 연속성, 완료 후 피드백, 원본 수정 요청, 외부 도구 왕복이 닫히지 않아 반복 상용 서비스로는 아직 준비되지 않았다.',
  },
  recommendedDirection: {
    title: '새 표면을 늘리기보다 실행 후 학습 loop를 닫는다',
    detail: 'P22는 완료 이후의 짧은 회고와 원본 오류 알리기, 반복 사용의 신뢰를 먼저 다룬다. 공개 리뷰 커뮤니티, Studio 발행, live AI는 이 데이터 경계가 확인될 때까지 보류한다.',
  },
  scorecards: [
    score('home-entry', '홈 발견과 URL/메모 진입', 4.0, '핵심 진입이 첫 viewport에서 보이고 추천보다 앞선다.', ['01-home-mobile']),
    score('url-hit', 'URL hit와 기준일 설정', 4.0, '준비된 Flow 재사용과 이사일 맥락은 명확하다.', ['27-url-first-hit-mobile', '28b-url-first-moving-custom-start-mobile']),
    score('url-miss', 'URL miss와 초안 전환', 2.5, '작동 범위는 넓지만 miss·후보·요청·초안·저장 상태가 한 화면에 겹쳐 첫 결정이 무겁다.', ['29-url-first-miss-candidate-form-mobile', '30-url-first-candidate-detail-mobile', '45-draft-save-failure-mobile']),
    score('public-save', 'public 공유 저장 경계', 3.5, 'sticky 저장 우선과 저장 전 preview 경계는 명확하지만 외부 export의 실제 사용 장면은 없다.', ['06-public-vehicle-mobile', '08-public-moving-bottom-mobile', '12b-public-new-car-post-save-my-flow-mobile']),
    score('my-flow', 'My Flow 실행과 개인화', 3.0, '오늘 행동과 완료는 분명하지만 상세 편집 화면은 중첩 패널과 메타가 많아 실행 모드와 수정 모드가 다시 섞인다.', ['13-post-save-my-moving-mobile', '39a-url-first-draft-item-edit-entry-mobile', '39b-url-first-draft-anchor-edit-mobile']),
    score('calendar', 'Calendar 다중 Flow 실행', 3.0, 'Flow 구분과 compact grid는 작동하지만 모바일 선택일 상세와 wide agenda의 정보 밀도가 높다.', ['43-calendar-same-date-multi-flow-mobile', '44b-calendar-grid-flow-stack-wide']),
    score('completion-return', '완료와 재방문 복구', 3.0, '완료 0, 취소, 중복 방지, 저장 실패, 열린 화면 오프라인 행동은 확인됐다. 계정·기기 연속성은 없다.', ['45-draft-save-failure-mobile', '46-draft-duplicate-mobile', '48-draft-completed-zero-mobile', '49-draft-offline-local-action-mobile']),
    score('review-correction', '리뷰와 원본 수정 요청', 1.0, '완료 경험을 평가하거나 개인 수정과 원본 개선 요청을 나누는 사용자 표면이 없다.', []),
    score('external-round-trip', '외부 export 왕복', 2.0, '파일 생성 projection은 확인됐지만 실제 Calendar·시트·메모 import와 재진입은 evidence 밖이다.', ['08-public-moving-bottom-mobile', '39d-url-first-draft-calendar-export-mobile']),
    score('studio', 'Studio와 creator 보조 표면', 2.5, '초안 선반과 공개 profile은 구분되지만 발행·버전·리뷰 loop는 의도적으로 비어 있다.', ['39e-url-first-draft-studio-shelf-mobile', '41-creator-profile-flow-curation-team-mobile']),
  ],
  findings: [
    finding('Blocking', '한 기기 localStorage를 상용 연속성으로 오해하면 안 된다', '완료·수정·초안이 모두 브라우저 로컬 상태에 기대므로 기기 변경, 데이터 손실, 복구 약속이 없다. private beta 범위와 상용 출시 조건을 분리해야 한다.', ['48-draft-completed-zero-mobile', '49-draft-offline-local-action-mobile']),
    finding('High', '완료 뒤 제품이 학습하지 않는다', '사용자는 완료 후 유용성, 빠진 항목, 틀린 날짜를 남길 수 없다. 이 때문에 Flow 품질 개선과 반복 사용의 이유가 생기지 않는다.', ['48-draft-completed-zero-mobile']),
    finding('High', '개인 수정과 원본 수정 요청의 소유권 경계가 없다', '제목·날짜·메모 overlay는 강하지만 내 사본만 고치는 행동과 다른 사용자에게도 필요한 원본 정정을 구분할 수 없다.', ['13c-my-moving-personal-step-date-override-mobile', '39a-url-first-draft-item-edit-entry-mobile']),
    finding('High', 'URL miss 화면은 기능보다 상태 설명이 먼저 보인다', '아직 없음, 저장 대기, 초안 요청 가능, 실행 불가 상태가 중첩되어 사용자의 첫 선택이 흐려진다.', ['29-url-first-miss-candidate-form-mobile', '30-url-first-candidate-detail-mobile']),
    finding('High', '실행과 편집 상세의 정보 밀도가 높다', 'My Flow와 Calendar에서 실행 행은 간결하지만 상세를 열면 날짜·기준·상태·메모·원문 도구가 여러 패널로 겹쳐 상용 서비스의 안정된 편집 경험으로 보기 어렵다.', ['39a-url-first-draft-item-edit-entry-mobile', '43-calendar-same-date-multi-flow-mobile']),
    finding('Medium', 'export의 진짜 가치가 앱 밖에서 검증되지 않았다', '생성 파일의 존재만으로 사용자가 자기 Calendar·시트·메모에서 실제로 실행할 수 있다고 결론낼 수 없다.', ['08-public-moving-bottom-mobile', '39d-url-first-draft-calendar-export-mobile']),
    finding('Medium', '완료 뒤 재사용과 새 버전 반영의 기준이 없다', '중복 저장 방지는 되지만 지난 실행을 복제할지, 날짜만 다시 잡을지, 원본 업데이트를 받을지 선택하는 반복 사용 모델이 없다.', ['46-draft-duplicate-mobile', '48-draft-completed-zero-mobile']),
  ],
  backlog: [
    backlog('P22-00', 'Blocking', '실제 종단 사용 관찰과 저장 연속성 출시 gate', ['모든 페르소나'], '시뮬레이션은 동작 연결만 증명하며 습관 형성과 기기 간 신뢰를 증명하지 못한다.', '3~7일 동안 신규·반복·Calendar-heavy 사용자 관찰을 진행하고, local-only private beta와 account-backed 상용 출시 조건을 문서로 분리한다.', '새 기능을 먼저 만들거나 가상 페르소나 결과를 실제 사용자 데이터로 표현하지 않는다.', ['최소 5명, 3회차 이상 관찰 기록', '발견→완료 drop-off와 재방문 이유 기록', '데이터 손실·기기 변경 기대를 명시', '출시 등급과 persistence gate 승인'], ['현재 package 전체']),
    backlog('P22-01', 'High', '완료 후 최소 회고·오류 알리기 모델', ['이사 준비 사용자', 'miss draft 사용자', '학습 반복 사용자'], '완료 뒤 유용성·정확성·빠진 항목을 남길 표면이 없다.', '완료 상태에서 비공개 2갈래 행동만 설계한다: 내 실행 회고 남기기, 원본 내용 알리기. spec과 fixture로 먼저 검증한다.', '별점 공개, 댓글, 인기 순위, 커뮤니티 피드, creator inbox 전체를 만들지 않는다.', ['Flow 전체와 항목 단위 맥락 구분', '개인 메모와 원본 정정 요청 저장 경계 명시', '완료 행동을 방해하지 않는 진입점', '실제 공개 리뷰로 오해되는 문구 0'], ['48-draft-completed-zero-mobile']),
    backlog('P22-02', 'High', '개인 overlay와 원본 정정 요청 경계 구현', ['공유 Flow 사용자', 'creator/curator'], '현재 수정은 내 사본에만 반영되고 원본 문제 제보가 없다.', '항목 detail에서 내 Flow만 수정과 원본 내용 알리기를 분리하고, 요청에는 Flow·항목·원 URL·사용자 설명만 보존한다.', '자동 원본 수정, 공개 투표, source-backed 원본 덮어쓰기를 하지 않는다.', ['두 행동의 결과 카피가 다름', '원본 요청이 personal overlay를 변경하지 않음', '내 수정이 public Flow를 변경하지 않음', '내부 제작어 0'], ['13c-my-moving-personal-step-date-override-mobile', '25-workbench-new-car-open-details-mobile']),
    backlog('P22-03', 'High', 'URL miss 첫 결정과 초안 상태 압축', ['준비된 Flow가 없는 사용자'], '한 화면에 miss·candidate·request·draft 상태 설명이 겹친다.', '첫 viewport는 준비된 Flow 없음과 초안 살펴보기 한 행동에 집중하고, 요청 관리·원 URL·재조회는 접힌 보조 영역으로 내린다.', 'live AI 생성처럼 표현하거나 candidate 운영 상태를 다시 노출하지 않는다.', ['첫 viewport primary action 1개', '실행 불가·저장 대기 상태 문구 중복 0', '요청 정보는 손실 없이 보조 영역에서 접근', '저장 실패·중복 복구 유지'], ['29-url-first-miss-candidate-form-mobile', '30-url-first-candidate-detail-mobile', '45-draft-save-failure-mobile']),
    backlog('P22-04', 'High', 'My Flow·Calendar 실행 모드와 편집 상세 밀도 분리', ['이사 준비 사용자', '다중 Flow 사용자'], '행은 간결하지만 상세 안에 실행·편집·근거 패널이 동시에 열린다.', '기본 상세는 할 일·완료·짧은 메모 중심으로 두고, 제목·날짜·원문 도구 편집은 명시적 편집 상태에서만 연다.', '별도 5번째 탭이나 full-screen Studio editor를 만들지 않는다.', ['기본 상세의 1차 행동 2개 이하', '편집 상태 진입·취소·저장 명확', 'Calendar group/완료 checkbox 기준 유지', '390/1024 overflow 0'], ['39a-url-first-draft-item-edit-entry-mobile', '39b-url-first-draft-anchor-edit-mobile', '43-calendar-same-date-multi-flow-mobile']),
    backlog('P22-05', 'Medium', '외부 Calendar·시트·메모 왕복 검증', ['공유 Flow 사용자', '다중 Flow 사용자'], 'export payload는 검증됐지만 실제 외부 도구 사용 결과가 없다.', '대표 Flow 3개를 실제 Calendar·시트·메모에 import하고 제목·날짜·메모·중복·재생성 결과를 기록한다.', '검증 전 provider 연동이나 양방향 sync를 구현하지 않는다.', ['대표 형식별 import 성공', '날짜·제목·메모 fidelity 기록', '중복 import 정책 확인', '실패 시 사용자 복구 문구 제안'], ['08-public-moving-bottom-mobile', '39d-url-first-draft-calendar-export-mobile']),
    backlog('P22-06', 'Medium', '완료 Flow 재사용·버전 갱신 정책 spec', ['학습 반복 사용자', 'creator/curator'], '완료 후 새 주기 시작과 원본 업데이트 수용 기준이 없다.', '그대로 다시 쓰기, 날짜만 새로 잡기, 새 버전 검토의 세 경우를 source/personal overlay 충돌 규칙과 함께 문서화한다.', '자동 병합이나 복잡한 버전 트리를 구현하지 않는다.', ['완료 기록 보존', '새 실행과 과거 실행 분리', 'personal overlay 충돌 시 명시적 선택', 'Studio를 핵심 탭으로 승격하지 않음'], ['46-draft-duplicate-mobile', '48-draft-completed-zero-mobile', '39e-url-first-draft-studio-shelf-mobile']),
    backlog('P22-07', 'Low', 'Studio 발행·공개 리뷰 확장 보류', ['creator/curator'], '초안 선반은 유용하지만 발행과 공개 리뷰를 받을 근거가 없다.', 'P22-00~P22-02 결과가 쌓일 때까지 Studio는 초안 보조 선반으로 유지하고 승격 조건만 기록한다.', 'publish, follower, 공개 별점, 댓글을 만들지 않는다.', ['4탭 IA 유지', 'Studio secondary tier 유지', '승격 조건을 실제 사용·정정 요청 데이터로 정의'], ['39e-url-first-draft-studio-shelf-mobile', '41-creator-profile-flow-curation-team-mobile']),
  ],
  deferred: [
    'live AI 자동 생성: miss draft의 수동 편집·품질 피드백 데이터가 생길 때까지 보류',
    '공개 리뷰·별점·댓글: 실제 실행과 정정 요청의 최소 loop가 검증될 때까지 보류',
    'Studio 발행과 creator 운영 도구: 개인 실행 허브와 correction ownership이 먼저',
    '양방향 Calendar sync: 파일 import 왕복 검증이 먼저',
  ],
};

buildPackage();

function step(id, title, phase, status, route, expected, observed, evidenceIds) {
  return { id, title, phase, status, route, expected, observed, evidenceIds };
}

function score(id, label, value, rationale, evidenceIds) {
  return { id, label, value, max: 5, rationale, evidenceIds };
}

function finding(severity, title, detail, evidenceIds) {
  return { severity, title, detail, evidenceIds };
}

function backlog(id, priority, title, personas, problem, minimumScope, doNotExpand, acceptanceCriteria, evidenceIds) {
  return { id, priority, title, personas, problem, minimumScope, doNotExpand, acceptanceCriteria, evidenceIds };
}

function buildPackage() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(screenshotDir, { recursive: true });

  const evidenceIds = [...new Set(personas.flatMap((persona) =>
    persona.sessions.flatMap((session) => session.steps.flatMap((entry) => entry.evidenceIds)),
  ))];
  const copiedScreenshots = evidenceIds.map(copyEvidenceScreenshot);
  const allSteps = personas.flatMap((persona) => persona.sessions.flatMap((session) => session.steps));
  const supportCounts = Object.fromEntries(Object.keys(supportMeta).map((status) => [
    status,
    allSteps.filter((entry) => entry.status === status).length,
  ]));

  const evidence = {
    generatedAt: new Date().toISOString(),
    packageName,
    artifactType: 'evidence-grounded-longitudinal-persona-simulation',
    simulationDisclaimer: '가상 페르소나 기반 휴리스틱 시뮬레이션이며 실제 사용자 조사나 관찰 세션이 아니다.',
    repository: 'knhbae/flowme2605',
    branch: 'main',
    currentMainCommit: '83f8461',
    uiBaselineCommit: sourceEvidence.uiBaselineCommit,
    sourcePackage: sourcePackageName,
    sourcePackageCommit: '0a626ab',
    vercelUrl: 'https://flowme2605.vercel.app',
    supportTaxonomy: supportMeta,
    lifecycle,
    summary: {
      personaCount: personas.length,
      sessionCount: personas.reduce((count, persona) => count + persona.sessions.length, 0),
      stepCount: allSteps.length,
      screenshotCount: copiedScreenshots.length,
      supportCounts,
      coreLoopVerifiedThroughCompletion: true,
      postCompletionReviewVisible: false,
      sourceCorrectionRequestVisible: false,
      externalToolRoundTripCaptured: false,
      realUserValidationClaimed: false,
    },
    sourceMarkers: selectSourceMarkers(sourceEvidence.summary),
    personas: personas.map((persona) => ({
      ...persona,
      supportCounts: Object.fromEntries(Object.keys(supportMeta).map((status) => [
        status,
        persona.sessions.flatMap((session) => session.steps).filter((entry) => entry.status === status).length,
      ])),
      sessions: persona.sessions.map((session) => ({
        ...session,
        steps: session.steps.map((entry) => ({
          ...entry,
          evidence: entry.evidenceIds.map((id) => toEvidenceReference(id)),
        })),
      })),
    })),
    preliminaryFindings,
    openQuestions,
    codexAssessment,
    copiedScreenshots,
  };

  writeText('journey-evidence.json', JSON.stringify(evidence, null, 2));
  writeText('README.md', renderReadme(evidence));
  writeText('audit.md', renderAudit(evidence));
  writeText('codex-assessment.md', renderCodexAssessment(evidence));
  writeText('prompt-ko.md', renderPrompt(evidence));
  writeText('review.html', renderHtml(evidence));
  console.log(`Wrote ${path.relative(repoRoot, outputDir)} with ${evidence.summary.screenshotCount} screenshots and ${evidence.summary.stepCount} journey steps.`);
}

function writeText(fileName, content) {
  const normalized = `${content.replace(/[ \t]+$/gm, '').trimEnd()}\n`;
  fs.writeFileSync(path.join(outputDir, fileName), normalized, 'utf8');
}

function copyEvidenceScreenshot(id) {
  const scenario = sourceScenarios.get(id);
  if (!scenario) throw new Error(`Unknown P21 scenario id: ${id}`);
  const fileName = path.basename(scenario.screenshot);
  const sourcePath = path.join(sourcePackageDir, scenario.screenshot);
  const targetPath = path.join(screenshotDir, fileName);
  fs.copyFileSync(sourcePath, targetPath);
  const buffer = fs.readFileSync(targetPath);
  return {
    id,
    file: `screenshots/${fileName}`,
    route: scenario.route,
    label: scenario.label,
    viewport: scenario.viewport,
    sourceScenarioId: scenario.id,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    bytes: buffer.length,
    noHorizontalOverflow: scenario.noHorizontalOverflow,
    internalHitCount: scenario.guardrails?.internal?.length ?? 0,
  };
}

function toEvidenceReference(id) {
  const scenario = sourceScenarios.get(id);
  if (!scenario) throw new Error(`Unknown P21 scenario id: ${id}`);
  return {
    sourceScenarioId: id,
    file: `screenshots/${path.basename(scenario.screenshot)}`,
    route: scenario.route,
    label: scenario.label,
    viewport: scenario.viewport,
    noHorizontalOverflow: scenario.noHorizontalOverflow,
  };
}

function selectSourceMarkers(summary) {
  const keys = [
    'normalRouteInternalHitCount',
    'normalRouteStructuralDisplayHitCount',
    'urlFirstVisibleMarkdownHitCount',
    'urlFirstCandidateUserCopyInternalHitCount',
    'urlFirstMissDraftImpliesLiveAi',
    'urlFirstMissDraftSuggestedItemCount',
    'draftSaveFailureInputPreserved',
    'draftDuplicateCreatesExtraSavedFlow',
    'draftCompletedRemainingCount',
    'draftOfflineLocalActionsAvailable',
    'myFlowTodayFrameCount',
    'myFlowTodayInlineCompleteControlCount',
    'taskCompleteButtonCount',
    'taskCompleteMixedControlCount',
    'calendarGridSameDateFlowCount',
    'calendarGridVisibleFlowLabelCount',
    'calendarGridHiddenFlowSummaryCount',
    'calendarSelectedDayAgendaShowsAllFlows',
    'publicPreSaveCheckboxCompletionLikeLabelCount',
    'publicPostSaveCompletionControlActive',
  ];
  return Object.fromEntries(keys.map((key) => [key, summary[key]]));
}

function renderReadme(evidence) {
  return `# FlowMe 종단 사용자 여정 Review Package

이 package는 P21까지의 현재 UI를 6개 가상 페르소나가 여러 세션에 걸쳐 사용하는 종단 여정으로 재구성합니다. 페이지 한 장의 완성도가 아니라 **발견 → Flow 변환 → 저장 → 개인화 → 실행 → 완료 → 재방문 → 리뷰 → 수정 요청 → 재사용**이 실제로 연결되는지 Claude Design이 판단하도록 만든 입력물입니다.

> 이 결과는 실제 사용자 조사나 관찰 세션이 아닙니다. 현재 screenshot, route evidence, E2E 기준선을 조합한 evidence-grounded 휴리스틱 시뮬레이션입니다.

## 먼저 열 파일

1. [review.html](./review.html) — 페르소나별 3세션 여정과 screenshot
2. [journey-evidence.json](./journey-evidence.json) — 단계별 확인됨/부분 지원/미구현/evidence 부족 판정
3. [codex-assessment.md](./codex-assessment.md) — Codex 독립 평가, 출시 판단, P22 backlog
4. [audit.md](./audit.md) — 현재 연결 상태와 열린 제품 질문
5. [prompt-ko.md](./prompt-ko.md) — Claude Design 복붙용 요청문

## Package Summary

- Persona: ${evidence.summary.personaCount}
- Simulated sessions: ${evidence.summary.sessionCount}
- Journey checkpoints: ${evidence.summary.stepCount}
- Curated screenshots: ${evidence.summary.screenshotCount}
- 확인됨: ${evidence.summary.supportCounts.verified}
- 부분 지원: ${evidence.summary.supportCounts.partial}
- 미구현: ${evidence.summary.supportCounts.missing}
- evidence 부족: ${evidence.summary.supportCounts.evidence_gap}
- 의도적 보류: ${evidence.summary.supportCounts.deferred}
- 실제 사용자 검증 주장: 하지 않음

## Preliminary Reading

- 콘텐츠 발견부터 저장·개인화·실행·완료까지의 core loop는 현재 evidence로 연결됩니다.
- 동일 브라우저 재방문, 중복 draft 복구, 저장 실패 입력 보존, 오프라인 로컬 행동은 확인됩니다.
- 완료 뒤 리뷰, 원본/제작자 수정 요청, 외부 export 도구 왕복, 계정·기기 간 연속성은 닫히지 않았습니다.
- 개인 overlay 수정과 public/source 콘텐츠 개선 요청의 소유권 경계를 P22에서 결정해야 합니다.
- Codex 독립 평가는 현재 상태를 **조건부 사용 가능**으로 판정했습니다. 단일 기기 private beta와 반복 상용서비스 readiness를 구분해야 합니다.

## Baseline

- UI evidence baseline: \`${evidence.uiBaselineCommit}\`
- Source P21 package: [${sourcePackageName}](../${sourcePackageName}/README.md)
- Vercel: [${evidence.vercelUrl}](${evidence.vercelUrl})
- Existing 4-tab IA, public share shell, My Flow/Calendar role, Studio secondary-surface policy를 변경하지 않았습니다.
`;
}

function renderCodexAssessment(evidence) {
  const assessment = evidence.codexAssessment;
  return `# Codex 독립 제품·UX 평가

## 평가 성격

이 평가는 Claude Design에 넘길 동일한 screenshot과 route-evidence를 Codex가 먼저 독립적으로 검토한 결과다. 실제 사용자 조사, 시장 검증, 장기 관찰 결과가 아니다. 화면에서 확인할 수 없는 행동은 구현됐다고 가정하지 않았다.

## 출시 판단

- **판정:** ${assessment.verdict.label} (${assessment.verdict.level})
- **근거:** ${assessment.verdict.detail}
- **추천 방향:** ${assessment.recommendedDirection.title}
- **설명:** ${assessment.recommendedDirection.detail}

## 여정 점수

| 영역 | 점수 | 근거 | screenshot |
| --- | ---: | --- | --- |
${assessment.scorecards.map((entry) => `| ${entry.label} | ${entry.value}/${entry.max} | ${entry.rationale} | ${entry.evidenceIds.join(', ') || '미구현 전환'} |`).join('\n')}

## 주요 Findings

${assessment.findings.map((entry, index) => `${index + 1}. **[${entry.severity}] ${entry.title}** — ${entry.detail} (evidence: ${entry.evidenceIds.join(', ') || '사용자 표면 없음'})`).join('\n')}

## P22 권장 Backlog

${assessment.backlog.map((entry) => `### ${entry.id} · ${entry.priority} · ${entry.title}

- **대상:** ${entry.personas.join(', ')}
- **문제:** ${entry.problem}
- **최소 범위:** ${entry.minimumScope}
- **확장 금지:** ${entry.doNotExpand}
- **Acceptance criteria:**
${entry.acceptanceCriteria.map((criterion) => `  - ${criterion}`).join('\n')}
- **Evidence:** ${entry.evidenceIds.join(', ') || '현재 사용자 표면 없음'}`).join('\n\n')}

## 보류할 확장

${assessment.deferred.map((entry) => `- ${entry}`).join('\n')}

## Claude Design에 바라는 비교 검토

- 이 평가에 동의하는 항목과 반대하는 항목을 근거 screenshot과 함께 분리한다.
- 점수와 우선순위를 그대로 반복하지 말고, 가장 먼저 닫아야 할 종단 전환을 독립적으로 선택한다.
- UI polish로 해결되는 문제와 product policy/data capability가 필요한 문제를 분리한다.
- 실제 사용자 검증 전 구현하면 안 되는 항목을 명시한다.
`;
}

function renderAudit(evidence) {
  const personaSections = evidence.personas.map((persona) => {
    const sessions = persona.sessions.map((session) => {
      const rows = session.steps.map((entry) => `| ${supportMeta[entry.status].label} | ${entry.title} | ${entry.expected} | ${entry.observed} | ${entry.evidence.map((item) => item.sourceScenarioId).join(', ') || '없음'} |`).join('\n');
      return `### ${session.label} (${session.timing})\n\n| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |\n| --- | --- | --- | --- | --- |\n${rows}`;
    }).join('\n\n');
    return `## ${persona.name}\n\n- **상황:** ${persona.profile}\n- **목표:** ${persona.goal}\n- **예비 판단:** ${persona.preliminary}\n\n${sessions}`;
  }).join('\n\n');

  return `# FlowMe 종단 사용자 여정 Audit

## 감사 성격

이 문서는 실제 사용자 조사 결과가 아니다. P21 final package의 screenshot과 route-evidence를 6개 가상 페르소나의 다회차 사용 상황에 배치한 휴리스틱 시뮬레이션이다. 따라서 \`확인됨\`은 현재 자동화/시각 evidence 안에서의 확인이며, 시장 수요나 실제 습관 형성을 뜻하지 않는다.

## 전체 Lifecycle

| 단계 | 현재 상태 | 판단 |
| --- | --- | --- |
${evidence.lifecycle.map((entry) => `| ${entry.label} | ${supportMeta[entry.status].label} | ${entry.note} |`).join('\n')}

## 예비 Findings

${evidence.preliminaryFindings.map((finding, index) => `${index + 1}. **[${finding.severity}] ${finding.title}** — ${finding.detail}`).join('\n')}

${personaSections}

## Claude Design에 요청할 열린 질문

${evidence.openQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n')}

## Release Reading

- 한 기기·한 브라우저의 개인 실행 도구로는 발견→완료까지 조건부 사용 가능하다.
- 상용 반복 서비스로 평가하려면 리뷰/수정 요청, 계정·기기 연속성, 외부 도구 왕복, version update가 더 필요하다.
- 실제 AI, 커뮤니티, Studio 발행 확장은 위 연결을 먼저 결정한 뒤 판단해야 한다.
- Claude Design은 단순 화면 polish가 아니라 가장 먼저 닫아야 할 종단 전환과 P22 acceptance criteria를 제안해야 한다.
- Codex의 독립 평가는 [codex-assessment.md](./codex-assessment.md)에 분리했다. Claude Design은 이를 정답으로 간주하지 말고 screenshot 근거로 동의/반대를 표시해야 한다.
`;
}

function renderPrompt(evidence) {
  return `FlowMe의 현재 화면을 페이지별로만 평가하지 말고, 아래 종단 사용자 여정 review package만 보고 여러 세션에 걸친 제품 흐름을 검토해 주세요.

중요한 전제:
- 이 package는 실제 사용자 조사 결과가 아니라 evidence 기반 가상 페르소나 시뮬레이션입니다.
- 현재 없는 기능을 있다고 가정하지 마세요.
- 확인할 수 없는 전환은 \`evidence 부족\`, 사용자 표면이 없으면 \`미구현\`으로 구분하세요.
- URL-first miss 초안은 실제 AI가 아니라 결정론적 제안입니다.
- Studio는 현재 5번째 탭이 아닌 보조 초안 선반입니다.

검토 자료:
- Review HTML: ${githubBase}/review.html
- Journey evidence: ${githubBase}/journey-evidence.json
- Audit: ${githubBase}/audit.md
- Codex independent assessment: ${githubBase}/codex-assessment.md
- Screenshots: https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/${packageName}/screenshots
- Vercel: ${evidence.vercelUrl}

평가할 공통 lifecycle:
발견 → URL/메모를 Flow로 변환 → 저장 → 자기 상황에 맞게 수정 → My Flow/Calendar에서 실행 → 완료 체크 → 며칠 뒤 재방문 → 리뷰 → 수정 요청 → 재사용

6개 페르소나를 각각 세션 순서대로 검토하세요:
1. 이사 준비 사용자
2. 준비된 Flow가 없는 URL/메모 사용자
3. public 공유 Flow를 받은 사용자
4. 여러 Flow를 동시에 쓰는 직장인
5. 학습·워크시트 반복 사용자
6. 제작·수정에 관심 있는 Studio 사용자

각 페르소나에 대해 아래를 작성하세요:
- 사용자가 세션마다 기대하는 결과
- 실제 가능한 행동과 발견하기 어려운 기능
- 저장 상태와 수정본이 다음 화면으로 이어지는지
- 완료·완료 취소·실패·중복·오프라인·빈 상태의 복구 가능성
- 끊기는 전환과 그 원인: IA / copy / interaction / visual / product policy / missing capability / evidence gap
- 실제 사용자가 이탈할 가능성이 가장 높은 순간

특히 리뷰·수정 loop를 제품 수준으로 결정해 주세요:
- 완료 후 무엇을 물어야 하는가: 유용성, 정확성, 실행 결과, 빠진 항목
- 별점, 한줄 리뷰, 오류 신고, 수정 요청 중 첫 slice는 무엇인가
- 개인 overlay 수정과 원본/제작자 수정 요청을 어떻게 분리할 것인가
- 입구는 My Flow 완료 상태, 항목 detail, public /f, Studio 중 어디가 적합한가
- 커뮤니티를 크게 만들지 않고 가능한 최소 구현은 무엇인가
- source-backed 새 버전과 개인 수정본 충돌을 어떻게 다룰 것인가

최종 산출물:
1. 페르소나별 3세션 사용자 여정 평가
2. 전체 lifecycle coverage matrix
3. 이미 구현됐지만 발견성이 낮은 기능
4. 부분 지원·미구현·evidence 부족 전환
5. 리뷰→수정 요청→재사용 최소 제품 모델
6. 상용서비스 readiness: Ready / Conditional / Not Ready
7. 지금 집중할 핵심 종단 흐름 3개
8. 보류할 기능과 이유
9. 다음 review에 필요한 추가 screenshot/fixture
10. P22 backlog를 Blocking / High / Medium / Low로 작성
11. Codex 독립 평가에서 동의하는 항목, 반대하는 항목, 빠진 항목

각 P22 항목에는 ID, 대상 페르소나, 끊기는 전환, 현재 evidence, 최소 해결 범위, 하지 말아야 할 확장, acceptance criteria, 필요한 E2E/screenshot, 선행 의존성을 포함하세요.

유지할 기준선:
- 홈 / Flow 찾기 / 캘린더 / 내 Flow 4탭 IA
- public /f의 저장 우선 공유 shell
- My Flow는 할 일 중심, Calendar는 날짜 중심
- source 원본과 personal overlay 분리
- 완료 checkbox 한 종류
- 저장/실행/export 구조 유지
- 실제 AI·커뮤니티·발행 기능을 이미 있는 것처럼 평가하지 않기

결과는 한국어 HTML 또는 .dc.html로 작성하고, 가장 먼저 닫아야 할 종단 사용자 여정 하나를 최종 추천으로 명시해 주세요.
`;
}

function renderHtml(evidence) {
  const assessment = evidence.codexAssessment;
  const lifecycleHtml = evidence.lifecycle.map((entry) => `
    <div class="life-step ${supportMeta[entry.status].tone}">
      <strong>${escapeHtml(entry.label)}</strong>
      <span>${escapeHtml(supportMeta[entry.status].label)}</span>
      <p>${escapeHtml(entry.note)}</p>
    </div>`).join('');

  const personaHtml = evidence.personas.map((persona, personaIndex) => `
    <section class="persona" id="${escapeHtml(persona.id)}">
      <div class="persona-head">
        <div><span class="index">${personaIndex + 1}</span><h2>${escapeHtml(persona.name)}</h2></div>
        <p>${escapeHtml(persona.profile)}</p>
        <p class="goal"><strong>목표</strong> ${escapeHtml(persona.goal)}</p>
        <p class="preliminary">${escapeHtml(persona.preliminary)}</p>
      </div>
      ${persona.sessions.map((session) => `
        <div class="session">
          <div class="session-head"><h3>${escapeHtml(session.label)}</h3><span>${escapeHtml(session.timing)}</span></div>
          <div class="steps">
            ${session.steps.map((entry) => `
              <article class="journey-step ${supportMeta[entry.status].tone}">
                <div class="step-top">
                  <span class="status">${escapeHtml(supportMeta[entry.status].label)}</span>
                  <code>${escapeHtml(entry.phase)}</code>
                </div>
                <h4>${escapeHtml(entry.title)}</h4>
                <p><strong>기대</strong> ${escapeHtml(entry.expected)}</p>
                <p><strong>관찰</strong> ${escapeHtml(entry.observed)}</p>
                ${entry.evidence.map((item) => `
                  <figure>
                    <img src="${escapeHtml(item.file)}" alt="${escapeHtml(item.label)}" loading="lazy" />
                    <figcaption>${escapeHtml(item.route)} · ${escapeHtml(String(item.viewport?.width ?? ''))}px · ${escapeHtml(item.sourceScenarioId)}</figcaption>
                  </figure>`).join('')}
              </article>`).join('')}
          </div>
        </div>`).join('')}
    </section>`).join('');

  const scorecardHtml = assessment.scorecards.map((entry) => `
    <article class="scorecard">
      <div><strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(String(entry.value))}/${escapeHtml(String(entry.max))}</span></div>
      <div class="scorebar"><i style="width:${escapeHtml(String((entry.value / entry.max) * 100))}%"></i></div>
      <p>${escapeHtml(entry.rationale)}</p>
      <small>${escapeHtml(entry.evidenceIds.join(', ') || '현재 사용자 표면 없음')}</small>
    </article>`).join('');

  const assessmentFindingsHtml = assessment.findings.map((entry) => `
    <article class="assessment-finding priority-${escapeHtml(entry.severity.toLowerCase())}">
      <span>${escapeHtml(entry.severity)}</span>
      <strong>${escapeHtml(entry.title)}</strong>
      <p>${escapeHtml(entry.detail)}</p>
      <small>${escapeHtml(entry.evidenceIds.join(', ') || '현재 사용자 표면 없음')}</small>
    </article>`).join('');

  const backlogHtml = assessment.backlog.map((entry) => `
    <article class="backlog-item priority-${escapeHtml(entry.priority.toLowerCase())}">
      <div><code>${escapeHtml(entry.id)}</code><span>${escapeHtml(entry.priority)}</span></div>
      <h3>${escapeHtml(entry.title)}</h3>
      <p><strong>문제</strong> ${escapeHtml(entry.problem)}</p>
      <p><strong>최소 범위</strong> ${escapeHtml(entry.minimumScope)}</p>
      <p><strong>확장 금지</strong> ${escapeHtml(entry.doNotExpand)}</p>
      <ul>${entry.acceptanceCriteria.map((criterion) => `<li>${escapeHtml(criterion)}</li>`).join('')}</ul>
    </article>`).join('');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FlowMe 종단 사용자 여정 Review Package</title>
  <style>
    :root { color-scheme: light; --ink:#15171a; --muted:#667085; --line:#d9dde5; --paper:#f5f6f8; --blue:#3057ff; --green:#087f5b; --amber:#a15c00; --red:#b42318; --violet:#7048e8; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family:Arial,"Noto Sans KR",sans-serif; line-height:1.55; letter-spacing:0; }
    a { color:var(--blue); }
    header, main, footer { width:min(1240px, calc(100% - 32px)); margin-inline:auto; }
    header { padding:48px 0 28px; }
    .eyebrow { color:var(--blue); font-weight:800; font-size:13px; }
    h1 { margin:8px 0 12px; font-size:clamp(30px,5vw,54px); line-height:1.08; letter-spacing:0; }
    header > p { max-width:820px; margin:0; color:#475467; font-size:17px; }
    .notice { margin-top:20px; padding:14px 16px; border-left:4px solid var(--amber); background:#fff8eb; }
    nav { display:flex; flex-wrap:wrap; gap:8px; margin-top:20px; }
    nav a { padding:8px 11px; border:1px solid var(--line); border-radius:6px; background:white; text-decoration:none; font-size:13px; font-weight:700; }
    .metrics { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; margin:8px 0 30px; }
    .metric { padding:16px; border:1px solid var(--line); border-radius:8px; background:white; }
    .metric strong { display:block; color:var(--blue); font-size:26px; }
    .metric span { color:var(--muted); font-size:12px; }
    .band { margin:24px 0; padding:26px; border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:white; }
    .band h2 { margin:0 0 16px; font-size:24px; }
    .lifecycle { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; }
    .life-step { min-height:152px; padding:14px; border:1px solid var(--line); border-top-width:4px; border-radius:7px; background:#fff; }
    .life-step strong, .life-step span { display:block; }
    .life-step span { margin-top:4px; font-size:12px; font-weight:800; }
    .life-step p { margin:10px 0 0; color:var(--muted); font-size:13px; }
    .good { border-top-color:var(--green)!important; } .good .status,.good>span { color:var(--green); }
    .partial { border-top-color:var(--amber)!important; } .partial .status,.partial>span { color:var(--amber); }
    .missing { border-top-color:var(--red)!important; } .missing .status,.missing>span { color:var(--red); }
    .gap { border-top-color:var(--violet)!important; } .gap .status,.gap>span { color:var(--violet); }
    .deferred { border-top-color:#475467!important; } .deferred .status,.deferred>span { color:#475467; }
    .persona { margin:32px 0 56px; }
    .persona-head { padding:26px 0 18px; border-bottom:2px solid var(--ink); }
    .persona-head > div { display:flex; align-items:center; gap:12px; }
    .index { display:grid; place-items:center; width:32px; height:32px; border-radius:50%; color:white; background:var(--ink); font-weight:800; }
    .persona h2 { margin:0; font-size:30px; }
    .persona-head p { max-width:900px; margin:8px 0 0; color:#475467; }
    .persona-head .goal { color:var(--ink); }
    .preliminary { padding-left:12px; border-left:3px solid var(--blue); }
    .session { padding:24px 0; border-bottom:1px solid var(--line); }
    .session-head { display:flex; justify-content:space-between; gap:16px; align-items:baseline; margin-bottom:14px; }
    .session-head h3 { margin:0; font-size:21px; }
    .session-head span { color:var(--muted); font-size:13px; }
    .steps { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
    .journey-step { min-width:0; padding:18px; border:1px solid var(--line); border-top-width:4px; border-radius:7px; background:white; }
    .step-top { display:flex; justify-content:space-between; align-items:center; gap:8px; }
    .status { font-size:12px; font-weight:800; }
    code { padding:3px 6px; border-radius:4px; background:#eef1f5; color:#344054; font-size:11px; }
    .journey-step h4 { margin:10px 0 8px; font-size:18px; }
    .journey-step p { margin:7px 0; color:#475467; font-size:14px; }
    .journey-step p strong { color:var(--ink); }
    figure { margin:14px 0 0; }
    img { display:block; width:100%; max-height:520px; object-fit:contain; object-position:top center; border:1px solid var(--line); background:#f8fafc; }
    figcaption { margin-top:6px; color:var(--muted); font-size:11px; overflow-wrap:anywhere; }
    .findings { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    .finding { padding:16px; border-left:4px solid var(--red); background:white; }
    .finding strong { display:block; margin-bottom:6px; }
    .questions li { margin:8px 0; }
    .verdict { display:grid; grid-template-columns:minmax(180px,.34fr) 1fr; gap:20px; align-items:start; }
    .verdict-mark { padding:20px; border:1px solid #ffd8a8; border-left:5px solid var(--amber); background:#fff8eb; }
    .verdict-mark strong { display:block; font-size:25px; }
    .verdict-copy h3 { margin:0 0 8px; font-size:22px; }
    .verdict-copy p { margin:6px 0; color:#475467; }
    .scorecards { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:20px; }
    .scorecard { padding:15px; border:1px solid var(--line); background:white; }
    .scorecard > div:first-child { display:flex; justify-content:space-between; gap:12px; }
    .scorecard > div:first-child span { color:var(--blue); font-weight:800; }
    .scorebar { height:7px; margin:9px 0; overflow:hidden; background:#e8ebf0; }
    .scorebar i { display:block; height:100%; background:var(--blue); }
    .scorecard p { margin:8px 0; color:#475467; font-size:13px; }
    .scorecard small, .assessment-finding small { color:var(--muted); overflow-wrap:anywhere; }
    .assessment-findings { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    .assessment-finding { padding:16px; border:1px solid var(--line); border-left:4px solid var(--amber); background:white; }
    .assessment-finding > span { display:block; margin-bottom:5px; color:var(--amber); font-size:11px; font-weight:800; text-transform:uppercase; }
    .assessment-finding strong { display:block; }
    .assessment-finding p { margin:7px 0; color:#475467; font-size:13px; }
    .priority-blocking { border-left-color:var(--red)!important; } .priority-blocking > span { color:var(--red)!important; }
    .priority-high { border-left-color:#e8590c!important; } .priority-high > span { color:#e8590c!important; }
    .priority-medium { border-left-color:var(--amber)!important; } .priority-medium > span { color:var(--amber)!important; }
    .priority-low { border-left-color:var(--green)!important; } .priority-low > span { color:var(--green)!important; }
    .backlog { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    .backlog-item { padding:17px; border:1px solid var(--line); border-left:4px solid var(--amber); background:white; }
    .backlog-item > div { display:flex; justify-content:space-between; gap:10px; align-items:center; }
    .backlog-item > div span { color:#475467; font-size:11px; font-weight:800; }
    .backlog-item h3 { margin:10px 0; font-size:18px; }
    .backlog-item p, .backlog-item li { color:#475467; font-size:13px; }
    .backlog-item p { margin:7px 0; }
    .backlog-item ul { margin:9px 0 0; padding-left:18px; }
    footer { padding:30px 0 56px; color:var(--muted); font-size:13px; }
    @media (max-width:800px) {
      header { padding-top:28px; }
      .metrics { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .lifecycle, .steps, .findings, .scorecards, .assessment-findings, .backlog { grid-template-columns:1fr; }
      .verdict { grid-template-columns:1fr; }
      .session-head { display:block; }
      .session-head span { display:block; margin-top:4px; }
      .persona h2 { font-size:25px; }
      .band { padding:20px 16px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="eyebrow">P21 이후 제품 방향 검토용 · evidence-grounded simulation</div>
    <h1>FlowMe 종단 사용자 여정</h1>
    <p>6개 가상 페르소나가 여러 세션에 걸쳐 콘텐츠를 발견하고, Flow로 바꾸고, 저장·수정·실행·완료한 뒤 리뷰와 수정 요청까지 시도합니다.</p>
    <div class="notice"><strong>실제 사용자 조사 아님.</strong> 현재 UI screenshot과 route evidence를 시간순 사용자 여정으로 재배열한 휴리스틱 시뮬레이션입니다.</div>
    <nav><a href="#codex-assessment">Codex 독립 평가</a>${evidence.personas.map((persona) => `<a href="#${escapeHtml(persona.id)}">${escapeHtml(persona.name)}</a>`).join('')}<a href="#questions">열린 질문</a></nav>
  </header>
  <main>
    <section class="metrics">
      <div class="metric"><strong>${evidence.summary.personaCount}</strong><span>personas</span></div>
      <div class="metric"><strong>${evidence.summary.sessionCount}</strong><span>simulated sessions</span></div>
      <div class="metric"><strong>${evidence.summary.stepCount}</strong><span>journey checkpoints</span></div>
      <div class="metric"><strong>${evidence.summary.screenshotCount}</strong><span>curated screenshots</span></div>
      <div class="metric"><strong>${evidence.summary.supportCounts.missing}</strong><span>missing transitions</span></div>
    </section>
    <section class="band">
      <h2>전체 Lifecycle Coverage</h2>
      <div class="lifecycle">${lifecycleHtml}</div>
    </section>
    <section class="band" id="codex-assessment">
      <h2>Codex 독립 제품·UX 평가</h2>
      <div class="verdict">
        <div class="verdict-mark"><span>Release reading</span><strong>${escapeHtml(assessment.verdict.label)}</strong><small>${escapeHtml(assessment.verdict.level)}</small></div>
        <div class="verdict-copy"><h3>${escapeHtml(assessment.recommendedDirection.title)}</h3><p>${escapeHtml(assessment.verdict.detail)}</p><p>${escapeHtml(assessment.recommendedDirection.detail)}</p><p><a href="codex-assessment.md">전체 평가와 acceptance criteria 열기</a></p></div>
      </div>
      <div class="scorecards">${scorecardHtml}</div>
    </section>
    <section class="band">
      <h2>Codex Findings</h2>
      <div class="assessment-findings">${assessmentFindingsHtml}</div>
    </section>
    <section class="band" id="codex-backlog">
      <h2>P22 권장 Backlog</h2>
      <div class="backlog">${backlogHtml}</div>
    </section>
    ${personaHtml}
    <section class="band" id="questions">
      <h2>예비 Findings</h2>
      <div class="findings">${evidence.preliminaryFindings.map((finding) => `<div class="finding"><strong>[${escapeHtml(finding.severity)}] ${escapeHtml(finding.title)}</strong><span>${escapeHtml(finding.detail)}</span></div>`).join('')}</div>
    </section>
    <section class="band questions">
      <h2>Claude Design에 요청할 열린 질문</h2>
      <ol>${evidence.openQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join('')}</ol>
      <p><a href="prompt-ko.md">복붙용 Claude Design 프롬프트 열기</a> · <a href="journey-evidence.json">구조화 evidence 열기</a> · <a href="codex-assessment.md">Codex 독립 평가 열기</a></p>
    </section>
  </main>
  <footer>FlowMe longitudinal journey review package · UI baseline ${escapeHtml(evidence.uiBaselineCommit)} · 실제 사용자 검증 주장 없음</footer>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
