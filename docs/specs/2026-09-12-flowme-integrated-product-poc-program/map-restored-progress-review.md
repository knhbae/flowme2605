# 원본 Undo 뒤 개인 진행 이어 쓰기

2026-09-13 · P02/P07/P08, S02/S09/S10의 동일 Map 과거 기록 후속 흐름이다. 전체 세 결과물 동등성이나 전체10상황·두 개선 루프 완료가 아니다.

## 요구 → 실제 차이 → 수정

기존 개인 진행·메모·하위 항목·참조를 보존한 원본 Undo는 복원 화면에서 끝나지 않는다. 같은 항목에 다음 날짜의 진행을 추가하고, 참조 문서에서도 같은 기록을 보며, 실패/재시도·Undo/reload 뒤 이어 쓸 수 있어야 한다. 원본 일정이나 별도 반복 회차의 완료를 개인 일반 기록으로 바꾸지 않는다.

QGp 실제 실패 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-continue-qgp-2026-09-13T08-35-53-521Z.json`)는 보존된 과거 기록 프로필에서 재현했다. 6크기 키보드·진행 입력·Escape0쓰기를 포함한15확인 뒤,35%→45%의 진행 저장을 눌러도 raw가 바뀌지 않아 기존12초 안에 실패했다. 대화창은 닫히고 `저장됨`·35%가 남았다. 보호5키 bytes 동일·전체 제품 쓰기0이며 fixture 초기화나 원본 재작성은 없었다. 이는 저장 지연이 아니라 편집기 후보 검증의 거절이다.

화면 접근 판정은 복원된 canonical 항목을 active로 읽었지만 `programPreservesSeriesMetadata`는 같은 행을 여전히 unsupported 원문 메타데이터로 취급했다. native draft의 apply가 false를 반환하여 controller까지 전달되지 않았다. 원본 Undo의 저장/복원 성공만으로 이 후속 기능을 완료라고 세지 않는다.

보완은 `recurrence-target.ts`의 읽기 판정 한 곳이다. 전체 legacy payload 검증을 거친 뒤 실제 구조화 원본의 handoff receipt·base 판본·workspace/saved-copy/Flow/Item tuple에서 만든 기존 ID·원래 canonical 문서/소유·등록된 보관 문서를 확인한다. 실제 활성 recurrence가 없는 복원된 개인 task 행만 원문 메타데이터 잠금에서 구분한다. 원문 속성 행, 활성 반복, 확인 이력 없는 체크 모양 행, 다른 소유·손상 근거는 계속 보호한다. 지난 반복 기록을 볼 수 있도록 metadata 목록은 제거하지 않는다. writer·저장 key/schema·새 정책을 추가하지 않는다.

## 검사와 개선 상태

- ME16은 실제 실패와 같은 순수 guard 거절을 먼저 재현했다. 수정 뒤 개인 진행·controller quota/같은 입력 재시도·원본/다른 인물 불변·Undo/reload를 검사한다.
- ME17은 확인 이력 없음·다른 scope·보관 근거 없음·손상 원본·활성 반복의 거절을 확인한다. 잘못된 원본에서 기존 guard가 빈 metadata 목록만 보고 true를 반환하던 방어 공백도 false로 닫았다. 실제 진입의 손상 payload 차단을 완화하지 않는다.
- 관련 모델/편집기/참조 보호39/39 PASS. strict311/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T08-43-43-108Z.json`), 전체134파일1182/1182·제외0 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T08-43-33-010Z.json`), npm2031실행/2030PASS/기존 출처기한1FAIL (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T08-48-13-864Z.json`), 승인201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T08-49-13-690Z.json`)·공개19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T08-49-16-993Z.json`), production build PASS (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T08-49-19-361Z.json`). 검사 중 제품 소스 변경0이다. 의존성 audit는 재실행하지 않았다.
- 검사 준비 오류는 제품 결함과 별개다. 모델 테스트에서 TSX를 직접 가져와 CSS 로더가 실패한 첫 시도는 assertion 실행이 아니었다. UI 로더를 모델 테스트에 이식하지 않고 실제 공유 guard/controller를 검사하며 mounted editor는 브라우저에서 확인한다. ID 대조에는 원래 allocator의 workspaceId까지 포함했다.

## UX 평가와 경계

최초 실패는 버튼의 결과를 예측할 수 없는 High 실행 결함이었다. 아래 pO7의 동일 자료에서 저장/실패/재시도/Undo와 실제 기록을 확인하여 이 경로는 해결로 갱신한다. 실행 명확성은 이 결정 맥락에서1→4로 평가한다. 실제 사용자 점수나 앱 전체 점수가 아니다. 인지 부담은3으로 남기며 문서의 큰 빈 공간·페이지/편집기 내부 스크롤과 첫 화면 전체의 위계는 별도다. 이번 변경은 화면 구조·컨트롤 추가 없이 기존 실행 경로의 의미를 복구했다. 기존 기록/복구 안내와 접근성 이름은 유지했다.

## 최종 동일 자료 검증 — pO7

실행판 `pO7OSfQ75aW5WKlX9wHT2`, 2026-09-13 08:51~08:53 UTC. 첫 실행19확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-continue-po7-2026-09-13T08-51-27-206Z.json`)은6크기 저장 버튼·입력 후Escape0쓰기와 실제35→45% 저장/원본·참조·하위 기록 보존을 확인했다. 이 한 저장은217ms였으며 Map 공통 기준일의4506ms와 서로 다른 작업이다. 일반 성능 완료로 비교하지 않는다.

