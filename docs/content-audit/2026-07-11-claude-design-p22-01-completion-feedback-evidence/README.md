# Claude Design P22-01 완료 후 회고 경계 Evidence

이 package는 완료된 My Flow에서 **개인 실행 회고**와 **원본에서 고칠 점을 적는 전송 전 메모**를 분리한 첫 slice를 검토하기 위한 자료입니다. 공개 리뷰, 별점, 댓글, 제작자 inbox, 자동 원본 수정은 포함하지 않습니다.

## 먼저 볼 파일

1. [review.html](./review.html) — 모바일·wide 화면 비교
2. [audit.md](./audit.md) — 제품 결정, 데이터 경계, 남은 위험
3. [route-evidence.json](./route-evidence.json) — 자동 판정 marker와 screenshot hash
4. [prompt-ko.md](./prompt-ko.md) — Claude Design 복붙용 검토 요청

## 구현 요약

- 완료되지 않은 Flow에는 후속 기록 영역이 나타나지 않습니다.
- 모든 실행 항목을 완료하면 `내 실행 회고`와 `원본 내용 알릴 점` 두 경로만 나타납니다.
- 내 회고는 도움 여부와 개인 메모를 별도 localStorage record에 저장합니다.
- 원본 관련 메모는 Flow 전체 또는 특정 할 일을 가리키며, 원 URL과 함께 **전송 전 초안**으로 저장합니다.
- 원본 메모는 실제로 전송되지 않으며 화면에도 이를 명시합니다.
- 회고 저장은 완료 체크, personal overlay, Calendar, export payload를 변경하지 않습니다.
- 전체 완료 뒤 첫 항목이 다시 `다음 할 일`로 보이던 fallback도 제거했습니다.

## 기준선

- 구현 commit: `8704bfaa149a04304c31dbe868a3708bef41472a`
- route: `/my`
- fixture: `moving-d30-basic`, 전체 24개 완료
- viewport: 390x844, 1024x900
- 캡처 재실행:

```powershell
$env:P22_CAPTURE_BASE_URL='http://127.0.0.1:3106'
npx.cmd tsx scripts/content-audit/capture-p22-01-completion-feedback.mts
```

## 검증 요약

- completion feedback E2E: pass
- 관련 My Flow/Calendar 완료 제어 E2E: pass
- URL-first/public share/workbench 회귀: 36개 시나리오 통과
- unit: 380 pass
- build: pass
- wide horizontal overflow: 0
- 공개 리뷰·별점·전송 완료 오해 문구: 0

## 의도적으로 남긴 경계

- 현재 기록은 한 브라우저 localStorage에만 남습니다.
- `원본 내용 알릴 점`은 전달 transport가 아니라 전송 전 메모입니다.
- 계정 동기화, 서버 제출, 제작자 inbox, 공개 review signal은 별도 제품·신뢰 결정 이후에만 열어야 합니다.

