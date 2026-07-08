# Claude Design P1~P15 제품 방향 종합 리뷰

작성일: 2026-07-08
범위: Claude Design P1~P15 개선 루프, 현재 P16 진입 전 제품 방향 판단
작업 성격: 새 기능 개발 없음, UI 수정 없음, 제품 방향/기준선 재정렬

## 1. 결론

P16을 바로 구현하기 전에 한 번 끊는 것이 맞다. 다만 "P16을 버린다"가 아니라, P16을 **creator/studio 확장 구현**이 아니라 **제품 축 검증 slice**로 다시 읽어야 한다.

현재 FlowMe의 가장 강한 축은 여전히 다음 흐름이다.

```text
외부 콘텐츠 또는 URL
-> 기존 Flow 재사용 또는 후보 저장
-> 시작일/최소 설정
-> calendar/checklist/sheet/memo artifact
-> 내 Flow 저장
-> My Flow / Calendar에서 이어 실행
```

P1~P15 동안 이 축은 꽤 단단해졌다. 4탭 IA, public `/f` 공유 저장, My Flow 실행 허브, Calendar dated execution, URL-first hit/miss/candidate, guardrail/evidence 자동화는 이제 같은 방향을 보고 있다.

반대로 `/u/my-flow-studio`와 creator/channel은 아직 핵심 축으로 승격하기 이르다. P15에서 route tier와 진입점은 잡혔지만, P16 피드백이 말하듯 실제 콘텐츠가 있는 creator-profile은 아직 검증되지 않았다. 즉, 지금의 `creatorProfileGuardrailHitCount: 0`은 "채워진 표면이 안전하다"가 아니라 "빈 방에서 잰 0"에 가깝다.

따라서 추천 방향은 다음이다.

> **FlowMe는 당분간 개인 실행 도구이자 action compiler로 유지한다. creator/studio는 공급과 재사용을 위한 보조 표면으로만 검증하고, 5번째 탭이나 핵심 IA로 승격하지 않는다.**

## 2. 근거 문서

- [PRODUCT_PRINCIPLES.md](../PRODUCT_PRINCIPLES.md): FlowMe는 full workspace가 아니라 action compiler에서 시작한다.
- [SERVICE_STRUCTURE.md](../SERVICE_STRUCTURE.md): 현재 4탭 IA, route role, public/user/creator/internal boundary.
- [DECISIONS.md](../DECISIONS.md): 4탭 IA, URL lookup-first, candidate request, creator/user separation, service-frame decisions.
- [IDEAS.md](../IDEAS.md): memo-to-Flow, creator/channel, community loop, Obsidian-like workspace는 deferred direction.
- [P0~P2 final audit package](./2026-07-03-claude-design-p0-p2-final-audit-package/README.md)
- [P4 final package](./2026-07-04-claude-design-p4-final-review-package/README.md)
- [P5 final package](./2026-07-04-claude-design-p5-final-review-package/README.md)
- [P6 final package](./2026-07-04-claude-design-p6-final-review-package/README.md)
- [P7 final package](./2026-07-05-claude-design-p7-final-review-package/README.md)
- [P8 final package](./2026-07-05-claude-design-p8-final-review-package/README.md)
- [P9 final package](./2026-07-05-claude-design-p9-final-review-package/README.md)
- [P10 final package](./2026-07-06-claude-design-p10-final-review-package/README.md)
- [P11 final package](./2026-07-06-claude-design-p11-final-review-package/README.md)
- [P12 final package](./2026-07-07-claude-design-p12-final-review-package/README.md)
- [P13 final package](./2026-07-08-claude-design-p13-final-review-package/README.md)
- [P14 final package](./2026-07-08-claude-design-p14-final-review-package/README.md)
- [P15 final package](./2026-07-08-claude-design-p15-final-review-package/README.md)

P1~P3는 현재 패키지 이름상 P0~P2 final audit 및 초기 full/review package에 묶여 있다. 이 리뷰에서는 P1~P3를 "초기 사용자 흐름과 4탭/service shell 정리 구간"으로 함께 본다.

## 3. P1~P15 흐름 재정렬

