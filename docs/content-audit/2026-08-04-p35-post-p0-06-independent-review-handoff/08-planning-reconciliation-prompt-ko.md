# 기획 세션용 독립 검토 교차 종합 프롬프트

아래 내용을 기획 세션 `019fac25-34bc-7ea1-9533-376776fac3c0`에 전달한다. Codex와 Claude Design의 1차 결과가 모두 고정되기 전에는 실행하지 않는다.

---

## 역할

당신은 FlowMe P35 Round 2의 `검토 결과 교차 종합자`다. 사용자 피드백, Codex 로컬 검토, Claude Design 독립 검토를 다수결로 합치지 말고, 사실·설계 추론·선호·미확인 영역을 분리해 현재 프로그램의 다음 gate를 결정한다.

이번 작업은 기획·판정만 한다. 코드 수정, commit, push, PR, Vercel 배포를 하지 않는다. Text-to-Flow와 실제 사용자 관찰도 범위 밖이다.

## 입력 gate

다음을 모두 읽고 입력 manifest에 경로·commit·확인 시간을 기록한다.

1. 이 handoff의 `00`, `README.md`, `01`~`07`, `review-scenarios.json`, `evidence-manifest.json`
2. Codex 1차 blind 결과 경로·SHA-256·고정 시각과 2차 결과 전체·delta·evidence index
3. Claude Design 1차 blind 결과 파일명·hash/고정 시각과 2차 결과 전체·delta·wireframe 또는 screen spec·evidence index
4. 로컬 active program `docs/specs/2026-08-04-p35-round2-bounded-ux-correction/full-program.md`
5. P0-01~P0-06 closeout과 현재 Git branch/HEAD/status

1차 hash·고정 시각이 없으면 `blind_independence = UNPROVEN`으로 표시한다. Codex가 Claude 결과를 먼저 봤거나 Claude가 Codex 결과를 먼저 봤다면 `cross_reviewer_independence = COMPROMISED`로 표시한다. 입력이 누락되면 기억이나 추정으로 채우지 말고 `MISSING_INPUT`으로 남긴다.

## 고정 경계

- State namespace `P35_PRODUCTION_BASELINE / ROUND2_LOCAL_P0_06 / HISTORICAL_BEFORE / PROPOSAL / NO_CURRENT_ARTIFACT`를 합치지 않는다. Implementation status `O / △ / X / NOT_IMPLEMENTED / TBD / N/A`는 별도 축이다.
- P0-06은 로컬 공통 editor까지의 후보이며 아직 Production After가 아니다.
- P0-07 capability preview, P0-08 `/my` IA, P0-09 실제 옮기기/receipt, P1-01 감산, P1-02 용어·도움·주의, P1-03 format parity는 아직 구현되지 않았다.
- 실제 관찰 사용자 수는 `0명`; 내부 검토나 자동화를 사용자 검증으로 세지 않는다.
- Owner 승인 Q1-B/Q2-B/Q3-B는 구체적 hard fail이 있을 때만 재개방한다.

## 종합 절차

### 1. 사실과 제안을 분리한다

각 주장에 공통 Evidence kind 중 하나를 붙인다.

- `RUNTIME_OBSERVED`
- `CODE_CONFIRMED`
- `PAYLOAD_CONFIRMED`
- `STATIC_CAPTURE`
- `SYNTHETIC_STRESS`
- `DESIGN_INFERENCE`
- `UNVERIFIED`

Owner 승인 방향은 evidence kind가 아니라 `policy_source = OWNER_DIRECTION`으로 별도 표시한다.

서로 충돌하면 실제 runtime·storage 증거가 정적 화면보다 우선하고, 화면의 이해 가능성·위계는 디자인 분석을 우선하되 사용자 이해는 `NOT_ASSESSED`로 남긴다.

### 2. D0~D6을 먼저 닫는다

버튼 문구별 처방보다 먼저 다음을 판정한다.

1. D0 공통 data→UI 구조
2. D1 저장 계획 library와 Today 관계
3. D2 공개→저장→실행→옮기기 lifecycle·행동 소유권
4. D3 capability 기반 여러 결과
5. D4 공통 editor family와 다른 commit 효과
6. D5 감산·도움·주의·접근성
7. D6 사용자 용어·CTA

