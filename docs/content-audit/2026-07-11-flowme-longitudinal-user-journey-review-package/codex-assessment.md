# Codex 독립 제품·UX 평가

## 평가 성격

이 평가는 Claude Design에 넘길 동일한 screenshot과 route-evidence를 Codex가 먼저 독립적으로 검토한 결과다. 실제 사용자 조사, 시장 검증, 장기 관찰 결과가 아니다. 화면에서 확인할 수 없는 행동은 구현됐다고 가정하지 않았다.

## 출시 판단

- **판정:** 조건부 사용 가능 (Conditional)
- **근거:** 한 기기·한 브라우저에서 개인 Flow를 찾고 저장·수정·실행·완료하는 private beta는 가능하다. 계정·기기 연속성, 완료 후 피드백, 원본 수정 요청, 외부 도구 왕복이 닫히지 않아 반복 상용 서비스로는 아직 준비되지 않았다.
- **추천 방향:** 새 표면을 늘리기보다 실행 후 학습 loop를 닫는다
- **설명:** P22는 완료 이후의 짧은 회고와 원본 오류 알리기, 반복 사용의 신뢰를 먼저 다룬다. 공개 리뷰 커뮤니티, Studio 발행, live AI는 이 데이터 경계가 확인될 때까지 보류한다.

## 여정 점수

| 영역 | 점수 | 근거 | screenshot |
| --- | ---: | --- | --- |
| 홈 발견과 URL/메모 진입 | 4/5 | 핵심 진입이 첫 viewport에서 보이고 추천보다 앞선다. | 01-home-mobile |
| URL hit와 기준일 설정 | 4/5 | 준비된 Flow 재사용과 이사일 맥락은 명확하다. | 27-url-first-hit-mobile, 28b-url-first-moving-custom-start-mobile |
| URL miss와 초안 전환 | 2.5/5 | 작동 범위는 넓지만 miss·후보·요청·초안·저장 상태가 한 화면에 겹쳐 첫 결정이 무겁다. | 29-url-first-miss-candidate-form-mobile, 30-url-first-candidate-detail-mobile, 45-draft-save-failure-mobile |
| public 공유 저장 경계 | 3.5/5 | sticky 저장 우선과 저장 전 preview 경계는 명확하지만 외부 export의 실제 사용 장면은 없다. | 06-public-vehicle-mobile, 08-public-moving-bottom-mobile, 12b-public-new-car-post-save-my-flow-mobile |
| My Flow 실행과 개인화 | 3/5 | 오늘 행동과 완료는 분명하지만 상세 편집 화면은 중첩 패널과 메타가 많아 실행 모드와 수정 모드가 다시 섞인다. | 13-post-save-my-moving-mobile, 39a-url-first-draft-item-edit-entry-mobile, 39b-url-first-draft-anchor-edit-mobile |
| Calendar 다중 Flow 실행 | 3/5 | Flow 구분과 compact grid는 작동하지만 모바일 선택일 상세와 wide agenda의 정보 밀도가 높다. | 43-calendar-same-date-multi-flow-mobile, 44b-calendar-grid-flow-stack-wide |
| 완료와 재방문 복구 | 3/5 | 완료 0, 취소, 중복 방지, 저장 실패, 열린 화면 오프라인 행동은 확인됐다. 계정·기기 연속성은 없다. | 45-draft-save-failure-mobile, 46-draft-duplicate-mobile, 48-draft-completed-zero-mobile, 49-draft-offline-local-action-mobile |
| 리뷰와 원본 수정 요청 | 1/5 | 완료 경험을 평가하거나 개인 수정과 원본 개선 요청을 나누는 사용자 표면이 없다. | 미구현 전환 |
| 외부 export 왕복 | 2/5 | 파일 생성 projection은 확인됐지만 실제 Calendar·시트·메모 import와 재진입은 evidence 밖이다. | 08-public-moving-bottom-mobile, 39d-url-first-draft-calendar-export-mobile |
| Studio와 creator 보조 표면 | 2.5/5 | 초안 선반과 공개 profile은 구분되지만 발행·버전·리뷰 loop는 의도적으로 비어 있다. | 39e-url-first-draft-studio-shelf-mobile, 41-creator-profile-flow-curation-team-mobile |

## 주요 Findings

