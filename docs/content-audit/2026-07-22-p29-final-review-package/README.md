# FlowMe P29 Final Review Package

**판정:** `production_released_independent_review_pending`<br>
**기준:** `origin/main` `c407bd4dae1b0307026e770d3036f87c22023fa0`에서 P29 coordinated surface reset 구현<br>
**검증일:** 2026-07-22<br>
**실제 관찰 사용자:** 0명

P29는 P28에서 확정한 source, personal overlay, execution run, occurrence, export identity를 다시 만들지 않았다. 대신 사용자가 실제로 마주치는 화면을 다음 하나의 문법으로 재구성했다.

```text
실제 저장 결과를 먼저 확인
-> 필요한 경우에만 조정
-> 저장 완료 receipt로 상태 전환
-> My Flow에서 다음 행동부터 실행
-> Calendar에서 범위·선택일·날짜 없는 일을 한 workspace로 관리
-> 가져가기 전에 결과와 범위를 예측
```

## P29 결과

| Slice | 결과 | 핵심 marker |
| --- | --- | --- |
| P29-01 | `/f/moving-d30-basic` artifact-first proof와 저장 후 별도 receipt | `P29-SAVE-BEFORE-PRIMARY-RESULT`, `P29-SAVED-RECEIPT-DISTINCT` |
| P29-02 | public/source-backed Flow에 동일 frame rollout, 중복 legacy workbench 제거 | `data-experience-architecture=p29-artifact-first` |
| P29-03 | 반복 설정을 한 줄 요약과 다음 3회 preview 뒤 progressive disclosure로 정리 | `P29-ROUTINE-SUMMARY-FIRST` |
| P29-04 | My Flow 모바일 compact library와 wide rail/canvas/inspector | `P29-MY-FLOW-COMPACT-LIBRARY`, `P29-MY-FLOW-THREE-PANE` |
| P29-05 | Calendar compact scope, selected-day inspector, undated bottom sheet와 batch undo | `P29-CALENDAR-COMPACT-SCOPE`, `P29-CALENDAR-UNDATED-SHEET` |
| P29-06 | primary 1 + secondary 최대 2, whole/selected/current export preflight와 receipt | `P29-ARTIFACT-RECOMMENDATION`, `P29-EXPORT-RECEIPT-IDENTITY` |
| P29-07 | 공통 anatomy, 390/1024/1440 responsive·keyboard·focus gate | `P29-CONSISTENT-FLOW-IDENTITY` |
| P29-08 | 전체 회귀, screenshot, 문서, production 배포와 smoke closeout | 이 패키지 |

## 핵심 수치

- P29 전용 Playwright: `13 / 13` pass
- 전체 Playwright: `292 / 292` pass, `--workers=2`
- `flow-mvp.spec.ts`: `129 / 129` pass
- 단위 테스트: `584 / 584` pass
- production build: `18 / 18` routes pass
- docs check: `14` required files, `2,883` local links pass
- dependency audit: critical `0`, high `0`, moderate `2` (`sharp 0.35.3` controlled override; Next 내부 `postcss`만 잔존)
- P29 screenshot: `23`장
- production smoke screenshot: `9`장
- canonical production smoke: `9 / 9` route-viewport checks pass
- 390/1024/1440 reviewed route horizontal overflow: `0`
- reviewed route unnamed focusable: `0`
- fixed primary overlap: `0`
- reviewed route console/page error: `0`
- save-before row edit before adjust: `0`
- receipt primary action: `1`
- artifact recommendation: primary `1`, secondary 최대 `2`
- observed-user validation: `false`

## 테스트 전환

P29은 public save-before에서 반복되던 legacy `ArtifactWorkbench` composition을 제거했다. 그 화면 구조 자체를 요구하던 E2E `67`개는 skip하지 않고 퇴역시켰으며, 퇴역 이유와 대체 coverage를 [legacy-e2e-migration.json](./legacy-e2e-migration.json)에 기록했다.

