# 최근 진행 및 검토용 산출물 종합

작성일: 2026-06-18  
범위: 최근 FLOW 작업 중 `docs/content-audit/`, 제품 결정 문서, 현재 worktree에 남아 있는 산출물을 기준으로 정리  
상태 표현 원칙: 아래 내용은 PoC, 시뮬레이션, 내부 검토 산출물이다. 실제 사용자 행동 데이터가 아니므로 `검증됨`, `런칭 준비 완료`, `시장 적합성 확인`으로 읽으면 안 된다.

## 한 줄 요약

최근 작업은 "작은 단일 Flow가 원문을 실행 artifact로 바꿀 수 있는가"에서 출발해, "반복 하위 Flow를 가진 상위 실행 지도, 즉 Flow of Flow가 제품 구조로 성립하는가"를 검토하는 방향으로 이동했다. 현재 가장 유의미한 산출물은 10개 단일 Flow 사용자 샘플, Source-to-Flow 변환 게이트, 사용자/제작자/내 앱 context split PoC, Flow of Flow Top 5 후보 검토, 그리고 중등 수학 학습 지도 플랫폼 PoC다.

## 현재 증거 경계

- 현재 repo 상태는 `Stage 0 / First Flag` 검증 중심이다.
- 실제 관찰 사용자 세션, 후보별 copy/export/check 행동 데이터, 정량 retention 데이터는 아직 없다.
- 최근 HTML/MD 산출물은 내부 판단, 사용자 저니 시뮬레이션, 클릭 PoC, 화면 구조 검토에 해당한다.
- `git status` 기준 worktree는 매우 dirty 상태이며, 현재 브랜치는 `design-ref-full-gap-alignment`가 원격보다 10 commits ahead다. 따라서 git log보다 현재 문서와 산출물 파일을 우선 근거로 봐야 한다.

## 진행 흐름

### 1. 실행 관찰 준비: distribution-channel-handoff

6/10~6/11 작업은 제품 기능 확장보다 첫 관찰 세션을 안전하게 준비하는 데 초점을 뒀다. `school-or-dorm-prep-share-packet` 축에서 초대문, 스케줄링, 사전 체크, 관찰 당일 시트, 세션 로그, 롤업, evidence board 업데이트 규칙을 만들었다.

유의미한 점:

- 실명, 연락처, 방/비밀번호, 건강/결제/신원 정보 같은 민감값을 기록하지 않는 경계를 세웠다.
- `not invited -> invited -> agreed/declined -> completed/stopped` 상태 흐름을 문서화했다.
- evidence board는 3개 usable session과 rollup 전에는 진행하지 않도록 막았다.
- 이 묶음은 관찰 준비물이지 사용자 검증 증거가 아니다.

대표 산출물:

- [distribution-channel handoff hub](./2026-06-11-distribution-channel-handoff-html-hub.md)
- [current-state handoff](./2026-06-11-distribution-channel-handoff-current-state-handoff.md)
- [school/dorm recruiting copy](./2026-06-11-school-dorm-share-packet-recruiting-copy.md)
- [scheduling tracker](./2026-06-11-school-dorm-share-packet-scheduling-tracker.md)
- [preflight checklist](./2026-06-11-school-dorm-share-packet-preflight-checklist.md)
- [pilot worksheet](./2026-06-11-school-dorm-share-packet-pilot-worksheet.md)
- [rollup template](./2026-06-11-school-dorm-share-packet-rollup-template.md)
- [evidence board update runbook](./2026-06-11-school-dorm-share-packet-evidence-board-update-runbook.md)

### 2. 단일 Source-to-Flow 후보 확장

6/14~6/17에는 전세 수준의 기준선을 바탕으로 여러 카테고리에서 "원문 콘텐츠가 자연스러운 실행 artifact로 바뀌는가"를 확인했다. 핵심은 같은 UI 껍데기를 모든 콘텐츠에 덮는 것이 아니라, 원문 구조에 따라 calendar, checklist, sheet, memo, bucket, routine을 다르게 고르는 쪽으로 정리된 점이다.

대표 결과:

- 전세/이사 같은 날짜형은 calendar/timeline이 자연스럽다.
- 중고차/AnyDesk 같은 현장 절차형은 월간 calendar보다 순서형 checklist가 자연스럽다.
- 홈트/식물 같은 반복형은 routine calendar + 오늘 체크 + 중단/보류 조건 정도가 맞다.
- 스퀴시/자료성 콘텐츠는 다단계 Flow보다 bucket + optional date가 맞다.
- 영유아 검진/이유식 등 민감 영역은 공식 정보, 경험 팁, 전문가 상담 경계를 더 강하게 분리해야 한다.

대표 산출물:

