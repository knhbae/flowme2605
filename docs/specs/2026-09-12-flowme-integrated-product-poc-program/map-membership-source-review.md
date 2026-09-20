# Map 포함 선택·원본 수용·두 Undo 연결 검증

2026-09-13 · 실행판 `pO7OSfQ75aW5WKlX9wHT2`. 전체 목표의 P02/P03/P07/P08·S02/S05/S09/S10 중 아래 실제 조합을 검증했다. 제품 runtime은 변경하지 않았으며 새 회귀 2개, 브라우저 검사·근거 대조와 문서를 추가했다. 전체 개발1·개발2·개발3 동등성 또는 두 전체 개선 루프 완료가 아니다.

## 원래 요구와 이번 판정

| 원래 요구 | 원래 자료·같은 상태로 수행한 행동 | 판정과 경계 |
| --- | --- | --- |
| 개발1 Map의 포함·제외와 개인화 | 실제 오픽 Map의 1달 5항목/2주 14항목. 기존 공통10/10·하위 고정9/30, 개인 고정/미정·완료·메모·무관 문서를 유지하고 완료한 항목 복원과 다른 항목 제외를 한 revision에 저장 | 해당 조합 확인. 원래 자료를 쉬운 새 예시로 바꾸지 않았다. 오픽의 제목에 ‘반복’이 있다는 이유로 RRULE 회차를 만들지 않는다. |
| v4.1/개발3의 같은 개인 항목·과거 기록 | 위 선택 후 원본 비교→기록 보존 확인→원본Undo→reload→전역Undo→reload→같은 완료 표시 | 원본 선택과 최근 개인 포함 선택을 독립적으로 보존. 원본Undo의 revision/수정 시각 변경은 개인 내용 유실이 아니다. |
| 개발1·개발2의 원본 선택 수용 | 같은 사본에서 제외된 2일차 Step만 현재 제공된 구조화 원본으로 추가 수용. 나머지 미수용 12항목은 현재 원본 유지. 이후 개인 계획 재검토·같은값·reload | 원본 내용을 수용해도 제외한 항목을 자동 포함하지 않았다. 실제 제공된 기존 판본의 추가 수용이며 외부 새 게시·실시간 원본 수집·새 항목 추가/삭제 검증이 아니다. |
| 미확정 정책과 데이터 경계 | 기존 ALLBLANC 실제 단일 항목 하위 Flow의 전부 제외를 6크기에서 시도·비교·Escape | 저장 버튼 없음·안내·저장호출0. 전체 하위 Flow 제외 정책을 구현하거나 확정한 것이 아니다. 별도 개인 반복 계획·지난 완료와 보호5키 유지. |

원래 owner/tuple, 현재 원본과 개인 메모·날짜·진행·포함 선택의 구별은 [실행 계약](spec.md)을 따른다. 공개 URL이나 현재 원본 버전을 새 버전으로 꾸미지 않았고, 기존 운영 writer/key/schema를 바꾸지 않았다.

## 실제 브라우저 근거

- 첫 포함 선택 실행 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-membership-source-po7-2026-09-13T09-12-11-733Z.json`):15확인 뒤 계측 중복 assertion 실패. 6크기 선택·비교·Escape0쓰기, quota 후 선택 유지, 실제 revision22→23 저장은 기록에 남았다. 같은 상태를 초기화하지 않았다.
- 명시 원본Undo (로컬 전용 근거: `../../../output/playwright/integrated-program/map-membership-source-confirmed-po7-2026-09-13T09-16-26-019Z.json`):6확인 뒤 검사 범위를 잘못 잡은 assertion 실패. 원본Undo는 실제1호출/revision23→24로 성공했다. 개인 state에서 달라진 것은 `revision/updatedAt`뿐이다.
- 같은 저장 상태 재개11확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-membership-source-finish-po7-2026-09-13T09-19-34-042Z.json`) PASS: 개인 선택·원래 완료 유지, 원본Undo의 정확 reload, 전역Undo 1호출, 원래 원본 수용 상태·개인 선택 복원, 정확 reload와 완료 표시.
- 같은 제외 Step의 추가 원본 수용12확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-membership-incoming-resume-po7-2026-09-13T09-23-58-058Z.json`) PASS: 실제13개 미수용 차이 중1개 수용·12개 유지, 제외 상태·개인 기록/다른 인물 보존, 계획 재검토·같은값0쓰기·reload.
- 전체 하위 제외 경계25확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-empty-child-boundary-po7-2026-09-13T09-15-41-048Z.json`) PASS: 기존 반복/과거완료 프로필의 6크기에서 명시 거절·취소·저장0호출.

