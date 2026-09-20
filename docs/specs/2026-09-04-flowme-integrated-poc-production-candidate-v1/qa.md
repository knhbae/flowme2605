# P3-F QA 계약

## 판정 규칙

네 부모 요구사항은 다음 조건을 모두 충족할 때만 격리 통합 PoC `충족/E4`로 기록한다.

1. 실행 가능한 후보 코드가 있다.
2. 정상·오류·취소·손상 입력을 자동 테스트한다.
3. React와 standalone에서 같은 사용자 결과를 확인한다.
4. exact-query와 PoC prefix 밖 mutation이 0이다.
5. 기본 `/my`와 기존 운영 데이터가 전후 동일하다.
6. Production 구현·실기·관찰 사용자 결과로 확대하지 않는다.

## Atomic acceptance

### `V41-001`

- white/gray/teal·flat surface가 exact-query 안에서만 적용된다.
- 폴더→날짜→완료와 Undo·reload 흐름이 유지된다.
- 전역 PlatformNav는 한 번만 보이고 로컬 navigation/context도 한 번만 보인다.
- 모바일 주 행동은 하나이며 최소 48px이고 콘텐츠를 가리지 않는다.

### `D2-002`

- Item이 최소 독립 상태 단위이고 Step은 completion 없는 의미 그룹이다.
- SourceRow key는 `(snapshotId,stableKey)` 범위다.
- node key는 `(contentId,nodeKind,stableKey)` 범위다.
- 여러 content의 UUID identity와 version append 뒤 stable identity를 검증한다.
- optional Bundle과 standalone Flow를 모두 허용한다.
- removed identity와 기존 개인·실행 참조를 보존한다.

### `D2-004`

- 여덟 plane은 별도 record와 write owner를 가진다.
- PublishedVersion은 append-only immutable이다.
- source/version transition은 PersonalOverlay와 ExecutionRun payload를 변경하지 않는다.
- ExportSnapshot은 effective projection의 derived immutable envelope다.
- 다른 owner의 payload를 바꾸는 transition은 fail-closed한다.

### `D2-007`

- FlowMe PlatformNav·운영 token을 유지한다.
- 작성 화면은 외부 브랜드가 아니라 원문 / 구조·도구 / 결과의 역할만 참고한다.
- mobile compact 2-state, short-landscape internal scroll, sticky CTA가 동작한다.
- focus·keyboard·Escape 경로가 pointer 경로와 같은 결과를 만든다.

## Negative matrix

| 입력·행동 | 기대 결과 |
|---|---|
| wrong query 또는 unsupported origin | 기존 `/my`로 fail-closed |
| corrupt/future contract payload | 후보 미적용, mutation 0 |
| duplicate UUID 또는 tuple collision | identity validation 실패 |
| 같은 stable key의 다른 node kind | 허용, document-scoped cross-kind collision로 오판하지 않음 |
| dangling/mistyped edge 또는 cycle | graph validation 실패 |
| 기존 PublishedVersion 변경 | immutable-history 실패 |
| source transition 중 overlay/run 변경 | owner-boundary 실패 |
| ExportSnapshot에서 writer/provider 호출 | 경계 실패 |
| same location·cancel·Escape·pointer cancel | mutation 0 |
| PoC prefix 밖 set/remove 또는 clear | 경계 실패 |

## 최종 실행 결과

서로 겹치는 검증 수를 합쳐 새 총계로 만들지 않고, 실제 실행 단위별 종료 상태를 기록한다.

| 실행 | 상태 | 실제 개수 | 의미 |
|---|---:|---:|---|
| P3-F candidate + shell focused | 통과 | 32/32 | canonical·여덟 plane 후보 26개 + focus 계약을 포함한 product shell 6개 |
| P2-B~P3-F additive trace | 통과 | 45/45 | 과거 snapshot 보존, 네 부모·10개 subcheck 승격, 두 가정 정정, gap 7 고정. P3-F 자산 8개 포함 |
| 전체 `npm test` | 통과 | 2,126/2,126 | 12개 Node test invocation이 중단 없이 완료 |
| production build | 통과 | 18/18 | compile·type check와 static page 18개 통과 |
| 최종 Playwright | 통과 | 77/77 | v4.1·통합 작성·Stage 2·Stage 3·standalone·보고서 6개 spec, 필수 5 viewport, keyboard·비드래그, overflow·console·page error·가린 행동 0 |
| `docs:check` | 통과 | 4,632/4,632 | 필수 파일 16개와 로컬 링크 4,632개 |
| `security:audit` | 실패 | 취약점 2건 | `browserslist` 고위험 1건, `postcss-selector-parser` 낮음 1건. `npm audit fix` 미실행 |

Security audit은 실제로 실행했으며 종료 코드 1이다. 의존성 자동 수정은 이 후보 범위에서 수행하지 않는다. 이 실패는 별도 release risk이고, 네 격리 PoC 승격이나 primary gap 7개를 자동으로 바꾸지 않는다.

## 고정 trace 결과

| 구분 | P3-E | P3-F 후보 |
|---|---:|---:|
| 충족 | 134 | 138 |
| 부분 | 8 | 4 |
| 미충족 | 3 | 3 |
| 의도적 변경 | 11 | 11 |
| 제외 | 12 | 12 |
| primary gap | 11 | 7 |

Subcheck는 P3-E의 424개 원자를 유지한다. 네 부모 안의 E4 미달 10개를 갱신하면 `충족 306 / 부분 59 / 미충족 43 / 의도적 변경 4 / 결정 필요 0 / 제외 12`가 된다. 새 atomic requirement를 중복 추가하지 않는다.

## 미실행을 유지하는 항목

- 운영 schema·writer·migration·provider sync·배포
- 실제 Android Chrome
- 실제 iOS Safari
- TalkBack
- VoiceOver
- OS 최대 글자·browser 200%
- 관찰 사용자 검증

자동 Chromium과 screenshot은 실제 기기·보조기술 근거가 아니다. 위 항목이 미실행이어도 네 부모의 격리 통합 PoC 판정은 가능하지만 Production ready는 false다.
