# 공개 사본의 보존 계획과 정확한 문서 복귀

2026-09-14. 전체 목표 중 P02/P07/P08·S02/S09/S10의 연결 작업이다. [실행 순서](plan.md)와 [원본 판본 비교](public-source-facts-review.md)를 이어간다. 반복 제안·채택/전환·개인 계획 충돌/실제 공개부터의 전체 여정은 별도 잔여다.

## 원래 요구와 발견한 결함

| 원래 요구 | 발견 | 설계·구현 |
| --- | --- | --- |
| 개발1의 공개 사본, 개발2 반복 의미, v4.1의 개인 기록 보존 | 개인 계획 복구는 creator/saved binding만 찾았다. 공개 사본은 문서에서 보존 기록이 사라지고 전체 보기에서는 연결 문서를 찾지 못했다 | 정확한 copy/Flow/Item과 실제 유일한 원문 행을 읽는다. 정본·참조 문서는 같은 기록을 표시하고 원문 보기는 정본 행으로 간다 |
| 원본 변경/부재와 개인 기록을 구별 | 현재 공개 repository를 읽지 못해도 개인 원문과 보존 계획은 존재할 수 있다 | 원문 판본 읽기와 개인 위치 찾기를 분리한다. 중복/다른 Flow/없는 행에서는 대체 항목을 추측하지 않는다 |
| 원문 행·선택·키보드 작업 복귀 | 첫 브라우저에서 행 위치를 잡은 뒤 App 공통 이동이 초점을 main으로 다시 옮겼다 | 기존 `flowme-navigation/1`의 writing/focus에 명시 행 위치를 전달한다. 별도 RAF 경쟁·새 URL 인자·저장 schema를 만들지 않는다 |
| 읽기·단순 이동은 제품 데이터 변경0 | 후속 검사에서 원문 초점은 맞았지만 기존 문서 열기가 작성 위치를 제품 저장소에1회 기록했다 | 단순 열기는 위치 cache를 정규화하고 기존 화면 복귀 history만 사용한다. 실제 편집 때 위치 저장은 유지한다. 같은 실패 상태의 최종20확인에서 읽기/복귀/reload 저장0 |

UI는 기존 접힌 보존 기록과 원문 보기 버튼을 재사용한다. 새 카드·안내·Figma·CSS는 추가하지 않았다. 목록에는 개인 완료/날짜/포함과 이전 원본 기록을 구별해 남긴다. 정본 행이 보관 문서로 옮겨졌다면 실제 위치를 사용한다. 폴더 범위는 기존과 같이 정본의 실제 폴더를 따른다.

## 보존한 실제 실행 증거

- 준비5확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/plan-recovery-prepare-2026-09-13T22-53-13-466Z.json`): 기존49M7 프로필 revision23에서 같은 사본의 실제 개인 계획을 만들어24로 진행했다. 자료를 다시 주입하거나 초기화하지 않았다.
- 수정 전6확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/plan-recovery-before-2026-09-13T22-54-57-580Z.json`): 실제 완료25→항목 제외26. 정본·참조 문서에서 복구가 없고 전체 보기에서는 기록은 남지만 문서 복귀가 없는 결함을 확인했다. 공개 판본·원래 기록은 보존했다.
- 65Is 첫3확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/plan-recovery-after-2026-09-13T22-58-10-963Z.json`): 새 reader로 기록이 나타났지만 원문 복귀 초점을 잃어 중단했다. 실제 문서 build ID는65Is이며 route script DOM이 제거돼 recorder의 자산 판정은false였다. 이후 실제 resource timing에 동일 route chunk가 존재함을 확인했다. 당시 기록을 PASS로 재명명하지 않는다.
- kVlG 후속13확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/plan-recovery-after-focus-2026-09-13T23-03-59-043Z.json`): 정본·참조2문서에서 키보드로 정본의 정확한 두 번째 행 복귀와5크기를 확인했다. 허용 prefix 밖 쓰기는0이지만 작성 위치 저장1회로 revision26→27이 되어 읽기0변경 검사를 통과하지 못했다. 해당 상태를 그대로 보존해 이어간다.

새 RPR5개를 넣었을 때 정상 위치3개가 실패했고, 위치 helper 뒤 관련28개가 통과했다. 뒤이어 작성 위치 전달/기존 navigation·회차 초점까지32개가 통과했다. 첫 전체1402/strict334/build65Is는 초점 보완 전 소스다. 이를 이후 소스의 전체 통과로 재사용하지 않는다. 첫 typecheck 호출은 존재하지 않는 script 이름 때문에 실행되지 않았고 실제 `program-check.mjs`로 실행했다.

## 최종 판정 — O1dK 실행판

