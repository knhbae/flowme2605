# FlowMe 제품 방향 피드백 Intake 실행 계획

작성일: 2026-07-09
기준 브랜치: `main`
기준 병합 커밋: `2fd9d85 Merge flowme UXUI second loop`
범위: 새 기능 구현 전, P1~P16 개선 루프와 사용자 피드백을 제품 여정 기준으로 재정렬한다.

## 1. 왜 이 문서가 필요한가

P1~P16은 화면 깨짐, 내부어 노출, guardrail, evidence, URL-first, creator/studio tier를 단계적으로 닫았다. 이제 남은 문제는 단일 라벨이나 캡처 누락보다 제품 판단에 가깝다.

- FlowMe의 핵심 문장이 실제 화면 흐름에서 느껴지는가.
- Calendar와 My Flow가 실행 허브로 충분한가.
- URL-first가 AI 데모가 아니라 실행 Flow 탐색/요청으로 읽히는가.
- Public `/f`에서 저장과 export의 단위가 맞는가.
- Studio/creator를 지금 키울지, 보조 표면으로 둘지 정해야 하는가.

이번 작업은 P16 이후 바로 다음 구현으로 들어가기 전에, Claude Design과 사람이 같은 상황을 보고 판단할 수 있도록 시나리오별 evidence 요구사항과 다음 목표 순서를 정리하는 준비 단계다.

## 2. 사용자 피드백 요약

### A. 핵심 제품 흐름

검토 흐름: `/` -> `/flows` -> `/my` -> `/calendar`

판단 기준:

> URL/메모를 실행 가능한 Flow로 바꾸고, 내 실행 공간과 캘린더로 이어진다.

현재 피드백:

- 큰 흐름은 이해된다.
- Calendar에서 여러 Flow가 같은 색과 비슷한 라벨로 보여 구분이 약하다.
- `일정` 같은 일반 라벨은 Flow별 맥락을 전달하지 못한다.
- 동일 날짜에 여러 Flow 항목이 몰릴 때 어떻게 읽히는지 더 봐야 한다.

제품 의미:

- Calendar는 단순 저장 데이터 뷰가 아니라 핵심 실행 화면일 가능성이 높다.
- 다음 구현 후보는 Calendar multi-flow identity, color/key, selected-day grouping, event title policy다.

### B. URL-first 가치

검토 흐름: `/flows` URL 입력 -> hit / miss / candidate

현재 피드백:

- hit 상태는 실제 원문 URL 입력 후 정상 연결을 확인했다.
- hit에서 Step 제외는 가능하지만 수정 자유도가 낮다.
- 장기적으로는 각 item이 calendar `.ics` event가 갖는 정보 구조를 가져야 하며, 그 수준의 수정이 가능해야 한다.
- miss일 때는 사용자가 `초안 만들기`를 실행하고, AI가 초안을 만들고, 사용자가 손보는 흐름이 필요해 보인다.

제품 의미:

- URL-first는 방향이 맞지만 현재는 `찾기/저장` 중심이다.
- 다음 단계는 두 갈래로 나뉜다.
  - 단기: hit 결과의 Step/item 편집 가능 범위와 export 구조를 명확히 한다.
  - 중기: miss -> AI draft -> user edit -> save/review 흐름을 별도 spec으로 설계한다.

### C. Public `/f` 저장 화면

검토 route 예:

- `/f/vehicle-inspection-prep`
- `/f/moving-d30-basic`

현재 피드백:

- 초기에 export로 갈지 My Flow로 갈지 결정되는 듯하다.
- 지금은 export가 Step 단위로 이뤄지는 것처럼 보이며, 이 구조가 문제일 수 있다.
- Flow 단위 저장/export와 Step 단위 저장/export가 모두 필요해 보인다.
- 어떤 단위가 primary가 되어야 하는지 설계 숙제다.

제품 의미:

- P10~P12에서 sticky CTA 위계는 닫았지만, export/save의 정보 구조 단위는 아직 제품 결정이 남아 있다.
- 다음 검토는 CTA 라벨보다 `Flow-level artifact`와 `Step-level artifact`의 책임 분리다.

