# FlowMe P28 Final Review Package

**판정:** `internally_complete_awaiting_owner_review`
**기준:** `origin/main` baseline `46e567ec09c5eba37ac703529b3d3eccc75e0dde`에서 P28-01~P28-08을 한 release branch로 구현·검증
**검증일:** 2026-07-22
**실제 관찰 사용자:** 0명

P28은 기능을 더 붙이는 작업이 아니라, 이미 존재하던 저장·개인화·실행·Calendar·export 능력을 하나의 화면 문법으로 다시 묶는 작업이다. 비교 gate에서 `Hybrid` 구조를 선택한 뒤 아래 순서로 구현했다.

```text
Flow 제목과 출처
-> 저장될 전체 내용의 compact outline
-> 콘텐츠에 맞는 실제 결과 1개와 필요한 보조 결과
-> 필요한 항목만 맥락 안에서 수정
-> My Flow 또는 Calendar로 저장·실행
```

## P28 결과

| Slice | 결과 | Evidence |
| --- | --- | --- |
| P28-01 | Outline-first, Artifact-first, Hybrid를 실제 데이터로 비교하고 Hybrid 선택 | [architecture gate](../2026-07-22-p28-01-cross-surface-architecture-gate/README.md) |
| P28-02 | outline, item role, completion eligibility, artifact destination을 한 projection으로 고정 | [projection contract](../2026-07-22-p28-02-shared-projection-contract/README.md) |
| P28-03 | 저장 전 전체 Flow, 실제 결과 미리보기, 제목·날짜·메모 수정 연결 | [save-before](../2026-07-22-p28-03-save-before-workspace/README.md) |
| P28-04 | 홈트 전용 완료 문법 제거, 요일·시간·예상 시간·종료 조건을 공통 routine 설정으로 통일 | [routine](../2026-07-22-p28-04-routine-unification/README.md) |
| P28-05 | 모바일 list-to-detail, wide library rail-to-detail로 My Flow 재구성 | [My Flow IA](../2026-07-22-p28-05-my-flow-library-ia/README.md) |
| P28-06 | 많은 Flow의 가로 chip strip을 searchable multi-select picker로 교체 | [Calendar scope](../2026-07-22-p28-06-calendar-flow-scope/README.md) |
| P28-07 | Flow 실행·Calendar·Checklist·Sheet·Memo를 실제 데이터 projection으로 연결 | [five-shape gate](../2026-07-22-p28-07-five-shape-gate/README.md) |
| P28-08 | 전체 회귀, 390/1024/1440 캡처, 상태 문서와 독립 검토 handoff 마감 | 이 패키지 |

## 핵심 수치

- P28 대표 여정: `7 / 7` pass
- 전체 Playwright: `346 / 346` pass, `--workers=2`
- 단위 테스트: `584 / 584` pass
- production build: `18 / 18` routes pass
- P28 screenshot: `19`장
- 390/1024/1440 horizontal overflow: `0`
- P28 대표 여정 console/page error: `0`
- workout-only completion UI: `0`
- five actual-data shape: `5`
- Calendar large-library horizontal Flow chip: `0`
- observed-user validation: `false`

전체 4-worker E2E의 첫 실행은 Chrome GPU/navigation 부하와 이전 DOM selector 때문에 `339 / 346`이었다. selector를 stable execution-row shell로 갱신하고 실패 7개를 단일 worker로 재현해 `7 / 7`, 이후 전체를 2 workers로 다시 실행해 `346 / 346`을 확인했다. 첫 실행을 최종 통과처럼 사용하지 않았다.

## 바로 볼 파일

1. [review.html](./review.html): 모바일·wide 구현 화면과 최종 판정
2. [audit.md](./audit.md): 피드백별 해결/잔여 판단과 회귀 기록
3. [route-evidence.json](./route-evidence.json): route·viewport·marker
4. [journey-results.json](./journey-results.json): 대표 사용자 과업 결과
5. [prompt-ko.md](./prompt-ko.md): Claude Design/Codex 독립 검토용 복붙 프롬프트
6. [screenshots](./screenshots/): 390/1024/1440 현재 구현 캡처

## 남은 위험

- 자동화와 heuristic review만 완료했으며, 사용자가 설명 없이 이해한다는 증거는 아직 없다.
- 24개 이사 Flow를 펼치면 화면이 길다. 기본 상태는 5개 + `외 19개 전체 보기`지만, 실제 사용자가 이 disclosure를 자연스럽게 이해하는지 확인해야 한다.
- routine 설정은 workout 전용 UI를 제거했지만 모바일 입력 단계는 여전히 길다. 빈도·시간·종료를 어느 정도까지 한 번에 보여줄지는 관찰 대상이다.
- My Flow 27개 fixture는 검색 가능한 rail로 관리되지만, 50개 이상에서 virtualization은 없다.
- 기존 상세 workbench는 고급 정보 보존을 위해 접힌 disclosure 아래 남아 있다.
- 계정 동기화, 외부 Calendar/Todo OAuth, 실제 AI/crawler는 P28 범위가 아니다.

현재 판정은 “내부 구현과 회귀 검증 완료”다. “상용 UX 검증 완료” 또는 “실제 사용자 검증 완료”가 아니다.
