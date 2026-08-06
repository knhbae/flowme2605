# P35 2차 근본 UX 기획·개발 인계 패키지

> 상태: `OWNER_APPROVED_LOCAL_HANDOFF`
> 기준일: 2026-08-03
> Owner 승인일: 2026-08-04
> 승인 조합: `Q1-B / Q2-B / Q3-B` (`bounded fix`)
> 범위: 기획 합의와 개발 인계 문서만 작성
> 미수행: 앱 구현, `SERVICE_STRUCTURE.md` 변경, commit, push, PR, merge, 배포, 실제 사용자 관찰

## 한 줄 결론

공개 화면은 **발견·미리보기·미저장 조정**, `내 Flow`는 **저장한 계획·실행·권위 있는 내보내기**를 맡도록 생명주기를 다시 나누고, 고정 5형식 대신 콘텐츠가 실제로 만들 수 있는 결과만 보여주는 방향을 개발 기준으로 확정했다.

Owner는 2026-08-04에 아래 세 질문을 모두 B로 승인했다. 이 폴더는 승인된 방향을 개발에 넘기는 **로컬 인계 패키지**이며, 구현 완료나 배포 상태를 뜻하지 않는다. 구현 정본은 [P35 Round 2 bounded UX correction active spec](../../specs/2026-08-04-p35-round2-bounded-ux-correction/README.md)이다.

1. **Q1-B:** 미수정·eligible·로컬 파일/복사에 한해 저장 없는 제한적 빠른 사용을 남긴다.
2. **Q2-B:** 일반 `/my`를 안정적인 저장 계획 library shell로 재구성하고 Today는 compact 파생 요약으로 둔다.
3. **Q3-B:** FLOW 브랜드·URL·내부 모델은 유지하면서 핵심 사용자 화면의 `Flow`를 `계획`으로 단계 전환한다.

## 현재 기준선

| 항목 | 현재 확인된 사실 | 이 패키지의 취급 |
|---|---|---|
| 제품 상태 | P35는 배포된 production baseline이다. | Round 2 제안을 구현 완료 상태로 쓰지 않는다. |
| 다음 구현 | Owner가 `bounded fix`와 B/B/B 방향을 승인했다. | 활성 spec의 strict order에 따라 `P0-01`부터 시작한다. 구현·게시 권한은 별도다. |
| 일반 `/my` | 현재는 날짜별 cross-Flow `할 일`과 인접한 Flow library가 기준이다. | 승인된 목표는 저장 계획 중심 IA이며, 현행 결정을 supersede하는 정본 기록은 active spec과 canonical decision에서 관리한다. |
| 내보내기 | 공개 화면에는 보조 내보내기, `내 Flow`에는 저장본 기반 재생성 책임이 있다. | capability별 소유권을 더 명확히 나누는 승인 계약을 구현한다. |
| 검증 | 자동화·브라우저 검토·정적 디자인 검토는 있지만 실제 관찰 사용자는 `0명`이다. | 시뮬레이션을 UXR 성공으로 표현하지 않는다. |

현재 정본 감사에는 `D:\flowme2605\flow-mvp`의 `STATUS.md`, `ROADMAP.md`, `DECISIONS.md`, `SERVICE_STRUCTURE.md`, `docs/specs/README.md`를 사용했다. 해당 worktree의 기존 미커밋 변경은 소유권이 불명확하므로 이 작업에서 수정하지 않았다.

## 읽는 순서

| 순서 | 문서 | 독자 | 답하는 질문 |
|---:|---|---|---|
| 1 | [근거·이견 매트릭스](./00-evidence-and-disagreement-matrix-ko.md) | 기획·디자인·개발 | 무엇이 사실이고, 무엇이 제안이며, 어디에서 의견이 다른가? |
| 2 | [승인된 목표 UX](./01-p35-round2-fundamental-ux-decision-ko.md) | 전원 | 승인된 네 가지 근본 결정을 하나의 생명주기로 어떻게 묶는가? |
| 3 | [Owner 승인 기록](./02-p35-round2-owner-decisions-ko.md) | Owner | B/B/B와 bounded scope는 무엇인가? |
| 4 | [상태 계약 개발 인계](./03-state-contract-development-handoff-ko.md) | 개발·QA | 각 상태의 진입·행동·취소·오류·데이터 효과는 무엇인가? |
| 5 | [개발 순서와 티켓](./04-development-sequence-and-tickets-ko.md) | 개발 리드 | 어떤 순서로 나누어 구현하고 어디에서 멈추는가? |
| 6 | [인수·QA 매트릭스](./05-acceptance-and-qa-matrix-ko.md) | 개발·QA | 어떤 정상·실패·회귀 조건을 통과해야 하는가? |
| 7 | [독립 검토 프롬프트](./06-independent-review-prompts-ko.md) | Codex·Claude Design | 서로 다른 관점으로 어떻게 재검토하는가? |
| 8 | [현재·A안·B안 UX 비교](../2026-08-03-p35-round2-ux-comparison-ko.html) | Owner·기획·디자인 | B/B/B를 선택한 근거와 현재 화면의 차이는 무엇인가? |
| 9 | [개발 착수 프롬프트 템플릿](./07-developer-kickoff-prompt-ko.md) | 기획·개발 리드 | 다음 티켓에서도 재사용할 변수형 템플릿은 무엇인가? |
| 10 | [B/B/B 승인 개발 착수 프롬프트](./08-bbb-approved-developer-kickoff-prompt-ko.md) | 구현 담당자 | 지금 복사해 첫 `P0-01` 세션을 어떻게 시작하는가? |
| 11 | [전체 프로그램 단계별 개발 목표](../../specs/2026-08-04-p35-round2-bounded-ux-correction/full-program.md) | 개발 리드·구현·QA | G0/G1부터 P0·P1·V1까지 각 단계의 목표·산출물·인수·다음 gate는 무엇인가? |

