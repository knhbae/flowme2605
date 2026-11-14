# 짝 비교 입력 측정기 1판

기존 `D:/flowme-work/etc/perfkit-284`는 읽기만 하고, 이 폴더를 별도로 사용한다. 입력은 기존 284줄 합성 계정, 1280×800, 전체 보기, CPU 6배다. 조합·확정·할 일·Enter의 이벤트→두 번째 rAF, 120ms 간격은 유지한다. 제품 코드에 계측을 넣지 않는다.

새 기록은 세 가지다.

- 시작 시 합성 계정/원문 지문, textarea와 저장본 일치, 저장 표시의 quiet, worker 대기 0과 마지막 ACK 뒤 500ms를 확인한다.
- worker post/reply/cancel과 ACK 인계 시각을 기록한다. 기존 `flowme-writing:*` measure는 종류별 횟수·시간으로 집계하며 React 루트 commit은 카운터로 기록한다. 키마다 시작/끝 시각과 worker·commit 카운터를 남겨 겹친 구간을 나중에 구분한다. post→reply는 worker CPU 시간이 아니다. ACK 표식도 실제 서버 CPU나 네트워크 지연을 뜻하지 않는다.
- 미리 정한 첫 가열 회차를 빌드별 한 번씩 제외하고 보존한다. 이후 AB/BA 순서를 번갈아 유효한 3쌍을 모은다. 한쪽 CPU가 부적격이면 그 짝 전체가 무효다. 느린 유효 회차를 빼거나 다른 짝과 섞지 않는다.

먼저 같은 기준 빌드로 A/A 3쌍을 돈다. 각 단계 변화율의 절댓값이 5%를 넘으면 `HOLD_AA_UNSTABLE`이고 후보를 판정하지 않는다. A/A 값을 후보에서 빼거나 기준을 완화하지 않는다. 통과하면 기준/후보 3쌍을 잰다. 제품의 통과 기준은 기존 perfkit처럼 빌드별 블록 중앙값들의 중앙값과 기존 반올림 변화율 +5%다. 짝별 변화량은 진단용이며 이 기준을 대체하지 않는다. 유효 짝이 3개 미만, 시작 상태/최종 원문/Chrome 버전이 다르거나 오류·외부 요청이 있으면 HOLD다.

실행자는 `FLOWME_PERF_OWNER_ROOT`를 새 측정 작업 폴더로 명시한다. 그 폴더의 `PERF-PLAN.json`, `inputs/AA-READY.json`, `inputs/FINAL-QA-READY.json`에 기준/후보의 소스·BUILD·원문 fixture 지문과 전용 임시 폴더를 고정한다. 서버/브라우저 소유·메모리·디스크 점검을 수행하는 고정 preload가 필요하다. 실행기는 포트 3000/3104만 사용하며 브라우저는 한 번에 하나다.

```powershell
$env:FLOWME_PERF_OWNER_ROOT = 'D:/flowme-work/codex/refactor1-20261115-01a168e3'
& 'D:/flowme-node24221-runtime-20261024-01a10108/node-v24.22.1-win-x64/node.exe' `
  "$env:FLOWME_PERF_OWNER_ROOT/perf/kit/run.cjs" --mode aa `
  --plan "$env:FLOWME_PERF_OWNER_ROOT/PERF-PLAN-v2.json" --ready "$env:FLOWME_PERF_OWNER_ROOT/inputs/AA-READY-v2.json" `
  --out "$env:FLOWME_PERF_OWNER_ROOT/perf/runs/aa-v2"
# SUMMARY.json PASS를 확인한 뒤에만 다음을 실행한다.
& 'D:/flowme-node24221-runtime-20261024-01a10108/node-v24.22.1-win-x64/node.exe' `
  "$env:FLOWME_PERF_OWNER_ROOT/perf/kit/run.cjs" --mode compare `
  --plan "$env:FLOWME_PERF_OWNER_ROOT/PERF-PLAN-v2.json" --ready "$env:FLOWME_PERF_OWNER_ROOT/inputs/FINAL-QA-READY-v2.json" `
  --aa-summary "$env:FLOWME_PERF_OWNER_ROOT/perf/runs/aa-v2/SUMMARY.json" --out "$env:FLOWME_PERF_OWNER_ROOT/perf/runs/compare-v2"
```

출력 폴더는 한 번만 사용한다. 원본, 가열, CPU 무효 회차, stderr, 짝 목록을 덮어쓰지 않는다. 이번 프로토콜의 +5%와 A/A 유효성은 별개다. 기존 보고의 판정을 소급 변경하지 않는다. 새 프로토콜의 수치도 실제 기기·OS 한글 키보드 검증으로 올리지 않는다.
