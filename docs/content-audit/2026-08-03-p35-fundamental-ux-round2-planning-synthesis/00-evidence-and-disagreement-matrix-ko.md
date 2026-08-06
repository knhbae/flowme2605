# P35 2차 근본 UX 근거·이견 매트릭스

> 상태: `PRE_APPROVAL_EVIDENCE_SNAPSHOT`
> 범위: `planning-only` · 구현/정본 변경/commit/push/merge/deploy 없음
> 기준일: 2026-08-03
> 실제 관찰 사용자: **0명**
>
> 현재 포인터: Owner는 2026-08-04에 `Q1-B / Q2-B / Q3-B`를 승인했다. 이 문서의 이견·TBD는 승인 전 역사 근거로 보존하며, 현재 결정은 [Owner 승인 기록](./02-p35-round2-owner-decisions-ko.md), 구현 정본은 [active spec](../../specs/2026-08-04-p35-round2-bounded-ux-correction/README.md), 첫 실행 입력은 [B/B/B 개발 착수 프롬프트](./08-bbb-approved-developer-kickoff-prompt-ko.md)를 따른다.

## 0. 이 문서를 읽는 규칙

이 문서는 현재 제품 사실, 사용자 피드백, 두 독립 검토자의 판단, 이번 기획 종합의 권고를 한 표에 섞지 않기 위한 기록이다.

| 표기 | 뜻 | 이 문서에서 할 수 있는 주장 |
|---|---|---|
| `현재 P35 정본` | production과 현재 결정·spec에 이미 반영된 계약 | 현재 동작·정책으로 취급 |
| `사용자 U01~U10` | Owner가 실제 화면을 보고 제기한 문제와 해결 제안 | 강한 문제 신호. 제안한 해법까지 자동 정답은 아님 |
| `Codex 로컬 근거` | 코드·payload·storage·390/1440 runtime·자동화 추적 | 현재 구현 사실과 재현 결함의 근거. 사용자 이해도 근거는 아님 |
| `Claude 독립 제안` | 정적 캡처 기반 IA·카피·화면 Proposal | 설계 대안. 구현된 After나 사용자 검증이 아님 |
| `공통점` | 서로 독립적인 입력이 같은 원인 또는 원칙을 가리킴 | 우선 검토 신호. 그 자체로 승인 완료는 아님 |
| `권고 결정` | 이 기획 종합이 owner에게 제안하는 방향 | 승인 전에는 현재 P35를 대체하지 않음 |
| `TBD` | 현재 근거로 닫을 수 없는 사실·선택 | owner 결정, runtime 검증 또는 실제 사용자 관찰 필요 |

`채택`, `의도 채택·해결법 수정`, `일부 채택`, `기각`, `검증 필요`는 **사용자 피드백에 대한 기획 권고 상태**다. 구현 완료나 사용자 검증 상태가 아니다.

## 1. 소스·해시·신뢰 경계

### 1.1 기준선과 입력

