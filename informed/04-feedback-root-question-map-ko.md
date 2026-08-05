# U01~U10 → root question·scenario mapping

## 해석 원칙

각 문단을 `관찰/문제 진술`, `제안된 해법`, `검증할 근본 질문`으로 분리한다. 제안된 해법은 자동 채택하지 않는다. current evidence로 문제가 확인되면 `UF-###` finding을 만들고, 해법은 `채택 | 부분 채택·해법 수정 | 대안 채택 | 기각 | 증거 부족`으로 판정한다.

## Root questions

| ID | 근본 질문 |
|---|---|
| RQ-01 | `/my`의 primary job은 계획 library, 오늘 실행, 선택 계획 관리 중 무엇이며 첫 viewport의 순서는 무엇인가? |
| RQ-02 | 공개 초안→편집→저장→개인 계획→실행/결과 이동 lifecycle이 어떤 상태 전환과 receipt를 가져야 하는가? |
| RQ-03 | 한 canonical plan을 목적지별 결과로 투영할 때 어떤 형식이 의미 있고, preview와 actual은 어떻게 같아야 하는가? |
| RQ-04 | plan edit, Item edit/complete, save, result 이동의 action owner와 transaction 경계는 무엇인가? |
| RQ-05 | 도움·조건·경고·되돌릴 수 없는 consequence를 inline과 on-demand 중 어디에 둬야 하는가? |
| RQ-06 | 브랜드/내부 identity와 첫 노출 사용자 용어·CTA·결과 label을 어떻게 분리하는가? |
| RQ-07 | 같은 역할의 editor/detail/result UI는 public과 saved lifecycle 차이를 숨기지 않으면서 어떻게 일관되어야 하는가? |

## Mapping

| 입력 ID | finding 후보 | 문제 진술과 해법의 분리 | root question | primary scenario | 보조 scenario | 필수 반증 |
|---|---|---|---|---|---|---|
| U01 | UF-001 | 문제: 결과 이동 action의 위치/발견성. 해법: 개인 계획 영역에서 제공. | RQ-02, RQ-04 | **S05** | S04, S21 | 공개 quick에서도 export-first 가치가 필요한지, 저장 강제가 불필요한 마찰인지 검증 |
| U02 | UF-002 | 문제: helper/warning이 화면을 지저분하게 함. 해법: `?`/`!` popup. | RQ-05 | S11 | S16 | material risk까지 접으면 action 전 consequence가 사라지는지 검증 |
| U03 | UF-003 | 문제: `/my` 전체 IA와 정보 순서가 불명확. 해법: 다른 앱 study 후 재구성. | RQ-01 | S06 | S15, S23 | 다른 제품의 workspace 복제가 MVP를 무겁게 만드는지 검증 |
| U04 | UF-004 | 문제: Item 상세의 색·heading·CTA wording 불일치. 해법: 배경 통일, heading 삭제, label 축약. | RQ-04, RQ-07 | S07 | S15, S16 | 축약 후 plan edit와 Item edit가 구별되는지 검증 |
| U05 | UF-005 | 문제: Flow Map 3칸 요약의 필요성/밀도. 해법: 삭제 또는 help로 이동. | RQ-05 | S10 | S11 | 선택 범위·영향·저장 결과를 action 전에 잃지 않는지 검증 |
| U06 | UF-006 | 문제: 시작일 입력값이 바로 아래에서 중복되어 보임. 해법: 반복 표시 삭제. | RQ-05, RQ-07 | S02 | S03, S19 | 입력 반영 확인·실제 결과 날짜까지 사라지지 않는지 검증 |
| U07 | UF-007 | 문제: 공개 상세 CTA와 결과 preview가 일관되지 않고 저장 후 이동이 약함. 해법: CTA 단순화, 여러 format preview, 저장 후 `/my`, 큰 이동 button. | RQ-02, RQ-03, RQ-04 | S02 | S04, S05, S09, S21 | 모든 계획에 모든 형식을 강제하면 빈/손실 결과가 생기는지, `완료`가 저장/Item 완료와 충돌하는지 검증 |
| U08 | UF-008 | 문제: public/saved editor가 다르고 inline expansion이 맥락을 흐림. 해법: UI 통일 및 별도 화면/modal. | RQ-04, RQ-07 | S08 | S03, S11, S16 | visual 동일화가 Apply/Save/Cancel/persistence 차이를 숨기는지 검증 |
| U09 | UF-009 | 문제: 공개 상세의 preview와 edit가 한 영역에서 경쟁함. 해법: 더보기는 format preview, 하단 edit/completion으로 editor 진입. | RQ-02, RQ-03, RQ-04 | S02 | S03, S09 | 고정 5형식과 generic completion이 capability/state truth를 깨는지 검증 |
| U10 | UF-010 | 문제: `flow`라는 용어의 이해 가능성 의문. 해법은 미정. | RQ-06 | S01 | S02, S05, S06, S23 | 내부 type·source-authored text·브랜드까지 전면 치환할 필요가 있는지 분리; 실제 이해도는 UXR 없이는 확정하지 않음 |

## 결과 기록 template

| 입력 ID | UF finding | Pass 1 연결 | 문제 확인 | 해법 판정 | counterevidence | current implementation evidence | UXR 질문 |
|---|---|---|---|---|---|---|---|
| UXX | UF-0XX 또는 `NOT_CREATED` | CX-/CD- | confirmed/not confirmed/unknown | 채택/부분 채택·해법 수정/대안 채택/기각/증거 부족 | `TBD` | `TBD` | `TBD` |

`Todo/Today`는 `/my`에서 오늘 실행할 Item을 모아 보는 실행 렌즈다. U07/U09의 format 수를 셀 때 Calendar·Checklist·Sheet·Memo에 더하는 다섯 번째 export로 간주하지 않는다.

creator, text authoring, publishing, text-to-flow에서 같은 단어 문제가 보이더라도 이번 mapping에는 넣지 않고 `OUT_OF_SCOPE_ROUTE_DEBT`로 남긴다.
