import type { FlowBundle } from '../types';

/** Catalog Flows that FlowMe wrote up from a channel's or an agency's material carry that channel as
 *  creator_name, so "작성자: 정부24" read as if the channel wrote this Flow. Those show the two apart;
 *  every other credit reads as before. Display only: the stored fields are unchanged. */
export function catalogCreditLine(flow: Pick<FlowBundle['flow'], 'creator_name' | 'creator_role' | 'owner_user_id'>,
  label: '작성자' | '원래 작성자'): string {
  const name = flow.creator_name;
  if (name && flow.owner_user_id?.startsWith('channel-') && flow.creator_role?.includes('채널')) return `FlowMe 정리 · 원문: ${name}`;
  return `${label}: ${name ?? '표시 없음'}`;
}