| 구분 | source path | hash / 상태 | 사용 범위와 한계 |
|---|---|---|---|
| 현재 검토 worktree | `D:\flowme2605\flow-p35-production-mobile-p0` | branch `codex/p35-production-mobile-p0` · HEAD `91fb66af063f7041f9442a9dfeb66f9a3e78d723` | 이 문서 작성 시점의 로컬 기준. Round 2 결과·기획 문서는 아직 로컬 산출물 |
| Round 2 handoff | [handoff README](../2026-08-03-p35-fundamental-ux-round2-handoff/README.md), [사용자 피드백 U01~U10](../2026-08-03-p35-fundamental-ux-round2-handoff/01-owner-feedback-normalized-ko.md), [현재 증거 지도](../2026-08-03-p35-fundamental-ux-round2-handoff/03-current-state-evidence-map-ko.md), [종합 프롬프트](../2026-08-03-p35-fundamental-ux-round2-handoff/09-planning-synthesis-prompt-ko.md) | commit `91fb66af063f7041f9442a9dfeb66f9a3e78d723` | 사용자 피드백, 검토 범위, 공통 판정 규칙의 기준 |
| 현재 P35 구현 계약 | [P35 production mobile convergence spec](../../specs/2026-08-01-p35-production-mobile-convergence/spec.md) | source commit `1b669f9086b4473e377b8ab2239f4d5f78d580c8` | 공개→편집→저장→짧은 receipt→내 Flow, public secondary export, legacy Map 비범위를 포함한 현재 계약 |
| 검토 branch의 P35 결정 snapshot | [DECISIONS.md](../../DECISIONS.md), [SERVICE_STRUCTURE.md](../../SERVICE_STRUCTURE.md), [STATUS.md](../../STATUS.md) | review HEAD `91fb66af063f7041f9442a9dfeb66f9a3e78d723` · P35 production merge `4a51b08ce9c5410f4ddf492562a5e885b0fda09c` | P35 구현 당시의 일반 `/my`, route 책임, release 계약을 재현하는 branch-local 근거 |
| 현재 live main 정본 감사 | `D:\flowme2605\flow-mvp\docs\STATUS.md`, `ROADMAP.md`, `DECISIONS.md`, `SERVICE_STRUCTURE.md`, `docs\specs\README.md` | branch `main` · HEAD `c09f859b30b8` · origin ahead/behind `0/0` · 문서에 기존 미커밋 변경 존재 | P35 production baseline, observed users 0, active implementation spec 없음, owner `keep / bounded fix / block` gate를 확인. 기존 변경은 소유권 불명이라 읽기만 함 |
| Codex Round 2 | [결과 README](../2026-08-03-p35-fundamental-ux-round2-results/codex/README.md), [runtime findings](../2026-08-03-p35-fundamental-ux-round2-results/codex/01-local-simulation-findings-ko.md), [scorecard](../2026-08-03-p35-fundamental-ux-round2-results/codex/07-scorecard-ko.md) | 검토 HEAD `91fb66af063f7041f9442a9dfeb66f9a3e78d723` · 앱 코드 기준 `b215698`과 동일 · 로컬 미커밋 산출물 | 55.4/100, hard fail 3건, U01~U10 현재 판정. 내부 로컬 시뮬레이션이며 관찰 사용자 0명 |
| Claude Design Round 2 | `D:\flowme2605\flow-mvp\claude_work\2차 독립 검토 보드 구성_260803_1045.zip` | SHA-256 `D78C9E2B560A7EB5C9ED78A1DD62CBEF3355468B9382BD3D0CE39DFD0FF35B2B` | 캡처 기반 독립 IA·카피·Proposal. 최신 handoff 01~08과 Codex 결과에 접근하지 못함 |
| 이전 P35 비교 보고서 | [P35 Before/After](../2026-08-03-p35-feedback-before-after/p35-owner-feedback-before-after-ko.html) | 과거 내부 보고서 | 이전 bounded 개선의 배경. 실제 사용자 관찰 근거가 아님 |

### 1.2 검증 경계

- Codex는 390×844·1440×1000 로컬 화면, 코드, 테스트, payload를 확인했지만 실제 사용자의 이해를 관찰하지 않았다.
- Claude는 정적 캡처 14개와 당시 접근 가능한 자료만 보았다. 따라서 runtime parity, 저장 데이터, export payload 사실은 Codex 근거를 우선한다.
- Claude ZIP의 전체 텍스트에는 `U01`~`U10` 식별자가 없다. ZIP README도 최신 `01-owner-feedback-normalized-ko.md`~`08-review-scorecard-ko.md`에 접근하지 못했다고 명시한다.
- Claude의 **사용자 해결안 반증 01~08**, **화면 제안 P1~P8/D1~D2**, 사용자 피드백 **U01~U10**은 서로 다른 세 묶음이다. 아래 U행의 Claude 열은 기획자가 관련 설계 원칙을 연결한 것이며 Claude가 해당 U번호에 답했다는 뜻이 아니다.
- 자동화 통과, 내부 점수, 스크린샷, 디자인 Proposal을 `관찰 사용자 검증` 또는 구현된 `After`로 부르지 않는다. 현재 실제 관찰 사용자는 **0명**이다.

## 2. 현재 P35와 제안 supersession 분리

아래 왼쪽 열이 지금 유효한 기준선이다. 오른쪽은 owner 승인과 새 superseding decision·활성 spec 없이는 적용되지 않는다.