1. **[Blocking] 한 기기 localStorage를 상용 연속성으로 오해하면 안 된다** — 완료·수정·초안이 모두 브라우저 로컬 상태에 기대므로 기기 변경, 데이터 손실, 복구 약속이 없다. private beta 범위와 상용 출시 조건을 분리해야 한다. (evidence: 48-draft-completed-zero-mobile, 49-draft-offline-local-action-mobile)
2. **[High] 완료 뒤 제품이 학습하지 않는다** — 사용자는 완료 후 유용성, 빠진 항목, 틀린 날짜를 남길 수 없다. 이 때문에 Flow 품질 개선과 반복 사용의 이유가 생기지 않는다. (evidence: 48-draft-completed-zero-mobile)
3. **[High] 개인 수정과 원본 수정 요청의 소유권 경계가 없다** — 제목·날짜·메모 overlay는 강하지만 내 사본만 고치는 행동과 다른 사용자에게도 필요한 원본 정정을 구분할 수 없다. (evidence: 13c-my-moving-personal-step-date-override-mobile, 39a-url-first-draft-item-edit-entry-mobile)
4. **[High] URL miss 화면은 기능보다 상태 설명이 먼저 보인다** — 아직 없음, 저장 대기, 초안 요청 가능, 실행 불가 상태가 중첩되어 사용자의 첫 선택이 흐려진다. (evidence: 29-url-first-miss-candidate-form-mobile, 30-url-first-candidate-detail-mobile)
5. **[High] 실행과 편집 상세의 정보 밀도가 높다** — My Flow와 Calendar에서 실행 행은 간결하지만 상세를 열면 날짜·기준·상태·메모·원문 도구가 여러 패널로 겹쳐 상용 서비스의 안정된 편집 경험으로 보기 어렵다. (evidence: 39a-url-first-draft-item-edit-entry-mobile, 43-calendar-same-date-multi-flow-mobile)
6. **[Medium] export의 진짜 가치가 앱 밖에서 검증되지 않았다** — 생성 파일의 존재만으로 사용자가 자기 Calendar·시트·메모에서 실제로 실행할 수 있다고 결론낼 수 없다. (evidence: 08-public-moving-bottom-mobile, 39d-url-first-draft-calendar-export-mobile)
7. **[Medium] 완료 뒤 재사용과 새 버전 반영의 기준이 없다** — 중복 저장 방지는 되지만 지난 실행을 복제할지, 날짜만 다시 잡을지, 원본 업데이트를 받을지 선택하는 반복 사용 모델이 없다. (evidence: 46-draft-duplicate-mobile, 48-draft-completed-zero-mobile)

## P22 권장 Backlog

### P22-00 · Blocking · 실제 종단 사용 관찰과 저장 연속성 출시 gate

- **대상:** 모든 페르소나
- **문제:** 시뮬레이션은 동작 연결만 증명하며 습관 형성과 기기 간 신뢰를 증명하지 못한다.
- **최소 범위:** 3~7일 동안 신규·반복·Calendar-heavy 사용자 관찰을 진행하고, local-only private beta와 account-backed 상용 출시 조건을 문서로 분리한다.
- **확장 금지:** 새 기능을 먼저 만들거나 가상 페르소나 결과를 실제 사용자 데이터로 표현하지 않는다.
- **Acceptance criteria:**
  - 최소 5명, 3회차 이상 관찰 기록
  - 발견→완료 drop-off와 재방문 이유 기록
  - 데이터 손실·기기 변경 기대를 명시
  - 출시 등급과 persistence gate 승인
- **Evidence:** 현재 package 전체

### P22-01 · High · 완료 후 최소 회고·오류 알리기 모델

- **대상:** 이사 준비 사용자, miss draft 사용자, 학습 반복 사용자
- **문제:** 완료 뒤 유용성·정확성·빠진 항목을 남길 표면이 없다.
- **최소 범위:** 완료 상태에서 비공개 2갈래 행동만 설계한다: 내 실행 회고 남기기, 원본 내용 알리기. spec과 fixture로 먼저 검증한다.
- **확장 금지:** 별점 공개, 댓글, 인기 순위, 커뮤니티 피드, creator inbox 전체를 만들지 않는다.
- **Acceptance criteria:**
  - Flow 전체와 항목 단위 맥락 구분
  - 개인 메모와 원본 정정 요청 저장 경계 명시
  - 완료 행동을 방해하지 않는 진입점
  - 실제 공개 리뷰로 오해되는 문구 0
- **Evidence:** 48-draft-completed-zero-mobile

### P22-02 · High · 개인 overlay와 원본 정정 요청 경계 구현

- **대상:** 공유 Flow 사용자, creator/curator
- **문제:** 현재 수정은 내 사본에만 반영되고 원본 문제 제보가 없다.
- **최소 범위:** 항목 detail에서 내 Flow만 수정과 원본 내용 알리기를 분리하고, 요청에는 Flow·항목·원 URL·사용자 설명만 보존한다.
- **확장 금지:** 자동 원본 수정, 공개 투표, source-backed 원본 덮어쓰기를 하지 않는다.
- **Acceptance criteria:**
  - 두 행동의 결과 카피가 다름
  - 원본 요청이 personal overlay를 변경하지 않음
  - 내 수정이 public Flow를 변경하지 않음
  - 내부 제작어 0
- **Evidence:** 13c-my-moving-personal-step-date-override-mobile, 25-workbench-new-car-open-details-mobile

### P22-03 · High · URL miss 첫 결정과 초안 상태 압축

