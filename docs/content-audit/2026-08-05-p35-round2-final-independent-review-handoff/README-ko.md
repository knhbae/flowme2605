# P35 Round 2 독립 검토 패키지 — coordinator 전용 색인

> 상태: `SOURCE_PACKAGE_READY / CANDIDATE_FREEZE_AUTHORIZED / EXTERNAL_CAPTURE_REQUIRED`
>
> 성격: `INTERNAL SIMULATION ONLY`
>
> 관찰 사용자: `0명`
>
> 배포·게시 상태: `NOT_PUBLISHED`

이 루트는 검토자에게 전달하는 문서가 아니라 coordinator가 두 차수의 공개 범위를 통제하는 색인이다. 문서와 template로 이루어진 **소스 패키지와 local candidate preflight는 준비됐고 candidate 동결·외부 capture가 승인됐지만, 검토에 사용할 불변 정적 evidence는 아직 candidate SHA에 묶어 캡처·게시해야 한다.** Pass 1에는 `blind-release/` 하위 파일만 별도 묶음으로 전달하고, Pass 1 산출물의 해시와 동결 시각을 확인한 뒤에만 `informed-release/`를 전달한다. 검토자에게 이 루트 폴더 전체 링크를 주지 않는다.

## 완료된 local gate

- P1-03 artifact parity·raw fidelity·transfer lineage: `PASS — LOCAL INTERNAL`
- P1-04 extremes·accessibility·legacy/read-only: `PASS — LOCAL INTERNAL`
- 최종 candidate preflight 집계: direct `6/6`, unit/workflow `1,086/1,086`, build `18/18`, pre-freeze BUILD_ID `vAb8e5TudUXvxEyowetMU`, full Playwright `529/529`(workers `4`, retries `0`, `26.0m`)
- 실제 관찰 사용자: `0명`

위 결과는 mutable working tree의 내부 QA다. 아직 `product_candidate_sha`와 clean-tree proof에 묶이지 않았으므로 immutable product candidate, 게시 evidence, 독립 검토 결과 또는 release 증거로 승격하지 않는다. 실제 브라우저 200% zoom과 performance도 `NOT_ASSESSED`다. 후보 commit·push 뒤 exact SHA, clean proof, rebuild BUILD_ID와 capture identity는 이 소스 문서를 다시 써서 자기 SHA를 참조하지 않고 외부 freeze/publication record에 기록한다.

## 지금 실행하면 안 되는 이유

아래 세 조건을 모두 충족하기 전에는 Codex와 Claude Design 검토를 시작하지 않는다.

1. 현재 local PASS working tree를 별도 승인된 commit으로 동결하고, `product_candidate_sha`와 clean-tree proof를 채운 뒤 같은 SHA의 build ID와 candidate epoch을 고정해야 한다. product tree가 dirty이면 즉시 `NOT_READY`다.
2. S01~S23의 ordered static capture·raw artifact·manifest·blind/informed allowlist를 같은 candidate epoch에서 채우고 byte length·SHA-256을 검증해야 한다. 현재 이 evidence는 `TBD`다.
3. Claude가 열 수 있는 불변 링크를 게시하고 blind와 informed 게시 SHA/URL을 각각 고정해야 한다. blind는 informed 파일이 존재하지 않는 물리적으로 분리된 publication이어야 한다. Owner는 2026-08-05에 P35 Round 2 전체 범위의 commit·push, candidate 동결, blind-only asset/index 게시, 두 Pass 1 결과 동결 뒤 informed-only 게시를 승인했다. PR, merge, Preview, Production 권한은 없다.

P1-03/P1-04 local PASS를 과거 캡처나 다른 build의 산출물과 섞어 빈칸을 채우지 않는다. 현재 build 결과도 immutable product candidate SHA에 다시 묶이기 전에는 publication identity로 사용할 수 없다.

## 물리적으로 분리된 전달물

| 트리 | 공개 시점 | 대상 | 색인 |
|---|---|---|---|
| `blind-release/` | Pass 1 시작 때만 | 새 Codex 세션, 새 Claude Design 세션 | [blind-release/README-ko.md](./blind-release/README-ko.md) |
| `informed-release/` | 두 Pass 1 결과 동결 뒤 | 각 reviewer의 새 Pass 2 세션 | [informed-release/README-ko.md](./informed-release/README-ko.md) |
| `coordinator/` | reviewer 비공개 | coordinator | [coordinator/README-ko.md](./coordinator/README-ko.md) |

## 운영 규칙

- Codex와 Claude Design은 서로의 결과를 보지 않은 새 세션에서 Pass 1을 수행한다.
- Pass 2도 새 세션으로 시작한다. inherited context, 기존 대화, 메모리, 이전 결과를 입력으로 쓰지 않는다.
- finding ID는 사용자 진술 추적 `UF-###`, Codex `CX-###`, Claude Design `CD-###`만 쓴다.
- Todo/Today의 성격은 blind에서 열린 질문으로 둔다. 실행 view인지 export인지에 대한 가설과 결론은 informed 자료에서만 검토한다.
- creator, text authoring, publishing 및 text-to-flow 경로는 이번 검토의 route debt이자 범위 밖이다. 발견 시 제품 결함 점수에 섞지 말고 `OUT_OF_SCOPE_ROUTE_DEBT`로만 기록한다.
- 내부 시뮬레이션, screenshot, 자동화, owner 검토는 실제 사용자 관찰로 세지 않는다.

## 금지된 작업

이 패키지 자체가 포괄적 권한을 부여하지는 않는다. 현재 승인된 작업은 [Owner 실행·게시 승인 기록](./coordinator/07-owner-publication-authorization-ko.md)의 순서와 범위로 제한된다. PR, merge, Vercel Preview·Production 배포, 실제 사용자 관찰, 두 Pass 1 결과 동결 전 informed 공개는 승인되지 않았다.