| 영역 | 현재 P35 정본 | Round 2 권고 제안 | supersession / 승인 조건 |
|---|---|---|---|
| 제품 상태 | P35 production baseline. 현재 active implementation program은 없고 keep/bounded-fix/block 검토 단계 | 제한된 UX 구조 보정안을 개발 가능 수준으로 준비 | owner가 bounded scope를 승인하기 전 현재 상태 유지 |
| 일반 `/my` | literal `/my`는 날짜 그룹 cross-Flow `할 일`이 기본이고 인접 `Flow`가 library·focused workspace를 소유 | 안정적인 저장 계획 library shell을 중심으로 두고 Today는 compact 파생 요약으로 제한. 저장 직후에는 선택 계획 상세 deep-link | **현재 P35 Alternative B를 명시적으로 다시 여는 제안.** Q2 승인, 새 dated decision, rollback 경로 필요 |
| 공개 상세과 저장 | 공개 상세는 result-first, 한 primary save, 필요 시 조정. 저장 후 짧은 receipt에서 선택 Flow로 이동 | 공개는 발견·미리보기·미저장 조정, 저장 성공은 선택 계획 상세로 즉시 이동하고 상단 1회 저장 배너 표시 | receipt 전용 화면을 대체하므로 승인된 lifecycle contract와 회귀 기준 필요 |
| 내보내기 | 공개 Flow-level 보조 export는 working draft, `내 Flow` export는 persisted personal/execution state를 읽음 | 저장 계획을 권위 있는 재생성·범위·이력·재시도의 주 소유자로 둠. 공개는 조건을 만족한 단방향 로컬 복사/파일만 예외 후보 | 공개 export를 전면 제거하는 안은 아님. 예외 범위는 Q1 결정 필요 |
| 행동 소유권 | public/saved, Flow/Item 여러 깊이에 편집·내보내기 진입이 존재 | `capability × lifecycle × scope`마다 primary owner 1개를 정하고 shortcut은 효과와 라벨을 다르게 표시 | “앱 전체 한 위치만”이 아니라 **같은 효과의 기본 소유자 1개**로 gate를 재정의 |
| 편집 | 공개 Flow는 full-height sheet, 저장 Flow는 인라인, 저장 Item은 별도 sheet, Map은 legacy editor | 하나의 editor family: 같은 필드 순서·dirty/commit/cancel/error/focus 문법, 모바일 full-height surface. 공개 `변경 반영`과 저장본 `저장`은 구분 | transaction 계약은 P0 권고. source/personal/execution 경계는 유지 |
| 결과 형식 | calendar/checklist/sheet/memo renderer와 내부 execution lens가 있고 노출·손실 규칙은 경로별 차이 | canonical 계획 하나를 `주 결과 1 + 바로 가능 최대 2 + 조건부 + 불가 이유`로 projection | 모든 Flow에 고정 5형식 강제 금지. 형식별 loss schema와 parity test 선행 |
| Flow Map | legacy `/flow-maps/[map]`, 선택·여러 Flow·review hold·호환 저장 계약 유지. 단일 effective snapshot migration은 현 spec 비범위 | 먼저 적용 제목·선택 수·주 preview·CTA·save payload의 7→7 parity만 bounded fix. 일반 Flow adapter 흡수는 후속 별도 결정 | parity fix와 legacy migration을 한 slice에 섞지 않음 |
| 도움·주의 | 중요한 운동 주의는 inline. 전 화면 공통 disclosure 등급은 없음 | 반복 설명 삭제, 일반 도움 점진 공개, 조건·손실은 행동 옆, 안전·중복·비가역 영향은 항상 inline | 모든 내용을 `?`/`!` 팝업 안에 숨기는 안은 기각 |
| 용어 | 내비게이션·CTA·본문에서 `Flow`가 널리 쓰임. 이해도 관찰 근거 없음 | 핵심 사용자 화면에서 결과어 `계획`을 우선하는 단계 전환 후보, FLOW 브랜드·URL·내부 모델 유지 | Q3와 실제 사용자 과업 전에는 전면 치환하지 않음 |
| 검증 | 자동화·production evidence는 있으나 observed users 0 | 내부 QA와 사용자 관찰을 별도 gate로 운영 | 내부 gate 통과를 UXR 성공으로 승격 금지 |

## 3. 쟁점별 사실·공통점·이견

