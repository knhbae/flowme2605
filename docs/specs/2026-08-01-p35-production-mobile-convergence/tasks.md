# P0 실행 체크리스트

체크는 2026-08-01 현재 이 worktree에서 직접 확인한 구현·테스트 근거만
반영한다. 미완료 항목은 로컬 구현 전체가 무효라는 뜻이 아니라, 해당 완료
주장을 아직 하지 않는다는 뜻이다.

## 프로그램 준비

- [x] 세 가지 기본 정책을 owner가 승인했다.
- [x] Text-to-Flow와 관찰 사용자 세션을 제외했다.
- [x] `c09f859`에서 전용 worktree와 branch를 만들었다.
- [x] 활성 spec과 소비자 인벤토리를 만들었다.

## P0-01 Effective snapshot

- [x] 현재 consumer/input 인벤토리를 기록했다.
- [x] 파괴적 schema migration 없이 resolved read model을 구현했다.
- [x] 결과 이름, 개수, shape, 날짜, capability, export plan을 한 번 해석한다.
- [x] 공개 preview/save/receipt/reload가 계약을 사용한다.
- [x] 내 Flow/Item detail/saved export가 committed snapshot 행을 사용한다.
- [x] source/personal/execution identity와 대표 shape parity 테스트가 통과했다.

범위 경계: Flow Map은 행동·복구 adapter 적용까지 완료했다. 결과 행·개수의
단일 snapshot 전환은 이번 P0를 차단하지 않는 별도 후속 과제다.

## P0-02 날짜 연속성

- [x] `provisional`, `custom`, `undated` 상태를 명시적으로 유지한다.
- [x] 예시 날짜를 확정 날짜로 표시하거나 저장하지 않는다.
- [x] 기본 행동 문구가 실제 저장 shape와 날짜 상태를 말한다.
- [x] 저장, receipt, 내 Flow, export parity 테스트가 통과했다.
- [x] 이사 Flow의 빈 날짜, 명시적 날짜, 명시적 무기한 경로를 확인했다.

## P0-03 공개 수정/export 일치

- [x] Flow/Item 공개 수정을 save input에 전달한다.
- [x] text, XLSX, ICS가 올바른 공개/저장 effective result를 받는다.
- [x] 포함 여부와 지원하는 순서가 결정적이다.
- [x] 형식별 생략 필드를 모델과 UI에 명시한다.
- [x] payload와 round-trip 테스트가 통과했다.

## P0-04 원자적 편집기

- [x] 활성 편집기와 transaction owner가 각각 하나다.
- [x] Item drill-down은 Apply 전까지 부모 초안만 바꾼다.
- [x] Apply는 한 번 반영하고 Cancel은 전체 초안을 되돌린다.
- [x] 편집 종류를 바꿔도 관련 없는 초안 변경을 보존한다.
- [x] Back, Escape, 닫기, focus return을 확인했다.

## P0-05 공개 shell과 저장 결과

- [x] 저장만 기본 행동이다.
- [x] 편집과 내보내기는 각각 전체 높이 한 단계 화면이다.
- [x] 저장 전 내보내기 하나, 저장 결과 내보내기 0개다.
- [x] 저장 결과는 실제 결과와 내 Flow 인계만 보여준다.
- [x] `/f`에 `Flow 찾기` 이탈 경로가 있다.

## P0-06 내 Flow와 완료

- [x] `할 일`과 `저장한 Flow` 작업이 구분된다.
- [x] 실행 가능한 결과형의 저장 후 첫 진입은 다음 1~3개 항목과 진행률을 먼저 보여준다.
- [x] 전체 계획은 기본으로 접힌다.
- [x] 항목 상세가 접근 가능한 단일 완료 행동을 소유한다.
- [x] 행과 상세의 완료 상태 동기화를 테스트했다.
- [x] 메모 결과형은 저장된 `memo` mode를 유지하고 가짜 실행·진행률을 만들지 않는다.

## P0-07 메모 facade

- [x] 항목 상세에서 보이는 메모 진입점은 하나다.
- [x] 새 기본 입력은 Item memo에 쓴다.
- [x] 기존 note store를 구분하고 손실 없이 유지한다.
- [x] backup, upgrade, read, export, restore fixture가 통과했다.

## P0-08 Map/원문/복구

- [x] `/flow-maps`의 저장, 선택, 여러 Flow 저장, hold 로직을 유지한다.
- [x] 편집 가능한 Map은 원자적 전체 높이 편집기를 사용한다.
- [x] 편집 불가능한 Map은 편집 행동을 노출하지 않는다.
- [x] 직접 원문을 identity 영역에서 항상 열 수 있다.
- [x] 고위험 주의는 조건부이며 관련 행동 옆에 표시한다.
- [x] 복구는 실제 conflict/`needs_choice`에서만 표시한다.
- [x] Map 저장 레코드·선택 개수의 호환 E2E가 통과했다.

## 최종 게이트

- [x] 문서 검사 통과 — 14개 필수 문서/3,626개 로컬 링크.
- [x] P35 P0 계약 테스트 40/40 통과.
- [x] 전체 단위/계약 테스트 597/597 통과.
- [x] 프로덕션 빌드 통과.
- [x] 패키지 보안 감사 통과 — 취약점 0개.
- [x] 목표 모바일·영향 범위 E2E 통과.
- [x] 전체 E2E 57개 spec, 413/413 통과.
- [x] 390x844 목표 경로에서 horizontal overflow, console error, page error가 0이다.
- [x] `git diff --check`가 종료 코드 0으로 통과했다.
- [x] 최종 scoped diff와 호환성 감사를 마감했다.
- [x] commit, push, Draft PR, Preview 상태를 기록했다: 구현 commit `1b669f9`,
  Draft PR #165, Vercel Preview Ready. merge와 Production 배포는 하지 않음.
- [x] 관찰 사용자 근거는 `0`이며 검증으로 주장하지 않는다.
