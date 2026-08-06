# Owner 실행·게시 승인 기록

> 최초 기록일: `2026-08-05 KST`
>
> P′′ 재승인: `2026-08-06 KST`
>
> 권한 상태: `GRANTED_WITH_SEQUENCE_GATES`
>
> 실행 완료 상태: `NOT_YET_COMPLETED`

Owner가 P35 Round 2의 candidate 동결과 독립 검토 publication 준비를 다음 범위로 승인했다. 2026-08-06에는 Pass 2 `REVISE` 뒤 별도 worktree에서 검증한 P′′에 대해 같은 순서 gate를 명시적으로 재승인했다. 이 기록은 실행 권한의 근거이며 commit, capture 또는 publication이 이미 완료됐다는 증거가 아니다.

## 승인된 작업

1. 검증된 P′′ 변경 범위를 의도적으로 검토한 뒤 commit하고, open Draft PR #165를 갱신하지 않는 candidate branch `codex/p35-round2-correction-pprime2-20260805`에 push한다.
2. push된 commit을 변경 불가능한 `product_candidate_sha`로 고정하고 clean-tree proof를 남긴다.
3. 같은 `product_candidate_sha`에서 build를 다시 실행하고, 그 build ID에 묶인 S01~S23 capture·raw artifact·manifest·hash를 생성한다.
4. informed 파일이 존재하지 않는 물리적으로 분리된 GitHub blind-only publication에 asset commit A와 A를 직접 참조하는 index commit B를 순서대로 게시한다.
5. Codex와 Claude Design의 Pass 1 결과가 **모두** 각각 동결된 뒤에만 informed-only publication을 별도로 게시한다.
6. 같은 candidate에 대해 Codex와 Claude Design의 fresh Pass 1과 fresh Pass 2를 각각 새 세션에서 수행한다. Claude Design은 commit-pinned GitHub 입력만 사용하고 외부 결과 패키지를 coordinator에게 반환한다.

## 승인되지 않은 작업

- Pull request 생성
- merge
- Vercel Preview 배포
- Vercel Production 배포
- 실제 사용자 관찰 또는 사용자 검증으로의 승격
- 두 Pass 1 결과 동결 전 informed 자료 게시·공개·전달

현재 branch push로 자동 CI가 실행되는 경우 결과를 관찰할 수는 있지만, 그것이 PR·merge·배포 권한을 추가하지 않는다. Candidate identity 불일치, dirty proof 실패, hash 불일치 또는 blind contamination이 발생하면 다음 단계로 진행하지 않고 해당 gate에서 중단한다.

실행 순서와 완료 판정은 [readiness와 publication gate](./01-readiness-and-publication-gate-ko.md), [two-pass protocol](./02-two-pass-protocol-ko.md), [local evidence coverage와 freeze plan](./06-local-evidence-coverage-and-freeze-plan-ko.md)을 따른다.
