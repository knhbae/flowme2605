# 반복 공개 초안 — 기존 메모 묶기·입력·복구 연결

2026-09-14. [전체 연결 설계](recurring-publication-design.md)의 B 중 비공개 초안과 공개 후보 미리보기를 구현했다. 반복의 불변 공개 판본·개인 사본·회차 실행·출력 연결은 아직 미완료다. 공개 store는 기존3종 일정만 허용하며 반복 후보를 일반 미정 일정으로 바꾸어 저장하지 않는다.

## 원래 요구와 이번 대응

| 요구 | 실제 변경 | 판정 범위 |
| --- | --- | --- |
| 반복 원본을 한 항목으로 보존 | raw/native 원본으로 반복·시작일·시간·시간대·조건·주의·자료를 읽는다. 새 초안에는 두 원본을 두 후보로 만든다. | 새 후보는 미선택. 개인 실행 날짜·완료·메모는 가져오지 않는다. |
| 저장된 공개 초안 보존 | 이전 초안은 그대로 연다. ‘반복 원본 확인’에서 선택한 원본만 명시적으로 묶는다. | 정확한 원본 metadata이면서 수정·선택하지 않은 메모만 제거한다. 다른 메모와 사용자 입력은 유지한다. |
| 판본 사이 식별자 보존 | 원본 tuple은 비공개 포인터로 유지하고 공개 항목은 독립 ID를 쓴다. 비공개 publication link에 향후 판본 재사용용 mapping을 추가했다. | 공개 writer는 아직 gated다. 실제 반복 공개 후 다시 편집하는 수명주기는 미검증이다. |
| 입력·실패·복구 | 반복 입력은 버전 있는 비공개 draft로 저장한다. 불완전한 한글/종료/시간대는 복구 가능하고 공개용 규칙으로는 거절한다. | native 입력 capture·TXT 복구·CAS·재시도·reload. 실제 OS IME 검사는 아니다. |
| 원본 변경과 공개 비교 | 선택한 source의 정확한 원본 snapshot/revision을 확인한다. 공개 판본 비교는 반복 전체 값을 비교·수용한다. | 원본 확인으로 현재 초안의 제목·일정을 자동 덮지 않는다. 반복 공개가 열린 뒤의 전체 판본 비교는 잔여다. |

## 같은 실제 자료의 브라우저 결과

JgN32v15SfgNUJFnmqvGe 실행 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/publication-series-draft-2026-09-13T15-59-43-645Z.json`)은 완료18확인, 문서 build 일치, console/page error0, 허용 밖 writer0이다. 원래 `겨울 주간 운동 · 조건 입력 검증`과 저장된 `작성 도구 복구 확인 · 공개하지 않은 초안`을 재사용했다. 기록을 초기화하거나 새 쉬운 예시로 바꾸지 않았다.

- 열 때 기존9메모 초안이 그대로이며 제목·소개·ID도 동일하다.
- 원본2개를 확인하고 취소하면 저장 bytes가 동일하고 확인 버튼에 초점이 돌아온다.
- 명시 정리로 원본 메모8개를 반복2개로 묶고 나머지 메모1개는 정확하게 보존한다.
- `전신 스트레칭`만 선택해 원래 화·목/8회/시작일과 시간을 미리본다. 공개 판본은 만들지 않는다.
- 저장 오류에서 마지막 성공 payload와 입력 중 `매주 ㅎ`을 유지한다. 재시도하면 이 비공개 미완성 입력이 저장되고, 수정 후 다시 미리본다.
- 새로고침은 마지막 성공 상태를 추가 쓰기 없이 읽는다. 공개 repository·전체 creatorWorkspace·개인 text·copies·회차 기록은 전후 동일하다.

375×812,390×844,844×390,1024×768,1440×900의 **미리보기와 수정 복귀 버튼**에서 가로 넘침0, 화면 안 위치와 hit-test를 확인했다. 폼 입력·실패·복구는375px에서 수행했다. 이 결과를 모든 폼/실제 기기의 전체 검증으로 확대하지 않는다.

375px 반복 폼 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-form-375-1789315187859.png`) · 375px 미리보기 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-preview-375-1789315187479.png`) · 1024px 미리보기 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-preview-1024-1789315187664.png`)

## 자동 검사와 경계

초기 표적86/86(새19개 포함), strict323/진단0, JgN32 build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T15-56-15-350Z.json`) PASS 뒤 전체141파일1,291/1,291 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T16-00-17-660Z.json`)·skip0·검사 중 소스 변경0을 확인했다.