| 구간 | 제품적으로 닫힌 것 | 남은 판단 |
| --- | --- | --- |
| P1~P3 | 첫 진입, Flow finding, Flow Map, public `/f`, My Flow, Calendar의 기본 shell과 post-save 흐름 정리. 4탭 IA가 서비스 기준선으로 자리 잡음. | "검증됨"이 아니라 browser/automated QA 기준선이다. 실제 사용 관찰은 아직 별도. |
| P4~P6 | public `/f` 공유 shell, 저장 CTA 위계, sticky/fixed clearance, 제목/slug/source 노출, My Flow 반복/중복, restart prototype 표시 품질 정리. | public `/f`는 4탭 app shell이 아니라 공유 저장 shell이라는 기준을 계속 유지해야 함. |
| P7~P10 | user-surface guardrail 일반화, prototype bucket, raw ISO/input exemption, My Flow overdue/status, Calendar group header, 짧은 control label, public share tab order, evidence metadata 정리. | evidence가 제품 판단을 돕는 장치인지 계속 점검해야 함. guardrail 자체가 목표가 되면 안 됨. |
| P11~P13 | URL-first 4상태(hit/custom-start/miss/candidate), candidate copy output, export mode별 Markdown 비노출, trigger URL/control matrix, wide spot evidence, post-save confirmation. | URL-first는 제품 핵심 축으로 볼 만하지만, miss/candidate가 실행 가치로 이어지는지 실제 사용 확인 필요. |
| P14~P15 | wide guardrail/layout sanity, `/u/my-flow-studio` creator-profile tier, 스튜디오 진입점, candidate resolved copy marker. | creator/studio는 새 제품 축 후보가 됐지만 아직 "빈 surface" 검증에 가깝다. P16 전에 방향 판단 필요. |

## 4. 사용자 여정별 현재 평가

### 4.1 첫 진입 / Flow 찾기

현재 상태: 유지 기준선.
`/`와 `/flows`는 Home과 Flow finding 역할이 분리됐다. Home은 약속과 대표 시작점, `/flows`는 URL-first와 catalog 역할을 맡는다.

판단: 4탭 IA는 유지한다. URL-first가 붙으면서 `/flows`는 단순 catalog보다 강한 첫 행동을 갖게 됐다. 다만 `/flows`가 "AI 생성기"처럼 보이지 않고 "이미 만든 준비를 먼저 찾고, 없으면 요청을 남기는 곳"으로 유지되어야 한다.

### 4.2 public `/f` 저장 전 화면

현재 상태: 유지 기준선.
public `/f/[slug]`는 공유 진입 shell로 유지되고, 저장/setup path가 primary이며, browse link와 export는 보조 위계로 정리됐다.

판단: public `/f`를 4탭 shell로 다시 편입하지 않는다. 저장 전 사용자의 첫 질문은 "이 콘텐츠를 내 Flow에 저장할까?"여야 한다.

### 4.3 My Flow 실행 허브

현재 상태: 모바일 기준은 강함, wide는 개선 여지.
My Flow는 post-save confirmation, continuation actionable, overdue label, status sheet grouping, inventory metric density까지 닫혔다. 저장된 일을 이어 실행하는 허브로 충분히 읽힌다.

판단: My Flow는 FlowMe의 핵심이다. 다만 wide desktop에서는 아직 모바일 구조 확장 느낌이 남아 있어, P16-05 같은 wide layout은 제품 축이 확정된 뒤 진행하는 것이 좋다.

### 4.4 Calendar / export

현재 상태: 유지 기준선.
Calendar는 dated Step의 global execution tab으로 자리 잡았다. Calendar agenda group header와 My Flow status sheet grouping은 같은 패턴으로 정리됐다. Export는 calendar/sheet/memo/checklist 결과 중심 라벨과 raw ISO input policy가 잡혔다.

판단: Calendar/export는 FlowMe가 기존 도구와 연결되는 핵심 가치다. 앞으로도 "FlowMe 내부에 가두기"보다 "내 캘린더/메모/시트로 가져가기"를 제품 언어의 중심에 둔다.

### 4.5 URL-first

