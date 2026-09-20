# S10 기존 자료 조회 준비

2026-09-14. [전체 실행표 S10](final-whole-loop-plan.md)의 합성 4origin 호환 준비와 조회 실행 기록이다. 실제 factory Map·제작 초안 경로와 구분하며 S10 전체 통과가 아니다.

기존 `program-s05-mgb-20260913`, `program-history-check`는 CLI list에 없고 각각 storage eval이 `browser is not open`으로 끝났다. 해당 daemon의 `.session`과 지정 workspace의 persistent profile도 찾지 못했다. 기존 세션을 다시 열거나 초기화하지 않았다.

## 새 QA 이관의 범위

`scripts/personal-workspace-poc/program-final-s10-transfer-fixture.ts`가 불변 `s05-same-copy-execution-mgb-2026-09-13T03-36-07-331Z.json`의 원문 9키와 Program wire를 현재 reader/codec/전체 validator로 다시 검증했다. 합성된 네 origin의 저장 자료이며 실제 factory 공개 이력이 아니다. 원문 bytes와 tuple, 연결 문서 4개, 전체 진행 기록 1개, Undo 5개를 보존한다. Program wire는 기록된 JSON 객체의 재직렬화이므로 과거 localStorage의 공백까지 복원했다는 뜻은 아니다. origin별 진행 기록이 비어 있으면 비어 있다고 기록한다.

최종 fixture는 `output/integrated-product-poc/final-s10-transfer-fixture-2026-09-14T13-27-01-971Z.json`이다. SHA-256은 `3add89b67c95b549f82e5a6e2b34070c4c2b1f0d2aa9c4b5bd24364dc6f33a29`, Program wire hash는 `1e39d522ee6b2441c626e4fc31b9bcb676e15ea950d059852010d17f6cd9086c`이다. 준비 시 단일 entry strict 177파일 진단 0, fixture 생성 검사 통과. 잘못된 origin·문서 참조·저장 schema 거절을 포함한다.

## 실행 전 승인 경계

새 세션은 `program-final-s10-transfer-20260914`, 절대 profile은 `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/output/playwright/profiles/program-final-s10-transfer-20260914` 하나로 제한했다. 아래 실행은 root가 전문을 검토하고 승인한 뒤 진행했다. 기존 profile은 재개·초기화하지 않았다.

`program-final-s10-transfer-setup.mjs`는 ARM 기본 false인 seed runner만 생성한다. seed는 현재 b9n document/chunk 확인, 새 단일 about:blank 페이지, local/session storage 빈 상태 확인 뒤 정확 10키를 한 번 쓴다. 이 쓰기는 QA 이관 준비로 따로 기록한다. 제품 boot 전에 감시를 설치하며 그 뒤 set/remove/clear 호출은 전부 0이어야 한다. 운영 형태의 9키는 이 새 QA profile에 복제한 보호 자료일 뿐 운영 저장소를 변경하지 않는다.

`program-final-s10-transfer-readonly.cli.js`는 각 origin의 목록→정확 원문→같은 개인 문서의 전체 본문→키보드 뒤로→reload를 검사한다. 매 단계 전체 storage bytes와 writer 호출을 대조한다. 실패 시 새 조작·재실행·재seed하지 않고 현재 상태를 인계한다. 제작 원문 선택은 working 저장을 유발할 수 있어 이 runner에 넣지 않았다.

## 승인 뒤 실제 실행

같은 `b9nco3rcs6kqfn9gSOGEA` document/chunk를 확인했다. root의 seed 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s10-transfer-seed-2026-09-14T13-36-27-692Z.json`)은 9개 확인, 새 profile의 정확 10키 QA seed, 제품 boot 쓰기 0이다. 이 초기 seed와 제품 writer 결과를 합치지 않는다.

첫 readonly 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s10-transfer-readonly-2026-09-14T13-36-37-748Z.json`)은 23개 확인 뒤 Alt+ArrowLeft의 예상 URL 대기 30초가 실패했다. 저장 bytes는 동일하고 쓰기는 0이었다. 이 실패를 지우거나 뒤의 성공으로 바꾸지 않는다. 첫 canonical-copy 개인 문서에 머문 revision6/hash를 읽기 전용으로 다시 확인했다.

