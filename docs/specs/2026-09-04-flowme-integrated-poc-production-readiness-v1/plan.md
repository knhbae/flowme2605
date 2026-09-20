# P3-E 실행 계획

## 판정 원칙

P3-E는 `production implementation` 단계가 아니라 `production-target contract + readiness gate` 단계다. 계약의 논리적 owner 이름은 책임을 설명하며 실제 팀·서비스·테이블을 지정하지 않는다.

## 단계별 계획

| 단계 | 작업 | 상태 | 통과 조건 |
|---|---|---|---|
| 0 | P3-D 결과, 7월 canonical, 6월 Step bridge, 7월 editability 권고 대조 | 완료 | Item/Step 충돌과 미승인 owner 경계 명시 |
| 1 | production-target identity/owner planning contract 작성 | 완료 | version·planning-only flag·8 layer·전체 identity path 고정 |
| 2 | pure validator와 positive/negative fixtures 작성 | 완료 | focused 24/24, P3-D canonical 결합 35/35 |
| 3 | 11 gap 선행관계와 P3-D subcheck 해석 보정 | 문서화 완료 | `부분`과 `미충족`을 근거 없이 승격하지 않음 |
| 4 | package/trace/report 연결 및 scoped 회귀 | 완료 | P3-E 24/24, 결합 35/35, trace 37/37과 gap 11을 동일 반영 |
| 5 | 전체 `npm test`, production build, docs 검사 | 완료 | 2,094/2,094, 18/18, 필수 16개·로컬 링크 4,617개 |
| 6 | 자동 브라우저 회귀 | 완료 | PoC 2/2 + local report 1/1, 필수 5 viewport와 저장 경계 통과 |
| 7 | 제품 identity/owner와 production shell/token 결정 | 보류 | 제품 owner의 명시 승인 필요 |
| 8 | Android/iOS·접근성 실기 | 보류 | 안정 build와 실제 기기 필요 |
| 9 | 운영 저장·migration 설계/구현 | 범위 밖 | `D2-002`, `D2-004` 승인 후 별도 목표로 시작 |

## 선행관계별 트랙

### A. 데이터 계약

1. P3-E planning contract의 focused 결과를 유지한다.
2. `D2-002`에서 stable ID 발급자, SourceRow/Snapshot 관계, Step grouping, 선택적 Bundle grouping을 제품 결정으로 승인한다.
3. 여러 content 문서에 걸친 ID uniqueness를 보장할 production registry 범위를 정한다.
4. 그 결과를 바탕으로 `D2-004`의 실제 서비스 owner, 권한, 보존기간, 감사 이벤트를 정한다.
5. review 결정을 담을 VersionResolution receipt와 적용 권한을 별도 production gate로 확정한다.
6. 승인 뒤에만 storage/API/migration 계획을 만든다.

planning contract는 2~6을 대신하지 않는다.

### B. 디자인 결정

1. `V41-001`과 `D2-007`을 한 디자인 gate에서 비교한다.
2. v4.1 시각 문법 중 유지할 요소와 production shell/token을 결정한다.
3. responsive·keyboard·source review 상태를 final shell에 재적용한다.
4. 결정된 build를 actual-device 후보로 고정한다.

### C. 실제 기기와 접근성

1. Android Chrome에서 `V41-062`, `V41-066`, `D2-038`, `D2-042`를 함께 실행한다.
2. iOS Safari에서 `V41-063`, `V41-066`, `D2-038`, `D2-042`를 함께 실행한다.
3. TalkBack·VoiceOver·OS 글자 확대·browser 200%로 `V41-064`, `D2-061`을 실행한다.
4. 실패가 디자인 변경을 요구하면 B 트랙으로 돌아간 뒤 실기 전체를 재실행한다.

## 독립 hold: dog catalog preview

`dog-adoption-first-week:review_due:2026-06-04`의 감사 결과는 `catalog_preview`다. 계약 트랙의 선행 조건은 아니지만 이 Flow의 production 일반 실행을 막는 콘텐츠 hold다.

1. 완료된 source mismatch 감사와 catalog-preview disposition을 유지한다.
2. 콘텐츠 owner가 refresh 또는 대체 source 승인을 결정한다.
3. 결정 근거와 새 source 시점을 source review 기록에 남긴다.
4. 변경이 있으면 전체 `npm test`를 다시 실행한다.

테스트 통과만을 위해 날짜를 미는 조치는 허용하지 않는다.

## 실패 시 처리

- 계약 validator 실패: writer/migration으로 진행하지 않고 fixture/결정을 수정한다.
- full regression 실패: 관련성 여부를 분리하되 전체 green을 선언하지 않는다.
- browser 실패: affected surface만 수정하고 required viewport를 다시 확인한다.
- actual-device 실패: 자동 검사를 근거로 덮지 않고 디자인 gate로 되돌린다.
- owner 미결정: 운영 schema를 추정하지 않고 `부분` 판정을 유지한다.

## 공개 상태

commit, push, PR, Preview, Production은 이 계획에 포함하지 않는다. 별도 요청과 closeout 근거가 있어야 진행한다.
