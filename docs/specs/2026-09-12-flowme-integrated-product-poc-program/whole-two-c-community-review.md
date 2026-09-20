# 전체 흐름 2 — C 커뮤니티 검증

검사일: 2026-09-20. 범위는 [전체 흐름 2 계획](./whole-loop-two-plan.md)의 C 중 커뮤니티 연결이다. 기존 ordinary QA 프로필에서 직접 조작했다. C의 문서 사본 검증은 선행 기록이며 이 보고서의 신규 실행에 포함하지 않는다. D 다중 필드 충돌, 전체 제품 완료 판정도 포함하지 않는다.

## 판정

Flow 없는 질문 작성 → 다른 기존 로컬 참여자의 답글 → 반응 켜기/끄기 → 질문 수정 → 내 활동에서 정확한 답글 열기 → 원글 복귀 → 새로고침까지 통과했다. 기존 개인 공간과 기존 공개 글·답글·사진·근거는 값이 그대로 유지됐다.

원래 프로필을 초기화하거나 fixture를 주입하지 않았다. 테스트용 질문과 답글은 성공 상태 그대로 남겼다. 실제 참여자나 실제 학습 성과를 의미하지 않도록 본문에 로컬 QA임을 표시했다.

| 시나리오 | 실제 결과 |
| --- | --- |
| 질문만 작성 | 제목 `반복 연습 기록을 어떤 기준으로 정리하는가`에 QA 식별자를 붙여 1개 작성. Flow/version/item 연결은 null, 사진·근거는 빈 배열 |
| 미리보기 취소 | 입력이 유지됐고 취소로 발생한 저장은 0건 |
| 다른 참여자 답글 | 기존 `participant-jihun`으로 전환해 정확한 질문에 답글 1개 작성 |
| 반응 켜기/끄기 | 각각 저장한 후 최종 반응 목록이 최초 값과 일치 |
| 질문 수정 | `local-user`로 돌아와 질문 보충 문장 추가. 본문·수정 시각 이외 글 필드는 동일 |
| 내 활동 연결 | `내게 온 답글`에서 해당 답글 ID가 포함된 경로로 이동. 정확한 답글 요소와 현재 위치 표시 확인 |
| 원글 복귀 | 글 목록에서 동일 질문을 열어 답글 ID 없는 원글 경로로 복귀. 이동 자체의 저장은 0건 |
| 새로고침 | 실제 reload 전후 저장 문자열이 같고 질문 수정·답글이 표시됨. 새 문서의 추가 저장은 0건 |

질문 ID: `post-6fb14012-8a29-4d4c-ad87-7339e4d5e768`  
답글 ID: `reply-1ca49f4f-3429-4f30-bb0d-899ba73b1f18`

## 상태와 데이터 보호

CLI 세션은 `program-ordinary-source-recovered`이며 기존 프로필을 유지했다. 시작점은 선행 `whole-two-c-copies-tail-2026-09-20T05-14-38-045Z.json`의 revision 422이다.

| 항목 | 시작 | 종료 |
| --- | --- | --- |
| revision | 422 | 436 |
| SHA-256 | `4120b13c28f5a8376b91bf461c4bfaf5bc31f44b1b38ab02ec6ba39094ceefa5` | `86e2c79342b38c9327134996b66dd53cdf62a999b3fba25797c4d60596477e57` |
| 문서 generation | `1789865692624.8` | reload 후 `1789881935519.9` |
| observer | `__september20Resume`, offset 16 | reload 직전 offset 30, 새 문서 offset 0 |
| actor | `local-user` | `local-user` |

실제 성공한 저장은 14건이다: 질문 작성 초안·제목·본문 3, 질문 공개 1, 참여자 전환 1, 답글 초안·본문 2, 답글 공개 1, 반응 2, 작성자 복귀 1, 수정 초안·본문·공개 3. 모두 `flow:poc:personal-workspace:v1:program:state`의 `setItem`이었다. 허용 영역 밖 쓰기, removeItem, clear는 0건이다.

전체 저장 envelope를 현재 decoder로 다시 읽은 독립 비교는 15/15 통과했다. 최종 ProgramData의 최초 대비 차이는 새 질문 1개, 새 답글 1개, receipt 2개뿐이다. 모든 개인 공간 전체, 기존 공개 객체, 기존 receipt prefix가 동일하다. 반응은 원래 값으로 돌아왔다. Undo는 80개 상한에 따라 local-user의 가장 오래된 2개가 새 공개·수정 기록으로 교체됐고 나머지 78개는 정확히 유지됐다. 다른 참여자의 기존 이력도 보존됐다. 따라서 Undo 전체가 byte-for-byte 동일하다는 주장은 하지 않는다.

