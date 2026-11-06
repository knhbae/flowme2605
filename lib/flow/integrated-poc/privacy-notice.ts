/**
 * R7 저장과 공개 안내: the planning session's settled wording (third edition, 11/3), shown as one sheet from
 * 더보기 › 계정, the development notice and the sign-in screen. It reads nothing from the server and stores nothing.
 * The contact address is not in the repository: the server passes FLOWME_ALPHA_PRIVACY_CONTACT. Without it the sheet
 * and its entry points do not show: the sheet promises deletion within a day, which holds only once the deletion
 * procedure has been practiced (R6), and the operator sets the address then.
 */
export const PRIVACY_NOTICE_TITLE = '저장과 공개 안내';
export const PRIVACY_NOTICE_INTRO = 'FlowMe는 개발 중인 시험판입니다. 쓰는 동안 무엇이 저장되고 누가 보는지 적어 둡니다.';
export const PRIVACY_NOTICE_STORED = [
  'Google 로그인으로 받은 메일 주소. 로그인과 계정 구분에만 씁니다.',
  '내가 쓴 문서, 할 일, 날짜·시간, 체크와 진행률 기록, 폴더, 가져온 Flow 사본.',
  '고친 기록. 되돌리기와 오류 복구에 씁니다.',
  '공개한 Flow, 경험·질문·지식 글과 답글, 글에 올린 사진.',
  '저장하지 못한 입력은 이 기기의 브라우저에 잠깐 보관합니다. 다시 저장하거나 버리면 사라집니다.',
] as const;
export const PRIVACY_NOTICE_READERS = [
  '문서, 할 일, 폴더, 진행률 기록은 나만 봅니다.',
  '공개한 Flow와 경험·질문·지식 글은 로그인한 다른 사용자가 봅니다. 로그인하지 않은 사람에게는 열리지 않습니다.',
  "'해 봤어요'로 남긴 후기도 공개한 글이라 로그인한 다른 사용자가 봅니다.",
  "공개한 글의 작성자는 모두 'FlowMe 참여자'로 보입니다. Google 이름이나 메일 주소는 보이지 않습니다. 이름을 바꾸는 화면은 없습니다.",
  '공개를 내려도 다른 사람이 이미 가져간 사본은 그 사람 문서에 남습니다.',
  '운영자는 오류를 조사할 때, 지워 달라는 요청을 처리할 때, 백업에서 복원할 때만 저장된 내용을 봅니다.',
] as const;
/** The first line of 지워 달라고 할 때 goes before these; see privacyRequestLine. */
export const PRIVACY_NOTICE_DELETION = [
  '요청을 받은 때부터 하루 안에 문서, 할 일, 진행률 기록, 가져온 사본, 고친 기록, 로그인 계정을 지우고 끝났다고 알려 드립니다.',
  // R6 (11/6 decision): public Flows and posts stay when the account goes.
  '계정을 지워도 공개한 글과 Flow는 남습니다. 내리려면 먼저 공개를 철회하세요.',
  '백업 파일에는 글 사본이 최대 4주 동안 남았다가 지워집니다.',
  '접속 기록 원문은 7일 안에 지웁니다. 서비스 제공자(Cloudflare, Supabase)의 기록은 그 회사의 보존 기간을 따릅니다.',
  "공개한 Flow 하나만 내리려면 직접 할 수 있습니다: 문서의 '선택해서 공개' › '공개 상태 관리' › '공개 목록에서 내리기'.",
] as const;
export const PRIVACY_NOTICE_CLOSING = '중요한 자료의 유일본은 넣지 마세요. 시험판이라 오류가 날 수 있습니다.';

/** The configured contact address, or null when it is unset or is not one plain address (the sheet stays hidden).
 *  Plain letters, digits and . _ + - only, so nothing in it can act as part of the mail link (?, #, %, &, /). */
export function readPrivacyContact(value: string | undefined | null): string | null {
  const address = value?.trim() ?? '';
  return /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(address) ? address : null;
}

/** 지워 달라고 할 때, first line, after the address (shown as a mail link). */
export const PRIVACY_NOTICE_REQUEST = ' 으로 "계정 자료를 지워 주세요"라고 보내 주세요. 로그인한 메일 주소를 함께 적어 주세요.';
