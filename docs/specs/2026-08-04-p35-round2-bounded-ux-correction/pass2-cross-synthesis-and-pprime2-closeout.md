# P35 Round 2 Pass 2 교차 종합과 P′′ 로컬 보정 closeout

**상태:** `P′ PASS2_REVISE / P′′ CANDIDATE_SOURCE_READY / FINAL_CANDIDATE_EVIDENCE_PENDING / FRESH_TWO_PASS_REVIEW_AUTHORIZED`

**기록일:** 2026-08-05 KST

**최종 갱신:** 2026-08-06 KST — candidate-source hardening과 publication boundary 반영

**관찰 사용자:** `0명` — Codex·Claude Design 검토와 자동·브라우저 검증은 사용자 관찰이 아니다.

## 1. 검토 대상과 봉인 상태

Pass 2가 평가한 불변 후보는 아래 P′다. 이 후보와 봉인된 검토 결과에는 제품 변경을 덧붙이지 않았다.

| 항목 | 값 |
| --- | --- |
| P′ checkout | `D:\flowme2605\flow-p35-production-mobile-p0` |
| P′ branch / SHA | `codex/p35-round2-candidate-20260805` / `29cb03a65dd1037a3b813b7f43a5a095e4669dce` |
| P′ candidate epoch | `p35-r2-131b8ce629cf1288` |
| P′ BUILD_ID | `V29H3kpreESrdkYwzy_q9` |
| Codex Pass 2 | `codex-pass2-sealed.zip` · SHA-256 `8c5c8b…` · `REVISE` · 74/100 |
| Claude Design Pass 2 원본 | `D:\flowme2605\flow-mvp\claude_work\Pass 2 리뷰 결과 보고_260805_2331.zip` |
| Claude Design Pass 2 봉인본 | `claude-pass2-sealed.zip` · 32,008 bytes · SHA-256 `3091ac1fdc9f93ee5698ab2d5d5d8f0a4f333d72f6aa93dcccd7167414d586b0` |
| Claude package 검증 | `claude-pass2-validation-v2.json` · PASS · 두 패키지 동시 개봉과 5+5 파일 hash 일치 |
| P′ 게시 상태 | commit/push 완료, PR·merge·Preview·Production 안 함 |

두 reviewer 모두 P′에 `REVISE`를 내렸다. 그 결과를 P′에 수정하지 않고, 정확한 P′ SHA에서 새 P′′ worktree를 만들었다.

| 항목 | 값 |
| --- | --- |
| P′′ checkout | `D:\flowme2605\flow-p35-round2-correction-pprime2` |
| P′′ branch | `codex/p35-round2-correction-pprime2-20260805` |
| parent | P′ `29cb03a65dd1037a3b813b7f43a5a095e4669dce` |
| earlier local checkpoint BUILD_ID | `O_FcSLodnCeJe3e2F32PC` · final candidate-source hardening 전 historical evidence |
| publish 권한 | 2026-08-06에 P′′ commit/push와 순서가 제한된 blind/informed review publication 승인 · PR·merge·deploy는 권한 없음 |

## 2. Pass 2 finding 처분