마지막 세 기록은 현재 실제 BUILD_ID와 route chunk가 일치하며 page/console 오류0이다. 오픽 프로필의 보호3키, ALLBLANC/에어컨 프로필의 보호5키는 각각 byte-identical이고 범위 밖 쓰기는0이다. 서로 다른 프로필의 키 수나 확인점 수를 합산하지 않는다.

### 검사 코드 오류를 제품 결함과 분리

1. 최초 진단은 document script만 수집해 지연 로드 route chunk를 누락했다. 실제 BUILD_ID는 이미pO7이었다. resource 목록을 함께 기록한 재진단2확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-membership-inspect-full-assets-po7-2026-09-13T09-10-07-980Z.json`)에서 일치했다.
2. 첫 검사 observer를 두 번 설치하면서 중첩 wrapper가 같은 전역 배열에 두 번 기록했다. 성공 저장 revision은22→23이다. 이후 observer는 별도 이름·중복 설치 방지·closure별 기록으로 바꿨다. 첫 기록의 물리 쓰기 수를 임의로 줄여 PASS로 다시 쓰지 않았다.
3. 첫 원본Undo 재개 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-membership-source-resume-po7-2026-09-13T09-14-45-459Z.json`)는 비교 진입 뒤 보존 확인 버튼을 누르지 않고 저장을 기다렸다. 저장0·입력/원본 보존은 정상 동작이다. 실제 확인 버튼을 거친 기록을 위에 분리했다.
4. 개인 내용 보호 assertion에 거래 revision/수정 시각까지 포함했다. 그 둘만 다름을 확인하고 개인 값은 그대로 비교했다. 모델 회귀도 원본Undo의 revision+1과 개인 값 불변을 각각 검사한다.
5. 추가 원본 수용 첫 실행 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-membership-incoming-po7-2026-09-13T09-21-48-168Z.json`)은 비동기 저장형 radio에 즉시 checked를 요구했다. 실제 같은 제안의 첫 선택은 저장됐으며 이후 클릭→성공 저장→선택 표시를 기다려 이어갔다. 새 제안/프로필로 바꾸거나 대기를 늘리지 않았다.
6. 첫 viewport 기록은 `height`에 버튼 높이를 덮어 썼다. 해당 필드로 실제 화면 높이를 추정하지 않았다. `viewportWidth/viewportHeight/targetHeight`를 분리한 오픽 읽기전용12확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-membership-viewport-po7-2026-09-13T09-33-04-180Z.json`)과 전체 제외 경계 재확인25 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-empty-child-measured-po7-2026-09-13T09-33-14-613Z.json`)에서 실제6크기를 측정했다. 둘 다 기존 성공 raw bytes와 모든 저장0을 유지한다. 정적 대조의 Windows 경로 구분자 차이도 파일 해시는 그대로 검사한 채 표시 경로만 정규화했다.

## 화면 평가

375×812·390×844·844×390·1024×768·1194×834·1440×900의 해당 포함 선택과 취소에서 키보드 초점·44px label/button·hit-test·가로 넘침0을 확인했다. 전체 앱·실기기·보조기술 통과로 확대하지 않는다.

주 검토자가 직접 본 캡처:

- 375px 복원/제외 비교 (로컬 전용 근거: `../../../output/playwright/map-plan-next/map-membership-preview-375-1789290735423.png`): 실행 버튼은 접근 가능하지만 14항목 아래까지 긴 스크롤이 필요하다.
- 1024px 원래 완료 복원 (로컬 전용 근거: `../../../output/playwright/map-plan-next/map-membership-restored-completion-1024-1789290890584.png`): 원래9/30 완료가 공통10/10으로 덮이지 않았고 같은 항목이 완료로 보인다.
- 1024px 원본 수용 후 계획 재검토 (로컬 전용 근거: `../../../output/playwright/map-plan-next/map-excluded-source-plan-review-1024-1789291521769.png`): 변경0개와 선택 적용의 의미, 원본 검토와 계획 검토의 관계를 읽는 부담이 남는다.
- 375px 미확정 전체 제외 안내 (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-whole-child-boundary-375-1789290946736.png`): 취소가 보이고 저장은 불가능하다. 정책 미정이라는 내부 표현을 실제 제품의 영구 UX로 확정하지 않는다.

