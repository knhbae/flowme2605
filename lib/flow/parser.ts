import { FlowItem, FlowItemDetail, FlowItemLinkType, FlowSection } from './types';

const DAY_OFFSET_PATTERN = /D(?:-Day|[+-]\d+)$/i;
const DAY_RANGE_PATTERN = /D\+\d+~D\+\d+$/i;

export function parseDayOffset(input: string): number | null {
  const value = input.trim();
  if (/^D-Day$/i.test(value)) return 0;

  const match = value.match(/^D([+-])(\d+)$/i);
  if (!match) return null;

  return (match[1] === '-' ? -1 : 1) * Number(match[2]);
}

export function parseDayRange(
  input: string,
): { day_offset: number; duration_days: number } | null {
  const match = input.trim().match(/^D\+(\d+)~D\+(\d+)$/i);
  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end < start) return null;

  return {
    day_offset: start,
    duration_days: end - start + 1,
  };
}

export function timingLabel(dayOffset?: number, durationDays?: number): string {
  if (dayOffset === undefined) return '';
  if (durationDays && durationDays > 1) {
    return `D+${dayOffset}~D+${dayOffset + durationDays - 1}`;
  }
  if (dayOffset === 0) return 'D-Day';
  return dayOffset > 0 ? `D+${dayOffset}` : `D${dayOffset}`;
}

export function parseTextFlow(
  input: string,
  flowId = 'draft',
): {
  sections: FlowSection[];
  items: FlowItem[];
  itemDetails: FlowItemDetail[];
  warnings: string[];
  repeatRules: string[];
} {
  const sections: FlowSection[] = [];
  const items: FlowItem[] = [];
  const itemDetails: FlowItemDetail[] = [];
  const warnings: string[] = [];
  const repeatRules: string[] = [];
  let currentSectionId = '';
  let currentSectionRepeat = '';
  let sectionOrder = 0;
  let itemOrder = 0;
  let currentItemId = '';

  const ensureSection = () => {
    if (currentSectionId) return currentSectionId;

    currentSectionId = `${flowId}-section-${sectionOrder}`;
    sections.push({
      id: currentSectionId,
      flow_id: flowId,
      title: '기본',
      order: sectionOrder,
    });
    sectionOrder += 1;
    return currentSectionId;
  };

  for (const rawLine of input.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const detailMatch = rawLine.match(/^\s+(why|how|done|caution|link):\s*(.+)$/i);
    if (detailMatch && currentItemId) {
      const key = detailMatch[1].toLowerCase();
      const value = detailMatch[2].trim();
      let detail = itemDetails.find((entry) => entry.item_id === currentItemId);
      if (!detail) {
        detail = { item_id: currentItemId };
        itemDetails.push(detail);
      }

      if (key === 'why') detail.why = value;
      if (key === 'how') detail.how = value;
      if (key === 'done') detail.completion_criteria = value;
      if (key === 'caution') detail.caution = value;
      if (key === 'link') {
        const [label, url, type] = value.split('|').map((part) => part.trim());
        if (label && url) {
          detail.links = [
            ...(detail.links ?? []),
            {
              label,
              url,
              type: (type || 'reference') as FlowItemLinkType,
            },
          ];
        }
      }
      continue;
    }

    if (line.startsWith('# ') && !line.startsWith('## ')) continue;

    if (line.startsWith('## ')) {
      currentSectionId = `${flowId}-section-${sectionOrder}`;
      currentSectionRepeat = '';
      sections.push({
        id: currentSectionId,
        flow_id: flowId,
        title: line.slice(3).trim(),
        order: sectionOrder,
      });
      sectionOrder += 1;
      continue;
    }

    if (line.startsWith('@')) {
      const repeatRule = line.slice(1).trim();
      repeatRules.push(repeatRule);
      if (currentSectionId) currentSectionRepeat = repeatRule;
      continue;
    }

    if (line.startsWith('!')) {
      warnings.push(line.slice(1).trim());
      continue;
    }

    if (!line.startsWith('- ')) continue;

    const sectionId = ensureSection();
    const body = line.slice(2).trim();
    const rangeMatch = body.match(DAY_RANGE_PATTERN);
    const offsetMatch = body.match(DAY_OFFSET_PATTERN);
    let title = body;
    let dayOffset: number | undefined;
    let durationDays: number | undefined;

    if (rangeMatch) {
      const parsed = parseDayRange(rangeMatch[0]);
      if (parsed) {
        dayOffset = parsed.day_offset;
        durationDays = parsed.duration_days;
        title = body.replace(rangeMatch[0], '').trim();
      }
    } else if (offsetMatch) {
      const parsed = parseDayOffset(offsetMatch[0]);
      if (parsed !== null) {
        dayOffset = parsed;
        title = body.replace(offsetMatch[0], '').trim();
      }
    }

    const itemId = `${flowId}-item-${itemOrder}`;
    items.push({
      id: itemId,
      flow_id: flowId,
      section_id: sectionId,
      title,
      type: 'todo',
      day_offset: dayOffset,
      duration_days: durationDays,
      repeat_rule: currentSectionRepeat || undefined,
      source_type: 'creator_experience',
      order: itemOrder,
    });
    currentItemId = itemId;
    itemOrder += 1;
  }

  return { sections, items, itemDetails, warnings, repeatRules };
}

export function serializeTextFlow(
  sections: FlowSection[],
  items: FlowItem[],
  itemDetails: FlowItemDetail[] = [],
  warnings: string[] = [],
): string {
  const lines: string[] = [];
  for (const warning of warnings) lines.push(`! ${warning}`);
  if (warnings.length) lines.push('');

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    const sectionItems = items.filter((item) => item.section_id === section.id);
    const sectionRepeat = sectionItems.find((item) => item.repeat_rule)?.repeat_rule;
    if (sectionRepeat) lines.push(`@${sectionRepeat}`);

    for (const item of sectionItems) {
      const timing = timingLabel(item.day_offset, item.duration_days);
      lines.push(`- ${item.title}${timing ? ` ${timing}` : ''}`);
      const detail = itemDetails.find((entry) => entry.item_id === item.id);
      if (detail?.why) lines.push(`  why: ${detail.why}`);
      if (detail?.how) lines.push(`  how: ${detail.how}`);
      if (detail?.completion_criteria) lines.push(`  done: ${detail.completion_criteria}`);
      if (detail?.caution) lines.push(`  caution: ${detail.caution}`);
      for (const link of detail?.links ?? []) {
        lines.push(`  link: ${link.label} | ${link.url} | ${link.type}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}
