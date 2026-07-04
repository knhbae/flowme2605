export function toContentDisplayTitle(title: string): string {
  const value = title.replace(/\s+/g, ' ').trim();
  if (!value) return '';
  if (value === 'Flow' || value === 'FlowMe' || value === '내 Flow' || value === 'Flow 찾기') return value;
  if (value.endsWith(' Flow')) return value.slice(0, -' Flow'.length).trim();
  if (value.endsWith('Flow')) return value.slice(0, -'Flow'.length).trim();
  return value;
}

export function toUserFacingMapTitle(title: string): string {
  const value = toContentDisplayTitle(title);
  if (!value) return '';
  return value.replace(/\s+일정\s+지도$/u, ' 일정').trim();
}

export function toUserFacingSourceTitle(title: string): string {
  const value = title.replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.replace(/^Mathbang\s+/iu, '').trim();
}