첫 실행은 quota 행의 `injected` 필드를 기대한 검사 오류로 중단됐다. 이 프로필의 실제 계측은 `failed`만 기록한다. 당시 committed bytes는 성공한45% 그대로, 화면은 미저장55%와 다시 저장이었다. 제품 실패로 덮어쓰거나 첫 실행 전체를 PASS로 고치지 않는다. 같은55% 입력 재개10확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-continue-resume-po7-2026-09-13T08-53-40-573Z.json`)은 재입력·초기화 없이 재시도1거래→같은날짜/값0쓰기→다른 문서55%→정확 문서/reload→Undo45%→Undo35%→reload를 완료했다. 두 기록의 확인점은 별도로 표시한다.

기록·현재 소스11대조 (로컬 전용 근거: `../../../output/integrated-product-poc/map-records-continue-crosscheck-2026-09-13T08-54-49-383Z.json`)는 두 실행의 원본 상태 연속성, 과거dFR 원본Undo 자료와의 일치, 원래3기록/완료 회차/원문/다른 인물 불변, 정확한 새 진행만 추가됨, 최종 모든data(작성 위치 제외) 복원,6크기와 현재1182검사·build의 파일/SHA256 일치를 확인했다. 파일명의 UTC 대문자T/Z를 처음 거절하던 대조 스크립트 검사는 안전한 basename 패턴 안에서 보완했다.11은 새 브라우저 실행 수가 아니다.

각 실행의 보호5키 byte-identical·허용prefix밖쓰기0·page/console0이다. 실패 시 성공mutation0이며, 정상 저장과 UI 위치 저장은 구별한다. 미저장55% (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-records-unsaved-55-1024-1789289621846.png`), 다른 문서55% (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-records-continue-reference-1024-1789289622437.png`), 최종35% 복원 (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-records-continue-undo-1024-1789289624086.png`)을 남겼다. 앞의 두 상태를 직접 보고 저장 실패와 성공 표시가 실제 상태에 맞는지 확인한다.6크기는375×812·390×844·844×390·1024×768·1194×834·1440×900이며 저장 버튼44px·키보드·hit-test·가로 넘침0 범위다.

제품 변경은 `recurrence-target.ts` 한 파일이며 ME16/ME17을 `structured-map-execution.test.ts`에 추가했다. 검증 스크립트는 `program-map-records-continue.cli.js`, `program-map-records-continue-resume.cli.js`, `program-map-records-continue-crosscheck.mjs`다. 기존 QA 로그와 실패 자료는 보존한다.

실제 Android/iOS·OS 입력기·보조기술·외부 계정·관찰사용자0. 발행·배포 없음. 보고서 HTML 렌더 정책 차단은 우회하지 않는다. 전체 Map 포함/제외·새 원본의 긴 조합과 개발2의 세부 기능별 동등성, 전체 두 개선 루프는 계속 남는다.