P28 전체 E2E `346`개에서 legacy `67`개를 제거하고 P29 전용 `13`개를 추가해 현재 전체는 `292`개다. source fidelity, 저장, personal overlay, completion/reopen, Calendar, export, URL-first와 public shell 기능 회귀는 유지된 테스트에서 계속 검증한다.

## 게시 상태

- 구현 branch: `codex/p29-coordinated-reset`
- 구현 commit: `5304807a3f3beaea33cd9701b72ea18af88da978`
- PR: [#146](https://github.com/knhbae/flowme2605/pull/146)
- merge SHA: `10e6e5154372ce14d69302ed7bff0b748e3ae868`
- GitHub production deployment: `5550925534`
- Vercel deployment: <https://flowme2605-5r6k8i423-flowme.vercel.app>
- canonical production: <https://flowme2605.vercel.app>
- post-merge CI: Docs/Unit/Build, Playwright E2E, Vercel 모두 pass
- production smoke: [9 / 9 pass](./production-smoke/results.json), overflow/unnamed focusable/console/page error 모두 `0`

canonical production의 public save-before/receipt, My Flow, Calendar를 390/1024/1440에서 다시 확인했다. production demo에는 날짜 없는 fixture가 없어 sheet 자체는 `not_seeded`로 기록했으며, seeded sheet·batch placement·undo·focus return은 현재 P29 E2E로 검증했다.

## 바로 볼 파일

1. [review.html](./review.html): P29 화면과 current verdict를 한 화면에서 비교
2. [audit.md](./audit.md): slice별 해결 내용, 회귀, 잔여 위험
3. [route-evidence.json](./route-evidence.json): route·viewport·marker·오류 수치
4. [journey-results.json](./journey-results.json): 대표 사용자 여정 결과
5. [marker-reconciliation.json](./marker-reconciliation.json): P28 계약과 P29 marker 정합성
6. [screenshot-manifest.json](./screenshot-manifest.json): 23개 캡처 목록
7. [prompt-ko.md](./prompt-ko.md): Claude Design/Codex 독립 검토 복붙용 프롬프트
8. [screenshots](./screenshots/): 390/1024/1440 구현 화면
9. [production smoke screenshots](./production-smoke/screenshots/): canonical production 390/1024/1440 재검증 화면

## 남은 위험

- 자동화와 heuristic visual review만 완료했다. 사용자가 설명 없이 이해한다는 증거는 아직 없다.
- 1024 Calendar 월간 cell은 여러 Flow 제목을 의도적으로 축약한다. full accessible name은 보존하지만 시각적 구분의 충분성은 실제 관찰이 필요하다.
- 모바일 routine은 고급 입력을 접었지만 고정 command와 설정 summary가 같은 viewport에서 여전히 조밀하게 느껴질 수 있다.
- My Flow 27개 fixture는 검색·drill-in이 가능하지만 50개 이상 virtualization은 없다.
- `AppClient.tsx`에서 일부 경계를 component로 분리했지만 전체 파일의 구조적 크기는 여전히 후속 유지보수 위험이다.
- 2026-07-21 공개된 `sharp <0.35.0` advisory가 첫 CI를 막았다. `npm audit fix --force`가 제안한 Next downgrade는 거부하고 transitive `sharp`만 patched `0.35.3`으로 고정했다. unit/build/P29 E2E와 CI로 호환성을 검증하며, Next 내부 `postcss 8.4.31` moderate `2`는 지원되는 비파괴 패치가 없어 잔여 dependency watchpoint로 남긴다.
- account sync, 실제 AI/crawler, OAuth/direct sync, permanent-delete 정책은 P29 범위가 아니다.

현재 판정은 “구현·자동 회귀·production 배포와 smoke 완료, 독립 검토 대기”다. “실제 사용자 검증 완료” 또는 “상용 UX 최종 승인”이 아니다.
