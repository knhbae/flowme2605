# FlowMe 현재 상태

## 한 문장

FlowMe는 URL·메모·공개 Flow를 개인 실행 항목으로 저장하고, 자기 상황에 맞게 수정한 뒤 My Flow와 Calendar에서 실행하고 portable export로 가져갈 수 있는 local MVP까지 연결됐다.

## P23까지 완료한 범위

### 발견과 저장

- 홈에서 URL·메모 기반 Flow 찾기 진입
- URL-first hit, custom-start, miss, candidate, resolved candidate
- miss에서 개인 draft 생성과 My Flow 착지
- public `/f/[slug]`의 Flow 단위 저장과 저장 전 preview 경계

### 개인 수정

- 제목 alias, 기준일, 항목 날짜, 사용자 메모
- 개인 draft 항목 추가, tombstone 삭제, 즉시 undo, 지속 복구
- source/user 혼합 순서 변경과 stable personal item ID
- 날짜 없음, 날짜 지정, 날짜 제거
- 종일, 시간 지정, duration, 기기 timezone 또는 floating local
- daily/weekly/monthly 반복 series와 occurrence 분리

### 실행과 회복

- 완료와 완료 취소
- occurrence별 pending, done, reopened, skipped, held 구분
- 구조 삭제·제외와 회차 skip의 의미 분리
- 과거 run 상세, 회고, portable export, 새 run으로 다시 쓰기

### projection

- My Flow, Calendar, ICS, checklist, sheet, memo가 개인 draft의 같은 effective state를 읽음
- 날짜 없는 항목은 list export에 남고 Calendar/ICS에서는 제외
- tombstoned·excluded 항목은 현재 projection에서 제외하되 source와 과거 run은 보존
- title/date/time/memo override와 personal order 반영
- Calendar event identity와 ICS UID는 mutable order/date가 아닌 stable identity를 사용

### source-backed 보강

- 날짜 없는 대표 source-backed checklist 항목의 개인 날짜 지정·변경·제거
- direct saved Flow Map의 기준일·이사일 재설정
- anchor 변경 시 상대 일정 재계산, 개별 date override 유지

## 현재 검증 결과

| 항목 | 결과 | 증거 등급 |
| --- | --- | --- |
| unit test | 476/476 pass | current command at P23 closure |
| docs check | 14 required files, 2,166 local links pass | current command at P23 closure |
| production build | pass, 18 pages | current command and Vercel preview |
| route regression | 63 pass | current command at P23 closure |
| P23 lifecycle journeys | 8 pass | current command at P23 closure |
| history/reuse journeys | 3 pass | current command at P23 closure |
| source parity journeys | 2 pass | current command at P23 closure |
| screenshot | 55 | current repo |
| base capture overflow/error | 0/0 | current repo |
| full Playwright suite | 실행하지 않음 | explicit gap |
| formal observed users | 0명 | explicit gap |

## Vercel

- Preview URL: <https://flowme2605-13grv45zl-flowme.vercel.app>
- Inspector: <https://vercel.com/flowme/flowme2605/3hhwff4iQFJrubYD7T4ivQjUXjUL>
- Deployment ID: `dpl_3hhwff4iQFJrubYD7T4ivQjUXjUL`
- Source: clean detached worktree at `c14c262`
- Ready state: `READY`
- Target: preview, production promotion 아님
- Remote build: Next.js 15.3.8, compile/type check/static generation 18 pages pass

## 아직 완료되지 않은 것

### Blocking for production

1. 계정·DB·다른 기기 복원과 localStorage migration
2. 설명 없이 사용하는 실제 사용자 관찰
3. source v2와 personal overlay의 three-way merge·orphan 정책

### High

1. source-backed Flow의 add/delete/reorder parity
2. source-backed 반복 Flow의 occurrence skip/hold parity
3. 모바일 일부 수정 경로의 3~4 tap depth
4. Calendar-heavy와 history-heavy 화면의 실제 기기 밀도 검증

### 운영·기술 위험

- 현재 데이터는 브라우저 localStorage 중심이다.
- full Playwright suite 전체 실행은 P23 마감에서 생략했다.
- `postcss <8.5.10` 관련 moderate advisory 2건이 Next 의존 경로에 남아 있다.
- `npm audit fix --force`는 breaking downgrade 가능성이 있어 사용하지 않는다.
- 기존 worktree에는 이번 package와 무관한 modified/untracked 파일이 많이 남아 있다.

## Dirty worktree 경계

기존 변경에는 repo 운영 문서, skills, CI, package 파일, 별도 content audit, Claude ZIP 등이 섞여 있다. 이 package는 그 변경을 정리·merge한 것으로 간주하지 않는다. 후속 구현 전에 별도 worktree cleanup lane에서 기능별 분류와 커밋 여부를 결정해야 한다.

또한 현재 `docs/STATUS.md`의 primary focus와 next-up 일부는 여전히 P23-00 착수 전 문구다. 최신 판정은 P23 closure review와 이 package를 우선한다. canonical planning docs 갱신은 해당 파일의 기존 미커밋 변경을 먼저 분류한 뒤 별도 커밋으로 처리해야 한다.
