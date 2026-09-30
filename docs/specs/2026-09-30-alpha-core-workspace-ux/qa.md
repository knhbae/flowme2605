# 검증 원장

상태: **이번 개선·재검증·보고 묶음 완료**. 2026-09-30 확정 저장 거절 뒤 직접 재시도와 주기적 조회로 상태가 바뀌던 두 결함은 수정 후 재검증했다. 별도 결과 미확정 재시도에서는 저장은 성공했지만 화면에 충돌·미저장 표시가 남는 UX 문제가 확인되어 미해결 후속으로 남긴다. 전체 동선이나 요구 충족률은 계산하지 않는다.

## 기준점

HEAD `2b798d4373bc7c3528302ef5656e02acafe2a891`, detached·modified31/untracked54. 기존 개발계 일반 앱3105·Tunnel20249 보호. 개인 `.tmp`/설정·원문/DB/Auth 접근을 하지 않는다.

실제 `AlphaWorkspace`·`ProgramSpace`·편집기와 모델/CSS를 별도 fixture로 묶어 Chromium에서 조작했다. 인증·계정 조회·저장 명령은 메모리 가짜 저장소로 처리한다. 실제 Supabase/Auth/RLS, Next 서버의 실제 저장 경로를 검증한 결과가 아니다. fixture는 localhost:3104만 사용하며 개발계 일반 앱 3105·Tunnel 20249를 교체하지 않는다. mode/run별 localStorage·sessionStorage 격리는 QA adapter에만 있다.

증거 폴더: `output/playwright/alpha-core-workspace-ux/`. 아래 파일명은 이 폴더 기준이다. 로그와 JSON은 로컬 QA 산출물이며 배포나 관찰 사용자 증거가 아니다.

## 자동 검사

| 검사 | 이번 실행에서 확인한 값 | 근거·범위 |
| --- | --- | --- |
| 최종 `npm test` | PASS: 17개 실행 요약 합산 2,625회 실행·통과, 실패 0 | `npm-test-final2.log`·exit 0. 스크립트 간 중복을 포함한 실행 횟수이며 고유 테스트 수가 아니다. 이전 `npm-test.log`의 2,622회를 합산하지 않는다 |
| 최종 표적 회귀 | PASS: 131회 실행·통과, 실패 0 | `targeted-final.log`·exit 0. 수정 파일 관련 7개 묶음과 controller/client 포함. 이전 137회 및 `rejected-draft-refresh-tests.log`의 37회는 겹치므로 합산하지 않는다 |
| 이번 목표의 신규 회귀 | 41개 추가 | 폴더 5·합성 조합 5·개인공간 7·편집기 5·Alpha shell 7·controller/client 12. 변경 담당의 항목별 대조 기준이며 위 실행 합계에 다시 더하지 않는다 |
| 문서 검사 | 최종 PASS: 테스트 4개, 필수 파일 16개·로컬 링크 6,716개 | `docs-check-final.log`·exit 0. 선행 6,697개와 합산하지 않는다 |
| 최종 프로덕션 빌드 | PASS: Next 15.5.25, 컴파일 6.7초, 타입 검사·정적 페이지 18/18·최종 trace/경로 출력 완료 | `production-build-final2.log`·exit 0. 격리 `.next-core-workspace-ux-20260930`과 output의 별도 tsconfig 사용. 실행 중인 일반 앱의 `.next`를 교체한 결과가 아님 |

별도 관련 검사 168개 중 163개 통과·5개 catalog-pack missing 실패는 다른 담당의 메시지로 전달받은 한계다. 이 원장의 원본 로그 재검토 대상에는 해당 로그가 없으므로 독립 확인 결과로 쓰거나 최종 131개와 합산하지 않는다. 초기 테스트·빌드 성공을 이후 코드 수정의 성공으로 이월하지 않는다.

## 브라우저 관측