| Finding | 판정 | P′′ 처분 | 확인 기준 |
| --- | --- | --- | --- |
| CX-001 stale Flow Map 저장 | `HIGH · 수정 필요` | Map 전용 잠금이 아니라 overlapping Plan·Map·personal·execution·receipt mutation이 하나의 same-origin Flow user-data write lock을 공유한다. Lock 안에서 최신 raw를 다시 읽고 CAS/expected-post 소유권을 확인하며, 외부 작성자의 새 값은 원복으로 덮지 않는다. Browser에서 lock을 얻지 못하면 fail-closed하고 자동 병합하지 않는다. | stale tab write `0`, 최신 저장본 보존, 반복 키 원복, 외부 값 보존, recovery focus |
| CX-002 전송 결과 식별 | `MEDIUM · 수정 필요` | Canonical request fingerprint와 실제 transport identity를 분리한다. Clipboard/file에 넘긴 최종 UTF-8 bytes에서 full SHA-256, byte length, encoding, newline `preserve`를 기록하고 canonical payload hash/length도 별도로 보존한다. Receipt append는 같은 user-data lock으로 직렬화하며 legacy receipt는 read-compatible하다. | exact transport bytes와 receipt 일치, 동시 append·rollback, legacy receipt 호환 |
| CX-003 50-Item 키보드 비용 | `MEDIUM · 수정 필요` | 저장 계획 편집 첫 초점을 `편집 작업으로 건너뛰기`에 두고, 실행 시 저장/취소 작업 영역으로 이동한다. | 390px, 실제 50 Item, 키보드 focus |
| UF-010 / CD-025 범위 용어 | `수정 필요` | 사용자 화면의 `Flow 전체`를 `계획 전체`로 통일했다. | 추천·전송 scope 카피 |
| CD-003 넓은 `/my` 구성 | `HIGH · 수정 필요` | 선택 전에는 library가 전체 canvas를 쓰고, 선택 후에만 읽기 가능한 rail과 detail을 나눈다. 고정 280px rail과 빈 detail을 제거했다. | wide 0/선택 상태, rail 가독성 |
| CD-026 지난 할 일 인지 | `HIGH · 수정 필요` | Today 요약과 행에 `지난 N · 오늘 M`, `지난 할 일` 상태를 표시한다. | 모바일 Today projection |
| CD-021 외부 도구 진입 중복 | `보정 필요` | `내 도구로 옮기기 · N개`를 단일 visible 진입점으로 두고 내부 중복 제목을 숨겼다. | 저장 계획 detail |
| CD-022 전송 완료 dead-end | `보정 필요` | 저장 계획 전송 성공 뒤 `다른 형식 보기`로 다음 행동을 제공한다. 공개 quick 결과는 기존 확인/닫기 계약을 유지한다. | saved/public lifecycle 분리 |
| CD-024 추가 형식 수 불명확 | `보정 필요` | `형식 총 N개 중 M개 더`로 전체와 추가 수를 함께 보인다. | capability preview |
| CD-027 저장 취소 범위 | `보정 필요` | `되돌리기`를 `방금 저장 취소`로 명확히 하고, 외부 artifact가 생긴 뒤에는 save-only 취소 배너를 제거한다. | 일방향 전송 뒤 orphan receipt 방지 |
| CD-VR-001 공개 첫 진입 write | `프로그램 계약 위반` | `/flows` 첫 진입에서 bundle/queue를 읽기 전용으로 만들고 명시적 저장 동작에서만 쓴다. | fresh local/session storage write `0` |
| CD-VR-002 Flow Map 3칸 요약 | `이미 충족` | 기본 화면에 이미 없으므로 제품 변경 없음. | current DOM |
| CD-VR-003 editor가 아래로 펼쳐짐 | `이미 충족` | 현재 editor는 full viewport dialog이고 body scroll lock이 있으므로 제품 변경 없음. | current DOM·focus contract |
| CD-VR-005 / CD-010 unnamed date input | `collector 오탐` | 입력이 wrapping `label`로 native accessible name을 가지므로 중복 `aria-label`을 추가하지 않는다. collector 개선은 제품 correction 밖이다. | browser accessible name |

## 3. P′′ final candidate-source hardening delta

| 항목 | Candidate source 계약 | 현재 증거 경계 |
| --- | --- | --- |
| 공용 write lock | Plan/Map/personal/execution/receipt/delete/recovery/backup처럼 겹치는 mutation은 `flowme:storage:all-user-data:v1` 하나로 직렬화하며 browser lock 부재·획득 실패는 fail-closed한다. | Source와 contract test가 존재한다. Candidate-bound final run은 pending이다. |
| Lock 후 fresh reread/CAS | Commit preparation과 intent 적용은 lock 안에서 최신 raw를 다시 읽고 stale React snapshot 대신 CAS/expected-post ownership을 검사한다. | Source-ready; exact final count는 post-push provenance 소유다. |
| Reuse raw transaction | Completion, reviewed Map 반영, execution reset, 새 run 시작을 planned-key raw backup 하나로 묶고 미계획 write를 거부한다. 실패 원복은 외부 replacement를 보존한다. | Source-ready; fresh S01~S23는 `NOT_RUN`이다. |
| Public copy CAS | Create/overwrite choice를 lock 안에서 다시 검사하고 saved-record raw CAS로 validation 이후 race도 막는다. | Source-ready; fresh independent review는 `NOT_RUN`이다. |
| Exact transport identity | Canonical fingerprint와 별도로 실제 전달 UTF-8 bytes의 SHA-256·byte length·newline policy를 receipt에 남긴다. | Legacy receipt read compatibility를 유지한다. |
| Schema-v2 identity | Partial update와 reuse가 기존 personal/source/version/request/count identity를 보존하며 invalid v2 result는 write 전에 거부한다. | Migration이나 write-on-read를 도입하지 않는다. |
| Vercel guard | `codex/p35-round2-correction-pprime2-20260805`와 `review/p35-round2-*` 자동 배포를 막는다. | Remote candidate guard는 push 뒤 published verifier가 다시 확인한다. |
| P2 제외 | URL supply-request queue, legacy-off, rapid batch submit, creator/text-authoring mutation ownership은 follow-up candidate다. | Current P′′ queue가 아니며 fresh review 뒤 별도 승격한다. |

