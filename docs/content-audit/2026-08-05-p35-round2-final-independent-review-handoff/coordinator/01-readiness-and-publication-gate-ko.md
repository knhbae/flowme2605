# Readiness와 publication gate

> 현재 상태: `SOURCE_PACKAGE_READY / CANDIDATE_FREEZE_AUTHORIZED / EXTERNAL_CAPTURE_REQUIRED`

## 상태 머신

```text
SOURCE_PACKAGE_READY
  → P1-03_PASS                       [DONE · LOCAL INTERNAL]
  → P1-04_PASS                       [DONE · LOCAL INTERNAL]
  → CANDIDATE_PREFLIGHT_COMPLETE     [DONE · LOCAL INTERNAL]
  → CANDIDATE_FREEZE_AUTHORIZED      [CURRENT]
  → PRODUCT_CANDIDATE_FROZEN_CLEAN
  → CANDIDATE_EPOCH_BOUND_TO_BUILD_ID
  → S01_S23_EVIDENCE_CAPTURED_AND_HASHED
  → BLIND_EVIDENCE_PUBLISHED_WITH_AUTHORITY
  → PASS1_RUNNING
  → BOTH_PASS1_FROZEN
  → INFORMED_EVIDENCE_PUBLISHED_WITH_AUTHORITY
  → PASS2_RUNNING
  → BOTH_PASS2_FROZEN
  → COORDINATOR_SYNTHESIS
```

어느 단계든 candidate/evidence mismatch 또는 contamination이 확인되면 해당 단계 이전으로 돌아가 새 SHA로 다시 동결한다.

## Product candidate gate

| 항목 | 조건 | 상태 |
|---|---|---|
| P1-03 artifact gate | preview/actual/receipt parity 및 raw artifact fidelity 완료 | `PASS — LOCAL INTERNAL` |
| P1-04 extremes/a11y gate | density, legacy, failure, a11y, responsive 완료 | `PASS — LOCAL INTERNAL` |
| local candidate aggregate | 같은 final working tree의 direct/unit/build/E2E | `PASS — 6/6 · 1,086/1,086 · 18/18 · 529/529` |
| product candidate | immutable commit SHA 고정 | `TBD` |
| clean proof | `git status --short` empty + 원문 hash | `TBD` |
| build | same candidate에서 PASS, build ID/log hash | `PREFLIGHT PASS — vAb8e5TudUXvxEyowetMU / immutable SHA rebuild binding TBD` |
| candidate epoch | `product_candidate_sha + build_id` 조합과 생성 시각 고정 | `TBD` |
| S01~S23 evidence | ordered capture/raw artifact/manifest/allowlist hash 완료 | `TBD · EXTERNAL_CAPTURE_REQUIRED` |
| observed users | 실제 세션 수 | `0` |

P1-03/P1-04와 위 집계는 mutable working tree의 내부 QA다. `git status --short`에 한 줄이라도 있으면 publication candidate는 `NOT_READY_DIRTY_PRODUCT_TREE`다. 승인된 P35 Round 2 범위만 새 비-PR 후보 브랜치에 동결하고, push된 exact SHA와 clean proof를 확인한 뒤 같은 SHA에서 build·capture를 다시 묶는다.

## Publication gate

| identity | 무엇을 식별하는가 | 다른 값으로 대체 가능? | 상태 |
|---|---|---|---|
| `product_candidate_sha` | 제품 source candidate | 불가 | `TBD` |
| `build_id` | 그 candidate에서 생성된 runtime | 불가 | `TBD` |
| `blind_evidence_publication_sha` | blind 문서·capture·artifact publication | 불가 | `TBD` |
| `blind_release_index_sha` | asset SHA direct allowlist를 담은 blind index commit; 외부 launch record에 기록 | 불가 | `TBD` |
| `informed_evidence_publication_sha` | informed 문서·archive·supplement publication | 불가 | `TBD` |
| `informed_release_index_sha` | informed index commit; 외부 launch record에 기록 | 불가 | `TBD` |

Blind publication은 informed 파일이 **존재하지 않는** 물리적으로 분리된 blind-only repo/gist/archive 또는 publication commit이어야 한다. 같은 commit·archive에 두 release를 함께 넣고 URL allowlist로만 가리는 방식은 금지한다. Owner는 blind-only asset commit A와 index commit B 게시를 승인했다. Informed publication 권한은 Codex·Claude Design 두 Pass 1 결과가 모두 동결된 뒤에만 열리며 별도 publication으로 만든다. 자세한 범위는 [Owner 실행·게시 승인 기록](./07-owner-publication-authorization-ko.md)을 따른다.

## Rebuild 관계

Review candidate identity는 `product_candidate_sha + build_id` 조합이다. Pass 1 freeze 뒤 build 명령을 다시 실행하면 source SHA가 같아도 새 candidate epoch으로 간주한다. 새 build ID, 새 build log hash, 새 capture/raw artifact, 새 blind publication을 만들고 Codex·Claude Pass 1부터 다시 수행해야 한다. Pass 2는 서로 다른 build ID의 Pass 1 freeze와 informed evidence를 연결할 수 없다.

## Claude no-local gate

Claude Design에 제공하는 모든 입력은 다음을 만족해야 한다.

- commit-pinned HTTPS direct URL
- manifest의 byte length·SHA-256과 일치
- ordered full-screen storyboard
- disclosure closed/open
- action before/after
- artifact preview HTML와 별도 raw file
- raw file의 transport/MIME/charset/newline/byte length/hash
- 확인 불가능한 runtime fact에 대한 Codex verification request 양식

하나라도 빠지면 해당 scenario는 `BLOCKED_BY_MISSING_EVIDENCE`다.

현재 S01~S23 static capture와 blind/informed allowlist의 URL·byte length·SHA-256은 모두 publication 입력 기준으로 `TBD`다. 따라서 Claude no-local gate와 Codex Pass 1 gate 모두 열리지 않았다.

## Scope gate

creator, text authoring, publishing, text-to-flow는 `OUT_OF_SCOPE_ROUTE_DEBT`다. 이번 gate가 이 경로의 구현 완료를 뜻하지 않는다. Todo/Today의 역할은 blind에서 열린 질문으로 유지하고 informed에서만 가설을 평가한다. 실제 브라우저 200% zoom은 `NOT_ASSESSED`이며 720x500 reflow proxy로 대체하지 않는다. Performance도 전용 budget/trace가 없으므로 `NOT_ASSESSED`다.
