# 작성 틀 결과 표시 — 원래 요구 대조

2026-09-14 · 실행판 `ukHIeIKxRcmfSvsIrY5lA`. 전체 목표는 진행 중이다.

## 적용한 요구

| 기존 요구 | 수정 전 | 지금 적용한 내용 | 남은 범위 |
| --- | --- | --- | --- |
| 실제 모든 Item에 일정이 있으면 Calendar, 미정이 있으면 Todo | raw 결과는 TXT로 시작 | 현재 포함된 실행 항목과 실제 일정으로 첫 결과 결정. 실제 첫 일정의 달부터 표시 | 여섯 틀 전체 입력과 실행/공개 연속 검증 |
| 운동 두 틀만 조건에 맞는 Sheet 제공 | raw/native 공통 결과에서 모두 노출 | 원래 catalog policy와 D2 projector eligibility 함께 적용 | 일반 작성의 네 보기와 기존 native 기본은 그대로 |
| 수정된 원문·포함/역할 유지 | template policy 미연결 | raw 작성만 파싱. native는 실제 저장된 canonical 구조를 그대로 읽음 | 복잡한 원본 업데이트 조합 별도 |
| 명시 선택·정확한 맥락 | raw 단일 navigation이 초안 사이에 공유됨 | actor/draft/materialization별 UI 선택. 같은 초안의 수동 선택 유지 | UI 선택을 새 운영/PoC 저장 schema로 만들지 않음 |
| 키보드·비드래그 | 공통 네 탭 순환 | 제한된 실제 탭만 Arrow/Home/End 순환, 세 탭은 세 칸 | 실제 보조기술/기기 미실행 |

원래 P0 명세 (로컬 전용 근거: `../../../../flow-text-authoring-writing-template-ux-review-20260829/docs/specs/2026-08-29-flowme-p0-structure-template-development-starter/spec.md`)와 [이번 연결 설계](creator-template-result-design.md)를 기준으로 했다. 예시의 기대값을 사용자 결과로 고정하거나 날짜·원문을 추가하지 않았다.

## 최종 선택 표시와 여섯 실제 작성물 — 2026-09-14

여섯 원래 fixture를 실제 폼으로 입력한 76확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/template-fidelity-six-resume-2026-09-14T06-13-58-370Z.json`)을 완료했다. 예시 열기/Escape 때 빈 원문 보존, 모든 setup·반복 group·하위 필드 입력, 정확한 예상 원문 미리보기/취소, 한 번의 native 적용과 Undo/Redo, 명시 저장/reload를 대조했다. 기존 초안 세 개·개인 문서·공개 판본은 바꾸지 않았다. 첫 label selector 오류로 생성된 빈 초안을 버리지 않고 revision137에서 재개해201까지 이어갔다. 감사 배열의65회는 앞선 빈 초안 생성1회를 포함한136→201 전체 기록이며 재개64회와 합산하지 않는다.

실제 여섯 캡처에서 선택된 탭의 색이 일반 버튼 CSS에 덮이는 결함을 발견했다. 제작 작업 공간의 선택된 result tab/native result button만 좁게 보완했다. 새 회귀1개를 포함한 155파일1,522/1,522 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-14T06-20-53-311Z.json`), strict349/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-14T06-23-41-627Z.json`), 최종 build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-14T06-21-04-154Z.json`)는 소스 변경 없이 통과했다.

최종 실행판 w_OZ의58확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/template-result-final-2026-09-14T06-31-58-243Z.json`)은 같은 여섯 저장 초안을 재사용한다. Calendar/Todo 첫 결과, 제공하지 않는 Sheet 제거, 키보드 Home/End, 사용자가 고른 TXT의 원문 왕복·다른 초안 왕복과 reload를 확인했다. 첫 운동 결과는375×812·390×844·844×390·1024×768·1440×900, 나머지 다섯 결과는1024×768에서 확인했다. 이 표본을 여섯 화면의 모든 크기 검사로 확대하지 않는다. 선택 탭 텍스트 대비는6.12:1, 핵심 탭44px 이상·가로 넘침0이다. 실제 저장은 초안 선택7회(201→208)이며 보기/키보드/크기/reload 자체의 쓰기는0, 원문 보관함·개인 문서·공개 판본은 동일하다. 운영 key0개·허용 밖 쓰기0·console/page0을 채워진 운영 실데이터나 실기기 증거로 확대하지 않는다.

- 최종375px 운동 (로컬 전용 근거: `../../../output/playwright/integrated-program/template-final-1789367529980-375.png`): 선택 상태는 구별된다. 월 달력 아래 실제 할 일이 첫 화면 밖에 있으며 상위 탐색·제작 단계의 중첩은 남는다.
- 최종1024px 여행 (로컬 전용 근거: `../../../output/playwright/integrated-program/template-final-travel-itinerary-prep-v1-1789367613692.png`): 날짜 있는 두 항목과 날짜 미정 한 항목이 함께 보이고, 할 일 탭 선택이 분명하다.
- 전체 npm2,031실행/2,030통과/기존 출처기한1실패 (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-14T06-23-42-188Z.json`), 승인201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-14T06-31-41-275Z.json`), 공개19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-14T06-31-44-441Z.json`). 기존 의존성 audit5건은 이번 재실행하지 않았다.

