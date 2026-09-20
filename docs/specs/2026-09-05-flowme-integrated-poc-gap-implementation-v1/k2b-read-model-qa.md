# K2B-R1/R2 — 기간·기존 순서 읽기 모델 검증

2026-09-05. **순수 읽기 모델 구현·검증 완료. 제품 화면과 저장 경로 연결은 아직 없다. K2-B 전체 완료가 아니다.**

## 요구와 반영

| 요구 | 기존 차이 | 이번 소단계 반영·근거 |
|---|---|---|
| P3K-V41-01 / 오늘·지난 미완료·월~일 주간 | standalone의 고정 기준일·rolling 7일 | 명시 localToday의 날짜 계산과 date/overdue/undated 그룹. 기존 React 함수와 동일 fixture 비교 |
| V41-021 / 시간순 | 뷰 전체 시간순과 날짜 그룹 혼재 | 날짜 그룹을 먼저 날짜순으로 만들고 그룹 안 시간순·원본 순서 유지 |
| P3K-V41-02 / 날짜별 순서 공유 | orders.today/week/month가 따로 존재 | 새 순수 selector는 같은 date context의 순서를 세 view에서 공유. 실제 reorder/reset writer는 아직 없음 |
| 구 순서 비파괴 호환 | 현재 목록 membership으로 구 배열을 재검증·정리하면 손실 위험 | 기존 고정 기준일 decoder를 별도 유지. 완전한 후보가 하나거나 모두 같을 때만 읽기 투영. 충돌/미해결은 해당 context 기본 시간순·변경 차단 표식 |
| 원본·다른 사본·저장 불변 | 제목이나 시간으로 identity를 합칠 위험 | id/ref를 그대로 사용. 읽기 중 입력 객체 변경·DOM·저장 접근 0 |

기존 `model.js`의 구 `viewTaskIds`를 새 의미로 바꾸지 않았다. 구 payload 검증 기준을 보존하기 위해서다. 신규 모듈은 UMD/CommonJS `FlowPocTimelineContext`, `VERSION=1`이다. 결과에 ok/실패 원인, context/key/ids/defaultIds/manualOrder/orderMode/blocked와 날짜 범위를 반환한다.

## 실제 실행

| 명령·대상 | 실제 수 | 근거 |
|---|---:|---|
| `node --test .../timeline-context.test.cjs` | **35/35 PASS**, fail/skip 0 | 로그 metadata (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/timeline-model-2026-09-05T05-36-23-677Z.json`) |
| `tsx --test lib/flow/personal-workspace-poc-k2b-timeline-parity.test.ts` | **12/12 PASS**, fail/skip 0 | 로그 metadata (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/react-selector-parity-2026-09-05T05-35-30-301Z.json`) |
| 신규 JS 구문·공백 검사 | PASS | 하위 작업 실행. 독립 기능 시험 수에 더하지 않음 |

35개는 날짜 범위·invalid·시간순·identity·읽기 정렬·legacy 유일/동일/충돌/부분/손상·입력 bytes 보존을 검사한다. M06은 읽기에서 없어진 ref를 제외하고 새 ref를 덧붙이는 범위만 확인했다. actual reorder/reset/Undo/revision gate까지 PASS로 표시하지 않는다.

12개 중 7개는 각각 2026-09-01/06/07/30, 2026-12-31, 2027-01-01, 2024-02-29 기준으로 네 view를 비교한다. 나머지 5개는 동명·다른 사본 정렬, overdue/date 독립, stale ref 읽기, 날짜 변경·완료/재열기 입력, 잘못된 기준일이다. view 순회나 assertion 수를 독립 테스트 수로 늘리지 않았다.

서로 다른 두 파일의 등록 시험은 47개다. 앞선 K1-B의 npm 2,249개에 이 신규 47개가 포함됐다고 쓰지 않는다. 신규 parity 파일은 아직 npm script 목록에 연결하지 않았으며 위 focused 명령으로 실행했다. 브라우저 clock·로컬 자정 갱신·실제 화면 검사는 아직 없다. 35개 안의 프로세스 시간대 3종 검사는 같은 plain-date 입력 계산의 불변성 검사다.

## 파일과 현재 후보

| 신규 파일 | SHA-256 |
|---|---|
| `...standalone-ko-assets/timeline-context.js` | `3021C76E1AD513FDA92E610E650FE66085E93BE5B856EB9ED39E79480A56BD69` |
| `...standalone-ko-assets/timeline-context.test.cjs` | `0291E0FC4721EAF7DE6AC4E7FA4F48F92E849CDD11354C251FF25A800DC86427` |
| `lib/flow/personal-workspace-poc-k2b-timeline-parity.test.ts` | `E767EE1192546AA10A816F7F6538AA64B5374C8FB2A7CB117291915B0FFA1ABE` |

기존 model/app/builder·React 제품 코드·저장 schema는 이 소단계에서 수정하지 않았다. 조작용 HTML은 K1-B 후보 1,008,623 bytes, SHA `A0DE57EA01E571BE6716A8A7B91BDCE6B6A9F7FBE4D65D3D34EC3CE8D1773141` 그대로다.

## 다음 gate

[저장 전략 검토](./k2b-storage-review.md)에 따라 새 PoC checkpoint의 정확한 버전·legacy 원본·Undo·K1-B journal·handoff 부팅 계약을 검증한다. 순수 selector의 `projectLegacyTimeline`은 canonical order가 함께 들어오면 우선순위를 추정하지 않고 현재 미지원으로 거절한다. 해소 metadata와 reset 뒤 legacy 재등장 방지는 다음 저장 계약에서 별도로 구현한다.

그 뒤에만 기간 화면, 자정/focus 갱신, 메뉴·drag·길게 누르기·키보드의 공통 정렬과 날짜별 시간순 복귀를 연결한다. 이 소단계의 모델 PASS를 사용자 조작 성공으로 대체하지 않는다.

실제 Android/iOS/보조기술은 NOT_RUN, 관찰 사용자 0명. commit·push·PR·Preview·Production은 미실행이다.