| 쟁점 | 현재 사실 | 사용자 의도 | Codex 결론 | Claude 독립 결론 | 공통점 | 핵심 이견 | 권고 결정 | 추가 확인 |
|---|---|---|---|---|---|---|---|---|
| 생명주기와 상태 소유권 | 공개 working draft, saved personal state, execution, export가 존재하지만 진입점과 카피가 겹침 | 무엇이 저장됐고 어느 화면에서 무엇을 바꾸는지 한 번에 이해 | lifecycle별 상태를 분리하고 capability×state별 owner 지정 | 저장을 유일한 개인 commit으로 두고 public draft→saved plan→transfer를 분리 | 저장·실행 완료·외부 복사를 서로 다른 상태로 명명 | Codex는 public working draft의 조건부 export를 비교적 넓게 허용, Claude는 saved transfer 기본과 매우 좁은 예외 강조 | saved plan을 authoritative owner로, public은 조건부 one-way 결과만 Q1 후보 | 권한 거절·부분 성공·중복·재시도·재진입 |
| `내 Flow` 첫 화면 | 현재 plain `/my`는 cross-Flow `할 일`; Flow library는 인접 view | Today·방금 저장·저장 계획 중 무엇이 중심인지 재설계 | 문맥형 C: 저장 직후 selected, 일반 진입 bounded Today+library link | library-first B + 저장 직후 1회 pin. 완전 문맥형 C는 예측성 때문에 부분 채택 | Today는 저장 계획의 파생이며 library가 원본 계획·lifecycle의 집 | 일반 진입의 primary가 bounded Today인지 library인지 다름 | 안정적인 library shell + compact Today + 저장 직후 selected deep-link | Q2, 0·1·5·20·완료·보관·오늘 없음 runtime/관찰 |
| 저장 결과(receipt) | 현재 별도 짧은 receipt와 한 번 더 `내 Flow에서 이어하기`가 있음 | 저장 뒤 바로 전체 계획과 다음 행동 확인 | receipt에 snapshot·scope·loss를 남기고 선택 Flow로 연결 | 전용 receipt 제거, selected plan 상단 `저장됨·N개·되돌리기` 배너 | 저장 성공 사실과 다음 상태가 한 화면에서 이어져야 함 | 별도 화면 유지 여부 | 전용 화면은 제거하고 selected plan에 provenance를 담은 1회 배너 | 새로고침·재진입·중복 저장·되돌리기 |
| 공개/저장 내보내기 | 양쪽 모두 존재하고 서로 다른 snapshot·generator·지원 형식을 사용 | 실제 전송은 `내 Flow`에서 하고 여러 결과를 예측 | capability 조건부 C: 단순 로컬 copy/file은 public, 이력·권한·완료는 saved | public은 format preview, actual transfer는 saved; 미수정·eligible일 때만 narrow exception | 저장본이 재생성·재시도·개인 상태의 주 소유자 | public 예외의 폭 | Q1 전까지 narrow exception을 권고하되 구현하지 않음 | 실제 quick-export 수요, external round-trip, format loss |
| 결과 형식 | public 1~2, saved 3+1 등 노출이 다르고 일부 카피와 payload가 불일치 | 여러 형식을 미리 보고 선택 | primary 1 + eligible secondary, Todo lens와 portable checklist 구분 | capability 4등급, 사용자-facing Todo/checklist 통합 | 고정 5형식 금지, 실제 capability와 loss를 먼저 계산 | Todo/checklist의 사용자 명칭과 구분 정도 | 내부 Today/Todo는 실행 lens, 외부 결과는 `할 일·체크리스트` 계열로 표현 | 형식별 preservation/loss schema와 representative fixtures |
| 공통 editor | public sheet, saved Flow inline, saved Item nested sheet, Map 별도 | 공개/저장 편집 UI 통일, 하단 펼침 제거 | 공통 full-height sheet와 atomic transaction, commit label은 상태별 구분 | 같은 editor family·full-height sheet, 공개 반영/저장본 저장 구분 | 구조·필드 순서·취소·오류·focus는 같고 commit 효과는 다름 | 실질 이견 없음 | 공통 transaction을 P0 계약으로 채택 권고 | Back/Escape/cancel/error/focus, nested depth, 390 sticky overlap |
| Flow Map | 3칸 요약과 별도 editor. 적용 7개인데 주 preview가 8개인 runtime hard fail | 불필요한 3칸 삭제 또는 도움말로 감산 | parity를 P0, 선택/전체 1행만 유지, migration은 별도 | Map 구조·캡처에 접근하지 못해 확인 필요로 남김 | 결정에 영향 없는 반복 요약은 줄이고 결과 수는 일치해야 함 | Claude는 현재 Map 사실을 검증하지 못함 | Codex runtime을 현재 사실로 채택. 3칸 grid는 감산하되 선택/전체 값 유지 | legacy choose-child/save-all/review-hold fixture |
| Item 상세·copy 감산 | 파란 surface, `실행할 일`, `할 일 수정`, 완료·메모·단일 export가 겹침 | 색상 통일·중복 heading 제거·수정 카피 축약 | 삭제 등급과 contextual command 적용 | P7에서 완료 primary, 수정 secondary, 나머지 overflow | read-first, completion 1 owner, 반복 문구·표면 감산 | 완료 후 행이 남거나 사라질 때 undo 규칙은 추가 확인 | U04 채택, 완료 복구 규칙은 상태별 정의 | 완료/되돌리기와 필터 이동, screen reader |
| 도움·주의 | 중요 안전 문구는 inline이나 공통 분류·interactive icon contract 없음 | 도움 `?`, 주의 `!`로 화면을 단순화 | 삭제/decision inline/progressive/always-visible warning/receipt 등급 | 삭제·도움·조건·안전의 4등급, 위험은 아이콘 밖 inline | 일반 설명은 줄이고 안전·손실은 숨기지 않음 | 사용자 제안의 popup 일괄 적용 여부 | 의도 채택·해결법 수정. 아이콘은 보조 수단만 사용 | keyboard open/close, accessible name, focus return |
| `Flow` 용어 | 주요 경로에서 반복, 처음 보는 사용자 이해도 evidence 없음 | 더 이해되는 표현 검토 | 브랜드·내부 Flow 유지 + 첫 노출/CTA에 결과 언어 | 사용자 UI에서는 `계획`, FLOW는 브랜드만 유지 | 결과와 행동을 먼저 말해야 함 | 단계 전환 범위 | Q3 전까지 hybrid 유지, 승인 시 핵심 navigation부터 단계 적용 | 실제 사용자에게 `Flow`/`계획` 클릭 결과 설명 과업 |

