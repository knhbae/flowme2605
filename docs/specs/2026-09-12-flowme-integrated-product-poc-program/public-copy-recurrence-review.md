# 공개 사본의 반복 — 공통 읽기·회차 identity 연결

2026-09-14 · P02/P03/P06/P07과 S05/S07/S09/S10의 C단계 부분 구현이다. 전체 목표와 A~E 연결 범위를 유지한다. **실제 반복 공개·사본 저장·개인 전체/이후 계획·출력 완료 보고가 아니다.**

## 이번에 달라진 부분

| 원래 요구 | 구현과 대조 | 남은 경계 |
| --- | --- | --- |
| 공개 원본과 개인 사본을 구별 | `public-copy/1` source와 copy/flow/item JSON tuple. 제작 owner나 legacy saved-plan으로 위장하지 않는다 | 실제 공개·사본 저장 gate는 닫혀 있다 |
| 수용한 판본만 사용 | 필드별 `appliedFields` 또는 `baseVersionId`의 실제 항목을 읽는다. 최신 판본 포인터는 자동 수용하지 않는다 | 실제 공개본 수용 UI·저장 왕복은 다음 단계 |
| 원본 반복 의미 보존 | 공통 occurrence/기간 reader에 `authoring-v1`의 일/주/월·명시 첫 시작·짧은 달 건너뛰기·시간/시간대를 연결 | D1 RRULE은 다른 origin이며 이번 검사로 완료 처리하지 않는다 |
| 개인 기록 보호 | 다른 사본·다른 항목·조회 페이지의 충돌 방지. 다른 항목 일정의 수용으로 이 항목 완료/이동 기록을 숨기지 않는다 | 같은 항목 일정 변경의 유지/재연결·전체/이후 계획 UI와 Undo는 남는다 |
| 개인 기준일과 원문 분리 | 상대 시작의 개인 anchor만 조회에 사용. 원문 token에 anchor/개인 메모/진행을 넣지 않는다. 기준일 변경 시 옛 회차 기록을 재작성하지 않는다 | 시작 미정과 일반 Item 날짜 override는 임의 오늘/전체 반복 이동으로 해석하지 않고 거절한다. 명시 개인 계획 연결이 필요하다 |
| 제외·보관과 내용 보존 | 제외/개인 보관은 실행 노출에 반영하고 기록은 남긴다. series metadata를 일반 체크 완료/텍스트 변경에서 보호한다 | 공개 사본의 항목 추가·삭제/재포함·이동 복합 UI는 별도 검증 |
| 저장 복구·손상 거절 | pinned schedule/version receipt와 실제 회차 재계산으로 공통 실행 상태 validator를 확장. 사본 index의 자동 수정은 하지 않는다 | Program 전체 public payload gate는 여전히 기존3종 일정만 허용한다 |

새 index는 공개 규칙을 복제하지 않고 수용한 반복 Item ID만 가리킨다. 원문 문자열이나 제목에서 반복을 추정하지 않는다. 필드별 공개 사실과 개인 메모·이름·완료는 다른 계층이다. 같은 항목의 수용 일정이 달라지면 옛 기록을 충돌/보관 상태로 남기며, 다른 항목 일정 변경으로 옛 기록을 불필요하게 무효화하지 않는다.

## 검사 범위와 실제 근거

새 `public-copy-recurrence.test.ts` 17개와 기존 recurrence-state 8개, public recurrence 계약16개를 합친 표적 **41/41**, strict entry325/진단0을 실행했다. 새 테스트는 gate 개방 전의 명시적인 공개/사본 계약 fixture다. 실제 앱의 공개 버튼·저장 거래 성공이나 브라우저 사용자 시나리오로 계산하지 않는다. 기존 공유 writer는 이 미개방 payload를 거절하며 입력 변화0을 확인했다.

최종 근거는 다음과 같다. 모델 fixture의 JSON roundtrip은 실제 브라우저 reload/Undo 증거가 아니다.

- 전체142파일1,309/1,309 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T16-44-59-117Z.json`), skip0·검사 중 소스 변경0.
- strict325/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T16-44-22-783Z.json`), production build PASS (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T16-53-41-197Z.json`), build ID `b3puLqtqngipHhQJO7NPz`. 전체검사·build·현재 파일 hash의 불일치0을 확인했다.
- npm test2,031실행/2,030통과/기존1실패 (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T16-52-43-261Z.json`). `seed-flows.test.ts:1289`의 출처 검토기한9건 대0 단언이며 이번 변경의 새로운 실패가 아니다.
- 승인 실행201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T16-55-56-595Z.json`), 공개 표면19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T16-56-09-066Z.json`).
- 실제 기존 초안 회귀15확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/public-copy-reader-draft-regression-2026-09-13T16-55-42-616Z.json`): 같은 저장된2반복/1메모 초안·선택1개를 열어 미리보기/같은 원본 확인/Escape/reload를 확인했다. 실제 문서 build가 `b3pu…`와 일치하며 쓰기0·data 전체 동일·console/page error0이다. **새 공개 사본 사용자 시나리오가 아니다.**

375×812·390×844·844×390·1024×768·1440×900에서 반복 규칙 입력을 초점/스크롤한 뒤 가로 넘침0·입력 hit 가능·키보드 초점·활성 상태를 확인했다. 375입력 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-form-375-1789318545179.png`)·844가로 입력 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-form-844-1789318545318.png`)·1024미리보기 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-preview-1024-1789318545738.png`)를 직접 확인했다. 입력 하나의 접근을 전체 화면의 모든 행동·실기기 검사로 확대하지 않는다. 이중 스크롤·긴 폼은 여전히 별도 UX 잔여다.

