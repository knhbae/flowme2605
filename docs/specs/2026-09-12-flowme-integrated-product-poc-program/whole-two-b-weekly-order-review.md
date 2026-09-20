# B 주간 제작 원문 이동·정렬 검증

2026-09-20. `whole-loop-two-plan` B의 잔여 검사이며 새 기능 범위를 추가하지 않는다.

## 현재 판정

**B 주간 원문 이동·정렬 시나리오 통과.** 동명 두 항목과 하위 체크·날짜·시각·반복·시간대를 함께 잘라 붙이는 이동, 일반 날짜순의 반복 차단, Calendar 결과순 미리보기·취소·적용, native textarea Undo/Redo와 원래 상태 복구·reload를 최종 빌드의 누적 ordinary 자료에서 확인했다. 기존 빌드의 native Redo 원문 손실은 최소 변경 범위 수정 후 해결됐으며 최초 실패 증거는 그대로 남긴다.

이번 원문은 StructureDraft에서 작성한 non-native 초안이다. 직접 원문 블록 이동을 native-owner 구조 명령의 구현·실행으로 바꾸어 부르지 않는다. 원래 native pending 프로필은 수정하지 않았다.

## 실제 실패와 보호

- 누적 ordinary 초안: `creator-f33db430-a19c-4ac0-a045-870821a0bd3b`.
- 원문 366자. 첫 항목 블록 `71..218` cut → 남은 구분 줄 삭제 → 마지막에 줄 추가 → paste로 완전한 두 블록 순서를 바꾸었다.
- Calendar 정렬은 366자를 복구했고 native Undo도 역순 366자를 복구했다. Redo는 첫 공통 제목 `- [ ] 발표 연습` 11자를 잃어 355자가 됐다. DOM capture의 trusted input부터 이미 355자이므로 모델의 저장 변환으로 생긴 삭제가 아니다.
- 최초 실패: `whole-two-b-weekly-order-2026-09-20T06-02-55-990Z.json`, 완료된 단언 35건 후 실패. 실패 산출물은 보존했다.
- 정상 UI 입력으로 원본을 복구한 뒤 같은 순서에서 다시 재현했다: `whole-two-b-order-cut-diagnostic-2026-09-20T06-12-16-091Z.json`.
- 최종 누적 자료는 rev476, SHA-256 `714933d6dfdf81b739f554cad3d9d13532346090f37ee553fcba8e5c5542ca31`, generation `1789883503357`, observer offset19이다. rev457과 전체 ProgramData·전체 Undo 배열이 deepEqual로 동일하다. 관측된 19회는 모두 정확한 PoC program state의 setItem이며 remove/clear/허용 밖 호출은 0건이다.
- 전역 Undo, 명시 초안 저장, 원본 저장 key 쓰기, seed/import/reset은 하지 않았다.

## 원인 분리와 수정 근거

누적 자료를 더 실험하지 않고 새 빈 QA 프로필을 정상 UI로 시작했다. 빈 초안 만들기 → 동일 원문 입력 → reload 후 같은 결함을 재현했다. 따라서 오래된 누적 프로필의 이력에만 발생하는 문제가 아니다.

| 분리 실험 | 결과 |
|---|---|
| 단순 DOM / React 19.0 / Next compiled React canary의 기본 textarea | 대체로 재현 안 됨. 이것만으로 실제 앱 결함을 부정하지 않음 |
| generic React의 정렬 후 readOnly/defaultValue commit 순서 | 일부 조합에서 native Redo 손실. 실제 앱 원인을 이것만으로 확정하지 않음 |
| 실제 앱 defaultValue 변경 차단 | 동일 355자 손실 |
| 실제 앱 readOnly attribute 차단 | 동일 355자 손실 |
| 두 조건 동시 차단 / Undo 직후 선택 복원 차단 | 동일 손실 |
| 정렬 교체 범위를 전체 원문으로 확대 | 첫 제목 42자 손실, 324자. 해결책 아님 |
| 공통 prefix/suffix를 제외한 실제 변경 범위만 native insertText | 동일 원문과 native Undo/Redo 366자 보존 |

마지막 단일요인 진단은 `whole-two-b-isolated-minimal-range-2026-09-20T06-39-11-405Z.json`에 있다. 진단 hook은 종료 후 원복했다. **진단 개입의 성공을 제품 빌드 통과로 세지 않는다.** 브라우저 내부 구현의 정확한 원인을 확정한 것은 아니지만, 공통 첫 줄을 포함한 native 교체 범위와 손실의 재현 관계 및 최소 범위의 회피 효과를 확인했다.

수정은 `ProgramCreatorWorkspace.tsx`의 정렬 request 구성에만 적용한다. 최종 원문·source identity·선택 복원·단일 native transaction·저장 실패 보존 계약은 유지한다. UTF-16 surrogate pair와 CRLF 중간을 자르지 않는다. shared LiveEditor, 구조 템플릿 materialization, 운영 저장 구조는 변경하지 않는다.

## 자동 검사와 미실행 항목