현재 상태: 전략적으로 강함.
P12~P15에서 URL-first hit/custom-start/miss/candidate가 정상 route guardrail에 들어왔고, export mode별 Markdown 비노출, candidate output 내부어 제거, trigger URL/control matrix까지 생겼다.

판단: URL-first는 FlowMe의 다음 핵심 entry가 맞다. 다만 miss/candidate는 아직 "실행 가능한 결과"가 아니라 "요청/후보 저장"이다. 사용자에게 이것을 실행 가능 Flow처럼 보이게 하면 안 된다.

### 4.6 `/restart`와 `/flow-lab`

현재 상태: tier 분리가 잘 됨.
`/restart/moving-d30`는 release-preview로 display gate 0을 유지해야 하고, `/flow-lab/url-first-p0`는 internal-console로 noindex/user nav link 0을 유지한다.

판단: 이 분리는 계속 유지한다. 특히 `/flow-lab`의 내부어 허용을 normal route로 확장하면 안 된다.

### 4.7 `/u/my-flow-studio` / creator-profile

현재 상태: 판단 보류.
P15에서 creator-profile tier와 스튜디오 진입점 marker는 생겼다. 하지만 현재 evidence는 `/u/my-flow-studio`가 실제 콘텐츠 없는 상태에 가깝다. P16 피드백의 핵심은 "0은 맞지만 빈 방의 0"이라는 점이다.

판단: 지금 creator/channel을 핵심 기능으로 키우면 4탭 IA와 Stage 0 action compiler 방향이 흐려질 수 있다. 우선은 secondary surface로 두고, 실제 콘텐츠가 있는 creator-profile evidence를 만든 뒤 다시 판단한다.

## 5. 유지해야 할 기준선

- 4탭 IA: Home / Flow 찾기 / Calendar / My Flow.
- Home은 대표 시작점과 서비스 약속, `/flows`는 catalog 및 URL-first entry.
- public `/f/[slug]`는 공유 저장 shell이며, 저장/setup path가 primary.
- My Flow는 saved execution hub. Today/Now, 전체 목록, status sheet, detail/export는 유지.
- Calendar는 dated saved Step의 global schedule-first tab.
- URL-first는 lookup-first: 기존 Flow 재사용 우선, miss/needs-review는 local non-executable request.
- Candidate copy output은 사용자용 요약과 internal handoff를 분리.
- `user-surface-guardrails.ts`가 user-facing display gate의 정본.
- normal route guardrail 0, visible Markdown 0, candidate user copy internal hit 0, raw ISO visible text 0.
- `/restart/moving-d30`는 release-preview, `/flow-lab/url-first-p0`는 internal-console.
- `/u/my-flow-studio`는 4탭 밖의 creator-profile secondary surface이며 아직 5번째 탭이 아니다.
- source/detail/memo/export 데이터는 삭제하지 않는다.
- 저장/실행/export 스키마는 제품 방향 판단 없이 바꾸지 않는다.

## 6. 재검토해야 할 기준선

| 항목 | 왜 재검토해야 하나 | 다음 판단 기준 |
| --- | --- | --- |
| `/u/my-flow-studio` 역할 | 현재는 creator-profile인지 내 스튜디오인지 공개 채널인지 섞여 있다. | 실제 콘텐츠 있는 profile을 보고 "개인 실행 도구의 보조 표면"인지 "creator platform 시작점"인지 결정. |
| 스튜디오 진입점 | My Flow page action이라고 기록됐지만 Calendar에도 보인다. 모바일/wide 노출 수가 다르다. | My Flow only인지 My Flow + Calendar인지 정책과 배치를 일치. |
| My Flow wide layout | 모바일 기준은 충분하지만 desktop에서 단일 컬럼 확장처럼 보일 수 있다. | P16-01~P16-03 방향 판단 뒤 wide layout 투자 여부 결정. |
| public `/f` wide preview | 저장 primary는 좋지만 wide 우측 preview 공백이 남는다. | public save preview가 실제 저장 판단에 도움 되는지 보고 최소 보강. |
| URL-first miss/candidate 언어 | 금칙어는 줄었지만 miss 상태는 여전히 운영어가 남을 수 있다. | "없지만 요청을 남겨 이어갈 수 있다"는 사용자 가치 중심으로 유지. |
| evidence 작업의 비중 | P8~P15는 guardrail을 많이 강화했다. | evidence는 품질 보호 장치이지 제품 목표가 아니다. 실제 사용자 여정 판단을 우선. |
| 실제 사용자 검증 | 현재 대부분 automated/browser QA다. | "validated" 표현 금지. 관찰 세션 또는 실제 copy/export/check 행동 전까지 internal QA로만 표현. |