이 브라우저 프로필의 운영 보호키는0개다. 저장 호출0·기존 PoC data 동일과 채워진 운영 저장소 불변 검사는 다른 근거다. 후자는 기존 회귀 fixture 검사와 별도 Map 프로필 이력으로 구분한다. 이번에 새 실기기·외부 계정·의존성 audit를 실행하지 않았다.

초기 strict 검사에서는 window type narrowing과 기존 inspection tuple 형식6진단을 발견해 수정했다. 이후 strict0·표적41 통과다. 새 코드/검사 파일을 완성한 후 전체 검사를 실행하며 실행 중 runtime/test 소스를 바꾸지 않는다.

## 저장소 보호 확인 중 발견한 문서 차이

이번 최초 baseline 검사는4,781개 중4,779동일, 기존 route1개 허용, `docs/STATUS.md`1개 미등록 차이로 실패했다. 이 파일은 이전 B단계에서 현재 PoC 안내4줄을 추가한 문서다. 해당 절을 제외하고 주변3줄의 원래 CRLF를 복원한 읽기 전용 비교 hash가 baseline의 `027ff9ad6a1dcafec1ef48bf7138f7eb6eb53f24cf4b72ad6abd857797c106d8`과 일치했다. 운영 이력 본문을 수정하거나 검사를 무시해 통과로 바꾸지 않는다. 현재 안내의 정확한 hash를 문서 변경으로 별도 등록하고 재검사한다. 기준선 원본은 재캡처하지 않는다.

원래 native 제작기26파일819,423bytes·writer0과 v11 source integrity는 이번에 재확인했다. 파일 보호 검사는 브라우저 운영 저장 key/value 검사와 별개다.

상태 문서의 원래 본문 복원 해시 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-13T16-52-19-684Z.json`)를 기록하고 정확한 after hash를 `integration-seams.json`에 추가했다. 재검사는4,781개 중4,779동일·의도된 route1/상태문서1·예상 밖0이다. 첫 실패를 없던 결과로 지우거나 기준선을 다시 만들지 않았다.

## 변경 파일

실제 runtime/test 변경은11파일이다. 새 `public-copy-recurrence.ts`와 그 테스트, 기존 `execution-source.ts`, `recurrence-bridge.ts`, `recurrence-state-contract.ts`, `recurrence-state-validation.ts`, `recurrence-state.ts`, `recurrence-target.ts`, `recurrence-recovery.ts`, `private-output-occurrences.ts`, `program-recurrence-plan-state.ts`다. 뒤 두 consumer의 저장소 전달은 준비 연결이며 전체 계획·출력 기능 완료는 아니다.

이 원장과 계획/요구/현재 검증/상황/진행 문서, HTML 보고서, STATUS의 PoC 안내를 갱신한다. 보호 차이를 정확히 설명하는 `integration-seams.json`과 읽기 전용 비교 도구 `program-status-note-audit.mjs`를 추가/갱신했다. 기존 운영 저장 key/schema/writer와 native vendor는 수정하지 않았다.

## 다음 구현

1. 실제 사본 import/선택 수용에서 versioned index를 생성·검증하고 series header/하위 확인을 정확한 개인 owner로 연결한다. 새 writer를 만들지 않는다.
2. 개인 전체/이후 계획·시작 미정의 명시 설정, 원본 변경·보관 기록·공통 Undo/reload를 public-copy origin에 연결한다. 이전 메모/일회성 일정으로 대체하지 않는다.
3. 출력 target/정렬 key·정확 재진입과 TXT/CSV/ICS·일정 제안을 연결한다. D1 Map RRULE의 공개 파생은 별도 의미로 대조한다.
4. 모든 consumer가 준비된 뒤 저장 gate를 열고, 보존 중인 실제 주간 초안에서 불변 공개→다른 개인 사본→회차 실행→파일→복귀를 브라우저로 확인한다.

새 실행·전체 백업·재공개 정책을 확정하지 않는다. 전체10상황과 두 전체 개선 루프, 여섯 작성 틀 동등성·Map 삭제·긴 화면/응답성은 계속 남는다. 실기기·OS IME·보조기술·외부 계정·관찰 사용자 검증은 미실행이며 관찰 사용자0명이다. commit/push/PR/merge/Preview/Production/외부 게시를 하지 않는다.