## 4. Codex hard fail과 해석 보정

Codex의 현재 score는 **55.4/100**, hard fail은 **3건**이다. 이 수치는 내부 gate이며 사용자 만족도 점수가 아니다.

| hard fail | 재현 사실 | 기획 종합의 해석 | 권고 처리 |
|---|---|---|---|
| HF-01 Flow Map parity | 적용은 7개인데 main preview·상단 요약은 8개 | 같은 effective result의 화면·CTA·save가 다름 | bounded P0. preview·CTA·save payload 모두 7로 맞춘 뒤 legacy migration은 별도 |
| HF-02 저장 Item checklist 약속/payload | UI는 완료 기준을 함께 옮긴다고 말하지만 실제 text payload에서 누락 | 지원 손실 자체보다 **화면 약속과 실제 결과 불일치**가 hard fail | payload에 보존하거나 약속을 정확히 낮춤. saved Flow ICS 완료 상태 손실과 별개로 추적 |
| HF-03 기본 행동 위치 반복 | public/saved·Flow/Item 여러 깊이에 편집·export 진입 | “export는 앱 전체 한 곳”으로 해석하면 권고 C와 충돌 | 동일 효과에 대해 `capability × lifecycle × scope`별 primary owner 1개로 gate를 명문화 |

Codex 문서 안의 우선순위 표는 일부 saved ICS completion 손실을 P1로 두지만 HF-02의 saved Item checklist 약속/payload 불일치는 P0다. 두 항목을 합쳐 “모든 완료 상태를 모든 형식에 강제”하지 않는다. 먼저 형식별 보존·손실 계약과 화면 문구를 일치시킨다.

## 5. U01~U10 채택 수준 추적

> 중요: `Codex 현재 판정`은 구현 현황의 `O/△/X/TBD`이고, `기획 채택 수준`은 사용자 제안에 대한 권고다. 둘은 같은 척도가 아니다. Claude 열은 관련 독립 제안의 기획 연결이며 Claude의 U번호 직접 응답이 아니다.

