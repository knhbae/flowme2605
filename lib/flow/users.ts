import { FlowUser } from './types';
import { previewCreatorChannels } from './creator-channel-preview';

export const CURRENT_USER_ID = 'user-my-studio';

export const virtualUsers: FlowUser[] = [
  {
    id: CURRENT_USER_ID,
    slug: 'my-flow-studio',
    name: '내 Flow 스튜디오',
    role: '실행 콘텐츠 제작자',
    bio: '공개 Flow를 복사하거나 직접 작성해 내 실행 방식으로 다듬는 현재 사용자입니다.',
    avatar_initial: '나',
    specialty_tags: ['내 콘텐츠', '복사본', '초안'],
    is_current_user: true,
  },
  {
    id: 'user-flow-curation',
    slug: 'flow-curation-team',
    name: 'FLOW 큐레이션팀',
    role: '경험 콘텐츠 큐레이터',
    bio: '반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.',
    avatar_initial: 'F',
    specialty_tags: ['생활 과제', '공식자료', '실행표'],
  },
  {
    id: 'user-baby-food-record',
    slug: 'baby-food-record-mom',
    name: '초기 이유식 기록맘',
    role: '육아 경험 크리에이터',
    bio: '초기 이유식 시작일 기준 메뉴와 관찰 메모를 정리했습니다.',
    avatar_initial: '이',
    specialty_tags: ['이유식', '식단표', '반응기록'],
  },
  {
    id: 'user-mobility-notes',
    slug: 'mobility-notes',
    name: '차근차근 모빌리티',
    role: '자동차 생활 크리에이터',
    bio: '구매와 관리에서 놓치기 쉬운 확인 순서를 정리합니다.',
    avatar_initial: '차',
    specialty_tags: ['자동차', '구매점검', '관리'],
  },
  {
    id: 'user-study-routine',
    slug: 'study-routine-room',
    name: '루틴 공부방',
    role: '학습 루틴 크리에이터',
    bio: '시험과 자기계발 콘텐츠를 실행 단위로 쪼개 정리합니다.',
    avatar_initial: '공',
    specialty_tags: ['공부', '시험', '루틴'],
  },
  {
    id: 'user-wedding-checkmate',
    slug: 'wedding-checkmate',
    name: '웨딩 체크메이트',
    role: '결혼 준비 경험자',
    bio: '준비 기간별 의사결정과 업체 확인 순서를 정리합니다.',
    avatar_initial: '웨',
    specialty_tags: ['결혼', 'D-Day 준비', '업체 비교'],
  },
  {
    id: 'user-life-routine-coach',
    slug: 'life-routine-coach',
    name: '생활 루틴 코치',
    role: '운동·습관 크리에이터',
    bio: '무리하지 않고 반복할 수 있는 루틴을 실행표로 정리합니다.',
    avatar_initial: '루',
    specialty_tags: ['운동', '습관', '다이어트'],
  },
  {
    id: 'user-admin-note',
    slug: 'admin-life-note',
    name: '생활 행정 노트',
    role: '공식자료 큐레이터',
    bio: '공식 안내를 신청 전 확인 순서로 재구성합니다.',
    avatar_initial: '행',
    specialty_tags: ['서류', '행정', '공식자료'],
  },
  ...previewCreatorChannels,
];

export function getVirtualUser(id?: string): FlowUser | undefined {
  if (!id) return undefined;
  return virtualUsers.find((user) => user.id === id);
}

export function getCurrentUser(): FlowUser {
  return virtualUsers.find((user) => user.id === CURRENT_USER_ID) ?? virtualUsers[0];
}

export function findVirtualUserByName(name?: string): FlowUser | undefined {
  if (!name) return undefined;
  return virtualUsers.find((user) => user.name === name);
}

export function findVirtualUserBySlug(slug: string): FlowUser | undefined {
  return virtualUsers.find((user) => user.slug === slug);
}
