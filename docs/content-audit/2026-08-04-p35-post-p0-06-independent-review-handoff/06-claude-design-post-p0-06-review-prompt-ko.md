# Claude Design 2차 P0-06 이후 계약 반증 UX/IA 검토 프롬프트

먼저 [06a 1차 블라인드 프롬프트](./06a-claude-design-blind-root-discovery-prompt-ko.md)의 결과를 고정한 뒤, 같은 Claude 대화를 계속 쓰거나 새 대화에는 자신의 1차 결과만 첨부해 이 파일의 GitHub commit 링크를 전달한다. 패키지 작성·기획·Codex 검토 대화를 재사용하지 않는다. Claude는 로컬 파일에 접근할 수 없으므로 GitHub 입력의 완전성을 먼저 분류한다.

---

## 역할

당신은 FlowMe P35 Round 2의 `독립 UX·IA·visual hierarchy·copy 검토자`다. 사용자 피드백을 그대로 화면으로 옮기거나 예쁜 mockup을 만드는 역할이 아니다. P35 Production, P0-06 local candidate, 아직 구현되지 않은 Proposal을 구분하고, 다음 다섯 근본 영역과 두 횡단 규칙이 하나의 예측 가능한 제품 관계를 만드는지 반증한다.

1. D0: 콘텐츠별 전용 UI처럼 보이지 않고 같은 계획·같은 행동 문법으로 읽히는가
2. D1: `내 Flow`에서 저장 계획 library·Today·선택 계획의 위계
3. D2: 공개 미리보기·편집·저장·실행·옮기기·완료의 상태와 행동 소유권
4. D3: 하나의 계획을 capability에 맞게 여러 결과로 보여주는 방법
5. D4: 공개/저장 Plan·Item의 공통 editor family와 서로 다른 commit 의미
6. D5: 감산·도움·주의가 중요한 안전·비가역 정보와 접근성을 보존하는가
7. D6: `Flow/계획`, 수정·저장·완료·옮기기 문구가 상태와 결과를 정확히 말하는가

이번 검토는 내부 디자인 시뮬레이션이다. 실제 사용자 관찰이 아니며 `observed_user = 0`, `user_understanding = NOT_ASSESSED`다.

## 1차 결과 고정 gate

1차 결과 파일명·고정 시각·가능하면 SHA-256을 먼저 기록한다. 결과가 고정되기 전에 이 파일·README·01·02·04·07·승인 방향을 읽었다면 `blind_independence = COMPROMISED`로 표시한다. Codex 결과를 먼저 읽었다면 `cross_reviewer_independence = COMPROMISED`, `review_type = CROSS_INFORMED`로 표시한다.

## 2차 입력 완전성 gate

먼저 이 GitHub 파일과 다음 상대 링크를 실제로 연다.

Critical:

1. [Owner 피드백 원문과 해석 경계](./00-owner-feedback-verbatim-and-ambiguities-ko.md)
2. [README](./README.md)
3. [01 현재 상태와 검토 경계](./01-current-state-and-review-boundary-ko.md)
4. [02 근본 문제·가설 지도](./02-root-problem-and-hypothesis-map-ko.md)
5. [03 증거 manifest](./03-evidence-manifest-ko.md)
6. [07 공통 scorecard](./07-independent-scorecard-and-evidence-rules-ko.md)
7. [증거 JSON](./evidence-manifest.json)과 [시나리오 JSON](./review-scenarios.json)
8. [응답 템플릿](./10-review-response-template-ko.md)
9. Historical Before의 U01~U10 연결 화면과 local P0-06 모바일 4장

Auxiliary:

- [04 비교 앱 study](./04-cross-app-study-brief-ko.md)
- local P0-06 1024·1440 이미지와 synthetic 50 Item stress
- live Production route

Critical 입력이 열리지 않으면 접근 실패 목록을 적고 `BLOCKED_BY_MISSING_CRITICAL_INPUT`으로 멈춘다. Auxiliary 일부가 열리지 않으면 `PARTIAL_INPUT`으로 표시하고 가능한 범위에서 계속한다. 과거 기억이나 임의 mockup으로 대체하지 않는다. Production live 접근이 없으면 Production 칸은 `TBD + UNVERIFIED`다.

입력 manifest에 읽은 URL, 열지 못한 URL, GitHub commit, 확인 시간을 적는다.

## 독립성

2차에서도 Codex 결과·점수·권장안을 보지 않는다. 1차 blind 결과와 2차 계약 입력 사이에서 결론이 바뀌면 무엇이 왜 바뀌었는지 별도 delta로 남긴다.

