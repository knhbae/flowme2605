# Text Authoring Vercel Preview 배포 증거

## 결과

- 배포 상태: `READY`
- 배포 대상: Vercel `preview`
- Preview URL:
  <https://flowme2605-pjwmzoq0j-flowme.vercel.app>
- Deployment ID: `dpl_737mvF8W3haX63f49fFPGu4UKNgG`
- Inspector:
  <https://vercel.com/flowme/flowme2605/737mvF8W3haX63f49fFPGu4UKNgG>
- 배포 시각: 2026-07-30 17:29:49 KST
- Production 변경: 없음

이 Preview는 오너의 명시적 Vercel 배포 요청으로 생성했다. production 배포,
release, observed-user validation 또는 3자 내부 검토 완료를 뜻하지 않는다.

## 배포한 소스 식별자

| 항목 | 값 |
| --- | --- |
| worktree | `D:\flowme2605\flow-text-authoring-ta` |
| branch | `codex/text-authoring-ta-implementation-20260729` |
| HEAD | `c09f859b30b854f6f897b8ec1eb781fd774fbeca` |
| source state | dirty worktree snapshot; HEAD와 동일한 배포가 아님 |
| local reviewed build ID | `Z0tyWh-SnVnefD-v8CRTs` |
| staging | 299 files, 5.77 MiB |
| staging manifest SHA-256 | `e5db5a35c89e89a8c687a80425a1f53bbb76fb04f18a097eb110d6c497d8ddfd` |
| staging/current runtime diff | `0` |
| Vercel upload | 2.3 MiB; 298 deployment files |

원본 checkout을 fallback script에 직접 넘기면 `.vercelignore`가 적용되지 않아
`.next`, 약 500 MiB의 docs, 디자인 ZIP과 QA 산출물까지 약 1.34 GiB가 포함된다.
이를 피하기 위해 별도 임시 staging에 다음만 복사했다.

- `app/`, `components/`, `lib/`, `public/`
- package/lockfile, Next/TypeScript/PostCSS/Tailwind/Vercel 설정
- build/runtime에서 참조하는 content seed JSON 1개
- `/api/content-flow-review`가 참조하는 review notes JSON/Markdown 2개

`.git`, `.next`, `node_modules`, 모든 `.env*`, 나머지 docs, tests, scripts,
Playwright/QA 산출물, 디자인·legacy 자료와 ZIP/HTML 덤프는 제외했다. staging에는
환경변수 파일이 없었다.

## 검증

### 배포 전 현재 worktree

| Check | Result |
| --- | --- |
| `npm.cmd run security:audit` | pass, vulnerabilities `0` |
| `npm.cmd run docs:check` | pass, 14 required files / 3,636 local links |
| `npm.cmd test` | pass, pretest `100 / 100` + unit `594 / 594` = `694 / 694` |
| `git diff --check` | pass; Windows LF/CRLF notices only |

Text Authoring의 focused `18 / 18`, rollback `2 / 2`, authoring `85 / 85`와
local build `18 / 18`은 같은 runtime snapshot의 기존 exact-build evidence다.

### Vercel

- Vercel CLI `58.4.0`, authenticated account `knhbae-3510`
- project `flowme/flowme2605`
- Node `24.x`, Next.js `15.5.21`
- remote `npm run build`: compile/type-check pass, static pages `18 / 18`
- deployment metadata: target `preview`, status `Ready`
- post-deployment documentation closeout: `docs:check` pass, 14 required files /
  3,644 local links

Vercel 배포 지침에 따라 Preview URL에 별도 `curl`/fetch smoke를 실행하지 않았다.
따라서 `READY`와 원격 build 성공은 배포 증거지만, `/flows/new`의 실제 원격
상호작용 결과는 아직 별도 관찰 기록이 없다.

## Production 불변

Preview 배포 뒤 canonical alias <https://flowme2605.vercel.app>는 기존 production
deployment `dpl_FZMaMy7ZvQCLRg1HhHLqMzVYGWXV`를 계속 가리켰고 상태는 `Ready`였다.
Preview에 `--prod`를 사용하지 않았으며 production alias를 이동하지 않았다.

## 알려진 별도 위험

`/api/content-flow-review` POST는 repository 파일 쓰기를 전제로 하므로 Vercel
serverless의 영속 저장 방식과 맞지 않는다. 이 route는 Text Authoring 핵심 여정
밖이며, 이번 Preview 성공은 그 POST의 영속성을 보증하지 않는다.

## Publish ledger

- local edits: present
- commit: not performed
- push: not performed
- PR: not opened
- merge: not performed
- Vercel Preview: deployed and `READY`
- Vercel Production: unchanged
- owner review: pending
- Claude Code review: pending
- observed-user validation: excluded and not claimed