이 ordinary 프로필에서 Program key 밖 운영 localStorage key는 최초 0개, sessionStorage도 0개였다. 종료 시에도 같았다. 이 결과를 운영 데이터가 채워진 실제 사용자 프로필의 불변 검증으로 확대하지 않는다.

## 자동화 기록과 실패 보존

아래 JSON은 `output/playwright/integrated-program/`에 있다. 검증 assertion 수는 테스트 케이스 수나 관찰 사용자 수가 아니다.

| 기록 | 결과와 해석 |
| --- | --- |
| `whole-two-c-community-2026-09-20T05-20-49-621Z.json` | 23개 확인 뒤 QA 대기 조건 실패. 미리보기에도 있던 제목을 공개 완료 조건으로 써서 너무 일찍 읽었다. 실제 질문 1개가 revision 426에 저장된 것을 확인하고 그 상태부터 계속했으며 재공개하지 않음 |
| `whole-two-c-community-tail-2026-09-20T05-23-23-575Z.json` | 76개 확인 통과. 다른 참여자 답글부터 원글 복귀까지. page/console error 0 |
| `whole-two-c-community-view-2026-09-20T05-25-33-871Z.json` | 13개 확인 뒤 QA selector 실패. 5개 해상도 및 reload 저장 일치는 통과. 전역 본문 selector가 숨겨진 활동 요약까지 중복 선택해서 중단 |
| `whole-two-c-community-final-2026-09-20T05-26-33-167Z.json` | 본문을 보이는 article로 한정한 6개 확인 통과. 다만 document.scripts만 수집해 동적 route asset 증거가 빠져 recorder의 runtime 판정 실패 |
| `whole-two-c-community-runtime-2026-09-20T05-27-10-009Z.json` | 읽기 전용 4개 확인 통과. performance resource를 함께 수집해 같은 문서와 route asset 확인. 추가 저장 0 |

실패 기록은 삭제·덮어쓰지 않았다. 후속 검사는 정확한 실패 후 상태에서 시작했다. 최종 build 증거는 `pIfd2DvMfHy2BICAkWF9L`, route asset은 `static/chunks/app/my/page-262f7de3ce9240f3.js`, origin은 `http://127.0.0.1:3641`이다. 이 검사에서 build/restart하지 않았다. 이후 소스 변경의 화면 검증까지 포함하지 않는다.

독립 artifact 비교 기록: `output/integrated-product-poc/whole-two-c-community-crosscheck-2026-09-20T05-32-15-859Z.json` — 15/15 통과. 이 비교는 새 브라우저 조작이 아니며 동시 수정 중인 현재 decoder를 이용했다. UI의 frozen build 증거와 구분한다.

## 해상도별 화면 평가

아래 5개 캡처를 직접 열어 확인했다. 문서 scrollWidth가 각 viewport 너비와 같았고, 핵심 `답글 쓰기` 버튼은 모두 높이 약 44.39px, hit test 통과였다. 기존 전체 제품의 모든 화면을 이번에 재검사한 것은 아니다.

| 화면 | 판정 | 캡처 |
| --- | --- | --- |
| 375×812 | 긴 QA 제목 줄바꿈 정상. 질문 본문과 주요 행동 표시. 답글 아래쪽은 세로 스크롤 필요 | 375 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-community-2026-09-20T05-25-34-282Z-375.png`) |
| 390×844 | 가로 넘침 없음. 질문 본문과 주요 행동 표시. 긴 내용은 세로 스크롤 | 390 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-community-2026-09-20T05-25-34-282Z-390.png`) |
| 844×390 | 핵심 행동을 보기 위해 scrollY 381로 이동. 캡처 상단 제목 일부는 스크롤 밖에 있고 본문·행동·답글은 접근 가능 | 844 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-community-2026-09-20T05-25-34-282Z-844.png`) |
| 1024×768 | scrollY 131에서 질문·답글 확인. 상단 헤더 일부는 스크롤 밖 | 1024 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-community-2026-09-20T05-25-34-282Z-1024.png`) |
| 1440×900 | 헤더·질문·답글 표시 정상, 가로 넘침 없음 | 1440 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-community-2026-09-20T05-25-34-282Z-1440.png`) |

브라우저는 1440×900, local-user, 해당 질문 원글 경로로 돌려놓고 담당자에게 반환했다. 그 이후 조작은 이 보고서 범위가 아니다.

## 남은 범위 및 공개 상태

이번 C에서 확인한 제품 결함은 없다. 자동화의 대기·selector·동적 asset 수집 문제는 별도 후속 runner로 보완했다. D 다중 필드 충돌, 전체 검증 취합, 새 소스 build의 회귀 검증은 남은 별도 작업이다.

실제 Android Chrome/iOS Safari 검사 미실행. 관찰 사용자 0명. commit·push·PR·Preview·Production 모두 진행하지 않았다. C는 QA 스크립트와 이 보고서만 추가·수정했으며 제품 runtime을 변경하지 않았다.
