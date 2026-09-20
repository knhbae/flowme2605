# 공개 사본의 개인 반복 계획 — 원래 날짜 의미와 기록 보존

2026-09-14 · P02/P03/P06/P07 및 S05/S07/S09/S10의 C단계 후속 모델 연결. 전체 목표는 진행 중이다. **실제 반복 공개·사본 import·계획 UI·출력의 사용자 왕복 완료 보고가 아니다.**

## 해결한 차이

개발2 authoring-v1은 지정한 첫 시작일을 첫 회차로 포함한다. 기존 개발1 날짜 계산은 규칙에 맞는 첫 날짜부터 계산하므로 단순 연결하면 첫 회차가 사라질 수 있다. 예를 들어 화요일인 2026-12-01에 `매주 월, 수 / 3회`를 시작하면 원래 날짜는 12/1·12/2·12/7이다.

공개 사본의 개인 계획에 D2의 실제 날짜 expander를 연결했다. 기존 개인 owner·거래 영수증·이벤트 이력·기간 reader와 순수 Apply/Undo를 재사용하되, D1의 일정 정규화나 회차 생성기를 공개 사본에 적용하지 않는다. 개인 revision의 공통 자료형/ID는 재사용하지만 공개 source tuple·판본·규칙은 그대로 분리한다. 새 writer와 원 vendor 변경은 없다.

| 요구 | 현재 근거 | 남은 범위 |
| --- | --- | --- |
| 첫 시작·요일·월말·간격·COUNT/UNTIL 보존 | 실제 D2 생성과 개인 이동 후 날짜 대조. 큰 간격을 기존 D1 기본값으로 정규화하지 않음 | 실제 공개 저장과 다른 사람이 가져오는 UI |
| 전체/이후 계획 변경 | 기존 개인 이동 정책대로 요일/종료일 이동, 월일 재설정, 새 revision의 COUNT 유지. 기록이 있는 전체 변경은 이후 계획으로 처리 | 사용자 화면의 변경 범위·비교·확정 연속 검증 |
| 과거 기록과 두 종류의 날짜 구별 | 원본의 완료/보류/고정/미정과 원래 task 기록 bytes 보존. 새 개인 완료·먼 날짜 이동·다시 열기·후속 계획 대조 | 실제 Program 저장/Undo/reload 거래 |
| 문서·기간에서 같은 실행 | 공통 period reader의 source 중복 억제, 날짜별 분할 조회의 동일 identity, 원본 변경/개인 보관 시 기록 복구 읽기 | 실제 사본 header·하위 확인·문서 조작 및 출력 재진입 |
| 다른 항목의 갱신과 내 실행 분리 | aggregate source token이 바뀌어도 해당 pinned 항목이 같으면 기존 계획 유지. 중복 owner 거절 | 공개 판본의 실제 선택 수용 UI/저장 |
| 실패·취소·손상 경계 | 같은 날짜·뒤로 가는 이후 계획·변조/오래된 영수증 거절, 입력 객체 불변, storage/fetch 접근0 | 실제 버튼/Escape/pointer와 저장 실패 검사는 별도 |

## 임시 구현 계약

`program-authoring-plan.ts`는 replay된 개인 revision을 읽는 Program 전용 adapter다. 실제 D2 expander에 조회용 종료 경계를 전달하고 원래 COUNT를 별도로 유지한다. 저장된 원본/개인 규칙과 원본 occurrence ID는 변경하지 않는다. 월말 건너뛰기와 지정 첫 시작일은 원래 계산기를 따른다.

`PROGRAM_AUTHORING_PLAN_WINDOW_V1`의 revision별 100,000일·10,200후보 및 결과1,000행은 계산 자원 한도다. 반복 종료나 운영 정책이 아니다. 한도에 닿은 조회는 `truncated`로 드러내고, 이후 계획 사이의 제외 구간을 부분 처리해야 하는 경우 거래를 거절한다. 필요한 실제 장기 사용 자료가 이 한도에 닿으면 원본·지난 기록 보존을 전제로 페이지 계산과 계약을 재검토한다.

시작 미정의 명시 설정, public store 허용, 사본 recurrence index 생성, header/하위 확인의 소유 연결과 출력·제안·재진입은 다음 C/D 작업이다. native 개인 계획 전체 지원이나 D1 RRULE의 공개 파생까지 이번 모델로 지원했다고 하지 않는다.

## 실제 검사

- 최초 표적57개 중56통과/1실패. 새 장기 월말 사례가 기존 공개 occurrence validator에서 유한 COUNT에도 종료 없는 주 단위 조회 한도를 적용하는 결함을 드러냈다. 해당 분기를 수정한 뒤 같은57개 통과.
- 추가 공통 period·원본 변경/보관·다른 항목 변경·저장 접근 금지까지 포함한 새 파일19개와 첫 전체143파일1,328개가 통과했다. 후속 검토에서 월말180회 개인 계획의 다음 회차가 남아 있는데도 종료로 판단하는 결함을 새 검사로 재현했다. 공개 사본에는 횟수×31일 추정 대신 실제 bounded 날짜 조회를 적용했다. 새 파일 최종 **21/21**, 관련 **63/63**, strict **327진입/진단0**이며 첫 전체1,328은 마지막 보완 전 결과로 구별한다.
- 같은 snapshot의 JSON 왕복과 순수 Undo는 모델 검사다. 실제 브라우저 새로고침/운영 key/value 불변으로 세지 않는다.
- 최종 143파일1,330/1,330 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T17-32-31-097Z.json`), skip0·검사 중 소스 변경0. strict327/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T17-32-17-873Z.json`), production build PASS (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T17-41-10-094Z.json`), build `e-s6PjT0tjByB84g-kcgo`. 전체 검사·build·현재356개 source hash의 불일치0을 확인했다.
- npm test2,031개 중2,030통과/기존1실패 (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T17-39-56-140Z.json`): `seed-flows.test.ts:1289`의 출처 검토기한9건 대0 단언이다. 승인 실행201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T17-43-40-424Z.json`), 공개 표면19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T17-43-51-946Z.json`)도 통과했다. 서로 겹치는 검사 수를 합산하지 않는다.

