# Claude Design 복붙용 검토 요청

아래 GitHub 소스/문서/screenshot만 보고 FlowMe Post-P11 / P12 준비 상태를 UX/UI 관점에서 다시 검토해주세요. Vercel preview는 볼 수 없다는 전제로, GitHub의 소스, 문서, route-evidence JSON, screenshots만 근거로 판단해주세요.

검토 대상:

- Branch: `codex/flowme-uxui-second-loop`
- UI baseline commit: `fcd96e4`
- Review package:
  - README: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-post-p11-cleanup-review-package/README.md
  - Korean brief: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-post-p11-cleanup-review-package/review-brief-ko.md
  - Review HTML: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-post-p11-cleanup-review-package/review.html
  - Korean intake HTML: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-post-p11-cleanup-review-package/review-intake-ko.html
  - Route evidence JSON: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-post-p11-cleanup-review-package/route-evidence.json
  - URL-first supplement evidence: https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-post-p11-cleanup-review-package/url-first-supplement-evidence.json
  - Screenshots folder: https://github.com/knhbae/flowme2605/tree/codex/flowme-uxui-second-loop/docs/content-audit/2026-07-07-claude-design-post-p11-cleanup-review-package/screenshots

반드시 확인할 screenshot 시나리오:

1. 첫 진입/탐색
   - `01-home-mobile.png`
   - `02-flows-mobile.png`

2. Flow Map 저장 경로
   - `03-flow-map-moving-top-mobile.png`
   - `04-flow-map-moving-bottom-mobile.png`
   - `05-flow-map-math-mobile.png`
   - `13-post-save-my-moving-mobile.png`
   - `15-post-save-my-math-mobile.png`
   - `14-calendar-after-moving-save-mobile.png`

3. 공개 `/f` 저장 전/후와 workbench
   - `06-public-vehicle-mobile.png`
   - `07-public-moving-mobile.png`
   - `08-public-moving-bottom-mobile.png`
   - `09-workbench-fridge-mobile.png`
   - `10-workbench-washer-mobile.png`
   - `11-workbench-new-car-mobile.png`
   - `12-workbench-used-car-mobile.png`
   - `25-workbench-new-car-open-details-mobile.png`
   - `26-workbench-used-car-open-details-mobile.png`

4. My Flow 반복 사용자 상태
   - `16-my-multi-queue-mobile.png`
   - `17-my-multi-queue-overdue-sheet-mobile.png`
   - `18-my-long-list-top-mobile.png`
   - `19-my-long-list-bottom-mobile.png`
   - `20-my-long-list-inventory-bottom-mobile.png`

5. Restart/prototype gate
   - `21-restart-moving-top-mobile.png`
   - `24-restart-moving-full-schedule-mobile.png`
   - `22-restart-moving-source-export-mobile.png`
   - `23-restart-moving-bottom-mobile.png`

6. URL-first / manual registration supplement
   - `27-url-first-hit-mobile.png`
   - `28-url-first-custom-start-mobile.png`
   - `29-url-first-miss-candidate-form-mobile.png`
   - `30-url-first-candidate-handoff-mobile.png`
   - `31-url-first-p0-lab-mobile.png`
   - `32-source-backed-manual-registration-report-mobile.png`

유지해야 할 기준선:

- 4탭 IA는 유지: 홈 / Flow 찾기 / 캘린더 / 내 Flow
- 공개 `/f/[slug]`는 공유 진입 shell로 유지. 4탭 app shell로 강제 편입하지 않음
- 저장/실행/export 스키마 유지
- seed/source-backed 데이터 구조 유지
- sourceUrl/sourceTrace/detail/memo/export 접근 유지
- `내 Flow에 저장` 또는 입력/setup path는 public share primary path
- `콘텐츠 더 보기`는 접근 가능하되 primary 뒤의 보조 탐색
- 일반 사용자 주요 문구에서 raw ISO, trailing `Flow`, 구조형 `...지도`, source slug, 내부 구조어 노출 0건 유지
- My Flow continuation은 실제 `열기` 가능한 row/control이어야 하며 설명-only 카드가 아니어야 함
- My Flow 지난 할 일과 Calendar agenda는 group header로 공통 메타를 1회 중심 표시
- My Flow inventory row는 진행 지표를 중복 표시하지 않음
- `/restart/moving-d30`는 prototype bucket으로 분리. 정상 route 승격 전 표시 gate 필요
- URL-first는 canonical lookup 우선. hit는 기존 source-backed Flow로 연결, miss/needs_review는 non-executable local candidate로 보류

검토 요청:

1. route별 UX/UI 문제 목록을 작성해주세요.
2. 각 문제를 Blocking / High / Medium / Low로 우선순위화해주세요.
3. 바로 개발 가능한 P12 backlog를 제안해주세요.
4. P4~P11에서 닫힌 기준선 중 계속 유지해야 할 것을 따로 적어주세요.
5. 다시 열어야 할 항목이 있다면 근거 screenshot/evidence와 함께 적어주세요.
6. 화면별로 구체 수정 지시를 써주세요. 예: 어느 route, 어느 영역, 어떤 copy/CTA/hierarchy/layout을 어떻게 바꿀지.
7. evidence가 부족해서 판단을 유보해야 하는 시나리오가 있으면 별도로 적어주세요.
8. guardrail/test/evidence marker를 추가해야 하는 항목이 있으면 P12 backlog에 포함해주세요.

응답 형식:

```md
## Overall Judgment
- 현재 Post-P11 상태에 대한 짧은 판단
- P12에서 가장 먼저 볼 사용자 리스크

## Route Findings
| Priority | Route/Scenario | Issue | User impact | Evidence | Fix direction |
| --- | --- | --- | --- | --- | --- |

## P12 Backlog
### Blocking
- P12-xx: ...

### High
- P12-xx: ...

### Medium
- P12-xx: ...

### Low
- P12-xx: ...

## Baselines To Preserve
- ...

## Evidence Gaps
- ...

## Screen-Specific Instructions
- `/`: ...
- `/flows`: ...
- `/flow-maps/[map]`: ...
- `/f/[slug]`: ...
- `/my`: ...
- `/calendar`: ...
- `/restart/moving-d30`: ...
- URL-first/manual registration: ...
```

주의:

- 막연한 감상평만 주지 말고, 개발 가능한 P12 backlog를 산출해주세요.
- Vercel preview를 볼 수 없으므로 GitHub 문서/evidence/screenshot만 기준으로 판단해주세요.
- 새 기능 제안은 가능하지만, 기존 4탭 IA와 저장/실행/export 구조를 깨지 않는 방향으로 우선순위를 주세요.