| ID | 사용자 의도·제안 | 현재 P35 / Codex 현재 판정 | Codex 권고 | Claude 관련 독립 제안 | 공통점 | 이견·반증 | 기획 채택 수준 | 권고 결정 | TBD / gate |
|---|---|---|---|---|---|---|---|---|---|
| U01 | 실제 내보내기는 `내 Flow`에서 | public working export와 saved export가 모두 존재 · `△` | capability 조건부 C: public one-way copy/file, saved authoritative regeneration | P2/P8: public format preview, actual transfer는 saved; 미수정·eligible만 예외 | saved plan이 개인 상태·재생성·이력의 주 소유자 | 전면 My Flow 전용은 저장 없는 단순 사용에도 저장을 강제 | **의도 채택·해결법 수정** | saved primary + narrow public exception 후보 | **Q1** public 예외 유지 여부, 실제 quick-export 수요 |
| U02 | 도움은 `?`, 주의는 `!` 팝업 | 공통 등급 없음, 중요 운동 주의는 inline · `X` | 삭제→결정 inline→progressive help→항상 보이는 위험 | 4등급 disclosure. 안전·중복·비가역 영향은 inline | 반복 설명은 줄이고 중요한 영향은 숨기지 않음 | 모든 경고를 아이콘 뒤에 숨기면 안전·발견성·접근성 악화 | **의도 채택·해결법 수정** | 아이콘은 보조, 위험은 행동 가까이 직접 표시 | keyboard·screen reader·focus return |
| U03 | `내 Flow` 전체 재설계·비교 study | current plain `/my`는 cross-Flow Todo, adjacent library · `△` | 문맥형 C: 일반 bounded Today, 저장 직후 selected, library 직접 연결 | P6/D1: library-first B + 저장 직후 pin, Today는 파생 link | library는 저장 계획/lifecycle의 집, Today는 파생 | 일반 진입 primary를 Codex는 Today 요약, Claude는 library로 봄 | **채택** | stable library shell + compact Today + post-save selected deep-link | **Q2** current P35 supersession, 0·1·5·20·완료·보관 검증 |
| U04 | Item 상세 색상 통일, `실행할 일` 삭제, `할 일 수정→수정` | 해당 표면과 문구가 활성 화면에 존재 · `X` | 중복 surface/heading 삭제, Item 완료 1 owner | P7/D2: 완료 primary, 수정 secondary, 나머지 overflow | 정보 순서와 행동을 먼저 두고 시각·문구 감산 | `수정`은 Item 문맥 밖에서는 대상이 모호할 수 있음 | **채택** | Item 상세 안에서만 `수정`, 파란 독립 surface·중복 heading 제거 | 완료 후 undo/필터 이동, accessibility 회귀 |
| U05 | Flow Map 3칸 요약 삭제 또는 `?`로 이동 | 3칸 유지 + 적용 7/preview 8 · `X` | parity P0, CTA 근처 `선택 7/전체 8` 한 줄만 유지 | Map 현재 구조를 보지 못해 확인 필요. 일반 감산 원칙만 제안 | 반복 정보는 줄이되 행동 결과 수는 보여야 함 | 세 값 전체 삭제는 선택 범위·저장 수까지 숨길 위험 | **일부 채택** | 3칸 grid 삭제, 선택/전체 1행 유지, parity 먼저 수정 | legacy Map fixture와 compatibility contract |
| U06 | 시작일 입력 바로 아래 같은 날짜 반복 삭제 | 같은 값 echo 재현 · `X` | echo 삭제, 실제 preview 범위 변화로 반영 확인 | P1/P3에서 중복 날짜·설명 삭제, diff는 변화가 있을 때만 | 같은 값 반복은 삭제하고 적용 결과는 preview에서 확인 | 적용 피드백까지 모두 없애면 날짜 반영 여부가 안 보임 | **채택** | input echo 삭제, 결과가 달라지는 한 지점만 갱신 | 날짜 선택/변경/삭제/과거/undated 회귀 |
| U07 | CTA 통일, 여러 형식 미리보기, 하단 `편집/완료`, 저장 후 `내 Flow` 이동 | Flow별 CTA·형식 노출 차이, receipt 추가 클릭 · `△` | primary 1 + eligible secondary, selected Flow direct, `완료`는 실행에만 | P1/P2/P5/P8: 저장 primary, capability preview, inline receipt, actual transfer 분리 | CTA는 상태 결과를 말하고 저장 직후 계획과 바로 연결 | 고정 5형식과 `완료`는 빈 결과·저장/실행 혼동을 만듦 | **의도 채택·해결법 수정** | `수정 / 내 계획에 저장`, capability preview, selected detail+save banner | **Q1/Q3**, receipt re-entry·중복·undo |
| U08 | 공개/`내 Flow` 편집 UI 통일, 하단 펼침 제거 | public sheet, saved Flow inline, saved Item nested · `X` | 같은 full-height editor family, 공개 Apply와 saved Save 분리 | P3/P4/D2: common editor family, commit 의미는 상태별 구분 | field/order/cancel/error/focus는 공통, commit target은 분리 | 화면과 라벨까지 완전 동일하면 미저장 반영을 영구 저장으로 오해 | **의도 채택·해결법 수정** | 공통 구조·거래 문법 채택, 상태 badge·commit label 구분 | atomicity, dirty guard, Back/Escape/error/focus |
| U09 | `더보기`는 5형식 preview만, 편집은 하단에서 | 공개 상세가 preview·행 수정·Flow 편집·save·export를 함께 소유 · `X` | primary 1, 가능한 secondary만, 편집·export 소유권 감산 | P1/P2: public detail은 결과/출처/save 중심, format preview 분리 | 공개 상세의 역할과 visible primary를 줄임 | 고정 5형식과 하단 `완료`는 재도입하지 않음. source·주의도 제거 불가 | **일부 채택** | 더보기는 eligible result preview 중심, 편집은 별도 진입, save는 명시적 | 처음 5초 행동 이해, 390 command hierarchy |
| U10 | `Flow` 용어가 이해되는지 확인 | `Flow` 광범위 노출, 관찰 근거 없음 · `TBD` | Flow 브랜드/모델 유지 + 첫 노출·CTA에 결과 언어 | 화면에서는 `계획`, FLOW는 브랜드에 유지 | 사용자에게 내부 모델보다 결과·행동을 먼저 설명 | 전면 치환 범위와 비용에 이견 | **검증 필요** | Q3 전에는 hybrid, 승인 시 핵심 화면부터 단계 전환 | **Q3** 및 실제 사용자 용어·클릭결과 과업 |

