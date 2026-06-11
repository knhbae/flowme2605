import { contentsBatch260601OfficialBundles } from '../lib/flow/contents-batch-260601-official';
import { contentsBatch260601CreatorBundles } from '../lib/flow/contents-batch-260601-creator';
import * as fs from 'fs';

const all = [...contentsBatch260601OfficialBundles, ...contentsBatch260601CreatorBundles];

const result = all.map(b => ({
  slug: b.flow.slug,
  title: b.flow.title,
  structure_type: b.flow.structure_type,
  anchor_type: b.flow.anchor_type,
  primary_destination: (b.flow as any).primary_destination ?? '',
  category: b.flow.category,
  source_title: (b.flow as any).source_title ?? '',
  source_url: (b.flow as any).source_url ?? '',
  warning: (b.flow as any).warning ?? '',
  source: b.flow.id.startsWith('official') ? 'official' : 'creator',
  items: b.items.map((it: any) => ({
    title: it.title,
    day_offset: it.day_offset ?? null,
    why: it.why ?? '',
    how: it.how ?? '',
    caution: it.caution ?? '',
    done: it.completion_criteria ?? '',
    links: it.links ?? [],
  })),
  item_count: b.items.length,
}));

fs.writeFileSync('/tmp/flows44.json', JSON.stringify(result, null, 2));
console.log(`총 ${result.length}개`);
result.forEach((f, i) => {
  console.log(`${i+1}. ${f.slug} | ${f.item_count}개 | ${f.structure_type}`);
});
