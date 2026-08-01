# P35 P0 완료 감사

**감사 시점:** 2026-08-01

**기준 commit:** `c09f859`

**branch:** `codex/p35-production-mobile-p0`

**판정:** P35 프로덕션 모바일 P0의 로컬 구현과 내부 자동 검증을 완료했다.
Flow Map 단일 snapshot, Text-to-Flow, 실제 사용자 관찰, 게시·배포는 별도 상태다.

## 1. 범위 판정

### 구현된 P0

1. `EffectiveFlowSnapshot`과 source/personal/execution version identity
2. 공개 미리보기, 저장, 저장 결과, 재진입의 결과 연속성
3. 내 Flow, Item 상세, 저장한 Flow export의 committed snapshot 연결
4. `provisional`/`custom`/`undated` 날짜 의도
5. 공개 Item 개인화와 text/XLSX/ICS 저장·export 일치
6. 원자적 전체 높이 Flow/Item 편집
7. 공개 기본 행동·내보내기·저장 결과 구조 단순화
8. 내 Flow 첫 진입, 상세 단일 완료, 단일 메모 entry
9. Flow Map 행동/편집/원문/위험/복구 adapter

### 범위 밖

- Text-to-Flow 연결
- 실제 사용자 관찰 및 사용성 검증
- 계정·외부 도구 직접 연동
- 물리 저장소 migration 또는 기존 키 삭제
- `/flow-maps` 제거 또는 route canonicalization
- Flow Map 전체 결과의 단일 `EffectiveFlowSnapshot` 전환
- commit, push, PR, merge, Vercel 배포

## 2. 구현 근거

| 영역 | 코드 근거 | 확인한 불변식 |
| --- | --- | --- |
| Snapshot | `lib/flow/effective-flow-snapshot.ts`, `components/flow/AppClient.tsx` | Flow 결과의 이름·행·개수·날짜·버전 경계를 한 번 계산 |
| Export | `lib/flow/export.ts`, `lib/flow/effective-flow-export.test.ts` | 공개/저장 결과 행과 지원 필드·생략 필드 일치 |
| 날짜 | `lib/flow/public-date-intent.ts`, `components/flow/AppClient.tsx` | 예시, 확정, 무기한의 CTA·저장값 일치 |
| 원자적 편집 | `components/flow/PublicFlowAdjustmentPanel.tsx`, `components/flow/FlowExecutionPrimitives.tsx` | Apply 전 working draft, Cancel 전체 복원, focus return |
| 공개 shell/receipt | `components/flow/AppClient.tsx`, `components/flow/SavedFlowReceiptFrame.tsx`, `components/flow/FlowExportPanel.tsx` | 저장 기본 행동 1개, receipt export 0개, 내 Flow 인계 |
| 내 Flow | `components/flow/AppClient.tsx`, `lib/flow/my-flow-first-entry.ts`, `lib/flow/execution-ui-contract.ts` | 다음 1~3개, 접힌 계획, 상세 단일 완료, committed 행 사용 |
| 메모 | `lib/flow/item-memo-facade.ts`, `lib/flow/storage.ts`, `lib/flow/effective-flow-snapshot.ts`, `lib/flow/my-flow-shape-aware-workspace.ts` | Item memo 기본 쓰기, legacy/private store 무손실 분리, 저장한 `memo` mode와 실행 없는 workspace 보존 |
| Map | `lib/flow/flow-map-action-contract.ts`, `components/flow/SourceBackedFlowMapPage.tsx`, `components/flow/SourceBackedFlowMapSaveButton.tsx` | 기존 선택/save-all/hold/storage를 유지한 행동·복구 adapter |

## 3. 검증 장부

| 검증 | 결과 | 감사 판정 |
| --- | --- | --- |
| `npm.cmd run test:p35-p0` | 40/40 통과 | P35 신규 계약 통과 |
| `npm.cmd test` | 597/597 통과 | 전체 unit/contract 회귀 통과 |
| `npm.cmd run build` | 통과 | production build 통과 |
| `npm.cmd run security:audit` | 취약점 0개 | npm dependency audit 통과 |
| 영향 범위 Playwright | 통과 | 날짜, 공개 편집·저장·export, receipt, 내 Flow, memo, Map 목표 경로 통과 |
| 390x844 목표 브라우저 | overflow 0, console error 0, page error 0 | 목표 모바일 레이아웃·행동 통과 |
| `npm.cmd run docs:check` | 14개 필수 문서/3,626개 로컬 링크 통과 | 현재 문서 묶음 통과 |
| `git diff --check` | 종료 코드 0; CRLF 변환 예고만 있음 | tracked diff whitespace 오류 없음 |
| 전체 Playwright | 57개 spec, 413/413 통과 | 최종 source와 production build 전체 E2E 회귀 통과 |

