# Claude Design P20 백로그 요청 프롬프트

아래 GitHub 소스, 문서, route-evidence, screenshot만 보고 FlowMe P19 마감 상태를 검토해 주세요. Vercel preview를 직접 본다는 전제 없이, 제공된 산출물만으로 판단해 주세요.

목표는 단순 UI 평가가 아니라 **P20 제품/UX 백로그**를 Blocking / High / Medium / Low로 산출하는 것입니다.

## 검토 링크

- P19 final README: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-10-claude-design-p19-final-review-package/README.md
- P19 audit: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-10-claude-design-p19-final-review-package/audit.md
- P19 review HTML: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-10-claude-design-p19-final-review-package/review.html
- P19 route evidence JSON: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-10-claude-design-p19-final-review-package/route-evidence.json
- P19 screenshots: https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-10-claude-design-p19-final-review-package/screenshots
- P19 numbering audit: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-10-claude-design-p19-numbering-remaining-audit-ko.md
- P19-08 AI draft gate audit: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-10-claude-design-p19-08-ai-draft-gate-audit-ko.md
- E2E guardrails: https://github.com/knhbae/flowme2605/blob/main/tests/e2e/flow-mvp.spec.ts
- URL-first E2E: https://github.com/knhbae/flowme2605/blob/main/tests/e2e/url-first-user-surface.spec.ts
- Public share CTA E2E: https://github.com/knhbae/flowme2605/blob/main/tests/e2e/public-share-cta-order.spec.ts
- Workbench source density E2E: https://github.com/knhbae/flowme2605/blob/main/tests/e2e/workbench-source-density.spec.ts

## 현재 제품 방향

FlowMe의 핵심 흐름은 다음입니다.

1. 사용자가 URL이나 메모를 넣는다.
2. 이미 준비된 실행 Flow를 찾거나, 아직 없으면 초안 요청으로 보관한다.
3. 저장 후 My Flow에서 오늘 할 일을 바로 실행하고 필요하면 기준일/항목을 수정한다.
4. Calendar에서 날짜별 실행을 확인한다.
5. public `/f`는 공유받은 Flow를 통째로 저장하거나 Flow 단위로 가져가는 저장 전 화면이다.

4탭 IA는 유지합니다: 홈 / Flow 찾기 / 캘린더 / 내 Flow. Creator/Studio, `/restart`, `/flow-lab`는 보조 표면입니다.

## P19에서 닫은 기준선

다음 기준선이 실제 화면/evidence에서 유지되는지 검토해 주세요.

- P19-01: Calendar 모바일 agenda는 같은 날짜 여러 Flow가 있어도 과밀하지 않다.
- P19-02: My Flow/Calendar의 할 일 완료는 row-left 체크박스 1종으로 통일된다.
- P19-03: `1/5`, `2/5` 같은 진행 숫자는 단독으로 보이지 않고 오늘/선택일/전체/확인 항목 맥락을 가진다.
- P19-04: Calendar wide 화면의 헤더/라벨 중복은 0이다.
- P19-05: public `/f` 저장 전 체크박스는 완료가 아니라 preview/선택 상태로 읽힌다.
- P19-06: 홈에서 URL/메모로 Flow 찾는入口가 보이고 `/flows`로 이어진다.
- P19-07: 저장 후 My Flow에서 이사일/기준일, 항목 날짜, 제목 alias, 사용자 메모 수정入口가 보인다.
- P19-08: URL-first miss는 live AI 생성처럼 보이지 않고, AI draft는 gate/spec으로만 닫혀 있다.

## 주요 evidence 수치

route-evidence summary에서 특히 아래 값을 확인해 주세요.

- `normalRouteInternalHitCount: 0`
- `urlFirstVisibleMarkdownHitCount: 0`
- `urlFirstCandidateUserCopyInternalHitCount: 0`
- `urlFirstMissDraftGateVisible: true`
- `urlFirstMissDraftImpliesLiveAi: false`
- `calendarMobileAgendaDenseRowCount: 0`
- `calendarHeadingDuplicateCount: 0`
- `taskCompleteButtonCount: 0`
- `taskCompleteMixedControlCount: 0`
- `progressMetricAmbiguousCount: 0`
- `rowLevelFlowProgressChipCount: 0`
- `publicPreSaveCheckboxCompletionLikeLabelCount: 0`
- `homeUrlFirstEntryVisible: true`
- `homeUrlFirstEntryDestination: ["/flows"]`
- `myFlowAnchorEditEntryVisible: true`
- `myFlowItemEditEntryVisible: true`
- `flowLabPrototypeLinkedFromUserNavCount: 0`
- `restartPrototypeRawIsoHitCount: 0`