### 5.1 상태 집계

| 채택 수준 | ID | 의미 |
|---|---|---|
| 채택 | U03, U04, U06 | 문제와 방향을 수용. 단 U03은 현 P35를 바꾸므로 owner 승인 필요 |
| 의도 채택·해결법 수정 | U01, U02, U07, U08 | 사용자 목표를 수용하되 저장 강제·위험 숨김·고정 형식·commit 혼동을 피하도록 해법 변경 |
| 일부 채택 | U05, U09 | 불필요한 구조는 제거하지만 결정 정보·출처·주의·실제 가능한 결과는 유지 |
| 기각 | 없음 | U 전체를 기각하지 않음. 다만 각 행의 위험한 세부 해법은 명시적으로 제외 |
| 검증 필요 | U10 | 용어 이해는 관찰 사용자 0명 상태에서 확정 불가 |

### 5.2 이번에 명시적으로 기각한 세부 해법

1. 모든 내보내기를 무조건 저장 후에만 허용하는 것.
2. 모든 도움·주의를 `?`/`!` 안에만 숨기는 것.
3. 모든 계획에 고정 5형식을 노출하는 것.
4. 저장·편집 종료·실행 완료를 모두 `완료`로 부르는 것.
5. Flow Map의 선택/전체 결과 수까지 전부 숨기는 것.
6. public draft와 saved plan의 commit label·효과까지 완전히 같게 만드는 것.
7. 근거 없이 모든 `Flow` 표현을 한 번에 치환하는 것.

## 6. Claude Proposal 10개 — U번호와 분리한 참조

아래는 ZIP 내부 `review-package-260803-2050/06-screen-spec-ko.md`와 `wireframes/README.md`의 제안 화면 목록이다. 모두 **미구현 Proposal**이며 U01~U10과 번호상 대응하지 않는다.

| Claude ID | 제안 화면 | 핵심 제안 | 현재 근거 한계 |
|---|---|---|---|
| P1 | 공개 계획 상세 | 결과·기간·항목·조건·출처, 저장 primary | 정적 공개 캡처 기반 |
| P2 | 결과 형식 미리보기 | capability·불가 이유·조건 CTA | 정적 export 캡처 기반 |
| P3 | 공통 계획 편집 | full-height sheet, 상태 badge, commit 구분 | 공개 editor 캡처 기반 |
| P4 | 항목 편집 | 공개 반영 / 저장본 저장, 오류 시 draft 보존 | 직접 Before 캡처 없음 · 확인 필요 |
| P5 | 저장 후 선택 계획 상세 | 별도 receipt 대신 저장 배너 | 현재 receipt 캡처에서 추론 |
| P6 | My Plans library | 저장 pin·Today 파생 link·filter·list | 20개 상태는 설계 추론 · runtime 확인 필요 |
| P7 | Item 상세 | 완료 primary·수정 secondary·나머지 overflow | Item 상세 캡처 기반 |
| P8 | 실제 전송 확인 | 범위→형식/개수→버전/도착지·중복 경고 | 외부 실제 전송은 미검증 |
| D1 | desktop My Plans | 420px 목록 + 선택 상세 | 직접 Before 없음 · Proposal only |
| D2 | desktop 선택 계획 | left rail + center detail + right Item inspector | 직접 Before 없음 · Proposal only |

Claude가 최신 사용자 U번호를 보지 못했다는 사실 때문에 “Claude가 U03을 채택했다”처럼 쓰지 않는다. 정확한 표현은 “Claude의 P6/library-first 제안이 U03의 재설계 의도와 관련된다”이다.

## 7. 권고 결정과 남은 이견

