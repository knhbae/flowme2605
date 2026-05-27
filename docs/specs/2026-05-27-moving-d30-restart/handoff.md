# 이사 D-30 재시작 화면 인수인계

## 배포

- Vercel preview: https://flowme2605-nlsz6j8pq-flowme.vercel.app
- 확인할 화면: https://flowme2605-nlsz6j8pq-flowme.vercel.app/restart/moving-d30
- Vercel inspect: https://vercel.com/flowme/flowme2605/9DgTqBnUTmk6hp6P5MqkbmQa6jse
- 배포 명령: `npx vercel@latest deploy . -y`
- 배포 빌드 결과: Vercel `npm run build` 성공, `/restart/moving-d30` First Load JS 175 kB

## 현재 브랜치와 주요 커밋

- 브랜치: `design-ref-full-gap-alignment`
- `a1fbfb1 docs: add moving d30 restart spec`
- `0cffa40 feat: add moving d30 restart helpers`
- `1b4c662 feat: add moving d30 restart route`
- `210b9ec feat: add fullcalendar to moving restart`
- `c3ddf2d feat: edit moving restart items before export`
- `3aca9b3 feat: export and save moving restart flow`
- `4e7749b feat: polish moving restart calendar qa`

## 구현된 화면 범위

- 새 route: `/restart/moving-d30`
- 이사일 입력 후 D-30, D-10, D-1, D-Day, D+1 항목 생성
- FullCalendar 월간 캘린더 렌더링
- 캘린더 이벤트 클릭 및 일정 리스트에서 항목 편집
- 항목 날짜 이동, 제목/메모 수정, 삭제, 새 항목 추가
- 완료 체크
- `캘린더에 넣기`로 `.ics` 다운로드
- `체크리스트 복사`
- `엑셀 실행표`로 `.xlsx` 다운로드
- `내 Flow로 저장` 로그인/회원가입 gate
- 로그인 상태 데모 키: `localStorage['flow:auth:demo-user'] === 'true'`

## 원본 콘텐츠 기준

- AJD 이사 체크리스트 원문을 checklist source로 사용
- 정부24 전입신고 민원안내를 official source로 분리
- 화면 우측 `출처 분리` 카드에서 두 원문 링크를 직접 노출

## 검증 기록

- `npm run docs:check`: pass, 14 required files, 311 local links
- `npm test`: pass, 187 tests
- `npm run build`: pass
- `npm run test:e2e`: pass, 79 tests
- Playwright visual review:
  - desktop screenshot: `output/playwright/moving-d30-desktop.png`
  - mobile screenshot: `output/playwright/moving-d30-mobile.png`
  - desktop 1440px/mobile 390px 모두 horizontal overflow 없음

## 이어서 할 일

- 실제 서비스 auth/session이 준비되면 `localStorage` demo gate를 서버 저장 API로 교체한다.
- `내 Flow로 저장` 후 `/my`에서 이 restart flow를 실제 저장 목록으로 읽는 연결을 강화한다.
- FullCalendar 모바일 월간 grid는 현재 D-label 중심으로 줄였고, 다음 단계에서 day detail bottom sheet를 붙이면 더 자연스럽다.
- `npm install` 중 audit warning 7건(3 moderate, 4 high)이 있었으므로 별도 dependency 보안 점검이 필요하다.

## 주의할 작업공간 상태

- 이 작업에서 건드리지 않은 기존 dirty 파일:
  - `app/globals.css`
  - `components/flow/AppClient.tsx`
- 이 작업에서 건드리지 않은 기존 untracked 항목:
  - `design-ref/`
  - `docs/platform-analysis/`
  - `next_job.md`
- 위 항목들은 사용자 또는 이전 작업 맥락일 수 있으므로 후속 채팅에서도 임의로 되돌리지 않는다.