| 검사 | 판정·관측값 | 증거 |
| --- | --- | --- |
| 빈 공간에서 문서·폴더·할 일 작성 | PASS: `합성 작성 시나리오` 문서, 본문 폴더 연결, 날짜 있는 일과 날짜 없는 일 생성 | `after-folder.json`, `scheduled.json` |
| 이름 있는 폴더 줄 중복 | 수정 전 제품 결함 재현 → 수정 후 PASS: 이전은 `- 새 폴더` 2줄·서로 다른 ID. 이후는 1줄이며 revision 2→3에서도 같은 line ID 유지 | `before-folder-duplicate.json`, `after-folder.json` |
| 날짜·시간·메모 저장 | PASS: 작성 확인에 2026-09-30·10:15, 메모 `줄바꿈과 한글 보존` 저장. 날짜 없는 일도 유지 | `scheduled.json`, revision 5 |
| 메뉴 취소·같은 위치 | PASS: 취소 mutation 증가 0, 같은 위치 mutation 증가 0 | `cancel.json`, `same-location.json`. 모든 메뉴/Escape 조합의 전수 검사 의미는 아님 |
| 날짜 변경·시간 삭제 | PASS: 2026-10-01로 이동하고 시간 속성 줄 제거, 같은 task/날짜/메모 line ID 보존 | `date-moved-time-cleared-valid.json`, revision 10 |
| 날짜·시간 Undo | PASS: 2026-09-30·10:15와 원래 시간 line ID까지 복원, 메모·폴더·다른 할 일 보존 | `time-clear-undo-valid.json`, revision 11. 앞선 날짜만 되돌리기는 `date-undo.json`, revision 9 |
| 원문 복귀·reload | PASS: 문서·line ID·원문·날짜·시간·메모·기존 진행 기록 복원. revision 9, operation 9, reload 이후 추가 저장 0 | `reload.json`. revision 11 이후 재로드, 새 브라우저 context 재진입은 이 파일로 증명하지 않음 |
| 완료·재열기 | PASS: 같은 task의 2026-09-30 진행률 100%를 오늘/주간/월간에서 유지하고 Enter 재열기 뒤 0%로 변경. revision 1→2, operation 1회 증가 | `period-complete-reopen-valid.json`. 세 보기에서 같은 task ID와 날짜 유지 |
| 오늘·주간·월간·경로 | PASS: 오늘, 주간 2026-09-28~10-04, 월간 2026-09-01~09-30 범위 표시와 완료 일치. `업무 / 검토 / 회의 준비`, `미분류 / 개인 메모` 경로 표시 | `period-complete-reopen-valid.json`. 모든 기간 경계·동명 조합 전수 검증은 아님 |
| 모바일 폴더/검색 필터 해제 | PASS: 라이브러리가 접힌 상태에서 `미분류 · 하위 포함`, `검색: 없는검색어`를 표시. 필터 해제 후 결과 복귀, 조회 날짜 2026-09-30 유지, mutation 증가 0 | `filter-clear-valid.json` |
| 합성 한국어 조합 이벤트 | PASS: 조합 중 mutation 증가 0, 주변 5행 visible, 활성 mirror 행만 hidden, 활성 구간 높이 88px·64~152px mask. 조합 종료 후 mutation 증가 1, 긴 한글 입력·기존 line ID·속성 유지 | `composition-during.json`, `composition-end.json`, `composition-during.png`. 실제 OS IME 검증 아님 |
| Tab/Shift+Tab 역연산 가정 | 검사 기대 실패 보존: `restoredRaw=false`. 하위 트리를 처리하는 기존 동작 때문에 두 키를 역연산으로 가정한 원문 복원 assertion이 성립하지 않음 | `keyboard-indent.json`. 제품 결함이나 전체 키보드 통과로 재분류하지 않음 |
| 편집기의 Undo | 제한적 PASS: 편집기 원문 `rawRestored=true`, 서버 revision 0·operation 0 유지 | `keyboard-undo-valid.json`. 구조 내어쓰기의 최초 저장은 기존 보호 정책으로 거절되었으며 편집기 자체 Undo로 입력만 복구했다. 서버에 저장된 변경의 Undo 성공으로 확대하지 않음 |
| 확정 저장 거절 시 입력 보존 | PASS: 합성 `invalid` 거절 후 화면 입력은 남고 `sameCommitted=true`, 저장 판본 14 유지 | `rejected-draft.json`. 확정 거절이며 결과 미확정 네트워크 실패와 다름 |
| 확정 저장 거절 후 직접 재시도 | 수정 전 FAIL → 최종 PASS: 원문 입력 보존, 거절 전후 revision 1 유지, 실제 `다시 저장` 버튼 클릭 후 revision 2·operation 1회 증가. 저장됨 표시 확인 | 실패 보존 `retry.json`, 최종 성공 `rejection-button-final.json`. 거절 request와 새 저장은 구분 |
| 확정 거절 상태의 주기적 조회 | 중간 수정에서 FAIL → 최종 PASS: 조회 5회 후에도 `저장 거절 · 입력 보존됨` 유지, revision 0·operation 0. 입력 수정 후 자동 저장 revision 1, reload 원문·판본 1 보존 | `retry-fixed-success.json`은 이름과 달리 poll 후 충돌로 바뀐 실패 자료. 최종 `rejection-final2-before.json`, `rejection-final2-after-poll.json`, `rejection-final2-success.json`, `rejection-final2-reload.json` |
| 결과 미확정 상태의 같은 요청 재시도 | 저장 부분 PASS·화면 UX FAIL: 주입 request ID와 receipt ID 일치, revision 0→1·operation 1로 저장, 원문 입력 소실 없음. 그러나 같은 화면에 충돌 안내와 `저장되지 않은 입력`이 남음 | `unknown-same-request.json`. 확정 거절 수정과 별개인 **미해결 UX 후속**. 실제 서버의 응답 유실/네트워크 장애 검증은 아님 |