- [6 category source journey UX](./2026-06-15-six-category-source-journey-flow-ux-ko.html)
- [6 category user PoC](./2026-06-15-six-category-jeonse-level-user-poc-ko.html)
- [6 category candidate reassessment](./2026-06-15-six-category-candidate-reassessment-ko.html)
- [Top 3 Jeonse-level user PoC](./2026-06-16-top3-jeonse-level-user-poc-ko.html)
- [10 Flow user samples](./2026-06-16-ten-flow-user-samples-ko.html)
- [10 Flow expansion report](./2026-06-16-ten-flow-expansion-report-ko.html)
- [source-gated Flow user v2](./2026-06-17-source-gated-flow-user-v2-ko.html)
- [source-gated candidate reassessment](./2026-06-17-source-gated-candidate-reassessment-ko.html)
- [source-gated simulation report](./2026-06-17-source-gated-simulation-report-ko.html)

### 3. 변환 게이트와 제품 판단 기준 정리

6/17에 중요한 기준이 결정 문서와 flow-rules 쪽으로 정리됐다. 핵심은 "보기 좋은 화면"보다 "한 primary source가 한 natural artifact로 바뀌는가"를 먼저 보는 것이다.

주요 기준:

- Flow 하나에는 primary source, user job, natural artifact가 있어야 한다.
- 보조 링크는 공식 경계나 참고용으로 쓰되, Flow 구조를 지배하면 안 된다.
- 고정된 섹션 수, 억지 checklist, URL/방법/반복 간격 같은 값을 top-level input으로 올리는 것은 실패 신호다.
- 작은 Flow 변환은 creator platform이나 experience map 검증을 자동으로 뜻하지 않는다.

대표 산출물:

- [Source-to-Flow conversion gate](../flow-rules/source-to-flow-conversion-gate.md)
- [Flow content source selection rules](../flow-rules/flow-content-source-selection.md)
- [Product decisions](../DECISIONS.md)

### 4. Context split: 같은 Flow를 같은 화면으로 보지 않기

6/17 후반에는 Flow content가 제품 표면마다 다르게 보여야 한다는 방향이 정리됐다.

구분:

- 제작자 화면: source structure, conversion rule, publish state, user preview를 다룬다.
- 저장 전 사용자 화면: 어떤 artifact가 생기고, 최소 입력이 무엇인지 보여준다.
- 내 앱 실행 화면: 오늘 또는 선택한 실행 item, check, memo, source link만 가볍게 둔다.

이 작업의 의미는 Flow of Flow를 바로 큰 지도 UI로 밀지 않고, 먼저 작은 Flow가 저장되고 운영되는 기본 화면을 확인한 점이다.

대표 산출물:

- [context split principles](./2026-06-17-context-split-expansion-principles-ko.md)
- [single Flow expansion](./2026-06-17-context-split-single-flow-expansion-ko.html)
- [Flow of Flow expansion](./2026-06-17-context-split-flowof-flow-expansion-ko.html)
- [service IA PoC](./2026-06-17-context-split-service-ia-poc-ko.html)
- [context split simulation report](./2026-06-17-context-split-expansion-simulation-report-ko.html)

### 5. Flow of Flow / Flow Pack / 실행형 지도 검토

6/17~6/18의 중심 질문은 "Flow Pack이 단순 묶음인가, 아니면 반복 하위 Flow를 가진 운영 가능한 실행 지도인가"였다. 현재 판정은 다음과 같다.

- 단일 Flow: 하나의 일정, 체크리스트, 표, 메모로 충분한 경우.
- Collection/map: 관련 Flow를 묶지만 하위 실행 패턴이 반복되지는 않는 경우.
- 진짜 Flow of Flow: 상위 program/map 아래에 같은 패턴의 child Flow가 3개 이상 반복되고, 사용자가 전체 위치, 다음 실행, 진행률, 일부 저장을 의미 있게 다룰 수 있는 경우.

대표 후보:

1. NHS Couch to 5K 9주 러닝 플랜
2. JustinGuitar Beginner Guitar Grade 1
3. freeCodeCamp Responsive Web Design Certification
4. RHS Vegetable Crop Planner
5. Solid Starts Baby Feeding Schedules

Top 5 재판정:

- Go: 러닝 9주, 작물표, 기타 Grade 1
- Watch: freeCodeCamp 웹디자인
- Conditional: 이유식/월령 식사 타임라인

대표 산출물:

- [Flow of Flows structure](./2026-06-17-flow-of-flows-structure-ko.html)
- [Flow Pack bundling model](./2026-06-17-flow-pack-bundling-model-ko.html)
- [Flow of Flows v2 model](./2026-06-17-flowof-flows-v2-model-ko.html)
- [Flow of Flows v2 user PoC](./2026-06-17-flowof-flows-v2-user-poc-ko.html)
- [Flow of Flows v2 creator PoC](./2026-06-17-flowof-flows-v2-creator-poc-ko.html)
- [FlowMe platform operating model](./2026-06-18-flowme-platform-operating-model-ko.html)
- [100 source scan Top 5](./2026-06-18-flowof-flow-100-source-scan-top5-ko.html)
- [Top 5 persona simulation](./2026-06-18-flowof-flow-top5-persona-simulation-ko.html)
- [Top 5 click PoC](./2026-06-18-flowof-flow-top5-click-poc-ko.html)

