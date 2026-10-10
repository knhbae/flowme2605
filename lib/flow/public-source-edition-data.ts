import type { ReviewedPublicSourceEdition } from './public-source-editions';

// Exact source comparisons: 9f6c05b5ab1fd78438982e4b7a97db97e2479070a9ab2a5158253c1c4ee369ca; add72c79e561176c66ddbdbf6de367de764017c9104920f8159ed310757cbe32.
// Only qualified NEW intake. Historical seed and existing personal plans are unchanged.
export const publishedSourceEditions: readonly ReviewedPublicSourceEdition[] = [
  {
    "version": "flowme-reviewed-source-v1:morning-skincare-routine:313eaf59a1c1a398aba4d0e5d825c9af205b090cf3c3a775362d5883ecfb0596",
    "sourceFlowId": "creator-260601-morning-skincare-routine",
    "sourceSlug": "morning-skincare-routine",
    "bundleSha256": "313eaf59a1c1a398aba4d0e5d825c9af205b090cf3c3a775362d5883ecfb0596",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "creator-260601-morning-skincare-routine",
        "slug": "morning-skincare-routine",
        "title": "아침 스킨케어 루틴 Flow",
        "description": "늘투엔티스 가이드의 아침 세안·보습·자외선 차단 순서를 참고합니다. 피부 상태와 제품 표시를 우선합니다.",
        "category": "뷰티/스킨케어",
        "structure_type": "routine",
        "anchor_type": "start_date",
        "status": "published",
        "risk_level": "medium",
        "primary_destination": "calendar",
        "source_title": "늘투엔티스 – 스킨케어 순서 완벽 가이드: 5단계로 완성하는 아침·저녁 피부 관리 루틴",
        "source_url": "https://neultwenties.kr/%EC%8A%A4%ED%82%A8%EC%BC%80%EC%96%B4-%EC%88%9C%EC%84%9C-5%EB%8B%A8%EA%B3%84-%EC%99%84%EB%B2%BD%EA%B0%80%EC%9D%B4%EB%93%9C/",
        "source_checked_at": "2026-10-10",
        "conversion_note": "상업 브랜드의 일반 가이드이므로 제품 효능이나 피부 타입 판정은 승인 근거로 쓰지 않고, 표시된 아침 사용 순서만 검토 대상으로 남겼습니다.",
        "warning": "제품 사용 후 자극이나 증상이 생기면 중단하고 피부과 전문의 또는 제품 안내를 확인하세요.",
        "tags": [
          "스킨케어",
          "뷰티",
          "루틴",
          "reference"
        ],
        "content_type": "default",
        "source_status": "needs_review",
        "source_precision": "exact",
        "created_at": "2026-06-01T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 아침 스킨케어 루틴 Flow\n\n## 아침 스킨케어 순서\n- 미온수로 가볍게 세안하기\n  why: 원문은 아침에 가벼운 세안부터 시작하도록 제안합니다.\n  how: 미온수로 가볍게 세안하고 부드럽게 물기를 닦습니다. 제품 사용 안내를 따릅니다.\n  done: 세안을 완료했다.\n  link: 늘투엔티스 스킨케어 5단계 가이드 | https://neultwenties.kr/%EC%8A%A4%ED%82%A8%EC%BC%80%EC%96%B4-%EC%88%9C%EC%84%9C-5%EB%8B%A8%EA%B3%84-%EC%99%84%EB%B2%BD%EA%B0%80%EC%9D%B4%EB%93%9C/ | reference\n- 토너를 화장솜이나 손으로 두드려 흡수시키기\n  how: 제품 안내에 따라 토너를 손바닥으로 가볍게 두드리거나 화장솜으로 부드럽게 사용합니다.\n  done: 수분 케어를 했다.\n- 수분 에센스 또는 앰플 얇게 바르기\n  why: 원문의 토너·에센스/세럼/앰플·크림 순서를 참고하되 제품 표시를 우선합니다.\n  done: 에센스를 발랐다.\n- 보습 크림 얇게 바르기\n  why: 원문은 아침에 산뜻한 질감의 수분크림을 제안합니다.\n  done: 보습 크림을 발랐다.\n- 자외선 차단제(SPF30 이상) 바르기\n  why: 원문 아침 순서의 마지막은 자외선 차단제입니다. 사용량과 덧바름은 제품 표시를 따릅니다.\n  done: 자외선 차단제를 발랐다.\n  caution: 자외선 차단제의 사용량과 덧바름은 제품 표시를 따릅니다.",
        "owner_user_id": "user-flow-curation",
        "creator_name": "FLOW 큐레이션팀",
        "creator_role": "경험 콘텐츠 큐레이터",
        "creator_note": "반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.",
        "usage_count": 3408,
        "copy_count": 828
      },
      "sections": [
        {
          "id": "creator-260601-morning-skincare-routine-section-0",
          "flow_id": "creator-260601-morning-skincare-routine",
          "title": "아침 스킨케어 순서",
          "order": 0
        }
      ],
      "items": [
        {
          "id": "creator-260601-morning-skincare-routine-item-0",
          "flow_id": "creator-260601-morning-skincare-routine",
          "section_id": "creator-260601-morning-skincare-routine-section-0",
          "title": "미온수로 가볍게 세안하기",
          "type": "todo",
          "source_type": "reference",
          "order": 0
        },
        {
          "id": "creator-260601-morning-skincare-routine-item-1",
          "flow_id": "creator-260601-morning-skincare-routine",
          "section_id": "creator-260601-morning-skincare-routine-section-0",
          "title": "토너를 화장솜이나 손으로 두드려 흡수시키기",
          "type": "todo",
          "source_type": "reference",
          "order": 1
        },
        {
          "id": "creator-260601-morning-skincare-routine-item-2",
          "flow_id": "creator-260601-morning-skincare-routine",
          "section_id": "creator-260601-morning-skincare-routine-section-0",
          "title": "수분 에센스 또는 앰플 얇게 바르기",
          "type": "todo",
          "source_type": "reference",
          "order": 2
        },
        {
          "id": "creator-260601-morning-skincare-routine-item-3",
          "flow_id": "creator-260601-morning-skincare-routine",
          "section_id": "creator-260601-morning-skincare-routine-section-0",
          "title": "보습 크림 얇게 바르기",
          "type": "todo",
          "source_type": "reference",
          "order": 3
        },
        {
          "id": "creator-260601-morning-skincare-routine-item-4",
          "flow_id": "creator-260601-morning-skincare-routine",
          "section_id": "creator-260601-morning-skincare-routine-section-0",
          "title": "자외선 차단제(SPF30 이상) 바르기",
          "type": "todo",
          "source_type": "reference",
          "order": 4
        }
      ],
      "itemDetails": [
        {
          "item_id": "creator-260601-morning-skincare-routine-item-0",
          "why": "원문은 아침에 가벼운 세안부터 시작하도록 제안합니다.",
          "how": "미온수로 가볍게 세안하고 부드럽게 물기를 닦습니다. 제품 사용 안내를 따릅니다.",
          "completion_criteria": "세안을 완료했다.",
          "links": [
            {
              "label": "늘투엔티스 스킨케어 5단계 가이드",
              "url": "https://neultwenties.kr/%EC%8A%A4%ED%82%A8%EC%BC%80%EC%96%B4-%EC%88%9C%EC%84%9C-5%EB%8B%A8%EA%B3%84-%EC%99%84%EB%B2%BD%EA%B0%80%EC%9D%B4%EB%93%9C/",
              "type": "reference"
            }
          ]
        },
        {
          "item_id": "creator-260601-morning-skincare-routine-item-1",
          "how": "제품 안내에 따라 토너를 손바닥으로 가볍게 두드리거나 화장솜으로 부드럽게 사용합니다.",
          "completion_criteria": "수분 케어를 했다."
        },
        {
          "item_id": "creator-260601-morning-skincare-routine-item-2",
          "why": "원문의 토너·에센스/세럼/앰플·크림 순서를 참고하되 제품 표시를 우선합니다.",
          "completion_criteria": "에센스를 발랐다."
        },
        {
          "item_id": "creator-260601-morning-skincare-routine-item-3",
          "why": "원문은 아침에 산뜻한 질감의 수분크림을 제안합니다.",
          "completion_criteria": "보습 크림을 발랐다."
        },
        {
          "item_id": "creator-260601-morning-skincare-routine-item-4",
          "why": "원문 아침 순서의 마지막은 자외선 차단제입니다. 사용량과 덧바름은 제품 표시를 따릅니다.",
          "completion_criteria": "자외선 차단제를 발랐다.",
          "caution": "자외선 차단제의 사용량과 덧바름은 제품 표시를 따릅니다."
        }
      ],
      "warnings": [],
      "repeatRules": []
    }
  },
  {
    "version": "flowme-reviewed-source-v1:first-passport-issue:302e4dcf9b3959d4d280a3b00bbae6a916512b6ff86aba6ac237c07be9bf8ed7",
    "sourceFlowId": "official-260601-first-passport",
    "sourceSlug": "first-passport-issue",
    "bundleSha256": "302e4dcf9b3959d4d280a3b00bbae6a916512b6ff86aba6ac237c07be9bf8ed7",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "official-260601-first-passport",
        "slug": "first-passport-issue",
        "title": "여권 신규 발급 준비 Flow",
        "description": "외교부 여권 안내 기준으로 사진 규격, 신청 서류, 수수료, 수령을 준비합니다.",
        "category": "여행/여권",
        "structure_type": "checklist",
        "anchor_type": "none",
        "status": "published",
        "source_status": "real",
        "source_precision": "exact",
        "risk_level": "medium",
        "primary_destination": "memo",
        "source_title": "외교부 여권안내 – 여권 최초 발급 기본사항 안내",
        "source_url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=2",
        "source_checked_at": "2026-10-10",
        "conversion_note": "최초 발급 기본사항, 여권 사진, 국내 접수기관, 수수료의 현재 공식 페이지를 분리해 사진·서류→접수처→신청·수령 순서로 정리했습니다.",
        "warning": "사진 규격, 미성년자·대리 신청, 수수료, 처리 기간은 공식 기준을 따릅니다. 외교부 여권안내로 확인하세요.",
        "content_type": "default",
        "created_at": "2026-06-01T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 여권 신규 발급 준비 Flow\n\n## 1. 사진·서류\n- 여권 사진 규격 확인하고 촬영하기\n  why: 규격에 맞지 않거나 편집된 사진은 접수가 지연되거나 반려될 수 있습니다.\n  how: 최초 발급용 인화 사진은 가로 3.5cm×세로 4.5cm, 신청일 전 6개월 이내 촬영본을 준비합니다. 사진 편집·필터·AI 가공은 사용하지 않습니다.\n  done: 규격에 맞는 사진을 준비했다.\n  link: 외교부 여권 사진 안내 | https://www.passport.go.kr/home/kor/contents.do?menuPos=32 | official\n- 신분증 등 필요 서류 확인하기\n  how: 최초 발급 기본사항에서 공통 구비 서류를 확인하고, 성인·미성년자·병역의무자 중 본인에게 맞는 안내를 다시 봅니다.\n  done: 본인 상황에 필요한 서류와 추가 조건을 확인했다.\n  caution: 미성년자·대리 신청은 추가 서류가 필요합니다.\n  link: 외교부 여권 최초 발급 안내 | https://www.passport.go.kr/home/kor/contents.do?menuPos=2 | official\n\n## 2. 신청·수령\n- 가까운 여권 접수기관 확인하고 방문 신청하기\n  how: 외교부 국내 대행기관 목록에서 주소와 야간민원실 운영 여부를 확인하고, 업무시간은 해당 기관에 직접 확인한 뒤 방문해 신청합니다.\n  done: 접수기관에 방문해 여권 신청을 접수했다.\n  caution: 처리 기간은 신청 방식·시기에 따라 다릅니다(성수기에는 더 길어질 수 있음). 출국일에 충분히 여유를 두고 신청하고, 정확한 처리 기간은 접수처에서 확인하세요.\n  link: 외교부 국내 여권 접수기관 | https://www.passport.go.kr/home/kor/substitutional/index.do?menuPos=28 | official\n- 수수료·처리 기간·수령 방법 확인하기\n  done: 수수료·처리 기간·수령 방법의 공식 안내를 확인했다.\n  link: 외교부 여권안내 수수료 안내 | https://www.passport.go.kr/home/kor/contents.do?menuPos=41 | official\n  link: 외교부 여권 개별 우편배송 안내 | https://www.passport.go.kr/home/kor/contents.do?menuPos=45 | official\n  link: 외교부 여권 진행 상황 알림 | https://www.passport.go.kr/home/kor/contents.do?menuPos=49 | official",
        "owner_user_id": "user-flow-curation",
        "creator_name": "FLOW 큐레이션팀",
        "creator_role": "경험 콘텐츠 큐레이터",
        "creator_note": "반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.",
        "usage_count": 2928,
        "copy_count": 708,
        "tags": [
          "체크리스트",
          "블로그 따라하기",
          "여행"
        ]
      },
      "sections": [
        {
          "id": "official-260601-first-passport-section-0",
          "flow_id": "official-260601-first-passport",
          "title": "1. 사진·서류",
          "order": 0
        },
        {
          "id": "official-260601-first-passport-section-1",
          "flow_id": "official-260601-first-passport",
          "title": "2. 신청·수령",
          "order": 1
        }
      ],
      "items": [
        {
          "id": "official-260601-first-passport-item-0",
          "flow_id": "official-260601-first-passport",
          "section_id": "official-260601-first-passport-section-0",
          "title": "여권 사진 규격 확인하고 촬영하기",
          "type": "todo",
          "source_type": "official",
          "order": 0
        },
        {
          "id": "official-260601-first-passport-item-1",
          "flow_id": "official-260601-first-passport",
          "section_id": "official-260601-first-passport-section-0",
          "title": "신분증 등 필요 서류 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 1
        },
        {
          "id": "official-260601-first-passport-item-2",
          "flow_id": "official-260601-first-passport",
          "section_id": "official-260601-first-passport-section-1",
          "title": "가까운 여권 접수기관 확인하고 방문 신청하기",
          "type": "todo",
          "source_type": "official",
          "order": 2
        },
        {
          "id": "official-260601-first-passport-item-3",
          "flow_id": "official-260601-first-passport",
          "section_id": "official-260601-first-passport-section-1",
          "title": "수수료·처리 기간·수령 방법 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 3
        }
      ],
      "itemDetails": [
        {
          "item_id": "official-260601-first-passport-item-0",
          "why": "규격에 맞지 않거나 편집된 사진은 접수가 지연되거나 반려될 수 있습니다.",
          "how": "최초 발급용 인화 사진은 가로 3.5cm×세로 4.5cm, 신청일 전 6개월 이내 촬영본을 준비합니다. 사진 편집·필터·AI 가공은 사용하지 않습니다.",
          "completion_criteria": "규격에 맞는 사진을 준비했다.",
          "links": [
            {
              "label": "외교부 여권 사진 안내",
              "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=32",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "official-260601-first-passport-item-1",
          "how": "최초 발급 기본사항에서 공통 구비 서류를 확인하고, 성인·미성년자·병역의무자 중 본인에게 맞는 안내를 다시 봅니다.",
          "completion_criteria": "본인 상황에 필요한 서류와 추가 조건을 확인했다.",
          "links": [
            {
              "label": "외교부 여권 최초 발급 안내",
              "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=2",
              "type": "official"
            }
          ],
          "caution": "미성년자·대리 신청은 추가 서류가 필요합니다."
        },
        {
          "item_id": "official-260601-first-passport-item-2",
          "how": "외교부 국내 대행기관 목록에서 주소와 야간민원실 운영 여부를 확인하고, 업무시간은 해당 기관에 직접 확인한 뒤 방문해 신청합니다.",
          "completion_criteria": "접수기관에 방문해 여권 신청을 접수했다.",
          "links": [
            {
              "label": "외교부 국내 여권 접수기관",
              "url": "https://www.passport.go.kr/home/kor/substitutional/index.do?menuPos=28",
              "type": "official"
            }
          ],
          "caution": "처리 기간은 신청 방식·시기에 따라 다릅니다(성수기에는 더 길어질 수 있음). 출국일에 충분히 여유를 두고 신청하고, 정확한 처리 기간은 접수처에서 확인하세요."
        },
        {
          "item_id": "official-260601-first-passport-item-3",
          "links": [
            {
              "label": "외교부 여권안내 수수료 안내",
              "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=41",
              "type": "official"
            },
            {
              "label": "외교부 여권 개별 우편배송 안내",
              "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=45",
              "type": "official"
            },
            {
              "label": "외교부 여권 진행 상황 알림",
              "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=49",
              "type": "official"
            }
          ],
          "completion_criteria": "수수료·처리 기간·수령 방법의 공식 안내를 확인했다."
        }
      ],
      "warnings": [],
      "repeatRules": []
    }
  },
  {
    "version": "flowme-reviewed-source-v1:lease-contract-report-deadline:3487f75c1163f489fca9bf3089fd7d89f604d2deba6b60857669934596ad3020",
    "sourceFlowId": "flow-lease-contract-report-deadline",
    "sourceSlug": "lease-contract-report-deadline",
    "bundleSha256": "3487f75c1163f489fca9bf3089fd7d89f604d2deba6b60857669934596ad3020",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "flow-lease-contract-report-deadline",
        "slug": "lease-contract-report-deadline",
        "title": "주택 임대차계약 신고 마감 Flow",
        "description": "계약 체결일 기준 30일 이내 신고 의무와 개인 준비 날짜를 구분합니다. 신고 준비·작성·전자서명, 접수·처리 상태와 신고필증을 확인합니다.",
        "category": "주거/행정",
        "structure_type": "timeline",
        "content_type": "default",
        "anchor_type": "start_date",
        "status": "published",
        "risk_level": "financial_sensitive",
        "source_title": "부동산거래관리시스템 주택임대차신고 서비스 안내",
        "source_url": "https://rtms.molit.go.kr/main/serviceInfo.do",
        "source_status": "needs_review",
        "source_precision": "exact",
        "source_checked_at": "2026-10-10",
        "conversion_note": "RTMS/정부24/정책브리핑의 공식 안내에서 계약 체결일 30일 이내 신고, 보증금·월세 신고대상 기준, 방문/온라인 신고, 계약서 첨부 시 단독신고 가능, 접수·처리 상태 확인, 신고필증/확정일자 확인 단서만 실행 일정으로 변환했습니다. 개인 블로그는 화면 순서 참고로만 두고, 주민등록번호·인증값·계약 상세 금액은 FLOW 입력 필드로 만들지 않습니다.",
        "primary_destination": "hybrid",
        "setup_anchor_label": "계약일",
        "setup_anchor_hint": "공식 신고기한과 개인 준비 날짜를 구분합니다. 준비·작성·접수·처리 결과 조회를 임의 간격으로 자동 배치하지 않습니다.",
        "warning": "신고 대상 여부, 과태료, 법적 효력, 확정일자 효력은 최신 RTMS·정부24·관할 주민센터 안내를 확인하세요. FLOW는 마감과 준비 체크만 돕습니다.",
        "owner_user_id": "user-admin-note",
        "creator_name": "생활 행정 노트",
        "creator_role": "생활 행정 큐레이터",
        "creator_note": "공식 행정 마감 콘텐츠가 개인정보 저장 없이 캘린더와 준비 체크로 작동하는지 확인하는 다양화 public 후보입니다.",
        "usage_count": 1240,
        "copy_count": 176,
        "tags": [
          "주거",
          "임대차",
          "신고",
          "행정 마감",
          "다양화 후보"
        ],
        "created_at": "2026-05-20T00:00:00.000Z",
        "updated_at": "2026-05-20T00:00:00.000Z",
        "raw_text": "# 주택 임대차계약 신고 마감 Flow\n\n## 대상 확인\n- 신고 대상과 30일 마감 확인하기\n  description: 계약일, 주택 소재지, 보증금·월세 기준을 공식 안내에서 확인하고 30일 마감일을 캘린더에 둡니다.\n  why: RTMS는 임대인과 임차인이 계약 체결일로부터 30일 이내 공동신고하는 구조를 안내하며, 신고대상 기준도 지역과 금액에 따라 달라집니다.\n  how: RTMS 서비스 안내에서 신고대상 기준과 신고지역을 확인합니다. FLOW에는 대상 여부 확정값보다 “공식 확인 완료”와 마감일만 남깁니다.\n  done: 공식 안내에서 신고 대상 여부를 확인했고 계약일 기준 30일 마감일이 정해졌습니다.\n  caution: 신고 대상 여부와 과태료는 FLOW가 판단하지 않습니다. 최신 공식 안내와 관할 기관 확인을 우선합니다.\n  link: RTMS 주택임대차신고 서비스 안내 | https://rtms.molit.go.kr/main/serviceInfo.do | official\n  link: 정책브리핑 주택 임대차 신고제 Q&A | https://www.korea.kr/news/policyNewsView.do?newsId=148888119 | official\n\n## 신고 준비\n- 계약서와 인증수단 준비하기\n  description: 계약서 원본/스캔본, 본인 확인 수단, 대리 신고 여부를 준비합니다.\n  why: 공식 안내는 계약서 또는 계약 입증서류가 있으면 신고할 수 있고, 계약서를 제출하면 확정일자 자동부여와 연결된다고 설명합니다.\n  how: 계약서 파일 위치와 인증수단 보유 여부만 체크합니다. 주민등록번호, 인증번호, 계약 상세 금액은 FLOW 메모에 적지 않습니다.\n  done: 계약서 파일 위치와 필요한 인증수단이 준비됐습니다.\n  caution: 개인 식별정보, 인증값, 계약서 원문은 FLOW에 저장하지 않습니다.\n  link: 정부24 주택 임대차신고 민원안내 | https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=16130000132&HighCtgCD=A01010 | official\n  link: 주택임대차계약신고 블로그 절차 참고 | https://blog.naver.com/PostView.naver?blogId=havelaw&logNo=222863332365 | creator\n  link: RTMS 주택임대차 신고 사용자 매뉴얼 | https://rtms.molit.go.kr/menualDownload/lsst/lsstManualDownload.pdf | official\n- 방문 또는 온라인 신고 방식 정하기\n  description: 주택 소재지 관할 주민센터 방문으로 할지, RTMS/정부24 흐름으로 온라인 신고할지 정합니다.\n  why: 공식 안내는 목적물 소재지 관할 주민센터 방문신고와 부동산거래관리시스템 온라인 신고를 모두 제시합니다.\n  how: 방문이면 관할 주민센터와 방문 가능 시간을 확인하고, 온라인이면 RTMS 접속과 로그인 가능 여부를 확인합니다.\n  done: 신고 방식과 접속/방문 경로가 정해졌습니다.\n  caution: 관할 기관과 온라인 처리 가능 여부는 실제 접수기관 안내를 확인합니다.\n  link: RTMS 주택임대차신고 서비스 안내 | https://rtms.molit.go.kr/main/serviceInfo.do | official\n  link: 정부24 주택 임대차신고 민원안내 | https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=16130000132&HighCtgCD=A01010 | official\n\n## 신고서 작성\n- 부동산거래관리시스템 신고서 작성하기\n  description: RTMS 또는 정부24 연결 화면에서 신청인, 임대인·임차인, 목적물, 계약 내용을 계약서 기준으로 작성합니다.\n  why: RTMS는 온라인 신고서 작성·등록과 처리 결과 조회를 안내합니다.\n  how: RTMS에서 계약서 기준으로 신고서를 작성하고 작성완료 상태를 확인합니다. 개인 진행 메모는 공식 처리 상태와 구분합니다.\n  done: 공식 사이트에서 신고서 작성완료 상태를 확인했습니다.\n  caution: 계약 상세정보와 개인정보는 공식 사이트에만 입력하고 FLOW에는 저장하지 않습니다.\n  link: RTMS 주택임대차신고 서비스 안내 | https://rtms.molit.go.kr/main/serviceInfo.do | official\n  link: 주택임대차계약신고 블로그 절차 참고 | https://blog.naver.com/PostView.naver?blogId=havelaw&logNo=222863332365 | creator\n  link: RTMS 주택임대차 신고 사용자 매뉴얼 | https://rtms.molit.go.kr/menualDownload/lsst/lsstManualDownload.pdf | official\n\n## 접수·처리 결과 확인\n- 전자서명과 접수 상태 확인하기\n  description: 전자서명 또는 제출 후 접수 완료 상태와 보완 요청 여부를 확인합니다.\n  why: 정책브리핑 Q&A는 온라인 사이트에서 진행 상황 확인이 가능하고 서류 보완 등은 문자로 안내될 수 있다고 설명합니다.\n  how: RTMS에서 전자서명 상태와 임대차신고 이력조회의 접수·처리 상태를 확인합니다.\n  done: 전자서명 상태와 접수·처리 상태, 보완 요청 여부를 확인했습니다.\n  caution: 계약서 미첨부 건은 양 당사자 서명 또는 단독사유·기타 첨부서류 등 해당 접수 조건을 확인합니다. 작성완료·접수완료·승인완료를 구분하고 보완은 기관 안내를 따릅니다.\n  link: 정책브리핑 주택 임대차 신고제 Q&A | https://www.korea.kr/news/policyNewsView.do?newsId=148888119 | official\n  link: RTMS 주택임대차 신고 사용자 매뉴얼 | https://rtms.molit.go.kr/menualDownload/lsst/lsstManualDownload.pdf | official\n- 신고필증과 확정일자 표시 확인하기\n  description: 신고필증 발급 여부와 계약서 제출 시 확정일자 표시 여부를 확인하고 저장 위치만 메모합니다.\n  why: 정책브리핑 Q&A는 계약서 제출 시 임대차계약신고필증에 확정일자 번호가 표시된다고 설명합니다.\n  how: 승인완료 후 발급된 신고필증에서 확정일자 표시를 확인합니다. 저장 위치는 개인 기록으로 남깁니다.\n  done: 발급된 신고필증과 계약서 첨부 조건에 따른 확정일자 표시를 확인했습니다. 필증이 미발급이면 완료로 기록하지 않습니다.\n  caution: 확정일자 자동 부여는 계약서 첨부 조건과 구분해 확인합니다. 계약서 미첨부로 확정일자가 없는 필증 예시가 있으므로 신고 접수만으로 부여를 보장하지 않습니다. 권리관계는 별도 판단입니다.\n  link: 정책브리핑 주택 임대차 신고제 Q&A | https://www.korea.kr/news/policyNewsView.do?newsId=148888119 | official\n  link: 정부24 주택 임대차신고 민원안내 | https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=16130000132&HighCtgCD=A01010 | official\n  link: RTMS 주택임대차 신고 사용자 매뉴얼 | https://rtms.molit.go.kr/menualDownload/lsst/lsstManualDownload.pdf | official"
      },
      "sections": [
        {
          "id": "flow-lease-contract-report-deadline-section-0",
          "flow_id": "flow-lease-contract-report-deadline",
          "title": "대상 확인",
          "order": 0
        },
        {
          "id": "flow-lease-contract-report-deadline-section-1",
          "flow_id": "flow-lease-contract-report-deadline",
          "title": "신고 준비",
          "order": 1
        },
        {
          "id": "flow-lease-contract-report-deadline-section-2",
          "flow_id": "flow-lease-contract-report-deadline",
          "title": "신고서 작성",
          "order": 2
        },
        {
          "id": "flow-lease-contract-report-deadline-section-3",
          "flow_id": "flow-lease-contract-report-deadline",
          "title": "접수·처리 결과 확인",
          "order": 3
        }
      ],
      "items": [
        {
          "id": "flow-lease-contract-report-deadline-item-0",
          "flow_id": "flow-lease-contract-report-deadline",
          "section_id": "flow-lease-contract-report-deadline-section-0",
          "title": "신고 대상과 30일 마감 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 0,
          "description": "계약일, 주택 소재지, 보증금·월세 기준을 공식 안내에서 확인하고 30일 마감일을 캘린더에 둡니다.",
          "risk_level": "financial_sensitive"
        },
        {
          "id": "flow-lease-contract-report-deadline-item-1",
          "flow_id": "flow-lease-contract-report-deadline",
          "section_id": "flow-lease-contract-report-deadline-section-1",
          "title": "계약서와 인증수단 준비하기",
          "type": "todo",
          "source_type": "official",
          "order": 1,
          "description": "계약서 원본/스캔본, 본인 확인 수단, 대리 신고 여부를 준비합니다.",
          "risk_level": "financial_sensitive"
        },
        {
          "id": "flow-lease-contract-report-deadline-item-2",
          "flow_id": "flow-lease-contract-report-deadline",
          "section_id": "flow-lease-contract-report-deadline-section-1",
          "title": "방문 또는 온라인 신고 방식 정하기",
          "type": "todo",
          "source_type": "official",
          "order": 2,
          "description": "주택 소재지 관할 주민센터 방문으로 할지, RTMS/정부24 흐름으로 온라인 신고할지 정합니다.",
          "risk_level": "financial_sensitive"
        },
        {
          "id": "flow-lease-contract-report-deadline-item-3",
          "flow_id": "flow-lease-contract-report-deadline",
          "section_id": "flow-lease-contract-report-deadline-section-2",
          "title": "부동산거래관리시스템 신고서 작성하기",
          "type": "todo",
          "source_type": "official",
          "order": 3,
          "description": "RTMS 또는 정부24 연결 화면에서 신청인, 임대인·임차인, 목적물, 계약 내용을 계약서 기준으로 작성합니다.",
          "risk_level": "financial_sensitive"
        },
        {
          "id": "flow-lease-contract-report-deadline-item-4",
          "flow_id": "flow-lease-contract-report-deadline",
          "section_id": "flow-lease-contract-report-deadline-section-3",
          "title": "전자서명과 접수 상태 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 4,
          "description": "전자서명 또는 제출 후 접수 완료 상태와 보완 요청 여부를 확인합니다.",
          "risk_level": "financial_sensitive"
        },
        {
          "id": "flow-lease-contract-report-deadline-item-5",
          "flow_id": "flow-lease-contract-report-deadline",
          "section_id": "flow-lease-contract-report-deadline-section-3",
          "title": "신고필증과 확정일자 표시 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 5,
          "description": "신고필증 발급 여부와 계약서 제출 시 확정일자 표시 여부를 확인하고 저장 위치만 메모합니다.",
          "risk_level": "financial_sensitive"
        }
      ],
      "itemDetails": [
        {
          "item_id": "flow-lease-contract-report-deadline-item-0",
          "why": "RTMS는 임대인과 임차인이 계약 체결일로부터 30일 이내 공동신고하는 구조를 안내하며, 신고대상 기준도 지역과 금액에 따라 달라집니다.",
          "how": "RTMS 서비스 안내에서 신고대상 기준과 신고지역을 확인합니다. FLOW에는 대상 여부 확정값보다 “공식 확인 완료”와 마감일만 남깁니다.",
          "completion_criteria": "공식 안내에서 신고 대상 여부를 확인했고 계약일 기준 30일 마감일이 정해졌습니다.",
          "caution": "신고 대상 여부와 과태료는 FLOW가 판단하지 않습니다. 최신 공식 안내와 관할 기관 확인을 우선합니다.",
          "links": [
            {
              "label": "RTMS 주택임대차신고 서비스 안내",
              "url": "https://rtms.molit.go.kr/main/serviceInfo.do",
              "type": "official"
            },
            {
              "label": "정책브리핑 주택 임대차 신고제 Q&A",
              "url": "https://www.korea.kr/news/policyNewsView.do?newsId=148888119",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-lease-contract-report-deadline-item-1",
          "why": "공식 안내는 계약서 또는 계약 입증서류가 있으면 신고할 수 있고, 계약서를 제출하면 확정일자 자동부여와 연결된다고 설명합니다.",
          "how": "계약서 파일 위치와 인증수단 보유 여부만 체크합니다. 주민등록번호, 인증번호, 계약 상세 금액은 FLOW 메모에 적지 않습니다.",
          "completion_criteria": "계약서 파일 위치와 필요한 인증수단이 준비됐습니다.",
          "caution": "개인 식별정보, 인증값, 계약서 원문은 FLOW에 저장하지 않습니다.",
          "links": [
            {
              "label": "정부24 주택 임대차신고 민원안내",
              "url": "https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=16130000132&HighCtgCD=A01010",
              "type": "official"
            },
            {
              "label": "주택임대차계약신고 블로그 절차 참고",
              "url": "https://blog.naver.com/PostView.naver?blogId=havelaw&logNo=222863332365",
              "type": "creator"
            },
            {
              "label": "RTMS 주택임대차 신고 사용자 매뉴얼",
              "url": "https://rtms.molit.go.kr/menualDownload/lsst/lsstManualDownload.pdf",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-lease-contract-report-deadline-item-2",
          "why": "공식 안내는 목적물 소재지 관할 주민센터 방문신고와 부동산거래관리시스템 온라인 신고를 모두 제시합니다.",
          "how": "방문이면 관할 주민센터와 방문 가능 시간을 확인하고, 온라인이면 RTMS 접속과 로그인 가능 여부를 확인합니다.",
          "completion_criteria": "신고 방식과 접속/방문 경로가 정해졌습니다.",
          "caution": "관할 기관과 온라인 처리 가능 여부는 실제 접수기관 안내를 확인합니다.",
          "links": [
            {
              "label": "RTMS 주택임대차신고 서비스 안내",
              "url": "https://rtms.molit.go.kr/main/serviceInfo.do",
              "type": "official"
            },
            {
              "label": "정부24 주택 임대차신고 민원안내",
              "url": "https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=16130000132&HighCtgCD=A01010",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-lease-contract-report-deadline-item-3",
          "why": "RTMS는 온라인 신고서 작성·등록과 처리 결과 조회를 안내합니다.",
          "how": "RTMS에서 계약서 기준으로 신고서를 작성하고 작성완료 상태를 확인합니다. 개인 진행 메모는 공식 처리 상태와 구분합니다.",
          "completion_criteria": "공식 사이트에서 신고서 작성완료 상태를 확인했습니다.",
          "caution": "계약 상세정보와 개인정보는 공식 사이트에만 입력하고 FLOW에는 저장하지 않습니다.",
          "links": [
            {
              "label": "RTMS 주택임대차신고 서비스 안내",
              "url": "https://rtms.molit.go.kr/main/serviceInfo.do",
              "type": "official"
            },
            {
              "label": "주택임대차계약신고 블로그 절차 참고",
              "url": "https://blog.naver.com/PostView.naver?blogId=havelaw&logNo=222863332365",
              "type": "creator"
            },
            {
              "label": "RTMS 주택임대차 신고 사용자 매뉴얼",
              "url": "https://rtms.molit.go.kr/menualDownload/lsst/lsstManualDownload.pdf",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-lease-contract-report-deadline-item-4",
          "why": "정책브리핑 Q&A는 온라인 사이트에서 진행 상황 확인이 가능하고 서류 보완 등은 문자로 안내될 수 있다고 설명합니다.",
          "how": "RTMS에서 전자서명 상태와 임대차신고 이력조회의 접수·처리 상태를 확인합니다.",
          "completion_criteria": "전자서명 상태와 접수·처리 상태, 보완 요청 여부를 확인했습니다.",
          "caution": "계약서 미첨부 건은 양 당사자 서명 또는 단독사유·기타 첨부서류 등 해당 접수 조건을 확인합니다. 작성완료·접수완료·승인완료를 구분하고 보완은 기관 안내를 따릅니다.",
          "links": [
            {
              "label": "정책브리핑 주택 임대차 신고제 Q&A",
              "url": "https://www.korea.kr/news/policyNewsView.do?newsId=148888119",
              "type": "official"
            },
            {
              "label": "RTMS 주택임대차 신고 사용자 매뉴얼",
              "url": "https://rtms.molit.go.kr/menualDownload/lsst/lsstManualDownload.pdf",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-lease-contract-report-deadline-item-5",
          "why": "정책브리핑 Q&A는 계약서 제출 시 임대차계약신고필증에 확정일자 번호가 표시된다고 설명합니다.",
          "how": "승인완료 후 발급된 신고필증에서 확정일자 표시를 확인합니다. 저장 위치는 개인 기록으로 남깁니다.",
          "completion_criteria": "발급된 신고필증과 계약서 첨부 조건에 따른 확정일자 표시를 확인했습니다. 필증이 미발급이면 완료로 기록하지 않습니다.",
          "caution": "확정일자 자동 부여는 계약서 첨부 조건과 구분해 확인합니다. 계약서 미첨부로 확정일자가 없는 필증 예시가 있으므로 신고 접수만으로 부여를 보장하지 않습니다. 권리관계는 별도 판단입니다.",
          "links": [
            {
              "label": "정책브리핑 주택 임대차 신고제 Q&A",
              "url": "https://www.korea.kr/news/policyNewsView.do?newsId=148888119",
              "type": "official"
            },
            {
              "label": "정부24 주택 임대차신고 민원안내",
              "url": "https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=16130000132&HighCtgCD=A01010",
              "type": "official"
            },
            {
              "label": "RTMS 주택임대차 신고 사용자 매뉴얼",
              "url": "https://rtms.molit.go.kr/menualDownload/lsst/lsstManualDownload.pdf",
              "type": "official"
            }
          ]
        }
      ],
      "warnings": [],
      "repeatRules": []
    }
  },
  {
    "version": "flowme-reviewed-source-v1:real-safe-driving-license-renewal:128dee3da0285f412ff3a5a99c29729f90a77893a473abc4e23397b6b816a5bd",
    "sourceFlowId": "flow-real-safe-driving-license-renewal",
    "sourceSlug": "real-safe-driving-license-renewal",
    "bundleSha256": "128dee3da0285f412ff3a5a99c29729f90a77893a473abc4e23397b6b816a5bd",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "flow-real-safe-driving-license-renewal",
        "slug": "real-safe-driving-license-renewal",
        "title": "안전운전 면허 갱신 Flow",
        "description": "한국도로교통공단 안내에서 면허 갱신·적성검사 대상과 준비물, 신청 경로를 확인합니다.",
        "category": "자동차 관리",
        "structure_type": "checklist",
        "content_type": "default",
        "anchor_type": "none",
        "status": "published",
        "source_status": "real",
        "source_precision": "exact",
        "source_title": "한국도로교통공단 운전면허증 발급 가이드",
        "source_url": "https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111",
        "source_checked_at": "2026-10-10",
        "conversion_note": "면허 갱신·적성검사 대상과 준비물·본인 수령은 원문 발급 가이드를 참고합니다. 정확한 갱신기간 조회는 공식 정기적성검사/면허갱신 상세의 보충 근거입니다. 다음 기간의 캘린더 기록은 선택 개인 관리이며 자동 반복이나 기간 계산을 뜻하지 않습니다.",
        "risk_level": "medium",
        "owner_user_id": "channel-mobility",
        "creator_name": "차근차근 모빌리티",
        "creator_role": "자동차 생활 채널",
        "creator_note": "구매, 검사, 정비, 보험 확인을 차량 생활주기 Flow로 묶습니다.",
        "usage_count": 0,
        "copy_count": 0,
        "tags": [
          "자동차",
          "면허",
          "공식출처"
        ],
        "created_at": "2026-05-21T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 안전운전 면허 갱신 Flow\n\n## 갱신 전\n- 면허 갱신 또는 적성검사 대상 확인\n  description: 한국도로교통공단 운전면허증 발급 가이드 기준으로 실행할 항목입니다.\n  why: 면허 종류와 기간에 따라 단순 갱신인지 적성검사인지 절차가 달라집니다.\n  how: 공식 정기적성검사/면허갱신 보충 안내에 따라 안전운전 통합민원 마이페이지 또는 경찰청교통민원24-운전면허에서 본인의 갱신기간과 대상 절차를 확인합니다. 기존 면허증 표기와 실제 기간은 다를 수 있습니다.\n  done: 갱신 대상, 기간, 필요한 절차를 확인했습니다.\n  link: 한국도로교통공단 운전면허증 발급 가이드 | https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111 | official\n  link: 한국도로교통공단 정기적성검사·면허갱신 상세 | https://www.safedriving.or.kr/diGuide/selectDiGuide01.do?menuCd=MN-PO-1211 | official\n- 사진과 기존 면허증 준비\n  description: 한국도로교통공단 운전면허증 발급 가이드 기준으로 실행할 항목입니다.\n  why: 사진 규격이나 기존 면허증이 준비되지 않으면 신청이 지연됩니다.\n  how: 최근 사진, 기존 면허증, 본인 확인 수단을 준비하고 사진 규격을 확인합니다.\n  done: 신청에 필요한 사진과 기존 면허증을 준비했습니다.\n  link: 한국도로교통공단 운전면허증 발급 가이드 | https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111 | official\n- 건강검진 또는 적성검사 필요 여부 확인\n  description: 한국도로교통공단 운전면허증 발급 가이드 기준으로 실행할 항목입니다.\n  why: 적성검사 대상이면 건강 관련 확인이 추가로 필요할 수 있습니다.\n  how: 면허 종류와 안내 기준에 따라 건강검진 결과 활용 또는 별도 검사가 필요한지 봅니다.\n  done: 공식 안내의 면허 종류·연령별 조건과 건강검진 활용 가능 여부를 확인했습니다.\n  link: 한국도로교통공단 운전면허증 발급 가이드 | https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111 | official\n  link: 한국도로교통공단 정기적성검사·면허갱신 상세 | https://www.safedriving.or.kr/diGuide/selectDiGuide01.do?menuCd=MN-PO-1211 | official\n- 온라인/방문 신청 경로 선택\n  description: 한국도로교통공단 운전면허증 발급 가이드 기준으로 실행할 항목입니다.\n  why: 수령 방식과 처리 시간은 신청 경로에 따라 달라질 수 있습니다.\n  how: 온라인 신청 가능 여부, 시험장 또는 경찰서 방문 가능 시간, 수령 방법을 비교합니다.\n  done: 신청 경로와 방문 또는 수령 일정을 정했습니다.\n  link: 한국도로교통공단 운전면허증 발급 가이드 | https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111 | official\n\n## 신청·수령\n- 새 면허 수령과 다음 갱신 기한 기록\n  description: 새 면허증은 본인이 수령합니다. 다음 갱신기간을 개인 캘린더에 기록하는 것은 선택 후속 관리입니다.\n  why: 새 면허증은 본인이 수령해야 합니다. 다음 갱신기간의 캘린더 기록은 개인 후속 관리이며 누락 방지를 보장하지 않습니다.\n  how: 새 면허증을 본인이 수령합니다. 다음 갱신기간을 기록하려면 공식 조회에서 본인의 기간을 확인한 뒤 개인 캘린더에 적습니다. 캘린더 기록과 알림은 선택입니다.\n  done: 새 면허증을 수령했습니다. 선택한 경우에만 공식 조회에서 확인한 다음 갱신기간을 개인 캘린더에 기록했습니다.\n  link: 한국도로교통공단 운전면허증 발급 가이드 | https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111 | official\n  link: 한국도로교통공단 정기적성검사·면허갱신 상세 | https://www.safedriving.or.kr/diGuide/selectDiGuide01.do?menuCd=MN-PO-1211 | official"
      },
      "sections": [
        {
          "id": "flow-real-safe-driving-license-renewal-section-1",
          "flow_id": "flow-real-safe-driving-license-renewal",
          "title": "갱신 전",
          "order": 1
        },
        {
          "id": "flow-real-safe-driving-license-renewal-section-2",
          "flow_id": "flow-real-safe-driving-license-renewal",
          "title": "신청·수령",
          "order": 2
        }
      ],
      "items": [
        {
          "id": "flow-real-safe-driving-license-renewal-item-1",
          "flow_id": "flow-real-safe-driving-license-renewal",
          "section_id": "flow-real-safe-driving-license-renewal-section-1",
          "title": "면허 갱신 또는 적성검사 대상 확인",
          "type": "todo",
          "source_type": "official",
          "risk_level": "medium",
          "order": 1,
          "description": "한국도로교통공단 운전면허증 발급 가이드 기준으로 실행할 항목입니다."
        },
        {
          "id": "flow-real-safe-driving-license-renewal-item-2",
          "flow_id": "flow-real-safe-driving-license-renewal",
          "section_id": "flow-real-safe-driving-license-renewal-section-1",
          "title": "사진과 기존 면허증 준비",
          "type": "todo",
          "source_type": "official",
          "risk_level": "medium",
          "order": 2,
          "description": "한국도로교통공단 운전면허증 발급 가이드 기준으로 실행할 항목입니다."
        },
        {
          "id": "flow-real-safe-driving-license-renewal-item-3",
          "flow_id": "flow-real-safe-driving-license-renewal",
          "section_id": "flow-real-safe-driving-license-renewal-section-1",
          "title": "건강검진 또는 적성검사 필요 여부 확인",
          "type": "todo",
          "source_type": "official",
          "risk_level": "medium",
          "order": 3,
          "description": "한국도로교통공단 운전면허증 발급 가이드 기준으로 실행할 항목입니다."
        },
        {
          "id": "flow-real-safe-driving-license-renewal-item-4",
          "flow_id": "flow-real-safe-driving-license-renewal",
          "section_id": "flow-real-safe-driving-license-renewal-section-1",
          "title": "온라인/방문 신청 경로 선택",
          "type": "todo",
          "source_type": "official",
          "risk_level": "medium",
          "order": 4,
          "description": "한국도로교통공단 운전면허증 발급 가이드 기준으로 실행할 항목입니다."
        },
        {
          "id": "flow-real-safe-driving-license-renewal-item-5",
          "flow_id": "flow-real-safe-driving-license-renewal",
          "section_id": "flow-real-safe-driving-license-renewal-section-2",
          "title": "새 면허 수령과 다음 갱신 기한 기록",
          "type": "todo",
          "source_type": "official",
          "risk_level": "medium",
          "order": 5,
          "description": "새 면허증은 본인이 수령합니다. 다음 갱신기간을 개인 캘린더에 기록하는 것은 선택 후속 관리입니다."
        }
      ],
      "itemDetails": [
        {
          "item_id": "flow-real-safe-driving-license-renewal-item-1",
          "why": "면허 종류와 기간에 따라 단순 갱신인지 적성검사인지 절차가 달라집니다.",
          "how": "공식 정기적성검사/면허갱신 보충 안내에 따라 안전운전 통합민원 마이페이지 또는 경찰청교통민원24-운전면허에서 본인의 갱신기간과 대상 절차를 확인합니다. 기존 면허증 표기와 실제 기간은 다를 수 있습니다.",
          "completion_criteria": "갱신 대상, 기간, 필요한 절차를 확인했습니다.",
          "links": [
            {
              "label": "한국도로교통공단 운전면허증 발급 가이드",
              "url": "https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111",
              "type": "official"
            },
            {
              "label": "한국도로교통공단 정기적성검사·면허갱신 상세",
              "url": "https://www.safedriving.or.kr/diGuide/selectDiGuide01.do?menuCd=MN-PO-1211",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-real-safe-driving-license-renewal-item-2",
          "why": "사진 규격이나 기존 면허증이 준비되지 않으면 신청이 지연됩니다.",
          "how": "최근 사진, 기존 면허증, 본인 확인 수단을 준비하고 사진 규격을 확인합니다.",
          "completion_criteria": "신청에 필요한 사진과 기존 면허증을 준비했습니다.",
          "links": [
            {
              "label": "한국도로교통공단 운전면허증 발급 가이드",
              "url": "https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-real-safe-driving-license-renewal-item-3",
          "why": "적성검사 대상이면 건강 관련 확인이 추가로 필요할 수 있습니다.",
          "how": "면허 종류와 안내 기준에 따라 건강검진 결과 활용 또는 별도 검사가 필요한지 봅니다.",
          "completion_criteria": "공식 안내의 면허 종류·연령별 조건과 건강검진 활용 가능 여부를 확인했습니다.",
          "links": [
            {
              "label": "한국도로교통공단 운전면허증 발급 가이드",
              "url": "https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111",
              "type": "official"
            },
            {
              "label": "한국도로교통공단 정기적성검사·면허갱신 상세",
              "url": "https://www.safedriving.or.kr/diGuide/selectDiGuide01.do?menuCd=MN-PO-1211",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-real-safe-driving-license-renewal-item-4",
          "why": "수령 방식과 처리 시간은 신청 경로에 따라 달라질 수 있습니다.",
          "how": "온라인 신청 가능 여부, 시험장 또는 경찰서 방문 가능 시간, 수령 방법을 비교합니다.",
          "completion_criteria": "신청 경로와 방문 또는 수령 일정을 정했습니다.",
          "links": [
            {
              "label": "한국도로교통공단 운전면허증 발급 가이드",
              "url": "https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-real-safe-driving-license-renewal-item-5",
          "why": "새 면허증은 본인이 수령해야 합니다. 다음 갱신기간의 캘린더 기록은 개인 후속 관리이며 누락 방지를 보장하지 않습니다.",
          "how": "새 면허증을 본인이 수령합니다. 다음 갱신기간을 기록하려면 공식 조회에서 본인의 기간을 확인한 뒤 개인 캘린더에 적습니다. 캘린더 기록과 알림은 선택입니다.",
          "completion_criteria": "새 면허증을 수령했습니다. 선택한 경우에만 공식 조회에서 확인한 다음 갱신기간을 개인 캘린더에 기록했습니다.",
          "links": [
            {
              "label": "한국도로교통공단 운전면허증 발급 가이드",
              "url": "https://www.safedriving.or.kr/diGuide/selectDiGuide18.do?menuCd=MN-PO-12111",
              "type": "official"
            },
            {
              "label": "한국도로교통공단 정기적성검사·면허갱신 상세",
              "url": "https://www.safedriving.or.kr/diGuide/selectDiGuide01.do?menuCd=MN-PO-1211",
              "type": "official"
            }
          ]
        }
      ]
    }
  },
  {
    "version": "flowme-reviewed-source-v1:birth-registration-prep:8a70eca2f1103264dcec3e8e31cf436028d0f27419016ddc59ec63edcd848833",
    "sourceFlowId": "official-260601-birth-registration",
    "sourceSlug": "birth-registration-prep",
    "bundleSha256": "8a70eca2f1103264dcec3e8e31cf436028d0f27419016ddc59ec63edcd848833",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "official-260601-birth-registration",
        "slug": "birth-registration-prep",
        "title": "출생신고 준비 Flow",
        "description": "출생 후 신고기한 안에 출생신고와 함께 받을 수 있는 서비스를 정리합니다.",
        "category": "가족/출생",
        "structure_type": "timeline",
        "anchor_type": "start_date",
        "status": "published",
        "risk_level": "medium",
        "primary_destination": "calendar",
        "source_title": "정부24 – 행복출산 통합신청 안내",
        "source_url": "https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=17410000001",
        "source_precision": "broad",
        "source_checked_at": "2026-10-10",
        "conversion_note": "출생신고 준비와 행복출산 신청 안내를 구분합니다. 개인 준비 날짜는 법정 신고기한과 별도로 정합니다.",
        "warning": "신고기한, 필요 서류, 동시 신청 서비스는 변경될 수 있습니다. 정부24와 전자가족관계등록 안내로 확인하세요.",
        "content_type": "default",
        "source_status": "needs_review",
        "created_at": "2026-06-01T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 출생신고 준비 Flow\n\n## 서류 준비\n- 출생증명서 등 신고 서류 확인하기\n  why: 출생신고는 신고기한이 있어 서류를 일찍 준비하는 게 좋습니다.\n  how: 온라인 출생신고의 출생증명서 첨부 요건을 확인합니다. 신고인·신고장소와 그 밖의 제출서류는 실제 신고기관 안내와 함께 확인합니다.\n  done: 필요 서류를 모았다.\n  link: 법원 전자가족관계등록시스템 출생신고 안내 | https://efamily.scourt.go.kr/cs/CsBltnWrtGuide.do?bltnbordId=0000008&guideCd=0000008001&guideYn=Y | official\n  link: 울산 동구 온라인 출생신고 안내 | https://donggu.ulsan.kr/donggu/contents/contents.do?mId=2050200 | official\n- 아이 이름·등록기준지 정하기\n\n## 신고·연계\n- 출생신고 접수하기\n  how: 출산한 병원이 온라인 출생신고 참여병원이고 신고 전 출생증명 정보 활용 동의를 마친 경우 전자가족관계등록시스템에서 신고합니다. 온라인 요건을 충족하지 못하면 공식 안내에서 신고기관을 확인해 방문합니다.\n  done: 출생신고 접수를 확인했다.\n  link: 법원 전자가족관계등록시스템 출생신고 안내 | https://efamily.scourt.go.kr/cs/CsBltnWrtGuide.do?bltnbordId=0000008&guideCd=0000008001&guideYn=Y | official\n  link: 울산 동구 온라인 출생신고 안내 | https://donggu.ulsan.kr/donggu/contents/contents.do?mId=2050200 | official\n- 행복출산 통합신청 대상 서비스 확인하기\n  how: 행복출산은 출생신고와 동시에 또는 이후 신청합니다. 읍면동 방문과 정부24 온라인 신청을 구분하며, 온라인은 대리 신청이 불가하다는 자격 조건을 확인합니다.\n  caution: 부모급여 등 서비스마다 신청 시점과 소급 기준이 다를 수 있으므로 현재 정부24·복지로 안내를 확인합니다.\n  link: 정부24 행복출산 통합신청 | https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=17410000001 | official\n\n## 신고기한 점검\n- 신고기한 내 완료 여부 최종 확인하기\n  caution: 출생신고 기한은 출생 후 1개월 이내입니다. 1개월을 30일로 환산하지 않습니다. 정당한 사유 없이 기한 내 신고하지 않으면 과태료가 부과될 수 있습니다.\n  link: 찾기쉬운 생활법령 출생신고 기간 안내 | https://www.easylaw.go.kr/CSP/CnpClsMain.laf?csmSeq=1830&ccfNo=2&cciNo=1&cnpClsNo=1 | official",
        "owner_user_id": "user-flow-curation",
        "creator_name": "FLOW 큐레이션팀",
        "creator_role": "경험 콘텐츠 큐레이터",
        "creator_note": "반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.",
        "usage_count": 3096,
        "copy_count": 750,
        "tags": [
          "D-Day 준비",
          "공식확인"
        ]
      },
      "sections": [
        {
          "id": "official-260601-birth-registration-section-0",
          "flow_id": "official-260601-birth-registration",
          "title": "서류 준비",
          "order": 0
        },
        {
          "id": "official-260601-birth-registration-section-1",
          "flow_id": "official-260601-birth-registration",
          "title": "신고·연계",
          "order": 1
        },
        {
          "id": "official-260601-birth-registration-section-2",
          "flow_id": "official-260601-birth-registration",
          "title": "신고기한 점검",
          "order": 2
        }
      ],
      "items": [
        {
          "id": "official-260601-birth-registration-item-0",
          "flow_id": "official-260601-birth-registration",
          "section_id": "official-260601-birth-registration-section-0",
          "title": "출생증명서 등 신고 서류 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 0
        },
        {
          "id": "official-260601-birth-registration-item-1",
          "flow_id": "official-260601-birth-registration",
          "section_id": "official-260601-birth-registration-section-0",
          "title": "아이 이름·등록기준지 정하기",
          "type": "todo",
          "source_type": "official",
          "order": 1
        },
        {
          "id": "official-260601-birth-registration-item-2",
          "flow_id": "official-260601-birth-registration",
          "section_id": "official-260601-birth-registration-section-1",
          "title": "출생신고 접수하기",
          "type": "todo",
          "source_type": "official",
          "order": 2
        },
        {
          "id": "official-260601-birth-registration-item-3",
          "flow_id": "official-260601-birth-registration",
          "section_id": "official-260601-birth-registration-section-1",
          "title": "행복출산 통합신청 대상 서비스 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 3
        },
        {
          "id": "official-260601-birth-registration-item-4",
          "flow_id": "official-260601-birth-registration",
          "section_id": "official-260601-birth-registration-section-2",
          "title": "신고기한 내 완료 여부 최종 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 4
        }
      ],
      "itemDetails": [
        {
          "item_id": "official-260601-birth-registration-item-0",
          "why": "출생신고는 신고기한이 있어 서류를 일찍 준비하는 게 좋습니다.",
          "how": "온라인 출생신고의 출생증명서 첨부 요건을 확인합니다. 신고인·신고장소와 그 밖의 제출서류는 실제 신고기관 안내와 함께 확인합니다.",
          "completion_criteria": "필요 서류를 모았다.",
          "links": [
            {
              "label": "법원 전자가족관계등록시스템 출생신고 안내",
              "url": "https://efamily.scourt.go.kr/cs/CsBltnWrtGuide.do?bltnbordId=0000008&guideCd=0000008001&guideYn=Y",
              "type": "official"
            },
            {
              "label": "울산 동구 온라인 출생신고 안내",
              "url": "https://donggu.ulsan.kr/donggu/contents/contents.do?mId=2050200",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "official-260601-birth-registration-item-2",
          "how": "출산한 병원이 온라인 출생신고 참여병원이고 신고 전 출생증명 정보 활용 동의를 마친 경우 전자가족관계등록시스템에서 신고합니다. 온라인 요건을 충족하지 못하면 공식 안내에서 신고기관을 확인해 방문합니다.",
          "completion_criteria": "출생신고 접수를 확인했다.",
          "links": [
            {
              "label": "법원 전자가족관계등록시스템 출생신고 안내",
              "url": "https://efamily.scourt.go.kr/cs/CsBltnWrtGuide.do?bltnbordId=0000008&guideCd=0000008001&guideYn=Y",
              "type": "official"
            },
            {
              "label": "울산 동구 온라인 출생신고 안내",
              "url": "https://donggu.ulsan.kr/donggu/contents/contents.do?mId=2050200",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "official-260601-birth-registration-item-3",
          "how": "행복출산은 출생신고와 동시에 또는 이후 신청합니다. 읍면동 방문과 정부24 온라인 신청을 구분하며, 온라인은 대리 신청이 불가하다는 자격 조건을 확인합니다.",
          "links": [
            {
              "label": "정부24 행복출산 통합신청",
              "url": "https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=17410000001",
              "type": "official"
            }
          ],
          "caution": "부모급여 등 서비스마다 신청 시점과 소급 기준이 다를 수 있으므로 현재 정부24·복지로 안내를 확인합니다."
        },
        {
          "item_id": "official-260601-birth-registration-item-4",
          "caution": "출생신고 기한은 출생 후 1개월 이내입니다. 1개월을 30일로 환산하지 않습니다. 정당한 사유 없이 기한 내 신고하지 않으면 과태료가 부과될 수 있습니다.",
          "links": [
            {
              "label": "찾기쉬운 생활법령 출생신고 기간 안내",
              "url": "https://www.easylaw.go.kr/CSP/CnpClsMain.laf?csmSeq=1830&ccfNo=2&cciNo=1&cnpClsNo=1",
              "type": "official"
            }
          ]
        }
      ],
      "warnings": [],
      "repeatRules": []
    }
  },
  {
    "version": "flowme-reviewed-source-v1:customs-traveler-declare:50b234092d56fb1082ac7e17045b4fec1be3692b1952573d7acdfa3377740c3c",
    "sourceFlowId": "official-260601-customs-traveler",
    "sourceSlug": "customs-traveler-declare",
    "bundleSha256": "50b234092d56fb1082ac7e17045b4fec1be3692b1952573d7acdfa3377740c3c",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "official-260601-customs-traveler",
        "slug": "customs-traveler-declare",
        "title": "해외여행 휴대품 면세범위·신고 Flow",
        "description": "관세청 기준으로 입국 전 휴대품 면세범위와 자진신고 대상을 확인합니다.",
        "category": "여행/관세",
        "structure_type": "checklist",
        "anchor_type": "none",
        "status": "published",
        "risk_level": "medium",
        "primary_destination": "memo",
        "source_title": "관세청 – 여행자 휴대품 통관 안내",
        "source_url": "https://customs.go.kr/kcs/cm/cntnts/cntntsView.do?mi=2837&cntntsId=829",
        "source_status": "real",
        "source_precision": "exact",
        "source_checked_at": "2026-10-10",
        "warning": "면세범위, 신고 대상, 반입금지·제한 품목은 변경될 수 있습니다. 관세청 공식 안내를 확인하세요.",
        "content_type": "default",
        "created_at": "2026-06-01T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 해외여행 휴대품 면세범위·신고 Flow\n\n## 1. 면세범위 확인\n- 휴대품 면세범위(총액·주류·담배·향수) 확인하기\n  why: 한도를 넘기면 자진신고 대상이며, 미신고 시 가산세가 붙을 수 있습니다.\n  how: 관세청 여행자 휴대품 안내에서 현재 면세 한도를 확인합니다.\n  done: 면세 한도와 구매 예정 항목을 비교했다. 비교 메모는 선택이다.\n  caution: 면세 총액과 주류·담배·향수의 별도 기준은 바뀔 수 있으므로 입국 직전 공식 페이지의 현재 값을 확인하세요.\n  link: 관세청 여행자 휴대품 통관 안내 | https://customs.go.kr/kcs/cm/cntnts/cntntsView.do?mi=2837&cntntsId=829 | official\n\n## 2. 신고·반입\n- 면세범위 초과 시 자진신고 방법 확인하기\n  how: 신고물품이 있으면 신고서(종이 또는 모바일)를 제출합니다. 모바일 신고 시 고지서 발급·납부가 가능합니다.\n  caution: 자진신고 감면과 미신고 가산세 기준은 관세청의 현재 안내를 확인하세요.\n- 반입금지·제한 품목(식물·육류 등) 확인하기",
        "owner_user_id": "user-flow-curation",
        "creator_name": "FLOW 큐레이션팀",
        "creator_role": "경험 콘텐츠 큐레이터",
        "creator_note": "반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.",
        "usage_count": 2976,
        "copy_count": 720,
        "tags": [
          "체크리스트",
          "블로그 따라하기",
          "여행"
        ]
      },
      "sections": [
        {
          "id": "official-260601-customs-traveler-section-0",
          "flow_id": "official-260601-customs-traveler",
          "title": "1. 면세범위 확인",
          "order": 0
        },
        {
          "id": "official-260601-customs-traveler-section-1",
          "flow_id": "official-260601-customs-traveler",
          "title": "2. 신고·반입",
          "order": 1
        }
      ],
      "items": [
        {
          "id": "official-260601-customs-traveler-item-0",
          "flow_id": "official-260601-customs-traveler",
          "section_id": "official-260601-customs-traveler-section-0",
          "title": "휴대품 면세범위(총액·주류·담배·향수) 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 0
        },
        {
          "id": "official-260601-customs-traveler-item-1",
          "flow_id": "official-260601-customs-traveler",
          "section_id": "official-260601-customs-traveler-section-1",
          "title": "면세범위 초과 시 자진신고 방법 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 1
        },
        {
          "id": "official-260601-customs-traveler-item-2",
          "flow_id": "official-260601-customs-traveler",
          "section_id": "official-260601-customs-traveler-section-1",
          "title": "반입금지·제한 품목(식물·육류 등) 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 2
        }
      ],
      "itemDetails": [
        {
          "item_id": "official-260601-customs-traveler-item-0",
          "why": "한도를 넘기면 자진신고 대상이며, 미신고 시 가산세가 붙을 수 있습니다.",
          "how": "관세청 여행자 휴대품 안내에서 현재 면세 한도를 확인합니다.",
          "completion_criteria": "면세 한도와 구매 예정 항목을 비교했다. 비교 메모는 선택이다.",
          "links": [
            {
              "label": "관세청 여행자 휴대품 통관 안내",
              "url": "https://customs.go.kr/kcs/cm/cntnts/cntntsView.do?mi=2837&cntntsId=829",
              "type": "official"
            }
          ],
          "caution": "면세 총액과 주류·담배·향수의 별도 기준은 바뀔 수 있으므로 입국 직전 공식 페이지의 현재 값을 확인하세요."
        },
        {
          "item_id": "official-260601-customs-traveler-item-1",
          "caution": "자진신고 감면과 미신고 가산세 기준은 관세청의 현재 안내를 확인하세요.",
          "how": "신고물품이 있으면 신고서(종이 또는 모바일)를 제출합니다. 모바일 신고 시 고지서 발급·납부가 가능합니다."
        }
      ],
      "warnings": [],
      "repeatRules": []
    }
  },
  {
    "version": "flowme-reviewed-source-v1:seal-or-signature-certificate:5ed4d28dc21d9998c35d369555b49a3b933a678890243c9fd4343451cc432279",
    "sourceFlowId": "official-260601-seal-certificate",
    "sourceSlug": "seal-or-signature-certificate",
    "bundleSha256": "5ed4d28dc21d9998c35d369555b49a3b933a678890243c9fd4343451cc432279",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "official-260601-seal-certificate",
        "slug": "seal-or-signature-certificate",
        "title": "인감증명·본인서명사실확인서 발급 Flow",
        "description": "정부24 기준으로 용도에 맞는 인감증명서 또는 본인서명사실확인서 발급을 준비합니다.",
        "category": "서류/증명",
        "structure_type": "checklist",
        "anchor_type": "none",
        "status": "published",
        "risk_level": "medium",
        "primary_destination": "memo",
        "source_title": "정부24 – 인감증명서 발급 안내",
        "source_url": "https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000025",
        "source_precision": "broad",
        "source_checked_at": "2026-10-10",
        "conversion_note": "인감증명서, 본인서명사실확인서, 전자본인서명확인서는 발급 방식과 제출 가능 범위가 달라 하나의 일반 발급 경로로 단정하지 않았습니다.",
        "warning": "발급 방식(방문/온라인), 용도별 요건은 다를 수 있습니다. 정부24와 주민센터 안내로 확인하세요.",
        "content_type": "default",
        "source_status": "needs_review",
        "created_at": "2026-06-01T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 인감증명·본인서명사실확인서 발급 Flow\n\n## 1. 용도·종류\n- 제출처가 요구하는 서류 종류·통수 확인하기\n  why: 인감증명서와 본인서명사실확인서는 용도·요구 형식이 다를 수 있습니다.\n  how: 제출처 요구사항과 정부24 안내를 대조합니다.\n  done: 제출처에 필요한 서류 종류와 통수를 확인했다. 개인 메모는 선택이다.\n  link: 정부24 인감증명서 발급 안내 | https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000025 | official\n- 부동산 매도용 등 특정 용도 요건 확인하기\n  caution: 정부24 온라인 인감증명서는 허용된 일반용 범위에서 본인만 신청할 수 있습니다. 용도별 제외 여부는 정부24와 제출처의 현재 안내에서 확인하세요.\n\n## 2. 발급\n- 용도에 맞는 발급 방법 확인하고 발급받기\n  how: 일반용 인감증명서는 허용된 온라인 용도에 한해 본인이 정부24에서 발급합니다. 본인서명사실확인서는 본인이 방문해 발급합니다. 전자본인서명확인서는 발급시스템 이용 승인과 행정기관 등 수요기관 제출을 전제로 하는 별도 방식이므로 제출처가 받는 서류인지 먼저 확인합니다.\n  done: 제출처가 받는 서류를 해당 발급 방법으로 발급받았다. 보관 위치 메모는 선택이다.\n  link: 정부24 본인서명사실확인서 발급 | https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13110000047&HighCtgCD=A01008 | official\n  link: 의왕시 전자본인서명확인서 안내 | https://www.uiwang.go.kr/UWKORMIN0802 | official",
        "owner_user_id": "user-admin-note",
        "creator_name": "생활 행정 노트",
        "creator_role": "공식자료 큐레이터",
        "creator_note": "공식 안내를 신청 전 확인 순서로 재구성합니다.",
        "usage_count": 2358,
        "copy_count": 627,
        "tags": [
          "체크리스트",
          "공식확인",
          "생활서류"
        ]
      },
      "sections": [
        {
          "id": "official-260601-seal-certificate-section-0",
          "flow_id": "official-260601-seal-certificate",
          "title": "1. 용도·종류",
          "order": 0
        },
        {
          "id": "official-260601-seal-certificate-section-1",
          "flow_id": "official-260601-seal-certificate",
          "title": "2. 발급",
          "order": 1
        }
      ],
      "items": [
        {
          "id": "official-260601-seal-certificate-item-0",
          "flow_id": "official-260601-seal-certificate",
          "section_id": "official-260601-seal-certificate-section-0",
          "title": "제출처가 요구하는 서류 종류·통수 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 0
        },
        {
          "id": "official-260601-seal-certificate-item-1",
          "flow_id": "official-260601-seal-certificate",
          "section_id": "official-260601-seal-certificate-section-0",
          "title": "부동산 매도용 등 특정 용도 요건 확인하기",
          "type": "todo",
          "source_type": "official",
          "order": 1
        },
        {
          "id": "official-260601-seal-certificate-item-2",
          "flow_id": "official-260601-seal-certificate",
          "section_id": "official-260601-seal-certificate-section-1",
          "title": "용도에 맞는 발급 방법 확인하고 발급받기",
          "type": "todo",
          "source_type": "official",
          "order": 2
        }
      ],
      "itemDetails": [
        {
          "item_id": "official-260601-seal-certificate-item-0",
          "why": "인감증명서와 본인서명사실확인서는 용도·요구 형식이 다를 수 있습니다.",
          "how": "제출처 요구사항과 정부24 안내를 대조합니다.",
          "completion_criteria": "제출처에 필요한 서류 종류와 통수를 확인했다. 개인 메모는 선택이다.",
          "links": [
            {
              "label": "정부24 인감증명서 발급 안내",
              "url": "https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000025",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "official-260601-seal-certificate-item-1",
          "caution": "정부24 온라인 인감증명서는 허용된 일반용 범위에서 본인만 신청할 수 있습니다. 용도별 제외 여부는 정부24와 제출처의 현재 안내에서 확인하세요."
        },
        {
          "item_id": "official-260601-seal-certificate-item-2",
          "how": "일반용 인감증명서는 허용된 온라인 용도에 한해 본인이 정부24에서 발급합니다. 본인서명사실확인서는 본인이 방문해 발급합니다. 전자본인서명확인서는 발급시스템 이용 승인과 행정기관 등 수요기관 제출을 전제로 하는 별도 방식이므로 제출처가 받는 서류인지 먼저 확인합니다.",
          "links": [
            {
              "label": "정부24 본인서명사실확인서 발급",
              "url": "https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13110000047&HighCtgCD=A01008",
              "type": "official"
            },
            {
              "label": "의왕시 전자본인서명확인서 안내",
              "url": "https://www.uiwang.go.kr/UWKORMIN0802",
              "type": "official"
            }
          ],
          "completion_criteria": "제출처가 받는 서류를 해당 발급 방법으로 발급받았다. 보관 위치 메모는 선택이다."
        }
      ],
      "warnings": [],
      "repeatRules": []
    }
  },
  {
    "version": "flowme-reviewed-source-v1:real-kdca-travel-health-check:ca4e246486e6b308fa017266f9b56089482e0244a3e772d3e480b5189c88d395",
    "sourceFlowId": "flow-real-kdca-travel-health-check",
    "sourceSlug": "real-kdca-travel-health-check",
    "bundleSha256": "ca4e246486e6b308fa017266f9b56089482e0244a3e772d3e480b5189c88d395",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "flow-real-kdca-travel-health-check",
        "slug": "real-kdca-travel-health-check",
        "title": "질병관리청 해외여행 건강 Flow",
        "description": "질병관리청 해외여행 건강수칙을 참고합니다. 적용 대상과 필요한 조치는 공식 안내 및 의료진에게 확인합니다.",
        "category": "여행",
        "structure_type": "timeline",
        "content_type": "default",
        "anchor_type": "end_date",
        "status": "published",
        "source_status": "real",
        "source_precision": "exact",
        "source_title": "질병관리청 해외여행 전 건강정보",
        "source_url": "https://kdca.go.kr/kdca/4916/subview.do",
        "source_checked_at": "2026-10-10",
        "conversion_note": "출국 전 감염병 위험·필요한 예방접종 상담·약과 위생 수칙은 원문 안내를 따릅니다. 귀국 후 발열 진료 조건은 원문과 공식 귀국 후 상세를 구분해 참고합니다. 메모 양식과 상담 예약일은 개인 계획이며 고정 일정이나 반복을 만들지 않습니다.",
        "risk_level": "medical_sensitive",
        "warning": "예방접종, 약 복용, 진료 판단은 의료진 상담을 우선하세요.",
        "owner_user_id": "channel-travelholic",
        "creator_name": "여행에미치다",
        "creator_role": "여행 준비 채널",
        "creator_note": "여행 준비물, 예약, 현지 실행 콘텐츠를 출발일 기준 Flow로 전환합니다.",
        "usage_count": 0,
        "copy_count": 0,
        "tags": [
          "여행",
          "건강",
          "공식출처"
        ],
        "created_at": "2026-05-21T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 질병관리청 해외여행 건강 Flow\n\n## 출국 전 건강 확인\n- 방문 국가 감염병 위험 확인\n  description: 질병관리청 해외여행 전 건강정보 기준으로 실행할 항목입니다.\n  why: 국가와 지역에 따라 필요한 예방 조치와 상담 시점이 달라집니다.\n  how: 질병관리청 해외여행 건강정보에서 방문 국가의 감염병 위험을 확인합니다.\n  done: 방문 국가의 감염병 위험을 확인했습니다. 확인일 메모는 선택입니다.\n  caution: 예방접종, 약 복용, 진료 판단은 의료진 상담을 우선하세요.\n  link: 질병관리청 해외여행 전 건강정보 | https://kdca.go.kr/kdca/4916/subview.do | official\n- 필요 예방접종과 상담 일정 확인\n  description: 질병관리청 해외여행 전 건강정보 기준으로 실행할 항목입니다.\n  why: 예방접종이 필요한 경우에는 최소 2개월 전부터 준비해야 합니다. 필요한 조치와 상담 시점은 방문 지역과 개인 조건에 따라 확인합니다.\n  how: 방문 국가·지역에 필요한 예방접종과 말라리아 예방약 등을 확인하고, 필요시 의사와 상담할 일정을 정합니다.\n  done: 공식 준비 조건과 필요한 상담 여부를 확인하고, 상담이 필요하면 일정을 정했습니다.\n  caution: 예방접종, 약 복용, 진료 판단은 의료진 상담을 우선하세요.\n  link: 질병관리청 해외여행 전 건강정보 | https://kdca.go.kr/kdca/4916/subview.do | official\n\n## 여행 중 기록\n- 복용약과 구급약 준비\n  description: 질병관리청 해외여행 전 건강정보 기준으로 실행할 항목입니다.\n  why: 여행 중 기존 약을 놓치거나 기본 약이 없으면 현지 대응이 어려울 수 있습니다.\n  how: 기존 복용약과 필요한 구급약을 확인합니다. 말라리아 유행국가·지역에 가는 경우 예방약 필요 여부와 복용 시점은 의사에게 확인합니다. 기존 목록·보관 메모는 개인 기록입니다.\n  done: 기존 복용약과 필요한 구급약을 준비했습니다. 짐 목록에 적는 것은 선택입니다.\n  caution: 말라리아 예방약은 의사 처방이 필요합니다. 원문은 최소 일주일 전 복용과 유행지역 출발 1~2주 전 복용을 각각 안내합니다. 이 문구를 모든 약의 D-7 일정으로 적용하지 않습니다.\n  link: 질병관리청 해외여행 전 건강정보 | https://kdca.go.kr/kdca/4916/subview.do | official\n- 물과 음식 위생 수칙 정리\n  description: 질병관리청 해외여행 전 건강정보 기준으로 실행할 항목입니다.\n  why: 여행 중 감염 위험은 물, 음식, 손 위생에서 많이 발생합니다.\n  how: 공식 물·음식·손 위생 수칙을 확인하고, 필요한 내용만 선택적으로 개인 여행 메모에 적습니다.\n  done: 공식 물·음식 위생 수칙을 확인했습니다. 개인 여행 메모는 필요한 경우에만 정리했습니다.\n  caution: 예방접종, 약 복용, 진료 판단은 의료진 상담을 우선하세요.\n  link: 질병관리청 해외여행 전 건강정보 | https://kdca.go.kr/kdca/4916/subview.do | official\n- 귀국 후 증상 발생 시 기록과 진료 계획 세우기\n  description: 귀국 후 증상이 생겼을 때의 공식 진료 조건을 확인하고, 설명에 필요한 정보를 선택 개인 메모로 정리합니다.\n  why: 말라리아 위험 지역 여행 뒤 발열 등 공식 안내의 증상이 생기면 즉시 진료받고 여행력을 알려야 합니다. 기록 양식 준비는 개인 선택입니다.\n  how: 공식 안내의 증상이 생기면 기록을 마칠 때까지 기다리지 말고 즉시 진료받아 여행력을 말합니다. 방문 지역·증상 시작일·음식·접촉 정보는 필요한 경우 설명을 돕는 개인 메모입니다.\n  done: 공식 진료 조건과 필요할 때 쓸 개인 메모 항목을 구분해 확인했습니다.\n  caution: 말라리아 유행지역 여행 중 또는 귀국 후 2달 이내 발열이면 원문은 즉시 병원 방문을 안내합니다. 귀국 후 공식 보충은 위험 지역 여행 뒤 1년까지 열·독감 같은 증상이 생기면 즉시 의사를 찾아 여행력을 말하도록 안내합니다. 2달이 지나면 안전하다는 뜻이 아닙니다.\n  link: 질병관리청 해외여행 전 건강정보 | https://kdca.go.kr/kdca/4916/subview.do | official\n  link: 질병관리청 해외여행 후 건강정보 | https://kdca.go.kr/kdca/4918/subview.do | official"
      },
      "sections": [
        {
          "id": "flow-real-kdca-travel-health-check-section-1",
          "flow_id": "flow-real-kdca-travel-health-check",
          "title": "출국 전 건강 확인",
          "order": 1
        },
        {
          "id": "flow-real-kdca-travel-health-check-section-2",
          "flow_id": "flow-real-kdca-travel-health-check",
          "title": "여행 중 기록",
          "order": 2
        }
      ],
      "items": [
        {
          "id": "flow-real-kdca-travel-health-check-item-1",
          "flow_id": "flow-real-kdca-travel-health-check",
          "section_id": "flow-real-kdca-travel-health-check-section-1",
          "title": "방문 국가 감염병 위험 확인",
          "type": "calendar",
          "source_type": "official",
          "risk_level": "medical_sensitive",
          "order": 1,
          "description": "질병관리청 해외여행 전 건강정보 기준으로 실행할 항목입니다."
        },
        {
          "id": "flow-real-kdca-travel-health-check-item-2",
          "flow_id": "flow-real-kdca-travel-health-check",
          "section_id": "flow-real-kdca-travel-health-check-section-1",
          "title": "필요 예방접종과 상담 일정 확인",
          "type": "calendar",
          "source_type": "official",
          "risk_level": "medical_sensitive",
          "order": 2,
          "description": "질병관리청 해외여행 전 건강정보 기준으로 실행할 항목입니다."
        },
        {
          "id": "flow-real-kdca-travel-health-check-item-3",
          "flow_id": "flow-real-kdca-travel-health-check",
          "section_id": "flow-real-kdca-travel-health-check-section-2",
          "title": "복용약과 구급약 준비",
          "type": "calendar",
          "source_type": "official",
          "risk_level": "medical_sensitive",
          "order": 3,
          "description": "질병관리청 해외여행 전 건강정보 기준으로 실행할 항목입니다."
        },
        {
          "id": "flow-real-kdca-travel-health-check-item-4",
          "flow_id": "flow-real-kdca-travel-health-check",
          "section_id": "flow-real-kdca-travel-health-check-section-2",
          "title": "물과 음식 위생 수칙 정리",
          "type": "calendar",
          "source_type": "official",
          "risk_level": "medical_sensitive",
          "order": 4,
          "description": "질병관리청 해외여행 전 건강정보 기준으로 실행할 항목입니다."
        },
        {
          "id": "flow-real-kdca-travel-health-check-item-5",
          "flow_id": "flow-real-kdca-travel-health-check",
          "section_id": "flow-real-kdca-travel-health-check-section-2",
          "title": "귀국 후 증상 발생 시 기록과 진료 계획 세우기",
          "type": "calendar",
          "source_type": "official",
          "risk_level": "medical_sensitive",
          "order": 5,
          "description": "귀국 후 증상이 생겼을 때의 공식 진료 조건을 확인하고, 설명에 필요한 정보를 선택 개인 메모로 정리합니다."
        }
      ],
      "itemDetails": [
        {
          "item_id": "flow-real-kdca-travel-health-check-item-1",
          "why": "국가와 지역에 따라 필요한 예방 조치와 상담 시점이 달라집니다.",
          "how": "질병관리청 해외여행 건강정보에서 방문 국가의 감염병 위험을 확인합니다.",
          "completion_criteria": "방문 국가의 감염병 위험을 확인했습니다. 확인일 메모는 선택입니다.",
          "caution": "예방접종, 약 복용, 진료 판단은 의료진 상담을 우선하세요.",
          "links": [
            {
              "label": "질병관리청 해외여행 전 건강정보",
              "url": "https://kdca.go.kr/kdca/4916/subview.do",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-real-kdca-travel-health-check-item-2",
          "why": "예방접종이 필요한 경우에는 최소 2개월 전부터 준비해야 합니다. 필요한 조치와 상담 시점은 방문 지역과 개인 조건에 따라 확인합니다.",
          "how": "방문 국가·지역에 필요한 예방접종과 말라리아 예방약 등을 확인하고, 필요시 의사와 상담할 일정을 정합니다.",
          "completion_criteria": "공식 준비 조건과 필요한 상담 여부를 확인하고, 상담이 필요하면 일정을 정했습니다.",
          "caution": "예방접종, 약 복용, 진료 판단은 의료진 상담을 우선하세요.",
          "links": [
            {
              "label": "질병관리청 해외여행 전 건강정보",
              "url": "https://kdca.go.kr/kdca/4916/subview.do",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-real-kdca-travel-health-check-item-3",
          "why": "여행 중 기존 약을 놓치거나 기본 약이 없으면 현지 대응이 어려울 수 있습니다.",
          "how": "기존 복용약과 필요한 구급약을 확인합니다. 말라리아 유행국가·지역에 가는 경우 예방약 필요 여부와 복용 시점은 의사에게 확인합니다. 기존 목록·보관 메모는 개인 기록입니다.",
          "completion_criteria": "기존 복용약과 필요한 구급약을 준비했습니다. 짐 목록에 적는 것은 선택입니다.",
          "caution": "말라리아 예방약은 의사 처방이 필요합니다. 원문은 최소 일주일 전 복용과 유행지역 출발 1~2주 전 복용을 각각 안내합니다. 이 문구를 모든 약의 D-7 일정으로 적용하지 않습니다.",
          "links": [
            {
              "label": "질병관리청 해외여행 전 건강정보",
              "url": "https://kdca.go.kr/kdca/4916/subview.do",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-real-kdca-travel-health-check-item-4",
          "why": "여행 중 감염 위험은 물, 음식, 손 위생에서 많이 발생합니다.",
          "how": "공식 물·음식·손 위생 수칙을 확인하고, 필요한 내용만 선택적으로 개인 여행 메모에 적습니다.",
          "completion_criteria": "공식 물·음식 위생 수칙을 확인했습니다. 개인 여행 메모는 필요한 경우에만 정리했습니다.",
          "caution": "예방접종, 약 복용, 진료 판단은 의료진 상담을 우선하세요.",
          "links": [
            {
              "label": "질병관리청 해외여행 전 건강정보",
              "url": "https://kdca.go.kr/kdca/4916/subview.do",
              "type": "official"
            }
          ]
        },
        {
          "item_id": "flow-real-kdca-travel-health-check-item-5",
          "why": "말라리아 위험 지역 여행 뒤 발열 등 공식 안내의 증상이 생기면 즉시 진료받고 여행력을 알려야 합니다. 기록 양식 준비는 개인 선택입니다.",
          "how": "공식 안내의 증상이 생기면 기록을 마칠 때까지 기다리지 말고 즉시 진료받아 여행력을 말합니다. 방문 지역·증상 시작일·음식·접촉 정보는 필요한 경우 설명을 돕는 개인 메모입니다.",
          "completion_criteria": "공식 진료 조건과 필요할 때 쓸 개인 메모 항목을 구분해 확인했습니다.",
          "caution": "말라리아 유행지역 여행 중 또는 귀국 후 2달 이내 발열이면 원문은 즉시 병원 방문을 안내합니다. 귀국 후 공식 보충은 위험 지역 여행 뒤 1년까지 열·독감 같은 증상이 생기면 즉시 의사를 찾아 여행력을 말하도록 안내합니다. 2달이 지나면 안전하다는 뜻이 아닙니다.",
          "links": [
            {
              "label": "질병관리청 해외여행 전 건강정보",
              "url": "https://kdca.go.kr/kdca/4916/subview.do",
              "type": "official"
            },
            {
              "label": "질병관리청 해외여행 후 건강정보",
              "url": "https://kdca.go.kr/kdca/4918/subview.do",
              "type": "official"
            }
          ]
        }
      ]
    }
  },
  {
    "version": "flowme-reviewed-source-v1:blog-youtube-start:6d1882d5283334919a6fbd91915db7b6a79f2f8d8060a31b7503be25bbde386a",
    "sourceFlowId": "creator-260601-blog-youtube-start",
    "sourceSlug": "blog-youtube-start",
    "bundleSha256": "6d1882d5283334919a6fbd91915db7b6a79f2f8d8060a31b7503be25bbde386a",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "creator-260601-blog-youtube-start",
        "slug": "blog-youtube-start",
        "title": "블로그 글을 영상으로 옮기기 Flow",
        "description": "이미 쓴 블로그 글 한 편을 영상 대본으로 다듬고, 발행한 글과 영상을 서로 연결합니다.",
        "category": "콘텐츠 창작",
        "structure_type": "checklist",
        "anchor_type": "none",
        "status": "published",
        "risk_level": "low",
        "primary_destination": "memo",
        "source_title": "브런치스토리 @skychang44 – 블로그를 활용해 유튜브 쉽게 시작하는 법",
        "source_url": "https://brunch.co.kr/@skychang44/346",
        "source_status": "real",
        "source_precision": "exact",
        "source_checked_at": "2026-10-10",
        "conversion_note": "기존 블로그 글을 영상 대본으로 바꾸고, 완성한 영상과 원문 글을 서로 연결하는 순서로 정리했습니다.",
        "tags": [
          "블로그",
          "유튜브",
          "콘텐츠창작",
          "reference"
        ],
        "content_type": "default",
        "created_at": "2026-06-01T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 블로그 글을 영상으로 옮기기 Flow\n\n## 1. 옮길 글 고르기\n- 영상으로 옮길 기존 블로그 글 한 편 고르기\n  why: 원문은 이미 쓴 블로그 글을 영상의 내용과 대본으로 재사용하는 방법을 설명합니다.\n  done: 영상으로 옮길 기존 글 한 편을 골랐다.\n  link: 브런치 블로그+유튜브 시작 가이드 | https://brunch.co.kr/@skychang44/346 | reference\n\n## 2. 말하는 대본으로 다듬기\n- 기존 글을 영상 스크립트로 다듬기\n  how: 기존 블로그 글의 내용을 영상 스크립트로 다듬습니다.\n  done: 촬영할 대본을 완성했다.\n- 대본을 영상으로 촬영해 발행하기\n  done: 영상을 촬영해 발행했다.\n\n## 3. 두 콘텐츠 연결\n- 블로그 글에는 영상을, 영상 설명에는 블로그 링크를 넣기\n  done: 글과 영상에서 서로 이동할 수 있게 연결했다.",
        "owner_user_id": "user-flow-curation",
        "creator_name": "FLOW 큐레이션팀",
        "creator_role": "경험 콘텐츠 큐레이터",
        "creator_note": "반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.",
        "usage_count": 3576,
        "copy_count": 870
      },
      "sections": [
        {
          "id": "creator-260601-blog-youtube-start-section-0",
          "flow_id": "creator-260601-blog-youtube-start",
          "title": "1. 옮길 글 고르기",
          "order": 0
        },
        {
          "id": "creator-260601-blog-youtube-start-section-1",
          "flow_id": "creator-260601-blog-youtube-start",
          "title": "2. 말하는 대본으로 다듬기",
          "order": 1
        },
        {
          "id": "creator-260601-blog-youtube-start-section-2",
          "flow_id": "creator-260601-blog-youtube-start",
          "title": "3. 두 콘텐츠 연결",
          "order": 2
        }
      ],
      "items": [
        {
          "id": "creator-260601-blog-youtube-start-item-0",
          "flow_id": "creator-260601-blog-youtube-start",
          "section_id": "creator-260601-blog-youtube-start-section-0",
          "title": "영상으로 옮길 기존 블로그 글 한 편 고르기",
          "type": "todo",
          "source_type": "reference",
          "order": 0
        },
        {
          "id": "creator-260601-blog-youtube-start-item-1",
          "flow_id": "creator-260601-blog-youtube-start",
          "section_id": "creator-260601-blog-youtube-start-section-1",
          "title": "기존 글을 영상 스크립트로 다듬기",
          "type": "todo",
          "source_type": "reference",
          "order": 1
        },
        {
          "id": "creator-260601-blog-youtube-start-item-2",
          "flow_id": "creator-260601-blog-youtube-start",
          "section_id": "creator-260601-blog-youtube-start-section-1",
          "title": "대본을 영상으로 촬영해 발행하기",
          "type": "todo",
          "source_type": "reference",
          "order": 2
        },
        {
          "id": "creator-260601-blog-youtube-start-item-3",
          "flow_id": "creator-260601-blog-youtube-start",
          "section_id": "creator-260601-blog-youtube-start-section-2",
          "title": "블로그 글에는 영상을, 영상 설명에는 블로그 링크를 넣기",
          "type": "todo",
          "source_type": "reference",
          "order": 3
        }
      ],
      "itemDetails": [
        {
          "item_id": "creator-260601-blog-youtube-start-item-0",
          "why": "원문은 이미 쓴 블로그 글을 영상의 내용과 대본으로 재사용하는 방법을 설명합니다.",
          "completion_criteria": "영상으로 옮길 기존 글 한 편을 골랐다.",
          "links": [
            {
              "label": "브런치 블로그+유튜브 시작 가이드",
              "url": "https://brunch.co.kr/@skychang44/346",
              "type": "reference"
            }
          ]
        },
        {
          "item_id": "creator-260601-blog-youtube-start-item-1",
          "how": "기존 블로그 글의 내용을 영상 스크립트로 다듬습니다.",
          "completion_criteria": "촬영할 대본을 완성했다."
        },
        {
          "item_id": "creator-260601-blog-youtube-start-item-2",
          "completion_criteria": "영상을 촬영해 발행했다."
        },
        {
          "item_id": "creator-260601-blog-youtube-start-item-3",
          "completion_criteria": "글과 영상에서 서로 이동할 수 있게 연결했다."
        }
      ],
      "warnings": [],
      "repeatRules": []
    }
  },
  {
    "version": "flowme-reviewed-source-v1:closet-organize-1day:a8f885775fbdebd7e225fa2f16d901e1585539e0af8507c01f0bf597918b1123",
    "sourceFlowId": "creator-260601-closet-organize-1day",
    "sourceSlug": "closet-organize-1day",
    "bundleSha256": "a8f885775fbdebd7e225fa2f16d901e1585539e0af8507c01f0bf597918b1123",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "creator-260601-closet-organize-1day",
        "slug": "closet-organize-1day",
        "title": "옷장 정리 Flow",
        "description": "오늘의집 \"미니멀 옷장 정리! 옷 비우는 기준과 잘 버리는 방법\" 가이드를 바탕으로 옷장을 비우고, 분류하고, 되돌려 넣는 정리를 실행합니다.",
        "category": "정리/수납",
        "structure_type": "checklist",
        "anchor_type": "none",
        "status": "published",
        "source_status": "real",
        "source_precision": "exact",
        "source_checked_at": "2026-10-10",
        "risk_level": "low",
        "primary_destination": "memo",
        "source_title": "오늘의집 – 미니멀 옷장 정리! 옷 비우는 기준과 잘 버리는 방법",
        "source_url": "https://ohou.se/advices/7406",
        "conversion_note": "현재 오늘의집 원문의 개인별 비움 기준, 유예·중고·기부·수거 분류, 가족·계절별 배치 사례만 옷장 비우기→분류→되돌려 넣기 체크리스트로 전환했습니다.",
        "tags": [
          "정리",
          "수납",
          "옷장",
          "reference"
        ],
        "content_type": "default",
        "created_at": "2026-06-01T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 옷장 정리 Flow\n\n## 1. 비울 기준 준비\n- 비움 기준과 유예기간 정하기\n  why: 원문은 1년을 예로 들지만 3년·5년처럼 각자 상황에 맞는 기준과 유예기간을 먼저 정하라고 안내합니다.\n  how: 입지 않은 기간, 현재 몸에 맞는지, 내일 바로 입고 나갈 수 있는지를 기준으로 남길지 다시 볼지 정합니다.\n  done: 비움 기준과 유예기간을 정했다.\n  link: 오늘의집 옷장 정리 가이드 | https://ohou.se/advices/7406 | reference\n- 분류용 박스나 봉투 미리 나누기\n  how: 남김, 유예, 중고거래, 기부, 폐의류 수거처럼 실제 처리 방법별로 박스나 봉투를 준비합니다.\n  done: 분류할 자리와 봉투를 준비했다.\n\n## 2. 분류하기\n- 옷을 꺼내 남김·유예·처분으로 분류하기\n  how: 정한 기준으로 옷을 하나씩 보고, 망설여지는 옷은 바로 버리지 말고 유예 묶음에 둡니다.\n  done: 꺼낸 옷을 처리 방법별로 나눴다.\n- 남길 옷을 사람·계절·종류별로 묶기\n  how: 가족 옷은 사람별로 구역을 나누고, 지난 계절 옷은 별도 보관할지 정합니다. 자주 입는 옷은 꺼내기 쉬운 위치에 둡니다.\n  done: 남길 옷의 구역과 위치를 정했다.\n\n## 3. 넣기·처분\n- 정한 위치로 옷 되돌려 넣기\n  how: 걸어둘 옷, 바구니에 넣을 옷, 지난 계절 보관함을 나눠 정한 구역에 넣습니다.\n  done: 남길 옷을 정한 위치에 모두 넣었다.\n- 비울 옷의 처리 방법 정하기\n  how: 상태에 따라 중고거래, 지인 나눔, 기부, 폐의류 수거 중 처리 방법을 정합니다.\n  done: 비울 옷마다 처리 방법을 정했다.",
        "owner_user_id": "user-flow-curation",
        "creator_name": "FLOW 큐레이션팀",
        "creator_role": "경험 콘텐츠 큐레이터",
        "creator_note": "반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.",
        "usage_count": 3264,
        "copy_count": 792
      },
      "sections": [
        {
          "id": "creator-260601-closet-organize-1day-section-0",
          "flow_id": "creator-260601-closet-organize-1day",
          "title": "1. 비울 기준 준비",
          "order": 0
        },
        {
          "id": "creator-260601-closet-organize-1day-section-1",
          "flow_id": "creator-260601-closet-organize-1day",
          "title": "2. 분류하기",
          "order": 1
        },
        {
          "id": "creator-260601-closet-organize-1day-section-2",
          "flow_id": "creator-260601-closet-organize-1day",
          "title": "3. 넣기·처분",
          "order": 2
        }
      ],
      "items": [
        {
          "id": "creator-260601-closet-organize-1day-item-0",
          "flow_id": "creator-260601-closet-organize-1day",
          "section_id": "creator-260601-closet-organize-1day-section-0",
          "title": "비움 기준과 유예기간 정하기",
          "type": "todo",
          "source_type": "reference",
          "order": 0
        },
        {
          "id": "creator-260601-closet-organize-1day-item-1",
          "flow_id": "creator-260601-closet-organize-1day",
          "section_id": "creator-260601-closet-organize-1day-section-0",
          "title": "분류용 박스나 봉투 미리 나누기",
          "type": "todo",
          "source_type": "reference",
          "order": 1
        },
        {
          "id": "creator-260601-closet-organize-1day-item-2",
          "flow_id": "creator-260601-closet-organize-1day",
          "section_id": "creator-260601-closet-organize-1day-section-1",
          "title": "옷을 꺼내 남김·유예·처분으로 분류하기",
          "type": "todo",
          "source_type": "reference",
          "order": 2
        },
        {
          "id": "creator-260601-closet-organize-1day-item-3",
          "flow_id": "creator-260601-closet-organize-1day",
          "section_id": "creator-260601-closet-organize-1day-section-1",
          "title": "남길 옷을 사람·계절·종류별로 묶기",
          "type": "todo",
          "source_type": "reference",
          "order": 3
        },
        {
          "id": "creator-260601-closet-organize-1day-item-4",
          "flow_id": "creator-260601-closet-organize-1day",
          "section_id": "creator-260601-closet-organize-1day-section-2",
          "title": "정한 위치로 옷 되돌려 넣기",
          "type": "todo",
          "source_type": "reference",
          "order": 4
        },
        {
          "id": "creator-260601-closet-organize-1day-item-5",
          "flow_id": "creator-260601-closet-organize-1day",
          "section_id": "creator-260601-closet-organize-1day-section-2",
          "title": "비울 옷의 처리 방법 정하기",
          "type": "todo",
          "source_type": "reference",
          "order": 5
        }
      ],
      "itemDetails": [
        {
          "item_id": "creator-260601-closet-organize-1day-item-0",
          "why": "원문은 1년을 예로 들지만 3년·5년처럼 각자 상황에 맞는 기준과 유예기간을 먼저 정하라고 안내합니다.",
          "how": "입지 않은 기간, 현재 몸에 맞는지, 내일 바로 입고 나갈 수 있는지를 기준으로 남길지 다시 볼지 정합니다.",
          "completion_criteria": "비움 기준과 유예기간을 정했다.",
          "links": [
            {
              "label": "오늘의집 옷장 정리 가이드",
              "url": "https://ohou.se/advices/7406",
              "type": "reference"
            }
          ]
        },
        {
          "item_id": "creator-260601-closet-organize-1day-item-1",
          "how": "남김, 유예, 중고거래, 기부, 폐의류 수거처럼 실제 처리 방법별로 박스나 봉투를 준비합니다.",
          "completion_criteria": "분류할 자리와 봉투를 준비했다."
        },
        {
          "item_id": "creator-260601-closet-organize-1day-item-2",
          "how": "정한 기준으로 옷을 하나씩 보고, 망설여지는 옷은 바로 버리지 말고 유예 묶음에 둡니다.",
          "completion_criteria": "꺼낸 옷을 처리 방법별로 나눴다."
        },
        {
          "item_id": "creator-260601-closet-organize-1day-item-3",
          "how": "가족 옷은 사람별로 구역을 나누고, 지난 계절 옷은 별도 보관할지 정합니다. 자주 입는 옷은 꺼내기 쉬운 위치에 둡니다.",
          "completion_criteria": "남길 옷의 구역과 위치를 정했다."
        },
        {
          "item_id": "creator-260601-closet-organize-1day-item-4",
          "how": "걸어둘 옷, 바구니에 넣을 옷, 지난 계절 보관함을 나눠 정한 구역에 넣습니다.",
          "completion_criteria": "남길 옷을 정한 위치에 모두 넣었다."
        },
        {
          "item_id": "creator-260601-closet-organize-1day-item-5",
          "how": "상태에 따라 중고거래, 지인 나눔, 기부, 폐의류 수거 중 처리 방법을 정합니다.",
          "completion_criteria": "비울 옷마다 처리 방법을 정했다."
        }
      ],
      "warnings": [],
      "repeatRules": []
    }
  },
  {
    "version": "flowme-reviewed-source-v1:kitchen-reset-organize:5d0d18c1d9f719d205728bd2e77db9e7da6bba2b7bef46e93d077c21819075f0",
    "sourceFlowId": "creator-260601-kitchen-reset-organize",
    "sourceSlug": "kitchen-reset-organize",
    "bundleSha256": "5d0d18c1d9f719d205728bd2e77db9e7da6bba2b7bef46e93d077c21819075f0",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "creator-260601-kitchen-reset-organize",
        "slug": "kitchen-reset-organize",
        "title": "냉장고 식재료 정리 Flow",
        "description": "오늘의집 냉장고 정리 원문에 맞춰 식재료 상태를 확인하고, 보이는 용기와 사용 빈도로 자리를 다시 잡습니다.",
        "category": "정리/수납",
        "structure_type": "checklist",
        "anchor_type": "none",
        "status": "published",
        "risk_level": "low",
        "primary_destination": "memo",
        "source_title": "오늘의집 – 보관 기간 늘려주는 냉장고 정리 노하우",
        "source_url": "https://ohou.se/advices/8631",
        "source_status": "real",
        "source_precision": "exact",
        "source_checked_at": "2026-10-10",
        "conversion_note": "원문의 냉장고 식재료 상태 확인, 보이는 용기, 사용 순서별 배치와 냉동 소분을 체크리스트로 옮겼습니다.",
        "tags": [
          "정리",
          "주방",
          "수납",
          "reference"
        ],
        "content_type": "default",
        "created_at": "2026-06-01T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 냉장고 식재료 정리 Flow\n\n## 1. 식재료 상태 확인\n- 냉장고에서 정리가 필요한 식재료와 상태 확인하기\n  why: 원문은 냉장고를 열어 정리가 필요한 식재료와 상태를 먼저 확인하도록 제안합니다.\n  how: 정리가 필요한 식재료와 상태를 확인합니다. 제품 표시와 보관 상태를 먼저 확인합니다.\n  done: 정리할 식재료를 구분했다.\n  link: 오늘의집 냉장고 정리 가이드 | https://ohou.se/advices/8631 | reference\n\n## 2. 보이게 다시 넣기\n- 식재료를 내용이 보이는 용기나 구역으로 나누기\n  how: 식품과 용기에 표시된 보관 방법을 지키면서, 내용이 보이는 용기와 바구니로 구역을 나눕니다.\n  done: 식재료 종류별 자리를 정했다.\n- 사용 빈도에 따라 식재료 수납 칸 정하기\n  how: 자주 꺼내는 반찬은 가운데, 덜 쓰는 재료는 윗칸, 아이 간식은 아래쪽에 둡니다.\n  done: 사용 빈도에 따라 식재료 수납 칸을 정했다.\n- 내용이 보이는 냉동용 용기에 식재료 소분하기\n  how: 냉동용 용기나 두꺼운 지퍼백을 사용하고 내용이 가려지지 않게 소분해 보관합니다.\n  done: 냉동 식재료를 찾을 수 있게 정리했다.",
        "owner_user_id": "user-flow-curation",
        "creator_name": "FLOW 큐레이션팀",
        "creator_role": "경험 콘텐츠 큐레이터",
        "creator_note": "반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.",
        "usage_count": 3288,
        "copy_count": 798
      },
      "sections": [
        {
          "id": "creator-260601-kitchen-reset-organize-section-0",
          "flow_id": "creator-260601-kitchen-reset-organize",
          "title": "1. 식재료 상태 확인",
          "order": 0
        },
        {
          "id": "creator-260601-kitchen-reset-organize-section-1",
          "flow_id": "creator-260601-kitchen-reset-organize",
          "title": "2. 보이게 다시 넣기",
          "order": 1
        }
      ],
      "items": [
        {
          "id": "creator-260601-kitchen-reset-organize-item-0",
          "flow_id": "creator-260601-kitchen-reset-organize",
          "section_id": "creator-260601-kitchen-reset-organize-section-0",
          "title": "냉장고에서 정리가 필요한 식재료와 상태 확인하기",
          "type": "todo",
          "source_type": "reference",
          "order": 0
        },
        {
          "id": "creator-260601-kitchen-reset-organize-item-1",
          "flow_id": "creator-260601-kitchen-reset-organize",
          "section_id": "creator-260601-kitchen-reset-organize-section-1",
          "title": "식재료를 내용이 보이는 용기나 구역으로 나누기",
          "type": "todo",
          "source_type": "reference",
          "order": 1
        },
        {
          "id": "creator-260601-kitchen-reset-organize-item-2",
          "flow_id": "creator-260601-kitchen-reset-organize",
          "section_id": "creator-260601-kitchen-reset-organize-section-1",
          "title": "사용 빈도에 따라 식재료 수납 칸 정하기",
          "type": "todo",
          "source_type": "reference",
          "order": 2
        },
        {
          "id": "creator-260601-kitchen-reset-organize-item-3",
          "flow_id": "creator-260601-kitchen-reset-organize",
          "section_id": "creator-260601-kitchen-reset-organize-section-1",
          "title": "내용이 보이는 냉동용 용기에 식재료 소분하기",
          "type": "todo",
          "source_type": "reference",
          "order": 3
        }
      ],
      "itemDetails": [
        {
          "item_id": "creator-260601-kitchen-reset-organize-item-0",
          "why": "원문은 냉장고를 열어 정리가 필요한 식재료와 상태를 먼저 확인하도록 제안합니다.",
          "how": "정리가 필요한 식재료와 상태를 확인합니다. 제품 표시와 보관 상태를 먼저 확인합니다.",
          "completion_criteria": "정리할 식재료를 구분했다.",
          "links": [
            {
              "label": "오늘의집 냉장고 정리 가이드",
              "url": "https://ohou.se/advices/8631",
              "type": "reference"
            }
          ]
        },
        {
          "item_id": "creator-260601-kitchen-reset-organize-item-1",
          "how": "식품과 용기에 표시된 보관 방법을 지키면서, 내용이 보이는 용기와 바구니로 구역을 나눕니다.",
          "completion_criteria": "식재료 종류별 자리를 정했다."
        },
        {
          "item_id": "creator-260601-kitchen-reset-organize-item-2",
          "how": "자주 꺼내는 반찬은 가운데, 덜 쓰는 재료는 윗칸, 아이 간식은 아래쪽에 둡니다.",
          "completion_criteria": "사용 빈도에 따라 식재료 수납 칸을 정했다."
        },
        {
          "item_id": "creator-260601-kitchen-reset-organize-item-3",
          "how": "냉동용 용기나 두꺼운 지퍼백을 사용하고 내용이 가려지지 않게 소분해 보관합니다.",
          "completion_criteria": "냉동 식재료를 찾을 수 있게 정리했다."
        }
      ],
      "warnings": [],
      "repeatRules": []
    }
  },
  {
    "version": "flowme-reviewed-source-v1:travel-packing-list:9bc87af751d158ac1ce83febd83e8ee3d1f08193638d81c34b604693956d8793",
    "sourceFlowId": "creator-260601-travel-packing-list",
    "sourceSlug": "travel-packing-list",
    "bundleSha256": "9bc87af751d158ac1ce83febd83e8ee3d1f08193638d81c34b604693956d8793",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "creator-260601-travel-packing-list",
        "slug": "travel-packing-list",
        "title": "여행 짐 싸기 체크리스트 Flow",
        "description": "KKday 해외여행 준비물 체크리스트에서 서류·결제·의류·생활용품과 짐 무게 확인 항목을 옮깁니다.",
        "category": "여행",
        "structure_type": "checklist",
        "anchor_type": "none",
        "status": "published",
        "risk_level": "low",
        "primary_destination": "memo",
        "source_title": "KKday Korea – 2026 해외여행 준비물 체크리스트(+짐 싸는 팁)",
        "source_url": "https://www.kkday.com/ko/blog/35618/world-overseatravel-checklist",
        "source_status": "real",
        "source_precision": "exact",
        "source_checked_at": "2026-10-10",
        "conversion_note": "원문의 여행 서류, 결제수단, 의류·세면용품과 짐 무게 확인을 출발 전 체크리스트로 옮겼습니다.",
        "warning": "여권 유효기간, 비자, 기내 반입 제한은 국가·항공사·공항마다 다릅니다. 출발 전 공식 안내를 다시 확인하세요.",
        "tags": [
          "여행",
          "짐싸기",
          "준비",
          "reference"
        ],
        "content_type": "default",
        "created_at": "2026-06-01T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 여행 짐 싸기 체크리스트 Flow\n\n## 필수 서류·결제\n- 해외여행 여권 확인하기\n  done: 여권을 챙겼다.\n  link: KKday 여행 준비물 체크리스트 | https://www.kkday.com/ko/blog/35618/world-overseatravel-checklist | reference\n- 예약 바우처 인쇄 사본 준비하기\n  why: 원문은 예약 바우처의 인쇄 사본을 권고합니다. 실제 이용처가 요구하는 형식은 해당 안내를 확인합니다.\n  done: 예약 바우처 인쇄 사본을 준비했다.\n- 카드·현금(필요시 환전) 확인하기\n  done: 결제 수단을 확인했다.\n\n## 의류·생활용품\n- 필요한 의류 챙기기\n  how: 긴 옷이 필요한지 보고, 옷은 지퍼백에 나눠 챙깁니다.\n  done: 필요한 의류를 챙겼다.\n- 세면도구·충전기·상비약 넣기\n  how: 숙소에 구비된 목욕용품을 확인하고 필요한 용품만 소분합니다. 액체류·의약품 반입 조건은 공항과 항공사 공식 안내에서 확인합니다.\n  done: 세면도구와 충전기를 확인해 넣었다.\n  caution: 액체류와 의약품 반입 기준은 이용 항공사와 공항의 현재 안내를 확인합니다.\n\n## 마지막 확인\n- 짐을 다 싼 뒤 캐리어 무게 확인하기\n  how: 짐을 다 싼 뒤 캐리어 무게를 확인합니다. 10일 이상 여행에서 압축가방을 쓸 수 있다는 원문 팁을 참고합니다.\n  done: 가방 무게를 확인했다.",
        "owner_user_id": "user-flow-curation",
        "creator_name": "FLOW 큐레이션팀",
        "creator_role": "경험 콘텐츠 큐레이터",
        "creator_note": "반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.",
        "usage_count": 3480,
        "copy_count": 846
      },
      "sections": [
        {
          "id": "creator-260601-travel-packing-list-section-0",
          "flow_id": "creator-260601-travel-packing-list",
          "title": "필수 서류·결제",
          "order": 0
        },
        {
          "id": "creator-260601-travel-packing-list-section-1",
          "flow_id": "creator-260601-travel-packing-list",
          "title": "의류·생활용품",
          "order": 1
        },
        {
          "id": "creator-260601-travel-packing-list-section-2",
          "flow_id": "creator-260601-travel-packing-list",
          "title": "마지막 확인",
          "order": 2
        }
      ],
      "items": [
        {
          "id": "creator-260601-travel-packing-list-item-0",
          "flow_id": "creator-260601-travel-packing-list",
          "section_id": "creator-260601-travel-packing-list-section-0",
          "title": "해외여행 여권 확인하기",
          "type": "todo",
          "source_type": "reference",
          "order": 0
        },
        {
          "id": "creator-260601-travel-packing-list-item-1",
          "flow_id": "creator-260601-travel-packing-list",
          "section_id": "creator-260601-travel-packing-list-section-0",
          "title": "예약 바우처 인쇄 사본 준비하기",
          "type": "todo",
          "source_type": "reference",
          "order": 1
        },
        {
          "id": "creator-260601-travel-packing-list-item-2",
          "flow_id": "creator-260601-travel-packing-list",
          "section_id": "creator-260601-travel-packing-list-section-0",
          "title": "카드·현금(필요시 환전) 확인하기",
          "type": "todo",
          "source_type": "reference",
          "order": 2
        },
        {
          "id": "creator-260601-travel-packing-list-item-3",
          "flow_id": "creator-260601-travel-packing-list",
          "section_id": "creator-260601-travel-packing-list-section-1",
          "title": "필요한 의류 챙기기",
          "type": "todo",
          "source_type": "reference",
          "order": 3
        },
        {
          "id": "creator-260601-travel-packing-list-item-4",
          "flow_id": "creator-260601-travel-packing-list",
          "section_id": "creator-260601-travel-packing-list-section-1",
          "title": "세면도구·충전기·상비약 넣기",
          "type": "todo",
          "source_type": "reference",
          "order": 4
        },
        {
          "id": "creator-260601-travel-packing-list-item-5",
          "flow_id": "creator-260601-travel-packing-list",
          "section_id": "creator-260601-travel-packing-list-section-2",
          "title": "짐을 다 싼 뒤 캐리어 무게 확인하기",
          "type": "todo",
          "source_type": "reference",
          "order": 5
        }
      ],
      "itemDetails": [
        {
          "item_id": "creator-260601-travel-packing-list-item-0",
          "completion_criteria": "여권을 챙겼다.",
          "links": [
            {
              "label": "KKday 여행 준비물 체크리스트",
              "url": "https://www.kkday.com/ko/blog/35618/world-overseatravel-checklist",
              "type": "reference"
            }
          ]
        },
        {
          "item_id": "creator-260601-travel-packing-list-item-1",
          "why": "원문은 예약 바우처의 인쇄 사본을 권고합니다. 실제 이용처가 요구하는 형식은 해당 안내를 확인합니다.",
          "completion_criteria": "예약 바우처 인쇄 사본을 준비했다."
        },
        {
          "item_id": "creator-260601-travel-packing-list-item-2",
          "completion_criteria": "결제 수단을 확인했다."
        },
        {
          "item_id": "creator-260601-travel-packing-list-item-3",
          "how": "긴 옷이 필요한지 보고, 옷은 지퍼백에 나눠 챙깁니다.",
          "completion_criteria": "필요한 의류를 챙겼다."
        },
        {
          "item_id": "creator-260601-travel-packing-list-item-4",
          "how": "숙소에 구비된 목욕용품을 확인하고 필요한 용품만 소분합니다. 액체류·의약품 반입 조건은 공항과 항공사 공식 안내에서 확인합니다.",
          "completion_criteria": "세면도구와 충전기를 확인해 넣었다.",
          "caution": "액체류와 의약품 반입 기준은 이용 항공사와 공항의 현재 안내를 확인합니다."
        },
        {
          "item_id": "creator-260601-travel-packing-list-item-5",
          "how": "짐을 다 싼 뒤 캐리어 무게를 확인합니다. 10일 이상 여행에서 압축가방을 쓸 수 있다는 원문 팁을 참고합니다.",
          "completion_criteria": "가방 무게를 확인했다."
        }
      ],
      "warnings": [],
      "repeatRules": []
    }
  },
  {
    "version": "flowme-reviewed-source-v1:portfolio-4week:b3131f43684ae0a298d7801c8c3bd4727a9fb2baf2d40bd1f4dc965a2e457324",
    "sourceFlowId": "creator-260601-portfolio-4week",
    "sourceSlug": "portfolio-4week",
    "bundleSha256": "b3131f43684ae0a298d7801c8c3bd4727a9fb2baf2d40bd1f4dc965a2e457324",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "creator-260601-portfolio-4week",
        "slug": "portfolio-4week",
        "title": "개발 프로젝트 포트폴리오 4주 Flow",
        "description": "제작자의 팀·멘토·코드리뷰를 포함한 수업 사례에서 기획·설계 1주와 개발 3주, 포트폴리오 작성 순서를 참고합니다.",
        "category": "커리어/취업",
        "structure_type": "timeline",
        "anchor_type": "end_date",
        "status": "published",
        "source_status": "real",
        "source_precision": "exact",
        "source_checked_at": "2026-10-10",
        "risk_level": "low",
        "primary_destination": "hybrid",
        "source_title": "Velog @vonvoyage27 – 포트폴리오 4주 만에 준비하기",
        "source_url": "https://velog.io/@vonvoyage27/%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9C%BC%EB%A1%9C-IT-%EA%B0%9C%EB%B0%9C%EC%9E%90%EB%A1%9C-%EC%B7%A8%EC%97%85-%EC%A4%80%EB%B9%84%ED%95%98%EA%B8%B0-%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4-%ED%8E%B8",
        "conversion_note": "원문의 아이템·기술 선정, 기능·페이지 기획, DB/API 설계, 개발·배포, 포트폴리오 작성 순서를 참고합니다. 세부 작업 날짜는 개인 일정입니다.",
        "tags": [
          "커리어",
          "포트폴리오",
          "취업",
          "reference"
        ],
        "content_type": "default",
        "created_at": "2026-06-01T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 개발 프로젝트 포트폴리오 4주 Flow\n\n## 프로젝트 범위 정하기\n- 만들 프로젝트 아이템과 기술 스택 정하기\n  why: 원문은 아이템 선정과 기술 결정을 4주 프로젝트의 첫 단계로 둡니다.\n  how: 구현할 문제와 사용할 기술, 배포 환경을 정리합니다.\n  done: 프로젝트 아이템과 기술 스택을 정했다.\n  link: velog 포트폴리오 4주 준비 가이드 | https://velog.io/@vonvoyage27/%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9C%BC%EB%A1%9C-IT-%EA%B0%9C%EB%B0%9C%EC%9E%90%EB%A1%9C-%EC%B7%A8%EC%97%85-%EC%A4%80%EB%B9%84%ED%95%98%EA%B8%B0-%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4-%ED%8E%B8 | reference\n- 핵심 기능과 3~5개 화면 범위 정하기\n  how: 만들 기능과 3~5개 페이지의 범위를 정리합니다.\n  done: 기능 목록과 화면 범위를 확정했다.\n\n## 기획·설계\n- 페이지 기획과 DB·API 설계 문서 만들기\n  how: 화면 흐름, 데이터 구조, API 목록을 개발 전에 검토할 수 있는 문서로 남깁니다.\n  done: 페이지 기획서와 DB·API 설계 초안을 완성했다.\n\n## 개발·배포\n- 개발 일정을 나누고 핵심 기능 구현 시작하기\n  how: 작업을 일정 보드에 나누고 핵심 기능부터 구현하며 변경 사항을 Git에 남깁니다.\n  done: 정한 핵심 기능이 배포 가능한 상태로 동작한다.\n- 서비스 배포하고 도메인·실행 방법 정리하기\n  done: 배포 주소와 실행 방법, 저장소 링크를 확인했다.\n\n## 포트폴리오 정리\n- 프로젝트 설명·역할·성과·데모 정리하기\n  how: 프로젝트 설명, GitHub와 배포 주소, 기술 스택, 주요 기능, 담당 역할과 성과, 설계 자료와 데모를 정리합니다.\n  done: 프로젝트 설명·역할·성과·설계 자료와 데모를 정리했다.",
        "owner_user_id": "user-flow-curation",
        "creator_name": "FLOW 큐레이션팀",
        "creator_role": "경험 콘텐츠 큐레이터",
        "creator_note": "반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.",
        "usage_count": 3552,
        "copy_count": 864
      },
      "sections": [
        {
          "id": "creator-260601-portfolio-4week-section-0",
          "flow_id": "creator-260601-portfolio-4week",
          "title": "프로젝트 범위 정하기",
          "order": 0
        },
        {
          "id": "creator-260601-portfolio-4week-section-1",
          "flow_id": "creator-260601-portfolio-4week",
          "title": "기획·설계",
          "order": 1
        },
        {
          "id": "creator-260601-portfolio-4week-section-2",
          "flow_id": "creator-260601-portfolio-4week",
          "title": "개발·배포",
          "order": 2
        },
        {
          "id": "creator-260601-portfolio-4week-section-3",
          "flow_id": "creator-260601-portfolio-4week",
          "title": "포트폴리오 정리",
          "order": 3
        }
      ],
      "items": [
        {
          "id": "creator-260601-portfolio-4week-item-0",
          "flow_id": "creator-260601-portfolio-4week",
          "section_id": "creator-260601-portfolio-4week-section-0",
          "title": "만들 프로젝트 아이템과 기술 스택 정하기",
          "type": "todo",
          "source_type": "reference",
          "order": 0
        },
        {
          "id": "creator-260601-portfolio-4week-item-1",
          "flow_id": "creator-260601-portfolio-4week",
          "section_id": "creator-260601-portfolio-4week-section-0",
          "title": "핵심 기능과 3~5개 화면 범위 정하기",
          "type": "todo",
          "source_type": "reference",
          "order": 1
        },
        {
          "id": "creator-260601-portfolio-4week-item-2",
          "flow_id": "creator-260601-portfolio-4week",
          "section_id": "creator-260601-portfolio-4week-section-1",
          "title": "페이지 기획과 DB·API 설계 문서 만들기",
          "type": "todo",
          "source_type": "reference",
          "order": 2
        },
        {
          "id": "creator-260601-portfolio-4week-item-3",
          "flow_id": "creator-260601-portfolio-4week",
          "section_id": "creator-260601-portfolio-4week-section-2",
          "title": "개발 일정을 나누고 핵심 기능 구현 시작하기",
          "type": "todo",
          "source_type": "reference",
          "order": 3
        },
        {
          "id": "creator-260601-portfolio-4week-item-4",
          "flow_id": "creator-260601-portfolio-4week",
          "section_id": "creator-260601-portfolio-4week-section-2",
          "title": "서비스 배포하고 도메인·실행 방법 정리하기",
          "type": "todo",
          "source_type": "reference",
          "order": 4
        },
        {
          "id": "creator-260601-portfolio-4week-item-5",
          "flow_id": "creator-260601-portfolio-4week",
          "section_id": "creator-260601-portfolio-4week-section-3",
          "title": "프로젝트 설명·역할·성과·데모 정리하기",
          "type": "todo",
          "source_type": "reference",
          "order": 5
        }
      ],
      "itemDetails": [
        {
          "item_id": "creator-260601-portfolio-4week-item-0",
          "why": "원문은 아이템 선정과 기술 결정을 4주 프로젝트의 첫 단계로 둡니다.",
          "how": "구현할 문제와 사용할 기술, 배포 환경을 정리합니다.",
          "completion_criteria": "프로젝트 아이템과 기술 스택을 정했다.",
          "links": [
            {
              "label": "velog 포트폴리오 4주 준비 가이드",
              "url": "https://velog.io/@vonvoyage27/%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9C%BC%EB%A1%9C-IT-%EA%B0%9C%EB%B0%9C%EC%9E%90%EB%A1%9C-%EC%B7%A8%EC%97%85-%EC%A4%80%EB%B9%84%ED%95%98%EA%B8%B0-%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4-%ED%8E%B8",
              "type": "reference"
            }
          ]
        },
        {
          "item_id": "creator-260601-portfolio-4week-item-1",
          "how": "만들 기능과 3~5개 페이지의 범위를 정리합니다.",
          "completion_criteria": "기능 목록과 화면 범위를 확정했다."
        },
        {
          "item_id": "creator-260601-portfolio-4week-item-2",
          "how": "화면 흐름, 데이터 구조, API 목록을 개발 전에 검토할 수 있는 문서로 남깁니다.",
          "completion_criteria": "페이지 기획서와 DB·API 설계 초안을 완성했다."
        },
        {
          "item_id": "creator-260601-portfolio-4week-item-3",
          "how": "작업을 일정 보드에 나누고 핵심 기능부터 구현하며 변경 사항을 Git에 남깁니다.",
          "completion_criteria": "정한 핵심 기능이 배포 가능한 상태로 동작한다."
        },
        {
          "item_id": "creator-260601-portfolio-4week-item-4",
          "completion_criteria": "배포 주소와 실행 방법, 저장소 링크를 확인했다."
        },
        {
          "item_id": "creator-260601-portfolio-4week-item-5",
          "how": "프로젝트 설명, GitHub와 배포 주소, 기술 스택, 주요 기능, 담당 역할과 성과, 설계 자료와 데모를 정리합니다.",
          "completion_criteria": "프로젝트 설명·역할·성과·설계 자료와 데모를 정리했다."
        }
      ],
      "warnings": [],
      "repeatRules": []
    }
  },
  {
    "version": "flowme-reviewed-source-v1:morning-routine-30day:4c470e3f1191dd6eb3f004462abebeeffa26e5f2bdfe0b2c3171e13a430ca7a2",
    "sourceFlowId": "creator-260601-morning-routine-30day",
    "sourceSlug": "morning-routine-30day",
    "bundleSha256": "4c470e3f1191dd6eb3f004462abebeeffa26e5f2bdfe0b2c3171e13a430ca7a2",
    "sourceComparison": "passed",
    "bundle": {
      "flow": {
        "id": "creator-260601-morning-routine-30day",
        "slug": "morning-routine-30day",
        "title": "나만의 아침 루틴 시작 Flow",
        "description": "브런치스토리의 모닝루틴 서평에서 제안한 수면 준비, 고정 기상 시간과 내가 하고 싶은 아침 행동을 짧게 시험합니다.",
        "category": "생활습관",
        "structure_type": "routine",
        "anchor_type": "start_date",
        "status": "published",
        "risk_level": "medium",
        "primary_destination": "calendar",
        "source_title": "브런치스토리 @pletalk – 하루를 설레게 만드는 작은 습관, 모닝루틴",
        "source_url": "https://brunch.co.kr/@pletalk/58",
        "source_checked_at": "2026-10-10",
        "conversion_note": "원문에 없는 30일 챌린지와 고정 행동 묶음을 제거하고, 전날 준비·기상 시간·개인이 고른 아침 행동·짧은 회고만 남겼습니다.",
        "tags": [
          "생활습관",
          "아침루틴",
          "자기계발",
          "reference"
        ],
        "content_type": "default",
        "source_status": "needs_review",
        "source_precision": "exact",
        "created_at": "2026-06-01T00:00:00.000Z",
        "updated_at": "2026-07-11T00:00:00.000Z",
        "raw_text": "# 나만의 아침 루틴 시작 Flow\n\n## 전날 저녁\n- 내일 아침에 하고 싶은 일 한 가지 적기\n  why: 원문은 자신을 몰아세우기보다 아침에 기대되는 행동을 먼저 고르라고 제안합니다.\n  done: 내일 아침 행동 한 가지를 적었다.\n  source-repeat: 매일\n  link: 브런치 모닝루틴 가이드 | https://brunch.co.kr/@pletalk/58 | reference\n- 잠을 방해할 행동 한 가지 줄이고 기상 시간 정하기\n  how: 늦은 화면 사용이나 늦은 식사처럼 내 수면을 방해하는 요인 하나를 줄이고, 실제로 유지할 기상 시간을 정합니다.\n  done: 기상 시간과 줄일 행동을 정했다.\n  source-repeat: 매일\n\n## 아침 실행·하루 마무리\n- 정한 시간에 일어나 내가 고른 행동 시작하기\n  done: 오늘 아침 행동을 실행했다.\n  source-repeat: 매일\n- 하루를 마무리하며 아침 루틴의 유지·수정점 적기\n  done: 하루를 돌아보고 다음 아침에 적용할 조정 한 가지를 적었다.\n  source-repeat: 매일",
        "owner_user_id": "user-flow-curation",
        "creator_name": "FLOW 큐레이션팀",
        "creator_role": "경험 콘텐츠 큐레이터",
        "creator_note": "반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.",
        "usage_count": 3600,
        "copy_count": 876
      },
      "sections": [
        {
          "id": "creator-260601-morning-routine-30day-section-0",
          "flow_id": "creator-260601-morning-routine-30day",
          "title": "전날 저녁",
          "order": 0
        },
        {
          "id": "creator-260601-morning-routine-30day-section-1",
          "flow_id": "creator-260601-morning-routine-30day",
          "title": "아침 실행·하루 마무리",
          "order": 1
        }
      ],
      "items": [
        {
          "id": "creator-260601-morning-routine-30day-item-0",
          "flow_id": "creator-260601-morning-routine-30day",
          "section_id": "creator-260601-morning-routine-30day-section-0",
          "title": "내일 아침에 하고 싶은 일 한 가지 적기",
          "type": "todo",
          "repeat_rule": "매일",
          "source_type": "reference",
          "order": 0
        },
        {
          "id": "creator-260601-morning-routine-30day-item-1",
          "flow_id": "creator-260601-morning-routine-30day",
          "section_id": "creator-260601-morning-routine-30day-section-0",
          "title": "잠을 방해할 행동 한 가지 줄이고 기상 시간 정하기",
          "type": "todo",
          "repeat_rule": "매일",
          "source_type": "reference",
          "order": 1
        },
        {
          "id": "creator-260601-morning-routine-30day-item-2",
          "flow_id": "creator-260601-morning-routine-30day",
          "section_id": "creator-260601-morning-routine-30day-section-1",
          "title": "정한 시간에 일어나 내가 고른 행동 시작하기",
          "type": "todo",
          "repeat_rule": "매일",
          "source_type": "reference",
          "order": 2
        },
        {
          "id": "creator-260601-morning-routine-30day-item-3",
          "flow_id": "creator-260601-morning-routine-30day",
          "section_id": "creator-260601-morning-routine-30day-section-1",
          "title": "하루를 마무리하며 아침 루틴의 유지·수정점 적기",
          "type": "todo",
          "repeat_rule": "매일",
          "source_type": "reference",
          "order": 3
        }
      ],
      "itemDetails": [
        {
          "item_id": "creator-260601-morning-routine-30day-item-0",
          "why": "원문은 자신을 몰아세우기보다 아침에 기대되는 행동을 먼저 고르라고 제안합니다.",
          "completion_criteria": "내일 아침 행동 한 가지를 적었다.",
          "links": [
            {
              "label": "브런치 모닝루틴 가이드",
              "url": "https://brunch.co.kr/@pletalk/58",
              "type": "reference"
            }
          ]
        },
        {
          "item_id": "creator-260601-morning-routine-30day-item-1",
          "how": "늦은 화면 사용이나 늦은 식사처럼 내 수면을 방해하는 요인 하나를 줄이고, 실제로 유지할 기상 시간을 정합니다.",
          "completion_criteria": "기상 시간과 줄일 행동을 정했다."
        },
        {
          "item_id": "creator-260601-morning-routine-30day-item-2",
          "completion_criteria": "오늘 아침 행동을 실행했다."
        },
        {
          "item_id": "creator-260601-morning-routine-30day-item-3",
          "completion_criteria": "하루를 돌아보고 다음 아침에 적용할 조정 한 가지를 적었다."
        }
      ],
      "warnings": [],
      "repeatRules": [
        "매일"
      ]
    }
  }
];
