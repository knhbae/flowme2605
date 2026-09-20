# Map 새 항목 선택과 원본 Undo — 모델 검증

2026-09-13 · 전체 목표 중 P02/P03/P07/P08, S05/S08/S09/S10의 제한된 추가 근거다. 실제 상위 원본의 항목 삭제나 브라우저 검증 완료가 아니다.

## 무엇을 검사했는가

실제 오픽 Map factory의 두 하위 Flow와 안정 ID를 사용했다. 이전 저장 목록에서 마지막 기존 항목 하나가 없었다는 **가상 과거 상태**를 만들고, 현재 실제 factory 원본을 기존 `connect-map → stage-map → choice → apply` 경로로 수용했다. 원본 모델이나 운영 저장 키를 갱신하는 시험용 제품 기능은 추가하지 않았다.

| 기존 요구 | 확인한 결과 | 범위 |
| --- | --- | --- |
| 새 원본 항목은 자동 포함하지 않음 | pending/미포함 표시, 명시 선택 없이는 거절. 제외 선택과 포함 선택을 각각 비교 | 모델·실제 factory 읽기 |
| 같은 날짜·지난 완료·기존 행 소유 보존 | 기존 실행 날짜와 완료, 기존 항목의 canonical 행 ID 유지. 새 항목에만 해당 소유 연결 | 모델 transaction |
| 저장·reload·Undo·허용 prefix | 포함은 한 번 저장, reload 추가 쓰기0, 전역 Undo는 이전 개인 공간 복원. 보호 key/value 동일 | 메모리 저장 포트 |
| 새 항목에 기록한 뒤 원본 Undo | 35% 기록을 실제 생성. 무확인 Undo는 거절하고 보존을 명시한 Undo는 행·기록·retainedItemRefs 유지 | 모델 transaction |

추가 회귀는 [program-legacy-map-catalog-change.test.ts](../../../lib/flow/integrated-poc/program-legacy-map-catalog-change.test.ts) 2개다. 검사 대상은 직접 원본 필드를 덮는 우회 경로가 아니라 기존 원본 변경 소유자의 실제 연산이다.

단독2/2와 최종138파일1234/1234 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T14-05-01-314Z.json`), strict316/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T14-05-00-934Z.json`)을 확인했다. 전체 검사에는 skip과 검사 중 소스 변경이 없다. 제품 runtime은 변경하지 않았으며 YAHg build와 동일함을 기록 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/travel-crosscheck-2026-09-13T14-12-34-390Z.json`)에서 확인했다.

## 첫 검사 가정과 수정

처음에는 저장 snapshot의 model만 교체하고 원본 수용을 거치지 않아 추가 항목의 읽기가 거절됐다. 이 상태를 정상 갱신으로 가정한 검사를 고쳤다. 또한 원래 Flow 문서는 `text.flows`, 독립 문서는 `text.documents`에 있을 수 있는데, 전자도 읽는 `M.getDocument`와 달리 후자에서만 행을 찾았다. 두 저장 소유를 함께 확인하도록 고쳤으며 제품 코드의 데이터 소실로 보고하지 않는다. 타입 검사에서 readonly fixture 수정과 optional 선택 값 오류도 바로잡았다.

## 후속 실제 UI — I8U9 18개 확인

명시 수용·실행·두 Undo18확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-catalog-review-2026-09-13T14-38-02-251Z.json`)을 완료했다. 위와 같은 실제 factory ID의 가상 과거13항목을 새 검증 프로필에 준비하고, 실제 UI에서 구조 연결→현재14항목 비교→추가1항목만 원문 수용→개인 포함/제외의 미선택 거절·제외 비교 취소→명시 포함→완료→원본Undo 비교/취소/기록 보존→전역Undo/reload를 이어갔다.

기존 고정10/3·완료·행 ID·공개 판본은 유지했다. 새 항목은 `14일차: 휴식`, 실제 개인 행은 `legacy-item-93913257b95936e318191235e2b1ae87`이며100% 기록을 남겼다. 포함은1revision/1쓰기, 무선택·취소·reload는0mutation이다. 준비한 운영 원형2키+표식1키는 전후 byte-for-byte 동일, 허용 밖 쓰기·page/console 오류0이다. 초기 QA3키 주입은 제품 쓰기 계측 이전 준비로 분리했다. 기존 프로필 초기화·운영 writer 호출은 없다.

375px 명시 적용 (로컬 전용 근거: `../../../output/playwright/map-catalog-review/new-item-include-375-1789310365092.png`), 1024px (로컬 전용 근거: `../../../output/playwright/map-catalog-review/new-item-include-1024-1789310365270.png`), 추가 기록 보존 확인 (로컬 전용 근거: `../../../output/playwright/map-catalog-review/added-history-before-source-undo-1789310377945.png`)을 직접 확인했다. 동작/키보드 접근은 해당 범위에서 확인했으나 비교 화면은 길고 텍스트 밀도가 높다. [현재 판정](current-validation.md)의1237/strict316/build와 기록7대조 (로컬 전용 근거: `../../../output/integrated-product-poc/recovery-map-crosscheck-2026-09-13T14-43-10-965Z.json`)를 사용한다. 실제 외부 새 판본을 조회한 검사나 전체 Map 변경 완료가 아니다.

## 남은 작업

- 같은 가상 과거 Map의 명시 수용·선택·기록·두 Undo는 위18확인 범위에서 종결했다. 이 항목을 다시 모델만 완료된 것으로 세지 않는다.
- 실제 새 상위 판본에서 기존 항목/하위 Flow가 없어지는 별도 입력과 과거 실행 기록의 보존을 검증한다. 이번 원본 Undo와 같은 경우로 취급하지 않는다.
- 다른 반복 구조, 전체 하위 제외의 미확정 정책, 긴 목록·응답성, 전체10상황과 두 전체 개선 루프는 남는다.

실기기·외부 서비스 게시·배포·관찰 사용자 검증은 수행하지 않았다. 자동 검사와 기존 코드 재사용의 증거만 추가했다.