## 7. 방향 선택지

### 선택지 A. 개인 실행 도구 집중

FlowMe를 URL/콘텐츠를 calendar/checklist/sheet/memo로 바꾸는 개인 실행 도구로 더 좁힌다. Creator/studio는 숨기거나 후순위로 둔다.

장점:
- PRODUCT_PRINCIPLES와 가장 잘 맞는다.
- 4탭 IA가 단단하다.
- 사용자가 "무엇을 얻는지"가 가장 빠르게 보인다.

단점:
- 콘텐츠 공급/creator 성장 루프는 늦어진다.
- `/u/my-flow-studio`를 이미 노출한 흐름과 일부 충돌한다.

### 선택지 B. creator/channel 플랫폼으로 전환

`/u/my-flow-studio`, creator-profile, channel content를 적극 키운다.

장점:
- 장기적으로 콘텐츠 공급, 재사용, 공유, creator loop로 확장 가능하다.
- Flow of Flows, creator/channel 아이디어와 연결된다.

단점:
- Stage 0 export-first 원칙보다 앞서간다.
- 4탭 IA가 흐려지고, 사용자가 "실행 도구"와 "제작자 채널"을 동시에 이해해야 한다.
- 현재 creator-profile evidence는 빈 상태라 제품 판단 근거가 약하다.

### 선택지 C. 실행 도구 중심 + creator/studio 보조 표면

개인 실행 도구를 중심축으로 유지하되, creator/studio는 supply/reuse를 위한 secondary surface로 검증한다. 4탭 IA 밖에 두고, 실제 콘텐츠가 있는 profile만 guardrail/evidence로 검증한다.

장점:
- 현재 P1~P15 성과를 유지하면서 P16의 creator 리스크도 다룰 수 있다.
- creator를 당장 버리지 않되, 핵심 IA로 과승격하지 않는다.
- P16-01~P16-03을 제품 축 판단용 slice로 만들 수 있다.

단점:
- 당장은 creator/profile UX가 애매하게 보일 수 있다.
- "스튜디오" 이름과 진입점 정책을 빠르게 정리해야 한다.

## 8. 추천 방향

추천은 **선택지 C**다.

다음 한 루프는 P16 전체 구현이 아니라, **P16-01~P16-03을 묶은 creator/studio 정책 검증 slice**로 잡는다.

이 slice의 목표는 creator 기능을 키우는 것이 아니라 다음 세 가지를 판정하는 것이다.

1. 실제 콘텐츠가 있는 `/u/[creator]`도 user-surface guardrail 0을 유지하는가?
2. `/u/my-flow-studio`는 "내 작업 공간"인가, "공개 creator profile"인가, 둘을 분리해야 하는가?
3. `스튜디오` 진입점은 My Flow 전용인가, Calendar에도 있어도 되는 전역 보조 action인가?

이 세 가지가 닫히기 전에는 P16-04/P16-05 wide layout polish를 크게 진행하지 않는 것이 좋다. 레이아웃 투자 전에 제품 축을 먼저 확인해야 한다.

## 9. FLOW UX rubric 관점

| 차원 | 현재 판단 | 이유 |
| --- | --- | --- |
| User Need Fit | 4 | URL/콘텐츠를 실행 artifact로 바꾸는 필요는 명확하다. creator/studio는 아직 필요가 덜 검증됐다. |
| Execution Clarity | 4 | public save, My Flow, Calendar, URL-first hit는 명확하다. miss/candidate와 studio는 추가 정리 필요. |
| Content Fidelity | 3 | source-backed와 URL lookup은 좋아졌지만, creator/profile filled content 검증은 부족하다. |
| Portability | 4 | calendar/sheet/memo/checklist export 축은 FlowMe의 강점으로 남아 있다. |
| Cognitive Load | 3 | P8~P15로 반복/내부어는 줄었지만, studio/creator가 새 인지 부하를 만든다. |
| Copy Specificity | 4 | 내부어 제거와 사용자어 전환은 많이 진행됐다. URL-first miss와 studio copy가 다음 과제. |
| Source/Safety | 4 | source/detail/memo/export 분리는 유지된다. creator/profile source 노출은 filled state 검증 필요. |
| Accessibility/Operability | 4 | public CTA order, short visible labels with accessible names, native input exemption 기준이 있다. |

