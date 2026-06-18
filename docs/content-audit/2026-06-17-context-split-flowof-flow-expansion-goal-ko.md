# Context Split + Flow of Flow 확산 목표

**작성일:** 2026-06-17  
**상태:** 다음 작업 목표 정의  
**목적:** 최근 중1 수학 PoC에서 잘 맞았던 `제작자 / 저장 전 / 내 앱` 화면 분리 원칙을 단일 Flow와 Flow of Flow 양쪽으로 확산한다.

## 1. 왜 이 작업을 하는가

FlowMe는 단순히 예쁜 체크리스트 화면을 만드는 서비스가 아니다. 제작자가 자기 콘텐츠를 실행 가능한 Flow로 만들고, 사용자는 그 Flow를 저장해 실제로 실행할 수 있어야 한다.

지금까지 확인한 것은 작은 Flow 단위가 어느 정도 가능하다는 점이다. 다음으로 확인해야 할 것은 두 가지다.

1. 같은 Flow 데이터가 화면 맥락에 따라 다르게 보여야 하는가?
2. 여러 작은 Flow가 상위 구조 안에서 반복 관리되는 Flow of Flow가 제품적으로 성립하는가?

## 2. 핵심 원칙

- 하나의 Flow record를 모든 화면에서 같은 UI로 보여주지 않는다.
- 제작자 화면, 저장 전 사용자 화면, 내 앱 실행 화면을 분리한다.
- 단일 Flow와 Flow of Flow를 같은 구조로 억지 통일하지 않는다.
- 내 앱 화면은 전세 Flow 수준으로 가볍게 유지한다.
- Flow of Flow는 단순 묶음이 아니라 반복 가능한 하위 Flow 운영 구조여야 한다.
- 사용자 화면에 개발자 리뷰, 평가 점수, source fit, PoC 같은 내부 문구를 노출하지 않는다.
- 이 작업은 PoC/전략 검토이며 실제 사용자 행동 검증이 아니다.

## 3. 화면별 역할

| 화면 | 핵심 질문 | 필요한 내용 |
|---|---|---|
| 제작자 | 내 원문이 어떤 실행물로 바뀌는가? | 원문 구조, 변환 규칙, 하위 Flow 패턴, 발행 전 미리보기 |
| 저장 전 | 저장하면 내 앱에 무엇이 생기는가? | 자연 artifact, 최소 입력, 전체/일부 저장 결과 |
| 내 앱 | 지금 무엇을 하면 되는가? | 오늘/선택 항목, 체크, 메모, 원문 링크, 다음 항목 |

## 4. 단계별 목표

### Phase 1. 기준선 고정

**목표:** 중1 수학 context split PoC에서 재사용할 원칙을 추출한다.

해야 할 일:

- `2026-06-17-math-flow-context-split-poc-ko.html`에서 유지할 구조와 줄일 구조를 구분한다.
- 단일 Flow, Flow map, Flow of Flow 판정 기준을 정리한다.
- 화면 확산 금지 조건을 문서화한다.

산출물:

- `docs/content-audit/2026-06-17-context-split-expansion-principles-ko.md`

완료 기준:

- 다음 작업자가 단일 Flow와 Flow of Flow를 구분할 수 있다.
- 사용자 화면에 넣지 말아야 할 요소가 명확하다.

### Phase 2. 단일 Flow 5개 확산

**목표:** 이미 괜찮다고 본 작은 Flow들에 `제작자 / 저장 전 / 내 앱` 구조를 적용한다.

대상:

| Flow | 자연 artifact |
|---|---|
| 전세계약 점검 | 캘린더 + 선택 날짜 체크 |
| 이사 D-30 | 캘린더 + 전체 일정 |
| 중고차 방문 체크 | 현장 체크리스트 + 보류 메모 |
| 초등 입학 준비 | 준비 일정 + 준비물 체크 |
| 홈트 반복 일정 | 반복 일정 + 영상 링크 + 오늘 회차 |

해야 할 일:

- 각 Flow의 source, user job, artifact, setup input, execution item을 먼저 적는다.
- 제작자 화면은 원문 구조와 변환 규칙 중심으로 만든다.
- 저장 전 화면은 저장 후 생기는 결과물 중심으로 만든다.
- 내 앱 화면은 오늘/선택 항목, 체크, 메모, 원문 링크만 남긴다.
- 모바일 390px에서 깨지지 않는지 확인한다.

산출물:

- `docs/content-audit/2026-06-17-context-split-single-flow-expansion-ko.html`
- `output/playwright/context-split-single-flow-verify.js`

완료 기준:

- 5개 단일 Flow가 같은 원칙을 공유하되 같은 UI 복붙처럼 보이지 않는다.
- 내 앱 화면은 전세 Flow 수준의 가벼움을 유지한다.

### Phase 3. Flow of Flow 대표 2개 적용

**목표:** 상위 구조가 반복 하위 Flow를 만들고 관리하는 케이스를 검증한다.

대상:

| 후보 | 상위 구조 | 하위 Flow 반복 단위 |
|---|---|---|
| 중1 수학 커리큘럼 | 전체 진도표 | 단원별 공부 Flow |
| 자격증 과목별 공부 | 자격증 공부 운영판 | 과목별 진도/기출/오답 Flow |

이번에는 Park:

- 이사 전체 지도: 단일 timeline Flow로 충분할 가능성이 높다.
- 육아 전체 지도: 가능성은 있으나 공식 정보, 부모 경험, 주의사항 분리가 더 필요하다.

해야 할 일:

