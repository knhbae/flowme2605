# 날짜·실행 상세 UX 결과

2026-10-04. 이번 목표는 날짜·진행 상세와 같은 Item 원문 복귀의 좁은 개선이다. 전체 UX·세 원천 요구 전체·피드백26개 완료가 아니다. 원본 요구50개를 DU01–DU07의 관련 부분에 연결한 [대조표](requirements.md)를 함께 읽는다.

## 구현한 기능

- 날짜·시간·적용·기존 shortcut은 상시 표시한다. 진행 기록과 연결·이동·순서는 기본 접힌 native details2개로 묶었다. 접힘 내부 입력/기능을 제거하지 않는다.
- 같은 Item의 `원문 열기`는 기존 원문 행 locator를 사용한다. 같은 제목의 다른 Item을 잘못 고르지 않으며 조회만으로 저장하지 않는다.
- 미적용 날짜·시간·진행 입력이 있으면 원문 이동을 막고 적용 또는 닫아 취소를 안내한다. 연속 저장·동일 과거 기록의 무변경 성공도 guard를 갱신한다.
- 늦은 저장 응답은 같은 dialog의 제출값만 clean 기준으로 받고 새 입력·다른 dialog를 덮지 않는다. 거절 시 입력을 유지하고 직접 다시 적용할 수 있다.
- 새 상세 창은 처음 위치에서 열린다. sticky 제목/닫기와 스크롤 여유를 확보했다. 기간 밖으로 사라진 행의 창을 닫으면 현재 보이는 기간 버튼으로 초점을 돌린다.
- 기존 날짜 의미·memo·progress·owner·Undo/Redo·reload·parser/writer/schema/identity는 유지한다.

## 변경한 파일

제품 runtime은 `components/flow/integrated-poc/ProgramSpace.tsx`, `ProgramSpace.module.css` 두 파일뿐이다. 새 상세 회귀와 기존 context/date-roundtrip/private-schedule 테스트3개, 합성 fixture와 CLI QA·결과 직렬화·전용 서버 준비 코드, 이 spec 묶음과 canonical STATUS/SERVICE_STRUCTURE/spec index를 수정했다. 정확한 경로는 [소유 원장](manifest.md)을 따른다. 기존 dirty·미추적 작업본은 수정·삭제·stage하지 않았다.

## 자동 테스트 — 최종 동결 source

build `jAYFY3t3SI-FCYcsQvJG_`, baseline HEAD `a30ab173788f5d9ac4dd553bf8e85073546cf20a`, branch `agent/alpha-date-detail-ux-20261004`의 미커밋 후보다. build/type/npm 실행 중 source 변경0 및 앱 결과를 기록할 때 build source hash drift0을 확인했다.

| 실행 | 실제 수·판정 | 로컬 원본 |
| --- | --- | --- |
| 관련 표적 | 82/82 PASS, 실패/취소/skip0 | `output/playwright/date-detail/targeted-unit-frozen-82-20261004.log` |
| fixture self-check/차단 gate | 신규2+기존4=6/6 PASS. 앱 시나리오 아님 | `output/playwright/date-detail/fixture-unit-final.log`의 실제 footer를 QA 원장과 대조 |
| npm test | 2,261/2,261 PASS, 실패/취소/skip0, source drift0 | `npm-test-2026-10-04T13-28-19-145Z.json/log` |
| 통합 추가 suite | 3,071/3,071 PASS, 288파일/2worker/512MiB, 실패/취소/skip0·source drift0 | `new-tests-2026-10-04T13-27-55-817Z.json/log` |
| 타입 | entry589/source664, diagnostics0/drift0 | `output/integrated-product-poc/targeted-types.json` |
| production build | exit/verified exit0, source drift0 | `build-2026-10-04T13-28-07-062Z.json/log` |
| 실제 앱 합성 CLI | core40 + faults9 + 긴 제목12 = 61/61 PASS | `output/playwright/date-detail/app-summary.json` 및 phase별 JSON/CLI log |
| 별도 조작 HTML | 32/32 PASS, 5viewport | `output/playwright/date-detail/prototype-results.json` |
| docs/closeout | 문서4/4 PASS·closeout exit0·diff check 성공 | 문서/소유 경로 마감은 [QA](qa.md) 참조. closeout 자체를 실행 테스트로 세지 않음 |

