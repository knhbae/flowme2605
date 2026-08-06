# P1-01 Item·Flow Map·시작일 시각 감산 closeout

**판정:** `PASS — LOCAL INTERNAL GATE · STRICT RE-AUDIT CLOSED`

**사용자 결과:** Item 상세는 완료를 주 행동으로 두고 중립 surface와 `수정` 보조 행동을 사용한다. Flow Map은 3칸 설명 대신 CTA 옆 선택 수만 남기고, 정상 시작일은 입력값을 다시 읽어 주지 않으면서 과거·임박 경고는 유지한다.

**시작/종료 기준:** `codex/p35-production-mobile-p0` · HEAD/upstream `d5f693776f7cebbce72a247ddb33ca6c5d550900` 기반 dirty local tree · 2026-08-05 KST

**게시·관찰 경계:** commit·push·PR·CI·merge·Preview·Production 없음. 실제 관찰 사용자 `0명`.

## 1. 실제 변경

- `FlowEditorShell`의 P1 Item 상세만 neutral inline hierarchy를 사용한다.
- 모바일 반복 heading `실행할 일`을 제거하고 `할 일 수정`을 `수정`으로 줄였다.
- Item 상세의 기본 primary count를 `2→1`로 줄이고 완료 control 1개를 유지했으며, 수정은 공통 neutral secondary action으로 바꿨다. 완료 checkbox 자체에 별도 priority attribute가 있다는 주장은 하지 않는다.
- Flow Map의 `FlowScheduleIntent` 3칸 grid를 P1 기본 상태에서 숨기고 desktop/mobile CTA에 `선택 N / 전체 M`을 유지했다.
- 정상 custom start date의 성공 echo만 제거하고 과거·가까운 일정 경고는 유지했다.
- 정확한 query flag `visualSubtraction=off`로 세 presentation을 함께 legacy 상태로 복원한다.
- 독립 closeout 감사에서 찾은 모바일 setupInput count 손실을 수정해 날짜가 비어도 `선택 N / 전체 M · 시작일 필요`를 함께 유지한다.
- strict re-audit build에서 before/after 18장, viewport별 축약 accessibility tree, DOM action/card/heading count를 생성했다.

## 2. 소유 파일

- `lib/flow/p35-round2-flags.ts`와 test
- `components/flow/FlowExecutionPrimitives.tsx`
- `components/flow/FlowSaveBeforeFrame.tsx`
- `components/flow/AppClient.tsx`의 P1 visual slice
- `app/flow-maps/[map]/page.tsx`
- `components/flow/SourceBackedFlowMapPage.tsx`
- `components/flow/SourceBackedFlowMapSaveExperience.tsx`
- `components/flow/SourceBackedFlowMapSaveButton.tsx`
- `components/flow/PublicFlowAdjustmentPanel.tsx`
- `components/flow/SavedFlowEditorSurface.tsx`
- 관련 P1/affected E2E assertion, evidence, closeout 문서

공유 dirty 파일의 P0 변경은 되돌리거나 재소유하지 않았다.

## 3. 보존한 불변식

| 불변식 | 판정 | 근거 |
|---|---|---|
| 중요 count·경고·출처·완료 기준 손실 0 | `PASS` | setupInput 미입력 모바일까지 selection summary 유지, 과거/임박 warning, P0 Item detail/payload 회귀, full unit |
| Map selected=applied=preview=saved IDs/title/count | `PASS` | 영향 E2E Map mobile/desktop/legacy 포함 `20/20` |
| 정상 시작일 중복 echo 0 | `PASS` | P1 after 3 viewport success echo `0`; warning 분기 별도 PASS |
| `완료`는 새 저장/편집 의미로 쓰이지 않음 | `PASS` | 삭제·라벨 변경은 `수정`; shared editor label unit PASS |
| primary가 더 명확하고 새 설명 카드 없음 | `PASS` | Item parent declared primary `2→1`; Map structural card `5→4`; Item/date card 수와 action 수 불변 |
| state/storage/migration 변경 없음 | `PASS` | flag rollback storage snapshot exact-equal; visual slice만 분기 |

## 4. 정상·오류·Back·rollback

- 정상: Item/Map/date before·after를 390·1024·1440에서 통과했다.
- 경고: 과거 날짜와 5일 뒤 가까운 일정 경고가 계속 보인다.
- Back/error/retry: Map 7/8의 편집·Back·부분 write rollback·retry·reload가 유지된다.
- completion/memo: Item 상세만 mutation point인 P0 회귀가 유지된다.
- rollback: `visualSubtraction=off`에서 legacy background/heading/label, Map grid, date echo를 독립 복원하고 storage mutation `0`이다.
- edge: released moving Map alias는 canonical `/f`로 redirect되므로, 같은 setupInput 분기를 가진 직접 접근 Map `/flow-maps/curated-opic-mock-course`에서 390px 날짜 삭제를 재현했다. Q3 on/off component test도 count를 유지한다.
- empty/pending/duplicate는 새 state를 만들지 않았으며 기존 P0 계약을 그대로 사용한다.

## 5. 검증

| 명령/검사 | 결과 |
|---|---|
| focused flag/editor unit | `15/15 PASS` |
| P1 visual spec after strict re-audit | `5/5 PASS`, workers 1, retries 0, 17.8s |
| P1 visual spec before/rollback strict re-audit | `5/5 PASS`, workers 1, retries 0, 16.5s |
| setupInput count + Q3 on/off component | `3/3 PASS` |
| affected E2E 6 files | `20/20 PASS`, workers 2, retries 0, 44.1s |
| full unit/workflow | `1,043/1,043 PASS` (`113 + 322 + 608`) |
| `npm.cmd run build` | `PASS`, Next 15.5.21, pages `18/18`, strict re-audit build `XMbvE5wM3RginexHtEnDx` |
| built runtime | test-only port 3114 HTTP `200` |
| visual inspection | Item/Map/date 390 after와 1024/1440 capture set 확인 |

상세 수치와 18개 PNG는 [P1-01 evidence](./evidence/p1-01/README.md), 실제 tree 축약본은 [ARIA tree excerpts](./evidence/p1-01/aria-tree-excerpts.md)에 있다.

## 6. Known limitations·다음 gate

- 이 단계는 용어·CTA·도움/주의 taxonomy를 바꾸지 않는다. 화면에 남은 `Flow`, `조정`, `전체 저장하고 시작` 등은 P1-02 소유다.
- raw screen-reader 사용자 세션은 없으며 접근성 결과는 자동 snapshot·keyboard/focus 회귀다.
- 전체 형식 field round-trip과 극단값은 각각 P1-03·P1-04에서 검증한다.
- production baseline은 released P35이며 이 local build는 배포하지 않았다.

P1-01을 닫고 strict sequence의 다음 단계인 **P1-02 Q3-B 용어·CTA·도움/주의**만 연다.
