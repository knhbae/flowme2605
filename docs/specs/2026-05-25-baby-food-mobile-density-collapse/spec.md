# Baby-Food Mobile Density Collapse Spec

Date: 2026-05-25

## Goal

Reduce mobile density on `baby-food-menu-recipe` by keeping meal calendar and reaction logging first while collapsing secondary recipe/check sections on mobile.

## User Need

As a parent logging early baby-food trials on mobile, I need the meal slot and reaction log to stay first, so I record response and caution notes before reading recipe details or treating the page as medical advice.

## Scope

- Add `baby-food-menu-recipe` to route-scoped mobile secondary-section collapse.
- Apply the existing collapsed-section shell to `MealPlanRenderer`.
- Keep desktop expanded behavior unchanged.
- Add E2E coverage and screenshots.

## Non-Goals

- No nutrition recommendation engine.
- No allergy risk decision.
- No medical advice or pediatric guidance generation.
- No new export format.

## Acceptance

- On mobile, `baby-food-menu-recipe` has at least one closed `mobile-collapsed-section`.
- The first artifact workbench still shows `meal-reaction-workbench`.
- Desktop remains expanded.
- No route is promoted or called validated.