- **대상:** 준비된 Flow가 없는 사용자
- **문제:** 한 화면에 miss·candidate·request·draft 상태 설명이 겹친다.
- **최소 범위:** 첫 viewport는 준비된 Flow 없음과 초안 살펴보기 한 행동에 집중하고, 요청 관리·원 URL·재조회는 접힌 보조 영역으로 내린다.
- **확장 금지:** live AI 생성처럼 표현하거나 candidate 운영 상태를 다시 노출하지 않는다.
- **Acceptance criteria:**
  - 첫 viewport primary action 1개
  - 실행 불가·저장 대기 상태 문구 중복 0
  - 요청 정보는 손실 없이 보조 영역에서 접근
  - 저장 실패·중복 복구 유지
- **Evidence:** 29-url-first-miss-candidate-form-mobile, 30-url-first-candidate-detail-mobile, 45-draft-save-failure-mobile

### P22-04 · High · My Flow·Calendar 실행 모드와 편집 상세 밀도 분리

- **대상:** 이사 준비 사용자, 다중 Flow 사용자
- **문제:** 행은 간결하지만 상세 안에 실행·편집·근거 패널이 동시에 열린다.
- **최소 범위:** 기본 상세는 할 일·완료·짧은 메모 중심으로 두고, 제목·날짜·원문 도구 편집은 명시적 편집 상태에서만 연다.
- **확장 금지:** 별도 5번째 탭이나 full-screen Studio editor를 만들지 않는다.
- **Acceptance criteria:**
  - 기본 상세의 1차 행동 2개 이하
  - 편집 상태 진입·취소·저장 명확
  - Calendar group/완료 checkbox 기준 유지
  - 390/1024 overflow 0
- **Evidence:** 39a-url-first-draft-item-edit-entry-mobile, 39b-url-first-draft-anchor-edit-mobile, 43-calendar-same-date-multi-flow-mobile

### P22-05 · Medium · 외부 Calendar·시트·메모 왕복 검증

- **대상:** 공유 Flow 사용자, 다중 Flow 사용자
- **문제:** export payload는 검증됐지만 실제 외부 도구 사용 결과가 없다.
- **최소 범위:** 대표 Flow 3개를 실제 Calendar·시트·메모에 import하고 제목·날짜·메모·중복·재생성 결과를 기록한다.
- **확장 금지:** 검증 전 provider 연동이나 양방향 sync를 구현하지 않는다.
- **Acceptance criteria:**
  - 대표 형식별 import 성공
  - 날짜·제목·메모 fidelity 기록
  - 중복 import 정책 확인
  - 실패 시 사용자 복구 문구 제안
- **Evidence:** 08-public-moving-bottom-mobile, 39d-url-first-draft-calendar-export-mobile

### P22-06 · Medium · 완료 Flow 재사용·버전 갱신 정책 spec

- **대상:** 학습 반복 사용자, creator/curator
- **문제:** 완료 후 새 주기 시작과 원본 업데이트 수용 기준이 없다.
- **최소 범위:** 그대로 다시 쓰기, 날짜만 새로 잡기, 새 버전 검토의 세 경우를 source/personal overlay 충돌 규칙과 함께 문서화한다.
- **확장 금지:** 자동 병합이나 복잡한 버전 트리를 구현하지 않는다.
- **Acceptance criteria:**
  - 완료 기록 보존
  - 새 실행과 과거 실행 분리
  - personal overlay 충돌 시 명시적 선택
  - Studio를 핵심 탭으로 승격하지 않음
- **Evidence:** 46-draft-duplicate-mobile, 48-draft-completed-zero-mobile, 39e-url-first-draft-studio-shelf-mobile

### P22-07 · Low · Studio 발행·공개 리뷰 확장 보류

- **대상:** creator/curator
- **문제:** 초안 선반은 유용하지만 발행과 공개 리뷰를 받을 근거가 없다.
- **최소 범위:** P22-00~P22-02 결과가 쌓일 때까지 Studio는 초안 보조 선반으로 유지하고 승격 조건만 기록한다.
- **확장 금지:** publish, follower, 공개 별점, 댓글을 만들지 않는다.
- **Acceptance criteria:**
  - 4탭 IA 유지
  - Studio secondary tier 유지
  - 승격 조건을 실제 사용·정정 요청 데이터로 정의
- **Evidence:** 39e-url-first-draft-studio-shelf-mobile, 41-creator-profile-flow-curation-team-mobile

## 보류할 확장

- live AI 자동 생성: miss draft의 수동 편집·품질 피드백 데이터가 생길 때까지 보류
- 공개 리뷰·별점·댓글: 실제 실행과 정정 요청의 최소 loop가 검증될 때까지 보류
- Studio 발행과 creator 운영 도구: 개인 실행 허브와 correction ownership이 먼저
- 양방향 Calendar sync: 파일 import 왕복 검증이 먼저

## Claude Design에 바라는 비교 검토

- 이 평가에 동의하는 항목과 반대하는 항목을 근거 screenshot과 함께 분리한다.
- 점수와 우선순위를 그대로 반복하지 말고, 가장 먼저 닫아야 할 종단 전환을 독립적으로 선택한다.
- UI polish로 해결되는 문제와 product policy/data capability가 필요한 문제를 분리한다.
- 실제 사용자 검증 전 구현하면 안 되는 항목을 명시한다.