| 결정 영역 | 권고 | 반영하는 U | 남긴 대안·이견 | 현재 상태 |
|---|---|---|---|---|
| D1 `내 Flow` | stable saved-plan library shell + compact Today + post-save selected detail | U03, U07, U10 | 현행 Today-first 유지 vs library 중심 변경 | `TBD_OWNER_Q2` |
| D2 lifecycle / ownership | public preview·draft, saved plan authoritative edit/run/export, narrow public one-way exception 후보 | U01, U07, U08, U09 | public quick export의 존재와 범위 | `TBD_OWNER_Q1` |
| D3 canonical plan / formats | canonical 계획 1개, capability 기반 projection, 고정 5형식 금지 | U05, U07, U09 | Todo/checklist 사용자 명칭은 copy 단계에서 조정 | 원칙 권고, loss schema 검증 필요 |
| D4 editor contract | 공통 editor family와 atomic transaction, public Apply ≠ saved Save ≠ Item Complete | U04, U08, U09 | viewport surface는 달라도 의미 계약은 동일 | P0 권고, runtime acceptance 필요 |
| D5 terminology / disclosure | 핵심 화면 결과어 단계 적용 후보, 위험은 inline | U02, U10 | `Flow`→`계획` 전환 범위 | `TBD_OWNER_Q3` + observed UXR |

## 8. Owner에게 남길 질문 — 최대 3개

1. **Q1:** 미수정·eligible·계정 연결 없음 조건의 저장 없는 로컬 복사/파일 내보내기를 남길 것인가?
2. **Q2:** 현재 P35의 일반 `/my` cross-Flow Todo 기본 진입을 저장 계획 중심 shell로 명시적으로 supersede할 것인가?
3. **Q3:** FLOW 브랜드·URL·내부 모델은 유지하면서 핵심 사용자 화면의 `Flow`를 `계획`으로 단계 전환할 것인가?

코드와 현재 상태로 답할 수 있는 Map parity, Item checklist 약속/payload 불일치, editor transaction 차이는 owner 취향 질문으로 넘기지 않는다.

## 9. 구현 전 반드시 닫을 TBD

| 구분 | 확인할 것 | 닫는 근거 | 사용자 관찰과의 관계 |
|---|---|---|---|
| Owner | Q1~Q3와 bounded scope | owner 승인 기록 | 승인이지 UXR 아님 |
| 정본 승격 | 새 superseding DECISION, active spec, owner, rollback | repo 문서와 scope link | 문서 gate |
| IA runtime | 0·1 dated·1 undated·5·20·완료·보관·오늘 없음 | deterministic fixture + mobile/wide browser | 첫 행동 이해는 별도 관찰 필요 |
| lifecycle | save double-click, reload, same source re-entry, undo | storage/route/browser test | 저장 위치 이해는 별도 관찰 필요 |
| editor | clean/dirty/invalid/submitting/error, Back/Escape/cancel/focus | state matrix + accessibility browser test | 예측 가능성은 별도 관찰 필요 |
| projection | title/order/date/memo/completion/criterion/source loss | format별 golden fixture와 실제 payload | 외부 결과 이해는 별도 관찰 필요 |
| Flow Map | selected/applied/preview/CTA/save count parity | legacy compatibility fixture | 구조 이해는 별도 관찰 필요 |
| export | 권한 거절·부분 성공·중복·재시도·단방향 안내 | 실제 destination 또는 faithful adapter evidence | quick-export 수요는 실제 관찰 필요 |
| 극단값 | 50 Item, 긴 한글, mixed date/repeat, 390px sticky overlap | browser regression | 성능·가독성 관찰 별도 |
| 용어 | `Flow`/`계획`이 클릭 뒤 결과를 예측시키는가 | 제한 사용자 과업 | **현재 observed users 0명** |

## 10. 종료 판정

- 현재 P35는 그대로 정본이다.
- 이 문서의 권고는 `DRAFT_FOR_OWNER_REVIEW`이며 제안 wireframe은 구현된 After가 아니다.
- U01~U10 모두 추적되었고, 전체 기각 항목은 없다. 세부 해법의 기각은 각 행에 이유와 함께 분리했다.
- Codex와 Claude의 공통점은 상태 소유권·editor family·capability 결과·위험 inline·post-save 연속성이다.
- 가장 큰 이견은 일반 `내 Flow`의 기본 IA, public quick export 범위, 사용자-facing `Flow` 용어다. 각각 Q2, Q1, Q3로 제한했다.
- 코드/runtime 사실은 Codex를, 화면 구조 대안은 Claude Proposal을 참고했으며 어느 쪽도 실제 사용자 관찰로 승격하지 않았다.
- 실제 관찰 사용자 수는 **0명**이다.