`CANDIDATE_SOURCE_READY`는 commit/push, candidate SHA, BUILD_ID, epoch, final count, S01~S23, fresh review가 완료됐다는 뜻이 아니다. 이 identity와 결과는 post-push provenance만 정본으로 사용한다.

## 4. Owner 피드백 반영표

기호는 `O 반영 또는 현재 계약으로 충족`, `△ 문제는 수용했지만 제안한 해법을 그대로 쓰지 않음`, `X 현재 프로그램에서 채택하지 않음`이다.

| # | Owner 피드백 | 상태 | 현재 결과 또는 이유 |
| ---: | --- | :---: | --- |
| 1 | 내 계획에서 외부 도구로 보내기 | O | 선택한 저장 계획 상세에 `내 도구로 옮기기 · N개`가 있고 실제 형식·receipt로 이어진다. |
| 2 | 도움말/주의를 아이콘 popup으로 정리 | △ | 보조 설명은 disclosure로 줄이되, 안전·비가역·손실 경고까지 아이콘 안에 숨기지는 않는다. 전면 popup 규칙은 채택하지 않았다. |
| 3 | 내 계획 IA와 정보 순서 재검토 | O | 저장 계획 library 중심 구조를 유지하고, 이번 correction에서 넓은 화면의 빈 detail·좁은 rail을 제거했다. 전체 앱 재설계는 하지 않았다. |
| 4 | Item 상세 배경·중복 제목·수정 카피 | O | P1-01에서 중립 배경, 반복 `실행할 일` 제거, `수정`으로 정리됐다. |
| 5 | Flow Map 3칸 요약 삭제 | O | 기본 화면에서 이미 제거됐고 `선택 N / 전체 M`만 행동 근처에 둔다. |
| 6 | 시작일 선택 결과 중복 제거 | O | 성공 echo는 이미 제거하고 과거일·종료일 위험만 남겼다. |
| 7 | 공개 상세 CTA·여러 결과 형식·저장 후 보내기 | △ | 고정 5개 형식이나 모든 화면의 `편집/완료` 강제는 채택하지 않았다. 실제 데이터로 가능한 형식만 같은 preview family에서 보여주고, 저장 뒤 내 계획에서 크게 옮길 수 있다. |
| 8 | 공개/저장 편집 UI 통일, 별도 surface | O | 같은 editor family를 쓰며 mobile full-height dialog/wide inspector로 분리된다. |
| 9 | 더보기는 형식 preview, 수정은 별도 editor | △ | 역할 분리는 반영했다. 다만 `5개 format` 고정 대신 콘텐츠별 실제 가능 형식을 계산한다. |
| 10 | `Flow`라는 단어의 이해도 | △ | 핵심 사용자 동사는 `계획 찾기 / 내 계획 / 계획 수정 / 계획 전체`를 우선한다. FLOW 브랜드·URL·내부 identity는 유지한다. 실제 이해도는 사용자 관찰 0명이라 미검증이다. |

## 5. Final hardening 전 P′′ 로컬 검증 checkpoint