## 상태 표기

- `P35_PRODUCTION_BASELINE`: 현재 배포 기준
- `ROUND2_LOCAL_P0_06`: 미게시 local candidate
- `HISTORICAL_BEFORE`: 2026-08-03 또는 이전 캡처
- `PROPOSAL`: 새 설계 제안
- `NO_CURRENT_ARTIFACT`: 현재 After가 없음

P0-06 local candidate나 Proposal을 `After` 또는 Production이라고 부르지 않는다. P0-07 이후에는 현재 After가 없다.

각 주장은 상태와 별도로 `RUNTIME_OBSERVED / CODE_CONFIRMED / PAYLOAD_CONFIRMED / STATIC_CAPTURE / SYNTHETIC_STRESS / DESIGN_INFERENCE / UNVERIFIED` 중 하나를 붙인다. Claude가 코드·payload를 직접 확인하지 못하면 그 값을 추정하지 않는다.

## 승인된 방향과 비판 규칙

Owner는 Q1-B/Q2-B/Q3-B를 승인했다.

- Q1-B: 엄격한 조건의 local-only quick만 저장 없이 가능, 권위 있는 옮기기는 saved plan 소유
- Q2-B: 일반 `/my`는 saved-plan library shell, Today는 compact 파생 요약
- Q3-B: 핵심 사용자 화면에 `계획`을 단계 적용, FLOW 브랜드·내부 identity 유지

각 방향을 비판할 수 있지만, 다른 안을 조용히 최종안으로 바꾸지 않는다. `confirm / bounded_amendment / stop_and_reopen` 중 하나를 선택하고, 재개방에는 데이터·상태·안전·rollback hard fail 근거를 적는다.

Q1-B/Q2-B/Q3-B 각각에 대한 strongest counterargument를 하나씩 적는다. 기술 hard fail은 아니지만 IA·용어 판단이 갈려 Owner 선택 없이는 명세를 고정할 수 없으면 verdict와 별도로 `DESIGN_RISK_NEEDS_OWNER_DECISION`을 붙인다.

## 1. 5초 상태·행동 지도

다음 상태마다 사용자가 5초 안에 알아야 할 것을 적는다.

- 공개 계획 상세
- 형식 미리보기
- 공개 Plan 편집
- 공개 Item 편집
- 저장 직후 선택된 내 계획 상세
- 일반 `내 계획` 첫 화면
- 저장 Plan 편집
- 저장 Item 상세·편집
- 실제 내 도구로 옮기기 확인
- 결과·부분 성공·실패·재시도

| 화면/상태 | 사용자가 있는 곳 | 보는 데이터 버전 | 얻는 결과 | primary 1개 | secondary 최대 1개 | 다음 상태 | Back/취소 | 삭제할 정보 | 항상 남길 정보 |
|---|---|---|---|---|---|---|---|---|---|

primary 1개·secondary 최대 1개는 검증할 기본 가설이다. 더 명확한 구조가 있으면 대안을 제시할 수 있지만, 같은 효과의 primary가 두 개면 이유를 입증하지 않는 한 hard fail이다.

## 2. D0 데이터→UI의 시각적 일관성

코드 구조를 추측하지 말고 화면에서 다음을 검토한다.

- 날짜형·날짜 없음·routine·memo·Flow Map이 같은 plan/item/action grammar를 공유하는가
- 콘텐츠마다 결과 카드·CTA·편집 진입 위치가 임의로 달라 보이는가
- 같은 field와 상태가 같은 label·surface·hierarchy로 표현되는가
- capability 차이인지 legacy/예외인지 화면만으로 구분할 수 있는가
- 새 콘텐츠가 와도 기존 pattern으로 설명 가능한가

데이터나 renderer 사실은 `LOCAL_CONFIRMATION_REQUIRED`로 남긴다. 화면이 같아 보인다는 이유로 canonical data가 같다고 쓰지 않는다.

## 3. `내 계획` IA 세 안 비교

다음 안을 0·1·5·20개 계획, 저장 직후, 일반 재방문, Today 없음, 날짜 없음, 완료·보관 상태로 비교한다.

- A: Today 우선 + 저장 library 보조
- B: 저장 library 우선 + Today compact 파생
- C: 고정 shell 안에서 저장 직후 selected detail을 우선 표시

Q2-B는 B를 승인했으므로 B를 기준안으로 삼고, C의 post-save selected detail을 B shell 안에서 결합할 수 있는지 본다. 완전히 문맥에 따라 다른 첫 화면은 예측성 위험을 평가한다.

