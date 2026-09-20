# P3-D handoff

## 현재 결과

`authoring-handoff` Flow의 versioned source candidate를 Base·내 작업·새 원문으로 비교하고, 완전한 결정 묶음만 PoC 전용 store에 원자 적용·Undo·reload하는 수직 슬라이스를 React 제품 화면과 조작 가능한 단일 HTML에 구현했다.

D2 판정은 다음 범위로만 해석한다.

- `D2-026`: 격리 PoC 기능 기준의 통과 근거를 확보했다.
- `D2-002`: SourceRow projection key→stable Item→파생 Step→Flow adapter를 검증했다. production SourceRow/Step/Bundle schema는 미완료다.
- `D2-004`: 여덟 계층의 owner·mutability·derivation·PoC 구현 여부를 명시했다. PublishedVersion·ExportSnapshot·provider sync owner는 미확정이다.

## 고정 경계

- exact gate: `/my?personalWorkspacePoc=v1`
- write prefix: `flow:poc:personal-workspace:v1:*`
- candidate key: `flow:poc:personal-workspace:v1:source-candidates`
- 운영 saved-plan origin: read-only
- source update 지원 origin: `authoring-handoff`만
- 외부 fetch/sync/publish/export/account/cloud: 제외

## 구현·검증 증거

- P3-D focused: 38/38 통과
- 관련 개인공간 회귀: 584/584 통과
- standalone unit: 87/87 통과
- standalone source update E2E: 1/1 통과
- React 제품 E2E: keyboard/backdrop 강화 후 2/2 통과
- production build: 재확인 통과
- 전체 `npm test`: 1,848/1,849. 기존 날짜 기반 `dog-adoption-first-week:review_due:2026-06-04` 1건 실패
- 전체 실행 중단 뒤 별도 회귀: approved-plan 201/201, public-plan 19/19 통과
- 다섯 viewport: React·standalone 화면 검사에서 overflow, console/page error, 가려진 핵심 action, 44px 미만 target 0건
- 운영 경계: prefix 밖 write와 `clear` 0건, non-PoC `flow:*` bytes 불변

## 다음 작업

1. 기존 날짜 기반 source review 실패를 수정하거나 명시적으로 보류하기 전에는 저장소 전체 green으로 선언하지 않는다.
2. production identity·owner·provider 계약을 결정하기 전에는 격리 PoC 결과를 운영 schema로 승격하지 않는다.

## 남은 제품 결정

- production SourceRow·Step·Bundle/Flow Map identity와 owner
- PublishedVersion·ExportSnapshot의 실제 owner와 migration 경로
- 외부 provider에서 새 원문을 가져오고 신뢰·서명을 검증하는 방식
- saved-plan 네 origin에 immutable Base 계약을 도입할지 여부
- source 삭제 Item과 기존 개인 실행 기록의 장기 보관 정책

## 미실행 상태

- 실제 Android Chrome: 미실행
- 실제 iOS Safari: 미실행
- TalkBack·VoiceOver: 미실행
- 관찰 사용자: 0명
- commit: 미실행
- push: 미실행
- PR: 미실행
- Preview: 미실행
- Production: 미실행

자동 테스트, 브라우저 자동화, 캡처는 실제 기기 검사나 관찰 사용자 검증으로 표현하지 않는다.
