# Claude Design 요청 프롬프트 - FlowMe 제품 방향 재검토

아래 내용을 Claude Design에 그대로 붙여넣는다.

```text
FlowMe의 최신 GitHub main 기준 소스/문서/evidence를 보고 제품 방향 재검토를 해주세요.

중요:
- Vercel preview를 직접 못 본다는 전제로 GitHub 소스, 문서, route-evidence, screenshot, HTML review board를 기준으로 봐주세요.
- 단순 감상평이나 색상/간격 polish가 아니라, 다음 제품 방향과 P17/P18 백로그를 정하기 위한 검토입니다.
- 기존 guardrail 0건 달성 자체보다, 사용자가 실제로 "이걸 써서 내 실행 도구로 옮길 수 있겠다"라고 느끼는지 판단해주세요.

기준 문서:
- docs/content-audit/2026-07-09-flowme-product-direction-feedback-board-ko.html
- docs/content-audit/2026-07-09-flowme-product-direction-feedback-intake-plan-ko.md
- docs/content-audit/2026-07-08-claude-design-p16-01-03-creator-studio-policy-evidence/README.md
- docs/content-audit/2026-07-08-claude-design-p16-01-03-creator-studio-policy-evidence/route-evidence.json
- docs/content-audit/2026-07-08-claude-design-p15-final-review-package/README.md

현재 제품 가설:
"FlowMe는 URL/메모를 실행 가능한 Flow로 바꾸고, My Flow와 Calendar로 이어주는 개인 실행 도구다. Studio/creator는 당장은 5번째 탭이 아니라 보조 표면이다."

사용자 피드백 요약:
1. / -> /flows -> /my -> /calendar 흐름은 이해된다.
2. Calendar에서 여러 Flow가 같은 색과 비슷한 라벨로 보여 구분이 약하다. "일정" 같은 일반 라벨도 문제다. 동일 날짜 여러 Flow 항목 처리도 판단이 필요하다.
3. /flows URL-first hit는 가치가 보인다. 다만 Step 제외만으로는 수정 자유도가 낮아 보이며, 장기적으로는 item마다 calendar .ics event 수준의 정보와 수정 가능성이 필요해 보인다.
4. URL-first miss에서는 "초안 만들기"를 눌러 AI가 초안을 만들고 사용자가 손보는 흐름이 필요해 보인다.
5. Public /f는 저장과 export가 모두 보이지만, 현재는 export가 Step 단위처럼 보여 Flow 단위 저장/export와 Step 단위 export 책임이 모호하다.
6. My Flow는 기능은 있으나 오늘 할 일을 확인/체크하기까지 depth가 깊어 실서비스 실행 허브로는 덜 다듬어진 느낌이다.
7. Calendar도 콘텐츠 종류별 핵심 실행 화면일 수 있는데 현재는 부족하다.
8. Studio/creator를 지금 키울지, 기본 실행 화면을 먼저 고칠지 판단이 필요하다.

시나리오별로 봐주세요:

1. 처음 온 사용자
- /, /flows, /my, /calendar
- "URL/메모 -> 실행 가능한 Flow -> My Flow/Calendar"가 한 문장으로 이해되는지

2. URL-first hit 사용자
- /flows hit result
- Step include/exclude
- export mode calendar/markdown/checklist
- 저장 후 /my
- 기존 Flow를 찾고 시작하는 가치가 보이는지, 수정 자유도가 충분한지

3. URL-first miss/candidate 사용자
- /flows miss
- candidate form/detail/resolved candidate
- 요청 저장만으로 충분한지, AI draft builder가 필요한지

4. Public /f 공유 진입 사용자
- /f/vehicle-inspection-prep
- /f/moving-d30-basic
- 저장 CTA, setup path, export 영역, sticky bottom
- Flow 단위 저장/export와 Step 단위 export가 혼동되지 않는지

5. My Flow 반복 사용자
- /my?savedMap=moving-d30
- /my?savedMap=middle-school-math-1
- /my 다중 큐/긴 목록
- 오늘 할 일을 보고 체크하기까지 depth가 적절한지

6. Calendar-heavy 사용자
- /calendar moving-d30 저장 후
- /calendar 여러 dated Flow 저장 상태
- 같은 날짜 여러 항목
- Flow별 구분, 라벨, grouping, 실행성 판단

7. Creator / Studio
- /u/flow-curation-team
- /u/my-flow-studio
- /my와 /calendar의 Studio entry
- Studio를 지금 키울 축인지, 보조 표면으로 유지할지 판단

산출물을 아래 형식으로 주세요:

1. Executive summary
- 현재 FlowMe의 제품 문장이 화면에서 얼마나 전달되는지
- 개인 실행 도구 vs creator/studio platform 중 어디에 집중해야 하는지

2. Scenario findings
- 각 시나리오별 문제 목록
- 사용자 영향
- 화면/route 기준 근거

3. Priority backlog
- Blocking / High / Medium / Low로 분류
- 각 항목은 바로 개발 가능한 목표로 작성
- "왜 지금 해야 하는지"와 "건드리면 안 되는 기준선" 포함

4. Direction decision
- Calendar를 핵심 실행 화면으로 강화할지
- My Flow의 오늘 할 일 depth를 줄일지
- Public /f의 Flow-level vs Step-level export/save 단위를 어떻게 나눌지
- URL-first miss AI draft를 언제 열지
- Studio/creator를 지금 키울지 보류할지

5. Evidence gaps
- 현재 screenshot/route-evidence만으로 부족한 시나리오
- 추가로 찍어야 할 viewport/state/fixture

6. P17 recommendation
- 가장 먼저 할 1개 slice
- 그 다음 2~4개 후속 slice
- P17에서 하지 말아야 할 것

주의:
- 내부어(P0, 대기열, 파이프라인, Canonical URL, handoff, source-backed, Step, Item, Markdown 등)가 사용자 화면에 다시 노출되는 제안은 피해주세요.
- 4탭 IA는 유지하는 전제로 봐주세요.
- /flow-lab은 internal-console, /restart는 release-preview, /u/*는 creator-profile tier라는 기존 분리를 유지해주세요.
- 새 기능 제안은 가능하지만, 먼저 제품 방향과 실행 화면 품질 관점에서 우선순위를 정해주세요.
```