## 화면 크기와 경계

`five-sizes.json`은 390×844, 375×812, 844×390, 1024×768, 1440×900에서 오늘/상세창/문서 각 3개, 총 **15개 화면 측정**이다. 가로 넘침은 15/15 false, 상세창 자체 넘침은 5/5 false, 상세 행동 버튼 접근과 편집기 접근은 각각 5/5 true다. 이를 사용자 시나리오 15개 또는 실제 기기 5대 통과로 표현하지 않는다. `today-*`, `dialog-*`, `document-*` PNG는 해당 크기의 화면 산출물이다.

검토한 QA snapshot에서 `storageforbidden=[]`, `errors=[]`, `blocked=[]`, `operationalUnchanged=true`, `remoteWrites=0`, `realAccounts=0`을 확인했다. 원래 운영 key를 모사한 `flow:saved-plans`, `flow:completion:v1`, `other-app:key`의 sentinel 값은 비교 전후 동일하며 PoC prefix 밖 set/remove/clear는 0이다. 이것은 격리 브라우저의 합성 sentinel 보존 증거이지 실제 사용자 storage를 읽어 검증한 결과가 아니다.

`calls` 안의 Supabase 주소와 RPC 이름은 fixture가 native fetch 전에 가로챈 요청 기록이다. 실제 인증/DB 호출 횟수로 세지 않는다. fake-server의 `mutations`는 페이지를 다시 열면 0으로 초기화되고 `operations`는 보존되므로 누적 저장 횟수와 구분한다. 입력 거절·키보드 기대 실패가 있어도 console/page error는 없을 수 있으며 경계 검사 성공이 기능 성공을 뜻하지 않는다.

## QA 도구 오류와 제외 증거

- 초기 CSS bundling이 일반 `text-editor.css`의 `.tle-*` 이름까지 바꿔 편집기 화면을 잘못 표시했다. 일반 CSS/모듈 CSS 처리를 분리한 뒤 재검사했다. `before-390.png`만으로 제품 결함을 판정하지 않는다.
- 초기 fixture는 fake account만 mode/run별로 나누고 제품 recovery key를 공유했다. 두 모드가 섞이는 문제를 QA Storage adapter에서 수정했다. 이후는 전체 PoC get/set/remove를 mode/run별로 매핑하며 기존 key를 삭제하지 않는다.
- `date-moved-cleared-time.json`은 Windows CLI에서 빈 인자가 사라져 시간 삭제가 실제 수행되지 않은 시도다. 파일 이름과 달리 10:15가 남는다. 도구 진단 자료로 보존하며 시간 삭제 성공 근거에서 제외한다. 실제 빈 입력으로 다시 조작한 `date-moved-time-cleared-valid.json`만 성공 근거다.
- 확정 `invalid` 거절 후 재시도 정체와 poll 후 충돌 전환은 제품 결함으로 재현한 뒤 최종 수정에서 해결했다. 실패 파일을 삭제하거나 성공으로 재분류하지 않는다.
- `rejection-final2-success.json`에서는 입력 수정으로 자동 저장이 먼저 끝나 버튼이 사라진 뒤 CLI 버튼 클릭이 시간 초과됐다. 이 파일은 자동 저장 성공 근거이며 직접 버튼 성공 근거가 아니다. 실제 버튼 클릭은 별도 `rejection-button-final.json`으로 확인했다.

