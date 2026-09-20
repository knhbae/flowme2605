# P3-F 실행 계획

## 원칙

P3-F는 새 운영 아키텍처를 발명하는 단계가 아니다. 승인된 데이터·UX 계약을 exact-query 후보에 적용하고, 실패 시 제거 가능한 단위로 검증한다.

## 단계별 계획

| 단계 | 작업 | 통과 조건 |
|---|---|---|
| 0 | P3-E와 7월 canonical·storage, A0·Product UX 정본 대조 | 승인된 결정과 planning 가정을 분리 |
| 1 | P3-E의 전역 token 재선택 가정 정정 | 전역 ink/cobalt와 로컬 white/gray/teal owner를 동시에 고정 |
| 2 | P3-E의 document-scoped collision 가정 정정 | SourceRow와 canonical node의 정본 tuple 적용 |
| 3 | reversible multi-content identity 후보 연결 | UUID identity, Step grouping, optional Bundle, standalone Flow, retained identity 검증 |
| 4 | 여덟 plane owner 후보 연결 | immutable PublishedVersion, overlay/run 보존, derived ExportSnapshot과 교차-owner 차단 |
| 5 | 통합 product shell 후보 연결 | PlatformNav 1회, 로컬 context 1줄, compact authoring, 단일 주 행동 |
| 6 | 모델·component·standalone·browser 검증 | 네 부모의 모든 P3-F atomic acceptance가 E4 |
| 7 | trace snapshot 작성 | 네 부모만 승격, `138/4/3/11/12`, gap 7 |
| 8 | 실제 Android/iOS·보조기술 | 미실행으로 남기고 별도 실기 목표로 전달 |
| 9 | 운영 schema/writer/migration/provider sync/배포 | 범위 밖, 별도 승인 전 시작 금지 |

## 데이터 후보 순서

1. 여러 `contentId`를 가진 registry fixture를 만든다.
2. SourceSnapshot과 SourceRow를 분리하고 `(snapshotId, stableKey)`를 검증한다.
3. canonical node를 UUID identity와 `(contentId,nodeKind,stableKey)`에 묶는다.
4. `FlowSection→Step`, `FlowItem→Item`을 적용하고 Step의 completion 소유를 금지한다.
5. Bundle이 없는 Flow와 선택적 Bundle이 있는 content를 모두 통과시킨다.
6. 새 PublishedVersion을 append하고 기존 identity와 개인·실행 record 불변을 확인한다.
7. removed Item은 registry와 기존 참조에 남기되 새 run 참조는 차단한다.
8. ExportSnapshot은 effective projection에서 파생한 불변 후보로만 만든다.

## UI 후보 순서

1. 전역 PlatformNav를 로컬 teal token scope 밖에 둔다.
2. exact-query 내부에서만 v4.1 흰/회색/teal·평면 행을 적용한다.
3. 개인공간의 첫 흐름을 폴더→날짜→완료로 유지한다.
4. 작성 화면을 원문 / 구조·도구 / 결과 역할로 구성한다.
5. 모바일은 compact 2-state와 한 개의 48px 이상 주 행동을 사용한다.
6. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 overflow·가림을 확인한다.
7. 기본 `/my`와 standalone의 기능·문구·저장 경계를 비교한다.

## 실행 완료 상태

단계 0~7은 격리 후보 범위에서 완료했다. 단계 8의 실제 기기·보조기술과 단계 9의 운영 구현·배포는 실행하지 않았다.

| 검증 lane | 결과 |
|---|---:|
| candidate data 26 + product shell 6 | `32/32` 통과 |
| P2-B~P3-F additive trace | `45/45` 통과 |
| 전체 `npm test` | `2,126/2,126` 통과 · 12개 Node invocation |
| production build | `18/18` static page 통과 |
| 최종 Playwright | `77/77` 통과 · 6개 spec, Stage 3 포함 |
| docs check | 필수 파일 16개 · 로컬 링크 `4,632/4,632` 통과 |
| security audit | 실패 · 고위험 1건, 낮음 1건 · 자동 수정 미실행 |

Security audit 실패는 의존성 보정과 전체 재검증이 필요한 별도 release risk다. 후보 계약의 네 승격이나 남은 primary gap 7개를 다시 계산하는 근거는 아니다.

## 실패 시 처리

- 정본과 충돌하면 후보 계약을 고치고 정본을 바꾸지 않는다.
- invalid graph나 cross-owner mutation은 복구를 시도하지 않고 fail-closed한다.
- 저장 실패는 PoC snapshot rollback과 사용자 상태 표시로 끝낸다.
- 기본 `/my`나 운영 key 변화가 관찰되면 네 승격을 모두 중단한다.
- 실제 기기 문제가 발견되면 남은 7개 gap 안에서 수정·재검증하며 자동 증거로 덮지 않는다.

## 공개 상태

commit, push, PR, Preview, Production은 이 계획에 포함하지 않는다.
