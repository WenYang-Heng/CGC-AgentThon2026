# Shared energy filters

## Audit and replacement

- Dashboard used separate month, scope, applied-floor-label, and draft-floor state. Shared URL state now represents the applied scope; the reusable multi-floor picker owns only its unapplied draft.
- Insights duplicated month constants, a range popover, floor-label conversion, and severity controls. It now uses the shared bar, with draft severity, anomaly-status, and recommendation-impact filters.
- Building used its own month/full-year and floor dropdowns. It now supports month ranges using the same period/floor controls, with heatmap metric in the advanced panel. The heatmap switch and camera reset retain their behavior.
- Savings used a year dropdown, a quarter index, and immediate category/confidence/status selectors. Cost Performance now supports arbitrary ranges and multiple floors. Opportunities use draft advanced controls.
- Reports originally had status tabs only. Period and floor filters now apply to report dates and explicit floor IDs; issue type is an advanced filter. Status tabs and report submission are preserved.
- Sidebar links now use Next Link and carry validated common filters between pages.

## Model and URLs

The default is the full year 2026 and All Floors. Month indexes are zero-based. All Floors is null, never a synthetic floor ID.

Example: /?year=2026&startMonth=6&endMonth=8&floors=F04,F05

The shared hook uses App Router search parameters and replace with scroll disabled. Optimistic state preserves rapid sequential edits while navigation finishes. Invalid months, years, and floor IDs fall back safely. Applying common filters retains unrelated query parameters. Advanced filters stay local to each page.

Dashboard, cost data, and report lists support multiple floors. Insights and Building support one floor; multiple selected floors become All Floors with a visible notice, never the first floor silently. Dashboard, Insights, and Building use 2026; Savings and Reports also accept 2025.

## Data semantics

- Dashboard consumption and carbon metrics sum the selected months. Comparisons use the same months in 2025. Peak demand is the maximum floor/month demand in the selection, not a sum. Missing readings remain unavailable.
- Dashboard charts show the selected monthly range; selecting one month remains supported.
- Insights keeps the existing forecast formulas and API. Range/floor changes invalidate generated management summaries, errors, and in-flight results.
- Building heatmaps aggregate selected months and retain strict completeness checks.
- Cost Performance uses source billing values, including credits, for selected floors/months; normalized metrics retain the existing occupancy rules.
- Audit opportunities remain annual and building-wide. Period/floor controls are hidden on that tab, with an explanation; audit savings are not prorated or attributed to unsupported floor scopes.
- Report periods refer to date reported, not incident time or inferred hourly electricity data.

## Interaction

Common controls appear in period/floor order. Non-default selections produce removable chips. Multi-floor and advanced panels support Apply and Cancel; Escape discards drafts and returns focus. Advanced Reset changes the draft to defaults; Apply filters commits it. Clear all resets common and advanced filters for the page.

Native selects and checkboxes retain keyboard behavior. Popovers dismiss on outside click or focus leaving. Controls wrap on small screens and honor reduced motion.

## Validation

- node --test scripts/test-*.cjs
- node node_modules/eslint/bin/eslint.js .
- node node_modules/next/dist/bin/next build
- scripts/check-energy-filters-browser.cjs covers range totals, URL refresh/navigation, draft filters, chips, reports, and mobile keyboard interaction.
- Updated building and savings browser checks cover the shared controls at desktop/tablet/mobile sizes.