전체 회귀 과정에서 승인된 계약과 충돌하는 과거 assertion은 현재 UX 계약으로
갱신했다. 그 과정에서 별도로 확인된 네 가지 제품 회귀도 코드와 회귀 테스트로
수정했다.

1. 전체 계획이 현재 실행 묶음의 항목을 제외하던 문제
2. 사용자 생성 timed 일정이 Item ICS에서 all-day로 바뀌던 문제
3. Calendar 반복 회차 deep link가 정확한 회차 상세를 열지 못하던 문제
4. 저장한 `memo` 결과형이 calendar/checklist로 정규화되어 가짜 실행·진행률을 만들던 문제

수정 후 첫 전체 실행은 410/413이었다. 남은 세 건은 정상 UI가 약 0.1초 뒤
나타났는데 테스트가 먼저 대체 경로를 고른 동기화 경쟁으로 확인했다. 대기
조건을 보강하고 정확 재실행 3/3을 통과한 뒤, 최종 전체 실행 413/413을 한 번의
실행으로 통과했다.

## 4. 모바일 목표 경로

목표 23개 Playwright 경로에서 다음을 확인했다.

- 공개 결과의 이름·개수·날짜 의도
- Flow/Item 편집의 Apply, Cancel, Back, Escape, focus return
- 편집된 이름·설명·날짜·포함·순서의 저장/export 전달
- 저장 결과에서 export 제거와 `내 Flow에서 이어하기`
- 실행 가능한 내 Flow의 첫 진입 1~3개 항목, 접힌 전체 계획, 상세 완료 동기화
- 메모형의 synthetic execution/progress 0, 한 개의 메모 entry와 기본 Item memo 쓰기
- Map 편집의 원자성, 선택 개수, 여러 Flow 저장, hold, 원문, 조건부 위험,
  `needs_choice` 복구
- 390x844 horizontal overflow, console error, page error 0

이는 내부 시뮬레이션/자동화 근거다. 관찰 사용자 session으로 계산하지 않는다.

## 5. 호환성 감사

- 기존 Flow/Item 안정 식별자와 저장 키를 재작성하지 않았다.
- resolver와 facade는 read model/adapter로 추가했고 파괴적 migration을 하지 않았다.
- 개인 Item draft, 날짜 override, 구조 overlay와 legacy item state를 소유권별로
  선택해 합성한다.
- 과거 실행, 실행 note, source correction, completion feedback를 일반 memo로
  병합하지 않는다.
- Map의 bridge record, `saveMode`, selected count, save-all, hold를 유지한다.
- occurrence는 Flow 결과 행을 덮어쓰지 않고 instance sidecar로 남긴다.

최종 전체 회귀와 scoped diff 감사에서 이 불변식이 유지됨을 확인했다.

## 6. 공개 상태 장부

| 상태 | 결과 |
| --- | --- |
| 로컬 수정 | 있음 — 전용 worktree에만 있음 |
| commit | 없음 |
| push | 없음 |
| PR | 없음 |
| merge | 없음 |
| Vercel deployment | 없음 |
| 관찰 사용자 session | `0` |

이 장부는 각 상태를 독립적으로 기록한다. 빌드 또는 테스트 통과를 배포 완료로
간주하지 않는다.

## 7. 마감한 내부 게이트

1. 최신 source의 production build를 통과했다.
2. P35 P0 계약 40/40, 전체 unit/contract 597/597을 통과했다.
3. 패키지 보안 감사에서 취약점 0개를 확인했다.
4. 전체 Playwright 57개 spec, 413/413을 한 번의 실행으로 통과했다.
5. 작업 소유 경로의 scoped diff와 호환 fixture를 확인했다.

## 8. 다음 별도 승인 지점

1. Flow Map의 여러 하위 Flow 결과를 단일 snapshot으로 합성하는 일은 이번 P0를
   차단하지 않는 후속 구조 과제다.
2. Text-to-Flow 연결과 실제 사용자 관찰은 각각 별도 작업으로 진행한다.
3. 게시가 필요하면 commit -> push -> PR/merge -> Vercel을 각각 별도 승인과
   확인으로 진행한다.