| 검증 | 결과 |
| --- | --- |
| 영향 unit/component | PASS |
| 전체 unit/workflow | `1,095/1,095 PASS` (`114 + 367 + 614`) |
| 핵심 통합 browser | `7/7 PASS` — 50 Item skip, first-render zero-write, wide `/my`, overdue Today, transfer/receipt, cancel/success focus return |
| 추가 재현성 browser | stale-tab `1/1`, P30 원계약 `3/3`, 고정 시각 overdue `3/3` PASS |
| 저장 transaction 집중 검증 | `29/29 PASS` — 반복 키 실패 원복과 외부 작성자 보존 포함 |
| production build | `18/18 PASS` · Next `15.5.21` · BUILD_ID `O_FcSLodnCeJe3e2F32PC` |
| dependency audit | high 이상 `0` |
| full Playwright | `530/530 PASS` · workers `4` · retries `0` · `17.6m` |
| docs / diff | `14` required files · `4,321` local links PASS / `git diff --check` PASS / historical screenshot diff `0` |

위 `1,095/1,095`, `530/530`, BUILD_ID `O_FcSLodnCeJe3e2F32PC`를 포함한 결과는 final candidate-source hardening 전 historical checkpoint다. 현재 source의 최종 scoped run은 아래와 같이 완료됐지만 clean post-push candidate-bound build/evidence는 `FINAL_CANDIDATE_EVIDENCE_PENDING`이다. 자동 검증은 실제 사용자 관찰을 대체하지 않는다. Actual browser 200% zoom, screen-reader speech, performance, 외부 Calendar/VTODO round-trip은 평가하지 않았다.

## 6. P′′ final candidate-source 로컬 검증

| 검증 | 결과 |
| --- | --- |
| pretest | `114/114 PASS` |
| P35 P0 | `415/415 PASS` |
| main unit/workflow | `615/615 PASS` |
| 합산 unit/workflow | `1,144/1,144 PASS` (`114 + 415 + 615`) |
| shared-lock 집중 계약 | `59/59 PASS` |
| full Playwright | `533/533 PASS` · shard `271 + 262` · workers `4` |
| production build | PASS · Next `15.5.21` · 18 routes |
| dependency audit | vulnerabilities `0` |
| docs / diff | `14` required files · `4,328` local links PASS / `git diff --check` PASS |
| 테스트 생성물 정리 | 자동 갱신된 historical screenshot `17개`를 HEAD bytes로 복원 |

이 표는 commit 전 동일 source에 대한 최종 로컬 검증이다. 독립 `npx tsc --noEmit`은 기존 test/fixture typing debt 때문에 green baseline이 아니며, 이번 runtime injector의 새 overload 오류는 제거했다. 배포 대상 타입 게이트를 포함한 `next build`는 PASS다. Exact pushed SHA, BUILD_ID, candidate epoch, S01~S23와 그 최종 count는 여전히 post-push provenance만 소유한다. 자동·브라우저 검증은 사용자 관찰이 아니며 관찰 사용자는 `0명`이다.

## 7. 게시 장부와 다음 gate

| 단계 | 상태 |
| --- | --- |
| earlier local correction checkpoint | 완료 · final hardening 전 historical evidence |
| candidate source contract | `CANDIDATE_SOURCE_READY` · P′′ worktree source에 존재 |
| final scoped run | 완료 · local source `1,144/1,144` unit/workflow · full Playwright `533/533` · build/audit/docs/diff PASS |
| commit / push | 승인됨 · exact publication status와 SHA는 post-push provenance 소유 |
| post-push build / candidate epoch / S01~S23 | `NOT_RUN` · BUILD_ID·epoch·최종 count는 post-push provenance 소유 |
| fresh blind Pass 1 | 안 함 |
| fresh informed Pass 2 | 안 함 |
| PR / CI / merge | 안 함 |
| Vercel Preview / Production | 안 함 |
| P2 follow-up | URL queue / legacy-off / rapid batch submit / creator·text-authoring · current queue 아님 |
| observed-user validation | `0명` |

P′의 Pass 2 결과는 P′′의 검토 증거로 승계할 수 없다. Owner는 2026-08-06에 P′′ commit/push와 새 review publication을 승인했고 final scoped run은 green이다. 이 source를 clean commit/push한 뒤 새 SHA·candidate epoch·BUILD_ID와 최종 count로 evidence를 다시 만든다. Codex/Claude Design fresh Pass 1 두 결과를 각각 동결한 뒤에만 informed Pass 2를 진행한다. 그 전까지 P35 production은 기존 release 그대로이며 관찰 사용자는 `0명`이다.