각 영역에 `합의`, `충돌`, `누락`, `권장안`, `기각안과 이유`, `acceptance`, `근거 ID`를 적는다.

### 3. 사용자 피드백 U01~U10을 추적한다

각 항목을 다음 열로 정리한다.

| U ID | 사용자 문제/의도 | Production | Local P0-06 | Codex 판단 | Claude 판단 | 종합 판단 | 프로그램 반영 위치 | After | 남은 검증 |
|---|---|---|---|---|---|---|---|---|---|

`After`가 없으면 state를 `NO_CURRENT_ARTIFACT`, 구현 상태를 `NOT_IMPLEMENTED` 또는 `TBD`라고 각각 쓴다. “반영됨”은 코드·화면·acceptance가 있을 때만 쓴다. 설계 문서에만 있으면 `PROPOSAL + DESIGN_ONLY`다.

### 4. 프로그램 변경량을 제한한다

현재 P0-01~P0-06에서 이미 해결된 계약을 다시 설계하지 않는다. 새 제안은 아래 중 하나에만 배치한다.

- P0-07: capability matrix와 여러 결과 preview 계약
- P0-08: 일반 `/my` library shell과 post-save selected detail
- P0-09: public quick guard, saved transfer, receipt·retry
- P0-10: 통합 회귀와 rollback
- P1-01: Item/Map/시작일 시각 감산
- P1-02: `계획` 용어, CTA, 도움·주의 disclosure
- P1-03: 실제 형식별 필드 round-trip parity
- P1-04: 최종 내부 QA와 publish gate

기존 단계에 영향을 주면 “왜 새 acceptance만으로 충분하지 않은지”를 설명한다. 구현 범위를 키우는 새 기능은 별도 backlog로 보낸다.

### 5. 최종 program verdict를 고른다

- `KEEP_PROGRAM`: 기존 순서와 범위 유지
- `BOUNDED_PROGRAM_DELTA`: 근본 방향은 유지하고 acceptance·순서·일부 산출물만 수정
- `REOPEN_DECISION`: D0~D6의 구체적 data/state/safety/rollback hard fail 때문에 구현 전 Owner 결정을 다시 받아야 함

`REOPEN_DECISION`은 정확한 충돌, 손상 가능한 데이터·상태, 재현 절차, 최소 두 대안, 추천안을 함께 제시해야 한다.

검토자가 `DESIGN_RISK_NEEDS_OWNER_DECISION`을 제출했지만 hard fail은 아니면 `BOUNDED_PROGRAM_DELTA` 안에서 Owner 질문 후보로 평가한다. 두 결과가 같은 답을 냈다는 이유만으로 채택하지 말고, 1차 독립 발견 여부와 증거를 확인한다.

## 필수 산출물

1. `01-input-and-independence-manifest-ko.md`
2. `02-root-decision-reconciliation-ko.md`
3. `03-u01-u10-implementation-matrix-ko.md`
4. `04-program-delta-ko.md`
5. `05-next-gate-and-owner-decisions-ko.md`

`04-program-delta-ko.md`에는 기존 단계별로 `KEEP / AMEND / MOVE / DROP / NEW_BACKLOG`을 표시하고, 변경 전·후 acceptance를 나란히 쓴다.

`05`의 Owner 질문은 최대 3개로 제한한다. 근거로 자동 결정할 수 있는 것은 질문하지 않는다.

## 종료 조건

- 사용자 피드백·Codex·Claude 중 어느 하나도 빠지지 않음
- 근본 결정과 표면 카피 수정이 분리됨
- 현재 구현, 설계 coverage, 사용자 이해가 각각 분리됨
- 고정 5형식, icon-only 안전, 편집 종료 의미의 `완료`가 자동 채택되지 않음
- 다음 구현이 시작할 정확한 단계와 acceptance가 한 가지로 정해짐
- commit·push·deploy가 수행되지 않음
- `observed_user_count = 0`, `user_understanding = NOT_ASSESSED`

---
