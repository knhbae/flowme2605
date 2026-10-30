import React from 'react';
import type { FlowBundle, FlowItem, MealSlot, Recipe } from '@/lib/flow/types';

const sourceNames = { official: '공식 자료', creator_experience: '제작자 경험', reference: '참고 자료' };
const riskNames = { low: '일반', medium: '주의 필요', medical_sensitive: '건강·의료 관련 주의', financial_sensitive: '재무 관련 주의' };
export function catalogRelativeDay(offset: number): string {
  return offset === 0 ? '기준일 당일' : `기준일 ${Math.abs(offset)}일 ${offset < 0 ? '전' : '후'}`;
}
function Entry({ label, value }: { label: string; value?: React.ReactNode }) {
  return value === undefined || value === null || value === '' ? null : <><dt>{label}</dt><dd>{value}</dd></>;
}
function CatalogItem({ item, bundle }: { item: FlowItem; bundle: FlowBundle }) {
  const detail = bundle.itemDetails?.find(row => row.item_id === item.id);
  return <article data-catalog-item={item.id}><h4>{item.title}</h4><dl>
    <Entry label="설명" value={item.description} />
    <Entry label="시점" value={item.day_offset === undefined ? undefined : catalogRelativeDay(item.day_offset)} />
    <Entry label="기간" value={item.duration_days === undefined ? undefined : `${item.duration_days}일`} />
    <Entry label="날짜 범위" value={item.date_window && `${item.date_window.label} · ${catalogRelativeDay(item.date_window.start_day_offset)}부터 ${catalogRelativeDay(item.date_window.end_day_offset)}까지`} />
    <Entry label="원본 반복 규칙" value={item.repeat_rule === 'weekly' ? '매주' : item.repeat_rule} />
    <Entry label="출처 성격" value={item.source_type && sourceNames[item.source_type]} />
    <Entry label="주의 수준" value={item.risk_level && riskNames[item.risk_level]} />
    <Entry label="항목 역할" value={item.role && ({ action: '실행', confirmation: '확인', decision: '결정', record: '기록', resource: '자료', reference: '참고', warning: '주의' })[item.role]} />
    <Entry label="원본 콘텐츠 상태 · 개인 완료 기록 아님" value={item.status && ({ ok: '확인됨', check: '점검 필요', hold: '보류' })[item.status]} />
    <Entry label="보류 가능" value={item.hold_eligible === undefined ? undefined : item.hold_eligible ? '가능' : '불가'} />
    <Entry label="사진 파일명 규칙" value={item.photo_filename_pattern} />
    <Entry label="이유" value={detail?.why} /><Entry label="방법" value={detail?.how} />
    <Entry label="완료 기준" value={detail?.completion_criteria} /><Entry label="주의" value={detail?.caution} />
    <Entry label="원문 발췌" value={detail?.source_fragment_text} />
    <Entry label="관련 링크" value={detail?.links?.length ? <ul>{detail.links.map((link, i) => <li key={i}>{/^https?:\/\//i.test(link.url) ? <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a> : <span>{link.label} · 열 수 없는 링크</span>}</li>)}</ul> : undefined} />
  </dl></article>;
}
function CatalogRecipe({ recipe }: { recipe: Recipe }) {
  return <details data-catalog-recipe={recipe.id}><summary>{recipe.title} · 원본 레시피</summary>
    {recipe.description && <p>{recipe.description}</p>}
    <dl><Entry label="출처 성격" value={sourceNames[recipe.source_type]} /><Entry label="주의 수준" value={riskNames[recipe.risk_level]} /></dl>
    <h5>재료</h5><ul>{recipe.ingredients.map((ingredient, i) => <li key={i}>{[ingredient.name, ingredient.amount, ingredient.unit, ingredient.note].filter(Boolean).join(' · ')}{ingredient.is_new_for_baby ? ' · 새 재료' : ''}{ingredient.allergy_watch ? ' · 알레르기 관찰 표시' : ''}</li>)}</ul>
    <h5>원본 조리 순서</h5><ol>{[...recipe.steps].sort((a, b) => a.order - b.order).map((step, i) => <li key={i}>{step.text}</li>)}</ol>
    <dl><Entry label="농도" value={recipe.texture_note} /><Entry label="배합" value={recipe.ratio_note} /><Entry label="분량" value={recipe.yield_note} />
      <Entry label="보관" value={recipe.storage_note} /><Entry label="도구" value={recipe.tool_note} /><Entry label="주의" value={recipe.caution_note} /></dl>
  </details>;
}
function CatalogMeal({ slot, bundle }: { slot: MealSlot; bundle: FlowBundle }) {
  const recipe = bundle.recipes?.find(row => row.id === slot.recipe_id);
  return <article data-catalog-meal={slot.id}><h4>{slot.menu_title}</h4><dl>
    <Entry label="원본 식단 시점" value={catalogRelativeDay(slot.day_offset)} />
    <Entry label="원본 식단 기간" value={`${slot.duration_days}일`} />
    <Entry label="새 재료" value={slot.new_ingredients.join(', ')} />
    <Entry label="원본에 기록된 반응 관찰 기간" value={slot.allergy_watch_days === undefined ? undefined : `${slot.allergy_watch_days}일`} />
  </dl>{recipe ? <CatalogRecipe recipe={recipe} /> : <p>연결된 원본 레시피를 찾지 못했습니다.</p>}</article>;
}
/** Read-only presentation of the frozen source. Never materializes execution dates or edits the bundle. */
export function CatalogLibraryContent({ bundle }: { bundle: FlowBundle }) {
  const renderRows = (sectionId?: string) => <>
    {bundle.items.filter(item => item.section_id === sectionId).sort((a, b) => a.order - b.order).map(item => <CatalogItem key={item.id} item={item} bundle={bundle} />)}
    {(bundle.mealSlots ?? []).filter(slot => slot.section_id === sectionId).sort((a, b) => a.order - b.order).map(slot => <CatalogMeal key={slot.id} slot={slot} bundle={bundle} />)}
  </>;
  const linked = new Set(bundle.mealSlots?.map(slot => slot.recipe_id));
  return <>
    {!!bundle.flow.stop_conditions?.length && <section aria-label="중단 조건"><h3>중단 조건</h3><ul>{bundle.flow.stop_conditions.map((row, i) => <li key={i}>{row}</li>)}</ul></section>}
    {!!bundle.flow.principles?.length && <section><h3>원본 원칙</h3><ul>{bundle.flow.principles.map((row, i) => <li key={i}>{row}</li>)}</ul></section>}
    {bundle.flow.hold_section && <section><h3>{bundle.flow.hold_section.title}</h3><ul>{bundle.flow.hold_section.reasons.map((row, i) => <li key={i}>{row}</li>)}</ul><p>{bundle.flow.hold_section.consequence}</p><p>{bundle.flow.hold_section.memo_template}</p></section>}
    {!!bundle.repeatRules?.length && <p>원본 반복 기준: {bundle.repeatRules.join(' · ')}</p>}
    {bundle.flow.routine_duration_days !== undefined && <p>원본 전체 반복 기간: {bundle.flow.routine_duration_days}일</p>}
    {!!bundle.mealSlots?.length && <p>아래 식단·기간·조리법은 원본 제작자의 기록입니다. 현재 권장 식단이나 실행 승인을 뜻하지 않습니다.</p>}
    {[...bundle.sections].sort((a, b) => a.order - b.order).map(section => <section key={section.id}><h3>{section.title}</h3>{section.description && <p>{section.description}</p>}{renderRows(section.id)}</section>)}
    {renderRows()}
    {(bundle.recipes ?? []).filter(recipe => !linked.has(recipe.id)).map(recipe => <CatalogRecipe key={recipe.id} recipe={recipe} />)}
  </>;
}
