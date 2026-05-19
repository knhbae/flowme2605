# Technical Stack Reference

## 현재 권장 스택

최신 기획 기준:

- Frontend: Next.js + TypeScript + Tailwind
- Deployment: Vercel
- Backend/DB: Supabase PostgreSQL
- Auth: Supabase Auth, 한국 사용자 대상이면 Kakao/Google OAuth 검토
- AI: Claude API
- Scraping: Jina AI Reader -> Claude API
- Google APIs: Calendar/Sheets API만 GCP에서 사용

## 채택 이유

- Next.js는 웹 우선 MVP와 Vercel 배포에 가장 빠르다.
- Supabase는 SQL, Auth, API, Storage를 한 번에 제공하고 MVP 무료 플랜으로 충분하다.
- Firebase는 과거 POC에서 사용했지만, 관계형 데이터와 버저닝/집계에는 Supabase/PostgreSQL이 더 적합하다.
- GCP 전체 인프라는 복잡도와 비용 리스크가 크므로 Calendar/Sheets API에만 제한한다.
- Claude API는 한국어 구조화에 유리하되 URL 직접 읽기가 안 되므로 Jina Reader 같은 추출 계층이 필요하다.

## 레거시 POC 스택

### `old/FlowMe251010web`

- Next.js 14 App Router
- TypeScript
- Tailwind, Radix/shadcn 계열 컴포넌트
- Zustand
- Firebase
- Jest, Testing Library
- Framer Motion, Lucide React

구현 산출물:

- Flow Detail
- Studio Edit
- Run Page
- Explore
- Follow/Run/Fork/Share 로컬 상태
- Subflow 실행 컨텍스트와 UX 비교 데모

### `old/FlowMe251010web_clean`

웹 POC의 정리 버전이다. 디자인 문서, 컴포넌트 구조, 로컬 JSON API, 자동 저장, 드래그 앤 드롭, 테스트 구조 참고에 유용하다.

### `old/FlowMe251004/flow_mvp`, `old/FlowMeApp/flowme_app`

Flutter/Firebase 앱 POC다.

- Flutter
- Riverpod
- GoRouter
- Firebase Auth/Firestore/Storage/Messaging
- Freezed/json_serializable
- Local notifications, shared_preferences

현재 웹 우선 방향과 맞지 않으므로 직접 이어받기보다 도메인 모델, 실행 화면, 알림/캘린더 아이디어 참고용으로 본다.

## 초기 프로젝트 생성 가이드

새로 시작한다면:

```bash
npx create-next-app@latest flow-mvp --typescript --tailwind --app
```

초기 구현 순서:

1. 공개 플랜 상세 페이지.
2. 제작자 체크리스트 입력/편집.
3. Supabase `plans/items` 저장.
4. 사용자 anchor date 입력.
5. 클립보드 복사와 CSV 다운로드.
6. 전환율 이벤트 로깅.

## 환경 변수 후보

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Google API 관련 값은 Phase 2 전까지 없어도 된다.

## 테스트 기준

웹 POC는 Jest/Testing Library 중심이었다. 새 프로젝트에서도 최소한 아래는 테스트한다.

- 날짜 계산: `anchor_date + day_offset`.
- `structure_type`별 날짜/표시 변환.
- Immutable versioning에서 기존 사용자 체크가 깨지지 않는지.
- CSV/클립보드 내보내기 포맷.
- 공개 상세 -> 날짜 입력 -> 내보내기 핵심 전환 플로우.

의존성 기반 실행 앱으로 확장하면 추가로 테스트한다.

- `shift_item` 연쇄 조정.
- 의존성 순환 감지.
- "오늘 할 수 있는 것" 계산.