이는 작성 입력·결과 표시의 동등성 확인이다. 각 작성물의 개인 실행·실제 출력·선택 공개와 다른 Map/충돌, 전체10상황과 두 전체 개선 루프는 별도로 종결한다. 이 표시 결함의 평가→수정→재확인을 전체 개선 루프 하나로 세지 않는다. 아래는 이전 ukHI 실행판의 근거다.

## 실제 여행 자료의 수정 전후

수정 전 기존 실행판 snapshot (로컬 전용 근거: `../../../output/playwright/integrated-program/.playwright-cli/page-2026-09-14T06-05-39-747Z.yml`)은 TXT 선택·표 탭을 보여준다. 저장 revision136의 실제 여행 초안에는 `기준일 2026-12-10`, `D-3` 준비와 `2026-12-10` 일정이 있다. 첫 시도의 날짜를 raw에 직접 찾는 QA 가정은 잘못이었고, 원문을 바꾸지 않고 실제 기준일/offset 확인으로 수정했다.

- 첫 QA 중단 (로컬 전용 근거: `../../../output/playwright/integrated-program/template-result-current-2026-09-14T06-08-59-409Z.json`): 체크0·reload 이전 중단. 새 실행판 검증이 아니다.
- 같은 자료 최종15확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/template-result-current-2026-09-14T06-09-30-294Z.json`): 실제12/7 첫 일정·캘린더, 세 탭·Arrow/Home/End, 원문/결과 왕복과 reload. document build/route chunk 일치.
- 375×812,390×844,844×390,1024×768,1440×900: 결과 탭44px 이상·가로 넘침0. 저장 호출0, Program 전체 bytes 동일. 이 프로필의 운영 key는0개이므로 채워진 운영 자료 보호 증거로 확대하지 않는다.
- 375px (로컬 전용 근거: `../../../output/playwright/integrated-program/template-result-1789366176851-375.png`), 1024px (로컬 전용 근거: `../../../output/playwright/integrated-program/template-result-1789366181098-1024.png`) 실제 캡처를 검사했다. 세 탭은 읽기 쉽고 빈 네 번째 칸이 없다. 모바일 첫 화면에는 월 달력 아래의 실제 항목이 접힌 화면 밖에 있어 스크롤이 필요하다. 상단 메뉴·제작 단계·결과 종류의 중첩과 긴 화면 부담은 잔여다.

## 자동 검사

- 155파일1,521/1,521 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-14T06-04-58-687Z.json`), skip0·소스 변경0. 직전1,499보다22추가이며 새 pure/model17·presenter4·실제 parent handler1이다. 앞선 표적32는 이 parent 추가 전 부분집합이다.
- strict349/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-14T06-07-26-346Z.json`), production build PASS (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-14T06-05-54-286Z.json`).
- npm2,031실행/2,030통과/기존 출처기한1실패 (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-14T06-05-08-872Z.json`), 승인201/201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-14T06-06-30-231Z.json`), 공개19/19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-14T06-06-33-577Z.json`). 기존 audit5건은 이번 미재실행·미해결이다.

## 변경과 경계

새 `creator-template-result.ts`와 그 검사, `ProgramTemplateResultPresenter.test.tsx`, 기존 `ProgramCreatorWorkspace`/`ProgramCreatorNativeContext` 및 parent handler 검사, 공통 `PersonalWorkspacePocResultPresenter`의 optional 표시 port, 소스 검증 목록과 명시 접점·브라우저 검사·문서를 변경했다.

공통 presenter의 선행 readOnly 수정은 그대로 보존했다. 수정 전 전체 파일 (로컬 전용 근거: `../../../output/integrated-product-poc/result-presenter-before-template-policy.tsx`)의 SHA256과 좁은 diff를 확인한 뒤 세 번째 연결 접점으로 등록했다. 기준4,781파일 중4,778동일·정확한 접점3개·예상 밖0. 운영 writer/key/schema와 기본 `/my`는 변경하지 않았다.

여섯 틀의 전체 UI 입력·저장·실행/공개, 실제 Map 삭제, 복잡한 개인 충돌/종류 전환, 긴 화면/누적 응답과 같은 최종판 S01~S10·두 전체 평가/개선 루프는 남는다. 결과 표시 수정만으로 이들을 완료 처리하지 않는다. 실제 Android/iOS·OS 입력·보조기술·외부import 미실행, 관찰0. commit/push/PR/merge/Preview/Production·외부 게시 미실행. Figma 없이 기존 코드 화면을 재사용했다. HTML 보고서의 기존 URL 정책 차단은 우회하지 않는다.
