# P33 Draft PR 독립 검토 — Cross-entry Canonical Alignment

**reviewedAt** 2026-07-25 KST · **PR** #156 · **branch** `codex/p33-integrated-program-plan` · **commit** `b4ba62ea5f8aa2a87b27558aafbba49ed9d4dc28` (57 files)
**최종 판정** `bounded_fix_before_publish` · **finding 11 (high 2 · medium 6 · low–med 1 · low 2)** · **앱 코드 변경 없음 · merge 없음** · **observed-user count 0**

## 1. 한 줄 결론

P33은 P26 계약("모든 표면 = 하나의 Flow object")을 실제로 구현했다. alias 4개가 서버에서 canonical 상세로 수렴하고, 저장 identity·receipt·My Flow·Calendar·export가 모두 24개를 읽으며, 기존 key 삭제 0·자동 병합 0·복구 가능·malformed 안전 낙하가 코드와 unit test로 확인된다.

남은 것은 두 지점이다. **URL 진입만 legacy 5개 세대의 미리보기와 파일을 그대로 내보내고**(F1), **사본 선택에 '따로 유지'가 없어 보관 사본을 복구하면 결정이 반복 요구**된다(F2). 둘 다 국소 수정이므로 계약 반전이나 재설계가 아니라 publish 전 bounded fix다.

## 2. 근거와 한계

**근거** · PR commit의 변경 소스 직접 열람(registry / storage adapter / url-first-lookup / storage.ts / `app/f/[slug]` / `app/flow-maps/[map]` / `app/flows` / backup / lifecycle / recurrence formatter / artifact preview / package.json main 대조) · unit·E2E assertion 판독(실행 아님) · PR evidence 스크린샷 6장(390·1024·1440).

**하지 못한 것 (`inaccessible`)**

- **candidate preview 라이브 조작** — 루트 요청이 Vercel 로그인 화면을 반환(deployment protection). 브라우저 실측·console·focus·overflow 재계측 불가 → F9.
- **`components/flow/AppClient.tsx` 열람** — 512KB 초과로 도구 한도 밖. reconciliation 패널·URL lookup 결과 화면·bottom sheet 마크업은 test 계약과 evidence 캡처로만 간접 확인.
- `npm audit` / Playwright / build 재실행, 스크린리더·키보드 실측, 실제 사용자 관찰.

PR의 QA 수치(55+587 / 6 / 320 / 18)는 복사하지 않았다. 나는 assertion을 **읽어서** 무엇이 고정됐고 무엇이 고정되지 않았는지 판정했다.

## 3. 핵심 8항목 판정

| # | 항목 | 판정 | 요지 |
|---|---|---|---|
| 1 | 네 진입점 → 같은 24개 | **partial** | alias 4개 서버 redirect·Find 카드 1개/24개는 확인. URL lookup 내용(F1)·query 붙은 URL의 miss(F5)·SSR fallback legacy 카드(F4)가 남음 |
| 2 | 저장 후 제목·개수·identity 일치 | **partial** | 저장 slug 수렴 + downstream 24 정합. URL 경로 markdown이 legacy 4줄(F1), 표시 제목 3중 분기(F3) |
| 3 | 자동 병합 없는 사본 선택·보관 | **partial** | 병합·삭제 없음, 복구 가능. '따로 유지' 부재·복구 시 재요구(F2), needs_choice 근거 0(F3) |
| 4 | 개인 값·run·occurrence·export 보존 | **pass** | 탐지 read-only, 결정 write 2개 key 한정, protectedKeys 동일성 test |
| 5 | artifact 선택 → preview·저장·receipt | **pass** | count>0 shape만 렌더(false affordance 구조적 제거) + 내부 state, moving·vehicle 저장 mode·receipt 고정 |
| 6 | raw RRULE → 사용자 문구 | **pass +gap** | FREQ/INTERVAL/BYDAY/COUNT/UNTIL 투영, malformed는 '반복 실행'. no-FREQ assertion이 한 상태에만 있고 다른 내부어(`flowme.local` fixture, fallback legacy 제목)는 잔존 |
| 7 | bottom sheet 닫기·focus·keyboard | **inaccessible** | 주장은 문서에만. P33 E2E 6개에 sheet assertion 없음, 캡처 없음, AppClient 열람 불가 → 검증 공백(F10) |
| 8 | 다른 source/job으로 확장 가능한 계약 | **partial** | identity·invariant·write gate·artifact eligibility는 일반화. 사본 표시값이 '간단 이사 준비 · 5개' 하드코딩(F8) |

## 4. Findings (요약 — 전체는 `p33-pr-findings.json`)

| ID | Severity | 제목 | Route |
|---|---|---|---|
| F1 | **high** | URL 진입의 미리보기·markdown이 canonical 24개가 아니라 legacy 5개 세대 (행 선택도 무시) | `/flows` lookup |
| F2 | **high** | 사본 선택에 '따로 유지'가 없고 보관 복구 시 결정이 재요구됨 | `/my?view=flows` |
| F3 | medium | needs_choice 화면 캡처 0 + 사본 라벨이 canonical 제목과 3중 분기 | `/my?view=flows` |
| F4 | medium | `/flows` 서버 fallback이 legacy 제목·경로·구 vehicle 약속 유지 | `/flows` SSR |
| F5 | medium | 등록 원문 URL에 미등록 query가 붙으면 hit → miss | `/flows` lookup |
| F6 | medium | 반복 Flow 재시작 경로가 canonical origin metadata를 기록하지 않음 | `/my` 재시작 |
| F7 | medium | 24개 상세 모바일에서 같은 24행이 두 번 전개 | `/f/moving-d30-basic` 390 |
| F8 | medium | 표시값이 AJD moving 전용 하드코딩(두 번째 group에서 잘못된 개수) | 계약 수준 |
| F9 | low–med | candidate preview 로그인 벽 → 독립 라이브 검증 불성립 | preview |
| F10 | low | sheet focus return 검증 근거 없음 | `/my` 390 |
| F11 | low | legacy alias redirect가 temporary(307) | 4 alias |

