# P33 Publish Stabilization Evidence

## 판정

`publish_ready_for_preview`

P33 branch를 preview 검토 가능한 상태로 안정화했다. 이번 작업은 P33의 제품 범위를
늘리지 않고, 독립 검토에서 발견된 데이터 손실 위험과 identity 불일치, 전체 E2E의
간헐 실패를 닫았다.

## 닫은 문제

1. 항목 제외 상태를 개인 메모와 분리했다.
   - 신규 제외는 `personalExcluded`에 저장한다.
   - 제외와 복구가 `note`를 덮거나 삭제하지 않는다.
   - 기존 `excluded_on_start` sentinel은 읽기 호환만 유지하며 사용자 export에
     노출하지 않는다.
2. Canonical Flow ID는 registry의 수기 문자열이 아니라 단일 factory가 만든다.
   - AJD identity triple과 registry identity가 같은 ID를 반환한다.
   - 이전 P33 preview ID는 compatibility alias로만 읽는다.
   - 기존 24개/5개 저장 사본을 삭제하거나 자동 병합하지 않는다.
3. My Flow 메모 저장 후 새로고침 간헐 실패를 안정화했다.
   - 서버 문서의 4탭 shell은 그대로 렌더링한다.
   - 실제 저장 Flow가 렌더링된 뒤에는 최신 localStorage draft를 committed value로
     읽는다.
   - 편집 진입 시 저장 draft를 한 번 동기화한 뒤 editor를 연다.
   - persistence와 화면 projection을 각각 assertion한다.

## 변경 경계

- source content mutation: `0`
- 기존 `flow:saved:*` 삭제: `0`
- 24개/5개 자동 병합: `0`
- production migration: `0`
- 4탭 IA 변경: `0`
- P34 UX 기능 혼입: `0`
- main merge: `false`
- production deploy: `false`
- observed-user sessions: `0`

## 현재 검증

- Contract/pretest: `64 / 64`
- Unit: `588 / 588`
- My Flow memo reload 반복: `30 / 30`
- P24 save/personalize regression: `6 / 6`
- My Flow server-document regression: `1 / 1`
- Full Playwright run 1: `320 / 320`
- Full Playwright run 2: `320 / 320`
- Production build: `18 / 18`
- `.next/BUILD_ID`: present
- Built server route smoke: `/`, `/flows`, `/f/moving-d30-basic`, `/my`,
  `/calendar` HTTP `200`; `/flow-maps/moving-d30` expected redirect
- `git diff --check`: pass

자동 테스트와 browser automation은 실제 사용자 검증이 아니다.

## Publish 상태

- Branch: `codex/p33-integrated-program-plan`
- Stabilization implementation commit: `abb0a993077d53cafe365515df0289b3b3654354`
- Draft PR: [#156](https://github.com/knhbae/flowme2605/pull/156)
- Preview alias:
  <https://flowme2605-git-codex-p33-integrated-program-plan-flowme.vercel.app>
- Main merge: 하지 않음
- Production deploy: 하지 않음

Preview는 Vercel deployment protection이 켜져 있으면 익명 검토자가 SSO 화면으로
이동한다. 이 경우 PR source와 이 evidence package를 사용하고 접근 제한을 검토
결과에 명시해야 한다.

## 파일

- [상세 감사](./audit.md)
- [검증 결과](./verification.json)
- [route 및 marker](./route-evidence.json)
- [Claude Design / Claude Code 공용 검토 프롬프트](./review-prompt-ko.md)
- [기존 P33 기능 evidence](../2026-07-24-p33-cross-entry-canonical-alignment-evidence/README.md)
