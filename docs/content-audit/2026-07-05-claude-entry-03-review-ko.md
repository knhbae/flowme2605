# 2026-07-05 Claude 진입점 관련 고민 03.zip 검토

## 상태

- 검토 대상: `D:\flowme2605\flow-mvp\claude_work\FlowMe 진입점 관련 고민 03.zip`
- 검토 유형: FLOW UX review, URL-first / export-first / memo-to-Flow wireframe package review
- 읽기용 HTML: [Claude 진입점 03 검토 보드](./2026-07-05-claude-entry-03-review-ko.html)
- 결론: 채택 가능하지만, 구현 백로그로 넘기기 전에 5개 보정이 필요하다.

## 총평

03.zip은 이전 02.zip보다 요청을 훨씬 잘 반영했다. 새로 추가된 `FlowMe URL-first 시뮬레이션 스토리보드.dc.html`는 실제 seed 컨텐츠를 넣고 URL hit, 중복 재사용, public Flow 저장, 날짜 없는 진도표, 특수 workbench, memo-to-Flow, low-quality/miss를 연속 장면으로 구성했다. `FlowMe URL-first 화면설계 (와이어플로우).dc.html`도 기존 4-tab IA를 유지하면서 URL 입력, lookup, export, My Flow/Calendar 연결을 얹는 방향이라 큰 구조는 맞다.

다만 그대로 구현 요청서로 쓰면 안 된다. fake usage처럼 보이는 카운트, repo 경로 오해, needs_review 컨텐츠의 export 허용, 실제 canonical source URL 불일치, AI fallback을 P0에 넣는 문제를 먼저 고쳐야 한다.

## Findings

1. **High - Trust signal:** 스토리보드 A2에 `추천 124명 저장`이 들어가 있다. 현재 계정 기반 사용 데이터가 없으므로 fake usage/social proof처럼 보인다. 기존 정책상 실제 사용량이나 리뷰가 없으면 source-backed 신호만 써야 한다.
   **수정:** `추천 124명 저장`을 제거하고 `같은 URL로 변환된 Flow 있음`, `원문 검토일`, `출처`, `최근 수정일`, `내가 저장하면 내 사본 생성` 같은 검증 가능한 신호로 바꾼다.

2. **High - Repo grounding:** 와이어플로우 문서가 "브리프는 flow-mvp/ 경로를 참조했지만 실제 앱은 레포 루트"라고 적었다. 실제 GitHub 기준 active app은 `flow-mvp/` 하위다. 같은 zip의 README도 GitHub source root를 `.../flow-mvp`로 링크한다.
   **수정:** 모든 GitHub path 기준을 `flow-mvp/`로 통일한다. `@ main` 표기도 현재 작업 브랜치 `codex/flowme-uxui-second-loop` 또는 "제공된 branch 기준"으로 고친다.

3. **High - Source gate:** `vehicle-inspection-prep`는 현재 `source_status: needs_review`인데, Scene B는 비로그인 `.ics` 다운로드와 저장을 자연스럽게 허용한다. needs_review 컨텐츠는 대표 노출뿐 아니라 export까지도 사용자 실행으로 이어지므로 source gate가 필요하다.
   **수정:** needs_review 컨텐츠는 `저장 전 미리보기`, `원문 확인 필요`, `검토 전 export 제한` 상태로 그린다. direct link preview는 가능하되 `.ics`/My Flow 저장은 `review pass` 또는 사용자 명시 확인 뒤로 둔다.

4. **Medium - URL fidelity:** 이사 hit 장면은 `ajd-blog.tistory.com/이사준비체크`를 보여주지만 실제 source URL은 `www.ajd.co.kr/...`다. URL-first 제품에서는 canonical URL 자체가 핵심 데이터이므로 예시 URL도 근거와 맞아야 한다.
   **수정:** 화면에는 축약 표시를 쓰더라도 canonical source는 실제 AJD URL 기준으로 둔다. 축약 display URL과 canonical_url을 분리해 표시한다.

5. **Medium - P0 scope:** 와이어플로우의 P0 slice에 `AI 생성 fallback + canonical 축적`이 포함되어 있다. 현재 우선순위는 lookup/reuse/export를 먼저 닫고, AI는 cost gate가 있는 fallback으로 뒤에 둬야 한다.
   **수정:** P0는 URL 입력, canonical lookup, HIT 화면, 기존 Flow 재사용, 시작일/목적지 최소 옵션, My Flow 연결, `.ics`/Markdown/checklist copy export로 제한한다. AI generation은 P1 또는 P0 stub으로만 둔다.

6. **Medium - Candidate mixing:** 스토리보드는 공개 routed 컨텐츠와 후보/검토 큐를 표에서 구분했지만, 장면에서는 후보 컨텐츠가 사용 가능한 public route처럼 보일 수 있다.
   **수정:** 대표 컨텐츠, direct-link preview, internal candidate를 시각적으로 구분한다. 일반 사용자 첫 화면에는 internal `needs_review`, `source_import_required` 같은 문구 대신 `원문 확인 전`, `저장 보류` 같은 사용자 언어를 쓴다.

## 좋은 점

- 실제 컨텐츠 15개를 생활/이사/자동차/육아/공부/운동/행정으로 섞은 점은 좋다.
- 이사 URL hit -> 옵션 -> My Flow -> Calendar 장면은 P0 검증용으로 가장 적합하다.
- 중1 수학처럼 날짜 없는 컨텐츠를 Calendar 오류가 아니라 Markdown/Sheet 중심 실행으로 분리한 점이 좋다.
- memo-to-Flow를 URL-first와 경쟁시키지 않고 secondary entry로 둔 점이 맞다.
- "재사용이 기본, AI는 예외"라는 큰 방향은 잘 반영됐다.

## Rubric

- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 3
- Portability: 4
- Cognitive Load: 3
- Copy Specificity: 4
- Source/Safety: 3
- Accessibility/Operability: 3

평균은 괜찮지만, source/trust 보정 전에는 구현 백로그로 바로 넘기면 안 된다.

## Recommended fixes

1. `추천 124명 저장` 같은 숫자 신뢰 신호를 전부 제거한다.
2. GitHub 기준 path를 `flow-mvp/`로 통일하고 branch 표기를 고친다.
3. needs_review 컨텐츠의 export/save는 제한하거나 명시 확인을 요구한다.
4. 이사 예시는 실제 AJD canonical URL 기반으로 수정한다.
5. AI generation을 P0 core에서 빼고 miss 상태의 P1 fallback 또는 disabled/stub으로 낮춘다.
6. P0 구현 slice는 `URL input -> lookup HIT -> reuse/options -> export -> My Flow/Calendar` 하나로 압축한다.

## 판단

03.zip은 방향성 검토용으로는 충분히 유용하다. 다음 작업은 이 산출물을 구현하지 말고, 위 보정사항을 반영한 "P0 구현 slice 요청서"를 다시 만들거나 Claude에게 재수정 요청을 보내는 것이다.
