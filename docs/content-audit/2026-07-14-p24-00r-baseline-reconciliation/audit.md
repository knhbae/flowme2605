# P24-00R 상세 감사

## 실행 조건

- 실행일: 2026-07-14 KST
- OS: Windows
- Node: `24.17.0`
- npm: `11.13.0`
- timezone: `Asia/Seoul`
- base commit: `211827d7f5fafebab00ed71dacdb106db0b3b44b`
- clean worktree와 dependency-candidate worktree를 같은 commit에서 분리
- candidate에는 `package.json`, `package-lock.json`, `playwright.config.ts`, `next-env.d.ts`만 적용
- `app/`, `components/`, `lib/`는 두 환경에서 동일

## 환경 비교

### Clean tracked

- Next `15.3.8`
- Playwright `1.52.0`
- PostCSS `8.5.3`
- install audit: high 4, moderate 3
- unit 476/476
- build pass, 18 routes

### Dependency candidate

- Next `15.5.20`
- Playwright `1.61.1`
- PostCSS `8.5.16`
- install audit: high 0, moderate 2
- unit 476/476
- build pass, 18 routes

보안 수치는 candidate가 낫지만 이 결과만으로 dependency 변경을 product fix와 섞어 commit하지 않는다. P24 correctness를 tracked baseline에서 고친 뒤 candidate를 별도 controlled upgrade로 검증한다.

## 충돌 결과 해석

### Build 실패

Claude Code audit의 `Collecting page data` 실패는 이번 clean/candidate build에서 모두 재현되지 않았다. 이전 실행의 `.next` cache 또는 장시간 dev process 상태와 연관됐을 가능성이 있지만, 이번 결과만으로 원인을 단정하지 않는다.

### `/flows` 직접 진입

production build에서 `/flows`를 직접 여는 기존 E2E를 두 환경에서 각각 실행했고 모두 통과했다. dev 장시간 세션의 streaming/hydration 문제는 별도 운영 위험으로 남기되 production route blocker로 승격하지 않는다.

### 전체 E2E

clean full suite는 15분 외부 command limit에 걸려 종료됐다. 이후 동일 build에서 단일 production E2E가 정상 기동되고 10초 내 통과했으므로 webServer 자체 실패가 아니다. 최종 P24 마감에서는 전용 포트와 더 긴 제한으로 259개 전체 스위트를 재실행한다.

## 제품 finding 분류

- `confirmed_clean`: clean audit 또는 동일 product code에서 직접 확인된 결함
- `not_reproduced`: 이번 격리 production 조건에서 재현되지 않음
- `blocked`: 이번 slice에서 동일 여정 재실행 또는 외부 접근이 불가능

정확성 결함은 의존성 candidate와 무관한 product projection 영역이다. 다음 순서는 날짜 정확성, effective-state parity, reuse transfer, recurrence, draft inclusion/validation, hydration 순으로 고정한다.

## 문서 검사

tracked baseline의 `docs:check`는 아래 선행 링크 문제로 두 환경 모두 실패했다.

1. `docs/content-audit/2026-07-12-flowme-public-flow-visual-system-evidence/README.md`가 추적되지 않은 CEO report를 참조
2. `docs/DECISIONS.md`가 추적되지 않은 `my_tests/260616_check_01.md`를 참조

현재 main dirty worktree에는 첫 대상 파일이 존재하므로 임의 삭제나 우회 수정을 하지 않는다. P24 branch에 필요한 source artifact를 명시적으로 포함하거나 링크 정책을 정리한 뒤 docs gate를 닫는다.

## 운영 접근

`https://flowme2605-13grv45zl-flowme.vercel.app/` 익명 HEAD 요청은 `302`로 Vercel SSO에 이동했다. 실제 사용자 관찰 전 공개 observation deployment가 필요하다.
