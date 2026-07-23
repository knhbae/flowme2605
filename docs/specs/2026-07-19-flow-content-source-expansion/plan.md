# Flow 콘텐츠 소스·타깃 확장 검증 v1 Plan

## Files

| File | Responsibility |
| --- | --- |
| `docs/content-audit/2026-07-19-flow-content-source-expansion-seed.json` | 기존 기준과 신규 후보의 초기 구조화 근거 |
| `docs/content-audit/2026-07-19-flow-content-source-expansion-goal-ko.html` | 예시 중심 CEO·제품·콘텐츠 의사결정 보드 |
| `docs/content-audit/2026-07-19-flow-content-source-expansion/` | 후속 36 후보 ledger, 12 deep cases, 6 model runs, review·cost evidence |
| `docs/specs/2026-07-19-flow-content-source-expansion/spec.md` | 목표·범위·완료 게이트의 canonical 기록 |

## Sequence

1. 현재 P0 24와 이전 후보의 중복·편향을 기준선으로 고정한다.
2. 국내외 플랫폼과 제공자를 역할별로 검색해 후보 36개 원장을 완성한다.
3. 반응·변환·접근·권리·지역·위험 점수를 분리해 deep set 12개를 선정한다.
4. 실제 원문에서 SourceRow를 추출하고 canonical Flow 또는 hold package를 만든다.
5. 대표 6개를 동일 packet으로 저비용·고비용 모델에서 실행한다.
6. 비용·편집 부담·품질을 비교하고 P0 v2와 backend 범위를 결정한다.
7. JSON·HTML·link·desktop/mobile 검증 결과를 기록한다.

## Selection Rule

```text
candidate priority
= target-condition gap
+ lifeArea / planningPattern gap
+ visible item-level engagement
+ complete source rows
+ natural portable artifact
+ stable access
- rights / locality / sensitive risk
- overlap with current P0 24
```

인기 점수 하나로 선정하지 않는다. 공식 출처는 반응 수가 없어도 신뢰 앵커로 들어갈 수 있고, 반응이 큰 상업 원문은 권리 때문에 `permission_required`로 남을 수 있다.

## Risk Controls

- 기존 dirty worktree와 2026-07-18 콘텐츠 계약·예시 파일을 수정하지 않는다.
- 검색 결과 snippet만 보고 SourceRow를 만들지 않는다.
- 유료·구독자 전용·로그인 원문은 우회하지 않는다.
- 플랫폼 규모와 개별 원문 반응을 섞지 않는다.
- 정부·법률·의료·재무 원문은 행동 준비와 최신 확인만 구조화하고 결론을 생성하지 않는다.
- 공개 발행 가능성과 개인용 변환 가능성을 별도 상태로 둔다.
- 실제 사용자·제공자 검증 전에는 `public_ready`로 승격하지 않는다.
