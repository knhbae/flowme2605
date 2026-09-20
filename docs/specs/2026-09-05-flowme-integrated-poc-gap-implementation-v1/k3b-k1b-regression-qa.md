# K3-B 새 모드의 K1-B 편집 안전성 회귀

2026-09-05. 신규 회귀 시험 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-regression-k1b.spec.ts`) **20/20 PASS**. K2-B/K1-B의 B01–B20을 별도 파일로 복사해 현재 Plan/Item 명시 모드와 개인 overlay에 연결했다. 역사 시험, 제품 코드, CSS, 생성 HTML은 이 담당자가 수정하지 않았다.

## 최종 실행과 같은 제품 근거

- 최종 20개 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/k1b-regression20-final-20260905-02.json`): 20 PASS, FAIL/SKIP/FLAKY 0, 62.11초.
- memory HTML SHA `fb17fda35e1141c50359bee3cc5b85a39dc89f9c0c10809570adb70b757d8be3`. 실행 환경 변수로 모든 worker의 같은 해시를 강제했다.
- app 전후 SHA `595CD60B95714381C0FB65CF2353F340D256198EC407C51D1ED95DF60C809C15`.
- 최종 시험 파일 SHA `6BEE4935F3A2715CFE04FE94D26126FBE5E2C588488463385F996BE8167ED4CB`.
- [Plan modes 16개](./k3b-plan-modes-ui-qa.md)와 같은 제품 해시다. 이 두 최종 실행은 36개이며, 중간 실패와 단독 재시험을 추가 성공 개수로 합치지 않는다.

## 바꾼 시험과 보존한 기대값

편집 경로에서만 title/memo `override`, date `fixed_date`를 선택한 다음 실제 입력을 채운다. 깨끗한 편집기는 `inherit`와 입력 부재를 확인한다. Quick의 plain input과 legacy recovery 문법은 바꾸지 않았다.

기존 `stored()`는 실제 저장 packet을 그대로 반환한다. 별도 `effectiveStored()`가 실제 P source reader로 표시 값을 읽는다. B03은 개인 표시 값과 함께 raw flow/task 완전 일치, full Undo, 명시 metadata title/memo를 검사한다. B13/B14/B16도 개인 제목 표시와 metadata 존재를 따로 검사하며, 저장 바이트 비교·writer 수·복구 owner 검사는 raw 기준을 유지한다. `stored()` 전체를 표시용으로 바꾸는 정정은 하지 않았다.

## B01–B20 결과

| ID | 보존한 검증 대상 | 최종 |
| --- | --- | --- |
| B01 | 네 origin + 작성 사본 clean close, 정확한 원래 버튼 초점, 쓰기 0 | PASS |
| B02 | dirty Plan Escape, 계속 편집 입력 보존, 명시 버리기 | PASS |
| B03 | child 반영은 부모 staging만, child 버리기는 이전 반영 보존, 전체 저장 1회 | PASS |
| B04 | 기간/결과 Item 직접 편집 → 부모 → 원래 화면 | PASS |
| B05 | Quick root dirty→clean·버리기, 가짜 Plan 생성 없음 | PASS |
| B06 | 확인창 초점 순환, Escape/X/native cancel/backdrop, 같은 DOM·스크롤 | PASS |
| B07 | HTTP와 file의 실제 browser Back, clean/dirty/child/확인창 소유권 | PASS |
| B08 | Plan Quota/throw-after/readback, Quick 실패, 재시도 1회, 버린 초안의 stale retry 재실행 0쓰기 | PASS |
| B09 | 편집·복구 중 배경 행동 차단, 중복 submit 저장 1회 | PASS |
| B10 | 5 viewport 확인창·입력·실패·재시도 접근, 편집 초점 복귀 | PASS |
| B11 | 과거 memo 필드 부재를 migration 없이 clean으로 읽기 | PASS |
| B12 | 외부 target 삭제 뒤 오래된 메모리로 새 저장/seed 생성 차단 | PASS |
| B13 | 현재 prepared 재확인은 읽기만, 명시 복구와 초안 재개 | PASS |
| B14 | 실제 reload의 prepared gate, before exact 복원 뒤 명시 재저장 | PASS |
| B15 | 손상/미지원/foreign/read-error recovery, 배경·reset 쓰기 차단 | PASS |
| B16 | 저장 실패한 부모가 clean child 왕복 후에도 입력·retry 유지 | PASS |
| B17 | confirmed cleanup 오류와 reload, journal만 정리·target 불변 | PASS |
| B18 | 다른 유효 journal이 현재 복구 owner/초안을 대체하지 못함 | PASS |
| B19 | confirmed journal 일시 읽기 실패, 복구 버튼 유지·target 불변 | PASS |
| B20 | 같은 밀리초 session ID 충돌도 다른 exact journal/초안 채택 금지 | PASS |