### 6. 대표 플랫폼 PoC: 중등 1학년 수학 학습 지도

6/18에는 Flow of Flow의 대표 케이스로 `중등 1학년 수학 학습 지도`를 잡았다. 이유는 단원 구조가 있고, 각 단원을 같은 학습 패턴으로 반복할 수 있으며, 사용자 저장 화면과 제작자 운영판의 차이가 선명하게 보이기 때문이다.

이 PoC에서 확인하려는 구조:

- Program Map: 중등 1학년 수학 같은 큰 콘텐츠 구조
- Child Flow Template: 개념 보기, 연습, 오답, 복습 같은 반복 실행 패턴
- User Artifact: 학습표, 진도표, 오늘 실행 카드
- Execution Record: 완료 여부, 짧은 메모, 다음 단위, 진행률

대표 산출물:

- [FlowMe platform study map PoC](./2026-06-18-flowme-platform-study-map-poc-ko.html)
- [FlowMe platform operating model](./2026-06-18-flowme-platform-operating-model-ko.html)

## 검토자가 봐야 할 핵심 질문

1. 작은 Flow 기준선이 충분히 명확한가?
   - 단일 Flow, collection, Flow of Flow의 경계가 실제 제품 판단에 쓸 만큼 분명한지 봐야 한다.

2. Source-to-Flow gate가 너무 엄격하거나 느슨하지 않은가?
   - primary source, user job, natural artifact 기준이 좋은 후보를 살리고 약한 후보를 걸러내는지 확인이 필요하다.

3. Flow of Flow Top 5가 정말 반복 하위 Flow를 갖고 있는가?
   - 특히 freeCodeCamp는 LMS 복제 위험, Solid Starts는 건강/영양 경계 위험이 있다.

4. 중등 수학 학습 지도 PoC가 "지도 + 오늘 실행"을 잘 분리하는가?
   - 큰 지도 UI가 예쁘게 보이는 것보다, 사용자가 다음 단원/오늘 할 일을 바로 찾는지가 중요하다.

5. 제작자 운영판이 실제 creator product로 이어질 수 있는가?
   - 원문 구조 가져오기, 하위 반복 단위 관리, 사용자 미리보기, 공개/수정 상태가 최소 운영 단위로 충분한지 봐야 한다.

6. 현재 산출물에서 검증 주장처럼 보이는 표현이 남아 있는가?
   - 이 문서 묶음은 사용자 행동 증거가 아니라 내부 PoC/시뮬레이션이다. 검토 시 용어 경계를 같이 봐야 한다.

## 우선 검토 순서

1. [Source-to-Flow conversion gate](../flow-rules/source-to-flow-conversion-gate.md)
2. [10 Flow expansion report](./2026-06-16-ten-flow-expansion-report-ko.html)
3. [source-gated simulation report](./2026-06-17-source-gated-simulation-report-ko.html)
4. [context split simulation report](./2026-06-17-context-split-expansion-simulation-report-ko.html)
5. [FlowMe platform operating model](./2026-06-18-flowme-platform-operating-model-ko.html)
6. [100 source scan Top 5](./2026-06-18-flowof-flow-100-source-scan-top5-ko.html)
7. [Top 5 click PoC](./2026-06-18-flowof-flow-top5-click-poc-ko.html)
8. [FlowMe platform study map PoC](./2026-06-18-flowme-platform-study-map-poc-ko.html)

## 다음 작업 후보

- Top 5 중 `NHS Couch to 5K`를 별도 전용 클릭 PoC로 확장한다.
- `중등 1학년 수학 학습 지도`를 실제 source-to-artifact gate로 다시 통과시킨다.
- 저장한 Flow가 0개, 1개, 3개, 10개 이상일 때 내 앱 관리 화면이 어떻게 달라져야 하는지 작은 IA 테스트를 만든다.
- 제작자 운영판에서 `반복 단위 가져오기`가 실제 입력/편집/검토 흐름으로 충분한지 확인한다.
- 민감 영역 후보는 공식/전문가 경계, no-claim copy, 상담 조건을 별도 게이트로 분리한다.

## 현재 한계

- 사용자 관찰 세션은 아직 없다.
- 클릭 PoC는 real product code와 완전히 같은 구현이 아니다.
- HTML 산출물은 검토와 사고 실험에는 유용하지만, 실제 접근성/상태 관리/데이터 모델/저장 흐름을 보장하지 않는다.
- worktree가 매우 커서 PR 단위 정리가 필요하다. 지금 문서는 검토를 위한 방향/산출물 맵이지 merge-ready 체크리스트가 아니다.