이번 범위의 agent 평가: 기록/수정 범위 안전성4, 조작성4, 인지 부담3. 실제 사용자 점수가 아니다. 새 설명·카드·모달을 추가하지 않았고 기존 명시 확인·출처/품질 경계를 유지했다. 긴 목록·중복된 변경0개 표시·기술적 원문 JSON 비교의 부담은 남으며 이번 검증만으로 시인성/사용성이 개선됐다고 보고하지 않는다.

## 자동 검사와 다음 단계

새 모델 회귀2개를 포함한 `program-legacy-map-plan.test.ts`11/11 PASS, strict311진입/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T09-24-56-863Z.json`), 전체134파일1184/1184·skip0·검사 중 변경0 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T09-26-03-113Z.json`) PASS. 기록/현재 소스 대조10 (로컬 전용 근거: `../../../output/integrated-product-poc/map-membership-crosscheck-2026-09-13T09-35-45-155Z.json`)은 같은 실제 상태의 연속성·개인 값·운영 키·실측6크기·신규1184의 입력 일치를 확인했다. pO7 build 당시와 다른 통합 소스는 위 회귀 테스트 파일1개뿐이며 모든 runtime 파일/SHA256은 같다. 정적 대조10은 새 브라우저 실행이 아니다.

제품 runtime을 변경하지 않았으므로 이번에 npm test/build/audit를 다시 실행하지 않았으며 기존pO7의 npm2030/2031·출처기한1FAIL과 build PASS를 현재 재실행으로 표시하지 않는다.09:31경 원본 보호4781중4780동일/승인route1/예상밖0, D2 native26파일819423bytes불변·운영writer0, v11 source integrity를 재확인했다. 파일 보호와 브라우저 저장소 검사는 별개다.

다음은 기존 개발2의 병합/분할·상세 속성·원문/틀·저장 이력과 개인 실행/공개의 기능별 동등성이다. Map에 실제 새 항목이 생기거나 사라지는 경우의 명시 선택·기록, 더 긴 반복 조합은 별도로 남긴다. 이미 검증한 이 조합을 반복해서 전체10상황·두 개선 루프 완료로 세지 않는다.

실제 Android/iOS·OS IME·보조기술·외부 계정·관찰 사용자0. commit/push/PR/merge/Preview/Production·실제 외부 게시 미실행. 보고서 HTML 렌더는 URL 정책 차단을 유지하고 우회하지 않는다.

## 변경 파일과 보고서

- 모델 회귀: [program-legacy-map-plan.test.ts](../../../lib/flow/integrated-poc/program-legacy-map-plan.test.ts)에 위 두 실제 원본 회귀를 추가했다. runtime 함수·컴포넌트는 변경하지 않았다.
- 브라우저/증거: `scripts/personal-workspace-poc/`의 `program-map-membership-inspect.cli.js`, `program-map-membership-source.cli.js`, `program-map-membership-source-resume.cli.js`, `program-map-membership-source-finish.cli.js`, `program-map-membership-incoming.cli.js`, `program-map-membership-viewport.cli.js`, `program-map-empty-child-boundary.cli.js`, `program-map-membership-crosscheck.mjs`. 실패 시 실행된 원래 소스는 각 시간별 `.cli.js/.json/.log`에 별도로 남는다.
- 문서: 이 원장, [현재 판정](current-validation.md), [실행 순서](plan.md), [요구 원장](coverage-ledger.md), [상황별 종료](journey-closeout.md), [진행 원장](progress.md), 캡처 보고서 (로컬 전용 근거: `../../content-audit/2026-09-12-flowme-integrated-product-poc-review-ko.html`).
- 보고서 검사: 정적88/이미지4 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-13T09-37-25-648Z.json`), 문서 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-13T09-37-25-756Z.json`) PASS. 렌더는 미실행이며 실제 앱 캡처4개를 직접 확인했다.