그 뒤 fieldset 잠금과 해당 회귀1개만 보완했다. 최종 표적87/87(이번 새20개 포함), strict323/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T16-09-29-482Z.json`), 최종 build xD1OFoKfWkGu4I0sCCKWK (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T16-10-53-202Z.json`) PASS·소스 변경0이다. 전체1,291개는 최종 UI 잠금 보완 전의 결과이며 최종1,292개 실행으로 바꾸어 보고하지 않는다. npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T16-09-56-660Z.json`)는2,031실행/2,030PASS/기존 출처기한1FAIL(검토기한 경과9건)이다.

새 Program store 테스트는 실제 commit/load 포트에서 운영 fixture2키의 한글·공백·CRLF bytes를 보존하고, 성공1회/no-op0쓰기/stale0쓰기/실패0성공변경/손상 fail-closed를 확인한다. 브라우저 프로필의 운영 보호키는0개다. 브라우저의 허용 밖 호출0을 채워진 실제 운영 데이터 불변 증거로 과장하지 않는다.

코드 검토 중 새 반복 폼의 fieldset disabled가 기존 IME 입력 보호와 겹칠 수 있음을 추가 확인했다. 전체 회귀 종료 후 텍스트 잠금을 기존 native capture 포트가 맡도록 보완했다. disabled select와 텍스트의 보호 경계를 SSR 회귀로 확인했으며 실제 OS 조합 입력 검사는 아니다.

xD1O 최종 브라우저15확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/publication-series-draft-final-2026-09-13T16-12-47-767Z.json`)은 같은3행 초안·선택1항목을 이어 사용했다. 다섯 크기에서 반복 입력란의 초점/화면 위치/hit-test/넘침을 확인하고, 명시 시간대 편집→원본 재확인 no-op→미리보기→Escape→reload를 검사했다. 원본 시간대는 그대로이고 초안의 `Asia/Seoul`만 바뀌었다. 원문·공개·회차 기록 불변, console/page error0, 허용밖쓰기0, 보호키0이다.

375px 최종 폼 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-form-375-1789315970458.png`) · 844×390 키보드 초점 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-form-844-1789315970598.png`) · 1024px 최종 미리보기 (로컬 전용 근거: `../../../output/playwright/integrated-program/series-draft-final-preview-1024-1789315971182.png`)

기록/현재 소스6대조 (로컬 전용 근거: `../../../output/integrated-product-poc/publication-series-crosscheck-2026-09-13T16-14-30-630Z.json`)는 두 브라우저 실행판·2항목/16회차·초안/개인/공개 bytes·최종 build hash와 전체검사 이후 변경2파일(UI와 그 테스트)을 확인한다. 새 브라우저 테스트가 아니다. 최초 대조는 Windows 경로 구분자 비교로1건 실패했고 표기 정규화 후 통과했다. 제품 데이터를 고쳐 통과시킨 것이 아니다.

최종 기존 승인 실행201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T16-18-19-855Z.json`)·공개 표면19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T16-18-22-581Z.json`) 회귀도 통과했다. 보안 audit는 이번에 재실행하지 않았다. HTML 보고서는4개 실제 앱 캡처와 링크를 정적으로 확인했으며 URL 정책으로 보고서 자체의 브라우저 렌더는 미실행이다.

## 변경 파일

- 초안·검증·연결: [publication-series-draft.ts](../../../lib/flow/integrated-poc/publication-series-draft.ts), [public-recurrence-contract.ts](../../../lib/flow/integrated-poc/public-recurrence-contract.ts), [contract.ts](../../../lib/flow/integrated-poc/contract.ts), [program-data.ts](../../../lib/flow/integrated-poc/program-data.ts).
- 화면·기존 reader 대응: [ProgramPublisher.tsx](../../../components/flow/integrated-poc/ProgramPublisher.tsx), [ProgramPublicationRecurrence.tsx](../../../components/flow/integrated-poc/ProgramPublicationRecurrence.tsx), [ProgramCopyInspector.tsx](../../../components/flow/integrated-poc/ProgramCopyInspector.tsx), [private-space.ts](../../../lib/flow/integrated-poc/private-space.ts). 마지막 두 파일의 반복 표시/시작일 분기와 거절 경로는 공개 사본 회차 실행의 완료가 아니다.
- 자동 테스트: [ProgramPublisherSeries.test.tsx](../../../components/flow/integrated-poc/ProgramPublisherSeries.test.tsx), [public-recurrence-contract.test.ts](../../../lib/flow/integrated-poc/public-recurrence-contract.test.ts).
- 실제 검사: 초안18확인 스크립트 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-publication-series-review.cli.js`), 최종15확인 스크립트 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-publication-series-continue.cli.js`), 기록 대조 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-publication-series-crosscheck.ts`). 관련 현재 판정·진행·계획·요구/상황 원장·STATUS·HTML 보고서도 갱신했다.

## 다음 연결과 전체 목표

다음은 C/D의 실제 공개 사본 owner·회차 identity·개인 시작일/계획·기간 실행·완료/Undo·반복 출력과 제안/원본 비교다. 모두 준비된 후 공개 validator를 열고 같은 초안→불변 판본→다른 개인 사본→실제 출력→재진입을 검증한다. 반복 제안 편집도 현재는 명시 미지원이며 일회성 값으로 자동 축소하지 않는다.

Map 실제 삭제·다른 반복/과거 기록, 여섯 작성 틀 전체, 전체10상황과 두 전체 개선 루프는 남아 있다. 새 실행·전체 백업·재공개 정책은 확정하지 않았다. 실제 Android/iOS·OS IME·보조기술·외부 계정은 미실행, 관찰 사용자0명이다. commit/push/PR/merge/Preview/Production/외부 게시를 하지 않았다. 보고서 HTML 렌더 차단은 우회하지 않는다.