각 안에 대해 모바일 wireflow, 첫 행동, 저장 계획 회수, 20개 확장, 날짜 없음, 완료·보관, 접근성을 적고 하나를 권장한다. 다른 앱의 무거운 프로젝트 계층·dashboard·고급 filter를 복사하지 않는다.

## 4. lifecycle·옮기기 소유권

다음 세 안을 비교한다.

- A: 공개는 preview만, 저장된 내 계획이 실제 결과 생성 소유
- B: 공개 quick과 saved transfer 병존
- C: 미수정·eligible·local-only일 때만 공개 session quick

Q1-B는 C다. 다음 기준으로 반증한다.

- 어느 version·Item scope를 옮기는지 예측 가능한가
- 단순 결과에도 저장을 불필요하게 강제하는가
- 개인 수정 뒤 재생성·중복·실패·retry가 한 곳에서 이어지는가
- preview와 실제 결과 생성이 구분되는가
- `FlowMe에 저장되지 않음`, 단방향, 자동 sync 아님을 알리는가
- saved persistent receipt와 public session-only 확인을 혼동하지 않는가

`완료`는 저장·편집 종료·결과 생성에 쓰지 않는다.

## 5. capability 결과 설계

모든 계획에 5개 tab을 강제하지 않는다. `primary 1개·available 최대 2개`는 검증할 기본 가설이지 고정 답이 아니다. 더 명확한 대안이 있으면 반증 근거와 함께 제시한다. 대표 콘텐츠별로 다음 표를 만든다.

| 대표 콘텐츠 | primary 후보 | available 후보 | conditional + 필요한 입력/CTA | unavailable + 이유 | 손실·유지 field | local 확인 필요 |
|---|---|---|---|---|---|---|

대표 콘텐츠:

- 날짜 중심 이사 계획
- 날짜 없는 체크리스트
- mixed-date 계획
- 반복 routine
- memo-first 참고 자료
- Flow Map

화면에는 형식명만 보여주지 말고 실제 title·날짜·순서·memo·완료 기준의 작은 결과 preview를 제안한다. conditional은 날짜 지정 뒤 예상 count를 보여준다. unavailable은 정상 tab처럼 클릭시키지 않는다.

Todo와 체크리스트의 사용자 가치 차이가 설명되지 않으면 통합안을 제시한다. 내부 Today/Todo와 외부 portable 결과도 구분한다.

## 6. P0-06 editor delta review

Historical Before의 public sheet·saved inline editor와 local P0-06 네 context를 비교한다.

- 하나의 family로 보이는 요소
- context를 구분해야 하는 요소
- 반복 heading·card·blank space·mobile drag handle 등 감산 대상
- 정보 순서: 이름/제목 → 기준일·날짜 → 포함·순서 → 상세·memo → 완료 기준 → 출처·안전
- primary action의 위치와 label
- dirty close, error, retry, nested Item return 상태의 화면 사양
- mobile full-height와 desktop inspector가 같은 의미를 유지하는지

같은 UI를 만들기 위해 공개 `변경 반영`과 saved `저장`을 하나의 label로 합치지 않는다.

## 7. 감산·도움·주의·용어

현재 요소를 네 등급으로 분류한다.

- 삭제
- `? 도움말`로 이동
- 한 줄 유지 + 상세 확장
- 반드시 항상 표시

다음은 icon-only 안에 숨기지 않는다.

- 건강·안전 중단 조건
- 개인정보 영향
- 중복 결과 생성
- 되돌릴 수 없는 영향
- 외부 결과가 자동 동기화가 아니라는 사실
- 지원되지 않거나 빠지는 Item/field 수

popover·inline disclosure·bottom sheet·modal의 사용 조건을 구분한다. icon에는 접근 가능한 이름, 약 44px 터치 영역, keyboard open/close, ESC/Back, focus return을 명세한다.

다음 용어와 CTA를 실제 문장으로 비교한다.

- Flow 찾기 / 계획 찾기
- 내 Flow / 내 계획
- Flow 편집 / 계획 수정
- 시작 / 내 계획에 저장 / 저장하고 시작
- 더보기 / 결과 보기 / 다른 형식 보기
- 가져가기 / 내보내기 / 내 도구로 옮기기
- 할 일 수정 / 수정 / 항목 수정
- 완료 / 변경 반영 / 저장 / 생성

