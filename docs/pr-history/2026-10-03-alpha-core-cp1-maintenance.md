# PR209 — 핵심 사용 여정의 선행 유지보수 후보

- Date: 2026-10-03
- Branch: `agent/alpha-core-journeys-cp1-20261003`
- PR: https://github.com/knhbae/flowme2605/pull/209
- Status: `Draft`
- 최초 Commit: `80abc0ad3981fe8ef316d72d23c8b0d5645544f9`
- 현재 후속 Commit: `670f1f4528c785dccd3eb422a525ee89cb68cacd`
- 최초 Build: `Lc4K4IUc8Aw8T4aMCWLfa`. 현재 실제 CSS 적용 build: `C7MFCtrzqwqfL6t2pKtTm`.
- Deploy URL: 개발계 교체 미완료. URL 존재를 새 판본 제공 증거로 쓰지 않는다.

## Why

직전 r6 UX 후보의 기능을 다시 개발하지 않고 최신 검증 가능한 유지보수 판본을 첫 반영 체크포인트로 준비한다. 출처·보안 실패를 날짜 치환이나 검사 우회로 감추지 않는다.

## What Changed

112개 소유 파일을 선별 게시했다. 공식 의존성/CSS 호환 보완, 근거 있는 출처 검토와 공급 보류, 보류 자료의 읽기·보존/새 변경 거절, 기존 M3 현재-revision 보호 연결, 합성 fixture·검사 구성 및 exact-build QA 계약을 포함한다. source654와 r6 QA를 CP2와 구분한다.

## Not Done

새 판본의 실제 HTTP 30개 검사는 NOT_RUN이다. CI 전체 성공·CP1 개발계 교체·복귀·실기기/IME/AT·관찰 사용자 시험은 미완료다. main merge·Production·새 DB/Auth/schema/DNS/Tunnel·실제 계정 쓰기는 진행하지 않았다.

## Decisions

원본 pack과 기존 사본을 보존한다. 보류된 자료를 성공 fixture로 계속 쓰지 않고 실행 가능한 자료와 음성 검사를 구분한다. 기존 공용 원본 보존 계약·CAS/replay·전체 사본 삭제·무관한 문서 편집을 유지한다. 새 정책을 확정하지 않는다.

## Files Touched

정확 경로·해시는 [선행 manifest](../specs/2026-10-03-alpha-core-journeys-ready/prerequisites-manifest.md)와 [공통 manifest](../specs/2026-10-03-alpha-core-journeys-ready/manifest.md)를 따른다. 주요 범위는 package/lock·CSS 호환, source freshness/library, M3 command-handler 및 관련 검사다. 이 이력 문서는 CP2의 공통 기록으로 추가하며 CP1 commit에 원래 포함됐다고 주장하지 않는다.

## Verification

- 실제 최종 통합: 279파일/2,960실행/2,960PASS, fail/skip/cancel0.
- 정상 commit 문서 검사와 정상 pre-push verify exit0. 후크 우회0.
- postcommit exact proof: compile1,212/QA242/static81, drift0·해당 root/head/build 일치.
- 최초 CI run `37109357657`은 core/catalog/gate SUCCESS·E2E FAIL이며760개 중721PASS/29FAIL/2FLAKY/8NOT_RUN이다. 정확 후속 head670f의 `37113646381`은 실행 중이다. 검토된 동일 저장소·해당 head의 `flowme-catalog-ci` 환경만 승인했다. 전체 성공은 아직 기록하지 않는다.
- 원본 pack 불변·합성 검증의 실제 자격정보 전달0·raw 공개0. 로컬 원본 증거는 Git에서 제외했다.

## Risks

후속14파일은 CSS2·E2E11·기존 manifest1이며 총 소유는123개다. CSS 순수10/10·격리 fixture30/30와 순수 계약6/6을 실제 제품 HTTP30으로 세지 않는다. 후속 build `rxHqgLVMfF47XqfM6s7mR`에는 이전 CSS가 남아 새 초점 보존 proof로 사용하지 않는다. 검증된 ignored 캐시의 recoverable 이동 뒤09:47:19~09:50:13 UTC 정상 hook은 npm2258/2258·docs4/4·exit0이다. cold build `C7MFCtrzqwqfL6t2pKtTm`와 새 proof compile1212/QA242/static81 drift0·실제 CSS2토큰 외 변경0을 확인했다. 실행/판본별 근거는 [현재 QA](../specs/2026-10-03-alpha-core-journeys-ready/qa.md#공통-ci-실패와-m-후속--현재-보완-중)를 따른다.

CI/HTTP·제공 판본·인증 없는 요청 거절·보호값 검사가 끝나기 전 사용자 시험용 새 판본이라고 안내하지 않는다. 서비스 기동은 직접 도구 거절 경계를 우회하지 않는다. 기존 교체 스크립트의 옛 PID/build/CI 고정값은 재사용하지 않는다.

## Follow-ups

정확 CP1 판본을 먼저 검사·반영·동결하고 CP2의 복귀 대상으로 보존한다. CP1 실패 시 기존 d1cc 제공 사본으로 앱만 복귀한다. 실제 DB·계정 상태 복구로 확대하지 않는다.

## Links

[목표](../specs/2026-10-03-alpha-core-journeys-ready/spec.md) · [QA](../specs/2026-10-03-alpha-core-journeys-ready/qa.md) · [CI](https://github.com/knhbae/flowme2605/actions/runs/37109357657)
