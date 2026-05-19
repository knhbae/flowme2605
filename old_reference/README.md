# Flow/FlowMe Old Reference

이 폴더는 `old/`와 `claude_ver/files.zip`을 훑어 현재 프로젝트 재개에 필요한 내용만 압축한 참조본이다. 원본 전체를 다시 읽기보다 여기 문서를 먼저 기준으로 삼는다.

## 우선순위

1. `claude_ver/files.zip`의 2026-05-19 v3 문서가 최신 기획 기준이다.
2. `old/FlowMe260316`은 FlowMe라는 이름으로 진행된 Phase 1 기획/데이터 아키텍처/모바일 목업의 중요한 보조 기준이다.
3. `old/FlowMe251010web`과 `old/FlowMe251010web_clean`은 Next.js 웹 POC의 구현 패턴, 컴포넌트, 테스트, Subflow/Collection 개념을 참고한다.
4. Flutter/Firebase 앱 POC들은 현재 기술 방향이 바뀌었으므로 제품 개념과 도메인 모델 참고용으로만 본다.

## 문서 구성

- `product-strategy.md`: 현재 서비스 정의, MVP 범위, 로드맵, 성공 기준.
- `data-architecture.md`: 최신 Supabase 스키마와 과거 DAG/EventLog 설계에서 보존할 부분.
- `technical-stack.md`: 현재 권장 스택과 과거 POC 스택의 충돌 정리.
- `ux-and-poc-reference.md`: 목업, 화면 흐름, 디자인 토큰, Subflow/Collection 결정.
- `risks-and-open-questions.md`: 지금 먼저 검증해야 할 리스크와 미결 의사결정.
- `source-map.md`: 어떤 원본을 어떤 용도로 참고했는지.

## 핵심 결론

- 최신 방향은 "Flow": 경험 컨텐츠를 실행 가능한 체크리스트/일정으로 바꿔 사용자가 자기 도구에 복붙하거나 내보내는 플랫폼이다.
- 첫 카테고리는 최신 문서 기준 육아, 특히 백신 체크리스트 또는 이유식이다.
- Phase 0 검증이 아직 0회다. 새 개발보다 먼저 지인 부모 10명 대상 Concierge MVP를 실행해야 한다.
- Phase 1은 웹만 만든다. 모바일 앱, 커뮤니티, 토큰, Google OAuth 직접 연동, Notion 연동, AI 자동 구조화는 후순위다.
- 현재 개발 기준 스택은 Next.js + TypeScript + Tailwind + Supabase + Vercel이다. Firebase 기반 웹/앱 POC는 레거시 참고다.