각 finding에 재현 단계·기대/실제·사용자 영향·evidenceKind·수정 제안·필요한 marker/screenshot이 JSON에 들어 있다.

## 5. 잘 된 부분 (유지)

- **alias redirect가 서버 컴포넌트에서 렌더 전 실행** + `alternates.canonical` 정합 → legacy 북마크 도달이 클라이언트 상태와 무관하게 보장된다.
- **비파괴 원칙이 코드로 성립**: 탐지는 read-only, 결정 write는 `flow:canonical:reconciliation:v1` + lifecycle 2개 key, saved/checks/run-registry/completion-feedback 불변.
- **malformed 방어가 실효적**: 깨진 legacy 사본이 유효 canonical 사본을 가리지 않고 warning으로 남는다.
- **backup/restore 범위에 신규 metadata 포함**, 스키마 버전 불변.
- **artifact false affordance 제거가 일반 계약**: category hardcode 대신 eligibility(count>0) 기반, 부모 미연결 시에도 preview가 바뀐다.
- **recurrence 문구 투영**이 알 수 없는 규칙까지 안전하게 낙하.

## 6. 페르소나 6 × 여정 9단계

supported **36** · partial **13** · missing **2** · inaccessible **3** (54칸, `p33-pr-persona-matrix.json`).
missing 2칸은 모두 **P3(AJD URL 붙여넣기)**의 '상세'와 'export'다 — 저장 identity는 이미 canonical인데 **사용자가 보는 내용과 받는 파일**만 legacy에 남아 있다.

## 7. 회귀 판정

- 기존 E2E 20개 수정. p24/p25/p26/p27/p30/flow-mvp/url-first-user-surface는 여전히 `/flow-maps/moving-d30` 등으로 goto하며, 이제 canonical로 redirect되므로 사실상 canonical 상세를 검증한다. moving map 조합 자체의 직접 커버리지는 사라졌다(설계 의도와 일치하나 커버리지 이동을 기록해야 한다). `/flow-maps/moving-d30/creator` 같은 하위 경로는 redirect 대상이 아니다.
- **남은 데이터 질문 1개**: 사본 탐지는 `flow:saved:{slug}`만 읽는다. legacy 이력이 map 단위 record(`flow:map:saved:*`)로만 남고 child flow record가 없는 브라우저가 있으면 선택 패널이 뜨지 않는다. E2E는 `flow:saved:source-backed-moving-d30`를 직접 심는 합성 fixture라 이 형태를 커버하지 않는다 → map-only fixture와 실제 데이터 형태 확인 필요.
- **security audit**: main과 PR의 `package.json`에서 dependencies·devDependencies·overrides가 동일하고 diff는 앱 코드·테스트·문서만 건드린다(변경은 `pretest`에 신규 unit 2개 추가). 따라서 audit 실패가 있다면 **dependency baseline(transitive advisory)** 문제이며 **P33 회귀와 분리**해 판정해야 한다. 단, 이 검토에서 `npm audit`을 실행하지 않았으므로 '실패가 없다'는 주장은 하지 않는다.

## 8. Publish 게이트 제안

**publish 전 (4)** F1 · F2 · F4 · F5
**publish 후 가능 (6)** F3 · F6 · F7 · F8 · F10 · F11

추가 marker: `urlLookupPreviewItemCount === 24`, `urlLookupMarkdownRowCount === 24`, `keptSeparateDecisionPersistsAfterRestore`, `reconciliationPanelReappearCount 0`, `fallbackTitle === canonicalTitle`, `lookupHitWithArbitraryQueryParam`, `mapOnlyLegacyRecordDetected`, `canonicalOriginMetadataPresentAfterRestart`.
추가 캡처: needs_choice 390/1024 · URL lookup 결과 390 · `/flows` fallback 390 · sheet open/close 390.

## 9. 관찰(사용자 스터디)에만 물어야 할 것

1. 24개를 정본으로 본 뒤에도 5개 사본을 계속 쓰고 싶어하는가? '따로 유지'가 필요한 상황을 실제로 말하는가?
2. '전체 24개 / 간단 5개' 구분만으로 무엇을 잃는지 이해하는가?
3. URL 미리보기 3행과 저장 후 24개를 같은 Flow로 인식하는가?
4. 24개 전체 목록이 저장 **전**에 필요한가, **후**에 필요한가?
5. legacy 북마크로 들어와 다른 제목의 화면이 열렸을 때 같은 콘텐츠로 인식하는가?

## 10. 무결성

앱 코드·스키마·의존성을 수정하지 않았고 PR을 merge하지 않았다. 실제 관찰 사용자 0명. 자동화·스크린샷·소스 판독을 사용자 검증으로 표현하지 않는다. 가짜 사용량·리뷰·평점 없음.