- 상위 지도 이름, 하위 Flow 반복 단위, 공통 패턴, 전체 저장 결과, 일부 저장 결과를 먼저 적는다.
- 제작자 화면에서는 반복 단위를 정하고 하위 Flow 패턴을 만드는 흐름을 보여준다.
- 저장 전 화면에서는 전체 저장과 일부 저장의 차이를 보여준다.
- 내 앱 화면에서는 상위 지도보다 현재 위치와 다음 하위 Flow를 먼저 보여준다.
- 하위 Flow 상세는 기존 작은 Flow처럼 체크/메모/원문 링크 중심으로 둔다.

산출물:

- `docs/content-audit/2026-06-17-context-split-flowof-flow-expansion-ko.html`
- `output/playwright/context-split-flowof-flow-verify.js`

완료 기준:

- 최소 1개는 "상위 구조 안에서 반복 하위 Flow를 관리한다"는 느낌이 분명하다.
- 전체 저장과 일부 저장의 차이가 사용자 화면에서 이해된다.
- 내 앱 화면이 과한 커리큘럼 대시보드처럼 보이지 않는다.

### Phase 4. 제작자 운영 화면과 내 Flow 관리 화면 연결

**목표:** Flow 샘플들이 흩어진 HTML이 아니라 서비스 구조처럼 보이게 한다.

해야 할 일:

- 제작자가 발행한 단일 Flow와 Flow of Flow를 한 화면에서 관리하는 구조를 만든다.
- 사용자가 저장한 단일 Flow와 Flow of Flow를 내 Flow에서 함께 보는 구조를 만든다.
- 저장 전 화면에서 저장한 결과가 내 Flow에 어떻게 들어오는지 클릭 흐름으로 보여준다.
- Flow of Flow 전체 저장과 일부 저장이 내 Flow에서 어떻게 다르게 보이는지 확인한다.

산출물:

- `docs/content-audit/2026-06-17-context-split-service-ia-poc-ko.html`

완료 기준:

- 제작자는 "내 콘텐츠가 실행형 자산으로 쌓인다"는 감각을 얻는다.
- 사용자는 전체 지도보다 오늘 할 일과 다음 실행 항목을 먼저 본다.

### Phase 5. 시뮬레이션과 반복 개선

**목표:** 한 번 만든 화면을 보고 끝내지 않고 실제 사용자/제작자 저니 기준으로 반복 수정한다.

사용자 저니:

1. 원문 또는 제작자 페이지에서 Flow를 발견한다.
2. 저장 전 화면을 본다.
3. 최소 입력을 넣는다.
4. 전체 저장 또는 일부 저장을 선택한다.
5. 내 Flow에서 오늘/선택 항목을 연다.
6. 체크, 메모, 원문 링크를 사용한다.
7. 며칠 뒤 다시 들어와 다음 항목을 찾는다.

제작자 저니:

1. 제작자가 원문 URL 또는 기존 콘텐츠 구조를 가져온다.
2. 변환 규칙을 확인한다.
3. 단일 Flow 또는 Flow of Flow로 발행한다.
4. 사용자 미리보기를 확인한다.
5. 업데이트가 필요할 때 어디서 고치는지 확인한다.

문제 등급:

- Blocking: Flow 유형이 틀렸거나 사용자가 실행할 수 없음.
- High: 실행은 되지만 버튼, 입력, 구조가 부자연스러움.
- Medium: 모바일 밀도, 문장, 카드 순서 문제.
- Low: polish.

산출물:

- `docs/content-audit/2026-06-17-context-split-expansion-simulation-report-ko.html`

완료 기준:

- Blocking/High 문제는 수정 후 재시뮬레이션한다.
- 단일 Flow와 Flow of Flow 각각 최소 2회 반복한다.
- 실제 사용자 검증이 아니라 PoC/전략 검토임을 명시한다.

### Phase 6. 검증과 최종 판단

**목표:** 다음 제품 작업으로 넘어갈 수 있는지 판단한다.

검증:

- `npm run docs:check`
- 모바일 390px 주요 화면 overflow 확인
- 데스크톱 1280px 주요 화면 확인
- 저장, 일부 저장, 하위 Flow 선택, 체크, 메모 입력 동작 확인
- 사용자 화면 금지어 검색

사용자 화면 금지어:

- `개발자`
- `리뷰`
- `source fit`
- `평가 점수`
- `PoC`
- `검증됨`
- `ParentFlow`
- `ChildFlow`

최종 판단 질문:

- 어떤 Flow는 단일 Flow로 충분한가?
- 어떤 Flow는 Flow of Flow가 필요한가?
- 어떤 화면 분리 패턴은 재사용 가능한가?
- 어떤 부분은 아직 제품화 전에 더 봐야 하는가?

## 5. 최종 산출물 목록

1. `2026-06-17-context-split-expansion-principles-ko.md`
2. `2026-06-17-context-split-single-flow-expansion-ko.html`
3. `2026-06-17-context-split-flowof-flow-expansion-ko.html`
4. `2026-06-17-context-split-service-ia-poc-ko.html`
5. `2026-06-17-context-split-expansion-simulation-report-ko.html`
6. `output/playwright/context-split-single-flow-verify.js`
7. `output/playwright/context-split-flowof-flow-verify.js`

## 6. 한 줄 요약

다음 작업은 `좋았던 중1 수학 화면`을 복붙하는 것이 아니라, **단일 Flow와 Flow of Flow 모두에서 같은 콘텐츠가 제작자/저장 전/내 앱 화면으로 다르게 제공되는 제품 구조를 검증하는 것**이다.

상세 실행계획은 `docs/superpowers/plans/2026-06-17-context-split-flowof-flow-expansion.md`에도 정리되어 있다.

