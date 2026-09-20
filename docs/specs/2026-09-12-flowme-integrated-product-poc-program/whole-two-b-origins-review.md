# 전체 흐름 2 — B 네 origin 읽기 왕복

2026-09-20. [전체 흐름 2 계획](whole-loop-two-plan.md) B의 기존 네 origin 문서 연결을 새 production build에서 확인했다. 이전 [S10 합성 자료](s10-synthetic-transfer-preparation.md)의 실제 보존된 전용 프로필만 사용했다. ordinary·실제 factory Map·개발2 프로필은 건드리지 않았다.

## 결과

`program-final-s10-transfer-20260914` 기존 프로필을 about:blank로 열고 같은 origin의 JS plaintext에서 제품 bootstrap 전에 Program key와 보호 9키의 정확한 hash를 대조했다. revision 6, Program SHA-256 `1e39d522ee6b2441c626e4fc31b9bcb676e15ea950d059852010d17f6cd9086c`가 이전 S10 마지막 기록과 일치했다. 새 observer `__wholeTwoBOrigins`를 설치했다. 종료와 재개 사이를 연속 감시한 것은 아니다.

각 개인 문서에서 `원본·개인 계획 확인`을 키보드 focus+Enter로 열고, 원문 disclosure의 전체 JSON을 정본 source와 비교한 후 `같은 개인 문서 열기`로 돌아왔다. 동일 문서 ID와 전체 본문, 원래 itemLines 대응을 확인했다.

| Origin | 동일 개인 문서 | 판정 |
| --- | --- | --- |
| canonical-personal-copy | `legacy-flow-6c39f8542c99f2b8de55453ec117fc24` | 원문·개인 본문·왕복 일치 |
| personal-draft | `legacy-flow-d24e476fe0b4140bf65bb109f2ee57bf` | 원문·개인 본문·왕복 일치 |
| legacy-saved-plan | `legacy-flow-11ee40b34018df0fd3b20c5d551c7203` | 원문·개인 본문·왕복 일치 |
| source-backed-map | `legacy-flow-53518601bec27c8d8be4371baa1a6fd1` | 합성 Map 원문·개인 본문·왕복 일치 |

새 연결·재연결·import·seed·초기화·제품 저장은 모두 0건이다. 모든 관찰 구간에서 local/session setItem·removeItem·clear 호출은 0건이었다. 마지막 reload 뒤에도 전체 10키의 문자열이 처음과 같았다. source·개인 문서·공개 자료·Undo를 포함한 Program wire가 byte-for-byte 동일하다.

각 origin에 직접 연결된 진행 기록은 원래 0개이며 그대로다. 별도 S05 항목의 `2026-09-20 / 35%` 기록 1개도 유지됐다. 이 결과를 네 origin 각각의 비어 있지 않은 실행 기록 보존으로 확대하지 않는다. 이미 연결된 자료를 읽었으므로 이번에 existing/new/source-only의 새 거래를 만들거나 검증한 것은 아니다.

## 실행 근거

- 첫 기록 `output/playwright/integrated-program/whole-two-b-origins-2026-09-20T05-39-46-765Z.json`: 8개 확인 후 QA가 raw wire의 압축 문서 목록을 해석된 문서 목록으로 취급해 중단. UI 진입 전 JS plaintext, 저장 0건이었다. 실패 기록을 보존했다.
- 후속 기록 `output/playwright/integrated-program/whole-two-b-origins-tail-2026-09-20T05-40-48-793Z.json`: **78개 확인 통과**, errors/pageErrors/consoleErrors 0, runtimeMatchesBuild true. 정본 fixture의 decoded privateDocument를 비교 기대값으로 사용했다. 정확한 실패 후 상태에서 기존 observer를 유지한 채 계속했고 재seed·reset하지 않았다.
- Fixture: `output/integrated-product-poc/final-s10-transfer-fixture-2026-09-14T13-27-01-971Z.json`, SHA-256 `3add89b67c95b549f82e5a6e2b34070c4c2b1f0d2aa9c4b5bd24364dc6f33a29`.
- 실행 build: `I0QgDqDV0FBDjrnqn_lci`, route asset `static/chunks/app/my/page-36dca8f5a25cbfe1.js`, origin `http://127.0.0.1:3641`.

보호 9키: `flow:map:saved:map-one`, `flow:operational:sentinel`, `flow:qa:whole:sentinel`, `flow:saved:copy:one`, `flow:saved:legacy-plan`, `flow:saved:map-child`, `flow:saved:url-draft-note`, `flow_builder_mvp_bundles_v11`, `qa-program-whole-installed`. 운영 형태의 키도 이 전용 QA 프로필에 이전 승인으로 이관된 합성 자료이다.

## 화면 확인과 범위

아래 1280×720 원문 disclosure 캡처 4개를 직접 열었다. 각 origin/source identity를 확인했으며 눈에 띄는 겹침은 없었다. 일부 상단 영역은 disclosure로 스크롤해서 화면 밖에 있다. 원문 전체 JSON은 내부 스크롤에 들어가므로 캡처만으로 전체 본문을 판정하지 않았고 자동 비교로 확인했다. 이 검사는 전체 반응형 화면 평가가 아니다.

- canonical-personal-copy (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-origins-2026-09-20T05-40-49-643Z-canonical-personal-copy.png`)
- personal-draft (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-origins-2026-09-20T05-40-49-643Z-personal-draft.png`)
- legacy-saved-plan (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-origins-2026-09-20T05-40-49-643Z-legacy-saved-plan.png`)
- source-backed-map (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-origins-2026-09-20T05-40-49-643Z-source-backed-map.png`)

최종 프로필은 revision 6, 같은 Program hash, generation `1789882859385.4`, observer offset 0, local-user다. 경로는 `#flowme/space/legacy-flow-53518601bec27c8d8be4371baa1a6fd1`이며 브라우저를 열어 둔 채 반환했다.

합성 네 origin 검증과 실제 factory Map 검증은 별개다. 제품 source/tests는 변경하지 않았다. 실제 기기 검사는 미실행, 관찰 사용자 0명이며 commit·push·PR·Preview·Production 배포는 진행하지 않았다.