## 첫 실패와 하니스 정정

| 실행 | 실제 개수 | 결과 |
| --- | ---: | --- |
| 최초 등록 | 20 등록, 실행 0 | `--list` PASS |
| 첫 전체 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/k1b-regression20-first-20260905-01.json`) | 20 | 19 PASS / 1 FAIL, 204.62초 |
| B08 단독 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/k1b-regression-b08-replay-20260905-01.json`) | 1 | 1 PASS, 약 4.7초 |
| 최종 전체 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/k1b-regression20-final-20260905-02.json`) | 20 | 20 PASS, 62.11초 |

첫 B08은 Quota·throw-after·readback·Quick 재시도와 discard까지 통과한 뒤, 마지막 구 `#toast-retry`를 찾는 synthetic replay에서 timeout이 났다. 현재 inline toast는 화면 재렌더 때 DOM에서 떨어질 수 있어 해당 selector가 없었다. 제품 저장 실패로 세지 않는다. 첫 trace/PNG/JSON은 보존했다.

정정은 마지막 실패 화면의 **실제 `editor-retry` 노드**를 잡아 두고, discard 후 detached 상태를 확인한 다음 잠시 body에 연결해 실제 event dispatcher에 click을 보내는 방식이다. 그 뒤 즉시 제거하고 exact 바이트/API 0을 검사했다. 구 `data-action=retry` 호환 dispatcher도 별도 synthetic control로 같은 0쓰기 검사를 했다. 실제 사용자에게 보이는 행동이 아니라 오래된 노드의 재실행 시험이며, 내부 모델 함수·권한 flag를 직접 호출하지 않았다. 나머지 저장/재시도/Quick 검사는 그대로다.

## 저장과 브라우저 경계

최종 29개 boundary(HTTP 28, file 1)에서 mutation API **147건**을 기록했다. target `setItem` 57, journal `setItem` 57, journal `removeItem` 33이다. 실패한 setter·rollback·복구·journal 정리도 포함한 호출 수이며 저장 성공 수가 아니다.

관찰된 모든 호출은 아래 두 key뿐이다. 두 key 밖 및 `clear` 0, 운영 key/value 전후 exact 일치, console/page error 0. fixture 초기 seed와 명시 외부 target/journal 교체는 product 호출과 구분한다.

- `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2`
- `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2`

B07은 실제 `page.goBack()`과 file route를 사용한다. file HTML은 test output에만 생성했다. 기본 production 3182는 route 제공에 사용했으며 서버 시작·종료·배포는 하지 않았다. desktop Chromium / Asia·Seoul 고정 시각이며, 시각 충돌 검사를 제외한 새 context에는 같은 날짜의 구분되는 밀리초를 주입했다.

## 화면 평가

B10은 390×844, 375×812, 844×390, 1024×768, 1440×900에서 원래 회귀의 전체 viewport 노출 + 중앙 hit 검사를 유지한다. 이 결과를 9점 검사라고 바꾸어 표현하지 않는다. 더 엄격한 full rect·조상 clipping·9점 hit는 같은 해시의 별도 modes U12 근거다.

아래 확인창 두 화면과 실패 화면을 직접 열었다. 버리는 범위가 child임을 문구로 밝히며, 계속 편집과 버리기의 버튼이 구별된다. 실패 화면에는 입력이 유지되고 재시도와 Plan 전체 저장/취소가 남는다. 긴 원문·개인 폼의 세로 길이나 실제 가상 키보드 사용성은 판정하지 않았다.

- 390 확인창 (로컬 전용 근거: `../../../output/playwright/k3b-k1b-regression20-final-20260905-02/personal-workspace-k3b-reg-ef31a-e-and-restore-editing-focus/confirm-390x844.png`)
- 844 가로 확인창 (로컬 전용 근거: `../../../output/playwright/k3b-k1b-regression20-final-20260905-02/personal-workspace-k3b-reg-ef31a-e-and-restore-editing-focus/confirm-844x390.png`)
- 390 저장 실패 (로컬 전용 근거: `../../../output/playwright/k3b-k1b-regression20-final-20260905-02/personal-workspace-k3b-reg-ef31a-e-and-restore-editing-focus/failure-390x844.png`)

## 분리 보고

실제 Android Chrome **NOT_RUN**, 실제 iOS Safari **NOT_RUN**, 관찰 사용자 **0명**. 전체 `npm test`와 production build는 root가 별도 보고한다. 이 담당자의 commit/push/PR/Preview/Production은 모두 **진행하지 않음**이다. 반복 미정 capability나 개인계획 나머지 미지원 필드를 이 20개 통과로 완료 처리하지 않는다.
