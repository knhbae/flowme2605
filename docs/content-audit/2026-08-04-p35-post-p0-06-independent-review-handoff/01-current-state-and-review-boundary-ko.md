# 현재 상태와 검토 경계

## 기준선

| 항목 | 현재 사실 |
|---|---|
| Production | P35가 현재 배포 기준선 |
| Local candidate | Round 2 P0-01~P0-06 local PASS |
| 기준 조상 | `91fb66af063f7041f9442a9dfeb66f9a3e78d723` |
| branch | `codex/p35-production-mobile-p0` |
| 게시 상태 | Round 2 local 변경은 commit·push·PR·merge·Preview·Production 미실행 상태에서 검토 패키지를 준비함 |
| 다음 구현 gate | P0-07 capability preview — 이 패키지는 구현을 시작하지 않음 |
| 실제 관찰 사용자 | `0명` |

Production 화면과 local candidate 화면을 같은 현재 상태로 부르면 안 된다. Codex는 local candidate를 직접 재현하고, Claude Design은 이 패키지의 명시된 캡처와 문서만 사용한다.

## P0-01~P0-06에서 바뀐 핵심

| 단계 | ROUND2_LOCAL_P0_06 구현 사실 | 아직 증명하지 않는 것 |
|---|---|---|
| P0-01 | canonical IDs·snapshot·capability/loss manifest·action owner 기반 | 실제 화면 노출과 실제 artifact 생성 |
| P0-02 | Flow Map의 selected/applied/preview/save ID·수량 parity | 3칸 시각 감산과 legacy Map migration |
| P0-03 | 완료 기준의 Item 상세·checklist/sheet/ICS payload parity | 모든 형식의 전체 field parity와 실제 외부 앱 round-trip |
| P0-04 | 공개 session draft→원자 저장→선택 계획 상세 direct handoff·1회 저장 배너 | 일반 `/my` library IA와 실제 옮기기 receipt |
| P0-05 | 공개/저장 Plan/Item 공통 transaction·dirty/error/back 계약 | 실제 화면 family |
| P0-06 | 네 context 공통 editor surface·mobile full-height·wide inspector·saved writer | capability preview, `/my` IA, 실제 전송, 감산·전역 copy |

P0-06 local PASS는 기능 계약과 내부 QA 결과다. 사용자가 이해했다는 증거가 아니며, Production에 배포됐다는 뜻도 아니다.

## 사용자 피드백별 현재 상태

이 표는 `ROUND2_LOCAL_P0_06` namespace의 구현 상태를 공통 enum으로 요약한다. `△`는 일부 계약만 반영됐다는 뜻이며, `NOT_IMPLEMENTED`를 실패 `X`로 부르지 않는다.

| ID | 현재 분류 | 반영된 부분 | 남은 핵심 검토·구현 |
|---|---|---|---|
| U01 | `△` | P0-01 action owner·snapshot contract, P0-04 저장 상세 이동 | P0-07 공개/저장 행동 위계, P0-09 saved transfer와 제한 quick-local |
| U02 | `△` | P0-06 editor에서 출처·안전을 icon-only로 숨기지 않음 | P1-02 전 화면 helper 삭제/도움/조건/안전 등급과 접근성 |
| U03 | `NOT_IMPLEMENTED` | Q2-B 결정과 fixture 요구만 고정 | P0-08 일반 `/my`의 0·1·5·20, Today·library·selected detail 관계 |
| U04 | `△` | Saved Item도 공통 editor family에 포함 | S10에서 Item 상세→메모 작성·수정→완료→되돌리기→reload→Today/계획 반영을 검증하고, P1-01에서 중립 surface·`실행할 일`·수정 문구를 감산 |
| U05 | `△` | P0-02에서 Map 7→7 parity와 저장 복구 | P1-01 3칸 grid 감산, `선택 N / 전체 M` 한 줄 유지 여부 |
| U06 | `NOT_IMPLEMENTED` | 없음 | P1-01 시작일 input echo 제거와 결과 반영 확인 위치 |
| U07 | `△` | P0-04 저장 후 선택 계획 direct handoff, P0-06 editor family | P0-07 capability 결과, P0-08 `/my`, P0-09 실제 결과, P1-02 CTA |
| U08 | `△` | 일반 공개/저장 Plan·Item 공통 editor surface·transaction | Flow Map·URL draft·legacy variant는 제외, copy·composition은 후속 |
| U09 | `△` | 편집 진입은 공통 overlay로 분리됨 | P0-07 공개 결과/형식 역할과 중복 CTA 감산 |
| U10 | `NOT_IMPLEMENTED` | Q3-B 단계 전환 결정만 있음 | P1-02 핵심 사용자 화면 copy와 접근성 name, 실제 이해도는 관찰 제외/TBD |

## 지금 독립 검토가 해야 할 일

이번 검토는 P0-06 acceptance를 다시 실행하는 데서 끝나면 안 된다.

1. P0-06의 공통 editor가 사용자 눈에도 하나의 family로 읽히는지 확인한다.
2. P0-07~P0-09의 설계가 네 근본 문제를 실제로 닫을 수 있는지 구현 전에 반증한다.
3. P1-01~P1-02 감산이 중요한 선택 수·출처·완료 기준·안전 정보를 잃지 않는지 확인한다.
4. 과거 Claude 1차의 `저장 전 내보내기 제거`, `My Flow 탭 제거` 같은 제안과 승인된 B/B/B가 다른 곳을 정확히 기록한다.
5. 이전에 증거가 없던 0·1·5·20 계획, 날짜 없음, 실패·중복·재시도·부분 성공, keyboard·screen reader 상태를 검토한다.

## 이번 검토에서 하지 않는 일

- 앱 코드·제품 문구·테스트·fixture 수정
- P0-07 이후 구현 시작
- commit·push·PR·merge·Vercel 배포를 검토 자체의 당연한 후속으로 처리
- Text-to-Flow, creator/publishing, AI 재계획, OAuth·양방향 sync 재설계
- 실제 사용자 관찰 수행 또는 내부 검토를 관찰 사용자 수에 포함
- Proposal을 구현된 After로 표기

## 두 번의 리뷰 gate

| 시점 | 목적 | 미구현 항목 표기 |
|---|---|---|
| 지금, P0-06 이후 | 남은 설계·spec 반증과 P0-07 착수 가능성 확인 | `NOT_IMPLEMENTED` 또는 `TBD`, 실패 `X`로 오인 금지 |
| P1-04 이후 | 같은 시나리오로 구현 수용·회귀 검토 | 실제 runtime 근거로 PASS/FAIL |

지금의 결론은 `다음 구현안을 유지 / bounded 수정 / 결정 재개방` 중 하나다. 전체 프로그램의 사용자 이해 성공 판정이 아니다.