### D. My Flow 실행 허브

검토 route:

- `/my?savedMap=moving-d30`
- `/my?savedMap=middle-school-math-1`
- `/my`

현재 피드백:

- 기본 기능은 있다.
- 하지만 중요한 내용을 보기 위해 depth가 많다.
- 오늘 할 일을 체크하려면 몇 번 눌러 들어가야 하는 느낌이다.
- 아직 실서비스 실행 허브로는 덜 다듬어진 느낌이다.

제품 의미:

- P10/P11의 copy/guardrail 정리는 도움이 됐지만, interaction depth는 별도 문제다.
- 다음 구현 후보는 `오늘 할 일 즉시 체크`, `상세 열기 전 핵심 체크 표시`, `Flow별 drilldown 깊이` 조정이다.

### E. Calendar 실행 화면

검토 route: `/calendar`

현재 피드백:

- Calendar도 콘텐츠 종류별 핵심 실행 화면일 수 있다.
- 현재는 실서비스라고 보기엔 부족하다.
- 이벤트 구분, 라벨, 같은 날짜 여러 항목 처리, Flow별 맥락이 부족하다.

제품 의미:

- Calendar는 보조 화면으로 둘지, My Flow와 동급 핵심 실행 화면으로 다룰지 결정해야 한다.
- 사용자 피드백상 Calendar 개선이 Studio보다 우선일 가능성이 높다.

### F. Creator / Studio

검토 route:

- `/u/flow-curation-team`
- `/u/my-flow-studio`

현재 피드백:

- Studio를 지금 개념적으로 더 볼지, 기본 실행 화면부터 고칠지 고민된다.
- P16 기준으로 Studio는 5번째 탭이 아니라 보조 표면이다.

제품 의미:

- 지금은 Studio를 크게 키우기보다 보조 표면으로 유지하는 편이 안전하다.
- Calendar/My Flow/public export 구조가 실서비스 느낌을 갖춘 뒤 creator/studio를 다시 키우는 순서가 더 맞다.

## 3. Claude Design에게 보여줄 시나리오 분리

### Scenario 1. 처음 온 사용자: 제품 문장 이해

목적:

- `/` -> `/flows` -> `/my` -> `/calendar`가 하나의 제품 흐름으로 읽히는지 본다.

필요 screenshot:

| 번호 | Route | 상태 | Viewport | 볼 것 |
| --- | --- | --- | --- | --- |
| S1-01 | `/` | 첫 화면 | 390, 1024 | URL/메모 -> 실행 Flow 약속이 보이는지 |
| S1-02 | `/flows` | 기본 | 390, 1024 | Flow 찾기가 catalog가 아니라 실행 시작으로 보이는지 |
| S1-03 | `/my` | 저장 없음 | 390 | 저장 전 상태가 명확한지 |
| S1-04 | `/calendar` | 저장 없음 | 390 | 빈 Calendar가 불필요한 허브처럼 보이지 않는지 |

판단 질문:

- 첫 사용자가 "여기에 URL이나 메모를 넣으면 실행 가능한 Flow가 되고, 내 Flow/Calendar로 이어진다"를 이해하는가.

### Scenario 2. URL-first hit 사용자

목적:

- 이미 준비된 Flow를 찾았을 때 사용자가 저장, 시작일, Step 선택, export를 이해하는지 본다.

필요 screenshot:

| 번호 | Route | 상태 | Viewport | 볼 것 |
| --- | --- | --- | --- | --- |
| S2-01 | `/flows` | hit result | 390, 1024 | AI 데모가 아니라 기존 Flow 매칭으로 읽히는지 |
| S2-02 | `/flows` | hit Step include/exclude | 390 | Step 수정 자유도가 과하게 단순해 보이는지 |
| S2-03 | `/flows` | export mode calendar/checklist/document | 390 | 기술어 없이 결과물 중심인지 |
| S2-04 | `/my?savedMap=moving-d30` | hit 저장 후 | 390 | 저장 완료 후 다음 실행이 충분히 빠른지 |

판단 질문:

- Step 제외만으로 충분한가.
- item별 calendar event 수준의 편집이 필요한가.
- 어느 시점부터 Studio/편집 기능으로 넘겨야 하는가.

### Scenario 3. URL-first miss/candidate 사용자

목적:

- 준비된 Flow가 없을 때 "요청 남김"만으로 충분한지, "초안 만들기" 흐름이 필요한지 본다.

필요 screenshot:

| 번호 | Route | 상태 | Viewport | 볼 것 |
| --- | --- | --- | --- | --- |
| S3-01 | `/flows` | miss | 390 | 막힌 상태인지, 다음 행동이 있는지 |
| S3-02 | `/flows` | candidate form | 390 | 요청이 사용자 가치로 보이는지 |
| S3-03 | `/flows` | candidate detail | 390, 1024 | 내부 상태어 없이 요청 상태가 보이는지 |
| S3-04 | `/flows` | resolved candidate | 390 | 기존 Flow로 이어질 때 자연스러운지 |

판단 질문:

- 현 단계에서 miss는 "요청 저장"으로 충분한가.
- AI draft builder를 다음 큰 기능으로 잡아야 하는가.
- 초안 생성은 public user route에서 바로 열지, internal review를 거칠지.

### Scenario 4. Public `/f` 공유 진입 사용자

목적:

- 공유받은 사람이 Flow 단위로 저장할지, Step 단위 export를 할지 혼동하지 않는지 본다.

필요 screenshot:

| 번호 | Route | 상태 | Viewport | 볼 것 |
| --- | --- | --- | --- | --- |
| S4-01 | `/f/vehicle-inspection-prep` | top | 390 | 저장/setup path가 primary인지 |
| S4-02 | `/f/vehicle-inspection-prep` | export/body | 390 | export가 Step 단위처럼 보이는지 |
| S4-03 | `/f/moving-d30-basic` | top | 390 | dated Flow 저장 구조가 명확한지 |
| S4-04 | `/f/moving-d30-basic` | bottom/sticky | 390 | Flow-level save와 export가 경쟁하지 않는지 |
| S4-05 | `/f/new-car-delivery-check` | workbench | 1024 | wide에서 checklist/source/export 위계가 맞는지 |

판단 질문:

- Public share shell의 primary는 "내 Flow에 저장"인가, "파일 받기"인가.
- Flow-level export와 Step-level export를 같이 제공해야 하는가.
- 둘 다 필요하다면 어느 화면에서 어느 단위를 기본으로 해야 하는가.

### Scenario 5. My Flow 반복 사용자

목적:

- 저장된 콘텐츠가 많을 때 오늘 할 일, 지난 할 일, 다음 할 일을 너무 깊게 들어가지 않고 처리할 수 있는지 본다.

필요 screenshot:

| 번호 | Route | 상태 | Viewport | 볼 것 |
| --- | --- | --- | --- | --- |
| S5-01 | `/my?savedMap=moving-d30` | 저장 직후 | 390 | 저장 확인과 다음 할 일이 보이는지 |
| S5-02 | `/my?savedMap=middle-school-math-1` | 날짜 없는 저장 | 390 | 날짜 없는 fallback이 자연스러운지 |
| S5-03 | `/my` | 다중 큐 | 390 | 오늘/지난/다음 상태가 깊이 없이 보이는지 |
| S5-04 | `/my` | 오늘 할 일 체크 직전 | 390 | 체크까지 몇 depth인지 |
| S5-05 | `/my` | 긴 목록 top/middle/bottom | 390, 1024 | inventory가 실서비스처럼 보이는지 |

판단 질문:

- 오늘 할 일은 inline check 가능해야 하는가.
- Step detail을 열어야만 체크 가능한 구조가 너무 깊은가.
- My Flow는 saved inventory보다 "오늘 실행"을 더 강하게 밀어야 하는가.

### Scenario 6. Calendar-heavy 사용자

목적:

- Calendar가 단순 보관 데이터가 아니라 실행 화면으로 읽히는지 본다.

필요 screenshot:

