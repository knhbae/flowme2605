# Claude Design P0~P2 final audit package

이 패키지는 FlowMe Claude Design UX/UI 개선 루프 P0~P2 구현 이후, Claude Design에게 GitHub 소스와 문서만으로 재검토를 요청하기 위한 자료다.

## 읽는 순서

1. [review.html](./review.html) - Claude에게 전달할 한 화면 리뷰 보드
2. [audit.md](./audit.md) - P0~P2 적용 요약, route별 감사, 남은 리스크
3. [route-evidence.json](./route-evidence.json) - 모바일 390px route sanity evidence
4. [screenshots](./screenshots/) - 주요 route 모바일 390px screenshot
5. [prompt-ko.md](./prompt-ko.md) - Claude Design 재검토 요청 프롬프트

## P3-01 저장 증거 재검증

- 결론: `06-my-empty-mobile.png`와 기존 `07-post-save-my-flow-mobile.png`가 같아 보였던 문제는 앱 저장 버그가 아니라 evidence 생성 오류였다.
- 현재 `07-post-save-my-flow-mobile.png`는 실제 저장 후 My Flow 첫 실행 항목을 보여준다.
- 현재 `08-calendar-after-save-mobile.png`는 실제 저장 후 가장 가까운 일정 agenda를 보여준다.
- 재생성 스크립트: [`scripts/content-audit/capture-claude-p0-p2-final-evidence.mjs`](../../../scripts/content-audit/capture-claude-p0-p2-final-evidence.mjs)

```powershell
npm.cmd run build
# 별도 터미널에서 실행한 채 유지
npm.cmd run start -- -p 3104
# 다른 터미널에서 실행
node scripts\content-audit\capture-claude-p0-p2-final-evidence.mjs
```

## 관련 기준 문서

- [Claude Design 실행 백로그](../2026-07-03-claude-design-action-backlog-ko.md)
- [Claude Design 실행 백로그 HTML](../2026-07-03-claude-design-action-backlog-ko.html)
- [기존 Claude Design review MD](https://github.com/knhbae/flowme2605/blob/main/claude-design-review-2026-07-03.md)
- [기존 Claude Design review HTML](https://github.com/knhbae/flowme2605/blob/main/claude-design-review-2026-07-03.html)

## 주요 소스

- [AppClient.tsx](../../../components/flow/AppClient.tsx)
- [PlatformNav.tsx](../../../components/flow/PlatformNav.tsx)
- [ArtifactWorkbench.tsx](../../../components/flow/ArtifactWorkbench.tsx)
- [globals.css](../../../app/globals.css)
- [flow-mvp.spec.ts](../../../tests/e2e/flow-mvp.spec.ts)

## Claude에게 확인받을 질문

- P0~P2 이후 FlowMe가 설명형 화면보다 실행형 앱으로 보이는가?
- `/flows`, `/flow-maps/[map]`, `/f/[slug]`, `/my`, `/calendar`의 첫 화면 정보량이 상용 서비스 수준으로 충분히 낮아졌는가?
- My Flow와 Calendar에서 저장 후 다음 행동이 충분히 먼저 보이는가?
- 남은 리스크를 다음 루프에서 Blocking/High/Medium/Low 중 어디에 둘지 판단해 달라.
