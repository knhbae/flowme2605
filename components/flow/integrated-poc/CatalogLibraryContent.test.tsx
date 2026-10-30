import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CatalogLibraryContent, catalogRelativeDay } from './CatalogLibraryContent';
import { buildCatalogLibrarySnapshot } from '../../../lib/flow/integrated-poc/catalog-library-source';

const library = buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z');
const render = (bundle: typeof library.bundles[number]) => renderToStaticMarkup(<CatalogLibraryContent bundle={bundle} />);
const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');

test('every original and variant renders every Item and MealSlot without changing source JSON', () => {
  const before = JSON.stringify(library); let items = 0, meals = 0;
  for (const bundle of [...library.bundles, ...library.variants.map(v => v.bundle)]) {
    const html = render(bundle);
    for (const item of bundle.items) { assert(html.includes(`data-catalog-item="${escape(item.id)}"`), `${bundle.flow.slug}/${item.id}`); items++; }
    for (const slot of bundle.mealSlots ?? []) { assert(html.includes(`data-catalog-meal="${escape(slot.id)}"`)); meals++; }
    for (const recipe of bundle.recipes ?? []) assert(html.includes(`data-catalog-recipe="${escape(recipe.id)}"`));
    for (const condition of bundle.flow.stop_conditions ?? []) assert(html.includes(escape(condition)));
    for (const rule of bundle.repeatRules ?? []) assert(html.includes(escape(rule)));
  }
  assert(items >= 957); assert.equal(meals, 11); assert.equal(JSON.stringify(library), before);
});

test('all 11 meal schedules expose linked ingredients, ordered recipe steps, notes and original risk', () => {
  const bundle = library.bundles.find(b => b.flow.slug === 'baby-food-menu-recipe')!;
  const html = render(bundle); assert.equal(bundle.mealSlots?.length, 11); assert.equal(bundle.recipes?.length, 11);
  assert(html.includes('현재 권장 식단이나 실행 승인을 뜻하지 않습니다'));
  for (const slot of bundle.mealSlots!) {
    assert(html.includes(escape(slot.menu_title))); assert(html.includes(catalogRelativeDay(slot.day_offset)));
    for (const name of slot.new_ingredients) assert(html.includes(escape(name)));
  }
  for (const recipe of bundle.recipes!) {
    for (const ingredient of recipe.ingredients) assert(html.includes(escape(ingredient.name)));
    for (const step of recipe.steps) assert(html.includes(escape(step.text)));
    for (const note of [recipe.texture_note, recipe.ratio_note, recipe.yield_note, recipe.storage_note, recipe.tool_note, recipe.caution_note].filter(Boolean)) assert(html.includes(escape(note!)));
  }
  assert(html.includes('제작자 경험')); assert(html.includes('건강·의료 관련 주의'));
  assert(!html.includes('creator_experience')); assert(!html.includes('medical_sensitive'));
});

test('negative, zero and positive dates retain relative meaning; unsafe links are not actionable', () => {
  assert.equal(catalogRelativeDay(-30), '기준일 30일 전'); assert.equal(catalogRelativeDay(0), '기준일 당일'); assert.equal(catalogRelativeDay(3), '기준일 3일 후');
  const bundle = structuredClone(library.bundles[0]);
  bundle.items = [{ ...bundle.items[0], day_offset: -30, section_id: undefined, status: 'check' }];
  bundle.itemDetails = [{ item_id: bundle.items[0].id, links: [{ label: '위험 링크', url: 'javascript:alert(1)', type: 'reference' }, { label: '출처', url: 'https://example.org/', type: 'official' }] }];
  const html = render(bundle); assert(!html.includes('href="javascript:')); assert(html.includes('href="https://example.org/"'));
  assert(html.includes('기준일 30일 전')); assert(html.includes('개인 완료 기록 아님')); assert(html.includes('점검 필요'));
});
