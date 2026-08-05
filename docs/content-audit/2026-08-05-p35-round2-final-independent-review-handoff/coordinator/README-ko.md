# Coordinator control room

> 상태: `SOURCE_PACKAGE_READY / CANDIDATE_FREEZE_AUTHORIZED / EXTERNAL_CAPTURE_REQUIRED`
>
> P1-03: `PASS — LOCAL INTERNAL`
>
> P1-04: `PASS — LOCAL INTERNAL`
>
> evidence publication authority: `GRANTED_WITH_SEQUENCE_GATES`

이 디렉터리는 reviewer에게 공개하지 않는다. blind와 informed 입력, evidence identity, freeze, contamination, 교차 종합을 통제하는 운영 문서다.

## 파일

1. [01-readiness-and-publication-gate-ko.md](./01-readiness-and-publication-gate-ko.md)
2. [02-two-pass-protocol-ko.md](./02-two-pass-protocol-ko.md)
3. [03-master-manifest-template.md](./03-master-manifest-template.md)
4. [04-cross-review-synthesis-template-ko.md](./04-cross-review-synthesis-template-ko.md)
5. [05-package-self-audit-ko.md](./05-package-self-audit-ko.md)
6. [06-local-evidence-coverage-and-freeze-plan-ko.md](./06-local-evidence-coverage-and-freeze-plan-ko.md)
7. [07-owner-publication-authorization-ko.md](./07-owner-publication-authorization-ko.md)

## 절대 경계

- product tree가 dirty이면 `NOT_READY`다. 작업 중인 dirty tree를 임의로 commit하거나 정리해서 gate를 통과하지 않는다.
- P1-03/P1-04 local closeout과 candidate preflight는 완료됐다. immutable candidate 고정, S01~S23 evidence capture·검증, blind-only 게시 완료 전에는 reviewer를 실행하지 않는다.
- root 폴더 전체를 reviewer에게 공유하지 않는다.
- Pass 1에는 `blind-release/`만 informed 파일이 존재하지 않는 물리적으로 분리된 repo/gist/archive 또는 publication commit으로 게시한다. 같은 publication 안에서 allowlist만 제한하는 방식은 허용하지 않는다.
- Pass 2는 fresh session에서 수행하며 reviewer 자신의 Pass 1 freeze만 제공한다.
- 2026-08-05 Owner 승인은 현재 P35 Round 2 전체 범위의 commit·push, immutable candidate 동결, 같은 SHA의 재build·capture, blind-only asset/index 게시, 두 Pass 1 결과 동결 뒤 informed-only 게시까지로 제한된다.
- PR, merge, Vercel Preview·Production 배포, 실제 사용자 관찰, 두 Pass 1 결과 동결 전 informed 공개는 승인되지 않았다.

관찰 사용자 수는 `0명`이며 내부 시뮬레이션 결과와 구분한다.