최종20확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/plan-recovery-final-2026-09-13T23-10-25-734Z.json`)은 실제 revision27에서 재개했다. 정본·참조2문서에서 같은 보존 기록을 읽고 Enter로 정본의 정확한 두 번째 행에 복귀했다.375×812·390×844·844×390·1024×768·1440×900에서 원문 보기 버튼은44px 이상·hit-test PASS·가로 넘침0이었다. 읽기·세 번의 정확한 복귀·reload는 저장0, 이후 명시Undo3회로 revision30이 됐다. 저장·소스29대조 (로컬 전용 근거: `../../../output/integrated-product-poc/plan-recovery-crosscheck-2026-09-13T23-14-00-837Z.json`)에서 준비 전revision23의 모든 개인 공간이 exact 복원되고 모든 공개 판본이 동일함을 확인했다. 모든 단계의 실제 store decoder·연속 상태·소스 해시를 검사했으며, 중간 두 실패를 지우거나 최종 PASS에 합산하지 않았다.

375px 캡처 (로컬 전용 근거: `../../../output/playwright/integrated-program/plan-recovery-1789341028952-after-375.png`)와 1024px 캡처 (로컬 전용 근거: `../../../output/playwright/integrated-program/plan-recovery-1789341029201-after-1024.png`)를 직접 확인했다. 기존 접힌 영역·한 개 원문 보기 버튼으로 기능을 연결했지만, 펼친 모바일 기록의 세로 길이와 넓은 화면의 빈 옆 공간은 여전히 개선 여지가 있다. 원문/개인 기록 구별과 정확한 다음 행동은 확인했으며 화면 전체의 사용성 완료로 판정하지 않는다. Figma는 사용하지 않았다.

자동 검사:

- 새 위치5개/작성 복귀4개를 포함한 최종 표적34/34. 기존 `writing-position`의 실제 handler 검사는 Space의 직접 RAF 초점을 기대해 중간 전체에서1실패했다. 기대를 삭제하지 않고 App의 실제 checkpoint 전달·정확한 offset·동일 data 참조/changed:false·누락/타인 거절까지 검사하도록 변경했다.
- 최종147파일1406/1406 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T23-08-48-980Z.json`), 실패/skip/소스 변경0. strict336/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T23-08-48-770Z.json`), production build PASS (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T23-08-25-756Z.json`), 실제 실행판 `O1dKugDkL1-_oKE1MdH-E`. 전체 검사1worker/256·4MiB, build1024·4MiB이며 검사나 소스 조건을 생략하지 않았다.
- npm2031중2030PASS/1FAIL (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T23-10-32-231Z.json`)은 기존 출처9건의 review_due 검사다. 승인201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T23-10-51-775Z.json`), 공개19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T23-10-54-294Z.json`)는 통과했다. 이전 audit의 의존성5건은 이번에 변경하거나 해결하지 않았으며 새 audit로 재명명하지 않는다.

49M7 이후 실제 제품/테스트 변경은9파일이다: `public-copy-recovery-location.ts`, `ProgramRecurrencePlanRecovery.tsx`와 테스트, `writing-navigation.ts`와 테스트, `writing-position.test.ts`, `ui-contract.ts`, `ProgramApp.tsx`, `ProgramSpace.tsx`. 현재365소스가 전체 검사/build/현재 파일과 일치한다. 전용 실행·기록 대조 스크립트와 spec/보고서는 별도 변경이다. 기존 `/my` gate·운영 writer/schema/key·공개 payload contract는 바꾸지 않았다.

종료 전 보호 검사에서는 기존4,781파일 중4,779 byte-identical·기존 승인 접점2개·예상밖 변경0을 확인했다. STATUS 본문 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-13T23-15-48-646Z.json`)는 PoC 안내4줄을 제외한 운영 이력의 원래 해시가 같음을 확인한다. 개발2 원본26파일819,423bytes·writer 모듈0, v11 vendor 무결성도 통과했다. 보고서 정적 검사190개/이미지4개 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-13T23-15-50-216Z.json`)는 실패0이며 HTML 자체의 실제 렌더 검사는 URL 정책 차단으로 미실행이다. 문서 검사와 범위 지정 closeout을 실행했고 Git HEAD는6e4b44fe 그대로다. 이 파일 보호 검사는 브라우저의 운영 key/value 검사와 다른 증거다.

## 남은 작업과 증거 경계

반복 제안/채택, 일반↔반복·개인 시작/계획 충돌 해결, 실제 반복 작성→공개부터의 연속 검증과 여섯 틀/Map 삭제·전체10상황/두 전체 개선 루프는 계속 남는다. 이번 reader 연결과 두 실제 결함 개선을 두 전체 개선 루프로 세지 않는다.

자동화/화면 검사와 실제 기기/관찰은 다르다. 운영 보호키가0개인 이 프로필을 채워진 운영 데이터의 불변 증거로 확대하지 않는다. 실제Android/iOS·OS입력기·보조기술·외부계정 미실행, 관찰사용자0명, commit/push/PR/merge/Preview/Production/외부 게시·운영 migration 미실행이다. 보고서 HTML의 기존 렌더 차단을 우회하지 않는다.