표적·npm·통합 실행은 서로 겹칠 수 있으므로 합산한 수를 고유 테스트 수로 쓰지 않는다. 기존43 PASS·CI4·운영7을 이번 새 실행에 합치지 않았다.

## 시뮬레이션별 결과

| 시나리오 | 실제 앱 결과·보호한 내용 |
| --- | --- |
| 상세 진입·접기/펼치기 | D01A/D01/D02/D04/D05/D08 PASS. 날짜 상시·이름 있는 dialog·Enter/Space·입력 DOM/값 유지 |
| 동일값·Escape | D03/D07 PASS. commands0·합성 account bytes 동일 |
| 날짜/시간만 변경 | D09/D10 PASS. 기존 시간-only hint·정확한 Item·구획·memo·peer·progress 보존 |
| 연속 진행·과거 기록 재적용 | D11–D14 PASS. 누적 날짜별 기록·성공 guard 해제·동일 기록 commands0 |
| Undo/Redo | D15/D16 PASS. 마지막 성공 진행만 되돌리고 원문/진행/ID를 기존 경로로 복원 |
| 같은 제목의 원문 복귀 | D00/D17 PASS. 서로 다른 canonical ID, 두 번째 Item의 정확한 source offset·editor focus·commands0 |
| 기간 밖 날짜 이동·닫기 | D18 PASS. 행 제거 후 visible 주간 button focus·닫기 commands0 |
| reload | D19 PASS. 마지막 성공 날짜·memo·progress·canonical ID·peer 의미 복원 |
| 늦은 일정/진행 응답 | F01–F03 PASS. 제출값 저장과 더 새 입력/미적용 guard를 구별 |
| 거절·직접 재시도 | F04–F06 PASS. 실패 account 불변·입력 유지·자동 retry0·사용자 재적용 성공·이전 오류 소멸 |
| 거절 후 취소 | F07 PASS. 두 번째 거절 뒤 Escape, 성공 account 유지·추가 commands0 |
| 긴 제목·키보드 | 375×812,844×390,1440×900에서12판정 PASS. 기본216+복귀확인3=219 실제 Tab/Shift+Tab 입력. 문서 밖 전이3건 모두 다음1회 동일 방향 입력에서 열린 dialog로 복귀. 이를 Chrome 특정 UI 관찰로 단정하지 않음 |