## 현재 빌드의 브라우저 회귀와 화면

보존된 기존 초안15확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/public-copy-plan-draft-regression-2026-09-13T17-43-19-216Z.json`)은 같은2반복/1메모·선택1개의 실제 초안을 재열기→미리보기→같은 원본 확인→Escape→reload했다. 실제 문서 build/route chunk가 e-s6와 일치한다. **새 공개 사본의 생성·개인 계획 UI 검사가 아니다.** 저장0·PoC data 전체 동일·page/console error0이며 새로고침 뒤에도 setItem/removeItem/clear 감시가 유지되는지 읽기 확인했다.

375×812·390×844·844×390·1024×768·1440×900에서 반복 규칙 입력을 초점/스크롤한 뒤 가로 넘침0·활성 입력 hit 가능·키보드 초점을 확인했다. 375입력 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-form-375-1789321401628.png`), 844가로 입력 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-form-844-1789321401787.png`), 1024미리보기 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-preview-1024-1789321402209.png`)를 직접 열어 확인했다. 입력 하나의 접근을 모든 핵심 행동 검사로 확대하지 않는다. 좁고 낮은 화면의 이중 스크롤·상하단까지 이동해야 하는 긴 폼은 여전히 UX 잔여다. 1024 미리보기의 공개 제한 안내는 보인다.

이 프로필의 보호 운영키는0개다. 이번 쓰기0·PoC data 동일을 채워진 운영 데이터의 새 전후 검증으로 표현하지 않는다. 기존 회귀의 sentinel 검사는 별도 근거다. 상태 문서 원래 본문 해시 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-13T17-41-59-916Z.json`)는 baseline과 동일하며 현재 PoC 안내만 정확한 변경으로 등록했다. 파일 보호4,781중4,779동일·의도된2개 연결 파일·예상 밖0, native 제작기26파일819,423bytes/운영 writer0·v11 원본 integrity도 확인했다.

보고서 정적 검사에서 전체 미완료 안내 문장을 빠뜨려1개 실패했고 문장을 복원해 통과했다. 검사 기준을 완화하지 않았다. 보고서 렌더는 URL 정책 차단으로 계속 미실행이다. 브라우저 종료 뒤 복합 계측 조회 CLI1회가 출력 없이 종료1을 반환했으며 단순 읽기 두 번으로 감시 존재/쓰기0/세 메서드 wrapping을 재확인했다. 이를 앱 page error로 합산하지 않는다.

최종 보고서 정적171검사/PNG4개 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-13T17-48-02-856Z.json`)와 문서 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-13T17-48-02-965Z.json`)는 통과했다. 정적 검사를 실제 보고서 렌더 통과로 세지 않는다.

## 변경 범위와 다음 작업

새 `program-authoring-plan.ts`, `program-public-recurrence-plan.test.ts`와 기존 `program-recurrence-plan.ts`, `program-recurrence-plan-state.ts`, `program-recurrence-plan-state-validation.ts`, `public-copy-recurrence.ts`의 여섯 파일이다.

문서는 이 원장, `plan.md`, `current-validation.md`, `coverage-ledger.md`, `journey-closeout.md`, `recurring-publication-design.md`, `progress.md`, `integration-seams.json`, `docs/STATUS.md`의 PoC 안내와 캡처 HTML을 갱신했다. 결과 JSON/log/PNG는 자동 검증 산출물로 별도 보관한다.

다음은 실제 사본 저장·개인 시작일·header/하위 확인/포함 선택의 보호, 일정·출력·제안·정확한 재진입 consumer를 연결한 뒤 기존 공개 초안의 저장 gate를 여는 일이다. 그 후 같은 보존 주간 원문으로 공개→사본→완료/개인 계획→출력→원본 갱신→Undo/reload를 검증한다. 전체10상황·두 전체 개선 루프와 세 산출물의 나머지 동등성은 계속 남는다.

현재 `private-space.ts`의 `appendSourceItem`과 여러 문서 연결은 일반 Item의 본문/날짜/`linkTask` 계약을 사용한다. recurrence index 허용만으로 이 접점을 완료 처리하지 않는다. 반복 header와 회차·하위 확인의 구분, 기준일 변경 때 기존 개인 계획과 지난 기록의 처리, 정확한 참조 복귀를 먼저 연결한다. 월일과 장기 간격의 다른 조합도 gate 개방 전에 추가 대조한다.

추가 코드 대조 후보: 기존 D1 개인 계획의 `programRecurrencePlanHasMore` 분기에는 여전히 COUNT×31일 추정이 남는다. 이번 수정은 공개 사본 분기이며 D1 장기 월말까지 해결했다고 하지 않는다. 실제 D1 source fixture로 같은 장기 사례를 재현한 뒤 원래 RRULE 계산과 조회 상한을 유지하는 수정·회귀가 필요하다. 지원 월일이 오랫동안 나오지 않는 간격/시작일 조합도 원래 expander의 비용·종료와 함께 별도로 확인한다.

실기기·OS IME·보조기술·외부 계정·관찰 사용자: 이번 미실행. commit/push/PR/merge/Preview/Production: 이번 미실행. 보고서 HTML 렌더의 기존 URL 정책 차단을 우회하지 않는다.