## 입력 자료와 신뢰 경계

| 자료 | 사용 목적 | 신뢰·제약 |
|---|---|---|
| [기획 종합 프롬프트](../2026-08-03-p35-fundamental-ux-round2-handoff/09-planning-synthesis-prompt-ko.md)와 같은 폴더 01~08 | 사용자 피드백 정규화, 시나리오, 평가 기준 | 이번 산출물 요구사항의 기준 |
| [Codex Round 2 결과](../2026-08-03-p35-fundamental-ux-round2-results/codex/README.md) | 로컬 runtime·payload·상태·회귀 근거 | 55.4/100, hard fail 3건. 실제 사용자 관찰이 아님 |
| Claude Design ZIP — `D:\flowme2605\flow-mvp\claude_work\2차 독립 검토 보드 구성_260803_1045.zip` | 독립 시각·IA·카피 검토와 P1~P8/D1~D2 제안 | SHA-256 `D78C9E2B560A7EB5C9ED78A1DD62CBEF3355468B9382BD3D0CE39DFD0FF35B2B`. 최신 01~08과 Codex 결과를 보지 못한 정적 검토이며 판정은 `revise` |
| [이전 P35 Before/After](../2026-08-03-p35-feedback-before-after/p35-owner-feedback-before-after-ko.html) | 기존 수정의 배경·화면 비교 | 자동/내부 QA이지 관찰 사용자 증거가 아님 |
| 현재 `flow-mvp` 정본 문서 | production baseline·기존 결정·승격 게이트 | 기획 제안으로 덮어쓰지 않음 |

Claude ZIP에는 `U01~U10` 식별자가 없다. Claude의 **사용자 해결안 반증 01~08**과 **제안 화면 P1~P8/D1~D2 10개**는 서로 다른 묶음이며, 어느 쪽도 U01~U10으로 임의 대응하지 않는다.

## 승인 결정 요약

1. 일반 `내 Flow`는 흔들리지 않는 저장 계획 library shell로 두고, 오늘 실행 항목은 파생 요약으로 한 줄만 보여준다. 저장 직후에는 방금 저장한 계획 상세로 직접 이동하고 한 번만 저장 배너를 보여준다.
2. 공개 상세는 결과 형식 미리보기와 미저장 편집을 맡는다. 저장한 계획은 범위 선택·재생성·중복 경고·전송 결과를 포함한 권위 있는 내보내기를 맡는다.
3. 외부 결과는 `캘린더 / 할 일·체크리스트 / 시트 / 메모` 계열로 정리하되 모든 콘텐츠에 고정 형식을 강제하지 않는다. `Today/Todo`는 외부 형식이 아니라 내부 실행 lens다.
4. 공개 초안과 저장본은 같은 editor family를 사용한다. 공개는 `변경 반영`, 저장본은 `저장`이며 취소·뒤로가기·오류 시 draft를 잃지 않는 공통 transaction 계약을 사용한다.
5. 도움말은 먼저 삭제·축약하고 필요할 때 점진 공개한다. 안전·중복·비가역 영향은 물음표나 느낌표 안에만 숨기지 않는다.

## 승인 결과와 개발 인계 순서

1. [Owner 결정안](./02-p35-round2-owner-decisions-ko.md)에 Q1-B/Q2-B/Q3-B와 `bounded fix` 승인을 기록했다.
2. 승인 범위는 [active spec](../../specs/2026-08-04-p35-round2-bounded-ux-correction/README.md)으로 승격한다.
3. canonical `DECISIONS.md`에는 오래된 결정을 고쳐 쓰지 않고 새 날짜의 superseding decision을 추가한다.
4. canonical `STATUS.md`, `ROADMAP.md`, `docs/specs/README.md`에 하나의 활성 scope와 owner를 연결한다.
5. 실제 동작이 바뀌는 구현 PR에서만 `SERVICE_STRUCTURE.md`를 갱신한다.
6. [B/B/B 승인 개발 착수 프롬프트](./08-bbb-approved-developer-kickoff-prompt-ko.md)로 [개발 순서](./04-development-sequence-and-tickets-ko.md)의 `P0-01` foundation 티켓부터 시작한다.

## 즉시 중지 조건

- B/B/B 승인 범위를 넘어 일반 `/my`, 공개 빠른 사용, 핵심 용어를 추가 변경하려는 경우
- 기존 source/base 데이터를 개인 편집으로 덮어쓰려는 경우
- 모든 콘텐츠에 다섯 형식 또는 캘린더 결과를 강제로 만드는 경우
- Map parity를 고치는 PR에 legacy Map migration까지 섞으려는 경우
- 자동화나 디자인 시뮬레이션을 실제 사용자 검증 완료로 보고하려는 경우