| 번호 | Route | 상태 | Viewport | 볼 것 |
| --- | --- | --- | --- | --- |
| S6-01 | `/calendar` | moving-d30 저장 후 | 390 | selected-day agenda가 실행 중심인지 |
| S6-02 | `/calendar` | 여러 dated Flow 저장 | 390 | Flow별 색/라벨/구분이 되는지 |
| S6-03 | `/calendar` | 동일 날짜 여러 항목 | 390 | 같은 날짜 안에서 그룹과 할 일 구분이 되는지 |
| S6-04 | `/calendar` | wide | 1024 | 월간 grid와 agenda가 균형 있는지 |

판단 질문:

- Flow별 색상 또는 시각 키가 필요한가.
- `일정` 같은 일반 라벨을 route/content/action 라벨로 바꿔야 하는가.
- 여러 Flow가 같은 날짜에 있을 때 group header, left border, badge, sort 기준이 필요한가.

### Scenario 7. Creator / Studio 방향

목적:

- Studio를 지금 키울 축인지, 보조 표면으로 둘지 판단한다.

필요 screenshot:

| 번호 | Route | 상태 | Viewport | 볼 것 |
| --- | --- | --- | --- | --- |
| S7-01 | `/u/flow-curation-team` | public creator profile | 390, 1024 | public channel로 의미가 있는지 |
| S7-02 | `/u/my-flow-studio` | current-user studio fixture | 390, 1024 | 개인 Studio가 비어 보이지 않는지 |
| S7-03 | `/my` | Studio entry | 390, 1024 | 5번째 탭처럼 보이지 않는지 |
| S7-04 | `/calendar` | Studio entry | 390, 1024 | 실행 화면에서 Studio가 방해되지 않는지 |

판단 질문:

- 지금 Studio를 제품 핵심으로 키울 만한 이유가 있는가.
- 아니면 My Flow/Calendar 실행 품질을 먼저 닫고 Studio는 보조로 유지해야 하는가.

## 4. 다음 작업 후보와 권장 순서

### P17-00. Product direction evidence package

목표:

- 위 7개 scenario를 하나의 review package로 만든다.
- Claude Design에게 P17/P18 backlog가 아니라 "제품 방향 판단"을 요청한다.

산출물:

- `docs/content-audit/2026-07-09-flowme-product-direction-review-package/`
  - `README.md`
  - `audit.md`
  - `review.html`
  - `route-evidence.json`
  - `prompt-ko.md`
  - `screenshots/`

검증:

- screenshot이 route/state/viewport별로 충분히 분리되어 있는지.
- 사용자 피드백이 audit/prompt에 포함되어 있는지.
- P12~P16 guardrail 기준선이 유지되는지.

### P17-01. Calendar execution clarity

우선순위: High

이유:

- 사용자 피드백에서 가장 명확한 실행 화면 문제다.
- Calendar는 My Flow와 함께 핵심 실행 허브인데, 현재 Flow별 구분과 동일 날짜 처리의 설계가 약하다.

범위:

- Calendar event title policy.
- Flow별 시각 구분: 색상, left border, content chip, group heading 중 최소 방식 선택.
- 동일 날짜 여러 Flow grouping.
- `일정` 같은 일반 라벨 제거.

건드리면 안 되는 기준선:

- 날짜 계산/export payload/저장 스키마.
- Calendar agenda-first 구조.
- P14 group meta repeated count 0.

### P17-02. My Flow today action depth

우선순위: High

이유:

- 현재 기능은 있지만 오늘 할 일을 보기/체크하기까지 depth가 깊다는 피드백이 강하다.

범위:

- Today/Now row에서 핵심 check 가능성 검토.
- Step detail을 열기 전 보이는 정보와 action 재정렬.
- 저장 직후 confirmation과 first task repetition 기준선 유지.

건드리면 안 되는 기준선:

- My Flow 2-tab local IA.
- firstTaskRepetitionHits 0.
- overdue label `지난 할 일`.

### P17-03. Public `/f` save/export unit model

우선순위: Medium-High

이유:

- CTA 위계는 닫혔지만, Flow 단위와 Step 단위 export/save 책임이 아직 모호하다.

범위:

- Flow-level save/export 기본 단위 정의.
- Step-level export는 detail/sub action으로 둘지 결정.
- Public share shell에서 sticky primary는 계속 save/setup 계열 유지.

건드리면 안 되는 기준선:

- public share CTA order.
- export payload/copy/download 동작.
- source/detail/memo 데이터.

### P17-04. URL-first editing depth and miss draft strategy

우선순위: Medium

이유:

- hit Step exclude는 작동하지만 편집 자유도 부족 가능성이 있다.
- miss -> AI draft는 큰 기능이므로 바로 구현보다 spec이 필요하다.

범위:

- Hit/custom-start에서 item-level edit 요구사항 정리.
- `.ics` event-level 정보 구조와 UI 편집 범위 정의.
- Miss draft builder는 별도 spec으로 쪼갠다.

건드리면 안 되는 기준선:

- canonical lookup/source-backed reuse.
- candidate user copy internal hit 0.
- visible Markdown 0.

### P17-05. Creator/studio direction hold

우선순위: Medium-Low

이유:

- Studio는 중요한 장기축이지만, 현재 사용자 피드백은 기본 실행 화면 미완성에 더 가깝다.

범위:

- `/u/my-flow-studio`는 5번째 탭이 아니라 보조 표면으로 유지.
- `/u/flow-curation-team`은 public creator profile 품질만 유지.
- Calendar/My Flow/public export가 정리된 뒤 Studio 기획을 다시 연다.

건드리면 안 되는 기준선:

- creator-profile tier guardrail 0.
- studio entry destination/reachability marker.
- `/flow-lab` internal-console 분리.

## 5. 지금 추천 방향

추천은 **"기본 실행 허브를 먼저 실서비스 수준으로 다듬고, Studio는 보조 표면으로 유지"**다.

이유:

1. 사용자가 이해한 핵심 가치는 URL/메모 -> 실행 Flow -> My Flow/Calendar다.
2. 현재 불편은 creator 기능 부재보다 Calendar/My Flow 실행 깊이와 구분 문제에 집중되어 있다.
3. Studio를 키우면 제품이 creator platform처럼 보일 수 있는데, 아직 개인 실행 도구의 반복 사용 품질이 충분히 닫히지 않았다.
4. Public `/f`의 save/export 단위 결정도 creator보다 먼저 정해야 한다.

따라서 다음 순서는:

1. P17-00 product direction evidence package 생성.
2. 사람 눈으로 `/`, `/flows`, `/my`, `/calendar`, public `/f`, `/u/*`를 확인.
3. P17-01 Calendar execution clarity.
4. P17-02 My Flow today action depth.
5. P17-03 public `/f` save/export unit model.
6. P17-04 URL-first edit/draft spec.
7. Studio는 그 이후 방향 재판단.

## 6. 다음 `/goal` 후보

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P17-00 FlowMe 제품 방향 review package를 만든다. 새 기능이나 UI 수정은 하지 않고, P1~P16 개선 루프와 사용자 피드백을 바탕으로 Claude Design이 현재 제품 흐름을 시나리오별로 평가할 수 있도록 모바일 390px / wide 1024px screenshot, route-evidence, review.html, audit.md, prompt-ko.md를 준비한다.

핵심:
- / -> /flows -> /my -> /calendar 흐름이 "URL/메모를 실행 가능한 Flow로 바꾸고 내 실행 공간과 캘린더로 이어진다"로 읽히는지 검토한다.
- URL-first hit/custom-start/miss/candidate, public /f 저장/export, My Flow 실행 depth, Calendar multi-flow 구분, creator/studio 보조 표면을 사용자 상황별 scenario로 분리한다.
- 사용자 피드백을 audit/prompt에 포함한다.
- P12~P16 guardrail과 기존 evidence 기준선은 유지한다.
- 산출물은 docs/content-audit/2026-07-09-flowme-product-direction-review-package/ 아래에 만든다.

검증:
- node scripts/content-audit/capture-claude-p7-final-review-package.mjs 또는 필요한 보강 capture 실행
- npm.cmd run docs:check
- 필요한 경우 targeted E2E
- git diff --check
- 커밋 및 푸시
```