FLOW 브랜드는 유지할 수 있다. 사용자 행동에는 결과어를 우선하는 Q3-B를 기준으로 한다.

## 8. S01~S13 시뮬레이션과 U01~U10 판정

`review-scenarios.json`의 S01~S13을 모두 검토한다. 실제 runtime이 필요한 항목은 성공·실패를 추정하지 말고 `LOCAL_CONFIRMATION_REQUIRED`로 표시하되, 화면에서 보여야 할 상태·primary/secondary 행동·Back·빈 상태·오류 상태·필수 증거를 명세한다.

그 뒤 U01~U10을 판정한다.

| U ID | 사용자 의도 | Historical Before | Local P0-06 | Proposal coverage | 채택 수준 | 그대로 적용할 위험 | 수정안 | local 확인 필요 |
|---|---|---|---|---|---|---|---|---|

채택 수준은 `채택 / 의도 채택·해결법 수정 / 일부 채택 / 기각 / 검증 필요`를 사용한다. 최소 세 개는 사용자 해결안을 그대로 채택하지 않는 이유와 의도를 살린 대안을 함께 제시한다.

## 9. 필수 Proposal 화면

390×844 기준으로 연속 화면을 만든다.

1. `Claude/P1` 공개 계획 상세 + capability preview 진입
2. `Claude/P2` primary/available/conditional/unavailable 결과
3. `Claude/P3` Public Plan editor
4. `Claude/P4` Public/Saved Item editor + 오류·dirty close
5. `Claude/P5` 저장 직후 selected 내 계획 + 1회 배너
6. `Claude/P6` 일반 내 계획 0·1·5·20 상태
7. `Claude/P7` Item 상세→메모 작성·수정→완료→되돌리기→reload 상태와 surface·중복 heading·수정 문구 감산
8. `Claude/P8` saved transfer 확인: 범위·형식·개수·version·손실
9. `Claude/P9` partial success·failure·retry·receipt
10. `Claude/P10` 도움·주의 disclosure와 focus return

1440px:

11. `Claude/D1` 내 계획 library + selected detail
12. `Claude/D2` selected plan + Item inspector + transfer entry

화면마다 다음 metadata를 붙인다.

```text
proposal ID:
related feedback: [Uxx, ...]
root decision: [D0, ...]
source evidence:
design inference:
local confirmation required:
primary action:
secondary action:
removed elements:
empty/error/back behavior:
accessibility/safety notes:
rejected alternative:
```

현재 캡처와 1:1 대응하지 않는 화면은 `Before 없음`으로 표시한다. 모든 새 화면은 `Proposal`이다.

## 10. 결과물

하나의 zip 또는 열람 가능한 폴더로 제출한다.

1. `README.md` — input manifest, independence, 한 줄 verdict, observed 0
2. `01-blind-result-delta-ko.md` — 1차 발견 중 유지·수정·기각된 것
3. `02-data-to-ui-and-root-findings-ko.md`
4. `03-lifecycle-and-action-ownership-ko.md`
5. `04-my-plan-ia-options-ko.md`
6. `05-capability-projection-system-ko.md`
7. `06-editor-family-review-ko.md`
8. `07-copy-disclosure-accessibility-ko.md`
9. `08-u01-u10-traceability-ko.md`
10. `09-scorecard-ko.md`
11. `10-screen-spec-ko.md`
12. `wireframes/` — Claude/P1~P10, Claude/D1~D2

각 결론에는 공통 state namespace, evidence kind, 구현 상태, Proposal coverage를 각각 붙인다.

## 종료 조건

- Critical GitHub 입력이 모두 열리고 Auxiliary 누락 목록이 있음
- Codex 결과를 보기 전에 독립 결론을 고정함
- D0~D6, S01~S13, U01~U10을 모두 평가함
- P35_PRODUCTION_BASELINE·ROUND2_LOCAL_P0_06·HISTORICAL_BEFORE·PROPOSAL·NO_CURRENT_ARTIFACT가 분리됨
- 고정 5형식, icon-only 안전, `완료` 의미 충돌을 피함
- 최소 세 사용자 해결안을 반증함
- 1차 blind 결과의 고정 시각/hash와 2차 변경 이유가 있음
- 제공된 가설 지도 밖의 새 발견 후보 최소 3개와 Q1-B/Q2-B/Q3-B strongest counterargument가 있음
- 0·1·5·20, 날짜 없음, failure·retry, mobile/wide 상태를 포함함
- Proposal을 After라고 부르지 않음
- observed_user 0, user_understanding NOT_ASSESSED 유지

---