순차 이동 끝에서 브라우저 자체 UI로 넘어갈 수 있는 [HTML 표준](https://html.spec.whatwg.org/multipage/interaction.html#sequential-focus-navigation)을 확인했다. QA는 문서에 초점 없는 BODY 전이를 별도 기록하고 최대2회 내 같은 열린 dialog 복귀를 요구한다. 문서 초점이 있는 BODY·dialog 밖 DOM·미복귀·가려진 앱 controls는 계속 FAIL이다. 단순 예외로 영구 초점 소실을 통과시키지 않는다.

## 브라우저 화면별 평가

| 화면 | 이번 상세창 평가 |
| --- | --- |
| 390×844 | 날짜/시간 한 열·48px 조작·접힘/펼침·가림 검사 PASS |
| 375×812 | 한 열·shortcut 줄바꿈 PASS. 원문 버튼은 초기 하단에서 스크롤이 필요하지만 도달/hit PASS |
| 844×390 | 날짜/시간 두 열·내부 세로 스크롤·고정 닫기 PASS. 모든 기능을 동시에 한 화면에 압축하지 않음 |
| 1024×768 | 두 열·기존 dialog 폭·접힘/펼침 PASS |
| 1440×900 | 기존 workspace 위 dialog·날짜 우선·접힘/펼침 PASS |
| 추가600×800 | 480/760 breakpoint 사이의 padding·두 열·header 조합 PASS |

core의 각 화면에서 document/dialog 가로 overflow0, 핵심 buttons/summaries 최소44 이상(실제48), scroll 후 center hit·viewport 안에 있음 확인. console/page error0. 실제 캡처를 열어375/390·844 가로·600·1024·1440 및 긴 제목375/844를 검사했다. 아래 [UX 검토](ux-review.md)는 HTML/앱 비교와 의도적 편차를 분리한다. 자동 검사나 캡처를 관찰 사용자 평가로 표현하지 않는다.

## 기존 운영 데이터 불변 증거

격리 fresh 브라우저의 가상 origin에서 실제 앱 정적 GET만 전용3115로 전달했다. 모든 Auth/account/API 응답은 합성이고 실제 backend 전달0이다. core/faults/긴 제목 모두 기존 storage sentinel key/value byte 동일·public source 동일, 허용되지 않은 storage 호출0·clear0·page/console error0이다. 성공 commands6(core), 같은 맥락의 faults 종료 누계11, 별도 긴 제목0은 합성 명령 수다.

실제 운영 DB·다른 브라우저의 `flow:*`를 읽어 전후 비교한 것은 아니다. **실DB byte 비교 NOT_RUN, 실제 API 쓰기0**으로 구분한다. existing catalog pack은 read-only external fixture로 사용했고 SHA256 `723ABEFDC26243EB1F9B4BCF21730758ECC7A300494AD2AE75293AC5C6DDE4BE`가 전후 동일하다. 제공 worktree·3105·관리13105·지원3106/3107에는 변경/종료 요청을 보내지 않았다.

## 중간 실패와 수정

초기 상세 테스트의 stale 대상 progress baseline, 반복 ACK의 ref-only 렌더 누락, reopened scroll, 좁은 펼침 sticky 가림을 수정했다. 중간 실제 앱390 펼침 FAIL2회와 geometry/raw를 보존하고 최종 후보에서 다시 검사했다. 긴 제목 첫 QA는 native 순회 중 문서 밖 전이를 앱 control처럼 평가해 FAIL했고, 초점 상태·전후 raw·2회 내 실제 키보드 복귀 조건을 추가한 새 실행을 기록했다.

초기 suite의 catalog fixture 미지정, 검사 중 source 변경에 따른 guard 실패/중단, test 타입 narrowing1건, 설치 후 SDK debug probe patch/cache 미반영에 따른 금지 storage 탐지, 256MiB 통합 worker2개 heap 종료도 원본 로그에 남겼다. 성공 footer만 뽑아 이전 FAIL을 지우지 않았으며 제품 parser/SDK dependency/lockfile·운영 제한을 바꿔 통과시키지 않았다. SDK는 기존 pinned postinstall patch와 owned cache 이동 후 새 build로 검사했다.

## 남은 결함·의사결정 / 다음 목표

이번 수용 범위 밖: 전체 workspace·작성 UX 밀도, 반복 한 회/전체·독립 due·자유 문장 날짜 미정·폴더 정책, 모든 source origin 재검사, 물리 날짜 picker·IME·AT·Android/iOS. 전체 보류 원장은 직전26 피드백/세 원천 원장을 따른다. 이번에 새 정책을 확정하지 않는다.

다음 목표는 **검증한 날짜·실행 상세 후보의 선별 게시·정확 게시판 QA·개발계 반영**이다. 정상 hook·해당 비공개 CI·정확 build QA·운영 실행자와의 안전한 전환/복귀를 별도 승인 범위로 다룬다. 현재 미커밋 검증 결과가 이후 commit/build의 PASS를 대신하지 않는다.

| 구분 | 이번 실제 상태 |
| --- | --- |
| commit | 미실행 |
| push | 미실행 |
| PR/merge | 미실행 |
| Preview | 미실행 |
| 개발계 교체 | 미실행. 기존 PR212 제공본 유지 |
| Production | 미실행 |
| 실제 Android Chrome/iOS Safari | 미실행 |
| 관찰 사용자 수 | 0명 |

원본 logs/screenshots/trace/JSON은 `output/`의 로컬 전용 근거다. 이를 공개 Git에 자동 포함하지 않는다.