- `ProgramCreatorWorkspace.order.test.tsx`: 10/10.
- `ProgramCreatorWorkspace.structure.test.tsx`: 12/12.
- 합계 22/22. 이는 native browser Undo 구현 자체를 흉내 낸 테스트와 순수 범위·handler 검사이며, 실제 브라우저 검사를 대체하지 않는다.
- 최종 production build `ylSngUBlsuD5I1e8zd_09`의 실제 브라우저: 별도 QA와 누적 ordinary 모두 성공. 아래 후속 참조.
- 실제 Android/iOS: 미실행. 관찰 사용자 0명.
- commit / push / PR / Preview / Production 배포: 없음.

세부 JSON은 `output/playwright/integrated-program/`에 보존한다. 단순 generic about:blank 실험의 runtimeMatchesBuild=false는 해당 실험에 앱 document/chunk가 없기 때문이며 제품 빌드 검증으로 사용하지 않는다.

## 수정 제품의 실제 브라우저 후속

`whole-two-b-isolated-fixed-tail-2026-09-20T06-48-45-929Z.json`: 4개 명시 단언 통과, document build와 route chunk 일치. 앞의 QA runner는 CLI host에 URL global이 없어 **원문 mutation 전** 중단했으며 그 기록도 보존했다. tail은 경로 비교만 수정했다.

진단용 execCommand/defaultValue/readOnly/selection hook 없이 같은 실제 UI 조작을 실행했다. 새 빌드 reload → 완전한 두 원문 블록 cut/paste → Calendar 취소·적용 → native Ctrl+Z → Ctrl+Shift+Z → Ctrl+Z → Ctrl+Y를 수행했다. 두 Redo 모두 제목·하위 체크·반복·시각·시간대를 포함한 366자를 정확히 복구했다. 이는 가짜 history input이나 모델 보정으로 통과시킨 결과가 아니다. 누적 ordinary 자료에는 이 검사에서 접근하지 않았다.

최종 빌드 `ylSngUBlsuD5I1e8zd_09`에서도 같은 검사를 반복했다. `whole-two-b-isolated-final-2026-09-20T06-56-15-738Z.json`: 4/4, runtime 일치, page error 0, console error 0. 같은 QA 프로필의 마지막 성공 자료에서 이어 실행했으며 새 profile/seed/import는 사용하지 않았다.

## 최종 누적 ordinary 완료

- `whole-two-b-weekly-order-fixed-tail-2026-09-20T06-59-30-423Z.json`: noop·반복 차단 등 10개 확인 후 첫 cut의 저장 대기에서 timeout. 실제 저장값은 기대한 219자와 정확히 같았다. 이 타이밍의 원인을 제품 결함 또는 rAF 중단으로 단정하지 않았다.
- `whole-two-b-weekly-order-cut-tail-2026-09-20T07-02-04-387Z.json`: 정확한 cut 후 상태 rev477에서 이어 56개 확인 통과. 명시 polling으로 기다리며 삭제·줄 추가·paste → Calendar 정렬 → native Undo/Redo → 정렬 Undo → 수동 이동 네 단계 Undo를 모두 실행했다. 첫 실행을 재시작하거나 clipboard·storage를 주입하지 않았다.
- 원래 working 전체와 ProgramData 전체·global Undo 배열을 복원하고 reload 후 wire까지 확인했다. 최종 rev488, SHA `626d29097a504c8a32dc84fbcf8cc622b1b91219345b81b43b78a800c881902e`, generation `1789887807183.4`, 새 observer offset0. rev476→488의 12회 저장은 모두 허용된 PoC key의 원문 autosave이며 원본/운영 key는 동일하다.
- 별도 최초 preflight 실패 `whole-two-b-weekly-order-fixed-2026-09-20T06-58-47-369Z.json`은 동적으로 로드된 route chunk를 document.scripts에서만 찾은 QA 오류였다. 쓰기 전 중단했고 후속에서 실제 resource 목록까지 대조했다.

## 최종 화면 5종

`whole-two-b-final-screens-2026-09-20T07-05-11-628Z.json`: 29개 확인 통과. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 수평 넘침 0, 구간 추가·할 일 추가·초안 저장의 가림 0, 방해하는 modal 0, console/page error 0. 화면 크기를 바꾼 전후 wire·운영 key·sessionStorage와 observer offset이 같아 저장 호출은 0건이다.

각 `whole-two-b-creator-final-{너비}x{높이}.png`를 직접 열어 확인했다. 좁은 화면은 원문 제목과 보기 버튼이 정상 줄바꿈되고 원문은 내부 스크롤을 사용한다. 844×390 캡처는 원문 중앙이므로 모든 버튼을 한 화면에 담은 증거가 아니며, 각 핵심 버튼은 별도로 스크롤해 hit-test했다. 이는 데스크톱 Chromium viewport 검사이며 실제 Android/iOS 또는 관찰 사용자 검증이 아니다.

후속 파일 기반 불변 교차검사 `whole-two-b-d-preservation-2026-09-20T07-11-28-351Z.json` 20/20도 통과했다. B는 원래 전체 ProgramData와 압축 저장된 Undo 객체 전체가 정확히 같음을 비교했다. 첫 cut 단계의 다른 자료·Undo도 별도로 대조했다. 브라우저 추가 조작 없이 기존 증거 JSON으로 검사했다.
