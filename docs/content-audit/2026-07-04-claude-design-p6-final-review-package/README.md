# Claude Design P6 final review package

FlowMe P6-01~P6-08 개선 루프를 최신 모바일 390px 화면으로 다시 감사하기 위한 GitHub 기반 리뷰 패키지입니다. 새 기능을 추가하지 않고 현재 화면 기준선과 시나리오별 screenshot evidence를 정리했습니다.

## 읽는 순서

1. [review.html](./review.html) - route/scenario screenshot 보드
2. [audit.md](./audit.md) - P6-01~P6-08 기준선 감사 결과
3. [route-evidence.json](./route-evidence.json) - 390px DOM/문구/overflow/fixed-layer evidence
4. [prompt-ko.md](./prompt-ko.md) - Claude Design 재검토 복붙용 프롬프트
5. [screenshots](./screenshots/) - 최신 모바일 390px screenshot 50장

## 생성 기준

- Branch: `codex/flowme-uxui-second-loop`
- Commit: `05a951a`
- Viewport: 390 x 844
- Base URL: `http://127.0.0.1:3220`
- Generated at: 2026-07-04T11:47:31.092Z
- Script: [capture-claude-p6-final-review-package.mjs](../../../scripts/content-audit/capture-claude-p6-final-review-package.mjs)

## GitHub 링크

- [README](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p6-final-review-package/README.md)
- [review.html](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p6-final-review-package/review.html)
- [audit.md](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p6-final-review-package/audit.md)
- [route-evidence.json](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p6-final-review-package/route-evidence.json)
- [prompt-ko.md](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p6-final-review-package/prompt-ko.md)
- [screenshots](https://github.com/knhbae/flowme2605/blob/codex/flowme-uxui-second-loop/flow-mvp/docs/content-audit/2026-07-04-claude-design-p6-final-review-package/screenshots)

## 재생성 명령

```powershell
npm.cmd run build
node scripts\content-audit\capture-claude-p6-final-review-package.mjs
```