## 10. 다음 /goal 후보

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P16 백로그의 P16-01/P16-02/P16-03을 "creator/studio 정책 검증 slice"로 해결한다. 새 기능을 크게 추가하지 않고, `/u/my-flow-studio`와 `/u/[creator]`를 실제 콘텐츠가 있는 creator-profile 상태로 캡처·스캔해 빈 방 guardrail 0 문제를 닫고, 내 스튜디오/공개 채널/creator-profile의 IA·copy·noindex 정책과 `스튜디오` 진입점 배치를 명확히 한다. 4탭 IA와 개인 실행 도구 중심 방향은 유지하며, creator/studio는 5번째 탭이 아니라 보조 표면으로만 검증한다.

핵심 질문:
- 실제 콘텐츠가 있는 `/u/[creator]`에서도 internal/source/raw ISO/Markdown/structural display guardrail이 0인가?
- `/u/my-flow-studio`는 current-user studio인가, public creator profile인가, 둘을 분리해야 하는가?
- `내 Flow 스튜디오`, `채널 콘텐츠`, `공개 콘텐츠`, `전체` 같은 문구와 섹션 구조가 사용자에게 실행 허브 `내 Flow`와 헷갈리지 않는가?
- `스튜디오` 진입점은 My Flow 전용인가, Calendar에도 있는 전역 보조 action인가?
- 모바일/wide에서 진입점 정책과 실제 marker가 일치하는가?

구현 원칙:
- `/u/my-flow-studio`를 5번째 탭으로 승격하지 않는다.
- 4탭 IA는 유지한다: Home / Flow 찾기 / Calendar / My Flow.
- FlowMe의 중심축은 URL/콘텐츠 -> 실행 artifact -> 내 Flow/Calendar continuation으로 유지한다.
- creator/studio는 supply/reuse를 위한 secondary surface로만 검증한다.
- seed/source-backed 데이터 구조와 저장/실행/export 스키마는 바꾸지 않는다.
- normal route guardrail 0, URL-first visible Markdown 0, candidate user copy internal hit 0, `/flow-lab` user nav link 0, `/restart` release-preview guardrail 0을 유지한다.

출력:
- filled creator-profile 390px/1024px screenshot/evidence
- creator-profile noindex/public policy
- studio entry visible/reachable/destination marker 정합
- IA/copy 변경 요약 또는 유지 근거
- P16-04/P16-05를 진행해도 되는지 판단
```

## 11. 실행 전 눈검수 체크리스트

P16-01~P16-03 slice가 끝나면 구현을 계속하기 전에 다음 화면을 실제로 한 번 본다.

- `/`
- `/flows`
- `/flows` hit/custom-start/miss/candidate
- `/f/vehicle-inspection-prep`
- `/flow-maps/moving-d30`
- `/my?savedMap=moving-d30`
- `/calendar`
- `/u/my-flow-studio`
- 실제 콘텐츠가 있는 `/u/[creator]`
- `/flow-lab/url-first-p0`
- `/restart/moving-d30`

볼 때의 질문은 다음이다.

- FlowMe가 여전히 "외부 콘텐츠를 내 실행 artifact로 바꾸는 도구"로 보이는가?
- My Flow와 Calendar가 saved execution의 중심으로 보이는가?
- 스튜디오/creator가 보조 표면으로 보이는가, 아니면 새 핵심 서비스처럼 보이는가?
- 사용자는 URL을 넣으면 무엇을 얻는지 바로 이해하는가?
- export가 부가 기능이 아니라 core value로 보이는가?
- guardrail/evidence 수치가 제품 판단을 돕고 있는가, 아니면 수치 자체가 목표가 되고 있는가?
