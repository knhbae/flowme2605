# FlowMe P28 개발 복붙용 단일 handoff

아래 코드 블록 전체를 다음 개발 AI에 전달한다.

```text
D:\flowme2605\flow-mvp에서 FlowMe P28 구현 프로그램을 이어서 진행해줘.

이번에는 전체 P28을 한 번에 구현하지 않는다. 먼저 전체 검토 결과를 읽고 P28-01을 공식 작업 목표로 등록한 뒤 구현·검증·evidence 작성까지 끝낸다.

[정본과 검토 결과]

정본 prompt:
https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation/prompt-ko.md

정본 input package:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation

독립 검토 결과:
docs/content-audit/2026-07-21-flowme-p28-00-promise-implementation-alignment/

반드시 먼저 읽을 파일:

1. AGENTS.md
2. agent.md
3. docs/content-audit/2026-07-21-flowme-p28-00-promise-implementation-alignment/README.md
4. docs/content-audit/2026-07-21-flowme-p28-00-promise-implementation-alignment/review.html
5. docs/content-audit/2026-07-21-flowme-p28-00-promise-implementation-alignment/audit.md
6. docs/content-audit/2026-07-21-flowme-p28-00-promise-implementation-alignment/canonical-alignment.md
7. docs/content-audit/2026-07-21-flowme-p28-00-promise-implementation-alignment/promise-matrix.json
8. docs/content-audit/2026-07-21-flowme-p28-00-promise-implementation-alignment/journey-step-matrix.json
9. docs/content-audit/2026-07-21-flowme-p28-00-promise-implementation-alignment/source-capability-matrix.json
10. docs/content-audit/2026-07-21-flowme-p28-00-promise-implementation-alignment/p28-backlog.md
11. docs/content-audit/2026-07-21-flowme-p28-00-promise-implementation-alignment/qa.md

[전체 판정]

P28-00 판정은 `structural_correction_required`다.

P27의 다음 기반은 production에서 확인됐으므로 다시 설계하지 않는다.

- source / personal overlay / execution run / occurrence / export identity
- 저장 전 포함·날짜·제목·메모·순서 조정
- 저장 receipt와 My Flow 연결
- 완료와 완료 취소
- Flow 보관·복구
- Item 제외·삭제·복구
- 반복 series와 occurrence 구분
- resource와 subcheck 구분
- Calendar Flow filter와 날짜 없는 항목 배치
- 전체·선택·개별 export scope

P28은 다음 경험의 저장 전 부분을 보완한다.

외부 콘텐츠·메모
→ 저장될 전체 Flow
→ 콘텐츠에 맞는 primary artifact
→ 필요한 값만 개인화
→ 저장 또는 외부 이동
→ receipt
→ My Flow·Calendar 실행

[확인된 문제]

- `FlowSaveBeforeFrame.tsx`는 previewRows 중 5개만 표시한다.
- `/f/moving-d30-basic`은 24개 Flow를 `저장될 전체 Flow`라고 표시하면서 5개와 `외 19개`만 보여준다.
- 전체 outline과 Calendar workbench가 서로 다른 영역에 나뉘어 있다.
- `artifact-plan.ts`의 primary surface와 save-before/export eligibility가 하나의 정책을 공유하지 않는다.
- `FlowItem.type`은 `todo | calendar`뿐이다.
- 폭염 경고·참고자료처럼 완료하면 안 되는 top-level 정보의 안전한 역할 계약이 없다.
- K-MOOC, 폭염, 계약 검토, 부모님 여행 source는 production lookup miss다.
- 가짜 Flow 생성으로 문제를 우회하면 안 된다.

[전체 P28 순서]

- P28-01: 저장 전 전체 Flow와 artifact preview shell
- P28-02: itemRole과 primary/secondary destination 정책
- P28-03: contextual adjustment workspace
- P28-04: My Flow 탐색·전체 Flow·복구 hierarchy
- P28-05: Calendar·반복·export scope 통합
- P28-06: 다섯 대표 콘텐츠 source·rights·safety gate
- P28-07: regression/final gate

필수 순서:
P28-01 → P28-02 → P28-03 → P28-05 → P28-07

P28-04는 P28-01 이후 병렬 가능하다.
P28-06 준비는 P28-02와 병렬 가능하지만 public 활성화는 P28-05 이후다.

[이번 실행 목표: P28-01]

저장 전에 사용자가 실제로 저장할 전체 Flow와 콘텐츠의 primary artifact를 하나의 화면 계약으로 확인할 수 있게 만든다.

적용 route:

- /f/[slug]
- /flow-maps/[slug]
- /flows의 existing_flow_found
- /flows의 proposal_ready

구현 범위:

- public Flow와 source-backed Flow를 공통 형태로 읽는 `SaveBeforeProjectionVM` 또는 동등한 read-only adapter를 만든다.
- source 상태, 저장될 전체 outline, primary artifact, 아직 필요한 사용자 값, 포함 항목 수, destination별 결과 수, 손실 note를 하나의 projection으로 제공한다.
- `previewRows.slice(0, 5)`에 의존하는 전체 Flow 표시를 제거한다.
- 모바일은 단계 요약과 `전체 보기`를 제공한다.
- 24개 전체 제목을 한 번의 사용자 행동으로 확인할 수 있게 한다.
- 1024px은 2열을 기본으로 하고 고정 3열을 사용하지 않는다.
- 기존 ArtifactWorkbench renderer와 P27 personal overlay를 최대한 재사용한다.
- primary CTA에는 결과 형태와 개수를 표시한다.
  - `24개 일정으로 시작`
  - `5개 할 일로 시작`
- source-backed 5개 Flow와 public 24개 Flow가 같은 shell을 사용하게 한다.

데이터 원칙:

- 이번 slice에서는 persistence schema와 ID를 변경하지 않는다.
- migration을 만들지 않는다.
- source/personal/run/occurrence/export identity를 변경하지 않는다.
- 저장 전 수정을 위한 새 저장소를 만들지 않는다.
- P28-02의 itemRole과 destination eligibility를 이번 slice에서 성급하게 구현하지 않는다.
- 기존 artifact-plan을 안전한 초기 resolver로 사용한다.
- 새로운 source 콘텐츠나 seed를 추가하지 않는다.

비범위:

- itemRole 전체 구현
- K-MOOC·폭염·계약·여행 Flow 등록
- AI 생성 또는 crawler
- 전체 Flow 편집기
- My Flow IA와 Calendar engine 변경
- 계정·DB·cloud sync
- 외부 Calendar·Todo·Notion 연동

모바일 acceptance:

- 390×844에서 source → 전체 Flow → primary artifact → 필요한 값 → primary action 순서를 공유한다.
- competing primary action은 1개 이하다.
- 24개 전체 Flow를 한 번의 동작으로 펼칠 수 있다.
- 가로 overflow와 fixed UI overlap이 없다.
- 펼치기 종료 후 focus가 trigger로 복구된다.

wide acceptance:

- 1024×768에서 outline과 primary artifact를 동시에 비교한다.
- stretched mobile stack이나 잘린 3열 화면이 아니다.
- source-backed와 public Flow가 같은 shell을 사용한다.
- 1280px 미만에서 고정 3열을 사용하지 않는다.

정합성 acceptance:

- save-before included count와 펼친 outline row count가 일치한다.
- save-before → receipt → My Flow의 item identity와 count mismatch가 0이다.
- 제외한 항목이 receipt와 My Flow에 다시 나타나지 않는다.
- 취소 시 source와 personal overlay write가 0이다.
- 기존 반복·resource·Calendar·export가 회귀하지 않는다.

접근성 acceptance:

- 전체 보기 control에 `aria-expanded`를 제공한다.
- outline과 artifact heading hierarchy를 명확히 한다.
- 버튼 accessible name에 실제 결과와 개수를 포함한다.
- keyboard만으로 전체 보기, artifact 확인, 조정 진입, 저장이 가능하다.
- 이름 없는 visible focusable은 0이다.

테스트와 evidence:

- public/source-backed adapter unit test
- 5·14·24·38개 count-only structural fixture
- 실제 source 내용을 추정해 fixture를 채우지 않는다.
- moving save-before → 조정 → 저장 → receipt → My Flow E2E
- source-backed moving 5개 parity E2E
- workout recurrence/resource 회귀
- vehicle undated Calendar 회귀
- 390×844와 1024×768 screenshot
- overflow, fixed overlap, console/page error, accessible name 검사

필수 검증:

- npm.cmd run docs:check
- npm test
- npm.cmd run build
- npm.cmd run test:e2e -- tests/e2e/p27-foundation.spec.ts --workers=1
- P28-01 targeted E2E
- full E2E

작업 방식:

- 최신 origin/main을 확인하고 clean worktree에서 작업한다.
- 기존 dirty worktree와 사용자 변경을 보존한다.
- 구현 전 현재 production 기준 상태를 기록한다.
- 구현 전후 모바일·wide screenshot을 남긴다.
- 앱 전체 재설계나 긴 설명 추가로 문제를 덮지 않는다.
- 자동화와 agent simulation을 실제 사용자 검증이라고 표현하지 않는다.
- 사용자 모집·관찰·인터뷰는 이번 목표에 포함하지 않는다.
- commit, push, PR, merge, deploy는 요청받기 전 실행하지 않는다.

완료 보고에서는 다음을 분리한다.

- 재사용한 P27 계약
- 새 projection/view model
- 변경한 화면
- 변경하지 않은 데이터 계약
- 실행한 검증과 결과
- 남은 회귀 위험
- commit/push/PR/deploy 상태
- 다음 목표 P28-02의 itemRole·artifactPolicy 경계
```