root가 별도로 승인한 `program-final-s10-transfer-tail.cli.js`를 **한 번** 실행했다. tail 불변 결과 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s10-transfer-tail-2026-09-14T13-43-43-864Z.json`)는 112개 확인, errors/pageErrors/consoleErrors 0, 제품 set/remove/clear 호출 0이다. 기존 문서에서 실제 `page.goBack()`으로 원문에 복귀한 다음 네 origin의 앱 진입을 버튼 focus+Enter로 실행하고 브라우저 Back을 따로 확인했다. popstate/hashchange 이벤트와 전후 URL/history state를 기록했다. Alt 단축키 자동화의 전달 원인을 확정한 것은 아니며 실제 OS 단축키 통과로 세지 않는다.

| Origin | 같은 개인 문서 ID | 원문·개인 본문·왕복 결과 |
| --- | --- | --- |
| canonical-personal-copy | `legacy-flow-6c39f8542c99f2b8de55453ec117fc24` | source 전체 값·tuple, 개인 전체 본문·행 ID, Enter/Back 일치 |
| personal-draft | `legacy-flow-d24e476fe0b4140bf65bb109f2ee57bf` | source 전체 값·tuple, 개인 전체 본문·행 ID, Enter/Back 일치 |
| legacy-saved-plan | `legacy-flow-11ee40b34018df0fd3b20c5d551c7203` | source 전체 값·tuple, 개인 전체 본문·행 ID, Enter/Back 일치 |
| source-backed-map | `legacy-flow-53518601bec27c8d8be4371baa1a6fd1` | 합성 Map의 source 전체 값·tuple, 개인 전체 본문·행 ID, Enter/Back 일치 |

최종 reload도 revision6, Program hash `1e39d522ee6b2441c626e4fc31b9bcb676e15ea950d059852010d17f6cd9086c`다. 전체 10키와 그중 보호 9키의 bytes가 같다. 압축 Undo와 공개/개인 자료를 포함한 전체 wire도 같다. 각 legacy origin의 진행 기록은 0개이며, 별도 S05 항목의 2026-09-20 35% 기록 1개가 보존됐다. 네 origin 각각의 비어 있지 않은 진행 이력을 검증한 결과로 확대하지 않는다.

원문 disclosure를 캡처한 아래 네 화면을 직접 확인했다. 각 origin/source identity가 표시되고 예상 밖의 겹침은 보이지 않았다. 원문 JSON 일부를 보여 주는 viewport 캡처이며 전체 문서·모바일·전체 UX 평가를 대신하지 않는다.

- canonical-personal-copy (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-transfer-canonical-personal-copy-1789393425623.png`)
- personal-draft (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-transfer-personal-draft-1789393426184.png`)
- legacy-saved-plan (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-transfer-legacy-saved-plan-1789393426717.png`)
- source-backed-map (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-transfer-source-backed-map-1789393427437.png`)

## 따로 남는 근거

- 실제 factory Map의 삭제·복원·개인 기록 보존은 기존 Map profile의 `map-child-improvement-2026-09-14T13-05-59-842Z.json`과 분리해서 연결한다. 이번 합성 Map으로 대신하지 않는다.
- legacyCreator의 과거 current2/undo1 원문 및 개인 문서는 fixture의 `creatorEvidenceOnly`에만 있다. 전체 원래 envelope/Undo는 기록되지 않았으므로 새 자료에 합치거나 복원하지 않았다. 현행 browser 검사는 아직 미실행이다.
- ordinary profile의 현재 S07 제작 저장본과 개인 문서 연결은 별도 수행한다. 다른 저장본 선택으로 working 상태를 쓰는 경로를 읽기 전용으로 부르지 않는다.
- 실제 사용자 관찰, 외부 게시, 운영 migration, 배포 근거는 아니다. S01~S09 전체 운영 writer 대조도 이 한 runner로 대신하지 않는다.