## 남은 확인과 범위 밖

확정 거절→입력 유지→조회 유지→재저장 및 reload의 후속 검증과 최종 회귀·빌드는 완료했다. 결과 미확정 `unavailable`을 같은 요청으로 다시 저장한 뒤 mounted editor의 충돌/미저장 표시가 남는 문제는 해결되지 않았다. 입력 소실·중복 저장으로 관측되지는 않았지만 저장 성공을 화면이 일관되게 확인해 주지 못하므로 UX 후속으로 유지한다. 지연 저장, 모든 선택·스크롤 위치 보존, 새 browser context 재진입, Tab/Shift+Tab 하위 트리 조합 전수 검사는 미검증이다.

## 보고서 검사와 호스트 보존

[HTML 결과 보고서](../../content-audit/2026-09-30-flowme-alpha-core-workspace-ux-ko.html)는 기존 보고서의 색/타이포/반응형 틀을 재사용했다. 실제 1440×900·390×844에서 렌더링하고 화면을 직접 검사했다. 페이지 가로 넘침 false, 로컬 이미지 2/2 정상, 재로드 후 console/page error 0이다. 모바일 표의 좁은 첫 열을 실제 화면에서 발견해 항목별 읽기 형태로 수정하고 다시 검사했다. 근거는 `report-valid-1440.json/png`, `report-final-390.json`, `report-final-verification-390.png`, `report-valid-remaining-390.png`다. `file:` 접근 거절 뒤 생긴 `report-1440/390` blank 캡처는 보고서 성공 근거에서 제외한다. 별도 loopback fixture의 정확한 보고서/이미지 whitelist로 검사했으며 디렉터리 전체나 개인 파일을 노출하지 않는다.

마감의 읽기 확인에서 일반 앱 PID5656·Tunnel3864, loopback3105·20249와 `/alpha` HTTP200이 유지됐다. `.next/BUILD_ID`는 `OzumXeWoxE3M0moIOghh_`다. 시작 전/최종 빌드 후 아래 SHA-256이 같았다. 개인 설정과 운영 storage/DB는 읽지 않았으며 실제 계정 전체 불변의 새 증거로 확대하지 않는다.

| 보호 파일 | 동일 SHA-256 |
| --- | --- |
| next.config.ts | `1CE157C7A1FF8A5446B5F8283CC6F13B3808AD7762A1C4266B217DB72ECCCB8C` |
| next-env.d.ts | `F4E8976C19FC926644D72610BF1058BD6BF52ADD97E46A02BC0B912A751625C0` |
| tsconfig.next.json | `16EF34D671D2B9AECCBC0B3E4F0603C4B247D95AEDA5D1B5F2233F3BBAE5A740` |
| .next/BUILD_ID | `2C3CA955FFD7D98996D8BAC32D4A44792B0F473D23E66D4E6FDC3A780362D86F` |

격리 빌드 산출물 `.next-core-workspace-ux-20260930/`와 `output/playwright/alpha-core-workspace-ux/`는 이번 작업 소유의 로컬 QA 자료다. workflow:closeout의 전체105경로 집계는 기존 dirty/untracked를 포함하므로 이번 변경105개라고 하지 않는다. 이번에 작성한 명세/보고서·좁은 source delta만 소유하며 stage/게시하지 않았다.

실제 Android/iOS·물리 IME·보조기술·관찰 사용자·실사용은 이번 미실행/제외다. 신규 commit/push/PR·Preview/Production·현재 개발계 교체도 미실행이다.
