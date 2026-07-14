# FlowMe P24 독립 production 검토

검토 시각: 2026-07-15 01:04 KST
검토 주체: Codex automated simulation (실제 사용자 관찰 아님)

## 결론

- 공개 서비스 <https://flowme2605.vercel.app>는 익명 접속 `200`이며 SSO로 이동하지 않았다.
- 검토 기준 `origin/main`은 `1f0361209fac3cdd85c67cf64496ff5d5dd9fb9d`이다.
- GitHub deployment 기록에서 위 SHA의 Production 배포가 `success`이고, 공개 alias에서 P24 핵심 production 테스트 `14/14`가 통과했다.
- KST 날짜, 개인 날짜 override, 재사용 시 고정 날짜 유지, 반복 회차, 메모 draft 분할, `/flows` reload, public 저장 hydration은 현재 production에서 재현됐다.
- Claude Design A~G는 자동화 기준으로 모두 지원된다. 다만 설명량, 고급 편집 밀도, 미배치함·export 범위의 발견성은 실제 사용자에게 확인해야 한다.
- 제품 blocker는 재현하지 못했지만 전체 E2E gate는 깨끗하지 않다. 날짜가 고정된 기존 테스트 2건이 2026-07-15 KST 롤오버 이후 현재의 올바른 Today 항목을 오래된 기대값과 비교해 계속 실패한다.
- 실제 관찰 사용자는 `0 / 15`다. 이 패키지는 관찰 결과를 대체하지 않는다.

## 주요 finding

1. **High · QA 신뢰성:** `npm.cmd run test:e2e` 전체 gate가 현재 날짜에 의존하는 assertion 2건 때문에 실패한다.
2. **High · 검증 공백:** 실제 사용자 관찰이 아직 0건이므로 A~G의 이해도와 발견성을 승인할 수 없다.
3. **Medium · UX 관찰 필요:** public 차량 점검 모바일은 `390x3220` 전체 길이로, 저장 CTA는 명확하지만 읽기 부담은 실제 사용자 확인이 필요하다.
4. **Medium · UX 관찰 필요:** progressive editor는 기본/고급 분리가 작동하나 고급·결정 상태를 열면 모바일 한 화면보다 길다.
5. **Medium · dependency:** audit 결과 `critical 0 / high 0 / moderate 4`다. 강제 자동 수정은 하지 않았다.

세부 재현과 기대/실제는 [audit.md](./audit.md), 기계 판정은 [route-evidence.json](./route-evidence.json), 여정별 결과는 [journey-results.json](./journey-results.json)에 있다.

## 현재 실행 결과

| 검증 | 결과 |
| --- | --- |
| `npm.cmd ci` | 통과, lockfile 그대로 설치 |
| `npm.cmd run docs:check` | 통과, 14 files / 2,214 links |
| `npm.cmd test` | `514/514` 통과 |
| `npm.cmd run build` | 통과, 18 static pages 생성 |
| P24 핵심 local E2E | `14/14` 통과 |
| 전체 E2E 직렬 | `270/274` 통과, 4 실패 |
| 전체 실패 4건 독립 재실행 | 2건 통과, 날짜 의존 2건 재현 |
| P24 핵심 production E2E | `14/14` 통과 |
| production 반복·키보드 경로 | `3/3` 통과 |
| production 구조 편집 키보드 | `2/2` 통과 |
| production route inspection | 10 route/viewport 상태 `200`, overflow 0, console error 0, 이름 없는 control 0 |
| npm audit | critical 0, high 0, moderate 4 |

## Claude Design A~G

| 항목 | 자동화 판정 | 남은 사람 질문 |
| --- | --- | --- |
| A progressive editor | supported | 고급 설정을 열었을 때도 부담이 수용 가능한가 |
| B 완료 undo | supported | snackbar와 완료 목록에서 취소를 바로 찾는가 |
| C 날짜 없는 Calendar tray | supported | 사용자가 Calendar에서 미배치함을 스스로 발견하는가 |
| D export scope first | supported | 전체/선택 범위를 다운로드 전에 정확히 예측하는가 |
| E 연결 날짜/고정 날짜 | supported | 재사용 시 두 정책의 차이를 설명 없이 이해하는가 |
| F one occurrence/one control | supported | Today와 다음 예고를 서로 다른 역할로 읽는가 |
| G 단계별 메모 | supported | 개인 회고와 원문 알릴 점을 구분하는가 |

## Screenshot

- production current-browser screenshot: `43`장
- 모바일: 390x844
- wide: 1024x768
- 위치: [screenshots/](./screenshots/)

대표 화면:

- [홈 모바일](./screenshots/inspection-home-mobile.png)
- [public 차량 점검 모바일](./screenshots/inspection-public-vehicle-mobile.png)
- [완료 undo 모바일](./screenshots/u1-00-today-completion-undo-mobile.png)
- [progressive editor 기본](./screenshots/u2-00-progressive-editor-basic-mobile.png)
- [progressive editor 고급](./screenshots/u2-01-progressive-editor-advanced-mobile.png)
- [Calendar 미배치 선택](./screenshots/u3-00-calendar-unscheduled-selection-mobile.png)
- [선택 export](./screenshots/s2-00-personal-draft-selected-export-mobile.png)
- [단계 메모 집계 wide](./screenshots/u4-02-completion-note-aggregation-wide.png)

## 변경 경계

- `app/`, `components/`, `lib/`, package manifest/lockfile 변경 없음
- 제품 기능 수정 없음
- dependency 변경 없음
- 기존 status/decision/backlog 문서 변경 없음
- 이 디렉터리의 독립 감사 산출물만 추가