## 시나리오별 검토 요청

### 1. 처음 온 사용자

검토 화면:
- `/`
- `/flows`

판단 질문:
- 홈에서 URL/메모를 어디에 넣어 Flow를 찾는지 바로 보이는가?
- 추천 카드보다 핵심 시작 경로가 먼저 읽히는가?
- `/flows`로 넘어간 뒤 URL-first 흐름이 자연스러운가?

### 2. URL-first 사용자

검토 상태:
- hit
- custom-start
- miss
- candidate detail
- resolved candidate
- AI draft gate

판단 질문:
- hit은 “준비된 Flow를 찾았다”로 읽히는가?
- miss는 “실제 AI가 바로 생성된다”가 아니라 “초안 요청으로 보관한다”로 정확히 읽히는가?
- candidate detail과 복사 output에 내부 제작어가 남아 있지 않은가?
- P20에서 실제 AI draft slice를 열어도 되는가, 아니면 editor/Studio/신뢰 경계가 더 필요해 보이는가?

### 3. My Flow 반복 사용자

검토 화면:
- `/my?savedMap=moving-d30`
- `/my?savedMap=middle-school-math-1`
- `/my` 다중 큐

판단 질문:
- 오늘 할 일을 바로 보고 완료할 수 있는가?
- 완료 체크박스, `열기`, `수정`의 역할이 분리되어 보이는가?
- 이사일/기준일 수정과 개별 항목 날짜 수정의 차이가 보이는가?
- 진행 숫자는 충분히 의미가 있는가, 아니면 더 낮춰야 하는가?

### 4. Calendar-heavy 사용자

검토 화면:
- `/calendar` 저장 없음
- moving-d30 저장 후
- 여러 dated Flow 저장 후
- 같은 날짜 다중 Flow
- 1024px wide Calendar

판단 질문:
- Calendar가 날짜 우선 실행 화면으로 보이는가?
- 같은 날짜 여러 Flow가 색/마커/라벨로 구분되는가?
- 모바일 agenda row가 과밀하지 않은가?
- wide에서 헤더/라벨/진행 숫자가 다시 중복되지 않는가?

### 5. public `/f` 공유 진입 사용자

검토 화면:
- `/f/vehicle-inspection-prep`
- `/f/moving-d30-basic`
- `/f/fridge-cleanout-weekly-plan`
- `/f/washer-tub-clean-monthly`
- `/f/new-car-delivery-check`
- `/f/used-car-buying-check`

판단 질문:
- 저장 전 primary가 Flow 단위 저장/setup으로 보이는가?
- export는 Flow 단위 2차 행동으로 보이는가?
- 항목 체크박스는 완료가 아니라 preview/선택 상태로 보이는가?
- public `/f`에서 아직 Flow 단위 export/save 기획이 더 필요한가?

### 6. 보조 표면

검토 화면:
- `/u/my-flow-studio`
- `/u/flow-curation-team`
- `/restart/moving-d30`
- `/flow-lab/url-first-p0`

판단 질문:
- Creator/Studio는 지금 5번째 탭이 아니라 보조 표면으로 충분히 정리되어 있는가?
- `/flow-lab` internal-console과 `/restart` release-preview tier 구분이 명확한가?
- Studio를 P20에서 키워야 하는가, 아니면 AI draft/editor/Calendar/My Flow를 먼저 다듬어야 하는가?

## 산출 요청

아래 형식으로 답변해 주세요.

1. P19 마감 상태 총평
2. 시나리오별 UX/UI 문제 목록
3. Blocking / High / Medium / Low 우선순위
4. 바로 개발 가능한 P20 백로그
5. P20에서 건드리면 안 되는 기준선
6. evidence가 부족한 시나리오
7. P20 첫 번째 `/goal` 후보

P20 백로그는 단순 polish가 아니라 제품 흐름 기준으로 작성해 주세요. 특히 다음 중 무엇을 먼저 해야 하는지 판단해 주세요.

- URL-first AI draft 첫 slice
- My Flow 편집/수정 모델 강화
- Calendar 실행 화면 추가 단순화
- public `/f` Flow 단위 export/save 기획 보강
- Studio/Creator 보조 표면 확장 여부
