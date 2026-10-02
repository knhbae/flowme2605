# 3107 합성 시험 서버 실행 안내

현재3107은 사용자의 활성화 설정 보완 후 검사에 사용했고, 신규35/35·엄격 회귀60/60 PASS를 확인했습니다. 다시 켜거나 추가 검사하실 필요는 없습니다. 아래 블록은 추후 시험 사본을 재시작할 때의 안내입니다. 기존 alpha·3105·3106·Tunnel은 그대로 둡니다. 실제 키·비밀번호는 넣지 않습니다. 앱 검사 드라이버는 Auth/API를 합성 handler로 차단하고 document/static GET만 이 서버로 보냅니다.

```powershell
Set-Location 'D:/flowme2605/flow-flow-execution-ux-20261001/output/playwright/feedback-ux-isolated-build-2026-10-02T00-24-11-146Z/workspace'
$env:FLOWME_ALPHA_ENABLED='development-only'
$env:FLOWME_ALPHA_STAGE='preview'
$env:FLOWME_ALPHA_HOSTING='cloudflare-laptop-v1'
$env:FLOWME_ALPHA_TUNNEL_ORIGIN='https://alpha.wikiplans.com'
$env:FLOWME_ALPHA_PROJECT_REF='wkmzcxpnojobxrgebapw'
$env:FLOWME_ALPHA_SUPABASE_URL='https://wkmzcxpnojobxrgebapw.supabase.co'
$env:FLOWME_ALPHA_PUBLISHABLE_KEY='sb_publishable_synthetic_release'
$env:FLOWME_ALPHA_REDIRECT_URL='https://alpha.wikiplans.com/auth/callback'
$env:FLOWME_ALPHA_M3_CAPACITY='on-demand-v1'
node D:/flowme2605/flow-flow-execution-ux-20261001/node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3107
```

이 서버는 현재 목표의 소유 사본입니다. source/copy hash1193개 일치, build ID `_9wLzKjgWgwPSNGIEkU4R`입니다. 계정 키를 복사하지 않았으며 실제 개발계 자산도 교체하지 않았습니다. 서비스 설치나 자동 시작 설정은 하지 않습니다. 검사 후 이 터미널에서 Ctrl+C로 종료할 수 있습니다.

`Ready` 아래의 실행 창은 검사 동안 열어 둡니다. `Local` 주소가 `http://127.0.0.1:3107`인지 확인합니다. 다른3105/3106 주소의 Ready는 이번 사본의 준비 증거가 아닙니다. 이 단계는 서버 실행만 부탁하는 것이며, 실제 화면 조작·계정/API 차단·판본 확인은 Codex가 수행합니다.

앱 검사는 누락 감사 후 신규35회와 기존60회, 총95회로 확장해 실행했습니다. 제품 build는 바뀌지 않았습니다. 기존60회는 `scripts/alpha/feedback-ux-regression.mjs`가 local/3107과 최종 사본 자산을 검증했습니다. 예정 수와 실제 결과는 [QA 기록](qa.md)에서 분리합니다.

사용자의 Ready 응답 후3107에서 정확한 빌드를 확인했으나, 최초 안내에 `FLOWME_ALPHA_ENABLED`가 빠져 앱이 ‘개발계 연결이 꺼져 있습니다’로 fail-closed했다. 이는 Codex 실행 안내 누락이며 사용자 실행 오류로 기록하지 않는다. 초기 로그인 전 timeout과 화면을 보존하고 검사를 중단했다. 사용자가 같은 PowerShell에 활성화 설정을 추가해 재시작한 뒤 정확 build·합성 로그인 전제를 확인하고 검사를 완료했다. 실제 키나 개발계 설정은 바꾸지 않았다.

도구의 실행 거절은 검증 실패와 다르며, 실행하지 않은 앱 시나리오를 PASS로 표시하지 않습니다.
